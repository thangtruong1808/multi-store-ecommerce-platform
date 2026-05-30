using backend.Products;
using FluentAssertions;

namespace backend.UnitTests.Unit.Products;

public class AvatarMediaKeyRulesTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    [Fact]
    public void BuildUserAvatarKey_matches_user_and_format()
    {
        var key = AvatarMediaKeyRules.BuildUserAvatarKey(UserId);
        AvatarMediaKeyRules.IsAvatarKeyForUser(key, UserId).Should().BeTrue();
        AvatarMediaKeyRules.IsValidKeyFormat(key).Should().BeTrue();
    }

    [Fact]
    public void CanUseOnProfileUpdate_allows_null_or_empty()
    {
        AvatarMediaKeyRules.CanUseOnProfileUpdate(null, UserId).Should().BeTrue();
        AvatarMediaKeyRules.CanUseOnProfileUpdate("  ", UserId).Should().BeTrue();
    }

    [Fact]
    public void CanUseOnProfileUpdate_rejects_other_users_key()
    {
        var otherUser = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        var key = AvatarMediaKeyRules.BuildUserAvatarKey(otherUser);
        AvatarMediaKeyRules.CanUseOnProfileUpdate(key, UserId).Should().BeFalse();
    }
}
