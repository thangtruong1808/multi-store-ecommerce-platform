using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string RefreshCookieName = "refresh_token";
    private const string AccessCookieName = "access_token";
    private readonly NpgsqlDataSource _dataSource;
    private readonly IConfiguration _configuration;

    public AuthController(NpgsqlDataSource dataSource, IConfiguration configuration)
    {
        _dataSource = dataSource;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var password = request.Password?.Trim() ?? string.Empty;
        var registerErrors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(email))
        {
            registerErrors["email"] = "Email is required.";
        }
        else if (!email.Contains('@'))
        {
            registerErrors["email"] = "Email format is invalid.";
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            registerErrors["password"] = "Password is required.";
        }
        else if (password.Length < 8)
        {
            registerErrors["password"] = "Password must be at least 8 characters.";
        }

        if (registerErrors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = registerErrors });
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          INSERT INTO users (email, password_hash, status)
                          VALUES (@email, @password_hash, CAST('active' AS user_status))
                          RETURNING id, email, status, created_at;
                          """;
        cmd.Parameters.AddWithValue("email", email);
        cmd.Parameters.AddWithValue("password_hash", passwordHash);

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            await reader.ReadAsync();
            return Ok(new
            {
                id = reader.GetGuid(0),
                email = reader.GetString(1),
                status = reader.GetString(2),
                createdAt = reader.GetDateTime(3)
            });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new
            {
                message = "Email is already registered.",
                errors = new Dictionary<string, string> { ["email"] = "This email already exists." }
            });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var password = request.Password?.Trim() ?? string.Empty;
        var loginErrors = new Dictionary<string, string>();

        if (string.IsNullOrWhiteSpace(email))
        {
            loginErrors["email"] = "Email is required.";
        }
        else if (!email.Contains('@'))
        {
            loginErrors["email"] = "Email format is invalid.";
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            loginErrors["password"] = "Password is required.";
        }
        else if (password.Length < 8)
        {
            loginErrors["password"] = "Password must be at least 8 characters.";
        }

        if (loginErrors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = loginErrors });
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id, email, password_hash, status FROM users WHERE email = @email LIMIT 1;";
        cmd.Parameters.AddWithValue("email", email);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Unauthorized(new { message = "Invalid credentials.", errors = new Dictionary<string, string>() });
        }

        var userId = reader.GetGuid(0);
        var userEmail = reader.GetString(1);
        var passwordHash = reader.GetString(2);
        var userStatus = reader.GetString(3);

        if (!BCrypt.Net.BCrypt.Verify(password, passwordHash))
        {
            return Unauthorized(new { message = "Invalid credentials.", errors = new Dictionary<string, string>() });
        }

        if (!string.Equals(userStatus, "active", StringComparison.OrdinalIgnoreCase))
        {
            return Unauthorized(new { message = "Account is not active.", errors = new Dictionary<string, string>() });
        }

        await reader.DisposeAsync();

        var accessToken = GenerateAccessToken(userId, userEmail);
        var refreshToken = GenerateSecureToken();
        var refreshTokenHash = ComputeSha256(refreshToken);
        var refreshExpiresAt = DateTime.UtcNow.AddDays(GetRefreshTokenDays());

        await using var sessionCmd = conn.CreateCommand();
        sessionCmd.CommandText = """
                                 INSERT INTO auth_sessions (user_id, refresh_token_hash, device_info, ip_address, user_agent, expires_at)
                                 VALUES (@user_id, @refresh_token_hash, @device_info, @ip_address, @user_agent, @expires_at);
                                 """;
        sessionCmd.Parameters.AddWithValue("user_id", userId);
        sessionCmd.Parameters.AddWithValue("refresh_token_hash", refreshTokenHash);
        sessionCmd.Parameters.AddWithValue("device_info", HttpContext.Request.Headers.UserAgent.ToString());
        sessionCmd.Parameters.Add(new NpgsqlParameter("ip_address", NpgsqlDbType.Inet)
        {
            Value = (object?)HttpContext.Connection.RemoteIpAddress ?? DBNull.Value
        });
        sessionCmd.Parameters.AddWithValue("user_agent", HttpContext.Request.Headers.UserAgent.ToString());
        sessionCmd.Parameters.AddWithValue("expires_at", refreshExpiresAt);
        await sessionCmd.ExecuteNonQueryAsync();

        SetAuthCookies(accessToken, refreshToken, refreshExpiresAt);

        return Ok(new
        {
            accessToken,
            user = new
            {
                id = userId,
                email = userEmail,
                status = userStatus
            }
        });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);
        return Ok(new { id = userId, email });
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        if (!Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken) || string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized(new { message = "Refresh token is missing." });
        }

        var refreshHash = ComputeSha256(refreshToken);
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT s.id, s.user_id, u.email
                          FROM auth_sessions s
                          INNER JOIN users u ON u.id = s.user_id
                          WHERE s.refresh_token_hash = @refresh_hash
                            AND s.revoked_at IS NULL
                            AND s.expires_at > NOW()
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("refresh_hash", refreshHash);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Unauthorized(new { message = "Invalid refresh token." });
        }

        var sessionId = reader.GetGuid(0);
        var userId = reader.GetGuid(1);
        var email = reader.GetString(2);
        await reader.DisposeAsync();

        var newAccessToken = GenerateAccessToken(userId, email);
        var newRefreshToken = GenerateSecureToken();
        var newRefreshHash = ComputeSha256(newRefreshToken);
        var newRefreshExpiry = DateTime.UtcNow.AddDays(GetRefreshTokenDays());

        await using var revokeCmd = conn.CreateCommand();
        revokeCmd.CommandText = "UPDATE auth_sessions SET revoked_at = NOW() WHERE id = @session_id;";
        revokeCmd.Parameters.AddWithValue("session_id", sessionId);
        await revokeCmd.ExecuteNonQueryAsync();

        await using var insertCmd = conn.CreateCommand();
        insertCmd.CommandText = """
                                INSERT INTO auth_sessions (user_id, refresh_token_hash, device_info, ip_address, user_agent, expires_at)
                                VALUES (@user_id, @refresh_hash, @device_info, @ip_address, @user_agent, @expires_at);
                                """;
        insertCmd.Parameters.AddWithValue("user_id", userId);
        insertCmd.Parameters.AddWithValue("refresh_hash", newRefreshHash);
        insertCmd.Parameters.AddWithValue("device_info", HttpContext.Request.Headers.UserAgent.ToString());
        insertCmd.Parameters.Add(new NpgsqlParameter("ip_address", NpgsqlDbType.Inet)
        {
            Value = (object?)HttpContext.Connection.RemoteIpAddress ?? DBNull.Value
        });
        insertCmd.Parameters.AddWithValue("user_agent", HttpContext.Request.Headers.UserAgent.ToString());
        insertCmd.Parameters.AddWithValue("expires_at", newRefreshExpiry);
        await insertCmd.ExecuteNonQueryAsync();

        SetAuthCookies(newAccessToken, newRefreshToken, newRefreshExpiry);
        return Ok(new { accessToken = newAccessToken });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        if (Request.Cookies.TryGetValue(RefreshCookieName, out var refreshToken) && !string.IsNullOrWhiteSpace(refreshToken))
        {
            var refreshHash = ComputeSha256(refreshToken);
            await using var conn = await _dataSource.OpenConnectionAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE auth_sessions SET revoked_at = NOW() WHERE refresh_token_hash = @refresh_hash AND revoked_at IS NULL;";
            cmd.Parameters.AddWithValue("refresh_hash", refreshHash);
            await cmd.ExecuteNonQueryAsync();
        }

        Response.Cookies.Delete(RefreshCookieName);
        Response.Cookies.Delete(AccessCookieName);
        return Ok(new { message = "Logged out." });
    }

    private string GenerateAccessToken(Guid userId, string email)
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
                new Claim(ClaimTypes.Email, email)
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

    public sealed record RegisterRequest(string Email, string Password);
    public sealed record LoginRequest(string Email, string Password);
}
