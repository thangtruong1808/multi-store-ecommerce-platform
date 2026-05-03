using backend.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace backend.Controllers;

/// <summary>Anonymous storefront catalog and product-by-SKU endpoints.</summary>
public partial class ProductsController
{
    [AllowAnonymous]
    [HttpGet("public")]
    public Task<IActionResult> ListPublicProducts([FromQuery] Guid? categoryId = null, [FromQuery] string? q = null)
        => ListPublicProductsCoreAsync(categoryId, q);

    /// <summary>Public catalog filtered by a level 2 category (includes products in descendant level 3 categories).</summary>
    [AllowAnonymous]
    [HttpGet("public/level-2/{categoryId:guid}")]
    public async Task<IActionResult> ListPublicProductsForLevel2Category([FromRoute] Guid categoryId, [FromQuery] string? q = null)
    {
        var level = await ProductCatalogQueries.GetCategoryLevelAsync(_dataSource, categoryId);
        if (level is null)
        {
            return NotFound(new { message = "Category not found." });
        }

        if (level != 2)
        {
            return BadRequest(new { message = "This endpoint lists products for level 2 categories only." });
        }

        return await ListPublicProductsCoreAsync(categoryId, q);
    }

    /// <summary>Public catalog filtered by a level 3 category.</summary>
    [AllowAnonymous]
    [HttpGet("public/level-3/{categoryId:guid}")]
    public async Task<IActionResult> ListPublicProductsForLevel3Category([FromRoute] Guid categoryId, [FromQuery] string? q = null)
    {
        var level = await ProductCatalogQueries.GetCategoryLevelAsync(_dataSource, categoryId);
        if (level is null)
        {
            return NotFound(new { message = "Category not found." });
        }

        if (level != 3)
        {
            return BadRequest(new { message = "This endpoint lists products for level 3 categories only." });
        }

        return await ListPublicProductsCoreAsync(categoryId, q);
    }

