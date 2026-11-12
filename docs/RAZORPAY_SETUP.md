# Razorpay payment integration

AgentOS supports invoice payment links through Razorpay Standard Payment Links.

## Required Vercel environment variables

Set these for the dashboard deployment (Production and Preview only if using test credentials there):

- `RAZORPAY_KEY_ID` — Razorpay API key ID.
- `RAZORPAY_KEY_SECRET` — Razorpay API key secret. Server-side only.
- `RAZORPAY_WEBHOOK_SECRET` — webhook signing secret configured in Razorpay.
- `NEXT_PUBLIC_SITE_URL` — canonical deployed dashboard origin, for example `https://agentos.example.com`.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key for the webhook route only. Never use a `NEXT_PUBLIC_` prefix and never commit it.

The existing Supabase URL and publishable key variables must also be configured.

## Razorpay dashboard setup

1. Start with Razorpay Test Mode and generate a test Key ID and Key Secret.
2. Add the environment variables in Vercel and redeploy.
3. Configure a webhook endpoint:
   `https://YOUR-DOMAIN/api/razorpay/webhook`
4. Set the webhook secret to the same value as `RAZORPAY_WEBHOOK_SECRET`.
5. Subscribe to the `payment_link.paid` event.
6. Use a test invoice and complete a test payment.
7. Confirm the webhook is delivered and the invoice becomes Paid.
8. Only switch to Live Mode after end-to-end tests and Razorpay account activation.

## Flow

- An authenticated AgentOS administrator creates a payment link from Billing.
- The server loads the invoice amount and currency from Supabase; the browser cannot set the amount.
- Razorpay sends the customer to its hosted payment page.
- The return page is informational only. It does not mark invoices as paid.
- The webhook verifies the HMAC signature over the exact raw request body.
- The invoice is marked Paid only when the webhook event is `payment_link.paid` and the captured payment amount and currency match the invoice.

## Important limitations

- Payment links are created by an administrator from the Billing workspace.
- Invoice status reconciliation is webhook-driven; a payment return URL is not proof of payment.
- Automatic recurring subscription charges, refunds, GST/tax calculation, invoice PDF generation and subscription dunning are not implemented.
- Keep Razorpay Test Mode enabled until the webhook and invoice reconciliation are verified.
