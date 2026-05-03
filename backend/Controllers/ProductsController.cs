using System.Globalization;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;

    public ProductsController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public sealed record UpsertProductRequest(
        string Sku,
        string Name,
        string? Description,
        decimal BasePrice,
        string Status,
        Guid CategoryId,
        string[]? ImageS3Keys,
        string[]? VideoUrls
    );

    [AllowAnonymous]
    [HttpGet("public")]
    public Task<IActionResult> ListPublicProducts([FromQuery] Guid? categoryId = null, [FromQuery] string? q = null)
        => ListPublicProductsCoreAsync(categoryId, q);

    /// <summary>Public catalog filtered by a level 2 category (includes products in descendant level 3 categories).</summary>
    [AllowAnonymous]
    [HttpGet("public/level-2/{categoryId:guid}")]
    public async Task<IActionResult> ListPublicProductsForLevel2Category([FromRoute] Guid categoryId, [FromQuery] string? q = null)
    {
        var level = await GetCategoryLevelAsync(categoryId);
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
        var level = await GetCategoryLevelAsync(categoryId);
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
    /// Pass <paramref name="level1Slug"/> (department) when the same category slug exists under multiple level-1 trees (disambiguates /desktop/mac vs /other/mac).
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
            var (resolvedId, ambiguous) = await ResolveCategoryIdUnderLevel1SlugAsync(level1Slug.Trim(), trimmedCategorySlug);
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

        var imageS3Keys = await GetProductImagesAsync(conn, productId);
        var hasProductVideosTable = await HasProductVideosTableAsync(conn);
        var videoUrls = hasProductVideosTable
            ? await GetProductVideosAsync(conn, productId)
            : [];

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
            videoUrls
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

        var imageS3Keys = await GetProductImagesAsync(conn, productId);
        var hasProductVideosTable = await HasProductVideosTableAsync(conn);
        var videoUrls = hasProductVideosTable
            ? await GetProductVideosAsync(conn, productId)
            : [];

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
            videoUrls
        });
    }

    /// <summary>
    /// Walks ancestors from every row matching <paramref name="categorySlug"/>;
    /// keeps leaf ids whose chain includes level 1 with <paramref name="level1Slug"/>.
    /// If several categories share the same slug under that department, picks the one with the greatest <c>level</c> (deepest), e.g. L2 over L1.
    /// </summary>
    private async Task<(Guid? Id, bool Ambiguous)> ResolveCategoryIdUnderLevel1SlugAsync(string level1Slug, string categorySlug)
    {
        await using var conn = await _dataSource.OpenConnectionAsync();
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

    private async Task<IActionResult> ListPublicProductsCoreAsync(Guid? categoryId, string? q)
    {
        var search = q?.Trim();
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
        AddNullableUuidParameter(cmd, "category_id", categoryId);
        AddNullableTextParameter(cmd, "search", search);

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

        return Ok(new { items });
    }

    private async Task<short?> GetCategoryLevelAsync(Guid categoryId)
    {
        await using var conn = await _dataSource.OpenConnectionAsync();
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

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> ListProducts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? status = null,
        [FromQuery] string? q = null)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 5, 50);
        var offset = (safePage - 1) * safePageSize;
        var search = q?.Trim();
        var statusFilter = string.IsNullOrWhiteSpace(status) ? null : status.Trim().ToLowerInvariant();

        await using var conn = await _dataSource.OpenConnectionAsync();
        var hasProductVideosTable = await HasProductVideosTableAsync(conn);

        await using var countCmd = conn.CreateCommand();
        countCmd.CommandText = """
                              SELECT COUNT(*)
                              FROM app.products p
                              WHERE (@category_id IS NULL OR p.category_id = @category_id)
                                AND (@status IS NULL OR lower(p.status) = @status)
                                AND (@search IS NULL OR p.name ILIKE '%' || @search || '%' OR p.sku ILIKE '%' || @search || '%');
                              """;
        AddNullableUuidParameter(countCmd, "category_id", categoryId);
        AddNullableTextParameter(countCmd, "status", statusFilter);
        AddNullableTextParameter(countCmd, "search", search);
        var totalItems = Convert.ToInt32(await countCmd.ExecuteScalarAsync());

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = hasProductVideosTable
            ? """
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
                              p.updated_at,
                              (SELECT COUNT(*) FROM app.product_images pi WHERE pi.product_id = p.id) AS image_count,
                              (SELECT COUNT(*) FROM app.product_videos pv WHERE pv.product_id = p.id) AS video_count
                          FROM app.products p
                          LEFT JOIN app.categories c ON c.id = p.category_id
                          WHERE (@category_id IS NULL OR p.category_id = @category_id)
                            AND (@status IS NULL OR lower(p.status) = @status)
                            AND (@search IS NULL OR p.name ILIKE '%' || @search || '%' OR p.sku ILIKE '%' || @search || '%')
                          ORDER BY p.created_at DESC
                          LIMIT @limit OFFSET @offset;
                          """
            : """
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
                              p.updated_at,
                              (SELECT COUNT(*) FROM app.product_images pi WHERE pi.product_id = p.id) AS image_count,
                              0::int AS video_count
                          FROM app.products p
                          LEFT JOIN app.categories c ON c.id = p.category_id
                          WHERE (@category_id IS NULL OR p.category_id = @category_id)
                            AND (@status IS NULL OR lower(p.status) = @status)
                            AND (@search IS NULL OR p.name ILIKE '%' || @search || '%' OR p.sku ILIKE '%' || @search || '%')
                          ORDER BY p.created_at DESC
                          LIMIT @limit OFFSET @offset;
                          """;
        AddNullableUuidParameter(cmd, "category_id", categoryId);
        AddNullableTextParameter(cmd, "status", statusFilter);
        AddNullableTextParameter(cmd, "search", search);
        cmd.Parameters.AddWithValue("limit", safePageSize);
        cmd.Parameters.AddWithValue("offset", offset);

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
                updatedAt = reader.GetDateTime(9),
                imageCount = reader.GetInt32(10),
                videoCount = reader.GetInt32(11)
            });
        }

        return Ok(new
        {
            items,
            page = safePage,
            pageSize = safePageSize,
            totalItems,
            totalPages = Math.Max(1, (int)Math.Ceiling(totalItems / (double)safePageSize))
        });
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetProductDetail([FromRoute] Guid id)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

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
                          WHERE p.id = @id
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

        var imageS3Keys = await GetProductImagesAsync(conn, productId);
        var hasProductVideosTable = await HasProductVideosTableAsync(conn);
        var videoUrls = hasProductVideosTable
            ? await GetProductVideosAsync(conn, productId)
            : [];

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
            videoUrls
        });
    }

    [Authorize]
    [HttpGet("categories/tree")]
    public async Task<IActionResult> GetCategoryTree()
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT id, parent_id, name, level
                          FROM app.categories
                          ORDER BY level ASC, name ASC;
                          """;

        await using var reader = await cmd.ExecuteReaderAsync();
        var items = new List<object>();
        while (await reader.ReadAsync())
        {
            items.Add(new
            {
                id = reader.GetGuid(0),
                parentId = reader.IsDBNull(1) ? (Guid?)null : reader.GetGuid(1),
                name = reader.GetString(2),
                level = reader.GetInt16(3)
            });
        }

        return Ok(new { items });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] UpsertProductRequest request)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var normalized = await ValidateAndNormalizeAsync(request);
        if (normalized.Errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = normalized.Errors });
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var tx = await conn.BeginTransactionAsync();
        var hasProductVideosTable = await HasProductVideosTableAsync(conn);

        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                              INSERT INTO app.products (sku, name, description, base_price, status, category_id, created_by)
                              VALUES (@sku, @name, @description, @base_price, @status, @category_id, @created_by)
                              RETURNING id, created_at, updated_at;
                              """;
            cmd.Parameters.AddWithValue("sku", normalized.Sku);
            cmd.Parameters.AddWithValue("name", normalized.Name);
            cmd.Parameters.AddWithValue("description", (object?)normalized.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("base_price", normalized.BasePrice);
            cmd.Parameters.AddWithValue("status", normalized.Status);
            cmd.Parameters.AddWithValue("category_id", normalized.CategoryId);
            cmd.Parameters.AddWithValue("created_by", (object?)actorUserId ?? DBNull.Value);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                await tx.RollbackAsync();
                return StatusCode(500, new { message = "Unable to create product." });
            }

            var productId = reader.GetGuid(0);
            var createdAt = reader.GetDateTime(1);
            var updatedAt = reader.GetDateTime(2);
            await reader.DisposeAsync();

            await ReplaceProductImagesAsync(conn, tx, productId, normalized.ImageS3Keys);
            if (hasProductVideosTable)
            {
                await ReplaceProductVideosAsync(conn, tx, productId, normalized.VideoUrls);
            }

            await WriteAuditLogAsync(conn, tx, actorUserId, "product.created", "product", productId, new
            {
                normalized.Sku,
                normalized.Name,
                normalized.Status
            });

            await tx.CommitAsync();

            return Ok(new
            {
                id = productId,
                sku = normalized.Sku,
                name = normalized.Name,
                description = normalized.Description,
                basePrice = normalized.BasePrice,
                status = normalized.Status,
                categoryId = normalized.CategoryId,
                imageS3Keys = normalized.ImageS3Keys,
                videoUrls = normalized.VideoUrls,
                createdAt,
                updatedAt
            });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            await tx.RollbackAsync();
            return Conflict(new
            {
                message = "SKU already exists.",
                errors = new Dictionary<string, string> { ["sku"] = "This SKU is already used by another product." }
            });
        }
    }

    [Authorize]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct([FromRoute] Guid id, [FromBody] UpsertProductRequest request)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var normalized = await ValidateAndNormalizeAsync(request);
        if (normalized.Errors.Count > 0)
        {
            return BadRequest(new { message = "Validation failed.", errors = normalized.Errors });
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var tx = await conn.BeginTransactionAsync();
        var hasProductVideosTable = await HasProductVideosTableAsync(conn);

        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                              UPDATE app.products
                              SET
                                  sku = @sku,
                                  name = @name,
                                  description = @description,
                                  base_price = @base_price,
                                  status = @status,
                                  category_id = @category_id,
                                  updated_at = NOW()
                              WHERE id = @id
                              RETURNING created_at, updated_at;
                              """;
            cmd.Parameters.AddWithValue("id", id);
            cmd.Parameters.AddWithValue("sku", normalized.Sku);
            cmd.Parameters.AddWithValue("name", normalized.Name);
            cmd.Parameters.AddWithValue("description", (object?)normalized.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("base_price", normalized.BasePrice);
            cmd.Parameters.AddWithValue("status", normalized.Status);
            cmd.Parameters.AddWithValue("category_id", normalized.CategoryId);

            await using var reader = await cmd.ExecuteReaderAsync();
            if (!await reader.ReadAsync())
            {
                await tx.RollbackAsync();
                return NotFound(new { message = "Product not found." });
            }

            var createdAt = reader.GetDateTime(0);
            var updatedAt = reader.GetDateTime(1);
            await reader.DisposeAsync();

            await ReplaceProductImagesAsync(conn, tx, id, normalized.ImageS3Keys);
            if (hasProductVideosTable)
            {
                await ReplaceProductVideosAsync(conn, tx, id, normalized.VideoUrls);
            }

            await WriteAuditLogAsync(conn, tx, actorUserId, "product.updated", "product", id, new
            {
                normalized.Sku,
                normalized.Name,
                normalized.Status
            });

            await tx.CommitAsync();

            return Ok(new
            {
                id,
                sku = normalized.Sku,
                name = normalized.Name,
                description = normalized.Description,
                basePrice = normalized.BasePrice,
                status = normalized.Status,
                categoryId = normalized.CategoryId,
                imageS3Keys = normalized.ImageS3Keys,
                videoUrls = normalized.VideoUrls,
                createdAt,
                updatedAt
            });
        }
        catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            await tx.RollbackAsync();
            return Conflict(new
            {
                message = "SKU already exists.",
                errors = new Dictionary<string, string> { ["sku"] = "This SKU is already used by another product." }
            });
        }
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> SoftDeleteProduct([FromRoute] Guid id)
    {
        var currentUserRole = await GetCurrentUserRoleAsync();
        if (!CanAccessDashboard(currentUserRole))
        {
            return Forbid();
        }

        var actorUserId = GetCurrentUserId();
        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var tx = await conn.BeginTransactionAsync();

        await using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
                          UPDATE app.products
                          SET status = 'inactive', updated_at = NOW()
                          WHERE id = @id
                          RETURNING id, sku, name, status;
                          """;
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
        {
            await tx.RollbackAsync();
            return NotFound(new { message = "Product not found." });
        }

        var productId = reader.GetGuid(0);
        var sku = reader.GetString(1);
        var name = reader.GetString(2);
        var status = reader.GetString(3);
        await reader.DisposeAsync();

        await WriteAuditLogAsync(conn, tx, actorUserId, "product.soft_deleted", "product", productId, new { sku, name });
        await tx.CommitAsync();

        return Ok(new { id = productId, sku, name, status });
    }

    private static bool CanAccessDashboard(string? role)
    {
        return role is "admin" or "store_manager";
    }

    private async Task<string?> GetCurrentUserRoleAsync()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            return null;
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT role::text
                          FROM app.users
                          WHERE id = @user_id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("user_id", userId);
        return await cmd.ExecuteScalarAsync() as string;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdRaw, out var userId) ? userId : null;
    }

    private async Task<(Dictionary<string, string> Errors, string Sku, string Name, string? Description, decimal BasePrice, string Status, Guid CategoryId, List<string> ImageS3Keys, List<string> VideoUrls)> ValidateAndNormalizeAsync(UpsertProductRequest request)
    {
        var errors = new Dictionary<string, string>();
        var sku = (request.Sku ?? string.Empty).Trim().ToUpperInvariant();
        var name = (request.Name ?? string.Empty).Trim();
        var description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        var status = (request.Status ?? string.Empty).Trim().ToLowerInvariant();
        var imageS3Keys = (request.ImageS3Keys ?? []).Select(x => x.Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var videoUrls = (request.VideoUrls ?? []).Select(x => x.Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        if (string.IsNullOrWhiteSpace(sku) || sku.Length < 2)
        {
            errors["sku"] = "SKU must be at least 2 characters.";
        }

        if (string.IsNullOrWhiteSpace(name) || name.Length < 2)
        {
            errors["name"] = "Product name must be at least 2 characters.";
        }

        if (request.BasePrice < 0)
        {
            errors["basePrice"] = "Base price must be greater than or equal to 0.";
        }

        if (!IsValidProductStatus(status))
        {
            errors["status"] = "Status must be one of: active, inactive, draft.";
        }

        if (imageS3Keys.Count > 4)
        {
            errors["imageS3Keys"] = "Maximum 4 product images are allowed.";
        }

        for (var i = 0; i < videoUrls.Count; i++)
        {
            if (!Uri.TryCreate(videoUrls[i], UriKind.Absolute, out var uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                errors["videoUrls"] = "All video URLs must be valid http/https URLs.";
                break;
            }
        }

        await using var conn = await _dataSource.OpenConnectionAsync();
        await using var categoryCmd = conn.CreateCommand();
        categoryCmd.CommandText = "SELECT level FROM app.categories WHERE id = @id LIMIT 1;";
        categoryCmd.Parameters.AddWithValue("id", request.CategoryId);
        var levelRaw = await categoryCmd.ExecuteScalarAsync();
        if (levelRaw is null)
        {
            errors["categoryId"] = "Selected category does not exist.";
        }
        else
        {
            var level = Convert.ToInt16(levelRaw, CultureInfo.InvariantCulture);
            if (level != 3)
            {
                errors["categoryId"] = "Product must be assigned to a level 3 category.";
            }
        }

        return (errors, sku, name, description, request.BasePrice, status, request.CategoryId, imageS3Keys, videoUrls);
    }

    private static bool IsValidProductStatus(string status)
    {
        return status is "active" or "inactive" or "draft";
    }

    private static async Task<List<string>> GetProductImagesAsync(NpgsqlConnection conn, Guid productId)
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

    private static async Task<List<string>> GetProductVideosAsync(NpgsqlConnection conn, Guid productId)
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

    private static async Task ReplaceProductImagesAsync(NpgsqlConnection conn, NpgsqlTransaction tx, Guid productId, List<string> imageS3Keys)
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

    private static async Task ReplaceProductVideosAsync(NpgsqlConnection conn, NpgsqlTransaction tx, Guid productId, List<string> videoUrls)
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

    private static async Task WriteAuditLogAsync(
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

    private static void AddNullableUuidParameter(NpgsqlCommand command, string name, Guid? value)
    {
        command.Parameters.Add(new NpgsqlParameter<Guid?>(name, NpgsqlDbType.Uuid) { TypedValue = value });
    }

    private static void AddNullableTextParameter(NpgsqlCommand command, string name, string? value)
    {
        command.Parameters.Add(new NpgsqlParameter<string?>(name, NpgsqlDbType.Text) { TypedValue = value });
    }

    private static async Task<bool> HasProductVideosTableAsync(NpgsqlConnection conn)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT to_regclass('app.product_videos') IS NOT NULL;";
        var result = await cmd.ExecuteScalarAsync();
        return result is bool flag && flag;
    }
}
