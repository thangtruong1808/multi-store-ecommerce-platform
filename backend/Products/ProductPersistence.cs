using System.Globalization;
using Npgsql;
using NpgsqlTypes;

namespace backend.Products;

/// <summary>Low-level PostgreSQL access for product media, stock, and audit. Keeps SQL in one place.</summary>
internal static class ProductPersistence
{
    public static void AddNullableUuidParameter(NpgsqlCommand command, string name, Guid? value)
    {
        command.Parameters.Add(new NpgsqlParameter<Guid?>(name, NpgsqlDbType.Uuid) { TypedValue = value });
    }

    public static void AddNullableTextParameter(NpgsqlCommand command, string name, string? value)
    {
        command.Parameters.Add(new NpgsqlParameter<string?>(name, NpgsqlDbType.Text) { TypedValue = value });
    }

    public static async Task<bool> HasProductVideosTableAsync(NpgsqlConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT to_regclass('app.product_videos') IS NOT NULL;";
        var result = await cmd.ExecuteScalarAsync();
        return result is bool flag && flag;
    }

    public static async Task<List<string>> GetProductImagesAsync(NpgsqlConnection conn, Guid productId)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT image_s3_key
                          FROM app.product_images
                          WHERE product_id = @product_id
                          ORDER BY sort_order ASC;
                          """;
        cmd.Parameters.AddWithValue("product_id", productId);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<string>();
        while (await reader.ReadAsync())
        {
            items.Add(reader.GetString(0));
        }

        return items;
    }

    public static async Task<List<string>> GetProductVideosAsync(NpgsqlConnection conn, Guid productId)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT video_url
                          FROM app.product_videos
                          WHERE product_id = @product_id
                          ORDER BY sort_order ASC;
                          """;
        cmd.Parameters.AddWithValue("product_id", productId);
        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<string>();
        while (await reader.ReadAsync())
        {
            items.Add(reader.GetString(0));
        }

