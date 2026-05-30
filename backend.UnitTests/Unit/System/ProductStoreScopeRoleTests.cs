using backend.Products;
using FluentAssertions;

namespace backend.UnitTests.Unit.System;

public class ProductStoreScopeRoleTests
{
    [Theory]
    [InlineData("admin", true)]
    [InlineData("store_manager", true)]
    [InlineData("Admin", false)]
    [InlineData("customer", false)]
    [InlineData(null, false)]
    [InlineData("", false)]
    public void CanAccessDashboard_matches_expected_roles(string? role, bool expected)
    {
        ProductStoreScope.CanAccessDashboard(role).Should().Be(expected);
    }

    [Theory]
    [InlineData("admin", true)]
    [InlineData("ADMIN", true)]
    [InlineData("store_manager", false)]
    [InlineData("customer", false)]
    public void IsAdminRole_is_case_insensitive_for_admin_only(string? role, bool expected)
    {
        ProductStoreScope.IsAdminRole(role).Should().Be(expected);
    }

    [Theory]
    [InlineData("active", true)]
    [InlineData("inactive", true)]
    [InlineData("draft", true)]
    [InlineData("archived", false)]
    public void IsValidProductStatus_accepts_catalog_statuses(string status, bool expected)
    {
        ProductStoreScope.IsValidProductStatus(status).Should().Be(expected);
    }
}
