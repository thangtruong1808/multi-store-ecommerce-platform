namespace backend.Auth;

public sealed class AzureCommunicationEmailOptions
{
    public bool Enabled { get; set; }

    public string ConnectionString { get; set; } = string.Empty;

    public string SenderAddress { get; set; } = string.Empty;

    public int PasswordResetTokenMinutes { get; set; } = 30;
}
