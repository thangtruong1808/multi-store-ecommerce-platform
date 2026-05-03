using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

    public ProductsController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
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
