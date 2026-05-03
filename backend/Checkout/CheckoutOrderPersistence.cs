using System.Globalization;
using Npgsql;

namespace backend.Checkout;

internal static class CheckoutOrderPersistence
{
    public sealed record UserDetails(string Email, string FullName);

    public static async Task<UserDetails?> GetUserDetailsAsync(NpgsqlConnection conn, Guid userId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT email, first_name, last_name
                          FROM app.users
                          WHERE id = @uid AND is_active = TRUE
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("uid", userId);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        var email = reader.GetString(0);
        var fn = reader.GetString(1);
        var ln = reader.GetString(2);
        return new UserDetails(email, $"{fn} {ln}".Trim());
    }

    public static async Task<Guid> InsertOrderAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid storeId,
        Guid userId,
        UserDetails user,
        IReadOnlyList<ValidatedCheckoutLine> lines,
        decimal subtotal,
        string? stripeSessionId,
        CancellationToken ct)
    {
        var orderId = Guid.NewGuid();
        var orderNumber = CheckoutStoreAndPricing.FormatOrderNumber();
        var grand = subtotal;

        await using (var cmd = conn.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = """
                              INSERT INTO app.orders (
                                  id,
                                  store_id,
                                  order_number,
                                  customer_id,
                                  customer_email,
                                  customer_full_name,
                                  subtotal,
                                  discount_total,
                                  tax_total,
                                  shipping_total,
                                  grand_total,
                                  currency_code,
                                  status,
                                  payment_status,
                                  payment_provider,
                                  stripe_checkout_session_id
                              )
                              VALUES (
                                  @id,
                                  @store_id,
                                  @order_number,
                                  @customer_id,
                                  @customer_email,
                                  @customer_full_name,
                                  @subtotal,
                                  0,
                                  0,
                                  0,
                                  @grand_total,
                                  'AUD',
                                  'created',
                                  'requires_payment_method',
                                  'stripe_test',
                                  @stripe_session_id
                              );
                              """;
            cmd.Parameters.AddWithValue("id", orderId);
            cmd.Parameters.AddWithValue("store_id", storeId);
            cmd.Parameters.AddWithValue("order_number", orderNumber);
            cmd.Parameters.AddWithValue("customer_id", userId);
            cmd.Parameters.AddWithValue("customer_email", user.Email);
            cmd.Parameters.AddWithValue("customer_full_name", user.FullName);
            cmd.Parameters.AddWithValue("subtotal", subtotal);
            cmd.Parameters.AddWithValue("grand_total", grand);
            cmd.Parameters.AddWithValue(
                "stripe_session_id",
                string.IsNullOrEmpty(stripeSessionId) ? DBNull.Value : stripeSessionId);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        foreach (var line in lines)
        {
            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                              INSERT INTO app.order_items (
                                  order_id,
                                  product_id,
                                  sku,
                                  product_name,
                                  quantity,
                                  unit_price,
                                  line_total
                              )
                              VALUES (
                                  @oid,
                                  @pid,
                                  @sku,
                                  @name,
                                  @qty,
                                  @unit,
                                  @line_total
                              );
                              """;
            cmd.Parameters.AddWithValue("oid", orderId);
            cmd.Parameters.AddWithValue("pid", line.ProductId);
            cmd.Parameters.AddWithValue("sku", line.Sku);
            cmd.Parameters.AddWithValue("name", line.Name);
            cmd.Parameters.AddWithValue("qty", line.Quantity);
            cmd.Parameters.AddWithValue("unit", line.UnitPrice);
            var lineTotal = Math.Round(line.UnitPrice * line.Quantity, 2, MidpointRounding.AwayFromZero);
            cmd.Parameters.AddWithValue("line_total", lineTotal);
            await cmd.ExecuteNonQueryAsync(ct);
        }

        return orderId;
    }

    public static async Task UpdateOrderStripeSessionAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid orderId,
        string sessionId,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          UPDATE app.orders
                          SET stripe_checkout_session_id = @sid,
                              updated_at = NOW()
                          WHERE id = @oid;
                          """;
        cmd.Parameters.AddWithValue("sid", sessionId);
        cmd.Parameters.AddWithValue("oid", orderId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public static async Task<bool> TryCompletePaidOrderAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid orderId,
        string stripeSessionId,
        string? paymentIntentId,
        CancellationToken ct)
    {
        await using var load = conn.CreateCommand();
        load.Transaction = tx;
        load.CommandText = """
                             SELECT o.id, o.store_id, o.payment_status::text
                             FROM app.orders o
                             WHERE o.id = @oid
                               AND o.stripe_checkout_session_id = @sid
                             LIMIT 1;
                             """;
        load.Parameters.AddWithValue("oid", orderId);
        load.Parameters.AddWithValue("sid", stripeSessionId);
        await using var reader = await load.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return false;
        }

        if (string.Equals(reader.GetString(2), "succeeded", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        await reader.CloseAsync();

        await using var upd = conn.CreateCommand();
        upd.Transaction = tx;
        upd.CommandText = """
                            UPDATE app.orders
                            SET payment_status = 'succeeded',
                                stripe_payment_intent_id = COALESCE(@pi, stripe_payment_intent_id),
                                status = 'paid',
                                updated_at = NOW()
                            WHERE id = @oid;
                            """;
        upd.Parameters.AddWithValue("oid", orderId);
        upd.Parameters.AddWithValue("pi", string.IsNullOrEmpty(paymentIntentId) ? DBNull.Value : paymentIntentId);
        var n = await upd.ExecuteNonQueryAsync(ct);
        return n > 0;
    }
}
