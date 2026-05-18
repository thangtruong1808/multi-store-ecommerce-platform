using System.Text.RegularExpressions;

namespace backend.Products;

public static partial class ProductMediaKeyRules
{
    private const string ProductsPrefix = "products/";

    public static string BuildStagingKey(Guid userId) =>
        $"{ProductsPrefix}staging/{userId:D}/{Guid.NewGuid():N}.webp";

    public static string BuildProductKey(Guid productId) =>
        $"{ProductsPrefix}{productId:D}/{Guid.NewGuid():N}.webp";

    public static bool IsUnderProductsPrefix(string blobKey) =>
        blobKey.StartsWith(ProductsPrefix, StringComparison.OrdinalIgnoreCase);

    public static bool IsStagingKeyForUser(string blobKey, Guid userId) =>
        blobKey.StartsWith($"{ProductsPrefix}staging/{userId:D}/", StringComparison.OrdinalIgnoreCase);

    public static bool IsProductKeyForProduct(string blobKey, Guid productId) =>
        blobKey.StartsWith($"{ProductsPrefix}{productId:D}/", StringComparison.OrdinalIgnoreCase);

    public static bool IsValidKeyFormat(string blobKey) =>
        BlobKeyFormatRegex().IsMatch(blobKey);

    public static bool CanUseOnUpsert(string blobKey, Guid? actorUserId, Guid? productId, bool isCreate)
    {
        if (!IsUnderProductsPrefix(blobKey) || !IsValidKeyFormat(blobKey))
        {
            return false;
        }

        if (actorUserId is null)
        {
            return false;
        }

        if (IsStagingKeyForUser(blobKey, actorUserId.Value))
        {
            return true;
        }

        if (!isCreate && productId.HasValue && IsProductKeyForProduct(blobKey, productId.Value))
        {
            return true;
        }

        return false;
    }

    public static List<string> ValidateKeysForUpsert(
        IReadOnlyList<string> keys,
        Guid? actorUserId,
        Guid? productId,
        bool isCreate,
        out string? errorMessage)
    {
        errorMessage = null;
        var valid = new List<string>();
        foreach (var key in keys)
        {
            if (!CanUseOnUpsert(key, actorUserId, productId, isCreate))
            {
                errorMessage = "One or more image keys are invalid or not allowed for this product.";
                return [];
            }

            valid.Add(key);
        }

        return valid;
    }

    [GeneratedRegex(@"^products/(staging/[0-9a-fA-F\-]{36}/|[0-9a-fA-F\-]{36}/)[0-9a-fA-F]{32}\.webp$", RegexOptions.CultureInvariant)]
    private static partial Regex BlobKeyFormatRegex();
}
