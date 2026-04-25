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
        var firstName = request.FirstName?.Trim() ?? string.Empty;
        var lastName = request.LastName?.Trim() ?? string.Empty;
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var password = request.Password?.Trim() ?? string.Empty;
        var mobile = request.Mobile?.Trim();
        var registerErrors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(firstName))
        {
            registerErrors["firstName"] = "First name is required.";
        }
        else if (firstName.Length < 2)
        {
            registerErrors["firstName"] = "First name must be at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(lastName))
        {
            registerErrors["lastName"] = "Last name is required.";
        }
        else if (lastName.Length < 2)
        {
            registerErrors["lastName"] = "Last name must be at least 2 characters.";
        }

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

        if (!string.IsNullOrWhiteSpace(mobile) && mobile.Length < 8)
        {
            registerErrors["mobile"] = "Mobile must be at least 8 characters.";
        }

        if (registerErrors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = registerErrors });
        }

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          INSERT INTO app.users (role, first_name, last_name, email, password_hash, mobile, is_active)
                          VALUES (CAST('customer' AS app.user_role), @first_name, @last_name, @email, @password_hash, @mobile, TRUE)
                          RETURNING id, first_name, last_name, email, mobile, is_active, created_at;
                          """;
        cmd.Parameters.AddWithValue("first_name", firstName);
        cmd.Parameters.AddWithValue("last_name", lastName);
        cmd.Parameters.AddWithValue("email", email);
        cmd.Parameters.AddWithValue("password_hash", passwordHash);
        cmd.Parameters.AddWithValue("mobile", (object?)mobile ?? DBNull.Value);

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync();
            await reader.ReadAsync();
            return Ok(new
            {
                id = reader.GetGuid(0),
                firstName = reader.GetString(1),
                lastName = reader.GetString(2),
                email = reader.GetString(3),
                mobile = reader.IsDBNull(4) ? null : reader.GetString(4),
                isActive = reader.GetBoolean(5),
                createdAt = reader.GetDateTime(6)
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

        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                              SELECT id, email, password_hash, is_active, first_name, last_name, mobile
                              FROM app.users
                              WHERE email = @email
                              LIMIT 1;
                              """;
            cmd.Parameters.AddWithValue("email", email);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return Unauthorized(new { message = "Invalid credentials.", errors = new Dictionary<string, string>() });
            }

            var userId = reader.GetGuid(0);
            var userEmail = reader.GetString(1);
            var passwordHash = reader.GetString(2);
            var isActive = reader.GetBoolean(3);
            var firstName = reader.IsDBNull(4) ? null : reader.GetString(4);
            var lastName = reader.IsDBNull(5) ? null : reader.GetString(5);
            var mobile = reader.IsDBNull(6) ? null : reader.GetString(6);

            if (!BCrypt.Net.BCrypt.Verify(password, passwordHash))
            {
                return Unauthorized(new { message = "Invalid credentials.", errors = new Dictionary<string, string>() });
            }

            if (!isActive)
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
                                     INSERT INTO app.auth_sessions (user_id, session_token_hash, ip_address, user_agent, expires_at)
                                     VALUES (@user_id, @session_token_hash, @ip_address, @user_agent, @expires_at);
                                     """;
            sessionCmd.Parameters.AddWithValue("user_id", userId);
            sessionCmd.Parameters.AddWithValue("session_token_hash", refreshTokenHash);
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
                    firstName,
                    lastName,
                    email = userEmail,
                    mobile,
                    isActive
                }
            });
        }
        catch (NpgsqlException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database connection failed. Please verify PostgreSQL credentials in backend/.env."
            });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Unable to sign in right now. Please try again."
            });
        }
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT
                              id,
                              role::text,
                              first_name,
                              last_name,
                              avatar_s3_key,
                              email,
                              mobile,
                              address_line_1,
                              address_line_2,
                              city,
                              state,
                              postal_code,
                              country,
                              is_active,
                              created_at,
                              updated_at
                          FROM app.users
                          WHERE id = @user_id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("user_id", userId);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return Unauthorized(new { message = "User not found." });
        }

        return Ok(new
        {
            id = reader.GetGuid(0),
            role = reader.GetString(1),
            firstName = reader.GetString(2),
            lastName = reader.GetString(3),
            avatarS3Key = reader.IsDBNull(4) ? null : reader.GetString(4),
            email = reader.GetString(5),
            mobile = reader.IsDBNull(6) ? null : reader.GetString(6),
            addressLine1 = reader.IsDBNull(7) ? null : reader.GetString(7),
            addressLine2 = reader.IsDBNull(8) ? null : reader.GetString(8),
            city = reader.IsDBNull(9) ? null : reader.GetString(9),
            state = reader.IsDBNull(10) ? null : reader.GetString(10),
            postalCode = reader.IsDBNull(11) ? null : reader.GetString(11),
            country = reader.IsDBNull(12) ? null : reader.GetString(12),
            isActive = reader.GetBoolean(13),
            createdAt = reader.GetDateTime(14),
            updatedAt = reader.GetDateTime(15)
        });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        var firstName = request.FirstName?.Trim() ?? string.Empty;
        var lastName = request.LastName?.Trim() ?? string.Empty;
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var mobile = request.Mobile?.Trim();
        var addressLine1 = request.AddressLine1?.Trim();
        var addressLine2 = request.AddressLine2?.Trim();
        var city = request.City?.Trim();
        var state = request.State?.Trim();
        var postalCode = request.PostalCode?.Trim();
        var country = request.Country?.Trim();
        var avatarS3Key = request.AvatarS3Key?.Trim();
        var currentPassword = request.CurrentPassword?.Trim();
        var newPassword = request.NewPassword?.Trim();

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(firstName))
        {
            errors["firstName"] = "First name is required.";
        }
        else if (firstName.Length < 2)
        {
            errors["firstName"] = "First name must be at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(lastName))
        {
            errors["lastName"] = "Last name is required.";
        }
        else if (lastName.Length < 2)
        {
            errors["lastName"] = "Last name must be at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            errors["email"] = "Email is required.";
        }
        else if (!email.Contains('@'))
        {
            errors["email"] = "Email format is invalid.";
        }

        if (!string.IsNullOrWhiteSpace(mobile) && mobile.Length < 8)
        {
            errors["mobile"] = "Mobile must be at least 8 characters.";
        }

        var wantsToChangePassword = !string.IsNullOrWhiteSpace(currentPassword) || !string.IsNullOrWhiteSpace(newPassword);
        if (wantsToChangePassword && string.IsNullOrWhiteSpace(currentPassword))
        {
            errors["currentPassword"] = "Current password is required to change password.";
        }

        if (wantsToChangePassword && string.IsNullOrWhiteSpace(newPassword))
        {
            errors["newPassword"] = "New password is required when changing password.";
        }
        else if (!string.IsNullOrWhiteSpace(newPassword) && newPassword.Length < 8)
        {
            errors["newPassword"] = "New password must be at least 8 characters.";
        }

        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors });
        }

        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync();

            string? newPasswordHash = null;
            if (wantsToChangePassword)
            {
                await using var pwdCmd = conn.CreateCommand();
                pwdCmd.CommandText = "SELECT password_hash FROM app.users WHERE id = @user_id LIMIT 1;";
                pwdCmd.Parameters.AddWithValue("user_id", userId);
                var existingPasswordHashObj = await pwdCmd.ExecuteScalarAsync();
                if (existingPasswordHashObj is not string existingPasswordHash)
                {
                    return NotFound(new { message = "User profile not found." });
                }

                if (!BCrypt.Net.BCrypt.Verify(currentPassword!, existingPasswordHash))
                {
                    return BadRequest(new
                    {
                        message = "Validation failed.",
                        errors = new Dictionary<string, string> { ["currentPassword"] = "Current password is incorrect." }
                    });
                }

                newPasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword!);
            }

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                              UPDATE app.users
                              SET
                                  first_name = @first_name,
                                  last_name = @last_name,
                                  email = @email,
                                  mobile = @mobile,
                                  address_line_1 = @address_line_1,
                                  address_line_2 = @address_line_2,
                                  city = @city,
                                  state = @state,
                                  postal_code = @postal_code,
                                  country = @country,
                                  avatar_s3_key = @avatar_s3_key,
                                  password_hash = COALESCE(@password_hash, password_hash),
                                  updated_at = NOW()
                              WHERE id = @user_id
                              RETURNING
                                  id,
                                  role::text,
                                  first_name,
                                  last_name,
                                  avatar_s3_key,
                                  email,
                                  mobile,
                                  address_line_1,
                                  address_line_2,
                                  city,
                                  state,
                                  postal_code,
                                  country,
                                  is_active,
                                  created_at,
                                  updated_at;
                              """;
            cmd.Parameters.AddWithValue("user_id", userId);
            cmd.Parameters.AddWithValue("first_name", firstName);
            cmd.Parameters.AddWithValue("last_name", lastName);
            cmd.Parameters.AddWithValue("email", email);
            cmd.Parameters.AddWithValue("mobile", (object?)mobile ?? DBNull.Value);
            cmd.Parameters.AddWithValue("address_line_1", (object?)addressLine1 ?? DBNull.Value);
            cmd.Parameters.AddWithValue("address_line_2", (object?)addressLine2 ?? DBNull.Value);
            cmd.Parameters.AddWithValue("city", (object?)city ?? DBNull.Value);
            cmd.Parameters.AddWithValue("state", (object?)state ?? DBNull.Value);
            cmd.Parameters.AddWithValue("postal_code", (object?)postalCode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("country", (object?)country ?? DBNull.Value);
            cmd.Parameters.AddWithValue("avatar_s3_key", (object?)avatarS3Key ?? DBNull.Value);
            cmd.Parameters.AddWithValue("password_hash", (object?)newPasswordHash ?? DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                return NotFound(new { message = "User profile not found." });
            }

            return Ok(new
            {
                id = reader.GetGuid(0),
                role = reader.GetString(1),
                firstName = reader.GetString(2),
                lastName = reader.GetString(3),
                avatarS3Key = reader.IsDBNull(4) ? null : reader.GetString(4),
                email = reader.GetString(5),
                mobile = reader.IsDBNull(6) ? null : reader.GetString(6),
                addressLine1 = reader.IsDBNull(7) ? null : reader.GetString(7),
                addressLine2 = reader.IsDBNull(8) ? null : reader.GetString(8),
                city = reader.IsDBNull(9) ? null : reader.GetString(9),
                state = reader.IsDBNull(10) ? null : reader.GetString(10),
                postalCode = reader.IsDBNull(11) ? null : reader.GetString(11),
                country = reader.IsDBNull(12) ? null : reader.GetString(12),
                isActive = reader.GetBoolean(13),
                createdAt = reader.GetDateTime(14),
                updatedAt = reader.GetDateTime(15)
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
        catch (NpgsqlException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database connection failed. Please verify PostgreSQL credentials in backend/.env."
            });
        }
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
                          FROM app.auth_sessions s
                          INNER JOIN app.users u ON u.id = s.user_id
                          WHERE s.session_token_hash = @refresh_hash
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
        revokeCmd.CommandText = "UPDATE app.auth_sessions SET revoked_at = NOW() WHERE id = @session_id;";
        revokeCmd.Parameters.AddWithValue("session_id", sessionId);
        await revokeCmd.ExecuteNonQueryAsync();

        await using var insertCmd = conn.CreateCommand();
        insertCmd.CommandText = """
                                INSERT INTO app.auth_sessions (user_id, session_token_hash, ip_address, user_agent, expires_at)
                                VALUES (@user_id, @refresh_hash, @ip_address, @user_agent, @expires_at);
                                """;
        insertCmd.Parameters.AddWithValue("user_id", userId);
        insertCmd.Parameters.AddWithValue("refresh_hash", newRefreshHash);
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
            cmd.CommandText = "UPDATE app.auth_sessions SET revoked_at = NOW() WHERE session_token_hash = @refresh_hash AND revoked_at IS NULL;";
            cmd.Parameters.AddWithValue("refresh_hash", refreshHash);
            await cmd.ExecuteNonQueryAsync();
        }

        Response.Cookies.Delete(RefreshCookieName);
        Response.Cookies.Delete(AccessCookieName);
        return Ok(new { message = "Logged out." });
    }

    [HttpPost("password-reset-request")]
    public async Task<IActionResult> RequestPasswordReset([FromBody] PasswordResetRequest request)
    {
        var email = request.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string> { ["email"] = "Please enter a valid email address." }
            });
        }

        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync();

            Guid? userId = null;
            await using (var lookupCmd = conn.CreateCommand())
            {
                lookupCmd.CommandText = "SELECT id FROM app.users WHERE email = @email LIMIT 1;";
                lookupCmd.Parameters.AddWithValue("email", email);
                var result = await lookupCmd.ExecuteScalarAsync();
                if (result is Guid id)
                {
                    userId = id;
                }
            }

            if (userId.HasValue)
            {
                var resetToken = GenerateSecureToken();
                var resetTokenHash = ComputeSha256(resetToken);
                var expiresAt = DateTime.UtcNow.AddMinutes(30);

                await using var insertCmd = conn.CreateCommand();
                insertCmd.CommandText = """
                                        INSERT INTO app.auth_password_reset_tokens (user_id, token_hash, expires_at)
                                        VALUES (@user_id, @token_hash, @expires_at);
                                        """;
                insertCmd.Parameters.AddWithValue("user_id", userId.Value);
                insertCmd.Parameters.AddWithValue("token_hash", resetTokenHash);
                insertCmd.Parameters.AddWithValue("expires_at", expiresAt);
                await insertCmd.ExecuteNonQueryAsync();
            }

            // Do not reveal whether an email exists.
            return Ok(new { message = "If that email exists, a reset link has been sent." });
        }
        catch (NpgsqlException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database connection failed. Please verify PostgreSQL credentials in backend/.env."
            });
        }
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

    public sealed record RegisterRequest(string FirstName, string LastName, string Email, string Password, string? Mobile);
    public sealed record LoginRequest(string Email, string Password);
    public sealed record PasswordResetRequest(string Email);
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
