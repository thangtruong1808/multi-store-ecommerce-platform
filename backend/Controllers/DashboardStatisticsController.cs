using System.Globalization;
using System.Security.Claims;
using backend.Products;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;

namespace backend.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard/statistics")]
public sealed class DashboardStatisticsController : ControllerBase
{
    private const int LowStockThreshold = 5;

    private readonly NpgsqlDataSource _dataSource;

    public DashboardStatisticsController(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public sealed record RevenueByDayPointDto(string Date, decimal Revenue, int OrderCount);

    public sealed record PaymentStatusSliceDto(string Status, string Label, int Count);

    public sealed record TopProductPointDto(string ProductName, int UnitsSold, decimal Revenue);

    public sealed record CustomersPerStorePointDto(
        Guid StoreId,
        string StoreName,
        int UniqueCustomers,
        int PaidOrderCount);

    public sealed record DashboardStatisticsDto(
        Guid? StoreId,
        string? StoreName,
        int PeriodDays,
        string CurrencyCode,
        decimal RevenuePaid,
        int OrderCount,
        int PaidOrderCount,
        int PendingPaymentCount,
        decimal AverageOrderValue,
        int ActiveProductCount,
        int LowStockCount,
        int UniqueCustomersTotal,
        IReadOnlyList<RevenueByDayPointDto> RevenueByDay,
        IReadOnlyList<PaymentStatusSliceDto> PaymentStatusBreakdown,
        IReadOnlyList<TopProductPointDto> TopProducts,
        IReadOnlyList<CustomersPerStorePointDto> CustomersPerStore);

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] Guid? storeId = null,
        [FromQuery] int days = 30,
        CancellationToken cancellationToken = default)
    {
        var role = await GetCurrentUserRoleAsync(cancellationToken);
        if (!CanAccessDashboard(role))
        {
            return Forbid();
        }

        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return Unauthorized(new { message = "Invalid session token." });
        }

        var periodDays = Math.Clamp(days, 7, 90);
        var periodStart = DateTimeOffset.UtcNow.AddDays(-periodDays);

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);

        var isAdmin = string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);
        List<Guid> scopeStoreIds;

        if (isAdmin)
        {
            if (storeId is Guid sid)
            {
                await using var existsCmd = conn.CreateCommand();
                existsCmd.CommandText = "SELECT name, default_currency_code FROM app.stores WHERE id = @id LIMIT 1;";
                existsCmd.Parameters.AddWithValue("id", sid);
                await using var existsReader = await existsCmd.ExecuteReaderAsync(cancellationToken);
                if (!await existsReader.ReadAsync(cancellationToken))
                {
                    return NotFound(new { message = "Store not found." });
                }

                scopeStoreIds = [sid];
            }
            else
            {
                scopeStoreIds = await ListAllStoreIdsAsync(conn, cancellationToken);
            }
        }
        else
        {
            scopeStoreIds = await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, userId.Value);
            if (scopeStoreIds.Count == 0)
            {
                return Ok(EmptyStatistics(periodDays, null, null));
            }

            if (storeId is Guid requested && !scopeStoreIds.Contains(requested))
            {
                return Forbid();
            }

            if (storeId is Guid single)
            {
                scopeStoreIds = [single];
            }
        }

        if (scopeStoreIds.Count == 0)
        {
            return Ok(EmptyStatistics(periodDays, storeId, null));
        }

        string? storeName = null;
        string currencyCode = "AUD";

        if (scopeStoreIds.Count == 1)
        {
            await using var storeCmd = conn.CreateCommand();
            storeCmd.CommandText = "SELECT name, default_currency_code FROM app.stores WHERE id = @id LIMIT 1;";
            storeCmd.Parameters.AddWithValue("id", scopeStoreIds[0]);
            await using var storeReader = await storeCmd.ExecuteReaderAsync(cancellationToken);
            if (await storeReader.ReadAsync(cancellationToken))
            {
                storeName = storeReader.GetString(0);
                currencyCode = storeReader.GetString(1);
            }
        }

        var orderStats = await LoadOrderStatisticsAsync(conn, scopeStoreIds, periodStart, cancellationToken);
        if (!string.IsNullOrWhiteSpace(orderStats.CurrencyCode))
        {
            currencyCode = orderStats.CurrencyCode;
        }

        var activeProductCount = await CountActiveProductsAsync(conn, scopeStoreIds, cancellationToken);
        var lowStockCount = await CountLowStockAsync(conn, scopeStoreIds, cancellationToken);

        var averageOrderValue = orderStats.PaidOrderCount > 0
            ? Math.Round(orderStats.RevenuePaid / orderStats.PaidOrderCount, 2)
            : 0m;

        var revenueByDay = await LoadRevenueByDayAsync(conn, scopeStoreIds, periodStart, periodDays, cancellationToken);
        var paymentBreakdown = await LoadPaymentStatusBreakdownAsync(conn, scopeStoreIds, periodStart, cancellationToken);
        var topProducts = await LoadTopProductsAsync(conn, scopeStoreIds, periodStart, cancellationToken);
        var customersPerStore = await LoadCustomersPerStoreAsync(conn, scopeStoreIds, periodStart, cancellationToken);
        var uniqueCustomersTotal = await CountUniqueCustomersAsync(conn, scopeStoreIds, periodStart, cancellationToken);

        return Ok(new DashboardStatisticsDto(
            scopeStoreIds.Count == 1 ? scopeStoreIds[0] : null,
            storeName,
            periodDays,
            currencyCode,
            orderStats.RevenuePaid,
            orderStats.OrderCount,
            orderStats.PaidOrderCount,
            orderStats.PendingPaymentCount,
            averageOrderValue,
            activeProductCount,
            lowStockCount,
            uniqueCustomersTotal,
            revenueByDay,
            paymentBreakdown,
            topProducts,
            customersPerStore));
    }

    private static DashboardStatisticsDto EmptyStatistics(int periodDays, Guid? storeId, string? storeName) =>
        new(
            storeId,
            storeName,
            periodDays,
            "AUD",
            0m,
            0,
            0,
            0,
            0m,
            0,
            0,
            0,
            BuildEmptyRevenueSeries(periodDays),
            [],
            [],
            []);

    private static async Task<List<Guid>> ListAllStoreIdsAsync(NpgsqlConnection conn, CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT id FROM app.stores ORDER BY name ASC;";
        var ids = new List<Guid>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            ids.Add(reader.GetGuid(0));
        }

        return ids;
    }

    private sealed record OrderStatisticsResult(
        decimal RevenuePaid,
        int OrderCount,
        int PaidOrderCount,
        int PendingPaymentCount,
        string CurrencyCode);

    private static async Task<OrderStatisticsResult> LoadOrderStatisticsAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        DateTimeOffset periodStart,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT
                              COALESCE(SUM(CASE WHEN payment_status::text = 'succeeded' THEN grand_total::numeric ELSE 0 END), 0),
                              COUNT(*)::int,
                              COUNT(*) FILTER (WHERE payment_status::text = 'succeeded')::int,
                              COUNT(*) FILTER (WHERE payment_status::text = 'pending')::int,
                              COALESCE(
                                  (SELECT o2.currency_code
                                   FROM app.orders o2
                                   WHERE o2.store_id = ANY(@store_ids)
                                     AND o2.placed_at >= @period_start
                                   GROUP BY o2.currency_code
                                   ORDER BY COUNT(*) DESC
                                   LIMIT 1),
                                  'AUD')
                          FROM app.orders o
                          WHERE o.store_id = ANY(@store_ids)
                            AND o.placed_at >= @period_start;
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("store_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        cmd.Parameters.AddWithValue("period_start", periodStart);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            return new OrderStatisticsResult(0m, 0, 0, 0, "AUD");
        }

        return new OrderStatisticsResult(
            reader.GetDecimal(0),
            reader.GetInt32(1),
            reader.GetInt32(2),
            reader.GetInt32(3),
            reader.GetString(4));
    }

    private static async Task<int> CountActiveProductsAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT COUNT(DISTINCT p.id)::int
                          FROM app.products p
                          INNER JOIN app.store_products sp ON sp.product_id = p.id AND sp.is_visible = TRUE
                          INNER JOIN app.stores s ON s.id = sp.store_id AND s.is_active = TRUE
                          WHERE p.status::text = 'active'
                            AND sp.store_id = ANY(@store_ids);
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("store_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is int count ? count : Convert.ToInt32(result);
    }

    private static List<RevenueByDayPointDto> BuildEmptyRevenueSeries(int periodDays)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var points = new List<RevenueByDayPointDto>(periodDays);
        for (var i = periodDays - 1; i >= 0; i--)
        {
            var date = today.AddDays(-i);
            points.Add(new RevenueByDayPointDto(date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), 0m, 0));
        }

        return points;
    }

    private static async Task<IReadOnlyList<RevenueByDayPointDto>> LoadRevenueByDayAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        DateTimeOffset periodStart,
        int periodDays,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT (o.placed_at AT TIME ZONE 'UTC')::date AS day,
                                 COALESCE(SUM(CASE WHEN o.payment_status::text = 'succeeded' THEN o.grand_total::numeric ELSE 0 END), 0),
                                 COUNT(*)::int
                          FROM app.orders o
                          WHERE o.store_id = ANY(@store_ids)
                            AND o.placed_at >= @period_start
                          GROUP BY day
                          ORDER BY day;
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("store_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        cmd.Parameters.AddWithValue("period_start", periodStart);

        var byDate = new Dictionary<string, (decimal Revenue, int OrderCount)>();
        await using (var reader = await cmd.ExecuteReaderAsync(ct))
        {
            while (await reader.ReadAsync(ct))
            {
                var day = reader.GetDateTime(0).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                byDate[day] = (reader.GetDecimal(1), reader.GetInt32(2));
            }
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var series = new List<RevenueByDayPointDto>(periodDays);
        for (var i = periodDays - 1; i >= 0; i--)
        {
            var date = today.AddDays(-i);
            var key = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            if (byDate.TryGetValue(key, out var values))
            {
                series.Add(new RevenueByDayPointDto(key, values.Revenue, values.OrderCount));
            }
            else
            {
                series.Add(new RevenueByDayPointDto(key, 0m, 0));
            }
        }

        return series;
    }

    private static async Task<IReadOnlyList<PaymentStatusSliceDto>> LoadPaymentStatusBreakdownAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        DateTimeOffset periodStart,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT o.payment_status::text, COUNT(*)::int
                          FROM app.orders o
                          WHERE o.store_id = ANY(@store_ids)
                            AND o.placed_at >= @period_start
                          GROUP BY o.payment_status::text
                          ORDER BY COUNT(*) DESC;
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("store_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        cmd.Parameters.AddWithValue("period_start", periodStart);

        var slices = new List<PaymentStatusSliceDto>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var status = reader.GetString(0);
            slices.Add(new PaymentStatusSliceDto(status, FormatPaymentStatusLabel(status), reader.GetInt32(1)));
        }

        return slices;
    }

    private static string FormatPaymentStatusLabel(string paymentStatus) =>
        paymentStatus.ToLowerInvariant() switch
        {
            "succeeded" => "Paid",
            "pending" => "Pending",
            "failed" => "Failed",
            "canceled" or "cancelled" => "Cancelled",
            _ => CultureInfo.InvariantCulture.TextInfo.ToTitleCase(paymentStatus.Replace('_', ' ')),
        };

    private static async Task<IReadOnlyList<TopProductPointDto>> LoadTopProductsAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        DateTimeOffset periodStart,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT oi.product_name,
                                 SUM(oi.quantity)::int,
                                 SUM(oi.line_total::numeric)
                          FROM app.order_items oi
                          INNER JOIN app.orders o ON o.id = oi.order_id
                          WHERE o.store_id = ANY(@store_ids)
                            AND o.placed_at >= @period_start
                            AND o.payment_status::text = 'succeeded'
                          GROUP BY oi.product_name
                          ORDER BY SUM(oi.line_total::numeric) DESC
                          LIMIT 5;
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("store_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        cmd.Parameters.AddWithValue("period_start", periodStart);

        var products = new List<TopProductPointDto>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            products.Add(new TopProductPointDto(
                reader.GetString(0),
                reader.GetInt32(1),
                reader.GetDecimal(2)));
        }

        return products;
    }

    private static async Task<int> CountUniqueCustomersAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        DateTimeOffset periodStart,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT COUNT(DISTINCT o.customer_id)::int
                          FROM app.orders o
                          WHERE o.store_id = ANY(@store_ids)
                            AND o.placed_at >= @period_start
                            AND o.payment_status::text = 'succeeded';
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("store_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        cmd.Parameters.AddWithValue("period_start", periodStart);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is int count ? count : Convert.ToInt32(result);
    }

    private static async Task<IReadOnlyList<CustomersPerStorePointDto>> LoadCustomersPerStoreAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        DateTimeOffset periodStart,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT s.id,
                                 s.name,
                                 COUNT(DISTINCT o.customer_id)::int,
                                 COUNT(o.id)::int
                          FROM app.stores s
                          LEFT JOIN app.orders o
                              ON o.store_id = s.id
                             AND o.placed_at >= @period_start
                             AND o.payment_status::text = 'succeeded'
                          WHERE s.id = ANY(@store_ids)
                          GROUP BY s.id, s.name
                          ORDER BY COUNT(DISTINCT o.customer_id) DESC, s.name ASC;
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("store_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        cmd.Parameters.AddWithValue("period_start", periodStart);

        var rows = new List<CustomersPerStorePointDto>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            rows.Add(new CustomersPerStorePointDto(
                reader.GetGuid(0),
                reader.GetString(1),
                reader.GetInt32(2),
                reader.GetInt32(3)));
        }

        return rows;
    }

    private static async Task<int> CountLowStockAsync(
        NpgsqlConnection conn,
        IReadOnlyList<Guid> storeIds,
        CancellationToken ct)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT COUNT(*)::int
                          FROM app.stock st
                          INNER JOIN app.store_products sp
                              ON sp.store_id = st.store_id AND sp.product_id = st.product_id AND sp.is_visible = TRUE
                          INNER JOIN app.products p ON p.id = st.product_id AND p.status::text = 'active'
                          INNER JOIN app.stores s ON s.id = st.store_id AND s.is_active = TRUE
                          WHERE st.store_id = ANY(@store_ids)
                            AND st.quantity <= @threshold;
                          """;
        cmd.Parameters.Add(new NpgsqlParameter("store_ids", NpgsqlDbType.Array | NpgsqlDbType.Uuid) { Value = storeIds.ToArray() });
        cmd.Parameters.AddWithValue("threshold", LowStockThreshold);
        var result = await cmd.ExecuteScalarAsync(ct);
        return result is int count ? count : Convert.ToInt32(result);
    }

    private static bool CanAccessDashboard(string? role) => role is "admin" or "store_manager";

    private Guid? GetCurrentUserId()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userIdRaw, out var userId) ? userId : null;
    }

    private async Task<string?> GetCurrentUserRoleAsync(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            return null;
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
                          SELECT role::text
                          FROM app.users
                          WHERE id = @user_id
                          LIMIT 1;
                          """;
        cmd.Parameters.AddWithValue("user_id", userId.Value);
        return await cmd.ExecuteScalarAsync(cancellationToken) as string;
    }
}
