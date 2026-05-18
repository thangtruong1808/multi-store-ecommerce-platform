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

    public async Task SendPasswordResetEmailAsync(
        string toEmail,
        string resetUrl,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var sender = _options.SenderAddress.Trim();
        if (string.IsNullOrWhiteSpace(sender))
        {
            throw new InvalidOperationException("ACS_EMAIL_SENDER_ADDRESS is not configured.");
        }

        var client = new EmailClient(_options.ConnectionString);
        var subject = "Reset your password";
        var plainText = $"""
                         You requested a password reset.

                         Open this link to choose a new password (expires in {_options.PasswordResetTokenMinutes} minutes):
                         {resetUrl}

                         If you did not request this, you can ignore this email.
                         """;
        var html = $"""
                    <p>You requested a password reset.</p>
                    <p><a href="{resetUrl}">Reset your password</a></p>
                    <p>This link expires in {_options.PasswordResetTokenMinutes} minutes.</p>
                    <p>If you did not request this, you can ignore this email.</p>
                    """;

        var message = new EmailMessage(
            senderAddress: sender,
            content: new EmailContent(subject)
            {
                PlainText = plainText,
                Html = html
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
            _logger.LogError(ex, "ACS email send failed for password reset to {Email}", toEmail);
            throw;
        }
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
