namespace backend.Vouchers;

internal sealed record VoucherRow(
    Guid Id,
    string Code,
    string? Description,
    string DiscountType,
    decimal DiscountValue,
    DateTimeOffset? StartsAt,
    DateTimeOffset ExpiresAt,
    bool IsActive,
    decimal? MinOrderAmount,
    int? MaxRedemptions,
    int RedemptionCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed record VoucherDetail(
    VoucherRow Voucher,
    IReadOnlyList<Guid> StoreIds,
    IReadOnlyList<string> StoreNames,
    IReadOnlyList<Guid> ProductIds);

public sealed record VoucherApplyResult(
    bool Success,
    string? ErrorMessage,
    Guid? VoucherId,
    string? Code,
    string? Label,
    decimal DiscountTotal);

public sealed record CheckoutPricingResult(
    decimal Subtotal,
    decimal DiscountTotal,
    decimal GrandTotal,
    VoucherApplyResult? Voucher,
    IReadOnlyList<string> Messages,
    IReadOnlyList<SuggestedVoucherDto> SuggestedVouchers,
    IReadOnlyList<CrossStoreVoucherWarningDto> CrossStoreWarnings);

public sealed record SuggestedVoucherDto(
    string Code,
    string Label,
    bool AppliesAtSelectedStore);

public sealed record CrossStoreVoucherWarningDto(
    string Code,
    string Label,
    IReadOnlyList<string> StoreNames);

public sealed record ProductVoucherHintDto(
    string Code,
    string Label,
    IReadOnlyList<Guid> StoreIds,
    IReadOnlyList<string> StoreNames);
