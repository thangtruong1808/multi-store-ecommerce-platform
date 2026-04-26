using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public partial class AuthController : ControllerBase
{
    private const string RefreshCookieName = "refresh_token";
    private const string AccessCookieName = "access_token";
    private readonly NpgsqlDataSource _dataSource;
    private readonly IConfiguration _configuration;
    private static readonly (string Code, string Description)[] DefaultPermissions =
    [
        ("dashboard:view", "View dashboard pages and widgets"),
        ("users:view", "View users"),
        ("users:update_role", "Update user role"),
        ("stores:read", "Read stores"),
        ("categories:read", "Read categories"),
        ("products:read", "Read products"),
        ("vouchers:read", "Read vouchers"),
        ("invoices:read", "Read invoices"),
        ("activity_logs:read", "Read activity logs")
    ];

    private static readonly Dictionary<string, string[]> RolePermissionMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["admin"] =
        [
            "dashboard:view",
            "users:view",
            "users:update_role",
            "stores:read",
            "categories:read",
            "products:read",
            "vouchers:read",
            "invoices:read",
            "activity_logs:read"
        ],
        ["store_manager"] =
        [
            "dashboard:view",
            "users:view",
            "stores:read",
            "categories:read",
            "products:read",
            "vouchers:read",
            "invoices:read",
            "activity_logs:read"
        ],
        ["staff"] =
        [
            "stores:read",
            "categories:read",
            "products:read",
            "vouchers:read",
            "invoices:read"
        ],
        ["customer"] = ["stores:read", "categories:read", "products:read"]
    };

    public AuthController(NpgsqlDataSource dataSource, IConfiguration configuration)
    {
        _dataSource = dataSource;
        _configuration = configuration;
    }

    private string GenerateAccessToken(Guid userId, string email, string role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT_SECRET"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresInMinutes = int.TryParse(_configuration["JWT_ACCESS_TOKEN_MINUTES"], out var parsed) ? parsed : 15;

        var token = new JwtSecurityToken(
            issuer: _configuration["JWT_ISSUER"] ?? "multi-store-ecommerce-platform-api",
            audience: _configuration["JWT_AUDIENCE"] ?? "multi-store-ecommerce-platform-client",
            claims:
            [
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role)
            ],
            expires: DateTime.UtcNow.AddMinutes(expiresInMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateSecureToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }

    private static string ComputeSha256(string value)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(hash);
    }

    private int GetRefreshTokenDays()
    {
        return int.TryParse(_configuration["JWT_REFRESH_TOKEN_DAYS"], out var parsed) ? parsed : 7;
    }

    private static bool IsValidUserRole(string role)
    {
        return role is "admin" or "store_manager" or "staff" or "customer";
    }

    private static bool CanAccessDashboard(string? role)
    {
        return role is "admin" or "store_manager";
    }

    private static async Task EnsureRolePermissionsAsync(NpgsqlConnection conn, string role)
    {
        foreach (var permission in DefaultPermissions)
        {
            await using var upsertPermissionCmd = conn.CreateCommand();
            upsertPermissionCmd.CommandText = """
                                              INSERT INTO app.permissions (code, description)
                                              VALUES (@code, @description)
                                              ON CONFLICT (code) DO UPDATE
                                              SET description = EXCLUDED.description;
                                              """;
            upsertPermissionCmd.Parameters.AddWithValue("code", permission.Code);
            upsertPermissionCmd.Parameters.AddWithValue("description", permission.Description);
            await upsertPermissionCmd.ExecuteNonQueryAsync();
        }

        if (!RolePermissionMap.TryGetValue(role, out var permissionCodes) || permissionCodes.Length == 0)
        {
            return;
        }

        await using var upsertRolePermissionCmd = conn.CreateCommand();
        upsertRolePermissionCmd.CommandText = """
                                               INSERT INTO app.role_permissions (role, permission_id)
                                               SELECT CAST(@role AS app.user_role), p.id
                                               FROM app.permissions p
                                               WHERE p.code = ANY(@permission_codes)
                                               ON CONFLICT (role, permission_id) DO NOTHING;
                                               """;
        upsertRolePermissionCmd.Parameters.AddWithValue("role", role);
        upsertRolePermissionCmd.Parameters.Add(
            new NpgsqlParameter("permission_codes", NpgsqlDbType.Array | NpgsqlDbType.Text) { Value = permissionCodes }
        );
        await upsertRolePermissionCmd.ExecuteNonQueryAsync();
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
        Guid? storeId,
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
        cmd.Parameters.AddWithValue("store_id", (object?)storeId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("user_id", (object?)userId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("action", action);
        cmd.Parameters.AddWithValue("entity_type", (object?)entityType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("entity_id", (object?)entityId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("metadata", metadata is null ? "{}" : System.Text.Json.JsonSerializer.Serialize(metadata));
        cmd.Parameters.Add(new NpgsqlParameter("ip_address", NpgsqlDbType.Inet) { Value = DBNull.Value });
        await cmd.ExecuteNonQueryAsync();
    }

    private void SetAuthCookies(string accessToken, string refreshToken, DateTime refreshExpiresAt)
    {
        var useSecureCookies = bool.TryParse(_configuration["AUTH_COOKIE_SECURE"], out var parsed) && parsed;

        Response.Cookies.Append(AccessCookieName, accessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = useSecureCookies,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(int.TryParse(_configuration["JWT_ACCESS_TOKEN_MINUTES"], out var accessMins) ? accessMins : 15)
        });

        Response.Cookies.Append(RefreshCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = useSecureCookies,
            SameSite = SameSiteMode.Lax,
            Expires = refreshExpiresAt
        });
    }

    public sealed record RegisterRequest(string FirstName, string LastName, string Email, string Password, string? Mobile);
    public sealed record LoginRequest(string Email, string Password);
    public sealed record PasswordResetRequest(string Email);
    public sealed record UpdateUserRoleRequest(string Role);
    public sealed record UpdateUserRequest(
        string FirstName,
        string LastName,
        string Email,
        string? Mobile,
        string Role,
        bool IsActive
    );
    public sealed record UpdateProfileRequest(
        string FirstName,
        string LastName,
        string Email,
        string? Mobile,
        string? AddressLine1,
        string? AddressLine2,
        string? City,
        string? State,
        string? PostalCode,
        string? Country,
        string? AvatarS3Key,
        string? CurrentPassword,
        string? NewPassword
    );
}
