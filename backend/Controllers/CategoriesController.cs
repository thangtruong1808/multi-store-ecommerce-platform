using System.Globalization;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;

    public CategoriesController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public sealed record UpsertCategoryRequest(string Name, short Level, Guid? ParentId, string? Slug);

    [AllowAnonymous]
    [HttpGet("public")]
    public async Task<IActionResult> ListPublicCategories()
    {
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT id, parent_id, name, slug, level
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
                slug = reader.GetString(3),
                level = reader.GetInt16(4)
            });
        }

        return Ok(new { items });
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> ListCategories(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] short? level = null,
        [FromQuery] Guid? parentId = null,
        [FromQuery] string? q = null)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 50);
        var offset = (safePage - 1) * safePageSize;
        var search = q?.Trim();

        if (level is < 1 or > 3)
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string> { ["level"] = "Level must be between 1 and 3." }
            });
        }

        await using var conn = await _dataSource.OpenConnectionAsync();

        await using var countCmd = conn.CreateCommand();
        countCmd.CommandText = """
                              SELECT COUNT(*)
                              FROM app.categories c
                              WHERE (@level IS NULL OR c.level = @level)
                                AND (@parent_id IS NULL OR c.parent_id = @parent_id)
                                AND (@search IS NULL OR c.name ILIKE '%' || @search || '%' OR c.slug ILIKE '%' || @search || '%');
                              """;
        AddNullableSmallintParameter(countCmd, "level", level);
        AddNullableUuidParameter(countCmd, "parent_id", parentId);
        AddNullableTextParameter(countCmd, "search", search);
        var totalItems = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT
                              c.id,
                              c.parent_id,
                              c.name,
                              c.slug,
                              c.level,
                              c.created_at,
                              parent.name AS parent_name
                          FROM app.categories c
                          LEFT JOIN app.categories parent ON parent.id = c.parent_id
                          WHERE (@level IS NULL OR c.level = @level)
                            AND (@parent_id IS NULL OR c.parent_id = @parent_id)
                            AND (@search IS NULL OR c.name ILIKE '%' || @search || '%' OR c.slug ILIKE '%' || @search || '%')
                          ORDER BY c.level ASC, c.created_at DESC
                          LIMIT @limit OFFSET @offset;
                          """;
        AddNullableSmallintParameter(cmd, "level", level);
        AddNullableUuidParameter(cmd, "parent_id", parentId);
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
                parentId = reader.IsDBNull(1) ? (Guid?)null : reader.GetGuid(1),
                name = reader.GetString(2),
                slug = reader.GetString(3),
                level = reader.GetInt16(4),
                createdAt = reader.GetDateTime(5),
                parentName = reader.IsDBNull(6) ? null : reader.GetString(6)
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
    [HttpGet("parents")]
    public async Task<IActionResult> ListParentCandidates([FromQuery] short level)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        if (level is < 2 or > 3)
        {
            return Ok(new { items = Array.Empty<object>() });
        }

        var expectedParentLevel = (short)(level - 1);
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT id, name, slug, level
                          FROM app.categories
                          WHERE level = @level
                          ORDER BY name ASC;
                          """;
        cmd.Parameters.AddWithValue("level", expectedParentLevel);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                name = reader.GetString(1),
                slug = reader.GetString(2),
                level = reader.GetInt16(3)
            });
        }

        return Ok(new { items });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] UpsertCategoryRequest request)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var actorUserId = GetCurrentUserId();
        var normalized = await ValidateAndNormalizeAsync(request, null);
        if (normalized.Errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = normalized.Errors });
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          INSERT INTO app.categories (name, slug, level, parent_id)
                          VALUES (@name, @slug, @level, @parent_id)
                          RETURNING id, parent_id, name, slug, level, created_at;
                          """;
        cmd.Parameters.AddWithValue("name", normalized.Name);
        cmd.Parameters.AddWithValue("slug", normalized.Slug);
        cmd.Parameters.AddWithValue("level", normalized.Level);
        cmd.Parameters.AddWithValue("parent_id", (object?)normalized.ParentId ?? DBNull.Value);

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return StatusCode(500, new { message = "Unable to create category." });
            }

            var id = reader.GetGuid(0);
            var parentId = reader.IsDBNull(1) ? (Guid?)null : reader.GetGuid(1);
            var name = reader.GetString(2);
            var slug = reader.GetString(3);
            var level = reader.GetInt16(4);
            var createdAt = reader.GetDateTime(5);
            await reader.DisposeAsync();

            await WriteAuditLogAsync(
                conn,
                actorUserId,
                "category.created",
                "category",
                id,
                new { name, slug, level, parentId }
            );

            return Ok(new
            {
                id,
                parentId,
                name,
                slug,
                level,
                createdAt
            });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new
            {
                message = "A category with this slug already exists under the selected parent.",
                errors = new Dictionary<string, string> { ["slug"] = "Slug already exists for this parent." }
            });
        }
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCategory([FromRoute] Guid id, [FromBody] UpsertCategoryRequest request)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var actorUserId = GetCurrentUserId();
        var normalized = await ValidateAndNormalizeAsync(request, id);
        if (normalized.Errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = normalized.Errors });
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          UPDATE app.categories
                          SET name = @name, slug = @slug, level = @level, parent_id = @parent_id
                          WHERE id = @id
                          RETURNING id, parent_id, name, slug, level, created_at;
                          """;
        cmd.Parameters.AddWithValue("id", id);
        cmd.Parameters.AddWithValue("name", normalized.Name);
        cmd.Parameters.AddWithValue("slug", normalized.Slug);
        cmd.Parameters.AddWithValue("level", normalized.Level);
        cmd.Parameters.AddWithValue("parent_id", (object?)normalized.ParentId ?? DBNull.Value);

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "Category not found." });
            }

            var updatedId = reader.GetGuid(0);
            var parentId = reader.IsDBNull(1) ? (Guid?)null : reader.GetGuid(1);
            var name = reader.GetString(2);
            var slug = reader.GetString(3);
            var level = reader.GetInt16(4);
            var createdAt = reader.GetDateTime(5);
            await reader.DisposeAsync();

            await WriteAuditLogAsync(
                conn,
                actorUserId,
                "category.updated",
                "category",
                updatedId,
                new { name, slug, level, parentId }
            );

            return Ok(new
            {
                id = updatedId,
                parentId,
                name,
                slug,
                level,
                createdAt
            });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new
            {
                message = "A category with this slug already exists under the selected parent.",
                errors = new Dictionary<string, string> { ["slug"] = "Slug already exists for this parent." }
            });
        }
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCategory([FromRoute] Guid id)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using (var childCheckCmd = conn.CreateCommand())
        {
            childCheckCmd.CommandText = "SELECT COUNT(*) FROM app.categories WHERE parent_id = @id;";
            childCheckCmd.Parameters.AddWithValue("id", id);
            var childCount = Convert.ToInt32(await childCheckCmd.ExecuteScalarAsync());
            if (childCount > 0)
            {
                return Conflict(new
                {
                    message = "Cannot delete category because it still has child categories."
                });
            }
        }

        await using (var productCheckCmd = conn.CreateCommand())
        {
            productCheckCmd.CommandText = "SELECT COUNT(*) FROM app.products WHERE category_id = @id;";
            productCheckCmd.Parameters.AddWithValue("id", id);
            var productCount = Convert.ToInt32(await productCheckCmd.ExecuteScalarAsync());
            if (productCount > 0)
            {
                return Conflict(new
                {
                    message = "Cannot delete category because products are linked to it."
                });
            }
        }

        var actorUserId = GetCurrentUserId();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          DELETE FROM app.categories
                          WHERE id = @id
                          RETURNING id, name, slug, level, parent_id;
                          """;
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "Category not found." });
        }

        var deletedId = reader.GetGuid(0);
        var deletedName = reader.GetString(1);
        var deletedSlug = reader.GetString(2);
        var deletedLevel = reader.GetInt16(3);
        var deletedParentId = reader.IsDBNull(4) ? (Guid?)null : reader.GetGuid(4);
        await reader.DisposeAsync();

        await WriteAuditLogAsync(
            conn,
            actorUserId,
            "category.deleted",
            "category",
            deletedId,
            new { name = deletedName, slug = deletedSlug, level = deletedLevel, parentId = deletedParentId }
        );

        return Ok(new
        {
            id = deletedId,
            name = deletedName,
            slug = deletedSlug,
            level = deletedLevel,
            parentId = deletedParentId
        });
    }

    private static bool CanAccessDashboard(string? role)
    {
        return role is "admin" or "store_manager";
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

    private async Task<(Dictionary<string, string> Errors, string Name, string Slug, short Level, Guid? ParentId)> ValidateAndNormalizeAsync(
        UpsertCategoryRequest request,
        Guid? editingId)
    {
        var errors = new Dictionary<string, string>();
        var name = request.Name?.Trim() ?? string.Empty;
        var level = request.Level;
        var parentId = request.ParentId;

        if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
        {
            errors["name"] = "Category name must be at least 2 characters.";
        }

        if (level is < 1 or > 3)
        {
            errors["level"] = "Level must be between 1 and 3.";
        }

        if (level == 1)
        {
            parentId = null;
        }
        else if (parentId is null)
        {
            errors["parentId"] = $"Parent category is required for level {level}.";
        }

        if (editingId.HasValue && parentId == editingId)
        {
            errors["parentId"] = "Category cannot be its own parent.";
        }

        if (parentId.HasValue && level is >= 2 and <= 3)
        {
            await using var conn = await _dataSource.OpenConnectionAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT level FROM app.categories WHERE id = @id LIMIT 1;";
            cmd.Parameters.AddWithValue("id", parentId.Value);
            var parentLevelRaw = await cmd.ExecuteScalarAsync();
            if (parentLevelRaw is null)
            {
                errors["parentId"] = "Selected parent category does not exist.";
            }
            else
            {
                var parentLevel = Convert.ToInt16(parentLevelRaw, CultureInfo.InvariantCulture);
                var expected = (short)(level - 1);
                if (parentLevel != expected)
                {
                    errors["parentId"] = $"Parent category for level {level} must be level {expected}.";
                }
            }
        }

        var slugCandidate = string.IsNullOrWhiteSpace(request.Slug) ? name : request.Slug.Trim();
        var slug = ToSlug(slugCandidate);
        if (string.IsNullOrWhiteSpace(slug))
        {
            errors["slug"] = "Slug cannot be empty.";
        }

        return (errors, name, slug, level, parentId);
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

    private static void AddNullableUuidParameter(NpgsqlCommand command, string name, Guid? value)
    {
        command.Parameters.Add(new NpgsqlParameter<Guid?>(name, NpgsqlDbType.Uuid) { TypedValue = value });
    }

    private static void AddNullableSmallintParameter(NpgsqlCommand command, string name, short? value)
    {
        command.Parameters.Add(new NpgsqlParameter<short?>(name, NpgsqlDbType.Smallint) { TypedValue = value });
    }

    private static void AddNullableTextParameter(NpgsqlCommand command, string name, string? value)
    {
        command.Parameters.Add(new NpgsqlParameter<string?>(name, NpgsqlDbType.Text) { TypedValue = value });
    }
}
