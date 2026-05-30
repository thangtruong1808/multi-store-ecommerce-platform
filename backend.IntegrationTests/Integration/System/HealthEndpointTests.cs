using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.IntegrationTests.Support;
using FluentAssertions;
using Xunit;

namespace backend.IntegrationTests.Integration.System;

[Trait("Category", "Integration")]
public class HealthEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_health_returns_ok_when_database_reachable()
    {
        if (!IntegrationTestEnv.ShouldRunDatabaseHealthChecks())
        {
            return;
        }

        var response = await _client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().Should().Be("ok");
        body.GetProperty("database").GetString().Should().Be("ok");
    }

    [Fact]
    public async Task Get_health_returns_maintenance_when_flag_enabled()
    {
        await using var factory = new CustomWebApplicationFactory()
            .WithSetting("MAINTENANCE_MODE", "true");
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().Should().Be("maintenance");
        body.GetProperty("message").GetString().Should().Contain("maintenance");
    }

    [Fact]
    public async Task Get_health_returns_unavailable_when_database_unreachable()
    {
        await using var factory = new CustomWebApplicationFactory()
            .WithSetting(
                "ConnectionStrings__Default",
                "Host=10.255.255.1;Port=5432;Database=MULTIPLY;Username=postgres;Password=test;Timeout=2;Command Timeout=2");
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("status").GetString().Should().Be("unavailable");
    }
}
