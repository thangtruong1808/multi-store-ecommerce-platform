using backend.Vouchers;
using FluentAssertions;

namespace backend.UnitTests.Unit.Vouchers;

public class VoucherScopeTests
{
    [Theory]
    [InlineData("admin", true)]
    [InlineData("store_manager", true)]
    [InlineData("customer", false)]
    public void CanAccessDashboard_matches_voucher_admin_rules(string? role, bool expected)
    {
        VoucherScope.CanAccessDashboard(role).Should().Be(expected);
    }
}
