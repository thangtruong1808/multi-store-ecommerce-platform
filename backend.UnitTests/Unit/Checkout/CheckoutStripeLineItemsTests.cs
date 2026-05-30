using backend.Checkout;
using FluentAssertions;

namespace backend.UnitTests.Unit.Checkout;

public class CheckoutStripeLineItemsTests
{
    [Fact]
    public void Build_empty_lines_returns_empty_list()
    {
        var result = CheckoutStripeLineItems.Build([], 10m);
        result.Should().BeEmpty();
    }

    [Fact]
    public void Build_single_line_allocates_full_grand_total()
    {
        var productId = Guid.NewGuid();
        var lines = new List<ValidatedCheckoutLine>
        {
            new(productId, "SKU-1", "Widget", 19.99m, 2),
        };

        var items = CheckoutStripeLineItems.Build(lines, 39.98m);
        items.Should().HaveCount(1);
        items[0].Quantity.Should().Be(2);
        items[0].PriceData!.UnitAmount.Should().BeGreaterThan(0);
        items[0].PriceData!.Currency.Should().Be("aud");

        var lineTotalCents = items[0].PriceData!.UnitAmount!.Value * items[0].Quantity!.Value;
        lineTotalCents.Should().Be(3998);
    }

    [Fact]
    public void Build_multiple_lines_sum_matches_grand_total_cents()
    {
        var lines = new List<ValidatedCheckoutLine>
        {
            new(Guid.NewGuid(), "A", "Item A", 10m, 1),
            new(Guid.NewGuid(), "B", "Item B", 5.50m, 2),
            new(Guid.NewGuid(), "C", "Item C", 0.01m, 1),
        };
        const decimal grandTotal = 21.01m;

        var items = CheckoutStripeLineItems.Build(lines, grandTotal);
        items.Should().HaveCount(3);

        var totalCents = items.Sum(i => i.PriceData!.UnitAmount!.Value * i.Quantity!.Value);
        totalCents.Should().Be(2101);
    }

    [Fact]
    public void Build_sub_cent_grand_total_uses_minimum_one_cent()
    {
        var lines = new List<ValidatedCheckoutLine>
        {
            new(Guid.NewGuid(), "X", "Tiny", 0.001m, 1),
        };

        var items = CheckoutStripeLineItems.Build(lines, 0.001m);
        items.Should().HaveCount(1);
        (items[0].PriceData!.UnitAmount!.Value * items[0].Quantity!.Value).Should().BeGreaterThanOrEqualTo(1);
    }
}
