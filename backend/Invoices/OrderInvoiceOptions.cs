namespace backend.Invoices;

public sealed class OrderInvoiceOptions
{
    public string BusinessName { get; set; } = "Multi-Store Ecommerce Platform";

    public string BusinessShortName { get; set; } = "Multi-Store";

    /// <summary>Support / business contact (from CONTACT_FORM_TO_EMAIL).</summary>
    public string SupportEmail { get; set; } = string.Empty;
}
