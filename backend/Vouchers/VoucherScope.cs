namespace backend.Vouchers;

internal static class VoucherScope
{
    public static bool CanAccessDashboard(string? role) => role is "admin" or "store_manager";

    public static bool IsAdminRole(string? role) =>
        string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);
}
