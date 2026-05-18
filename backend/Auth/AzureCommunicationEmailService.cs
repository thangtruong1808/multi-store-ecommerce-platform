using System.Net;
using Azure;
using Azure.Communication.Email;
using Microsoft.Extensions.Options;

namespace backend.Auth;

public sealed class AzureCommunicationEmailService
{
    private readonly AzureCommunicationEmailOptions _options;
    private readonly ILogger<AzureCommunicationEmailService> _logger;

    public AzureCommunicationEmailService(
        IOptions<AzureCommunicationEmailOptions> options,
        ILogger<AzureCommunicationEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsEnabled => _options.Enabled;

    private string? SupportEmail =>
        string.IsNullOrWhiteSpace(_options.ContactFormToEmail) ? null : _options.ContactFormToEmail.Trim();

    public async Task SendPasswordResetEmailAsync(
        string toEmail,
        string resetUrl,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var sender = RequireSenderAddress();
        var subject = "Reset your password";
        var safeUrl = WebUtility.HtmlEncode(resetUrl);
        var minutes = _options.PasswordResetTokenMinutes;

        var bodyHtml = $"""
                        <p style="margin:0 0 12px;">Hi,</p>
                        <p style="margin:0 0 12px;">You requested a password reset for your {WebUtility.HtmlEncode(TransactionalEmailTemplate.BrandShortName)} account.</p>
                        <p style="margin:0 0 12px;">Use the button below to choose a new password. This link expires in <strong>{minutes} minutes</strong>.</p>
                        {TransactionalEmailTemplate.BuildPrimaryButtonHtml(resetUrl, "Reset your password")}
                        <p style="margin:16px 0 0;font-size:13px;color:#64748b;">
                          If the button does not work, copy and paste this link into your browser:<br />
                          <a href="{safeUrl}" style="color:#0284c7;word-break:break-all;">{safeUrl}</a>
                        </p>
                        <p style="margin:16px 0 0;font-size:13px;color:#64748b;">If you did not request this, you can safely ignore this email.</p>
                        """;

        var plainText = $"""
                         You requested a password reset.

                         Open this link to choose a new password (expires in {minutes} minutes):
                         {resetUrl}

                         If you did not request this, you can ignore this email.
                         """;

        await SendAsync(
            sender,
            toEmail,
            subject,
            TransactionalEmailTemplate.BuildPlainDocument(plainText, SupportEmail),
            TransactionalEmailTemplate.BuildHtmlDocument(subject, bodyHtml, SupportEmail),
            cancellationToken);
    }

    public async Task SendContactFormEmailAsync(
        string senderName,
        string senderEmail,
        string? phone,
        string subject,
        string message,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var toEmail = _options.ContactFormToEmail.Trim();
        if (string.IsNullOrWhiteSpace(toEmail) || !toEmail.Contains('@'))
        {
            throw new InvalidOperationException("CONTACT_FORM_TO_EMAIL is not configured.");
        }

        var sender = RequireSenderAddress();
        var phoneLine = string.IsNullOrWhiteSpace(phone) ? "(not provided)" : phone.Trim();
        var emailSubject = $"[Contact] {subject.Trim()}";

        var safeName = WebUtility.HtmlEncode(senderName.Trim());
        var safeEmail = WebUtility.HtmlEncode(senderEmail.Trim());
        var safePhone = WebUtility.HtmlEncode(phoneLine);
        var safeSubject = WebUtility.HtmlEncode(subject.Trim());
        var safeMessage = WebUtility.HtmlEncode(message.Trim()).Replace("\n", "<br />", StringComparison.Ordinal);

        var bodyHtml = $"""
                        <p style="margin:0 0 16px;"><strong>New contact form message</strong></p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;color:#334155;">
                          <tr><td style="padding:6px 0;"><strong>Name:</strong></td><td style="padding:6px 0;">{safeName}</td></tr>
                          <tr><td style="padding:6px 0;"><strong>Email:</strong></td><td style="padding:6px 0;"><a href="mailto:{safeEmail}" style="color:#0284c7;">{safeEmail}</a></td></tr>
                          <tr><td style="padding:6px 0;"><strong>Phone:</strong></td><td style="padding:6px 0;">{safePhone}</td></tr>
                          <tr><td style="padding:6px 0;"><strong>Subject:</strong></td><td style="padding:6px 0;">{safeSubject}</td></tr>
                        </table>
                        <p style="margin:16px 0 8px;font-weight:600;">Message</p>
                        <p style="margin:0;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;line-height:1.6;">{safeMessage}</p>
                        """;

        var plainText = $"""
                         New contact form message

                         Name: {senderName.Trim()}
                         Email: {senderEmail.Trim()}
                         Phone: {phoneLine}
                         Subject: {subject.Trim()}

                         Message:
                         {message.Trim()}
                         """;

        await SendAsync(
            sender,
            toEmail,
            emailSubject,
            TransactionalEmailTemplate.BuildPlainDocument(plainText, SupportEmail),
            TransactionalEmailTemplate.BuildHtmlDocument("Contact form", bodyHtml, SupportEmail),
            cancellationToken);
    }

    public async Task SendOrderConfirmationEmailAsync(
        OrderConfirmationEmailData order,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var sender = RequireSenderAddress();
        var toEmail = order.CustomerEmail.Trim();
        if (string.IsNullOrWhiteSpace(toEmail) || !toEmail.Contains('@'))
        {
            throw new InvalidOperationException("Order customer email is missing.");
        }

        var subject = $"Order confirmed — {order.OrderNumber}";
        var greetingName = string.IsNullOrWhiteSpace(order.CustomerName) ? "there" : WebUtility.HtmlEncode(order.CustomerName.Trim());
        var grandTotal = TransactionalEmailTemplate.FormatMoney(order.GrandTotal, order.CurrencyCode);
        var itemRows = order.Items
            .Select(static i => (i.ProductName, i.Quantity, i.LineTotal))
            .ToList();
        var itemsTable = TransactionalEmailTemplate.BuildOrderItemsTableHtml(itemRows, order.CurrencyCode);

        var orderUrl = BuildOrderDetailUrl(order.OrderId);
        var orderLinkBlock = string.IsNullOrEmpty(orderUrl)
            ? string.Empty
            : TransactionalEmailTemplate.BuildPrimaryButtonHtml(orderUrl, "View your order");

        var bodyHtml = $"""
                        <p style="margin:0 0 12px;">Hi {greetingName},</p>
                        <p style="margin:0 0 12px;">Thank you for your purchase. Your payment was successful and we are preparing your order.</p>
                        <p style="margin:0 0 8px;padding:14px 16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;">
                          <strong style="color:#0c4a6e;">Order {WebUtility.HtmlEncode(order.OrderNumber)}</strong><br />
                          <span style="font-size:14px;color:#0369a1;">Total paid: {WebUtility.HtmlEncode(grandTotal)}</span>
                        </p>
                        {itemsTable}
                        {orderLinkBlock}
                        <p style="margin:16px 0 0;font-size:13px;color:#64748b;">You can also find this order in your account order history.</p>
                        """;

        var plainItems = new System.Text.StringBuilder();
        foreach (var item in order.Items)
        {
            var line = TransactionalEmailTemplate.FormatMoney(item.LineTotal, order.CurrencyCode);
            plainItems.AppendLine($"  - {item.ProductName} ×{item.Quantity} — {line}");
        }

        var plainText = $"""
                         Thank you for your purchase.

                         Order: {order.OrderNumber}
                         Total paid: {grandTotal}

                         Items:
                         {plainItems}
                         {(string.IsNullOrEmpty(orderUrl) ? string.Empty : $"View order: {orderUrl}")}
                         """;

        await SendAsync(
            sender,
            toEmail,
            subject,
            TransactionalEmailTemplate.BuildPlainDocument(plainText, SupportEmail),
            TransactionalEmailTemplate.BuildHtmlDocument("Order confirmation", bodyHtml, SupportEmail),
            cancellationToken);
    }

    private string? BuildOrderDetailUrl(Guid orderId)
    {
        var baseUrl = _options.PublicAppBaseUrl.Trim().TrimEnd('/');
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            return null;
        }

        return $"{baseUrl}/orders/{orderId:D}";
    }

