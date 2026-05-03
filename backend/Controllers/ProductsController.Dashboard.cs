using backend.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

/// <summary>Dashboard-only product CRUD and listing (admin and store_manager).</summary>
// The partial keyword allows you to split the definition of a class, record, or method across multiple files. This is useful for large projects where you want to organize your code into smaller, more manageable files.
public partial class ProductsController
{
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> ListProducts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? q = null)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 50);
        var offset = (safePage - 1) * safePageSize;
        var search = q?.Trim();
        var statusFilter = string.IsNullOrWhiteSpace(status) ? null : status.Trim().ToLowerInvariant();

        await using var conn = await _dataSource.OpenConnectionAsync();
        var hasProductVideosTable = await ProductPersistence.HasProductVideosTableAsync(conn);

        var isAdmin = ProductStoreScope.IsAdminRole(currentUserRole);
        Guid[]? managedIdsParam = null;
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
                return Ok(new
                {
                    items = Array.Empty<object>(),
                    page = safePage,
                    pageSize = safePageSize,
                    totalItems = 0,
                    totalPages = 1
                });
            }

            managedIdsParam = managed.ToArray();
        }

        const string storeScopeSql = """
                                    AND EXISTS (
                                        SELECT 1 FROM app.store_products sp
                                        WHERE sp.product_id = p.id AND sp.store_id = ANY(@managed_ids)
                                    )
                                    """;

        await using var countCmd = conn.CreateCommand();
        countCmd.CommandText = $"""
                                SELECT COUNT(*)
                                FROM app.products p
                                WHERE (@category_id IS NULL OR p.category_id = @category_id)
                                  AND (@status IS NULL OR lower(p.status) = @status)
                                  AND (@search IS NULL OR p.name ILIKE '%' || @search || '%' OR p.sku ILIKE '%' || @search || '%')
                                  {(isAdmin ? "" : storeScopeSql)};
                                """;
        ProductPersistence.AddNullableUuidParameter(countCmd, "category_id", categoryId);
        ProductPersistence.AddNullableTextParameter(countCmd, "status", statusFilter);
        ProductPersistence.AddNullableTextParameter(countCmd, "search", search);
        if (!isAdmin)
        {
            countCmd.Parameters.Add(new NpgsqlParameter("managed_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = managedIdsParam! });
        }

        var totalItems = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = hasProductVideosTable
            ? $"""
              SELECT
                  p.id,
                  p.sku,
                  p.name,
                  p.description,
                  p.base_price,
                  p.status,
                  p.category_id,
                  c.name AS category_name,
                  p.created_at,
                  p.updated_at,
                  (SELECT COUNT(*) FROM app.product_images pi WHERE pi.product_id = p.id) AS image_count,
                  (SELECT COUNT(*) FROM app.product_videos pv WHERE pv.product_id = p.id) AS video_count
              FROM app.products p
              LEFT JOIN app.categories c ON c.id = p.category_id
              WHERE (@category_id IS NULL OR p.category_id = @category_id)
                AND (@status IS NULL OR lower(p.status) = @status)
                AND (@search IS NULL OR p.name ILIKE '%' || @search || '%' OR p.sku ILIKE '%' || @search || '%')
                {(isAdmin ? "" : storeScopeSql)}
              ORDER BY p.created_at DESC
              LIMIT @limit OFFSET @offset;
              """
            : $"""
              SELECT
                  p.id,
                  p.sku,
                  p.name,
                  p.description,
                  p.base_price,
                  p.status,
                  p.category_id,
                  c.name AS category_name,
                  p.created_at,
                  p.updated_at,
                  (SELECT COUNT(*) FROM app.product_images pi WHERE pi.product_id = p.id) AS image_count,
                  0::int AS video_count
              FROM app.products p
              LEFT JOIN app.categories c ON c.id = p.category_id
              WHERE (@category_id IS NULL OR p.category_id = @category_id)
                AND (@status IS NULL OR lower(p.status) = @status)
                AND (@search IS NULL OR p.name ILIKE '%' || @search || '%' OR p.sku ILIKE '%' || @search || '%')
                {(isAdmin ? "" : storeScopeSql)}
              ORDER BY p.created_at DESC
              LIMIT @limit OFFSET @offset;
              """;
        ProductPersistence.AddNullableUuidParameter(cmd, "category_id", categoryId);
        ProductPersistence.AddNullableTextParameter(cmd, "status", statusFilter);
        ProductPersistence.AddNullableTextParameter(cmd, "search", search);
        if (!isAdmin)
        {
            cmd.Parameters.Add(new NpgsqlParameter("managed_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = managedIdsParam! });
        }

        cmd.Parameters.AddWithValue("limit", safePageSize);
        cmd.Parameters.AddWithValue("offset", offset);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                sku = reader.GetString(1),
                name = reader.GetString(2),
                description = reader.IsDBNull(3) ? null : reader.GetString(3),
                basePrice = reader.GetDecimal(4),
                status = reader.GetString(5),
                categoryId = reader.IsDBNull(6) ? (Guid?)null : reader.GetGuid(6),
                categoryName = reader.IsDBNull(7) ? null : reader.GetString(7),
                createdAt = reader.GetDateTime(8),
                updatedAt = reader.GetDateTime(9),
                imageCount = reader.GetInt32(10),
                videoCount = reader.GetInt32(11)
            });
        }

        return Ok(new
        {
            items,
            page = safePage,
            pageSize = safePageSize,
            totalItems,
            totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)safePageSize))
        });
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProductDetail([FromRoute] Guid id)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT
                              p.id,
                              p.sku,
                              p.name,
                              p.description,
                              p.base_price,
                              p.status,
                              p.category_id,
                              c.name AS category_name,
                              p.created_at,
                              p.updated_at,
                              p.is_clearance,
                              p.is_refurbished
                          FROM app.products p
                          LEFT JOIN app.categories c ON c.id = p.category_id
                          WHERE p.id = @id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "Product not found." });
        }

        var productId = reader.GetGuid(0);
        var sku = reader.GetString(1);
        var name = reader.GetString(2);
        var description = reader.IsDBNull(3) ? null : reader.GetString(3);
        var basePrice = reader.GetDecimal(4);
        var status = reader.GetString(5);
        var categoryId = reader.IsDBNull(6) ? (Guid?)null : reader.GetGuid(6);
        var categoryName = reader.IsDBNull(7) ? null : reader.GetString(7);
        var createdAt = reader.GetDateTime(8);
        var updatedAt = reader.GetDateTime(9);
        var isClearance = reader.GetBoolean(10);
        var isRefurbished = reader.GetBoolean(11);
        await reader.DisposeAsync();

        var imageS3Keys = await ProductPersistence.GetProductImagesAsync(conn, productId);
        var hasProductVideosTable = await ProductPersistence.HasProductVideosTableAsync(conn);
        var videoUrls = hasProductVideosTable
            ? await ProductPersistence.GetProductVideosAsync(conn, productId)
            : [];

        var storeIds = await ProductPersistence.GetStoreIdsForProductAsync(conn, productId);
        var storeStockRows = await ProductPersistence.GetStoreStockRowsForProductAsync(conn, productId);
        if (!ProductStoreScope.IsAdminRole(currentUserRole))
        {
            var actorId = GetCurrentUserId();
            if (actorId is null)
            {
                return Unauthorized(new { message = "Invalid session token." });
            }

            var managed = await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, actorId.Value);
            if (!storeIds.Any(sid => managed.Contains(sid)))
            {
                return NotFound(new { message = "Product not found." });
            }

            storeIds = storeIds.Where(managed.Contains).ToList();
            storeStockRows = storeStockRows.Where(r => managed.Contains(r.StoreId)).ToList();
        }

        var storeStock = storeStockRows.ConvertAll(r => new { storeId = r.StoreId, quantity = r.Quantity });

        return Ok(new
        {
            id = productId,
            sku,
            name,
            description,
            basePrice,
            status,
            categoryId,
            categoryName,
            createdAt,
            updatedAt,
            isClearance,
            isRefurbished,
            imageS3Keys,
            videoUrls,
            storeIds,
            storeStock
        });
    }

    [Authorize]
    [HttpGet("categories/tree")]
    public async Task<IActionResult> GetCategoryTree()
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT id, parent_id, name, level
                          FROM app.categories
                          ORDER BY level ASC, name ASC;
                          """;

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                parentId = reader.IsDBNull(1) ? (Guid?)null : reader.GetGuid(1),
                name = reader.GetString(2),
                level = reader.GetInt16(3)
            });
        }

        return Ok(new { items });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] UpsertProductRequest request)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var normalized = await ProductUpsertValidation.ValidateAndNormalizeAsync(_dataSource, request);
        if (normalized.Errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = normalized.Errors });
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();
        var (storeErrors, effectiveStoreIds) = await ProductStoreScope.ResolveForUpsert(
            currentUserRole,
            actorUserId,
            request,
            isCreate: true,
            existingProductId: null,
            conn);
        if (storeErrors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = storeErrors });
        }

        var stockFieldErrors = ProductStoreScope.ValidateStockForEffectiveStores(request, effectiveStoreIds, out var quantityByStore);
        if (stockFieldErrors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = stockFieldErrors });
        }

        await using var tx = await conn.BeginTransactionAsync();
        var hasProductVideosTable = await ProductPersistence.HasProductVideosTableAsync(conn);

        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                              INSERT INTO app.products (sku, name, description, base_price, status, category_id, created_by, is_clearance, clearance_marked_at, is_refurbished, refurbished_marked_at)
                              VALUES (@sku, @name, @description, @base_price, @status, @category_id, @created_by, @is_clearance, CASE WHEN @is_clearance THEN NOW() ELSE NULL END, @is_refurbished, CASE WHEN @is_refurbished THEN NOW() ELSE NULL END)
                              RETURNING id, created_at, updated_at;
                              """;
            cmd.Parameters.AddWithValue("sku", normalized.Sku);
            cmd.Parameters.AddWithValue("name", normalized.Name);
            cmd.Parameters.AddWithValue("description", (object?)normalized.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("base_price", normalized.BasePrice);
            cmd.Parameters.AddWithValue("status", normalized.Status);
            cmd.Parameters.AddWithValue("category_id", normalized.CategoryId);
            cmd.Parameters.AddWithValue("created_by", (object?)actorUserId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("is_clearance", normalized.IsClearance);
            cmd.Parameters.AddWithValue("is_refurbished", normalized.IsRefurbished);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                await tx.RollbackAsync();
                return StatusCode(500, new { message = "Unable to create product." });
            }

            var productId = reader.GetGuid(0);
            var createdAt = reader.GetDateTime(1);
            var updatedAt = reader.GetDateTime(2);
            await reader.DisposeAsync();

            await ProductPersistence.ReplaceProductImagesAsync(conn, tx, productId, normalized.ImageS3Keys);
            if (hasProductVideosTable)
            {
                await ProductPersistence.ReplaceProductVideosAsync(conn, tx, productId, normalized.VideoUrls);
            }

            await ProductPersistence.ReplaceAllStoreProductLinksAsync(conn, tx, productId, effectiveStoreIds, quantityByStore);

            await ProductPersistence.WriteAuditLogAsync(conn, tx, actorUserId, "product.created", "product", productId, new
            {
                normalized.Sku,
                normalized.Name,
                normalized.Status,
                storeIds = effectiveStoreIds
            });

            await tx.CommitAsync();

            var stockRowsCreated = await ProductPersistence.GetStoreStockRowsForProductAsync(conn, productId);
            var storeStockPayload = stockRowsCreated.ConvertAll(r => new { storeId = r.StoreId, quantity = r.Quantity });

            return Ok(new
            {
                id = productId,
                sku = normalized.Sku,
                name = normalized.Name,
                description = normalized.Description,
                basePrice = normalized.BasePrice,
                status = normalized.Status,
                categoryId = normalized.CategoryId,
                isClearance = normalized.IsClearance,
                isRefurbished = normalized.IsRefurbished,
                imageS3Keys = normalized.ImageS3Keys,
                videoUrls = normalized.VideoUrls,
                storeIds = effectiveStoreIds,
                storeStock = storeStockPayload,
                createdAt,
                updatedAt
            });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            await tx.RollbackAsync();
            return Conflict(new
            {
                message = "SKU already exists.",
                errors = new Dictionary<string, string> { ["sku"] = "This SKU is already used by another product." }
            });
        }
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct([FromRoute] Guid id, [FromBody] UpsertProductRequest request)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var normalized = await ProductUpsertValidation.ValidateAndNormalizeAsync(_dataSource, request);
        if (normalized.Errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = normalized.Errors });
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();
        var (storeErrors, effectiveStoreIds) = await ProductStoreScope.ResolveForUpsert(
            currentUserRole,
            actorUserId,
            request,
            isCreate: false,
            existingProductId: id,
            conn);
        if (storeErrors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = storeErrors });
        }

        var stockFieldErrorsUpdate = ProductStoreScope.ValidateStockForEffectiveStores(request, effectiveStoreIds, out var quantityByStoreUpdate);
        if (stockFieldErrorsUpdate.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = stockFieldErrorsUpdate });
        }

        await using var tx = await conn.BeginTransactionAsync();
        var hasProductVideosTable = await ProductPersistence.HasProductVideosTableAsync(conn);

        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                              UPDATE app.products
                              SET
                                  sku = @sku,
                                  name = @name,
                                  description = @description,
                                  base_price = @base_price,
                                  status = @status,
                                  category_id = @category_id,
                                  is_clearance = @is_clearance,
                                  clearance_marked_at = CASE
                                      WHEN NOT @is_clearance THEN NULL
                                      WHEN is_clearance THEN clearance_marked_at
                                      ELSE NOW()
                                  END,
                                  is_refurbished = @is_refurbished,
                                  refurbished_marked_at = CASE
                                      WHEN NOT @is_refurbished THEN NULL
                                      WHEN is_refurbished THEN refurbished_marked_at
                                      ELSE NOW()
                                  END,
                                  updated_at = NOW()
                              WHERE id = @id
                              RETURNING created_at, updated_at;
                              """;
            cmd.Parameters.AddWithValue("id", id);
            cmd.Parameters.AddWithValue("sku", normalized.Sku);
            cmd.Parameters.AddWithValue("name", normalized.Name);
            cmd.Parameters.AddWithValue("description", (object?)normalized.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("base_price", normalized.BasePrice);
            cmd.Parameters.AddWithValue("status", normalized.Status);
            cmd.Parameters.AddWithValue("category_id", normalized.CategoryId);
            cmd.Parameters.AddWithValue("is_clearance", normalized.IsClearance);
            cmd.Parameters.AddWithValue("is_refurbished", normalized.IsRefurbished);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                await tx.RollbackAsync();
                return NotFound(new { message = "Product not found." });
            }

            var createdAt = reader.GetDateTime(0);
            var updatedAt = reader.GetDateTime(1);
            await reader.DisposeAsync();

            await ProductPersistence.ReplaceProductImagesAsync(conn, tx, id, normalized.ImageS3Keys);
            if (hasProductVideosTable)
            {
                await ProductPersistence.ReplaceProductVideosAsync(conn, tx, id, normalized.VideoUrls);
            }

            if (ProductStoreScope.IsAdminRole(currentUserRole))
            {
                await ProductPersistence.ReplaceAllStoreProductLinksAsync(conn, tx, id, effectiveStoreIds, quantityByStoreUpdate);
            }
            else
            {
                var managed = actorUserId is null
                    ? new List<Guid>()
                    : await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, actorUserId.Value);
                await ProductPersistence.MergeStoreProductLinksForStoreManagerAsync(conn, tx, id, managed, effectiveStoreIds, quantityByStoreUpdate);
            }

            await ProductPersistence.WriteAuditLogAsync(conn, tx, actorUserId, "product.updated", "product", id, new
            {
                normalized.Sku,
                normalized.Name,
                normalized.Status,
                storeIds = effectiveStoreIds
            });

            await tx.CommitAsync();

            var storeIdsResponse = await ProductPersistence.GetStoreIdsForProductAsync(conn, id);
            var stockRowsUpdate = await ProductPersistence.GetStoreStockRowsForProductAsync(conn, id);
            if (!ProductStoreScope.IsAdminRole(currentUserRole) && actorUserId is not null)
            {
                var managedOut = await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, actorUserId.Value);
                storeIdsResponse = storeIdsResponse.Where(managedOut.Contains).ToList();
                stockRowsUpdate = stockRowsUpdate.Where(r => managedOut.Contains(r.StoreId)).ToList();
            }

            var storeStockPayloadUpdate = stockRowsUpdate.ConvertAll(r => new { storeId = r.StoreId, quantity = r.Quantity });

            return Ok(new
            {
                id,
                sku = normalized.Sku,
                name = normalized.Name,
                description = normalized.Description,
                basePrice = normalized.BasePrice,
                status = normalized.Status,
                categoryId = normalized.CategoryId,
                isClearance = normalized.IsClearance,
                isRefurbished = normalized.IsRefurbished,
                imageS3Keys = normalized.ImageS3Keys,
                videoUrls = normalized.VideoUrls,
                storeIds = storeIdsResponse,
                storeStock = storeStockPayloadUpdate,
                createdAt,
                updatedAt
            });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            await tx.RollbackAsync();
            return Conflict(new
            {
                message = "SKU already exists.",
                errors = new Dictionary<string, string> { ["sku"] = "This SKU is already used by another product." }
            });
        }
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> SoftDeleteProduct([FromRoute] Guid id)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();

        if (!ProductStoreScope.IsAdminRole(currentUserRole))
        {
            if (actorUserId is null)
            {
                return Unauthorized(new { message = "Invalid session token." });
            }

            var managed = await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, actorUserId.Value);
            var productStores = await ProductPersistence.GetStoreIdsForProductAsync(conn, id);
            if (productStores.Count == 0)
            {
                return NotFound(new { message = "Product not found." });
            }

            if (productStores.Any(s => !managed.Contains(s)))
            {
                return Forbid();
            }
        }

        await using var tx = await conn.BeginTransactionAsync();

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          UPDATE app.products
                          SET status = 'inactive', updated_at = NOW()
                          WHERE id = @id
                          RETURNING id, sku, name, status;
                          """;
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            await tx.RollbackAsync();
            return NotFound(new { message = "Product not found." });
        }

        var productId = reader.GetGuid(0);
        var sku = reader.GetString(1);
        var name = reader.GetString(2);
        var status = reader.GetString(3);
        await reader.DisposeAsync();

        await ProductPersistence.WriteAuditLogAsync(conn, tx, actorUserId, "product.soft_deleted", "product", productId, new { sku, name });
        await tx.CommitAsync();

        return Ok(new { id = productId, sku, name, status });
    }
}
