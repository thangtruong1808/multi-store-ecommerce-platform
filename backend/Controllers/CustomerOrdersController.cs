using System.Data.Common;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/customer/orders")]
public sealed class CustomerOrdersController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;

    public CustomerOrdersController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public sealed record CustomerOrderListItemDto(
        Guid Id,
        string OrderNumber,
        DateTimeOffset PlacedAt,
        decimal GrandTotal,
        string CurrencyCode,
        string Status,
        string PaymentStatus);

    public sealed record CustomerOrderItemDto(
        string? Sku,
        string ProductName,
        int Quantity,
        decimal UnitPrice,
        decimal LineTotal);

    public sealed record CustomerOrderDetailDto(
        Guid Id,
        string OrderNumber,
        DateTimeOffset PlacedAt,
        decimal GrandTotal,
        string CurrencyCode,
        string Status,
        string PaymentStatus,
        IReadOnlyList<CustomerOrderItemDto> Items);

    [HttpGet]
    public async Task<IActionResult> ListMine([FromQuery] int take = 50, CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var safeTake = Math.Clamp(take, 1, 100);

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT id,
                                 order_number,
                                 placed_at,
                                 grand_total::numeric,
                                 currency_code,
                                 status::text,
                                 payment_status::text
                          FROM app.orders
                          WHERE customer_id = @uid
                          ORDER BY placed_at DESC
                          LIMIT @take;
                          """;
        cmd.Parameters.AddWithValue("uid", userId.Value);
        cmd.Parameters.AddWithValue("take", safeTake);

        var list = new List<CustomerOrderListItemDto>();
        await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                list.Add(new CustomerOrderListItemDto(
                    reader.GetGuid(0),
                    reader.GetString(1),
                    ReadPlacedAt(reader, 2),
                    reader.GetDecimal(3),
                    reader.GetString(4),
                    reader.GetString(5),
                    reader.GetString(6)));
            }
        }

        return Ok(list);
    }

    [HttpGet("{orderId:guid}")]
    public async Task<IActionResult> GetMine(Guid orderId, CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var headerCmd = conn.CreateCommand();
        headerCmd.CommandText = """
                                SELECT id,
                                       order_number,
                                       placed_at,
                                       grand_total::numeric,
                                       currency_code,
                                       status::text,
                                       payment_status::text
                                FROM app.orders
                                WHERE id = @oid
                                  AND customer_id = @uid
                                LIMIT 1;
                                """;
        headerCmd.Parameters.AddWithValue("oid", orderId);
        headerCmd.Parameters.AddWithValue("uid", userId.Value);

        CustomerOrderListItemDto header;
        await using (var reader = await headerCmd.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                return NotFound(new { message = "Order not found." });
            }

            header = new CustomerOrderListItemDto(
                reader.GetGuid(0),
                reader.GetString(1),
                ReadPlacedAt(reader, 2),
                reader.GetDecimal(3),
                reader.GetString(4),
                reader.GetString(5),
                reader.GetString(6));
        }

        var items = new List<CustomerOrderItemDto>();
        await using (var itemsCmd = conn.CreateCommand())
        {
            itemsCmd.CommandText = """
                                  SELECT sku,
                                         product_name,
                                         quantity,
                                         unit_price::numeric,
                                         line_total::numeric
                                  FROM app.order_items
                                  WHERE order_id = @oid
                                  ORDER BY created_at;
                                  """;
            itemsCmd.Parameters.AddWithValue("oid", orderId);
            await using var ir = await itemsCmd.ExecuteReaderAsync(cancellationToken);
            while (await ir.ReadAsync(cancellationToken))
            {
                items.Add(new CustomerOrderItemDto(
                    ir.IsDBNull(0) ? null : ir.GetString(0),
                    ir.GetString(1),
                    ir.GetInt32(2),
                    ir.GetDecimal(3),
                    ir.GetDecimal(4)));
            }
        }

        return Ok(new CustomerOrderDetailDto(
            header.Id,
            header.OrderNumber,
            header.PlacedAt,
            header.GrandTotal,
            header.CurrencyCode,
            header.Status,
            header.PaymentStatus,
            items));
    }

    private static DateTimeOffset ReadPlacedAt(DbDataReader reader, int ordinal)
    {
        var value = reader.GetValue(ordinal);
        return value switch
        {
            DateTimeOffset dto => dto,
            DateTime dt => new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc)),
            _ => DateTimeOffset.UtcNow,
        };
    }

    private Guid? RequireUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}
