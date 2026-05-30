namespace backend.IntegrationTests.Support;

public static class IntegrationTestEnv
{
    public const string DefaultConnectionString =
        "Host=localhost;Port=5432;Database=MULTIPLY;Username=postgres;Password=test";

    public const string JwtSecret = "ci-test-secret-at-least-32-characters-long";

    /// <summary>When true, tests marked IntegrationDb may run (local docker compose).</summary>
    public static bool DatabaseIntegrationEnabled =>
        string.Equals(
            Environment.GetEnvironmentVariable("RUN_INTEGRATION_DB"),
            "true",
            StringComparison.OrdinalIgnoreCase);

    /// <summary>CI or explicit connection string — required for health-ok integration.</summary>
    public static bool ShouldRunDatabaseHealthChecks() =>
        string.Equals(Environment.GetEnvironmentVariable("CI"), "true", StringComparison.OrdinalIgnoreCase)
        || !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ConnectionStrings__Default"));

    public static void ApplyDefaults()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__Default", DefaultConnectionString);
        Environment.SetEnvironmentVariable("JWT_SECRET", JwtSecret);
        Environment.SetEnvironmentVariable("JWT_ISSUER", "multi-store");
        Environment.SetEnvironmentVariable("JWT_AUDIENCE", "multi-store");
        Environment.SetEnvironmentVariable("AZURE_STORAGE_ENABLED", "false");
        Environment.SetEnvironmentVariable("ACS_EMAIL_ENABLED", "false");
        Environment.SetEnvironmentVariable("MAINTENANCE_MODE", "false");
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
    }
}
