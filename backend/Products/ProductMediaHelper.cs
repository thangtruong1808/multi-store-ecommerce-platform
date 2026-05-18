namespace backend.Products;

internal static class ProductMediaHelper
{
    public static async Task<List<string>> ResolveImageKeysForSaveAsync(
        AzureProductBlobService blobService,
        IReadOnlyList<string> imageKeys,
        Guid productId,
        Guid actorUserId,
        CancellationToken cancellationToken = default)
    {
        var stagingKeys = imageKeys
            .Where(k => ProductMediaKeyRules.IsStagingKeyForUser(k, actorUserId))
            .ToList();
        var productKeys = imageKeys
            .Where(k => !ProductMediaKeyRules.IsStagingKeyForUser(k, actorUserId))
            .ToList();

        if (stagingKeys.Count > 0)
        {
            var promoted = await blobService.PromoteStagingBlobsAsync(stagingKeys, productId, cancellationToken);
            productKeys.AddRange(promoted);
        }

        return productKeys
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public static async Task DeleteOrphanedBlobsAsync(
        AzureProductBlobService blobService,
        IReadOnlyList<string> previousKeys,
        IReadOnlyList<string> newKeys,
        CancellationToken cancellationToken = default)
    {
        if (!blobService.IsEnabled)
        {
            return;
        }

        var removed = previousKeys
            .Except(newKeys, StringComparer.OrdinalIgnoreCase)
            .Where(ProductMediaKeyRules.IsUnderProductsPrefix)
            .ToList();
        if (removed.Count > 0)
        {
            await blobService.DeleteManyAsync(removed, cancellationToken);
        }
    }
}
