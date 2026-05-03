namespace backend.Checkout;

public sealed record CheckoutSessionLineRequest(Guid ProductId, int Quantity);

public sealed record CreateCheckoutSessionRequest(
    IReadOnlyList<CheckoutSessionLineRequest> Items,
    Guid StoreId);

public sealed record EligibleStoresRequest(IReadOnlyList<CheckoutSessionLineRequest> Items);

public sealed record EligibleStoreOption(Guid Id, string Name);

public sealed record CreateCheckoutSessionResponse(string Url);

public sealed record ValidatedCheckoutLine(
    Guid ProductId,
    string Sku,
    string Name,
    decimal UnitPrice,
    int Quantity);
