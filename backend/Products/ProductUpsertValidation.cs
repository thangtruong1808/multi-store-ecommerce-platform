using System.Globalization;
using backend.Controllers;
using Npgsql;

namespace backend.Products;

/// <summary>Field validation and normalization for product create/update (mirrors prior controller logic).</summary>
internal static class ProductUpsertValidation
{
    public static async Task<(
        Dictionary<string, string> Errors,
        string Sku,
        string Name,
        string? Description,
        decimal BasePrice,
        string Status,
        Guid CategoryId,
        List<string> ImageS3Keys,
        List<string> VideoUrls,
        bool IsClearance,
        bool IsRefurbished)> ValidateAndNormalizeAsync(NpgsqlDataSource dataSource, UpsertProductRequest request)
    {
        var errors = new Dictionary<string, string>();
        var sku = (request.Sku ?? string.Empty).Trim().ToUpperInvariant();
        var name = (request.Name ?? string.Empty).Trim();
        var description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        var status = (request.Status ?? string.Empty).Trim().ToLowerInvariant();
        var imageS3Keys = (request.ImageS3Keys ?? []).Select(x => x.Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var videoUrls = (request.VideoUrls ?? []).Select(x => x.Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        if (string.IsNullOrWhiteSpace(sku) || sku.Length < 2)
        {
            errors["sku"] = "SKU must be at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
        {
            errors["name"] = "Product name must be at least 2 characters.";
        }

        if (request.BasePrice < 0)
        {
            errors["basePrice"] = "Base price must be greater than or equal to 0.";
        }

        if (!ProductStoreScope.IsValidProductStatus(status))
        {
            errors["status"] = "Status must be one of: active, inactive, draft.";
        }

        if (imageS3Keys.Count > 4)
        {
            errors["imageS3Keys"] = "Maximum 4 product images are allowed.";
        }

        for (var i = 0; i < videoUrls.Count; i++)
        {
            if (!Uri.TryCreate(videoUrls[i], UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                errors["videoUrls"] = "All video URLs must be valid http/https URLs.";
                break;
            }
        }

        await using var conn = await dataSource.OpenConnectionAsync();
        await using var categoryCmd = conn.CreateCommand();
        categoryCmd.CommandText = "SELECT level FROM app.categories WHERE id = @id LIMIT 1;";
        categoryCmd.Parameters.AddWithValue("id", request.CategoryId);
        var levelRaw = await categoryCmd.ExecuteScalarAsync();
        if (levelRaw is null)
        {
            errors["categoryId"] = "Selected category does not exist.";
        }
        else
        {
            var level = Convert.ToInt16(levelRaw, CultureInfo.InvariantCulture);
            if (level != 3)
            {
                errors["categoryId"] = "Product must be assigned to a level 3 category.";
            }
        }

        return (errors, sku, name, description, request.BasePrice, status, request.CategoryId, imageS3Keys, videoUrls, request.IsClearance, request.IsRefurbished);
    }
}