    private async Task SendAsync(
        string sender,
        string toEmail,
        string subject,
        string plainText,
        string html,
        CancellationToken cancellationToken)
    {
        var client = new EmailClient(_options.ConnectionString);
        var message = new EmailMessage(
            senderAddress: sender,
            content: new EmailContent(subject)
            {
                PlainText = plainText,
                Html = html,
            },
            recipients: new EmailRecipients([new EmailAddress(toEmail)]));

        try
        {
            var operation = await client.SendAsync(WaitUntil.Completed, message, cancellationToken);
            if (operation.HasCompleted && operation.HasValue && operation.Value.Status != EmailSendStatus.Succeeded)
            {
                throw new InvalidOperationException($"Email send status: {operation.Value.Status}");
            }
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "ACS email send failed for {Subject} to {Email}", subject, toEmail);
            throw;
        }
    }

    private string RequireSenderAddress()
    {
        var sender = _options.SenderAddress.Trim();
        if (string.IsNullOrWhiteSpace(sender))
        {
            throw new InvalidOperationException("ACS_EMAIL_SENDER_ADDRESS is not configured.");
        }

        return sender;
    }

    private void EnsureEnabled()
    {
        if (!_options.Enabled)
        {
            throw new InvalidOperationException(
                "Azure Communication Services Email is not configured. Set ACS_EMAIL_ENABLED=true and required ACS variables.");
        }

        if (string.IsNullOrWhiteSpace(_options.ConnectionString))
        {
            throw new InvalidOperationException("ACS_EMAIL_CONNECTION_STRING is not configured.");
        }
    }
}

public sealed record OrderConfirmationEmailData(
    Guid OrderId,
    string CustomerEmail,
    string CustomerName,
    string OrderNumber,
    decimal GrandTotal,
    string CurrencyCode,
    IReadOnlyList<OrderConfirmationLineItem> Items);

public sealed record OrderConfirmationLineItem(string ProductName, int Quantity, decimal LineTotal);
