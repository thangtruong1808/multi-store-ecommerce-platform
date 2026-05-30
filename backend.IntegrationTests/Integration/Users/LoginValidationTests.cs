using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.IntegrationTests.Support;
using FluentAssertions;
using Xunit;

namespace backend.IntegrationTests.Integration.Users;

[Trait("Category", "Integration")]
public class LoginValidationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public LoginValidationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_empty_email_returns_400_with_field_error()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "",
            password = "password123",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("errors").GetProperty("email").GetString().Should().Be("Email is required.");
    }

    [Fact]
    public async Task Login_short_password_returns_400_with_field_error()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "user@example.com",
            password = "short",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("errors").GetProperty("password").GetString()
            .Should().Be("Password must be at least 8 characters.");
    }
}
