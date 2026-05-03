using System.Globalization;
using Npgsql;
using NpgsqlTypes;

namespace backend.Products;

/// <summary>Read queries for public catalog lists, spotlight rows, and category slug resolution.</summary>
internal static class ProductCatalogQueries
{
    public static async Task<short?> GetCategoryLevelAsync(NpgsqlDataSource dataSource, Guid categoryId)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT level
                          FROM app.categories
                          WHERE id = @id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("id", categoryId);
        var raw = await cmd.ExecuteScalarAsync();
        return raw is null ? null : Convert.ToInt16(raw, CultureInfo.InvariantCulture);
    }

    /// <summary>Resolves leaf category under a level-1 department slug; ambiguous if multiple deepest matches.</summary>
    public static async Task<(Guid? Id, bool Ambiguous)> ResolveCategoryIdUnderLevel1SlugAsync(
        NpgsqlDataSource dataSource,
        string level1Slug,
        string categorySlug)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          WITH RECURSIVE up_chain AS (
                              SELECT id, parent_id, level, slug, id AS leaf_id
                              FROM app.categories
                              WHERE lower(slug) = lower(@category_slug)
                              UNION ALL
                              SELECT c.id, c.parent_id, c.level, c.slug, uc.leaf_id
                              FROM app.categories c
                              INNER JOIN up_chain uc ON c.id = uc.parent_id
                          ),
                          resolved AS (
                              SELECT DISTINCT leaf_id
                              FROM up_chain
                              WHERE level = 1 AND lower(slug) = lower(@level1_slug)
                          )
                          SELECT r.leaf_id, c.level
                          FROM resolved r
                          INNER JOIN app.categories c ON c.id = r.leaf_id;
                          """;
        cmd.Parameters.AddWithValue("category_slug", categorySlug);
        cmd.Parameters.AddWithValue("level1_slug", level1Slug);

        await using var reader = await cmd.ExecuteReaderAsync();
        var rows = new List<(Guid LeafId, int Level)>();
        while (await reader.ReadAsync())
        {
            rows.Add((reader.GetGuid(0), reader.GetInt32(1)));
        }

        if (rows.Count == 0)
        {
            return (null, false);
        }

        var maxLevel = rows.Max(static r => r.Level);
        var atMax = rows.Where(r => r.Level == maxLevel).ToList();
        if (atMax.Count > 1)
        {
            return (null, true);
        }

        return (atMax[0].LeafId, false);
    }

    public static async Task<List<object>> ListPublicProductRowsAsync(NpgsqlDataSource dataSource, Guid? categoryId, string? q)
    {
        var search = q?.Trim();
        await using var conn = await dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          WITH RECURSIVE selected_categories AS (
                              SELECT c.id
                              FROM app.categories c
                              WHERE c.id = @category_id
                              UNION ALL
                              SELECT child.id
                              FROM app.categories child
                              INNER JOIN selected_categories sc ON child.parent_id = sc.id
                          )
                          SELECT
                              p.id,
                              p.sku,
                              p.name,
                              p.description,
                              p.base_price,
                              p.status,
                              p.category_id,
                              c.name AS category_name,
                              p.created_at,
                              p.updated_at
                          FROM app.products p
                          LEFT JOIN app.categories c ON c.id = p.category_id
                          WHERE lower(p.status) = 'active'
                            AND (
                                @search IS NULL
                                OR p.name ILIKE '%' || @search || '%'
                            )
                            AND (
                                @category_id IS NULL
                                OR p.category_id IN (SELECT id FROM selected_categories)
                            )
                          ORDER BY p.created_at DESC;
                          """;
        ProductPersistence.AddNullableUuidParameter(cmd, "category_id", categoryId);
        ProductPersistence.AddNullableTextParameter(cmd, "search", search);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                sku = reader.GetString(1),
                name = reader.GetString(2),
                description = reader.IsDBNull(3) ? null : reader.GetString(3),
                basePrice = reader.GetDecimal(4),
                status = reader.GetString(5),
                categoryId = reader.IsDBNull(6) ? (Guid?)null : reader.GetGuid(6),
                categoryName = reader.IsDBNull(7) ? null : reader.GetString(7),
                createdAt = reader.GetDateTime(8),
                updatedAt = reader.GetDateTime(9)
            });
        }

        return items;
    }

    public static object MapSpotlightProductRow(NpgsqlDataReader reader)
    {
        return new
        {
            id = reader.GetGuid(0),
            sku = reader.GetString(1),
            name = reader.GetString(2),
            basePrice = reader.GetDecimal(3),
            categoryName = reader.IsDBNull(4) ? null : reader.GetString(4),
            level1Slug = reader.IsDBNull(5) ? null : reader.GetString(5),
            categorySlug = reader.IsDBNull(6) ? null : reader.GetString(6),
        };
    }

    public static async Task<List<object>> ListSpotlightProductRowsAsync(NpgsqlDataSource dataSource, string whereOrderSql, int safeTake)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
                           SELECT
                               p.id,
                               p.sku,
                               p.name,
                               p.base_price,
                               c.name AS category_name,
                               (SELECT x.slug
                                FROM (
                                         WITH RECURSIVE anc AS (
                                             SELECT id, parent_id, slug, level
                                             FROM app.categories
                                             WHERE id = p.category_id
                                             UNION ALL
                                             SELECT cat.id, cat.parent_id, cat.slug, cat.level
                                             FROM app.categories cat
                                                      INNER JOIN anc a ON cat.id = a.parent_id
                                         )
                                         SELECT slug, level
                                         FROM anc
                                     ) x
                                WHERE x.level = 1
                                LIMIT 1) AS level1_slug,
                               leaf.slug AS category_slug
                           FROM app.products p
                                    LEFT JOIN app.categories c ON c.id = p.category_id
                                    LEFT JOIN app.categories leaf ON leaf.id = p.category_id
                           {whereOrderSql}
                           LIMIT @take;
                           """;
        cmd.Parameters.AddWithValue("take", safeTake);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(MapSpotlightProductRow(reader));
        }

        return items;
    }

    public static async Task<List<object>> ListTopSellingProductRowsAsync(NpgsqlDataSource dataSource, int safeTake)
    {
        await using var conn = await dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          WITH sales AS (
                              SELECT oi.product_id,
                                     SUM(oi.quantity)::BIGINT AS units
                              FROM app.order_items oi
                                       INNER JOIN app.orders o ON o.id = oi.order_id
                              WHERE o.status IN ('paid', 'processing', 'shipped', 'completed', 'refunded')
                                AND oi.product_id IS NOT NULL
                              GROUP BY oi.product_id
                          )
                          SELECT p.id,
                                 p.sku,
                                 p.name,
                                 p.base_price,
                                 c.name AS category_name,
                                 (SELECT x.slug
                                  FROM (
                                           WITH RECURSIVE anc AS (
                                               SELECT id, parent_id, slug, level
                                               FROM app.categories
                                               WHERE id = p.category_id
                                               UNION ALL
                                               SELECT cat.id, cat.parent_id, cat.slug, cat.level
                                               FROM app.categories cat
                                                        INNER JOIN anc a ON cat.id = a.parent_id
                                           )
                                           SELECT slug, level
                                           FROM anc
                                       ) x
                                  WHERE x.level = 1
                                  LIMIT 1) AS level1_slug,
                                 leaf.slug AS category_slug
                          FROM app.products p
                                   LEFT JOIN app.categories c ON c.id = p.category_id
                                   LEFT JOIN app.categories leaf ON leaf.id = p.category_id
                                   LEFT JOIN sales s ON s.product_id = p.id
                          WHERE lower(p.status) = 'active'
                            AND p.category_id IS NOT NULL
                          ORDER BY COALESCE(s.units, 0) DESC, p.created_at DESC
                          LIMIT @take;
                          """;
        cmd.Parameters.AddWithValue("take", safeTake);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(MapSpotlightProductRow(reader));
        }

        return items;
    }
}
