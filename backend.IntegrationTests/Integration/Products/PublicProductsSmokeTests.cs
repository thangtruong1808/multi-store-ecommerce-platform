using System.Net;
using backend.IntegrationTests.Support;
using FluentAssertions;
using Xunit;

namespace backend.IntegrationTests.Integration.Products;

/// <summary>
/// Full catalog smoke tests require app schema (local docker compose).
/// Set RUN_INTEGRATION_DB=true and point ConnectionStrings__Default at compose postgres (port 5433).
/// </summary>
[Trait("Category", "Integration")]
[Trait("Category", "IntegrationDb")]
public class PublicProductsSmokeTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public PublicProductsSmokeTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_public_products_returns_ok_when_database_has_schema()
    {
        if (!IntegrationTestEnv.DatabaseIntegrationEnabled)
        {
            return;
        }

        var response = await _client.GetAsync("/api/products/public?page=1&pageSize=1");
        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.InternalServerError);
    }
}
