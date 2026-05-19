namespace backend.Invoices;

public sealed class OrderInvoiceGenerateResult
{
    private OrderInvoiceGenerateResult(string status, byte[]? pdf, string? fileName)
    {
        Status = status;
        Pdf = pdf;
        FileName = fileName;
    }

    public string Status { get; }

    public byte[]? Pdf { get; }

    public string? FileName { get; }

    public static OrderInvoiceGenerateResult NotFound() => new("not_found", null, null);

    public static OrderInvoiceGenerateResult PaymentPending() => new("payment_pending", null, null);

    public static OrderInvoiceGenerateResult Success(byte[] pdf, string fileName) => new("success", pdf, fileName);
}
