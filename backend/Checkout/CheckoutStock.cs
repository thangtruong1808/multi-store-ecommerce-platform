using Npgsql;

namespace backend.Checkout;

internal static class CheckoutStock
{
    public static async Task ApplyStockOutForOrderAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid orderId,
        Guid storeId,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          SELECT product_id, quantity
                          FROM app.order_items
                          WHERE order_id = @oid;
                          """;
        cmd.Parameters.AddWithValue("oid", orderId);
        var lines = new List<(Guid ProductId, int Qty)>();
        await using (var reader = await cmd.ExecuteReaderAsync(ct))
        {
            while (await reader.ReadAsync(ct))
            {
                lines.Add((reader.GetGuid(0), reader.GetInt32(1)));
            }
        }

        foreach (var (productId, qty) in lines)
        {
            var idempotencyKey = $"{orderId:N}{productId:N}";
            if (idempotencyKey.Length > 120)
            {
                idempotencyKey = idempotencyKey[..120];
            }

            await using (var seen = conn.CreateCommand())
            {
                seen.Transaction = tx;
                seen.CommandText = """
                                   SELECT 1
                                   FROM app.stock_history
                                   WHERE store_id = @sid
                                     AND idempotency_key = @idem
                                   LIMIT 1;
                                   """;
                seen.Parameters.AddWithValue("sid", storeId);
                seen.Parameters.AddWithValue("idem", idempotencyKey);
                var exists = await seen.ExecuteScalarAsync(ct);
                if (exists is not null)
                {
                    continue;
                }
            }

            await using var upd = conn.CreateCommand();
            upd.Transaction = tx;
            upd.CommandText = """
                              UPDATE app.stock
                              SET quantity = quantity - @qty,
                                  updated_at = NOW()
                              WHERE store_id = @sid
                                AND product_id = @pid
                                AND quantity >= @qty
                              RETURNING quantity;
                              """;
            upd.Parameters.AddWithValue("sid", storeId);
            upd.Parameters.AddWithValue("pid", productId);
            upd.Parameters.AddWithValue("qty", qty);
            var remainingObj = await upd.ExecuteScalarAsync(ct);
            if (remainingObj is null || remainingObj is DBNull)
            {
                await using var mark = conn.CreateCommand();
                mark.Transaction = tx;
                mark.CommandText = """
                                     UPDATE app.orders
                                     SET requires_manual_review = TRUE,
                                         updated_at = NOW()
                                     WHERE id = @oid;
                                     """;
                mark.Parameters.AddWithValue("oid", orderId);
                await mark.ExecuteNonQueryAsync(ct);
                return;
            }

            await using var hist = conn.CreateCommand();
            hist.Transaction = tx;
            hist.CommandText = """
                               INSERT INTO app.stock_history (
                                   store_id,
                                   product_id,
                                   event_type,
                                   qty_delta,
                                   reason,
                                   source_type,
                                   source_id,
                                   idempotency_key
                               )
                               VALUES (
                                   @sid,
                                   @pid,
                                   'stock_out'::app.stock_event_type,
                                   @delta,
                                   'stripe_checkout',
                                   'order',
                                   @oid,
                                   @idem
                               );
                               """;
            hist.Parameters.AddWithValue("sid", storeId);
            hist.Parameters.AddWithValue("pid", productId);
            hist.Parameters.AddWithValue("delta", -qty);
            hist.Parameters.AddWithValue("oid", orderId);
            hist.Parameters.AddWithValue("idem", idempotencyKey);
            await hist.ExecuteNonQueryAsync(ct);
        }
    }
}
