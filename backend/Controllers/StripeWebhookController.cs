using System.Text;
using backend.Checkout;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using NpgsqlTypes;
using Stripe;
using Stripe.Checkout;

namespace backend.Controllers;

[ApiController]
[Route("api/webhooks/stripe")]
public sealed class StripeWebhookController : ControllerBase
{
    private readonly NpgsqlDataSource _dataSource;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(
        NpgsqlDataSource dataSource,
        IConfiguration configuration,
        ILogger<StripeWebhookController> logger)
    {
        _dataSource = dataSource;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Handle(CancellationToken cancellationToken)
    {
        var secret = _configuration["STRIPE_SECRET_KEY"];
        var webhookSecret = _configuration["STRIPE_WEBHOOK_SECRET"];
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(webhookSecret))
        {
            return StatusCode(503);
        }

        StripeConfiguration.ApiKey = secret;

        Request.Body.Position = 0;
        using var reader = new StreamReader(Request.Body, Encoding.UTF8, leaveOpen: true);
        var json = await reader.ReadToEndAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(json))
        {
            return BadRequest();
        }

        if (!Request.Headers.TryGetValue("Stripe-Signature", out var sigHdr))
        {
            return BadRequest();
        }

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(json, sigHdr, webhookSecret, throwOnApiVersionMismatch: false);
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Invalid Stripe webhook signature.");
            return BadRequest();
        }

        await using var conn = await _dataSource.OpenConnectionAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        Guid? webhookRowId;
        await using (var ins = conn.CreateCommand())
        {
            ins.Transaction = tx;
            ins.CommandText = """
                              INSERT INTO app.webhook_events (provider, event_type, event_key, payload, status)
                              VALUES ('stripe', @etype, @ekey, @payload::jsonb, 'pending')
                              ON CONFLICT (provider, event_key) DO NOTHING
                              RETURNING id;
                              """;
            ins.Parameters.AddWithValue("etype", stripeEvent.Type);
            ins.Parameters.AddWithValue("ekey", stripeEvent.Id);
            ins.Parameters.Add(new NpgsqlParameter("payload", NpgsqlDbType.Jsonb) { Value = json });
            var raw = await ins.ExecuteScalarAsync(cancellationToken);
            webhookRowId = raw is Guid g ? g : null;
        }

        if (webhookRowId is null)
        {
            await tx.CommitAsync(cancellationToken);
            return Ok();
        }

        try
        {
            if (stripeEvent.Type == "checkout.session.completed")
            {
                if (stripeEvent.Data.Object is not Session session)
                {
                    _logger.LogWarning("Checkout session completed payload was not a Session.");
                }
                else
                {
                    await ProcessCheckoutSessionCompletedAsync(conn, tx, session, cancellationToken);
                }
            }

            await using (var upd = conn.CreateCommand())
            {
                upd.Transaction = tx;
                upd.CommandText = """
                                  UPDATE app.webhook_events
                                  SET status = 'processed',
                                      processed_at = NOW()
                                  WHERE id = @id;
                                  """;
                upd.Parameters.AddWithValue("id", webhookRowId.Value);
                await upd.ExecuteNonQueryAsync(cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Stripe webhook processing failed.");
            throw;
        }

        return Ok();
    }

    private async Task ProcessCheckoutSessionCompletedAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        Session session,
        CancellationToken ct)
    {
        string? orderIdStr = null;
        if (session.Metadata is not null && session.Metadata.TryGetValue("order_id", out var fromMeta))
        {
            orderIdStr = fromMeta;
        }
        else if (!string.IsNullOrEmpty(session.ClientReferenceId))
        {
            orderIdStr = session.ClientReferenceId;
        }

        if (string.IsNullOrEmpty(orderIdStr) || !Guid.TryParse(orderIdStr, out var orderId))
        {
            _logger.LogWarning("Checkout session missing order_id metadata or client reference.");
            return;
        }

        var sessionId = session.Id;
        var paymentIntentId = session.PaymentIntentId;

        await using (var load = conn.CreateCommand())
        {
            load.Transaction = tx;
            load.CommandText = """
                               SELECT store_id
                               FROM app.orders
                               WHERE id = @oid
                               LIMIT 1;
                               """;
            load.Parameters.AddWithValue("oid", orderId);
            var storeObj = await load.ExecuteScalarAsync(ct);
            if (storeObj is null or DBNull)
            {
                _logger.LogWarning("Order {OrderId} not found for Stripe session.", orderId);
                return;
            }

            var storeId = (Guid)storeObj;
            var ok = await CheckoutOrderPersistence.TryCompletePaidOrderAsync(
                conn,
                tx,
                orderId,
                sessionId,
                paymentIntentId,
                ct);

            if (ok)
            {
                await CheckoutStock.ApplyStockOutForOrderAsync(conn, tx, orderId, storeId, ct);
            }
        }
    }
}
