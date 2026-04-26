using BCrypt.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers;

public partial class AuthController
{
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userIdRaw = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
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
        var userIdRaw = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
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
}
