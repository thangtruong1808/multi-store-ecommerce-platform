using System.Data.Common;
using Microsoft.Extensions.Options;
using Npgsql;

namespace backend.Invoices;

public sealed class OrderInvoiceService
{
    private readonly NpgsqlDataSource _dataSource;
    private readonly OrderInvoicePdfGenerator _pdfGenerator;
    private readonly OrderInvoiceOptions _options;

    public OrderInvoiceService(
        NpgsqlDataSource dataSource,
        OrderInvoicePdfGenerator pdfGenerator,
        IOptions<OrderInvoiceOptions> options)
    {
        _dataSource = dataSource;
        _pdfGenerator = pdfGenerator;
        _options = options.Value;
    }

    public async Task<OrderInvoiceGenerateResult> GenerateForCustomerAsync(
        Guid orderId,
        Guid customerId,
        CancellationToken cancellationToken = default)
    {
        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var headerCmd = conn.CreateCommand();
        headerCmd.CommandText = """
                                SELECT o.order_number,
                                       o.placed_at,
                                       o.customer_email,
                                       o.customer_full_name,
                                       o.subtotal::numeric,
                                       o.discount_total::numeric,
                                       o.tax_total::numeric,
                                       o.shipping_total::numeric,
                                       o.grand_total::numeric,
                                       o.currency_code,
                                       o.status::text,
                                       o.payment_status::text,
                                       s.name
                                FROM app.orders o
                                LEFT JOIN app.stores s ON s.id = o.store_id
                                WHERE o.id = @oid
                                  AND o.customer_id = @uid
                                LIMIT 1;
                                """;
        headerCmd.Parameters.AddWithValue("oid", orderId);
        headerCmd.Parameters.AddWithValue("uid", customerId);

        string orderNumber;
        DateTimeOffset placedAt;
        string customerEmail;
        string customerName;
        decimal subtotal;
        decimal discountTotal;
        decimal taxTotal;
        decimal shippingTotal;
        decimal grandTotal;
        string currencyCode;
        string status;
        string paymentStatus;
        string? storeName;

        await using (var reader = await headerCmd.ExecuteReaderAsync(cancellationToken))
        {
            if (!await reader.ReadAsync(cancellationToken))
            {
                return OrderInvoiceGenerateResult.NotFound();
            }

            orderNumber = reader.GetString(0);
            placedAt = ReadPlacedAt(reader, 1);
            customerEmail = reader.GetString(2);
            customerName = reader.IsDBNull(3) ? string.Empty : reader.GetString(3);
            subtotal = reader.GetDecimal(4);
            discountTotal = reader.GetDecimal(5);
            taxTotal = reader.GetDecimal(6);
            shippingTotal = reader.GetDecimal(7);
            grandTotal = reader.GetDecimal(8);
            currencyCode = reader.GetString(9);
            status = reader.GetString(10);
            paymentStatus = reader.GetString(11);
            storeName = reader.IsDBNull(12) ? null : reader.GetString(12);
        }

        if (!string.Equals(paymentStatus, "succeeded", StringComparison.OrdinalIgnoreCase))
        {
            return OrderInvoiceGenerateResult.PaymentPending();
        }

        var lines = new List<OrderInvoiceLine>();
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
            await using var itemsReader = await itemsCmd.ExecuteReaderAsync(cancellationToken);
            while (await itemsReader.ReadAsync(cancellationToken))
            {
                lines.Add(new OrderInvoiceLine(
                    itemsReader.IsDBNull(0) ? null : itemsReader.GetString(0),
                    itemsReader.GetString(1),
                    itemsReader.GetInt32(2),
                    itemsReader.GetDecimal(3),
                    itemsReader.GetDecimal(4)));
            }
        }

        var invoiceData = new OrderInvoiceData(
            orderNumber,
            placedAt,
            string.IsNullOrWhiteSpace(customerName) ? customerEmail : customerName.Trim(),
            customerEmail,
            storeName,
            currencyCode,
            subtotal,
            discountTotal,
            taxTotal,
            shippingTotal,
            grandTotal,
            status,
            paymentStatus,
            lines,
            _options.BusinessName,
            _options.BusinessShortName,
            string.IsNullOrWhiteSpace(_options.SupportEmail) ? null : _options.SupportEmail.Trim());

        var pdf = _pdfGenerator.Generate(invoiceData);
        var safeNumber = orderNumber.Replace("/", "-", StringComparison.Ordinal);
        return OrderInvoiceGenerateResult.Success(pdf, $"invoice-{safeNumber}.pdf");
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
}
