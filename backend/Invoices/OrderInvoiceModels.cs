namespace backend.Invoices;

public sealed record OrderInvoiceLine(
    string? Sku,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal);

public sealed record OrderInvoiceData(
    string OrderNumber,
    DateTimeOffset PlacedAt,
    string CustomerName,
    string CustomerEmail,
    string? StoreName,
    string CurrencyCode,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal TaxTotal,
    decimal ShippingTotal,
    decimal GrandTotal,
    string Status,
    string PaymentStatus,
    IReadOnlyList<OrderInvoiceLine> Lines,
    string BusinessName,
    string BusinessShortName,
    string? SupportEmail);
