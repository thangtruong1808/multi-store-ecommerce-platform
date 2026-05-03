using Npgsql;

namespace backend.Checkout;

internal static class CheckoutStoreAndPricing
{
    /// <summary>Active stores that can fulfil every cart line with sufficient stock.</summary>
    public static async Task<IReadOnlyList<EligibleStoreOption>> ListEligibleStoresAsync(
        NpgsqlConnection conn,
        IReadOnlyList<CheckoutSessionLineRequest> items,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            return Array.Empty<EligibleStoreOption>();
        }

        foreach (var item in items)
        {
            if (item.Quantity < 1 || item.Quantity > 999_999)
            {
                return Array.Empty<EligibleStoreOption>();
            }
        }

        await using var storesCmd = conn.CreateCommand();
        storesCmd.CommandText = """
                                SELECT id, name
                                FROM app.stores
                                WHERE is_active = TRUE
                                ORDER BY name;
                                """;
        var storeRows = new List<(Guid Id, string Name)>();
        await using (var r = await storesCmd.ExecuteReaderAsync(cancellationToken))
        {
            while (await r.ReadAsync(cancellationToken))
            {
                storeRows.Add((r.GetGuid(0), r.GetString(1)));
            }
        }

        var eligible = new List<EligibleStoreOption>();
        foreach (var (sid, name) in storeRows)
        {
            var lines = await TryBuildLinesForStoreAsync(conn, sid, items, cancellationToken);
            if (lines is not null)
            {
                eligible.Add(new EligibleStoreOption(sid, name));
            }
        }

        return eligible;
    }

    public static async Task<List<ValidatedCheckoutLine>?> TryBuildLinesForStoreAsync(
        NpgsqlConnection conn,
        Guid storeId,
        IReadOnlyList<CheckoutSessionLineRequest> items,
        CancellationToken cancellationToken)
    {
        var lines = new List<ValidatedCheckoutLine>();
        foreach (var item in items)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                              SELECT
                                  p.sku,
                                  p.name,
                                  p.base_price::numeric,
                                  sp.custom_price::numeric,
                                  COALESCE(s.quantity, 0)::int
                              FROM app.products p
                              INNER JOIN app.store_products sp
                                  ON sp.product_id = p.id AND sp.store_id = @sid
                              INNER JOIN app.stock s
                                  ON s.store_id = sp.store_id AND s.product_id = p.id
                              WHERE p.id = @pid
                                AND lower(p.status) = 'active'
                                AND sp.is_visible = TRUE;
                              """;
            cmd.Parameters.AddWithValue("sid", storeId);
            cmd.Parameters.AddWithValue("pid", item.ProductId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            var sku = reader.GetString(0);
            var name = reader.GetString(1);
            var basePrice = reader.GetDecimal(2);
            var customPrice = reader.IsDBNull(3) ? (decimal?)null : reader.GetDecimal(3);
            var stockQty = reader.GetInt32(4);
            if (stockQty < item.Quantity)
            {
                return null;
            }

            var unit = customPrice ?? basePrice;
            lines.Add(new ValidatedCheckoutLine(item.ProductId, sku, name, unit, item.Quantity));
        }

        return lines;
    }

    public static decimal SumSubtotal(IReadOnlyList<ValidatedCheckoutLine> lines)
    {
        decimal sum = 0;
        foreach (var line in lines)
        {
            sum += line.UnitPrice * line.Quantity;
        }

        return Math.Round(sum, 2, MidpointRounding.AwayFromZero);
    }

    public static string FormatOrderNumber()
    {
        var n = Guid.NewGuid().ToString("N");
        return $"ORD-{n[..8].ToUpperInvariant()}-{n[8..16].ToUpperInvariant()}";
    }
}
