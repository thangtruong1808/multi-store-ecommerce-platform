using System.Text.RegularExpressions;

namespace backend.Products;

public static partial class CategoryMediaKeyRules
{
    private const string CategoriesPrefix = "categories/";

    public static string BuildStagingKey(Guid userId) =>
        $"{CategoriesPrefix}staging/{userId:D}/{Guid.NewGuid():N}.webp";

    public static string BuildCategoryKey(Guid categoryId) =>
        $"{CategoriesPrefix}{categoryId:D}/{Guid.NewGuid():N}.webp";

    public static bool IsUnderCategoriesPrefix(string blobKey) =>
        blobKey.StartsWith(CategoriesPrefix, StringComparison.OrdinalIgnoreCase);

    public static bool IsStagingKeyForUser(string blobKey, Guid userId) =>
        blobKey.StartsWith($"{CategoriesPrefix}staging/{userId:D}/", StringComparison.OrdinalIgnoreCase);

    public static bool IsCategoryKeyForCategory(string blobKey, Guid categoryId) =>
        blobKey.StartsWith($"{CategoriesPrefix}{categoryId:D}/", StringComparison.OrdinalIgnoreCase);

    public static bool IsValidKeyFormat(string blobKey) =>
        CategoryBlobKeyFormatRegex().IsMatch(blobKey);

    public static bool CanUseOnUpsert(string blobKey, Guid? actorUserId, Guid? categoryId, bool isCreate)
    {
        if (!IsUnderCategoriesPrefix(blobKey) || !IsValidKeyFormat(blobKey) || actorUserId is null)
        {
            return false;
        }

        if (IsStagingKeyForUser(blobKey, actorUserId.Value))
        {
            return true;
        }

        if (!isCreate && categoryId.HasValue && IsCategoryKeyForCategory(blobKey, categoryId.Value))
        {
            return true;
        }

        return false;
    }

    public static bool TryValidateForLevel1Upsert(
        string? imageS3Key,
        Guid? actorUserId,
        Guid? categoryId,
        bool isCreate,
        out string? normalizedKey,
        out string? errorMessage)
    {
        normalizedKey = null;
        errorMessage = null;
        var trimmed = imageS3Key?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return true;
        }

        if (!CanUseOnUpsert(trimmed, actorUserId, categoryId, isCreate))
        {
            errorMessage = "Category image key is invalid or not allowed.";
            return false;
        }

        normalizedKey = trimmed;
        return true;
    }

    [GeneratedRegex(@"^categories/(staging/[0-9a-fA-F\-]{36}/|[0-9a-fA-F\-]{36}/)[0-9a-fA-F]{32}\.webp$", RegexOptions.CultureInvariant)]
    private static partial Regex CategoryBlobKeyFormatRegex();
}
