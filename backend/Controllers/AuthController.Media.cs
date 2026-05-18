using backend.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

public partial class AuthController
{
    private static readonly HashSet<string> AllowedAvatarContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    [Authorize]
    [HttpPost("profile/avatar")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadProfileAvatar(IFormFile? file, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        if (!_blobService.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Azure Blob Storage is not configured. Set AZURE_STORAGE_ENABLED=true and connection settings in backend/.env."
            });
        }

        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = new Dictionary<string, string> { ["file"] = "Image file is required." } });
        }

        var maxBytes = _blobOptions.MaxUploadBytes;
        if (file.Length > maxBytes)
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string> { ["file"] = $"Image must be {maxBytes / (1024 * 1024)} MB or smaller." }
            });
        }

        var contentType = file.ContentType?.Trim() ?? string.Empty;
        if (!AllowedAvatarContentTypes.Contains(contentType))
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string> { ["file"] = "Only JPEG, PNG, and WebP images are allowed." }
            });
        }

        await using var input = file.OpenReadStream();
        byte[] webpBytes;
        try
        {
            webpBytes = await _imageProcessor.ProcessToWebpAsync(input, cancellationToken);
        }
        catch
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string> { ["file"] = "Unable to process image. Upload a valid JPEG, PNG, or WebP file." }
            });
        }

        string? previousAvatarS3Key = null;
        await using (var conn = await _dataSource.OpenConnectionAsync(cancellationToken))
        await using (var readCmd = conn.CreateCommand())
        {
            readCmd.CommandText = "SELECT avatar_s3_key FROM app.users WHERE id = @user_id LIMIT 1;";
            readCmd.Parameters.AddWithValue("user_id", userId.Value);
            var existing = await readCmd.ExecuteScalarAsync(cancellationToken);
            previousAvatarS3Key = existing is string key && !string.IsNullOrWhiteSpace(key) ? key : null;
        }

        var blobKey = AvatarMediaKeyRules.BuildUserAvatarKey(userId.Value);
        await using var uploadStream = new MemoryStream(webpBytes);
        await _blobService.UploadAsync(blobKey, uploadStream, "image/webp", cancellationToken);

        await using (var conn = await _dataSource.OpenConnectionAsync(cancellationToken))
        await using (var updateCmd = conn.CreateCommand())
        {
            updateCmd.CommandText = """
                                    UPDATE app.users
                                    SET avatar_s3_key = @avatar_s3_key,
                                        updated_at = NOW()
                                    WHERE id = @user_id;
                                    """;
            updateCmd.Parameters.AddWithValue("user_id", userId.Value);
            updateCmd.Parameters.AddWithValue("avatar_s3_key", blobKey);
            var rows = await updateCmd.ExecuteNonQueryAsync(cancellationToken);
            if (rows == 0)
            {
                return NotFound(new { message = "User profile not found." });
            }
        }

        await AvatarMediaHelper.DeleteOrphanedBlobAsync(_blobService, previousAvatarS3Key, blobKey, cancellationToken);

        return Ok(new
        {
            blobKey,
            publicUrl = _blobService.BuildPublicUrl(blobKey),
            avatarS3Key = blobKey
        });
    }
}