        return items;
    }

    public static async Task ReplaceProductImagesAsync(NpgsqlConnection conn, NpgsqlTransaction tx, Guid productId, List<string> imageS3Keys)
    {
        await using (var deleteCmd = conn.CreateCommand())
        {
            deleteCmd.Transaction = tx;
            deleteCmd.CommandText = "DELETE FROM app.product_images WHERE product_id = @product_id;";
            deleteCmd.Parameters.AddWithValue("product_id", productId);
            await deleteCmd.ExecuteNonQueryAsync();
        }

        for (var i = 0; i < imageS3Keys.Count; i++)
        {
            await using var insertCmd = conn.CreateCommand();
            insertCmd.Transaction = tx;
            insertCmd.CommandText = """
                                    INSERT INTO app.product_images (product_id, image_s3_key, sort_order)
                                    VALUES (@product_id, @image_s3_key, @sort_order);
                                    """;
            insertCmd.Parameters.AddWithValue("product_id", productId);
            insertCmd.Parameters.AddWithValue("image_s3_key", imageS3Keys[i]);
            insertCmd.Parameters.AddWithValue("sort_order", (short)(i + 1));
            await insertCmd.ExecuteNonQueryAsync();
        }
    }

    public static async Task ReplaceProductVideosAsync(NpgsqlConnection conn, NpgsqlTransaction tx, Guid productId, List<string> videoUrls)
    {
        await using (var deleteCmd = conn.CreateCommand())
        {
            deleteCmd.Transaction = tx;
            deleteCmd.CommandText = "DELETE FROM app.product_videos WHERE product_id = @product_id;";
            deleteCmd.Parameters.AddWithValue("product_id", productId);
            await deleteCmd.ExecuteNonQueryAsync();
        }

        for (var i = 0; i < videoUrls.Count; i++)
        {
            await using var insertCmd = conn.CreateCommand();
            insertCmd.Transaction = tx;
            insertCmd.CommandText = """
                                    INSERT INTO app.product_videos (product_id, video_url, sort_order)
                                    VALUES (@product_id, @video_url, @sort_order);
                                    """;
            insertCmd.Parameters.AddWithValue("product_id", productId);
            insertCmd.Parameters.AddWithValue("video_url", videoUrls[i]);
            insertCmd.Parameters.AddWithValue("sort_order", (short)(i + 1));
            await insertCmd.ExecuteNonQueryAsync();
        }
    }

    public static async Task<List<Guid>> GetManagedStoreIdsForUserAsync(NpgsqlConnection conn, Guid userId)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT store_id
                          FROM app.store_staff
                          WHERE user_id = @uid
                          ORDER BY created_at ASC;
                          """;
        cmd.Parameters.AddWithValue("uid", userId);
        await using var reader = await cmd.ExecuteReaderAsync();
        var ids = new List<Guid>();
        while (await reader.ReadAsync())
        {
            ids.Add(reader.GetGuid(0));
        }

        return ids;
    }

    public static async Task<List<Guid>> GetStoreIdsForProductAsync(NpgsqlConnection conn, Guid productId, NpgsqlTransaction? tx = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          SELECT store_id
                          FROM app.store_products
                          WHERE product_id = @pid
                          ORDER BY store_id;
                          """;
        cmd.Parameters.AddWithValue("pid", productId);
        await using var reader = await cmd.ExecuteReaderAsync();
        var ids = new List<Guid>();
        while (await reader.ReadAsync())
        {
            ids.Add(reader.GetGuid(0));
        }

        return ids;
    }

    public static async Task<List<(Guid StoreId, int Quantity)>> GetStoreStockRowsForProductAsync(
        NpgsqlConnection conn,
        Guid productId,
        NpgsqlTransaction? tx = null)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          SELECT store_id, quantity
                          FROM app.stock
                          WHERE product_id = @pid
                          ORDER BY store_id;
                          """;
        cmd.Parameters.AddWithValue("pid", productId);
        await using var reader = await cmd.ExecuteReaderAsync();
        var rows = new List<(Guid, int)>();
        while (await reader.ReadAsync())
        {
            rows.Add((reader.GetGuid(0), reader.GetInt32(1)));
        }

        return rows;
    }

    /// <summary>Sums sellable stock: visible store_products link and active store.</summary>
    public static async Task<long> GetPublicSellableStockSumAsync(NpgsqlConnection conn, Guid productId)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT COALESCE(SUM(s.quantity), 0)::BIGINT
                          FROM app.stock s
                                   INNER JOIN app.store_products sp
                                              ON sp.store_id = s.store_id AND sp.product_id = s.product_id
                                   INNER JOIN app.stores st ON st.id = s.store_id
                          WHERE s.product_id = @pid
                            AND sp.is_visible = TRUE
                            AND st.is_active = TRUE;
                          """;
        cmd.Parameters.AddWithValue("pid", productId);
        var raw = await cmd.ExecuteScalarAsync();
        return raw is null or DBNull ? 0L : Convert.ToInt64(raw, CultureInfo.InvariantCulture);
    }

    public static async Task ReplaceAllStoreProductLinksAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid productId,
        List<Guid> storeIds,
        IReadOnlyDictionary<Guid, int> quantityByStore)
    {
        await using (var delSp = conn.CreateCommand())
        {
            delSp.Transaction = tx;
            delSp.CommandText = "DELETE FROM app.store_products WHERE product_id = @pid;";
            delSp.Parameters.AddWithValue("pid", productId);
            await delSp.ExecuteNonQueryAsync();
        }

        await using (var delSt = conn.CreateCommand())
        {
            delSt.Transaction = tx;
            delSt.CommandText = "DELETE FROM app.stock WHERE product_id = @pid;";
            delSt.Parameters.AddWithValue("pid", productId);
            await delSt.ExecuteNonQueryAsync();
        }

        foreach (var sid in storeIds.Distinct())
        {
            var q = quantityByStore.TryGetValue(sid, out var qty) ? qty : 0;
            await InsertStoreProductAndStockAsync(conn, tx, sid, productId, q);
        }
    }

    public static async Task MergeStoreProductLinksForStoreManagerAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid productId,
        List<Guid> managed,
        List<Guid> want,
        IReadOnlyDictionary<Guid, int> quantityByStore)
    {
        var wantArray = want.Distinct().ToArray();
        var managedArray = managed.Distinct().ToArray();

        await using (var delSp = conn.CreateCommand())
        {
            delSp.Transaction = tx;
            delSp.CommandText = """
                                DELETE FROM app.store_products sp
                                WHERE sp.product_id = @pid
                                  AND sp.store_id = ANY(@managed_ids)
                                  AND NOT (sp.store_id = ANY(@want_ids));
                                """;
            delSp.Parameters.AddWithValue("pid", productId);
            delSp.Parameters.Add(new NpgsqlParameter("managed_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = managedArray });
            delSp.Parameters.Add(new NpgsqlParameter("want_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = wantArray });
            await delSp.ExecuteNonQueryAsync();
        }

        await using (var delSt = conn.CreateCommand())
        {
            delSt.Transaction = tx;
            delSt.CommandText = """
                                DELETE FROM app.stock s
                                WHERE s.product_id = @pid
                                  AND s.store_id = ANY(@managed_ids)
                                  AND NOT (s.store_id = ANY(@want_ids));
                                """;
            delSt.Parameters.AddWithValue("pid", productId);
            delSt.Parameters.Add(new NpgsqlParameter("managed_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = managedArray });
            delSt.Parameters.Add(new NpgsqlParameter("want_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = wantArray });
            await delSt.ExecuteNonQueryAsync();
        }

        foreach (var sid in wantArray)
        {
            var q = quantityByStore.TryGetValue(sid, out var qty) ? qty : 0;
            await InsertStoreProductAndStockAsync(conn, tx, sid, productId, q);
        }
    }

    public static async Task InsertStoreProductAndStockAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid storeId,
        Guid productId,
        int quantity)
    {
        await using var sp = conn.CreateCommand();
        sp.Transaction = tx;
        sp.CommandText = """
                          INSERT INTO app.store_products (store_id, product_id, is_visible)
                          VALUES (@sid, @pid, TRUE)
                          ON CONFLICT (store_id, product_id) DO UPDATE SET is_visible = EXCLUDED.is_visible;
                          """;
        sp.Parameters.AddWithValue("sid", storeId);
        sp.Parameters.AddWithValue("pid", productId);
        await sp.ExecuteNonQueryAsync();

        await using var st = conn.CreateCommand();
        st.Transaction = tx;
        st.CommandText = """
                          INSERT INTO app.stock (store_id, product_id, quantity)
                          VALUES (@sid, @pid, @qty)
                          ON CONFLICT (store_id, product_id)
                              DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
                          """;
        st.Parameters.AddWithValue("sid", storeId);
        st.Parameters.AddWithValue("pid", productId);
        st.Parameters.AddWithValue("qty", quantity);
        await st.ExecuteNonQueryAsync();
    }

    public static async Task WriteAuditLogAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Guid? userId,
        string action,
        string? entityType,
        Guid? entityId,
        object? metadata)
    {
        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          INSERT INTO app.audit_logs (store_id, user_id, action, entity_type, entity_id, metadata, ip_address)
                          VALUES (@store_id, @user_id, @action, @entity_type, @entity_id, CAST(@metadata AS jsonb), @ip_address);
                          """;
        cmd.Parameters.AddWithValue("store_id", DBNull.Value);
        cmd.Parameters.AddWithValue("user_id", (object?)userId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("action", action);
        cmd.Parameters.AddWithValue("entity_type", (object?)entityType ?? DBNull.Value);
        cmd.Parameters.AddWithValue("entity_id", (object?)entityId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("metadata", metadata is null ? "{}" : System.Text.Json.JsonSerializer.Serialize(metadata));
        cmd.Parameters.Add(new NpgsqlParameter("ip_address", NpgsqlDbType.Inet) { Value = DBNull.Value });
        await cmd.ExecuteNonQueryAsync();
    }
}
