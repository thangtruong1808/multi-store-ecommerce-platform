using System.Net;
using System.Net.Http.Json;
using backend.IntegrationTests.Support;
using FluentAssertions;
using Xunit;

namespace backend.IntegrationTests.Integration.Users;

/// <summary>
/// Requires docker compose postgres with schema. Run with RUN_INTEGRATION_DB=true.
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "IntegrationDb")]
public class RegisterDuplicateEmailIntegrationDbTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public RegisterDuplicateEmailIntegrationDbTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_duplicate_email_returns_conflict()
    {
        if (!IntegrationTestEnv.DatabaseIntegrationEnabled)
        {
            return;
        }

        var email = $"dup.{Guid.NewGuid():N}@example.com";
        var body = new
        {
            firstName = "Dup",
            lastName = "User",
            email,
            password = "password123",
        };

        var first = await _client.PostAsJsonAsync("/api/auth/register", body);
        first.StatusCode.Should().Be(HttpStatusCode.OK);

        var second = await _client.PostAsJsonAsync("/api/auth/register", body);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
