using Stripe.Checkout;

namespace backend.Checkout;

/// <summary>Builds Stripe Checkout line items whose total matches order grand_total (Stripe rejects negative unit amounts).</summary>
internal static class CheckoutStripeLineItems
{
    public static List<SessionLineItemOptions> Build(
        IReadOnlyList<ValidatedCheckoutLine> lines,
        decimal grandTotal)
    {
        var result = new List<SessionLineItemOptions>();
        if (lines.Count == 0)
        {
            return result;
        }

        var targetCents = ToAudCents(grandTotal);
        if (targetCents < 1)
        {
            targetCents = 1;
        }

        var lineWeights = lines.Select(static l => Math.Max(1L, ToAudCents(l.UnitPrice * l.Quantity))).ToArray();
        var weightSum = lineWeights.Sum();
        var allocatedCents = new long[lines.Count];
        long assigned = 0;

        for (var i = 0; i < lines.Count; i++)
        {
            if (i == lines.Count - 1)
            {
                allocatedCents[i] = targetCents - assigned;
            }
            else
            {
                allocatedCents[i] = (long)Math.Round(
                    (decimal)targetCents * lineWeights[i] / weightSum,
                    0,
                    MidpointRounding.AwayFromZero);
                assigned += allocatedCents[i];
            }
        }

        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            var lineTotalCents = Math.Max(allocatedCents[i], line.Quantity);
            var unitCents = lineTotalCents / line.Quantity;
            if (unitCents < 1)
            {
                unitCents = 1;
            }

            result.Add(new SessionLineItemOptions
            {
                Quantity = line.Quantity,
                PriceData = new SessionLineItemPriceDataOptions
                {
                    Currency = "aud",
                    UnitAmount = unitCents,
                    ProductData = new SessionLineItemPriceDataProductDataOptions
                    {
                        Name = line.Name,
                        Metadata = new Dictionary<string, string> { ["sku"] = line.Sku },
                    },
                },
            });
        }

        return result;
    }

    private static long ToAudCents(decimal aud) =>
        (long)Math.Round(aud * 100m, 0, MidpointRounding.AwayFromZero);
}
