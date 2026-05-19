using Npgsql;
using NpgsqlTypes;

namespace backend.Vouchers;

internal static class VoucherPersistence
{
    public static void AddNullableUuidParameter(NpgsqlCommand command, string name, Guid? value)
    {
        command.Parameters.Add(new NpgsqlParameter<Guid?>(name, NpgsqlDbType.Uuid) { TypedValue = value });
    }

    public static void AddNullableTextParameter(NpgsqlCommand command, string name, string? value)
    {
        command.Parameters.Add(new NpgsqlParameter<string?>(name, NpgsqlDbType.Text) { TypedValue = value });
    }

    public static async Task<bool> HasVouchersTableAsync(NpgsqlConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT to_regclass('app.vouchers') IS NOT NULL;";
        var result = await cmd.ExecuteScalarAsync();
        return result is bool flag && flag;
    }

    public static async Task<List<Guid>> GetStoreIdsForVoucherAsync(NpgsqlConnection conn, Guid voucherId, NpgsqlTransaction? tx = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          SELECT store_id
                          FROM app.voucher_stores
                          WHERE voucher_id = @vid
                          ORDER BY store_id;
                          """;
        cmd.Parameters.AddWithValue("vid", voucherId);
        await using var reader = await cmd.ExecuteReaderAsync();
        var ids = new List<Guid>();
        while (await reader.ReadAsync())
        {
            ids.Add(reader.GetGuid(0));
        }

        return ids;
    }

    public static async Task<List<Guid>> GetProductIdsForVoucherAsync(NpgsqlConnection conn, Guid voucherId, NpgsqlTransaction? tx = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          SELECT product_id
                          FROM app.voucher_products
                          WHERE voucher_id = @vid
                          ORDER BY product_id;
                          """;
        cmd.Parameters.AddWithValue("vid", voucherId);
        await using var reader = await cmd.ExecuteReaderAsync();
        var ids = new List<Guid>();
        while (await reader.ReadAsync())
        {
            ids.Add(reader.GetGuid(0));
        }

        return ids;
    }

    public static async Task ReplaceVoucherStoresAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid voucherId,
        IReadOnlyList<Guid> storeIds)
    {
        await using (var deleteCmd = conn.CreateCommand())
        {
            deleteCmd.Transaction = tx;
            deleteCmd.CommandText = "DELETE FROM app.voucher_stores WHERE voucher_id = @vid;";
            deleteCmd.Parameters.AddWithValue("vid", voucherId);
            await deleteCmd.ExecuteNonQueryAsync();
        }

        foreach (var storeId in storeIds.Distinct())
        {
            await using var insertCmd = conn.CreateCommand();
            insertCmd.Transaction = tx;
            insertCmd.CommandText = """
                                    INSERT INTO app.voucher_stores (voucher_id, store_id)
                                    VALUES (@vid, @sid);
                                    """;
            insertCmd.Parameters.AddWithValue("vid", voucherId);
            insertCmd.Parameters.AddWithValue("sid", storeId);
            await insertCmd.ExecuteNonQueryAsync();
        }
    }

    public static async Task ReplaceVoucherProductsAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid voucherId,
        IReadOnlyList<Guid> productIds)
    {
        await using (var deleteCmd = conn.CreateCommand())
        {
            deleteCmd.Transaction = tx;
            deleteCmd.CommandText = "DELETE FROM app.voucher_products WHERE voucher_id = @vid;";
            deleteCmd.Parameters.AddWithValue("vid", voucherId);
            await deleteCmd.ExecuteNonQueryAsync();
        }

        foreach (var productId in productIds.Distinct())
        {
            await using var insertCmd = conn.CreateCommand();
            insertCmd.Transaction = tx;
            insertCmd.CommandText = """
                                    INSERT INTO app.voucher_products (voucher_id, product_id)
                                    VALUES (@vid, @pid);
                                    """;
            insertCmd.Parameters.AddWithValue("vid", voucherId);
            insertCmd.Parameters.AddWithValue("pid", productId);
            await insertCmd.ExecuteNonQueryAsync();
        }
    }

    public static async Task<VoucherRow?> GetVoucherByCodeAsync(NpgsqlConnection conn, string code, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT
                              id,
                              code,
                              description,
                              discount_type,
                              discount_value::numeric,
                              starts_at,
                              expires_at,
                              is_active,
                              min_order_amount::numeric,
                              max_redemptions,
                              redemption_count,
                              created_at,
                              updated_at
                          FROM app.vouchers
                          WHERE lower(code) = lower(@code)
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("code", code.Trim());
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return ReadVoucherRow(reader);
    }

    public static async Task<VoucherRow?> GetVoucherByIdAsync(NpgsqlConnection conn, Guid id, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT
                              id,
                              code,
                              description,
                              discount_type,
                              discount_value::numeric,
                              starts_at,
                              expires_at,
                              is_active,
                              min_order_amount::numeric,
                              max_redemptions,
                              redemption_count,
                              created_at,
                              updated_at
                          FROM app.vouchers
                          WHERE id = @id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("id", id);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return null;
        }

        return ReadVoucherRow(reader);
    }

    public static async Task<bool> UserCanManageVoucherAsync(
        NpgsqlConnection conn,
        Guid voucherId,
        bool isAdmin,
        IReadOnlyList<Guid> managedStoreIds,
        CancellationToken ct)
    {
        if (isAdmin)
        {
            return true;
        }

        if (managedStoreIds.Count == 0)
        {
            return false;
        }

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT NOT EXISTS (
                              SELECT 1
                              FROM app.voucher_stores vs
                              WHERE vs.voucher_id = @vid
                                AND NOT (vs.store_id = ANY(@managed_ids))
                          );
                          """;
        cmd.Parameters.AddWithValue("vid", voucherId);
        cmd.Parameters.Add(new NpgsqlParameter("managed_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid)
        {
            Value = managedStoreIds.ToArray(),
        });
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is bool ok && ok;
    }

    public static async Task InsertOrderRedemptionAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid orderId,
        Guid voucherId,
        string code,
        decimal discountAmount,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          INSERT INTO app.order_voucher_redemptions (order_id, voucher_id, code, discount_amount)
                          VALUES (@oid, @vid, @code, @amount);
                          """;
        cmd.Parameters.AddWithValue("oid", orderId);
        cmd.Parameters.AddWithValue("vid", voucherId);
        cmd.Parameters.AddWithValue("code", code);
        cmd.Parameters.AddWithValue("amount", discountAmount);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public static async Task IncrementRedemptionCountAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid voucherId,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          UPDATE app.vouchers
                          SET redemption_count = redemption_count + 1,
                              updated_at = NOW()
                          WHERE id = @vid;
                          """;
        cmd.Parameters.AddWithValue("vid", voucherId);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public static async Task<Guid?> GetVoucherIdForOrderAsync(NpgsqlConnection conn, Guid orderId, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT voucher_id
                          FROM app.order_voucher_redemptions
                          WHERE order_id = @oid
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("oid", orderId);
        var raw = await cmd.ExecuteScalarAsync(ct);
        return raw is Guid g ? g : null;
    }

    private static VoucherRow ReadVoucherRow(NpgsqlDataReader reader)
    {
        return new VoucherRow(
            reader.GetGuid(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? null : reader.GetString(2),
            reader.GetString(3),
            reader.GetDecimal(4),
            reader.IsDBNull(5) ? null : reader.GetFieldValue<DateTimeOffset>(5),
            reader.GetFieldValue<DateTimeOffset>(6),
            reader.GetBoolean(7),
            reader.IsDBNull(8) ? null : reader.GetDecimal(8),
            reader.IsDBNull(9) ? null : reader.GetInt32(9),
            reader.GetInt32(10),
            reader.GetFieldValue<DateTimeOffset>(11),
            reader.GetFieldValue<DateTimeOffset>(12));
    }
}
