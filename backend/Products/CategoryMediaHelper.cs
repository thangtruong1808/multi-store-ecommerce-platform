namespace backend.Products;

internal static class CategoryMediaHelper
{
    public static async Task<string?> ResolveImageKeyForSaveAsync(
        AzureProductBlobService blobService,
        string? imageKey,
        Guid categoryId,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var trimmed = imageKey?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return null;
        }

        if (CategoryMediaKeyRules.IsStagingKeyForUser(trimmed, actorUserId))
        {
            return await blobService.PromoteCategoryStagingBlobAsync(trimmed, categoryId, cancellationToken);
        }

        return trimmed;
    }

    public static async Task DeleteOrphanedBlobAsync(
        AzureProductBlobService blobService,
        string? previousKey,
        string? newKey,
        CancellationToken cancellationToken = default)
    {
        if (!blobService.IsEnabled)
        {
            return;
        }

        var prev = previousKey?.Trim() ?? string.Empty;
        var next = newKey?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(prev) || string.Equals(prev, next, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (CategoryMediaKeyRules.IsUnderCategoriesPrefix(prev))
        {
            await blobService.DeleteAsync(prev, cancellationToken);
        }
    }
}
