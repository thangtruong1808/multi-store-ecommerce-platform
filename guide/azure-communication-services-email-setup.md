# Azure Communication Services — password reset email

This guide explains how to configure Azure Communication Services (ACS) Email so the API can send password-reset links. Tokens are stored in PostgreSQL `app.auth_password_reset_tokens`; the email contains a link to your SPA.

## Prerequisites

- An [Azure](https://portal.azure.com) subscription
- Backend and frontend running locally (or deployed)
- `PUBLIC_APP_BASE_URL` set to the URL users open in the browser (e.g. `http://localhost:5173`)

## 1. Create a Communication Services resource

1. In Azure Portal, search **Communication Services** → **Create**.
2. Choose a resource group, name, and region.
3. After deployment, open the resource → **Keys** → copy **Connection string** (primary).

## 2. Email Communication Services domain

1. Create an **Email Communication Services** resource (or use the wizard from your Communication Services resource).
2. Add and **verify** a custom domain, or use the Azure-managed domain for testing.
3. In Communication Services → **Email** → **Domains**, connect your verified domain.
4. Note the **MailFrom** address you are allowed to send from (e.g. `DoNotReply@yourdomain.com`).

## 3. Backend environment

Add to `backend/.env` (never commit this file):

```env
ACS_EMAIL_ENABLED=true
ACS_EMAIL_CONNECTION_STRING=endpoint=https://....communication.azure.com/;accesskey=...
ACS_EMAIL_SENDER_ADDRESS=DoNotReply@yourdomain.com
PASSWORD_RESET_TOKEN_MINUTES=30

PUBLIC_APP_BASE_URL=http://localhost:5173
```

`PUBLIC_APP_BASE_URL` must match the SPA origin (no trailing slash). Reset links are built as:

`{PUBLIC_APP_BASE_URL}/reset-password/confirm?token=...`

## 4. Verify locally

1. Run the database migration for `app.auth_password_reset_tokens` if you have not already (see `database/migrations/`).
2. Restart the backend after changing `.env`.
3. Open `/reset-password`, enter an email for an existing user.
4. Check the inbox (and spam). Click the link → set a new password → sign in.

## 5. Production (e.g. Railway)

Set the same variables on the API service. Set `PUBLIC_APP_BASE_URL` to your production SPA URL (e.g. `https://your-app.up.railway.app` or your custom domain).

Ensure CORS on the API allows your SPA origin.

## 6. Local dev without ACS

Set `ACS_EMAIL_ENABLED=false`. Password reset requests return `503` with a message that email is not configured.

## Security notes

- Do not commit `backend/.env` or ACS connection strings to Git.
- Rotate ACS keys if they are exposed.
- Reset tokens expire after `PASSWORD_RESET_TOKEN_MINUTES` (default 30).
- The API always returns a generic success message on request to avoid email enumeration.

## Local notes (gitignored)

Copy this file to `guide/azure-communication-services-email-setup.local.md` and add account-specific values. That path is listed in `.gitignore`.
