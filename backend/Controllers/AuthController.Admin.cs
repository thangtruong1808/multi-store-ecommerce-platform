using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

// The partial keyword allows you to split the definition of a class, record, or method across multiple files. This is useful for large projects where you want to organize your code into smaller, more manageable files.
public partial class AuthController
{
    // The Authorize attribute is used to require authentication for the method.
    [Authorize]
    // The HttpGet attribute is used to define a GET request endpoint.
    [HttpGet("permissions/me")]
    public async Task<IActionResult> GetMyEffectivePermissions()
    {
        // Get the user ID from the JWT token
        var userIdRaw = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        // Open a connection to the database
        await using var conn = await _dataSource.OpenConnectionAsync();

        // Create a command to get the user's role
        await using var roleCmd = conn.CreateCommand();
        // The CommandText property is used to define the SQL command to execute.
        roleCmd.CommandText = """
                              SELECT role::text
                              FROM app.users
                              WHERE id = @user_id
                              LIMIT 1;
                              """;
        // The Parameters property is used to add parameters to the SQL command.
        roleCmd.Parameters.AddWithValue("user_id", userId);
        // The ExecuteScalarAsync method is used to execute the SQL command and return the result.
        var roleResult = await roleCmd.ExecuteScalarAsync();
        // If the user's role is not found, return an unauthorized error
        if (roleResult is not string role || string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized(new { message = "User not found." });
        }

        // Ensure the user has the necessary permissions
        await EnsureRolePermissionsAsync(conn, role);

        // Create a command to get the user's permissions
        await using var permissionCmd = conn.CreateCommand();
        // The CommandText property is used to define the SQL command to execute.
        permissionCmd.CommandText = """
                                    SELECT p.code
                                    FROM app.role_permissions rp
                                    INNER JOIN app.permissions p ON p.id = rp.permission_id
                                    WHERE rp.role = CAST(@role AS app.user_role)
                                    ORDER BY p.code;
                                    """;
        // The Parameters property is used to add parameters to the SQL command.
        permissionCmd.Parameters.AddWithValue("role", role);
        // The ExecuteReaderAsync method is used to execute the SQL command and return the result.
        // The reader is used to read the result of the SQL command.
        await using var reader = await permissionCmd.ExecuteReaderAsync();
        // Create a list to store the user's permissions
        var permissions = new List<string>();
        // Read the permissions from the result
        while (await reader.ReadAsync())
        {
            permissions.Add(reader.GetString(0));
        }

        // Return the user's permissions
        return Ok(new
        {
            userId,
            role,
            permissions
        });
    }

