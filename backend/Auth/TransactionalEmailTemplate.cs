using System.Net;
using System.Text;

namespace backend.Auth;

internal static class TransactionalEmailTemplate
{
    public const string BrandName = "Multi-Store Ecommerce Platform";
    public const string BrandShortName = "Multi-Store";

    public static string BuildHtmlDocument(string title, string bodyHtml, string? supportEmail)
    {
        var safeTitle = WebUtility.HtmlEncode(title);
        var header = BuildBrandHeaderHtml();
        var footer = BuildSupportFooterHtml(supportEmail);
        var year = DateTime.UtcNow.Year;

        return $"""
                <!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="utf-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                  <title>{safeTitle}</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:24px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                          <tr>
                            <td style="padding:22px 24px;background-color:#0284c7;">
                              {header}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:28px 24px;color:#334155;font-size:15px;line-height:1.65;">
                              {bodyHtml}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:18px 24px;background-color:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:13px;line-height:1.55;">
                              {footer}
                            </td>
                          </tr>
                        </table>
                        <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
                          © {year} {WebUtility.HtmlEncode(BrandName)}
                        </p>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """;
    }

    public static string BuildPlainDocument(string bodyPlain, string? supportEmail)
    {
        var sb = new StringBuilder();
        sb.AppendLine(BrandName);
        sb.AppendLine(new string('=', BrandName.Length));
        sb.AppendLine();
        sb.AppendLine(bodyPlain.Trim());
        sb.AppendLine();
        sb.AppendLine(BuildSupportFooterPlain(supportEmail));
        sb.AppendLine();
        sb.AppendLine($"© {DateTime.UtcNow.Year} {BrandName}");
        return sb.ToString();
    }

    public static string BuildPrimaryButtonHtml(string href, string label)
    {
        var safeHref = WebUtility.HtmlEncode(href);
        var safeLabel = WebUtility.HtmlEncode(label);
        return $"""
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 8px;">
                  <tr>
                    <td align="left" style="border-radius:8px;background-color:#0284c7;">
                      <a href="{safeHref}" target="_blank" rel="noopener noreferrer"
                         style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                        {safeLabel}
                      </a>
                    </td>
                  </tr>
                </table>
                """;
    }

    public static string BuildOrderItemsTableHtml(
        IReadOnlyList<(string ProductName, int Quantity, decimal LineTotal)> items,
        string currencyCode)
    {
        var rows = new StringBuilder();
        foreach (var item in items)
        {
            var name = WebUtility.HtmlEncode(item.ProductName);
            var qty = item.Quantity.ToString();
            var line = FormatMoney(item.LineTotal, currencyCode);
            rows.AppendLine(
                $"""
                 <tr>
                   <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">{name}</td>
                   <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;text-align:center;white-space:nowrap;">×{qty}</td>
                   <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;text-align:right;white-space:nowrap;">{line}</td>
                 </tr>
                 """);
        }

        return $"""
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 0;border-collapse:collapse;">
                  <tr>
                    <th align="left" style="padding:0 0 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Item</th>
                    <th align="center" style="padding:0 8px 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Qty</th>
                    <th align="right" style="padding:0 0 8px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Total</th>
                  </tr>
                  {rows}
                </table>
                """;
    }

    public static string FormatMoney(decimal amount, string currencyCode)
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
        return $"{symbol}{amount.ToString("N2", System.Globalization.CultureInfo.InvariantCulture)}";
    }

    private static string BuildBrandHeaderHtml()
    {
        return """
               <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
                 <tr>
                   <td style="vertical-align:middle;padding-right:12px;">
                     <div style="width:44px;height:44px;background-color:rgba(255,255,255,0.18);border-radius:10px;text-align:center;line-height:44px;font-size:22px;color:#ffffff;">
                       ⌂
                     </div>
                   </td>
                   <td style="vertical-align:middle;text-align:left;">
                     <div style="color:#ffffff;font-size:16px;font-weight:700;line-height:1.25;">Multi-Store</div>
                     <div style="color:#e0f2fe;font-size:14px;font-weight:600;line-height:1.25;">Ecommerce Platform</div>
                   </td>
                 </tr>
               </table>
               """;
    }

    private static string BuildSupportFooterHtml(string? supportEmail)
    {
        var email = supportEmail?.Trim();
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return "<strong>Need help?</strong> Visit our website and use the contact form.";
        }

        var safe = WebUtility.HtmlEncode(email);
        return $"""
                <strong>Need help?</strong> Reply to this email or contact us at
                <a href="mailto:{safe}" style="color:#0284c7;text-decoration:underline;">{safe}</a>.
                """;
    }

    private static string BuildSupportFooterPlain(string? supportEmail)
    {
        var email = supportEmail?.Trim();
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return "Need help? Visit our website and use the contact form.";
        }

        return $"Need help? Contact us at {email}.";
    }
}
