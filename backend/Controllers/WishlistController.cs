using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/wishlist")]
public sealed class WishlistController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;

    public WishlistController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public sealed record WishlistProductDto(Guid Id, string Sku, string Name, decimal BasePrice);

    public sealed record AddWishlistRequest(Guid ProductId);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT p.id, p.sku, p.name, p.base_price::numeric
                          FROM app.wishlist_items w
                          INNER JOIN app.products p ON p.id = w.product_id
                          WHERE w.user_id = @uid
                            AND lower(p.status) = 'active'
                          ORDER BY w.created_at DESC;
                          """;
        cmd.Parameters.AddWithValue("uid", userId.Value);
        var list = new List<WishlistProductDto>();
        await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                list.Add(new WishlistProductDto(
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.GetString(2),
                    reader.GetDecimal(3)));
            }
        }

        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddWishlistRequest request, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var exists = conn.CreateCommand();
        exists.CommandText = """
                             SELECT 1 FROM app.products
                             WHERE id = @pid AND lower(status) = 'active'
                             LIMIT 1;
                             """;
        exists.Parameters.AddWithValue("pid", request.ProductId);
        var ok = await exists.ExecuteScalarAsync(cancellationToken);
        if (ok is null)
        {
            return NotFound(new { message = "Product not found." });
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          INSERT INTO app.wishlist_items (user_id, product_id)
                          VALUES (@uid, @pid)
                          ON CONFLICT (user_id, product_id) DO NOTHING;
                          """;
        cmd.Parameters.AddWithValue("uid", userId.Value);
        cmd.Parameters.AddWithValue("pid", request.ProductId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        return Ok();
    }

    [HttpDelete("{productId:guid}")]
    public async Task<IActionResult> Remove(Guid productId, CancellationToken cancellationToken)
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          DELETE FROM app.wishlist_items
                          WHERE user_id = @uid AND product_id = @pid;
                          """;
        cmd.Parameters.AddWithValue("uid", userId.Value);
        cmd.Parameters.AddWithValue("pid", productId);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        return Ok();
    }

    private Guid? RequireUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
