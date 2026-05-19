using backend.Checkout;
using Npgsql;

namespace backend.Vouchers;

internal static class VoucherValidation
{
    private static readonly TimeSpan UtcSkew = TimeSpan.FromMinutes(1);

    public static async Task<CheckoutPricingResult> BuildCheckoutPricingAsync(
        NpgsqlConnection conn,
        Guid storeId,
        IReadOnlyList<ValidatedCheckoutLine> lines,
        string? voucherCode,
        CancellationToken ct)
    {
        var subtotal = CheckoutStoreAndPricing.SumSubtotal(lines);
        var messages = new List<string>();
        var suggested = await GetSuggestedVouchersAsync(conn, storeId, lines, ct);
        var crossStore = await GetCrossStoreWarningsAsync(conn, storeId, lines, ct);

        if (string.IsNullOrWhiteSpace(voucherCode))
        {
            return new CheckoutPricingResult(
                subtotal,
                0m,
                subtotal,
                null,
                messages,
                suggested,
                crossStore);
        }

        var apply = await TryApplyVoucherAsync(conn, storeId, lines, voucherCode.Trim(), ct);
        if (!apply.Success)
        {
            messages.Add(apply.ErrorMessage ?? "Voucher could not be applied.");
            return new CheckoutPricingResult(
                subtotal,
                0m,
                subtotal,
                apply,
                messages,
                suggested,
                crossStore);
        }

        var discount = apply.DiscountTotal;
        var grand = Math.Max(0m, RoundMoney(subtotal - discount));
        return new CheckoutPricingResult(
            subtotal,
            discount,
            grand,
            apply,
            messages,
            suggested,
            crossStore);
    }

    public static async Task<VoucherApplyResult> TryApplyVoucherAsync(
        NpgsqlConnection conn,
        Guid storeId,
        IReadOnlyList<ValidatedCheckoutLine> lines,
        string voucherCode,
        CancellationToken ct)
    {
        if (!await VoucherPersistence.HasVouchersTableAsync(conn))
        {
            return Fail("Vouchers are not available.");
        }

        var voucher = await VoucherPersistence.GetVoucherByCodeAsync(conn, voucherCode, ct);
        if (voucher is null)
        {
            return Fail("Voucher code not found.");
        }

        var now = DateTimeOffset.UtcNow;
        if (!voucher.IsActive)
        {
            return Fail("This voucher is no longer active.");
        }

        if (voucher.StartsAt is { } starts && starts > now.Add(UtcSkew))
        {
            return Fail("This voucher is not active yet.");
        }

        if (voucher.ExpiresAt < now.Subtract(UtcSkew))
        {
            return Fail("This voucher has expired.");
        }

        if (voucher.MaxRedemptions is int max && voucher.RedemptionCount >= max)
        {
            return Fail("This voucher has reached its usage limit.");
        }

        var storeIds = await VoucherPersistence.GetStoreIdsForVoucherAsync(conn, voucher.Id, null);
        if (storeIds.Count == 0 || !storeIds.Contains(storeId))
        {
            return Fail("This voucher does not apply at the selected store.");
        }

        var restrictedProductIds = await VoucherPersistence.GetProductIdsForVoucherAsync(conn, voucher.Id, null);
        var eligibleSubtotal = ComputeEligibleSubtotal(lines, restrictedProductIds);
        if (eligibleSubtotal <= 0)
        {
            return Fail("This voucher does not apply to any items in your cart.");
        }

        var orderSubtotal = CheckoutStoreAndPricing.SumSubtotal(lines);
        if (voucher.MinOrderAmount is decimal minOrder && orderSubtotal < minOrder)
        {
            return Fail($"Minimum order amount is {minOrder:F2} AUD.");
        }

        var discount = ComputeDiscount(voucher.DiscountType, voucher.DiscountValue, eligibleSubtotal);
        if (discount <= 0)
        {
            return Fail("This voucher does not reduce your order total.");
        }

        return new VoucherApplyResult(
            true,
            null,
            voucher.Id,
            voucher.Code,
            FormatLabel(voucher.DiscountType, voucher.DiscountValue),
            discount);
    }

