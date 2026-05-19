using System.Data.Common;
using System.Globalization;
using System.Security.Claims;
using backend.Invoices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard/invoices")]
public sealed class DashboardInvoicesController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;
    private readonly OrderInvoiceService _invoiceService;

    public DashboardInvoicesController(NpgsqlDataSource dataSource, OrderInvoiceService invoiceService)
    {
        _dataSource = dataSource;
        _invoiceService = invoiceService;
    }

    public sealed record DashboardInvoiceListItemDto(
        Guid Id,
        string OrderNumber,
        decimal GrandTotal,
        string CurrencyCode,
        string PaymentStatus,
        string PaymentStatusLabel,
        DateTimeOffset PlacedAt,
        string CustomerEmail,
        string? StoreName);

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var role = await GetCurrentUserRoleAsync(cancellationToken);
        if (!CanAccessDashboard(role))
        {
            return Forbid();
        }

        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 50);
        var offset = (safePage - 1) * safePageSize;
        var isAdmin = string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var countCmd = conn.CreateCommand();
        if (isAdmin)
        {
            countCmd.CommandText = "SELECT COUNT(*) FROM app.orders;";
        }
        else
        {
            countCmd.CommandText = """
                                   SELECT COUNT(*)
                                   FROM app.orders o
                                   WHERE o.store_id IN (
                                       SELECT store_id FROM app.store_staff WHERE user_id = @user_id
                                   );
                                   """;
            countCmd.Parameters.AddWithValue("user_id", userId.Value);
        }

        var totalItems = Convert.ToInt32(await countCmd.ExecuteScalarAsync(cancellationToken));

        await using var cmd = conn.CreateCommand();
        if (isAdmin)
        {
            cmd.CommandText = """
                              SELECT o.id,
                                     o.order_number,
                                     o.grand_total::numeric,
                                     o.currency_code,
                                     o.payment_status::text,
                                     o.placed_at,
                                     o.customer_email,
                                     s.name
                              FROM app.orders o
                              LEFT JOIN app.stores s ON s.id = o.store_id
                              ORDER BY o.placed_at DESC
                              LIMIT @limit OFFSET @offset;
                              """;
        }
        else
        {
            cmd.CommandText = """
                              SELECT o.id,
                                     o.order_number,
                                     o.grand_total::numeric,
                                     o.currency_code,
                                     o.payment_status::text,
                                     o.placed_at,
                                     o.customer_email,
                                     s.name
                              FROM app.orders o
                              LEFT JOIN app.stores s ON s.id = o.store_id
                              WHERE o.store_id IN (
                                  SELECT store_id FROM app.store_staff WHERE user_id = @user_id
                              )
                              ORDER BY o.placed_at DESC
                              LIMIT @limit OFFSET @offset;
                              """;
            cmd.Parameters.AddWithValue("user_id", userId.Value);
        }

        cmd.Parameters.AddWithValue("limit", safePageSize);
        cmd.Parameters.AddWithValue("offset", offset);

        var items = new List<DashboardInvoiceListItemDto>();
        await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var paymentStatus = reader.GetString(4);
                items.Add(new DashboardInvoiceListItemDto(
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.GetDecimal(2),
                    reader.GetString(3),
                    paymentStatus,
                    FormatPaymentStatusLabel(paymentStatus),
                    ReadPlacedAt(reader, 5),
                    reader.GetString(6),
                    reader.IsDBNull(7) ? null : reader.GetString(7)));
            }
        }

        return Ok(new
        {
            items,
            page = safePage,
            pageSize = safePageSize,
            totalItems,
            totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)safePageSize)),
        });
    }

    [HttpGet("{orderId:guid}/pdf")]
    public async Task<IActionResult> DownloadPdf(Guid orderId, CancellationToken cancellationToken = default)
    {
        var role = await GetCurrentUserRoleAsync(cancellationToken);
        if (!CanAccessDashboard(role))
        {
            return Forbid();
        }

        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        var result = await _invoiceService.GenerateForDashboardAsync(
            orderId,
            userId.Value,
            role!,
            cancellationToken);

        return result.Status switch
        {
            "success" => File(result.Pdf!, "application/pdf", result.FileName),
            "payment_pending" => BadRequest(new { message = "Invoice is available after payment is completed." }),
            _ => NotFound(new { message = "Invoice not found." }),
        };
    }

    private static string FormatPaymentStatusLabel(string paymentStatus)
    {
        return paymentStatus.ToLowerInvariant() switch
        {
            "succeeded" => "Paid",
            "pending" => "Pending",
            "failed" => "Failed",
            "canceled" or "cancelled" => "Cancelled",
            _ => CultureInfo.InvariantCulture.TextInfo.ToTitleCase(paymentStatus.Replace('_', ' ')),
        };
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

    private static bool CanAccessDashboard(string? role) => role is "admin" or "store_manager";

    private Guid? GetCurrentUserId()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdRaw, out var userId) ? userId : null;
    }

    private async Task<string?> GetCurrentUserRoleAsync(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return null;
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT role::text
                          FROM app.users
                          WHERE id = @user_id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("user_id", userId.Value);
        return await cmd.ExecuteScalarAsync(cancellationToken) as string;
    }
}
