using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace backend.Products;

public sealed class ProductImageProcessor
{
    private const int MaxLongestEdge = 1200;
    private const int WebpQuality = 82;

    public async Task<byte[]> ProcessToWebpAsync(Stream input, CancellationToken cancellationToken = default)
    {
        using var image = await Image.LoadAsync(input, cancellationToken);
        image.Mutate(ctx => ctx.AutoOrient());

        var width = image.Width;
        var height = image.Height;
        var longest = Math.Max(width, height);
        if (longest > MaxLongestEdge)
        {
            var scale = MaxLongestEdge / (double)longest;
            var targetWidth = Math.Max(1, (int)Math.Round(width * scale));
            var targetHeight = Math.Max(1, (int)Math.Round(height * scale));
            image.Mutate(ctx => ctx.Resize(targetWidth, targetHeight));
        }

        await using var output = new MemoryStream();
        var encoder = new WebpEncoder { Quality = WebpQuality };
        await image.SaveAsWebpAsync(output, encoder, cancellationToken);
        return output.ToArray();
    }
}
