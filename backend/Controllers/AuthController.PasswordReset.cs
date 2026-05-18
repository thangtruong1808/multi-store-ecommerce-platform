using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers;

public partial class AuthController
{
    [HttpPost("password-reset-request")]
    public async Task<IActionResult> RequestPasswordReset(
        [FromBody] PasswordResetRequest request,
        CancellationToken cancellationToken)
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

        if (!_emailService.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Password reset email is not configured. Set ACS_EMAIL_ENABLED=true and Azure Communication Services settings in backend/.env."
            });
        }

        var appBaseUrl = GetPublicAppBaseUrl();
        if (string.IsNullOrWhiteSpace(appBaseUrl))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "PUBLIC_APP_BASE_URL is not configured. It is required for password reset links."
            });
        }

        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);

            Guid? userId = null;
            await using (var lookupCmd = conn.CreateCommand())
            {
                lookupCmd.CommandText = "SELECT id FROM app.users WHERE email = @email LIMIT 1;";
                lookupCmd.Parameters.AddWithValue("email", email);
                var result = await lookupCmd.ExecuteScalarAsync(cancellationToken);
                if (result is Guid id)
                {
                    userId = id;
                }
            }

            if (userId.HasValue)
            {
                var resetToken = GenerateSecureToken();
                var resetTokenHash = ComputeSha256(resetToken);
                var expiresAt = DateTime.UtcNow.AddMinutes(_emailOptions.PasswordResetTokenMinutes);

                await using var tx = await conn.BeginTransactionAsync(cancellationToken);
                try
                {
                    await using (var invalidateCmd = conn.CreateCommand())
                    {
                        invalidateCmd.Transaction = tx;
                        invalidateCmd.CommandText = """
                                                    UPDATE app.auth_password_reset_tokens
                                                    SET used_at = NOW()
                                                    WHERE user_id = @user_id AND used_at IS NULL;
                                                    """;
                        invalidateCmd.Parameters.AddWithValue("user_id", userId.Value);
                        await invalidateCmd.ExecuteNonQueryAsync(cancellationToken);
                    }

                    await using (var insertCmd = conn.CreateCommand())
                    {
                        insertCmd.Transaction = tx;
                        insertCmd.CommandText = """
                                                INSERT INTO app.auth_password_reset_tokens (user_id, token_hash, expires_at)
                                                VALUES (@user_id, @token_hash, @expires_at);
                                                """;
                        insertCmd.Parameters.AddWithValue("user_id", userId.Value);
                        insertCmd.Parameters.AddWithValue("token_hash", resetTokenHash);
                        insertCmd.Parameters.AddWithValue("expires_at", expiresAt);
                        await insertCmd.ExecuteNonQueryAsync(cancellationToken);
                    }

                    var resetUrl = $"{appBaseUrl}/reset-password/confirm?token={Uri.EscapeDataString(resetToken)}";
                    try
                    {
                        await _emailService.SendPasswordResetEmailAsync(email, resetUrl, cancellationToken);
                    }
                    catch
                    {
                        await tx.RollbackAsync(cancellationToken);
                        return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                        {
                            message = "Unable to send password reset email. Please try again later."
                        });
                    }

                    await tx.CommitAsync(cancellationToken);
                }
                catch
                {
                    await tx.RollbackAsync(cancellationToken);
                    throw;
                }
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

    [HttpPost("password-reset-confirm")]
    public async Task<IActionResult> ConfirmPasswordReset(
        [FromBody] PasswordResetConfirmRequest request,
        CancellationToken cancellationToken)
    {
        var token = request.Token?.Trim() ?? string.Empty;
        var newPassword = request.NewPassword?.Trim() ?? string.Empty;

        var errors = new Dictionary<string, string>();
        if (string.IsNullOrWhiteSpace(token))
        {
            errors["token"] = "Reset token is required.";
        }

        if (string.IsNullOrWhiteSpace(newPassword))
        {
            errors["newPassword"] = "New password is required.";
        }
        else if (newPassword.Length < 8)
        {
            errors["newPassword"] = "New password must be at least 8 characters.";
        }

        if (errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors });
        }

        var tokenHash = ComputeSha256(token);

        try
        {
            await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
            await using var tx = await conn.BeginTransactionAsync(cancellationToken);

            Guid? userId = null;
            Guid? tokenId = null;
            await using (var lookupCmd = conn.CreateCommand())
            {
                lookupCmd.Transaction = tx;
                lookupCmd.CommandText = """
                                        SELECT id, user_id
                                        FROM app.auth_password_reset_tokens
                                        WHERE token_hash = @token_hash
                                          AND expires_at > NOW()
                                          AND used_at IS NULL
                                        LIMIT 1;
                                        """;
                lookupCmd.Parameters.AddWithValue("token_hash", tokenHash);
                await using var reader = await lookupCmd.ExecuteReaderAsync(cancellationToken);
                if (await reader.ReadAsync(cancellationToken))
                {
                    tokenId = reader.GetGuid(0);
                    userId = reader.GetGuid(1);
                }
            }

            if (!userId.HasValue || !tokenId.HasValue)
            {
                await tx.RollbackAsync(cancellationToken);
                return BadRequest(new
                {
                    message = "Invalid or expired reset link.",
                    errors = new Dictionary<string, string> { ["token"] = "This reset link is invalid or has expired." }
                });
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(newPassword!);

            await using (var updateUserCmd = conn.CreateCommand())
            {
                updateUserCmd.Transaction = tx;
                updateUserCmd.CommandText = """
                                           UPDATE app.users
                                           SET password_hash = @password_hash, updated_at = NOW()
                                           WHERE id = @user_id;
                                           """;
                updateUserCmd.Parameters.AddWithValue("password_hash", passwordHash);
                updateUserCmd.Parameters.AddWithValue("user_id", userId.Value);
                await updateUserCmd.ExecuteNonQueryAsync(cancellationToken);
            }

            await using (var markUsedCmd = conn.CreateCommand())
            {
                markUsedCmd.Transaction = tx;
                markUsedCmd.CommandText = """
                                          UPDATE app.auth_password_reset_tokens
                                          SET used_at = NOW()
                                          WHERE id = @id;
                                          """;
                markUsedCmd.Parameters.AddWithValue("id", tokenId.Value);
                await markUsedCmd.ExecuteNonQueryAsync(cancellationToken);
            }

            await using (var revokeCmd = conn.CreateCommand())
            {
                revokeCmd.Transaction = tx;
                revokeCmd.CommandText = """
                                        UPDATE app.auth_sessions
                                        SET revoked_at = NOW()
                                        WHERE user_id = @user_id AND revoked_at IS NULL;
                                        """;
                revokeCmd.Parameters.AddWithValue("user_id", userId.Value);
                await revokeCmd.ExecuteNonQueryAsync(cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
            return Ok(new { message = "Password updated. You can sign in." });
        }
        catch (NpgsqlException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database connection failed. Please verify PostgreSQL credentials in backend/.env."
            });
        }
    }

    private string? GetPublicAppBaseUrl()
    {
        var raw = _configuration["PUBLIC_APP_BASE_URL"]?.Trim();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        return raw.TrimEnd('/');
    }
}
