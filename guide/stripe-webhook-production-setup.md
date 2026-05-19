# Stripe webhooks in production (Container Apps)

Stripe notifies your API when checkout completes. The handler lives at:

`POST https://<YOUR-API-FQDN>/api/webhooks/stripe`

Implementation: [`StripeWebhookController.cs`](../backend/Controllers/StripeWebhookController.cs)  
Raw body buffering: [`Program.cs`](../backend/Program.cs) (middleware for `/api/webhooks/stripe`).

## Prerequisites

- API deployed with HTTPS — [azure-container-apps-deploy.md](./azure-container-apps-deploy.md)
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` set on the **api** Container App
- `PUBLIC_APP_BASE_URL` = storefront URL (for checkout redirect, not webhook)

## 1. Stripe Dashboard — create endpoint

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks** → **Add endpoint**.  
2. **Endpoint URL:**  
   `https://YOUR-API-FQDN/api/webhooks/stripe`  
   Example: `https://api-multistore.australiaeast.azurecontainerapps.io/api/webhooks/stripe`  
3. **Events to send** (minimum for this codebase):  
   - `checkout.session.completed`  
4. Create endpoint → reveal **Signing secret** (`whsec_...`).  

## 2. Configure API secrets

On the **api** Container App:

```env
STRIPE_SECRET_KEY=sk_test_...   # or sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart or create new revision after changing secrets.

## 3. How it works in your app

1. Customer pays via Stripe Checkout (session created by [`CheckoutController`](../backend/Controllers/CheckoutController.cs)).  
2. Stripe POSTs signed JSON to `/api/webhooks/stripe`.  
3. API verifies `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`.  
4. On `checkout.session.completed`, order is marked paid, stock/voucher logic runs, optional email via ACS.  
5. Events are logged in `app.webhook_events` (idempotent on `event_key`).  

If secrets are missing, endpoint returns **503** (Stripe will retry).

## 4. Test locally (Docker or dev)

Install [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe login
stripe listen --forward-to http://localhost:8080/api/webhooks/stripe
```

Copy the webhook signing secret the CLI prints → set `STRIPE_WEBHOOK_SECRET` in `.env` / Compose.

Trigger test event:

```bash
stripe trigger checkout.session.completed
```

With Docker Compose (API on 8080):

```bash
stripe listen --forward-to http://localhost:8080/api/webhooks/stripe
```

## 5. Test in production

1. Complete a **test mode** checkout on the deployed storefront.  
2. Stripe Dashboard → **Webhooks** → your endpoint → **Recent deliveries** → should show `200`.  
3. Verify order status in database / dashboard.  

## 6. Security checklist

| Item | Status |
|------|--------|
| HTTPS only on API ingress | Required |
| Webhook signature verification | Implemented in controller |
| Do not expose webhook URL on `web` nginx only — must hit **api** app | Important |
| Use separate test/live secrets per Stripe mode | Recommended |
| Rotate `STRIPE_WEBHOOK_SECRET` if leaked | Stripe Dashboard → roll secret |

## 7. Automation / downtime

When [Automation scales API to zero](./azure-automation-start-stop.md), webhooks receive connection errors. Stripe retries for up to ~3 days. For production:

- Do not scale `api` to zero if you accept live payments, **or**  
- Pause Stripe endpoint during maintenance, **or**  
- Use `MAINTENANCE_MODE` instead of scale-to-zero during short deploys.  

## 8. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `400` Invalid signature | Wrong `STRIPE_WEBHOOK_SECRET`; body altered by proxy — ensure raw body reaches API |
| `503` from API | Missing `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` |
| `200` but order not paid | Check `app.webhook_events` and API logs in [Log Analytics](./azure-monitor-log-analytics.md) |
| Webhook URL points to web FQDN | Must be **api** Container App FQDN |

## Related

- [docker-local-and-compose.md](./docker-local-and-compose.md) — local stack  
- [azure-container-apps-deploy.md](./azure-container-apps-deploy.md) — API ingress and env vars  
