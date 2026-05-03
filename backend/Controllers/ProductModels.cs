namespace backend.Controllers;

/// <summary>JSON body for POST/PUT <c>/api/products</c>.</summary>
public sealed record StoreStockEntry(Guid StoreId, int Quantity);

// A record in C# is a special type designed for immutable data models. It is similar to a class, but with some built-in features that make it more convenient to use.
// sealed means no other class or record can inherit from this record. Immutable means the values of the properties cannot be changed after the object is created.
// public means this record can be accessed from other classes and namespaces.
public sealed record UpsertProductRequest(
    string Sku,
    string Name,
    string? Description,
    decimal BasePrice,
    string Status,
    Guid CategoryId,
    string[]? ImageS3Keys,
    string[]? VideoUrls,
    bool IsClearance = false,
    bool IsRefurbished = false,
    Guid[]? StoreIds = null,
    StoreStockEntry[]? StoreStock = null
);
