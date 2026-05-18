namespace backend.Products;

public sealed class AzureProductBlobOptions
{
    public bool Enabled { get; set; }
    public string ConnectionString { get; set; } = string.Empty;
    public string ContainerName { get; set; } = "product-photos";
    public string PublicBaseUrl { get; set; } = string.Empty;
    public long MaxUploadBytes { get; set; } = 8 * 1024 * 1024;
}
