using System.Security.Claims;
using backend.Checkout;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using Stripe.Checkout;

namespace backend.Controllers;

[ApiController]
[Route("api/checkout")]
public sealed class CheckoutController : ControllerBase
{
    private const string DefaultDevPublicAppBaseUrl = "http://localhost:5173";

    private readonly NpgsqlDataSource _dataSource;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<CheckoutController> _logger;

    public CheckoutController(
        NpgsqlDataSource dataSource,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<CheckoutController> logger)
    {
        _dataSource = dataSource;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    /// <summary>Stores that can fulfil the cart (active stock, visible listing).</summary>
    [HttpPost("eligible-stores")]
    [Authorize]
    public async Task<IActionResult> EligibleStores([FromBody] EligibleStoresRequest request, CancellationToken cancellationToken)
    {
        var items = NormalizeCartItems(request.Items);
        if (items.Count == 0)
        {
            return Ok(new { stores = Array.Empty<EligibleStoreOption>() });
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        var stores = await CheckoutStoreAndPricing.ListEligibleStoresAsync(conn, items, cancellationToken);
        return Ok(new { stores });
    }

    [HttpPost("session")]
    [Authorize]
    public async Task<IActionResult> CreateSession([FromBody] CreateCheckoutSessionRequest request, CancellationToken cancellationToken)
    {
        var secret = _configuration["STRIPE_SECRET_KEY"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            return StatusCode(503, new { message = "Stripe is not configured." });
        }

        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userIdRaw) || !Guid.TryParse(userIdRaw, out var userId))
        {
            return Unauthorized();
        }

        var items = NormalizeCartItems(request.Items);
        if (items.Count == 0)
        {
            return BadRequest(new { message = "Cart is empty." });
        }

        if (request.StoreId == Guid.Empty)
        {
            return BadRequest(new { message = "Select a store to fulfil your order." });
        }

        var publicBase = ResolvePublicAppBaseUrl();
        if (string.IsNullOrWhiteSpace(publicBase))
        {
            return StatusCode(503, new
            {
                message =
                    "PUBLIC_APP_BASE_URL is not configured. Add it to backend/.env (same folder as the API): public origin of your SPA with no trailing slash (e.g. http://localhost:5173). Optional: set CORS_ALLOWED_ORIGINS to the same origin — the first entry is used as a fallback when PUBLIC_APP_BASE_URL is omitted.",
            });
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        var userDetails = await CheckoutOrderPersistence.GetUserDetailsAsync(conn, userId, cancellationToken);
        if (userDetails is null)
        {
            return Unauthorized();
        }

        var lines = await CheckoutStoreAndPricing.TryBuildLinesForStoreAsync(conn, request.StoreId, items, cancellationToken);
        if (lines is null)
        {
            return BadRequest(new
            {
                message =
                    "The selected store cannot fulfil this cart. Choose another store or update quantities (stock may have changed).",
            });
        }

        var storeId = request.StoreId;
        var subtotal = CheckoutStoreAndPricing.SumSubtotal(lines);
        if (subtotal <= 0)
        {
            return BadRequest(new { message = "Invalid order total." });
        }

        Stripe.StripeConfiguration.ApiKey = secret;

        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        Guid orderId;
        try
        {
            orderId = await CheckoutOrderPersistence.InsertOrderAsync(
                conn,
                tx,
                storeId,
                userId,
                userDetails,
                lines,
                subtotal,
                stripeSessionId: null,
                cancellationToken);

            var sessionService = new SessionService();
            var successUrl = $"{publicBase}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}";
            var cancelUrl = $"{publicBase}/checkout/cancel";
            var options = new SessionCreateOptions
            {
                Mode = "payment",
                ClientReferenceId = orderId.ToString(),
                SuccessUrl = successUrl,
                CancelUrl = cancelUrl,
                Metadata = new Dictionary<string, string>
                {
                    ["order_id"] = orderId.ToString("D"),
                },
                LineItems = lines.Select(static line => new SessionLineItemOptions
                {
                    Quantity = line.Quantity,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = "aud",
                        UnitAmount = ToAudCents(line.UnitPrice),
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name = line.Name,
                            Metadata = new Dictionary<string, string> { ["sku"] = line.Sku },
                        },
                    },
                }).ToList(),
            };

            Session session;
            try
            {
                session = await sessionService.CreateAsync(options, cancellationToken: cancellationToken);
            }
            catch (Stripe.StripeException ex)
            {
                _logger.LogError(ex, "Stripe session creation failed.");
                await tx.RollbackAsync(cancellationToken);
                return StatusCode(502, new { message = "Payment provider error. Try again later." });
            }

            await CheckoutOrderPersistence.UpdateOrderStripeSessionAsync(conn, tx, orderId, session.Id, cancellationToken);
            await tx.CommitAsync(cancellationToken);
            return Ok(new CreateCheckoutSessionResponse(session.Url ?? string.Empty));
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Checkout session failed.");
            throw;
        }
    }

    private static long ToAudCents(decimal aud)
    {
        return (long)Math.Round(aud * 100m, 0, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Stripe success/cancel URLs must point at the browser origin of the SPA.
    /// Order: PUBLIC_APP_BASE_URL → first CORS_ALLOWED_ORIGINS entry → http://localhost:5173 in Development only.
    /// </summary>
    private string? ResolvePublicAppBaseUrl()
    {
        var direct = _configuration["PUBLIC_APP_BASE_URL"]?.Trim().TrimEnd('/');
        if (!string.IsNullOrWhiteSpace(direct))
        {
            return direct;
        }

        var cors = _configuration["CORS_ALLOWED_ORIGINS"];
        if (!string.IsNullOrWhiteSpace(cors))
        {
            var first = cors
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .FirstOrDefault();
            var origin = first?.Trim().TrimEnd('/');
            if (!string.IsNullOrWhiteSpace(origin))
            {
                _logger.LogInformation("PUBLIC_APP_BASE_URL not set; using first CORS_ALLOWED_ORIGINS origin {Url}.", origin);
                return origin;
            }
        }

        if (_environment.IsDevelopment())
        {
            _logger.LogInformation(
                "PUBLIC_APP_BASE_URL not set; using Development default {Url}.",
                DefaultDevPublicAppBaseUrl);
            return DefaultDevPublicAppBaseUrl;
        }

        return null;
    }

    private static List<CheckoutSessionLineRequest> NormalizeCartItems(IReadOnlyList<CheckoutSessionLineRequest>? raw)
    {
        var rawItems = raw?.ToList() ?? new List<CheckoutSessionLineRequest>();
        return rawItems
            .GroupBy(static i => i.ProductId)
            .Select(static g => new CheckoutSessionLineRequest(g.Key, g.Sum(static x => x.Quantity)))
            .ToList();
    }
}
