namespace backend.Auth;

public sealed class AzureCommunicationEmailOptions
{
    public bool Enabled { get; set; }

    public string ConnectionString { get; set; } = string.Empty;

    public string SenderAddress { get; set; } = string.Empty;

    public int PasswordResetTokenMinutes { get; set; } = 30;

    /// <summary>Inbox for contact form submissions and support line in customer emails.</summary>
    public string ContactFormToEmail { get; set; } = string.Empty;

    /// <summary>Public SPA origin for links in emails (no trailing slash).</summary>
    public string PublicAppBaseUrl { get; set; } = string.Empty;
}