    [Authorize]
    [HttpGet("users")]
    public async Task<IActionResult> ListUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        // Get the current user's role
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        // Calculate the offset and limit
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 50);
        var offset = (safePage - 1) * safePageSize;

        // Open a connection to the database
        await using var conn = await _dataSource.OpenConnectionAsync();
        // Create a command to count the total number of users

        await using var countCmd = conn.CreateCommand();
        // The CommandText property is used to define the SQL command to execute.
        countCmd.CommandText = "SELECT COUNT(*) FROM app.users;";
        // The ExecuteScalarAsync method is used to execute the SQL command and return the result.
        var totalItems = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var cmd = conn.CreateCommand();
        // The CommandText property is used to define the SQL command to execute.
        cmd.CommandText = """
                          SELECT
                              id,
                              role::text,
                              first_name,
                              last_name,
                              email,
                              mobile,
                              is_active,
                              created_at
                          FROM app.users
                          ORDER BY created_at DESC
                          LIMIT @limit OFFSET @offset;
                          """;
        // The Parameters property is used to add parameters to the SQL command.
        cmd.Parameters.AddWithValue("limit", safePageSize);
        cmd.Parameters.AddWithValue("offset", offset);

        await using var reader = await cmd.ExecuteReaderAsync();
        // Create a list to store the users
        var items = new List<object>();
        // Read the users from the result
        // The reader is used to read the result of the SQL command.
        while (await reader.ReadAsync())
        {
            items.Add(new
            // Create a new user object
            {
                id = reader.GetGuid(0),
                role = reader.GetString(1),
                firstName = reader.GetString(2),
                lastName = reader.GetString(3),
                email = reader.GetString(4),
                mobile = reader.IsDBNull(5) ? null : reader.GetString(5),
                isActive = reader.GetBoolean(6),
                createdAt = reader.GetDateTime(7)
            });
        }

        // Return the users
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
    [HttpGet("activity-logs")]
    public async Task<IActionResult> ListActivityLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        // Get the current user's role
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        // Calculate the offset and limit
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 50);
        var offset = (safePage - 1) * safePageSize;

        await using var conn = await _dataSource.OpenConnectionAsync();

        await using var countCmd = conn.CreateCommand();
        countCmd.CommandText = "SELECT COUNT(*) FROM app.audit_logs;";
        var totalItems = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT
                              al.id,
                              COALESCE(u.first_name, 'Unknown') AS first_name,
                              COALESCE(u.last_name, 'User') AS last_name,
                              COALESCE(u.email, 'unknown@system.local') AS email,
                              al.action,
                              al.created_at
                          FROM app.audit_logs al
                          LEFT JOIN app.users u ON u.id = al.user_id
                          ORDER BY al.created_at DESC
                          LIMIT @limit OFFSET @offset;
                          """;
        cmd.Parameters.AddWithValue("limit", safePageSize);
        cmd.Parameters.AddWithValue("offset", offset);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                firstName = reader.GetString(1),
                lastName = reader.GetString(2),
                email = reader.GetString(3),
                action = reader.GetString(4),
                createdAt = reader.GetDateTime(5)
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

    /// <summary>Store IDs assigned via store_staff (admin uses this when editing store_manager/staff).</summary>
    [Authorize]
    [HttpGet("users/{id:guid}/managed-stores")]
    public async Task<IActionResult> GetUserManagedStoreIds([FromRoute] Guid id)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT ss.store_id
                          FROM app.store_staff ss
                          WHERE ss.user_id = @user_id
                          ORDER BY ss.created_at ASC;
                          """;
        cmd.Parameters.AddWithValue("user_id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        var storeIds = new List<Guid>();
        while (await reader.ReadAsync())
        {
            storeIds.Add(reader.GetGuid(0));
        }

        return Ok(new { storeIds });
    }

    [Authorize]
    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> UpdateUser([FromRoute] Guid id, [FromBody] UpdateUserRequest request)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var firstName = request.FirstName?.Trim() ?? string.Empty;
        var lastName = request.LastName?.Trim() ?? string.Empty;
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var mobile = request.Mobile?.Trim();
        var nextRole = request.Role?.Trim().ToLowerInvariant() ?? string.Empty;
        var isActive = request.IsActive;

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(firstName) || firstName.Length < 2)
        {
            errors["firstName"] = "First name must be at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(lastName) || lastName.Length < 2)
        {
            errors["lastName"] = "Last name must be at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            errors["email"] = "Email format is invalid.";
        }

        if (!string.IsNullOrWhiteSpace(mobile) && mobile.Length < 8)
        {
            errors["mobile"] = "Mobile must be at least 8 characters.";
        }

        if (!IsValidUserRole(nextRole))
        {
            errors["role"] = "Role must be one of: admin, store_manager, staff, customer.";
        }

        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors });
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        var actorUserId = GetCurrentUserId();
        string? previousRole = null;
        await using (var previousRoleCmd = conn.CreateCommand())
        {
            previousRoleCmd.CommandText = "SELECT role::text FROM app.users WHERE id = @user_id LIMIT 1;";
            previousRoleCmd.Parameters.AddWithValue("user_id", id);
            previousRole = await previousRoleCmd.ExecuteScalarAsync() as string;
        }

        await EnsureRolePermissionsAsync(conn, nextRole);

        var isAdmin = string.Equals(currentUserRole, "admin", StringComparison.OrdinalIgnoreCase);
        if (isAdmin && request.ManagedStoreIds != null && nextRole is "store_manager" or "staff")
        {
            foreach (var storeId in request.ManagedStoreIds.Distinct())
            {
                await using var verifyCmd = conn.CreateCommand();
                verifyCmd.CommandText = "SELECT 1 FROM app.stores WHERE id = @sid LIMIT 1;";
                verifyCmd.Parameters.AddWithValue("sid", storeId);
                var exists = await verifyCmd.ExecuteScalarAsync();
                if (exists is null)
                {
                    return BadRequest(new
                    {
                        message = "Validation failed.",
                        errors = new Dictionary<string, string>
                        {
                            ["managedStoreIds"] = $"Store {storeId} does not exist."
                        }
                    });
                }
            }
        }

        await using var tx = await conn.BeginTransactionAsync();
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                              UPDATE app.users
                              SET
                                  first_name = @first_name,
                                  last_name = @last_name,
                                  email = @email,
                                  mobile = @mobile,
                                  role = CAST(@role AS app.user_role),
                                  is_active = @is_active,
                                  updated_at = NOW()
                              WHERE id = @user_id
                              RETURNING
                                  id,
                                  role::text,
                                  first_name,
                                  last_name,
                                  email,
                                  mobile,
                                  is_active,
                                  created_at,
                                  updated_at;
                              """;
            cmd.Parameters.AddWithValue("user_id", id);
            cmd.Parameters.AddWithValue("first_name", firstName);
            cmd.Parameters.AddWithValue("last_name", lastName);
            cmd.Parameters.AddWithValue("email", email);
            cmd.Parameters.AddWithValue("mobile", (object?)mobile ?? DBNull.Value);
            cmd.Parameters.AddWithValue("role", nextRole);
            cmd.Parameters.AddWithValue("is_active", isActive);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                await tx.RollbackAsync();
                return NotFound(new { message = "User not found." });
            }

            var updatedId = reader.GetGuid(0);
            var updatedRole = reader.GetString(1);
            var updatedFirstName = reader.GetString(2);
            var updatedLastName = reader.GetString(3);
            var updatedEmail = reader.GetString(4);
            var updatedMobile = reader.IsDBNull(5) ? null : reader.GetString(5);
            var updatedIsActive = reader.GetBoolean(6);
            var updatedCreatedAt = reader.GetDateTime(7);
            var updatedAt = reader.GetDateTime(8);
            await reader.DisposeAsync();

            if (isAdmin)
            {
                await SyncUserManagedStoresAsync(conn, tx, id, nextRole, request.ManagedStoreIds);
            }

            await tx.CommitAsync();

            await WriteAuditLogAsync(
                conn,
                null,
                actorUserId,
                "user.updated",
                "user",
                id,
                new { fromRole = previousRole, toRole = nextRole, isActive }
            );

            return Ok(new
            {
                id = updatedId,
                role = updatedRole,
                firstName = updatedFirstName,
                lastName = updatedLastName,
                email = updatedEmail,
                mobile = updatedMobile,
                isActive = updatedIsActive,
                createdAt = updatedCreatedAt,
                updatedAt
            });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            await tx.RollbackAsync();
            return Conflict(new
            {
                message = "Email is already registered.",
                errors = new Dictionary<string, string> { ["email"] = "This email already exists." }
            });
        }
    }

    private static async Task SyncUserManagedStoresAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid userId,
        string nextRole,
        Guid[]? managedStoreIds)
    {
        if (managedStoreIds is not null)
        {
            await DeleteStoreStaffForUserAsync(conn, tx, userId);
            if (nextRole is "store_manager" or "staff")
            {
                foreach (var sid in managedStoreIds.Distinct())
                {
                    await using var ins = conn.CreateCommand();
                    ins.Transaction = tx;
                    ins.CommandText = """
                                      INSERT INTO app.store_staff (store_id, user_id)
                                      VALUES (@store_id, @user_id)
                                      ON CONFLICT (store_id, user_id) DO NOTHING;
                                      """;
                    ins.Parameters.AddWithValue("store_id", sid);
                    ins.Parameters.AddWithValue("user_id", userId);
                    await ins.ExecuteNonQueryAsync();
                }
            }

            return;
        }

        if (nextRole is not "store_manager" and not "staff")
        {
            await DeleteStoreStaffForUserAsync(conn, tx, userId);
        }
    }

    private static async Task DeleteStoreStaffForUserAsync(NpgsqlConnection conn, NpgsqlTransaction tx, Guid userId)
    {
        await using var del = conn.CreateCommand();
        del.Transaction = tx;
        del.CommandText = "DELETE FROM app.store_staff WHERE user_id = @user_id;";
        del.Parameters.AddWithValue("user_id", userId);
        await del.ExecuteNonQueryAsync();
    }

    [Authorize]
    [HttpPut("users/{id:guid}/role")]
    public async Task<IActionResult> UpdateUserRole([FromRoute] Guid id, [FromBody] UpdateUserRoleRequest request)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var nextRole = request.Role?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!IsValidUserRole(nextRole))
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string>
                {
                    ["role"] = "Role must be one of: admin, store_manager, staff, customer."
                }
            });
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        var actorUserId = GetCurrentUserId();
        string? previousRole = null;
        await using (var previousRoleCmd = conn.CreateCommand())
        {
            previousRoleCmd.CommandText = "SELECT role::text FROM app.users WHERE id = @user_id LIMIT 1;";
            previousRoleCmd.Parameters.AddWithValue("user_id", id);
            var previousRoleResult = await previousRoleCmd.ExecuteScalarAsync();
            previousRole = previousRoleResult as string;
        }

        await EnsureRolePermissionsAsync(conn, nextRole);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          UPDATE app.users
                          SET role = CAST(@role AS app.user_role), updated_at = NOW()
                          WHERE id = @user_id
                          RETURNING
                              id,
                              role::text,
                              first_name,
                              last_name,
                              email,
                              mobile,
                              is_active,
                              created_at,
                              updated_at;
                          """;
        cmd.Parameters.AddWithValue("role", nextRole);
        cmd.Parameters.AddWithValue("user_id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "User not found." });
        }

        var updatedId = reader.GetGuid(0);
        var updatedRole = reader.GetString(1);
        var updatedFirstName = reader.GetString(2);
        var updatedLastName = reader.GetString(3);
        var updatedEmail = reader.GetString(4);
        var updatedMobile = reader.IsDBNull(5) ? null : reader.GetString(5);
        var updatedIsActive = reader.GetBoolean(6);
        var updatedCreatedAt = reader.GetDateTime(7);
        var updatedAt = reader.GetDateTime(8);
        await reader.DisposeAsync();

        await WriteAuditLogAsync(
            conn,
            null,
            actorUserId,
            "user.role_updated",
            "user",
            id,
            new { fromRole = previousRole, toRole = nextRole }
        );

        return Ok(new
        {
            id = updatedId,
            role = updatedRole,
            firstName = updatedFirstName,
            lastName = updatedLastName,
            email = updatedEmail,
            mobile = updatedMobile,
            isActive = updatedIsActive,
            createdAt = updatedCreatedAt,
            updatedAt
        });
    }

    [Authorize]
    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> SoftDeleteUser([FromRoute] Guid id)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        var actorUserId = GetCurrentUserId();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          UPDATE app.users
                          SET is_active = FALSE, updated_at = NOW()
                          WHERE id = @user_id
                          RETURNING id, first_name, last_name, email, role::text;
                          """;
        cmd.Parameters.AddWithValue("user_id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "User not found." });
        }

        var deletedId = reader.GetGuid(0);
        var deletedFirstName = reader.GetString(1);
        var deletedLastName = reader.GetString(2);
        var deletedEmail = reader.GetString(3);
        var deletedRole = reader.GetString(4);
        await reader.DisposeAsync();

        await WriteAuditLogAsync(
            conn,
            null,
            actorUserId,
            "user.soft_deleted",
            "user",
            deletedId,
            new { email = deletedEmail, role = deletedRole }
        );

        return Ok(new
        {
            id = deletedId,
            firstName = deletedFirstName,
            lastName = deletedLastName,
            email = deletedEmail,
            role = deletedRole,
            isActive = false
        });
    }
}
