using FluentAssertions;

namespace backend.UnitTests.Unit.Users;

public class BcryptPasswordTests
{
    [Fact]
    public void Hash_and_verify_roundtrip_succeeds()
    {
        const string password = "SecurePass123!";
        var hash = BCrypt.Net.BCrypt.HashPassword(password);

        hash.Should().NotBeNullOrWhiteSpace();
        BCrypt.Net.BCrypt.Verify(password, hash).Should().BeTrue();
        BCrypt.Net.BCrypt.Verify("wrong-password", hash).Should().BeFalse();
    }
}
