using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.IntegrationTests.Support;
using FluentAssertions;
using Xunit;

namespace backend.IntegrationTests.Integration.Users;

[Trait("Category", "Integration")]
public class RegisterValidationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public RegisterValidationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_missing_firstName_returns_400_with_field_error()
    {
        var response = await PostRegisterAsync(new
        {
            firstName = "",
            lastName = "Doe",
            email = "new.user@example.com",
            password = "password123",
        });

        await AssertValidationErrorAsync(response, "firstName");
    }

    [Fact]
    public async Task Register_short_password_returns_400_with_field_error()
    {
        var response = await PostRegisterAsync(new
        {
            firstName = "Jane",
            lastName = "Doe",
            email = "jane.doe@example.com",
            password = "short",
        });

        await AssertValidationErrorAsync(response, "password");
    }

    [Fact]
    public async Task Register_invalid_email_returns_400_with_field_error()
    {
        var response = await PostRegisterAsync(new
        {
            firstName = "Jane",
            lastName = "Doe",
            email = "not-an-email",
            password = "password123",
        });

        await AssertValidationErrorAsync(response, "email");
    }

    [Fact]
    public async Task Register_short_mobile_returns_400_with_field_error()
    {
        var response = await PostRegisterAsync(new
        {
            firstName = "Jane",
            lastName = "Doe",
            email = "mobile.test@example.com",
            password = "password123",
            mobile = "123",
        });

        await AssertValidationErrorAsync(response, "mobile");
    }

    private Task<HttpResponseMessage> PostRegisterAsync(object body) =>
        _client.PostAsJsonAsync("/api/auth/register", body);

    private static async Task AssertValidationErrorAsync(HttpResponseMessage response, string field)
    {
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        json.GetProperty("message").GetString().Should().Be("Validation failed.");
        json.GetProperty("errors").GetProperty(field).GetString().Should().NotBeNullOrWhiteSpace();
    }
}
