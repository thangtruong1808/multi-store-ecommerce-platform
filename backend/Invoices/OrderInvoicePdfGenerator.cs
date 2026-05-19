using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace backend.Invoices;

public sealed class OrderInvoicePdfGenerator
{
    private static readonly string Sky600 = "#0284C7";
    private static readonly string Slate700 = "#334155";
    private static readonly string Slate500 = "#64748B";

    static OrderInvoicePdfGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Generate(OrderInvoiceData invoice)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Slate700));

                page.Header().Element(header => ComposeHeader(header, invoice));
                page.Content().PaddingVertical(16).Element(body => ComposeBody(body, invoice));
                page.Footer()
                    .BorderTop(1)
                    .BorderColor(Colors.Grey.Lighten2)
                    .PaddingTop(8)
                    .AlignCenter()
                    .Text(text =>
                    {
                        text.DefaultTextStyle(x => x.FontSize(9).FontColor(Slate500));
                        text.Span("Questions about this invoice? Contact ");
                        if (!string.IsNullOrWhiteSpace(invoice.SupportEmail))
                        {
                            text.Span(invoice.SupportEmail).FontColor(Sky600);
                        }
                        else
                        {
                            text.Span("our support team through the website.");
                        }
                    });
            });
        }).GeneratePdf();
    }

    private static void ComposeHeader(IContainer container, OrderInvoiceData invoice)
    {
        container.Column(column =>
        {
            column.Item().Background(Sky600).Padding(16).Row(row =>
            {
                row.ConstantItem(44).Height(44).Background("#0369A1").AlignCenter().AlignMiddle()
                    .Text("⌂").FontSize(22).FontColor(Colors.White);
                row.RelativeItem().PaddingLeft(12).Column(inner =>
                {
                    inner.Item().Text(invoice.BusinessShortName).FontSize(16).Bold().FontColor(Colors.White);
                    inner.Item().Text("Ecommerce Platform").FontSize(11).FontColor("#E0F2FE");
                });
                row.ConstantItem(140).AlignRight().Column(inner =>
                {
                    inner.Item().Text("TAX INVOICE").FontSize(14).Bold().FontColor(Colors.White);
                    inner.Item().PaddingTop(4).Text(invoice.OrderNumber).FontSize(10).FontColor("#E0F2FE");
                });
            });

            column.Item().PaddingTop(16).Row(row =>
            {
                row.RelativeItem().Column(left =>
                {
                    left.Item().Text("From").FontSize(9).SemiBold().FontColor(Slate500);
                    left.Item().Text(invoice.BusinessName).SemiBold();
                    if (!string.IsNullOrWhiteSpace(invoice.SupportEmail))
                    {
                        left.Item().Text(invoice.SupportEmail).FontColor(Sky600);
                    }
                });

                row.RelativeItem().Column(right =>
                {
                    right.Item().AlignRight().Text("Bill to").FontSize(9).SemiBold().FontColor(Slate500);
                    right.Item().AlignRight().Text(invoice.CustomerName).SemiBold();
                    right.Item().AlignRight().Text(invoice.CustomerEmail);
                    right.Item().AlignRight().PaddingTop(6).Text($"Date: {invoice.PlacedAt.ToString("dd MMM yyyy, HH:mm")} UTC");
                    if (!string.IsNullOrWhiteSpace(invoice.StoreName))
                    {
                        right.Item().AlignRight().Text($"Fulfilled by: {invoice.StoreName}");
                    }
                });
            });
        });
    }

    private static void ComposeBody(IContainer container, OrderInvoiceData invoice)
    {
        container.Column(column =>
        {
            column.Item().Text("Order details").FontSize(12).SemiBold().FontColor(Slate700);
            column.Item().PaddingTop(8).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn(3);
                    columns.ConstantColumn(70);
                    columns.ConstantColumn(50);
                    columns.ConstantColumn(80);
                    columns.ConstantColumn(80);
                });

                table.Header(header =>
                {
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text("Product").SemiBold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(6).Text("SKU").SemiBold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(6).AlignCenter().Text("Qty").SemiBold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(6).AlignRight().Text("Unit").SemiBold();
                    header.Cell().Background(Colors.Grey.Lighten3).Padding(6).AlignRight().Text("Line total").SemiBold();
                });

                foreach (var line in invoice.Lines)
                {
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).Text(line.ProductName);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6)
                        .Text(line.Sku ?? "—").FontSize(9);
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignCenter()
                        .Text(line.Quantity.ToString());
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                        .Text(FormatMoney(line.UnitPrice, invoice.CurrencyCode));
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2).Padding(6).AlignRight()
                        .Text(FormatMoney(line.LineTotal, invoice.CurrencyCode));
                }
            });

            column.Item().PaddingTop(16).AlignRight().Width(220).Column(totals =>
            {
                totals.Item().Row(r =>
                {
                    r.RelativeItem().Text("Subtotal");
                    r.ConstantItem(90).AlignRight().Text(FormatMoney(invoice.Subtotal, invoice.CurrencyCode));
                });
                if (invoice.DiscountTotal > 0)
                {
                    totals.Item().PaddingTop(4).Row(r =>
                    {
                        r.RelativeItem().Text("Discount");
                        r.ConstantItem(90).AlignRight().Text($"-{FormatMoney(invoice.DiscountTotal, invoice.CurrencyCode)}");
                    });
                }
                if (invoice.TaxTotal > 0)
                {
                    totals.Item().PaddingTop(4).Row(r =>
                    {
                        r.RelativeItem().Text("Tax");
                        r.ConstantItem(90).AlignRight().Text(FormatMoney(invoice.TaxTotal, invoice.CurrencyCode));
                    });
                }
                if (invoice.ShippingTotal > 0)
                {
                    totals.Item().PaddingTop(4).Row(r =>
                    {
                        r.RelativeItem().Text("Shipping");
                        r.ConstantItem(90).AlignRight().Text(FormatMoney(invoice.ShippingTotal, invoice.CurrencyCode));
                    });
                }
                totals.Item().PaddingTop(8).BorderTop(1).BorderColor(Colors.Grey.Lighten2).Row(r =>
                {
                    r.RelativeItem().Text("Total paid").SemiBold();
                    r.ConstantItem(90).AlignRight().Text(FormatMoney(invoice.GrandTotal, invoice.CurrencyCode)).SemiBold();
                });
            });

            column.Item().PaddingTop(20).Text(text =>
            {
                text.DefaultTextStyle(x => x.FontSize(9).FontColor(Slate500));
                text.Span("Payment status: ").SemiBold();
                text.Span(invoice.PaymentStatus.Replace('_', ' '));
                text.Span(" · Order status: ").SemiBold();
                text.Span(invoice.Status.Replace('_', ' '));
            });

            column.Item().PaddingTop(8).Text(
                    "Thank you for shopping with us. Please retain this invoice for your records.")
                .FontSize(9)
                .FontColor(Slate500);
        });
    }

    private static string FormatMoney(decimal amount, string currencyCode)
    {
        var code = string.IsNullOrWhiteSpace(currencyCode) ? "AUD" : currencyCode.Trim().ToUpperInvariant();
        var symbol = code switch
        {
            "AUD" => "A$",
            "USD" => "$",
            "EUR" => "€",
            "GBP" => "£",
            _ => $"{code} ",
        };
        return $"{symbol}{amount:N2}";
    }
}