    /// <summary>
    /// Public catalog for a category identified by URL slug.
    /// Pass <paramref name="level1Slug"/> (department) when the same category slug exists under multiple level-1 trees.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("public/category/{slug}")]
    public async Task<IActionResult> ListPublicProductsForCategorySlug(
        [FromRoute] string slug,
        [FromQuery] string? level1Slug,
        [FromQuery] string? q = null)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return BadRequest(new { message = "Category slug is required." });
        }

        var trimmedCategorySlug = slug.Trim();

        if (!string.IsNullOrWhiteSpace(level1Slug))
        {
            var (resolvedId, ambiguous) = await ProductCatalogQueries.ResolveCategoryIdUnderLevel1SlugAsync(
                _dataSource,
                level1Slug.Trim(),
                trimmedCategorySlug);
            if (ambiguous)
            {
                return BadRequest(new { message = "Multiple categories match this department and slug." });
            }

            if (resolvedId is null)
            {
                return NotFound(new { message = "Category not found." });
            }

            return await ListPublicProductsCoreAsync(resolvedId.Value, q);
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT id
                          FROM app.categories
                          WHERE lower(slug) = lower(@slug)
                          LIMIT 2;
                          """;
        cmd.Parameters.AddWithValue("slug", trimmedCategorySlug);

        await using var reader = await cmd.ExecuteReaderAsync();
        var ids = new List<Guid>();
        while (await reader.ReadAsync())
        {
            ids.Add(reader.GetGuid(0));
        }

        if (ids.Count == 0)
        {
            return NotFound(new { message = "Category not found." });
        }

        if (ids.Count > 1)
        {
            return BadRequest(new { message = "Multiple categories use this slug. Use a more specific link." });
        }

        return await ListPublicProductsCoreAsync(ids[0], q);
    }

    /// <summary>Storefront: resolve active product by SKU (readable URLs).</summary>
    [AllowAnonymous]
    [HttpGet("public/sku/{sku}")]
    public async Task<IActionResult> GetPublicProductBySku([FromRoute] string sku)
    {
        if (string.IsNullOrWhiteSpace(sku))
        {
            return BadRequest(new { message = "SKU is required." });
        }

        var trimmed = sku.Trim();

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
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
                          WHERE lower(trim(p.sku)) = lower(trim(@sku)) AND lower(p.status) = 'active'
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("sku", trimmed);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "Product not found." });
        }

        var productId = reader.GetGuid(0);
        var skuOut = reader.GetString(1);
        var name = reader.GetString(2);
        var description = reader.IsDBNull(3) ? null : reader.GetString(3);
        var basePrice = reader.GetDecimal(4);
        var status = reader.GetString(5);
        var categoryId = reader.IsDBNull(6) ? (Guid?)null : reader.GetGuid(6);
        var categoryName = reader.IsDBNull(7) ? null : reader.GetString(7);
        var createdAt = reader.GetDateTime(8);
        var updatedAt = reader.GetDateTime(9);
        await reader.DisposeAsync();

        var imageS3Keys = await ProductPersistence.GetProductImagesAsync(conn, productId);
        var hasProductVideosTable = await ProductPersistence.HasProductVideosTableAsync(conn);
        var videoUrls = hasProductVideosTable
            ? await ProductPersistence.GetProductVideosAsync(conn, productId)
            : [];
        var availableQuantity = await ProductPersistence.GetPublicSellableStockSumAsync(conn, productId);

        return Ok(new
        {
            id = productId,
            sku = skuOut,
            name,
            description,
            basePrice,
            status,
            categoryId,
            categoryName,
            createdAt,
            updatedAt,
            imageS3Keys,
            videoUrls,
            availableQuantity
        });
    }

    /// <summary>Storefront: single active product by id (legacy bookmarks).</summary>
    [AllowAnonymous]
    [HttpGet("public/{id:guid}")]
    public async Task<IActionResult> GetPublicProductById([FromRoute] Guid id)
    {
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
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
                          WHERE p.id = @id AND lower(p.status) = 'active'
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            return NotFound(new { message = "Product not found." });
        }

        var productId = reader.GetGuid(0);
        var sku = reader.GetString(1);
        var name = reader.GetString(2);
        var description = reader.IsDBNull(3) ? null : reader.GetString(3);
        var basePrice = reader.GetDecimal(4);
        var status = reader.GetString(5);
        var categoryId = reader.IsDBNull(6) ? (Guid?)null : reader.GetGuid(6);
        var categoryName = reader.IsDBNull(7) ? null : reader.GetString(7);
        var createdAt = reader.GetDateTime(8);
        var updatedAt = reader.GetDateTime(9);
        await reader.DisposeAsync();

        var imageS3Keys = await ProductPersistence.GetProductImagesAsync(conn, productId);
        var hasProductVideosTable = await ProductPersistence.HasProductVideosTableAsync(conn);
        var videoUrls = hasProductVideosTable
            ? await ProductPersistence.GetProductVideosAsync(conn, productId)
            : [];
        var availableQuantity = await ProductPersistence.GetPublicSellableStockSumAsync(conn, productId);

        return Ok(new
        {
            id = productId,
            sku,
            name,
            description,
            basePrice,
            status,
            categoryId,
            categoryName,
            createdAt,
            updatedAt,
            imageS3Keys,
            videoUrls,
            availableQuantity
        });
    }

    /// <summary>
    /// Storefront: other products in the same category scope as list-by-category —
    /// <paramref name="categoryId"/> is the browse node, including products in descendant categories.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("public/related")]
    public async Task<IActionResult> ListRelatedPublicProducts(
        [FromQuery] Guid categoryId,
        [FromQuery] Guid? excludeProductId = null,
        [FromQuery] int take = 8)
    {
        var safeTake = Math.Clamp(take, 1, 24);

        await using var conn = await _dataSource.OpenConnectionAsync();
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
                              p.base_price,
                              c.name AS category_name
                          FROM app.products p
                          LEFT JOIN app.categories c ON c.id = p.category_id
                          WHERE lower(p.status) = 'active'
                            AND p.category_id IN (SELECT id FROM selected_categories)
                            AND (@exclude_id IS NULL OR p.id <> @exclude_id)
                          ORDER BY p.created_at DESC
                          LIMIT @take;
                          """;
        cmd.Parameters.AddWithValue("category_id", categoryId);
        ProductPersistence.AddNullableUuidParameter(cmd, "exclude_id", excludeProductId);
        cmd.Parameters.AddWithValue("take", safeTake);

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                sku = reader.GetString(1),
                name = reader.GetString(2),
                basePrice = reader.GetDecimal(3),
                categoryName = reader.IsDBNull(4) ? null : reader.GetString(4),
            });
        }

        return Ok(new { items });
    }

    /// <summary>Storefront home: active clearance products (recently marked), with URL slugs.</summary>
    [AllowAnonymous]
    [HttpGet("public/clearance")]
    public Task<IActionResult> ListPublicClearanceProducts([FromQuery] int take = 10)
        => ListPublicSpotlightProductsCoreAsync(
            """
            WHERE lower(p.status) = 'active'
              AND p.category_id IS NOT NULL
              AND p.is_clearance = TRUE
            ORDER BY p.clearance_marked_at DESC NULLS LAST
            """,
            Math.Clamp(take, 1, 24));

    /// <summary>Storefront home: active refurbished products (recently marked), with URL slugs.</summary>
    [AllowAnonymous]
    [HttpGet("public/refurbished")]
    public Task<IActionResult> ListPublicRefurbishedProducts([FromQuery] int take = 10)
        => ListPublicSpotlightProductsCoreAsync(
            """
            WHERE lower(p.status) = 'active'
              AND p.category_id IS NOT NULL
              AND p.is_refurbished = TRUE
            ORDER BY p.refurbished_marked_at DESC NULLS LAST
            """,
            Math.Clamp(take, 1, 24));

    /// <summary>Storefront home: newest active products, with URL slugs.</summary>
    [AllowAnonymous]
    [HttpGet("public/new-arrivals")]
    public Task<IActionResult> ListPublicNewArrivalProducts([FromQuery] int take = 10)
        => ListPublicSpotlightProductsCoreAsync(
            """
            WHERE lower(p.status) = 'active'
              AND p.category_id IS NOT NULL
            ORDER BY p.created_at DESC
            """,
            Math.Clamp(take, 1, 24));

    /// <summary>Storefront home: top sellers by shipped quantity; ties and zero-sales fall back to newest active.</summary>
    [AllowAnonymous]
    [HttpGet("public/top-selling")]
    public Task<IActionResult> ListPublicTopSellingProducts([FromQuery] int take = 10)
        => ListPublicTopSellingProductsCoreAsync(Math.Clamp(take, 1, 24));

    private async Task<IActionResult> ListPublicSpotlightProductsCoreAsync(string whereOrderSql, int safeTake)
    {
        var items = await ProductCatalogQueries.ListSpotlightProductRowsAsync(_dataSource, whereOrderSql, safeTake);
        return Ok(new { items });
    }

    private async Task<IActionResult> ListPublicTopSellingProductsCoreAsync(int safeTake)
    {
        var items = await ProductCatalogQueries.ListTopSellingProductRowsAsync(_dataSource, safeTake);
        return Ok(new { items });
    }

    private async Task<IActionResult> ListPublicProductsCoreAsync(Guid? categoryId, string? q)
    {
        var items = await ProductCatalogQueries.ListPublicProductRowsAsync(_dataSource, categoryId, q);
        return Ok(new { items });
    }
}
