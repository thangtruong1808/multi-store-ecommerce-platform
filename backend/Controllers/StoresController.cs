using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StoresController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;

    public StoresController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public sealed record UpsertStoreRequest(
        string Name,
        string Slug,
        string? Email,
        string? Phone,
        string DefaultCurrencyCode,
        string Timezone,
        bool IsActive
    );

    /// <summary>Stores the signed-in user may use when creating products (admin: all; others: via store_staff).</summary>
    [Authorize]
    [HttpGet("managed")]
    public async Task<IActionResult> ListManagedStores()
    {
        var role = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(role))
        {
            return Forbid();
        }

        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        await using var conn = await _dataSource.OpenConnectionAsync();

        await using var cmd = conn.CreateCommand();
        if (string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            cmd.CommandText = """
                              SELECT id, name, slug, is_active
                              FROM app.stores
                              ORDER BY name ASC;
                              """;
        }
        else
        {
            cmd.CommandText = """
                              SELECT s.id, s.name, s.slug, s.is_active
                              FROM app.stores s
                              INNER JOIN app.store_staff ss ON ss.store_id = s.id
                              WHERE ss.user_id = @user_id
                              ORDER BY s.name ASC;
                              """;
            cmd.Parameters.AddWithValue("user_id", userId.Value);
        }

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                name = reader.GetString(1),
                slug = reader.GetString(2),
                isActive = reader.GetBoolean(3)
            });
        }

        return Ok(new { items });
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> ListStores(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? q = null)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(role))
        {
            return Forbid();
        }

        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 50);
        var offset = (safePage - 1) * safePageSize;
        var search = string.IsNullOrWhiteSpace(q) ? null : q.Trim();

        await using var conn = await _dataSource.OpenConnectionAsync();

        await using var countCmd = conn.CreateCommand();
        countCmd.CommandText = """
                               SELECT COUNT(*)
                               FROM app.stores s
                               WHERE (@search IS NULL OR s.name ILIKE '%' || @search || '%' OR s.slug ILIKE '%' || @search || '%');
                               """;
        AddNullableTextParameter(countCmd, "search", search);
        var totalItems = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT
                              s.id,
                              s.name,
                              s.slug,
                              s.email,
                              s.phone,
                              s.default_currency_code,
                              s.timezone,
                              s.is_active,
                              s.created_at,
                              s.updated_at
                          FROM app.stores s
                          WHERE (@search IS NULL OR s.name ILIKE '%' || @search || '%' OR s.slug ILIKE '%' || @search || '%')
                          ORDER BY s.created_at DESC
                          LIMIT @limit OFFSET @offset;
                          """;
        AddNullableTextParameter(cmd, "search", search);
        cmd.Parameters.AddWithValue("limit", safePageSize);
        cmd.Parameters.AddWithValue("offset", offset);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                name = reader.GetString(1),
                slug = reader.GetString(2),
                email = reader.IsDBNull(3) ? null : reader.GetString(3),
                phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                defaultCurrencyCode = reader.GetString(5),
                timezone = reader.GetString(6),
                isActive = reader.GetBoolean(7),
                createdAt = reader.GetDateTime(8),
                updatedAt = reader.GetDateTime(9)
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
    [HttpPost]
    public async Task<IActionResult> CreateStore([FromBody] UpsertStoreRequest request)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!IsAdmin(role))
        {
            return Forbid();
        }

        var normalized = NormalizeStoreRequest(request, out var errors);
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors });
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();

        await using var dupCmd = conn.CreateCommand();
        dupCmd.CommandText = """
                             SELECT id FROM app.stores WHERE lower(slug) = lower(@slug) LIMIT 1;
                             """;
        dupCmd.Parameters.AddWithValue("slug", normalized.Slug);
        var existing = await dupCmd.ExecuteScalarAsync();
        if (existing is not null && existing is not DBNull)
        {
            return Conflict(new
            {
                message = "Slug already exists.",
                errors = new Dictionary<string, string> { ["slug"] = "This slug is already used by another store." }
            });
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          INSERT INTO app.stores (name, slug, email, phone, default_currency_code, timezone, is_active)
                          VALUES (@name, @slug, @email, @phone, @currency, @timezone, @is_active)
                          RETURNING id, created_at, updated_at;
                          """;
        cmd.Parameters.AddWithValue("name", normalized.Name);
        cmd.Parameters.AddWithValue("slug", normalized.Slug);
        cmd.Parameters.AddWithValue("email", (object?)normalized.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("phone", (object?)normalized.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("currency", normalized.Currency);
        cmd.Parameters.AddWithValue("timezone", normalized.Timezone);
        cmd.Parameters.AddWithValue("is_active", normalized.IsActive);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return StatusCode(500, new { message = "Unable to create store." });
        }

        var id = reader.GetGuid(0);
        var createdAt = reader.GetDateTime(1);
        var updatedAt = reader.GetDateTime(2);
        await reader.DisposeAsync();

        await WriteAuditLogAsync(conn, actorUserId, "store.created", "store", id, new { normalized.Name, normalized.Slug });

        return Ok(new
        {
            id,
            name = normalized.Name,
            slug = normalized.Slug,
            email = normalized.Email,
            phone = normalized.Phone,
            defaultCurrencyCode = normalized.Currency,
            timezone = normalized.Timezone,
            isActive = normalized.IsActive,
            createdAt,
            updatedAt
        });
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateStore([FromRoute] Guid id, [FromBody] UpsertStoreRequest request)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!IsAdmin(role))
        {
            return Forbid();
        }

        var normalized = NormalizeStoreRequest(request, out var errors);
        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors });
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();

        await using var dupCmd = conn.CreateCommand();
        dupCmd.CommandText = """
                             SELECT id FROM app.stores WHERE lower(slug) = lower(@slug) AND id <> @id LIMIT 1;
                             """;
        dupCmd.Parameters.AddWithValue("slug", normalized.Slug);
        dupCmd.Parameters.AddWithValue("id", id);
        var dup = await dupCmd.ExecuteScalarAsync();
        if (dup is not null && dup is not DBNull)
        {
            return Conflict(new
            {
                message = "Slug already exists.",
                errors = new Dictionary<string, string> { ["slug"] = "This slug is already used by another store." }
            });
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          UPDATE app.stores
                          SET
                              name = @name,
                              slug = @slug,
                              email = @email,
                              phone = @phone,
                              default_currency_code = @currency,
                              timezone = @timezone,
                              is_active = @is_active,
                              updated_at = NOW()
                          WHERE id = @id
                          RETURNING created_at, updated_at;
                          """;
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("name", normalized.Name);
        cmd.Parameters.AddWithValue("slug", normalized.Slug);
        cmd.Parameters.AddWithValue("email", (object?)normalized.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("phone", (object?)normalized.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("currency", normalized.Currency);
        cmd.Parameters.AddWithValue("timezone", normalized.Timezone);
        cmd.Parameters.AddWithValue("is_active", normalized.IsActive);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "Store not found." });
        }

        var createdAt = reader.GetDateTime(0);
        var updatedAt = reader.GetDateTime(1);
        await reader.DisposeAsync();

        await WriteAuditLogAsync(conn, actorUserId, "store.updated", "store", id, new { normalized.Name, normalized.Slug });

        return Ok(new
        {
            id,
            name = normalized.Name,
            slug = normalized.Slug,
            email = normalized.Email,
            phone = normalized.Phone,
            defaultCurrencyCode = normalized.Currency,
            timezone = normalized.Timezone,
            isActive = normalized.IsActive,
            createdAt,
            updatedAt
        });
    }

    /// <summary>Soft-deactivate a store (sets is_active = false).</summary>
    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeactivateStore([FromRoute] Guid id)
    {
        var role = await GetCurrentUserRoleAsync();
        if (!IsAdmin(role))
        {
            return Forbid();
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          UPDATE app.stores
                          SET is_active = FALSE, updated_at = NOW()
                          WHERE id = @id
                          RETURNING id, name, slug, is_active;
                          """;
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "Store not found." });
        }

        var sid = reader.GetGuid(0);
        var name = reader.GetString(1);
        var slug = reader.GetString(2);
        var isActive = reader.GetBoolean(3);
        await reader.DisposeAsync();

        await WriteAuditLogAsync(conn, actorUserId, "store.deactivated", "store", sid, new { name, slug });

        return Ok(new { id = sid, name, slug, isActive });
    }

    private static (string Name, string Slug, string? Email, string? Phone, string Currency, string Timezone, bool IsActive) NormalizeStoreRequest(
        UpsertStoreRequest request,
        out Dictionary<string, string> errors)
    {
        errors = new Dictionary<string, string>();
        var name = (request.Name ?? string.Empty).Trim();
        var slugSource = string.IsNullOrWhiteSpace(request.Slug) ? name : request.Slug.Trim();
        var slug = ToSlug(slugSource);
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        var currency = string.IsNullOrWhiteSpace(request.DefaultCurrencyCode)
            ? "AUD"
            : request.DefaultCurrencyCode.Trim().ToUpperInvariant();
        if (currency.Length != 3)
        {
            errors["defaultCurrencyCode"] = "Currency code must be exactly 3 characters.";
        }

        var timezone = string.IsNullOrWhiteSpace(request.Timezone)
            ? "Australia/Sydney"
            : request.Timezone.Trim();

        if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
        {
            errors["name"] = "Store name must be at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(slug))
        {
            errors["slug"] = "Slug cannot be empty.";
        }

        return (name, slug, email, phone, currency, timezone, request.IsActive);
    }

    private static string ToSlug(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        var buffer = new StringBuilder(input.Length);
        var previousDash = false;

        foreach (var ch in input.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch))
            {
                buffer.Append(ch);
                previousDash = false;
                continue;
            }

            if (previousDash)
            {
                continue;
            }

            buffer.Append('-');
            previousDash = true;
        }

        return buffer.ToString().Trim('-');
    }

    private static bool CanAccessDashboard(string? role)
    {
        return role is "admin" or "store_manager";
    }

    private static bool IsAdmin(string? role)
    {
        return string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<string?> GetCurrentUserRoleAsync()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return null;
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT role::text
                          FROM app.users
                          WHERE id = @user_id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("user_id", userId);

        var roleResult = await cmd.ExecuteScalarAsync();
        return roleResult as string;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdRaw, out var userId) ? userId : null;
    }

    private static async Task WriteAuditLogAsync(
        NpgsqlConnection conn,
        Guid? userId,
        string action,
        string? entityType = null,
        Guid? entityId = null,
        object? metadata = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          INSERT INTO app.audit_logs (store_id, user_id, action, entity_type, entity_id, metadata, ip_address)
                          VALUES (@store_id, @user_id, @action, @entity_type, @entity_id, CAST(@metadata AS jsonb), @ip_address);
                          """;
        cmd.Parameters.AddWithValue("store_id", DBNull.Value);
        cmd.Parameters.AddWithValue("user_id", (object?)userId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("action", action);
        cmd.Parameters.AddWithValue("entity_type", (object?)entityType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("entity_id", (object?)entityId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("metadata", metadata is null ? "{}" : System.Text.Json.JsonSerializer.Serialize(metadata));
        cmd.Parameters.Add(new NpgsqlParameter("ip_address", NpgsqlDbType.Inet) { Value = DBNull.Value });
        await cmd.ExecuteNonQueryAsync();
    }

    private static void AddNullableTextParameter(NpgsqlCommand command, string name, string? value)
    {
        command.Parameters.Add(new NpgsqlParameter<string?>(name, NpgsqlDbType.Text) { TypedValue = value });
    }
}
