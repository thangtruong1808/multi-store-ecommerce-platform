using System.Security.Claims;
using backend.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Npgsql;

namespace backend.Controllers;

/// <summary>
/// Product APIs split across partial files: <see cref="ProductsController.Public"/> (storefront),
/// <see cref="ProductsController.Dashboard"/> (admin/store_manager). Shared DB/auth helpers live here.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public partial class ProductsController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;
    private readonly AzureProductBlobService _blobService;
    private readonly ProductImageProcessor _imageProcessor;
    private readonly AzureProductBlobOptions _blobOptions;

    public ProductsController(
        NpgsqlDataSource dataSource,
        AzureProductBlobService blobService,
        ProductImageProcessor imageProcessor,
        IOptions<AzureProductBlobOptions> blobOptions)
    {
        _dataSource = dataSource;
        _blobService = blobService;
        _imageProcessor = imageProcessor;
        _blobOptions = blobOptions.Value;
    }

    private async Task<string?> GetCurrentUserRoleAsync()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return null;
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT role::text
                          FROM app.users
                          WHERE id = @user_id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("user_id", userId);
        return await cmd.ExecuteScalarAsync() as string;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdRaw, out var userId) ? userId : null;
    }
}
