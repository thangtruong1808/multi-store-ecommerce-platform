using BCrypt.Net;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

public partial class AuthController
{
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
        await EnsureRolePermissionsAsync(conn, "customer");
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
            var createdUserId = reader.GetGuid(0);
            var createdFirstName = reader.GetString(1);
            var createdLastName = reader.GetString(2);
            var createdEmail = reader.GetString(3);
            var createdMobile = reader.IsDBNull(4) ? null : reader.GetString(4);
            var createdIsActive = reader.GetBoolean(5);
            var createdAt = reader.GetDateTime(6);
            await reader.DisposeAsync();
            await WriteAuditLogAsync(conn, null, createdUserId, "user.registered", "user", createdUserId, new
            {
                role = "customer",
                email
            });
            return Ok(new
            {
                id = createdUserId,
                firstName = createdFirstName,
                lastName = createdLastName,
                email = createdEmail,
                mobile = createdMobile,
                isActive = createdIsActive,
                createdAt
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
                              SELECT id, role::text, email, password_hash, is_active, first_name, last_name, mobile
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
            var userRole = reader.GetString(1);
            var userEmail = reader.GetString(2);
            var passwordHash = reader.GetString(3);
            var isActive = reader.GetBoolean(4);
            var firstName = reader.IsDBNull(5) ? null : reader.GetString(5);
            var lastName = reader.IsDBNull(6) ? null : reader.GetString(6);
            var mobile = reader.IsDBNull(7) ? null : reader.GetString(7);

            if (!BCrypt.Net.BCrypt.Verify(password, passwordHash))
            {
                return Unauthorized(new { message = "Invalid credentials.", errors = new Dictionary<string, string>() });
            }

            if (!isActive)
            {
                return Unauthorized(new { message = "Account is not active.", errors = new Dictionary<string, string>() });
            }

            await reader.DisposeAsync();

            var accessToken = GenerateAccessToken(userId, userEmail, userRole);
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
                    role = userRole,
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
                          SELECT s.id, s.user_id, u.email, u.role::text
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
        var role = reader.GetString(3);
        await reader.DisposeAsync();

        var newAccessToken = GenerateAccessToken(userId, email, role);
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
}
