using System.Security.Claims;
using backend.Products;
using backend.Vouchers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class VouchersController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;

    public VouchersController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public sealed record UpsertVoucherRequest(
        string Code,
        string? Description,
        string DiscountType,
        decimal DiscountValue,
        DateTimeOffset? StartsAt,
        DateTimeOffset ExpiresAt,
        bool IsActive,
        decimal? MinOrderAmount,
        int? MaxRedemptions,
        IReadOnlyList<Guid> StoreIds,
        IReadOnlyList<Guid>? ProductIds);

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> ListVouchers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? q = null,
        [FromQuery] string? status = null,
        [FromQuery] Guid? storeId = null,
        CancellationToken cancellationToken = default)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!VoucherScope.CanAccessDashboard(role))
        {
            return Forbid();
        }

        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 50);
        var offset = (safePage - 1) * safePageSize;
        var search = q?.Trim();
        var statusFilter = string.IsNullOrWhiteSpace(status) ? null : status.Trim();

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        if (!await VoucherPersistence.HasVouchersTableAsync(conn))
        {
            return StatusCode(503, new { message = "Voucher tables are not installed. Run database/migrations/001_add_vouchers.sql." });
        }

        var isAdmin = VoucherScope.IsAdminRole(role);
        Guid[]? managedIds = null;
        if (!isAdmin)
        {
            var actorId = GetCurrentUserId();
            if (actorId is null)
            {
                return Unauthorized(new { message = "Invalid session token." });
            }

            var managed = await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, actorId.Value);
            if (managed.Count == 0)
            {
                return Ok(new { items = Array.Empty<object>(), page = safePage, pageSize = safePageSize, totalItems = 0, totalPages = 1 });
            }

            managedIds = managed.ToArray();
        }

        const string scopeSql = """
                                AND NOT EXISTS (
                                    SELECT 1 FROM app.voucher_stores vs_scope
                                    WHERE vs_scope.voucher_id = v.id
                                      AND NOT (vs_scope.store_id = ANY(@managed_ids))
                                )
                                """;

        var storeFilterSql = storeId is null
            ? ""
            : " AND EXISTS (SELECT 1 FROM app.voucher_stores vsf WHERE vsf.voucher_id = v.id AND vsf.store_id = @filter_store_id) ";

        await using var countCmd = conn.CreateCommand();
        countCmd.CommandText = $"""
                                SELECT COUNT(*)
                                FROM app.vouchers v
                                WHERE (@search IS NULL OR v.code ILIKE '%' || @search || '%' OR COALESCE(v.description, '') ILIKE '%' || @search || '%')
                                  {(isAdmin ? "" : scopeSql)}
                                  {storeFilterSql};
                                """;
        VoucherPersistence.AddNullableTextParameter(countCmd, "search", search);
        if (!isAdmin)
        {
            countCmd.Parameters.Add(new NpgsqlParameter("managed_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = managedIds! });
        }

        if (storeId is not null)
        {
            countCmd.Parameters.AddWithValue("filter_store_id", storeId.Value);
        }

        var totalItems = Convert.ToInt32(await countCmd.ExecuteScalarAsync(cancellationToken));
        var now = DateTimeOffset.UtcNow;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
                          SELECT
                              v.id,
                              v.code,
                              v.description,
                              v.discount_type,
                              v.discount_value::numeric,
                              v.starts_at,
                              v.expires_at,
                              v.is_active,
                              v.min_order_amount::numeric,
                              v.max_redemptions,
                              v.redemption_count,
                              v.created_at,
                              v.updated_at,
                              COALESCE(
                                  (SELECT string_agg(s.name, ', ' ORDER BY s.name)
                                   FROM app.voucher_stores vs
                                   INNER JOIN app.stores s ON s.id = vs.store_id
                                   WHERE vs.voucher_id = v.id),
                                  ''
                              ) AS store_names,
                              (SELECT COUNT(*)::int FROM app.voucher_stores vs2 WHERE vs2.voucher_id = v.id) AS store_count,
                              (SELECT COUNT(*)::int FROM app.voucher_products vp WHERE vp.voucher_id = v.id) AS product_count
                          FROM app.vouchers v
                          WHERE (@search IS NULL OR v.code ILIKE '%' || @search || '%' OR COALESCE(v.description, '') ILIKE '%' || @search || '%')
                            {(isAdmin ? "" : scopeSql)}
                            {storeFilterSql}
                          ORDER BY v.created_at DESC
                          LIMIT @limit OFFSET @offset;
                          """;
        VoucherPersistence.AddNullableTextParameter(cmd, "search", search);
        if (!isAdmin)
        {
            cmd.Parameters.Add(new NpgsqlParameter("managed_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = managedIds! });
        }

        if (storeId is not null)
        {
            cmd.Parameters.AddWithValue("filter_store_id", storeId.Value);
        }

        cmd.Parameters.AddWithValue("limit", safePageSize);
        cmd.Parameters.AddWithValue("offset", offset);

        var items = new List<object>();
        await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var row = new VoucherRow(
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.IsDBNull(2) ? null : reader.GetString(2),
                    reader.GetString(3),
                    reader.GetDecimal(4),
                    reader.IsDBNull(5) ? null : reader.GetFieldValue<DateTimeOffset>(5),
                    reader.GetFieldValue<DateTimeOffset>(6),
                    reader.GetBoolean(7),
                    reader.IsDBNull(8) ? null : reader.GetDecimal(8),
                    reader.IsDBNull(9) ? null : reader.GetInt32(9),
                    reader.GetInt32(10),
                    reader.GetFieldValue<DateTimeOffset>(11),
                    reader.GetFieldValue<DateTimeOffset>(12));

                var derivedStatus = VoucherValidation.DeriveStatus(row, now);
                if (statusFilter is not null &&
                    !string.Equals(derivedStatus, statusFilter, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                items.Add(new
                {
                    id = row.Id,
                    code = row.Code,
                    description = row.Description,
                    discountType = row.DiscountType,
                    discountValue = row.DiscountValue,
                    startsAt = row.StartsAt,
                    expiresAt = row.ExpiresAt,
                    isActive = row.IsActive,
                    minOrderAmount = row.MinOrderAmount,
                    maxRedemptions = row.MaxRedemptions,
                    redemptionCount = row.RedemptionCount,
                    createdAt = row.CreatedAt,
                    updatedAt = row.UpdatedAt,
                    storeNames = reader.GetString(13),
                    storeCount = reader.GetInt32(14),
                    productCount = reader.GetInt32(15),
                    status = derivedStatus,
                    discountLabel = VoucherValidation.FormatLabel(row.DiscountType, row.DiscountValue),
                });
            }
        }

        if (statusFilter is not null)
        {
            totalItems = items.Count;
        }

        var totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)safePageSize));
        return Ok(new
        {
            items,
            page = safePage,
            pageSize = safePageSize,
            totalItems,
            totalPages,
        });
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetVoucher([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!VoucherScope.CanAccessDashboard(role))
        {
            return Forbid();
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        if (!await VoucherPersistence.HasVouchersTableAsync(conn))
        {
            return StatusCode(503, new { message = "Voucher tables are not installed." });
        }

        var row = await VoucherPersistence.GetVoucherByIdAsync(conn, id, cancellationToken);
        if (row is null)
        {
            return NotFound();
        }

        var isAdmin = VoucherScope.IsAdminRole(role);
        var managed = isAdmin
            ? new List<Guid>()
            : await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, GetCurrentUserId()!.Value);

        if (!await VoucherPersistence.UserCanManageVoucherAsync(conn, id, isAdmin, managed, cancellationToken))
        {
            return Forbid();
        }

        var storeIds = await VoucherPersistence.GetStoreIdsForVoucherAsync(conn, id);
        var productIds = await VoucherPersistence.GetProductIdsForVoucherAsync(conn, id);
        var storeNames = await LoadStoreNamesAsync(conn, storeIds, cancellationToken);

        return Ok(MapDetail(row, storeIds, storeNames, productIds));
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateVoucher([FromBody] UpsertVoucherRequest request, CancellationToken cancellationToken)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!VoucherScope.CanAccessDashboard(role))
        {
            return Forbid();
        }

        var validation = ValidateUpsert(request);
        if (validation is not null)
        {
            return BadRequest(validation);
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        if (!await VoucherPersistence.HasVouchersTableAsync(conn))
        {
            return StatusCode(503, new { message = "Voucher tables are not installed." });
        }

        var scopeError = await ValidateStoreScopeAsync(conn, role, request.StoreIds, cancellationToken);
        if (scopeError is not null)
        {
            return BadRequest(scopeError);
        }

        var actorId = GetCurrentUserId();
        var voucherId = Guid.NewGuid();
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        try
        {
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = """
                                  INSERT INTO app.vouchers (
                                      id, code, description, discount_type, discount_value,
                                      starts_at, expires_at, is_active, min_order_amount, max_redemptions,
                                      created_by
                                  )
                                  VALUES (
                                      @id, @code, @description, @discount_type, @discount_value,
                                      @starts_at, @expires_at, @is_active, @min_order_amount, @max_redemptions,
                                      @created_by
                                  );
                                  """;
                cmd.Parameters.AddWithValue("id", voucherId);
                cmd.Parameters.AddWithValue("code", request.Code.Trim().ToUpperInvariant());
                cmd.Parameters.AddWithValue("description", (object?)request.Description?.Trim() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("discount_type", request.DiscountType.Trim().ToLowerInvariant());
                cmd.Parameters.AddWithValue("discount_value", request.DiscountValue);
                cmd.Parameters.AddWithValue("starts_at", (object?)request.StartsAt ?? DBNull.Value);
                cmd.Parameters.AddWithValue("expires_at", request.ExpiresAt);
                cmd.Parameters.AddWithValue("is_active", request.IsActive);
                cmd.Parameters.AddWithValue("min_order_amount", (object?)request.MinOrderAmount ?? DBNull.Value);
                cmd.Parameters.AddWithValue("max_redemptions", (object?)request.MaxRedemptions ?? DBNull.Value);
                cmd.Parameters.AddWithValue("created_by", (object?)actorId ?? DBNull.Value);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }

            await VoucherPersistence.ReplaceVoucherStoresAsync(conn, tx, voucherId, request.StoreIds);
            await VoucherPersistence.ReplaceVoucherProductsAsync(conn, tx, voucherId, request.ProductIds ?? Array.Empty<Guid>());
            await tx.CommitAsync(cancellationToken);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            await tx.RollbackAsync(cancellationToken);
            return Conflict(new { message = "A voucher with this code already exists." });
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }

        var created = await VoucherPersistence.GetVoucherByIdAsync(conn, voucherId, cancellationToken);
        var storeIds = await VoucherPersistence.GetStoreIdsForVoucherAsync(conn, voucherId);
        var productIds = await VoucherPersistence.GetProductIdsForVoucherAsync(conn, voucherId);
        var storeNames = await LoadStoreNamesAsync(conn, storeIds, cancellationToken);
        return CreatedAtAction(nameof(GetVoucher), new { id = voucherId }, MapDetail(created!, storeIds, storeNames, productIds));
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateVoucher(
        [FromRoute] Guid id,
        [FromBody] UpsertVoucherRequest request,
        CancellationToken cancellationToken)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!VoucherScope.CanAccessDashboard(role))
        {
            return Forbid();
        }

        var validation = ValidateUpsert(request);
        if (validation is not null)
        {
            return BadRequest(validation);
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        if (!await VoucherPersistence.HasVouchersTableAsync(conn))
        {
            return StatusCode(503, new { message = "Voucher tables are not installed." });
        }

        var existing = await VoucherPersistence.GetVoucherByIdAsync(conn, id, cancellationToken);
        if (existing is null)
        {
            return NotFound();
        }

        var isAdmin = VoucherScope.IsAdminRole(role);
        var managed = isAdmin
            ? new List<Guid>()
            : await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, GetCurrentUserId()!.Value);

        if (!await VoucherPersistence.UserCanManageVoucherAsync(conn, id, isAdmin, managed, cancellationToken))
        {
            return Forbid();
        }

        var scopeError = await ValidateStoreScopeAsync(conn, role, request.StoreIds, cancellationToken);
        if (scopeError is not null)
        {
            return BadRequest(scopeError);
        }

        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        try
        {
            await using (var cmd = conn.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = """
                                  UPDATE app.vouchers
                                  SET code = @code,
                                      description = @description,
                                      discount_type = @discount_type,
                                      discount_value = @discount_value,
                                      starts_at = @starts_at,
                                      expires_at = @expires_at,
                                      is_active = @is_active,
                                      min_order_amount = @min_order_amount,
                                      max_redemptions = @max_redemptions,
                                      updated_at = NOW()
                                  WHERE id = @id;
                                  """;
                cmd.Parameters.AddWithValue("id", id);
                cmd.Parameters.AddWithValue("code", request.Code.Trim().ToUpperInvariant());
                cmd.Parameters.AddWithValue("description", (object?)request.Description?.Trim() ?? DBNull.Value);
                cmd.Parameters.AddWithValue("discount_type", request.DiscountType.Trim().ToLowerInvariant());
                cmd.Parameters.AddWithValue("discount_value", request.DiscountValue);
                cmd.Parameters.AddWithValue("starts_at", (object?)request.StartsAt ?? DBNull.Value);
                cmd.Parameters.AddWithValue("expires_at", request.ExpiresAt);
                cmd.Parameters.AddWithValue("is_active", request.IsActive);
                cmd.Parameters.AddWithValue("min_order_amount", (object?)request.MinOrderAmount ?? DBNull.Value);
                cmd.Parameters.AddWithValue("max_redemptions", (object?)request.MaxRedemptions ?? DBNull.Value);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }

            await VoucherPersistence.ReplaceVoucherStoresAsync(conn, tx, id, request.StoreIds);
            await VoucherPersistence.ReplaceVoucherProductsAsync(conn, tx, id, request.ProductIds ?? Array.Empty<Guid>());
            await tx.CommitAsync(cancellationToken);
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            await tx.RollbackAsync(cancellationToken);
            return Conflict(new { message = "A voucher with this code already exists." });
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }

        var updated = await VoucherPersistence.GetVoucherByIdAsync(conn, id, cancellationToken);
        var storeIds = await VoucherPersistence.GetStoreIdsForVoucherAsync(conn, id);
        var productIds = await VoucherPersistence.GetProductIdsForVoucherAsync(conn, id);
        var storeNames = await LoadStoreNamesAsync(conn, storeIds, cancellationToken);
        return Ok(MapDetail(updated!, storeIds, storeNames, productIds));
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteVoucher([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!VoucherScope.CanAccessDashboard(role))
        {
            return Forbid();
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        if (!await VoucherPersistence.HasVouchersTableAsync(conn))
        {
            return StatusCode(503, new { message = "Voucher tables are not installed." });
        }

        var existing = await VoucherPersistence.GetVoucherByIdAsync(conn, id, cancellationToken);
        if (existing is null)
        {
            return NotFound();
        }

        var isAdmin = VoucherScope.IsAdminRole(role);
        var managed = isAdmin
            ? new List<Guid>()
            : await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, GetCurrentUserId()!.Value);

        if (!await VoucherPersistence.UserCanManageVoucherAsync(conn, id, isAdmin, managed, cancellationToken))
        {
            return Forbid();
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          UPDATE app.vouchers
                          SET is_active = FALSE, updated_at = NOW()
                          WHERE id = @id;
                          """;
        cmd.Parameters.AddWithValue("id", id);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        return NoContent();
    }

    private static object MapDetail(
        VoucherRow row,
        IReadOnlyList<Guid> storeIds,
        IReadOnlyList<string> storeNames,
        IReadOnlyList<Guid> productIds)
    {
        var now = DateTimeOffset.UtcNow;
        return new
        {
            id = row.Id,
            code = row.Code,
            description = row.Description,
            discountType = row.DiscountType,
            discountValue = row.DiscountValue,
            startsAt = row.StartsAt,
            expiresAt = row.ExpiresAt,
            isActive = row.IsActive,
            minOrderAmount = row.MinOrderAmount,
            maxRedemptions = row.MaxRedemptions,
            redemptionCount = row.RedemptionCount,
            createdAt = row.CreatedAt,
            updatedAt = row.UpdatedAt,
            storeIds,
            storeNames,
            productIds,
            status = VoucherValidation.DeriveStatus(row, now),
            discountLabel = VoucherValidation.FormatLabel(row.DiscountType, row.DiscountValue),
        };
    }

    private static object? ValidateUpsert(UpsertVoucherRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return new { message = "Code is required." };
        }

        if (request.Code.Trim().Length > 64)
        {
            return new { message = "Code must be 64 characters or fewer." };
        }

        var type = request.DiscountType?.Trim().ToLowerInvariant();
        if (type is not "percent" and not "fixed_amount")
        {
            return new { message = "Discount type must be percent or fixed_amount." };
        }

        if (request.DiscountValue <= 0)
        {
            return new { message = "Discount value must be greater than zero." };
        }

        if (type == "percent" && request.DiscountValue > 100)
        {
            return new { message = "Percent discount cannot exceed 100." };
        }

        if (request.StoreIds is null || request.StoreIds.Count == 0)
        {
            return new { message = "Select at least one store." };
        }

        if (request.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return new { message = "Expiry date must be in the future." };
        }

        if (request.StartsAt is { } starts && starts >= request.ExpiresAt)
        {
            return new { message = "Start date must be before expiry date." };
        }

        if (request.MinOrderAmount is < 0)
        {
            return new { message = "Minimum order amount cannot be negative." };
        }

        if (request.MaxRedemptions is < 1)
        {
            return new { message = "Max redemptions must be at least 1 when set." };
        }

        return null;
    }

    private async Task<object?> ValidateStoreScopeAsync(
        NpgsqlConnection conn,
        string? role,
        IReadOnlyList<Guid> storeIds,
        CancellationToken ct)
    {
        if (VoucherScope.IsAdminRole(role))
        {
            return null;
        }

        var actorId = GetCurrentUserId();
        if (actorId is null)
        {
            return new { message = "Invalid session." };
        }

        var managed = await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, actorId.Value);
        var managedSet = managed.ToHashSet();
        if (storeIds.Any(id => !managedSet.Contains(id)))
        {
            return new { message = "You can only assign stores you manage." };
        }

        return null;
    }

    private static async Task<IReadOnlyList<string>> LoadStoreNamesAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        CancellationToken ct)
    {
        if (storeIds.Count == 0)
        {
            return Array.Empty<string>();
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT name
                          FROM app.stores
                          WHERE id = ANY(@ids)
                          ORDER BY name;
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var names = new List<string>();
        while (await reader.ReadAsync(ct))
        {
            names.Add(reader.GetString(0));
        }

        return names;
    }

    private async Task<string?> GetCurrentUserRoleAsync()
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return null;
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT role::text FROM app.users WHERE id = @uid LIMIT 1;";
        cmd.Parameters.AddWithValue("uid", userId.Value);
        return await cmd.ExecuteScalarAsync() as string;
    }

    private Guid? GetCurrentUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
