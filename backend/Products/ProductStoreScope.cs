using backend.Controllers;
using Npgsql;

namespace backend.Products;

/// <summary>Rules for which stores may be linked to a product (admin vs store_manager) and stock payload validation.</summary>
internal static class ProductStoreScope
{
    public const int MaxStockQuantityPerStore = 999_999;

    public static bool CanAccessDashboard(string? role) => role is "admin" or "store_manager";

    public static bool IsAdminRole(string? role) =>
        string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);

    public static bool IsValidProductStatus(string status) => status is "active" or "inactive" or "draft";

    public static async Task ValidateStoreIdsExistAsync(NpgsqlConnection conn, List<Guid> ids, Dictionary<string, string> errors)
    {
        foreach (var sid in ids)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1 FROM app.stores WHERE id = @id LIMIT 1;";
            cmd.Parameters.AddWithValue("id", sid);
            var ok = await cmd.ExecuteScalarAsync();
            if (ok is null)
            {
                errors["storeIds"] = $"Store {sid} does not exist.";
                return;
            }
        }
    }

    public static async Task<(Dictionary<string, string> Errors, List<Guid> EffectiveIds)> ResolveForUpsert(
        string? role,
        Guid? actorUserId,
        UpsertProductRequest request,
        bool isCreate,
        Guid? existingProductId,
        NpgsqlConnection conn)
    {
        var errors = new Dictionary<string, string>();
        if (IsAdminRole(role))
        {
            if (request.StoreIds == null || request.StoreIds.Length == 0)
            {
                errors["storeIds"] = "Select at least one store.";
                return (errors, []);
            }

            var ids = request.StoreIds.Distinct().ToList();
            await ValidateStoreIdsExistAsync(conn, ids, errors);
            return (errors, ids);
        }

        if (actorUserId is null)
        {
            errors["storeIds"] = "Invalid session.";
            return (errors, []);
        }

        var managed = await ProductPersistence.GetManagedStoreIdsForUserAsync(conn, actorUserId.Value);
        if (managed.Count == 0)
        {
            errors["storeIds"] = "Your account is not assigned to any store. Ask an admin to assign stores.";
            return (errors, []);
        }

        if (request.StoreIds == null || request.StoreIds.Length == 0)
        {
            if (isCreate)
            {
                return (errors, managed.ToList());
            }

            if (existingProductId is null)
            {
                errors["storeIds"] = "Product reference missing.";
                return (errors, []);
            }

            var existingForProduct = await ProductPersistence.GetStoreIdsForProductAsync(conn, existingProductId.Value);
            var intersection = existingForProduct.Where(managed.Contains).ToList();
            if (intersection.Count == 0)
            {
                errors["storeIds"] = "You do not manage any store that carries this product.";
                return (errors, []);
            }

            return (errors, intersection);
        }

        var want = request.StoreIds.Distinct().ToList();
        if (want.Count == 0)
        {
            errors["storeIds"] = "Select at least one store.";
            return (errors, []);
        }

        if (want.Any(x => !managed.Contains(x)))
        {
            errors["storeIds"] = "You can only assign stores you manage.";
            return (errors, []);
        }

        return (errors, want);
    }

    /// <summary>Builds per-store quantities; rejects stock rows that reference stores outside the effective set.</summary>
    public static Dictionary<string, string> ValidateStockForEffectiveStores(
        UpsertProductRequest request,
        List<Guid> effectiveStoreIds,
        out Dictionary<Guid, int> quantityByStore)
    {
        quantityByStore = effectiveStoreIds.Distinct().ToDictionary(s => s, _ => 0);
        var allowed = effectiveStoreIds.ToHashSet();

        if (request.StoreStock == null || request.StoreStock.Length == 0)
        {
            return [];
        }

        var errors = new Dictionary<string, string>();
        foreach (var entry in request.StoreStock)
        {
            if (!allowed.Contains(entry.StoreId))
            {
                errors["storeStock"] = "Stock entries must only reference selected stores.";
                return errors;
            }

            if (entry.Quantity < 0)
            {
                errors["storeStock"] = "Quantities must be non-negative.";
                return errors;
            }

            if (entry.Quantity > MaxStockQuantityPerStore)
            {
                errors["storeStock"] = $"Quantity cannot exceed {MaxStockQuantityPerStore:N0}.";
                return errors;
            }

            quantityByStore[entry.StoreId] = entry.Quantity;
        }

        return errors;
    }
}
