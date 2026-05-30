using backend.Products;
using FluentAssertions;

namespace backend.UnitTests.Unit.Categories;

public class CategoryMediaKeyRulesTests
{
    private static readonly Guid UserId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly Guid CategoryId = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");

    [Fact]
    public void Staging_key_valid_for_create()
    {
        var key = CategoryMediaKeyRules.BuildStagingKey(UserId);
        CategoryMediaKeyRules.CanUseOnUpsert(key, UserId, null, isCreate: true).Should().BeTrue();
    }

    [Fact]
    public void Category_key_valid_for_update_only()
    {
        var key = CategoryMediaKeyRules.BuildCategoryKey(CategoryId);
        CategoryMediaKeyRules.CanUseOnUpsert(key, UserId, CategoryId, isCreate: false).Should().BeTrue();
        CategoryMediaKeyRules.CanUseOnUpsert(key, UserId, CategoryId, isCreate: true).Should().BeFalse();
    }

    [Fact]
    public void TryValidateForLevel1Upsert_accepts_empty_image()
    {
        var ok = CategoryMediaKeyRules.TryValidateForLevel1Upsert(
            null,
            UserId,
            CategoryId,
            isCreate: true,
            out var normalized,
            out var error);

        ok.Should().BeTrue();
        normalized.Should().BeNull();
        error.Should().BeNull();
    }
}
