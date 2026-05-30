using backend.Products;
using FluentAssertions;

namespace backend.UnitTests.Unit.Products;

public class ProductMediaKeyRulesTests
{
    private static readonly Guid UserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid ProductId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public void BuildStagingKey_is_under_products_staging_for_user()
    {
        var key = ProductMediaKeyRules.BuildStagingKey(UserId);
        ProductMediaKeyRules.IsUnderProductsPrefix(key).Should().BeTrue();
        ProductMediaKeyRules.IsStagingKeyForUser(key, UserId).Should().BeTrue();
        ProductMediaKeyRules.IsValidKeyFormat(key).Should().BeTrue();
    }

    [Fact]
    public void CanUseOnUpsert_allows_staging_key_on_create()
    {
        var key = ProductMediaKeyRules.BuildStagingKey(UserId);
        ProductMediaKeyRules.CanUseOnUpsert(key, UserId, null, isCreate: true).Should().BeTrue();
    }

    [Fact]
    public void CanUseOnUpsert_rejects_product_key_on_create()
    {
        var key = ProductMediaKeyRules.BuildProductKey(ProductId);
        ProductMediaKeyRules.CanUseOnUpsert(key, UserId, ProductId, isCreate: true).Should().BeFalse();
    }

    [Fact]
    public void CanUseOnUpsert_allows_product_key_on_update()
    {
        var key = ProductMediaKeyRules.BuildProductKey(ProductId);
        ProductMediaKeyRules.CanUseOnUpsert(key, UserId, ProductId, isCreate: false).Should().BeTrue();
    }

    [Fact]
    public void ValidateKeysForUpsert_returns_error_for_invalid_key()
    {
        var result = ProductMediaKeyRules.ValidateKeysForUpsert(
            ["not-a-valid-key"],
            UserId,
            ProductId,
            isCreate: true,
            out var error);

        result.Should().BeEmpty();
        error.Should().NotBeNullOrWhiteSpace();
    }
}
