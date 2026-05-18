using backend.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

public sealed record DeleteProductImageRequest(string BlobKey);

public partial class ProductsController
{
    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    [Authorize]
    [HttpGet("media/config")]
    public async Task<IActionResult> GetMediaConfig()
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        if (!_blobService.IsEnabled)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Azure Blob Storage is not configured.",
                enabled = false,
                publicBaseUrl = (string?)null
            });
        }

        return Ok(new
        {
            enabled = true,
            publicBaseUrl = _blobService.PublicBaseUrl
        });
    }

    [Authorize]
    [HttpPost("media/images")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadProductImage(
        IFormFile? file,
        [FromQuery] Guid? productId,
        CancellationToken cancellationToken)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
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

        if (productId.HasValue && productId.Value != Guid.Empty)
        {
            await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1 FROM app.products WHERE id = @id LIMIT 1;";
            cmd.Parameters.AddWithValue("id", productId.Value);
            var exists = await cmd.ExecuteScalarAsync(cancellationToken);
            if (exists is null)
            {
                return NotFound(new { message = "Product not found." });
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

        var blobKey = productId.HasValue && productId.Value != Guid.Empty
            ? ProductMediaKeyRules.BuildProductKey(productId.Value)
            : ProductMediaKeyRules.BuildStagingKey(actorUserId.Value);

        await using var uploadStream = new MemoryStream(webpBytes);
        await _blobService.UploadAsync(blobKey, uploadStream, "image/webp", cancellationToken);

        return Ok(new
        {
            blobKey,
            publicUrl = _blobService.BuildPublicUrl(blobKey)
        });
    }

    [Authorize]
    [HttpDelete("media/images")]
    public async Task<IActionResult> DeleteProductImage([FromBody] DeleteProductImageRequest request, CancellationToken cancellationToken)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!ProductStoreScope.CanAccessDashboard(currentUserRole))
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
        if (string.IsNullOrWhiteSpace(blobKey) || !ProductMediaKeyRules.IsUnderProductsPrefix(blobKey))
        {
            return BadRequest(new
            {
                message = "Validation failed.",
                errors = new Dictionary<string, string> { ["blobKey"] = "Invalid blob key." }
            });
        }

        if (!ProductMediaKeyRules.IsStagingKeyForUser(blobKey, actorUserId.Value))
        {
            await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                              SELECT 1
                              FROM app.product_images
                              WHERE image_s3_key = @key
                              LIMIT 1;
                              """;
            cmd.Parameters.AddWithValue("key", blobKey);
            var linked = await cmd.ExecuteScalarAsync(cancellationToken);
            if (linked is not null)
            {
                return BadRequest(new
                {
                    message = "Save the product after removing this image; storage cleanup runs on save."
                });
            }
        }

        await _blobService.DeleteAsync(blobKey, cancellationToken);
        return Ok(new { message = "Image deleted." });
    }
}