    public static async Task<IReadOnlyList<ProductVoucherHintDto>> GetProductVoucherHintsAsync(
        NpgsqlConnection conn,
        Guid productId,
        CancellationToken ct)
    {
        if (!await VoucherPersistence.HasVouchersTableAsync(conn))
        {
            return Array.Empty<ProductVoucherHintDto>();
        }

        var now = DateTimeOffset.UtcNow;
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT DISTINCT
                              v.id,
                              v.code,
                              v.discount_type,
                              v.discount_value::numeric,
                              s.id,
                              s.name
                          FROM app.vouchers v
                          INNER JOIN app.voucher_stores vs ON vs.voucher_id = v.id
                          INNER JOIN app.stores s ON s.id = vs.store_id AND s.is_active = TRUE
                          INNER JOIN app.store_products sp ON sp.store_id = vs.store_id AND sp.product_id = @pid AND sp.is_visible = TRUE
                          WHERE v.is_active = TRUE
                            AND v.expires_at >= @now
                            AND (v.starts_at IS NULL OR v.starts_at <= @now)
                            AND (
                                NOT EXISTS (SELECT 1 FROM app.voucher_products vp0 WHERE vp0.voucher_id = v.id)
                                OR EXISTS (SELECT 1 FROM app.voucher_products vp1 WHERE vp1.voucher_id = v.id AND vp1.product_id = @pid)
                            )
                            AND (v.max_redemptions IS NULL OR v.redemption_count < v.max_redemptions)
                          ORDER BY v.code, s.name;
                          """;
        cmd.Parameters.AddWithValue("pid", productId);
        cmd.Parameters.AddWithValue("now", now);

        var grouped = new Dictionary<string, (string Code, string Label, List<Guid> StoreIds, List<string> StoreNames)>(
            StringComparer.OrdinalIgnoreCase);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var code = reader.GetString(1);
            var discountType = reader.GetString(2);
            var discountValue = reader.GetDecimal(3);
            var storeId = reader.GetGuid(4);
            var storeName = reader.GetString(5);
            var label = FormatLabel(discountType, discountValue);

            if (!grouped.TryGetValue(code, out var entry))
            {
                entry = (code, label, new List<Guid>(), new List<string>());
                grouped[code] = entry;
            }

            if (!entry.StoreIds.Contains(storeId))
            {
                entry.StoreIds.Add(storeId);
                entry.StoreNames.Add(storeName);
            }
        }

        return grouped.Values
            .Select(static g => new ProductVoucherHintDto(g.Code, g.Label, g.StoreIds, g.StoreNames))
            .ToList();
    }

    public static async Task<IReadOnlyList<SuggestedVoucherDto>> GetSuggestedVouchersAsync(
        NpgsqlConnection conn,
        Guid storeId,
        IReadOnlyList<ValidatedCheckoutLine> lines,
        CancellationToken ct)
    {
        if (!await VoucherPersistence.HasVouchersTableAsync(conn) || lines.Count == 0)
        {
            return Array.Empty<SuggestedVoucherDto>();
        }

        var productIds = lines.Select(static l => l.ProductId).Distinct().ToArray();
        var now = DateTimeOffset.UtcNow;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT DISTINCT
                              v.code,
                              v.discount_type,
                              v.discount_value::numeric,
                              EXISTS (
                                  SELECT 1 FROM app.voucher_stores vs2
                                  WHERE vs2.voucher_id = v.id AND vs2.store_id = @store_id
                              ) AS applies_here
                          FROM app.vouchers v
                          WHERE v.is_active = TRUE
                            AND v.expires_at >= @now
                            AND (v.starts_at IS NULL OR v.starts_at <= @now)
                            AND (v.max_redemptions IS NULL OR v.redemption_count < v.max_redemptions)
                            AND EXISTS (
                                SELECT 1 FROM app.voucher_stores vs
                                WHERE vs.voucher_id = v.id
                            )
                            AND (
                                NOT EXISTS (SELECT 1 FROM app.voucher_products vp0 WHERE vp0.voucher_id = v.id)
                                OR EXISTS (
                                    SELECT 1 FROM app.voucher_products vp1
                                    WHERE vp1.voucher_id = v.id AND vp1.product_id = ANY(@product_ids)
                                )
                            )
                          ORDER BY v.code
                          LIMIT 8;
                          """;
        cmd.Parameters.AddWithValue("store_id", storeId);
        cmd.Parameters.AddWithValue("now", now);
        cmd.Parameters.Add(new NpgsqlParameter("product_ids", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Uuid)
        {
            Value = productIds,
        });

        var results = new List<SuggestedVoucherDto>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var code = reader.GetString(0);
            var discountType = reader.GetString(1);
            var discountValue = reader.GetDecimal(2);
            var appliesHere = reader.GetBoolean(3);
            results.Add(new SuggestedVoucherDto(code, FormatLabel(discountType, discountValue), appliesHere));
        }

