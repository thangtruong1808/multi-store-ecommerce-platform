namespace backend.Products;

internal static class AvatarMediaHelper
{
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

        if (AvatarMediaKeyRules.IsUnderAvatarsPrefix(prev))
        {
            await blobService.DeleteAsync(prev, cancellationToken);
        }
    }
}
