using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;

namespace backend.Products;

public sealed class AzureProductBlobService
{
    private readonly AzureProductBlobOptions _options;
    private readonly ILogger<AzureProductBlobService> _logger;
    private BlobContainerClient? _container;

    public AzureProductBlobService(IOptions<AzureProductBlobOptions> options, ILogger<AzureProductBlobService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsEnabled => _options.Enabled;

    public string PublicBaseUrl => _options.PublicBaseUrl.TrimEnd('/');

    public string BuildPublicUrl(string blobKey) => $"{PublicBaseUrl}/{blobKey}";

    public async Task<string> UploadAsync(string blobKey, Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        var container = await GetContainerAsync(cancellationToken);
        var blob = container.GetBlobClient(blobKey);
        await blob.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: cancellationToken);
        return blobKey;
    }

    public async Task DeleteAsync(string blobKey, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || string.IsNullOrWhiteSpace(blobKey))
        {
            return;
        }

        try
        {
            var container = await GetContainerAsync(cancellationToken);
            await container.DeleteBlobIfExistsAsync(blobKey, cancellationToken: cancellationToken);
        }
        catch (RequestFailedException ex)
        {
            _logger.LogWarning(ex, "Failed to delete blob {BlobKey}", blobKey);
        }
    }

    public async Task DeleteManyAsync(IEnumerable<string> blobKeys, CancellationToken cancellationToken = default)
    {
        foreach (var key in blobKeys.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            await DeleteAsync(key, cancellationToken);
        }
    }

    /// <summary>Copies staging blobs to the product folder and deletes staging blobs.</summary>
    public async Task<List<string>> PromoteStagingBlobsAsync(IReadOnlyList<string> stagingKeys, Guid productId, CancellationToken cancellationToken = default)
    {
        EnsureEnabled();
        var promoted = new List<string>();
        var container = await GetContainerAsync(cancellationToken);

        foreach (var stagingKey in stagingKeys)
        {
            if (!ProductMediaKeyRules.IsUnderProductsPrefix(stagingKey))
            {
                continue;
            }

            var destKey = ProductMediaKeyRules.BuildProductKey(productId);
            var source = container.GetBlobClient(stagingKey);
            var dest = container.GetBlobClient(destKey);
            await dest.StartCopyFromUriAsync(source.Uri, cancellationToken: cancellationToken);

            var props = await dest.GetPropertiesAsync(cancellationToken: cancellationToken);
            while (props.Value.CopyStatus is CopyStatus.Pending)
            {
                await Task.Delay(50, cancellationToken);
                props = await dest.GetPropertiesAsync(cancellationToken: cancellationToken);
            }

            if (props.Value.CopyStatus != CopyStatus.Success)
            {
                throw new InvalidOperationException($"Failed to promote blob {stagingKey}.");
            }

            await source.DeleteIfExistsAsync(cancellationToken: cancellationToken);
            promoted.Add(destKey);
        }

        return promoted;
    }

    public async Task<bool> ExistsAsync(string blobKey, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return false;
        }

        var container = await GetContainerAsync(cancellationToken);
        var response = await container.GetBlobClient(blobKey).ExistsAsync(cancellationToken);
        return response.Value;
    }

    private void EnsureEnabled()
    {
        if (!IsEnabled)
        {
            throw new InvalidOperationException("Azure Blob Storage is not configured. Set AZURE_STORAGE_ENABLED=true and required Azure variables.");
        }
    }

    private async Task<BlobContainerClient> GetContainerAsync(CancellationToken cancellationToken)
    {
        if (_container is not null)
        {
            return _container;
        }

        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("AZURE_STORAGE_CONNECTION_STRING is not configured.");
        }

        var service = new BlobServiceClient(_options.ConnectionString);
        _container = service.GetBlobContainerClient(_options.ContainerName);
        await _container.CreateIfNotExistsAsync(PublicAccessType.Blob, cancellationToken: cancellationToken);
        return _container;
    }
}
