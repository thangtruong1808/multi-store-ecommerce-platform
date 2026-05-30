using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace backend.IntegrationTests.Support;

public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly Dictionary<string, string?> _overrides = new(StringComparer.Ordinal);
    private string? _connectionStringOverride;

    public CustomWebApplicationFactory WithSetting(string key, string? value)
    {
        _overrides[key] = value;
        if (string.Equals(key, "ConnectionStrings__Default", StringComparison.Ordinal)
            || string.Equals(key, "ConnectionStrings:Default", StringComparison.Ordinal))
        {
            _connectionStringOverride = value;
        }

        return this;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        var settings = BuildSettings();
        foreach (var (key, value) in settings)
        {
            if (value != null)
            {
                builder.UseSetting(key, value);
            }
        }

        if (_connectionStringOverride != null)
        {
            var connectionString = _connectionStringOverride;
            builder.ConfigureTestServices(services =>
            {
                var descriptors = services.Where(d => d.ServiceType == typeof(NpgsqlDataSource)).ToList();
                foreach (var descriptor in descriptors)
                {
                    services.Remove(descriptor);
                }

                services.AddSingleton(_ => new NpgsqlDataSourceBuilder(connectionString).Build());
            });
        }
    }

    private Dictionary<string, string?> BuildSettings()
    {
        var settings = new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["ConnectionStrings:Default"] =
                Environment.GetEnvironmentVariable("ConnectionStrings__Default")
                ?? IntegrationTestEnv.DefaultConnectionString,
            ["JWT_SECRET"] = IntegrationTestEnv.JwtSecret,
            ["JWT_ISSUER"] = "multi-store",
            ["JWT_AUDIENCE"] = "multi-store",
            ["AZURE_STORAGE_ENABLED"] = "false",
            ["ACS_EMAIL_ENABLED"] = "false",
            ["MAINTENANCE_MODE"] = "false",
        };

        foreach (var (key, value) in _overrides)
        {
            var configKey = key.Contains(':', StringComparison.Ordinal)
                ? key
                : key.Replace("__", ":", StringComparison.Ordinal);
            settings[configKey] = value;
        }

        return settings;
    }
}