        return results;
    }

    public static async Task<IReadOnlyList<CrossStoreVoucherWarningDto>> GetCrossStoreWarningsAsync(
        NpgsqlConnection conn,
        Guid selectedStoreId,
        IReadOnlyList<ValidatedCheckoutLine> lines,
        CancellationToken ct)
    {
        if (!await VoucherPersistence.HasVouchersTableAsync(conn) || lines.Count == 0)
        {
            return Array.Empty<CrossStoreVoucherWarningDto>();
        }

        var productIds = lines.Select(static l => l.ProductId).Distinct().ToArray();
        var now = DateTimeOffset.UtcNow;

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT DISTINCT
                              v.code,
                              v.discount_type,
                              v.discount_value::numeric,
                              s.name
                          FROM app.vouchers v
                          INNER JOIN app.voucher_stores vs ON vs.voucher_id = v.id
                          INNER JOIN app.stores s ON s.id = vs.store_id AND s.is_active = TRUE
                          WHERE v.is_active = TRUE
                            AND v.expires_at >= @now
                            AND (v.starts_at IS NULL OR v.starts_at <= @now)
                            AND (v.max_redemptions IS NULL OR v.redemption_count < v.max_redemptions)
                            AND vs.store_id <> @selected_store_id
                            AND (
                                NOT EXISTS (SELECT 1 FROM app.voucher_products vp0 WHERE vp0.voucher_id = v.id)
                                OR EXISTS (
                                    SELECT 1 FROM app.voucher_products vp1
                                    WHERE vp1.voucher_id = v.id AND vp1.product_id = ANY(@product_ids)
                                )
                            )
                            AND NOT EXISTS (
                                SELECT 1 FROM app.voucher_stores vs_sel
                                WHERE vs_sel.voucher_id = v.id AND vs_sel.store_id = @selected_store_id
                            )
                          ORDER BY v.code, s.name;
                          """;
        cmd.Parameters.AddWithValue("selected_store_id", selectedStoreId);
        cmd.Parameters.AddWithValue("now", now);
        cmd.Parameters.Add(new NpgsqlParameter("product_ids", NpgsqlTypes.NpgsqlDbType.Array | NpgsqlTypes.NpgsqlDbType.Uuid)
        {
            Value = productIds,
        });

        var grouped = new Dictionary<string, (string Code, string Label, List<string> StoreNames)>(
            StringComparer.OrdinalIgnoreCase);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var code = reader.GetString(0);
            var discountType = reader.GetString(1);
            var discountValue = reader.GetDecimal(2);
            var storeName = reader.GetString(3);
            var label = FormatLabel(discountType, discountValue);

            if (!grouped.TryGetValue(code, out var entry))
            {
                entry = (code, label, new List<string>());
                grouped[code] = entry;
            }

            if (!entry.StoreNames.Contains(storeName))
            {
                entry.StoreNames.Add(storeName);
            }
        }

        return grouped.Values
            .Select(static g => new CrossStoreVoucherWarningDto(g.Code, g.Label, g.StoreNames))
            .ToList();
    }

    private static decimal ComputeEligibleSubtotal(
        IReadOnlyList<ValidatedCheckoutLine> lines,
        IReadOnlyList<Guid> restrictedProductIds)
    {
        if (restrictedProductIds.Count == 0)
        {
            return CheckoutStoreAndPricing.SumSubtotal(lines);
        }

        var set = restrictedProductIds.ToHashSet();
        return RoundMoney(lines
            .Where(l => set.Contains(l.ProductId))
            .Sum(l => l.UnitPrice * l.Quantity));
    }

    private static decimal ComputeDiscount(string discountType, decimal discountValue, decimal eligibleSubtotal)
    {
        if (string.Equals(discountType, "percent", StringComparison.OrdinalIgnoreCase))
        {
            var pct = Math.Clamp(discountValue, 0m, 100m);
            return RoundMoney(eligibleSubtotal * pct / 100m);
        }

        return RoundMoney(Math.Min(discountValue, eligibleSubtotal));
    }

    public static string FormatLabel(string discountType, decimal discountValue) =>
        string.Equals(discountType, "percent", StringComparison.OrdinalIgnoreCase)
            ? $"{discountValue:0.##}% off"
            : $"A${discountValue:F2} off";

    public static string DeriveStatus(VoucherRow voucher, DateTimeOffset now)
    {
        if (!voucher.IsActive)
        {
            return "Inactive";
        }

        if (voucher.ExpiresAt < now)
        {
            return "Expired";
        }

        if (voucher.StartsAt is { } starts && starts > now)
        {
            return "Scheduled";
        }

        if (voucher.MaxRedemptions is int max && voucher.RedemptionCount >= max)
        {
            return "Exhausted";
        }

        return "Active";
    }

    private static VoucherApplyResult Fail(string message) =>
        new(false, message, null, null, null, 0m);

    private static decimal RoundMoney(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
