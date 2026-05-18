using backend.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

public sealed record DeleteCategoryImageRequest(string BlobKey);

public partial class CategoriesController
{
    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    [Authorize]
    [HttpPost("media/image")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadCategoryImage(
        IFormFile? file,
        [FromQuery] Guid? categoryId,
        CancellationToken cancellationToken)
    {
        if (!CanAccessDashboard(await GetCurrentUserRoleAsync()))
        {
            return Forbid();
        }

        if (!_blobService.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Azure Blob Storage is not configured. Set AZURE_STORAGE_ENABLED=true and connection settings in backend/.env."
            });
        }

        var actorUserId = GetCurrentUserId();
        if (actorUserId is null)
        {
            return Unauthorized(new { message = "Invalid session token." });
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
        if (!AllowedImageContentTypes.Contains(contentType))
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string> { ["file"] = "Only JPEG, PNG, and WebP images are allowed." }
            });
        }

        if (categoryId.HasValue && categoryId.Value != Guid.Empty)
        {
            await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT level FROM app.categories WHERE id = @id LIMIT 1;";
            cmd.Parameters.AddWithValue("id", categoryId.Value);
            var levelRaw = await cmd.ExecuteScalarAsync(cancellationToken);
            if (levelRaw is null)
            {
                return NotFound(new { message = "Category not found." });
            }

            var level = Convert.ToInt16(levelRaw);
            if (level != 1)
            {
                return BadRequest(new
                {
                    message = "Validation failed.",
                    errors = new Dictionary<string, string> { ["categoryId"] = "Photos are only supported for level 1 categories." }
                });
            }
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

        var blobKey = categoryId.HasValue && categoryId.Value != Guid.Empty
            ? CategoryMediaKeyRules.BuildCategoryKey(categoryId.Value)
            : CategoryMediaKeyRules.BuildStagingKey(actorUserId.Value);

        await using var uploadStream = new MemoryStream(webpBytes);
        await _blobService.UploadAsync(blobKey, uploadStream, "image/webp", cancellationToken);

        return Ok(new
        {
            blobKey,
            publicUrl = _blobService.BuildPublicUrl(blobKey)
        });
    }

    [Authorize]
    [HttpDelete("media/image")]
    public async Task<IActionResult> DeleteCategoryImage([FromBody] DeleteCategoryImageRequest request, CancellationToken cancellationToken)
    {
        if (!CanAccessDashboard(await GetCurrentUserRoleAsync()))
        {
            return Forbid();
        }

        if (!_blobService.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Azure Blob Storage is not configured."
            });
        }

        var actorUserId = GetCurrentUserId();
        if (actorUserId is null)
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        var blobKey = request.BlobKey?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(blobKey) || !CategoryMediaKeyRules.IsUnderCategoriesPrefix(blobKey))
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string> { ["blobKey"] = "Invalid blob key." }
            });
        }

        if (!CategoryMediaKeyRules.IsStagingKeyForUser(blobKey, actorUserId.Value))
        {
            await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                              SELECT 1
                              FROM app.categories
                              WHERE image_s3_key = @key
                              LIMIT 1;
                              """;
            cmd.Parameters.AddWithValue("key", blobKey);
            var linked = await cmd.ExecuteScalarAsync(cancellationToken);
            if (linked is not null)
            {
                return BadRequest(new
                {
                    message = "Save the category after removing this image; storage cleanup runs on save."
                });
            }
        }

        await _blobService.DeleteAsync(blobKey, cancellationToken);
        return Ok(new { message = "Image deleted." });
    }
}
