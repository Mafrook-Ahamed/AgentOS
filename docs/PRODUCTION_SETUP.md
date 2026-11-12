# AgentOS production setup checklist

## Vercel dashboard

Set the project root directory to `apps/dashboard` and configure these environment variables for Production (and Preview if you test there):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never prefix with `NEXT_PUBLIC_`
- `NEXT_PUBLIC_SITE_URL` — the canonical deployed origin, for example `https://your-agentos-domain.example`
- `RAZORPAY_KEY_ID` — use a Razorpay Test Mode key until end-to-end testing is complete
- `RAZORPAY_KEY_SECRET` — server-side only
- `RAZORPAY_WEBHOOK_SECRET` — the webhook signing secret configured in Razorpay

Redeploy after changing environment variables.

## Razorpay webhook

Configure this webhook URL in Razorpay:

`https://YOUR-AGENTOS-DOMAIN/api/razorpay/webhook`

Subscribe to `payment_link.paid`. Copy the webhook signing secret into `RAZORPAY_WEBHOOK_SECRET`. Do not use the API key secret as the webhook secret.

Use Test Mode first. Create a test invoice, generate a payment link, complete a test payment, and confirm that the webhook changes the invoice to paid and activates its linked subscription. Do not enable live payments until that test succeeds.

## Supabase Auth hardening (one dashboard-only setting)

In Supabase Dashboard → Authentication → Security and Protection, enable **Leaked Password Protection**. The connected Supabase management integration does not expose the Auth security configuration write operation, so this setting cannot be changed by the repository migration. Re-run Security Advisor afterwards and confirm the warning is gone.

## Edge Functions

The `agent-chat` and `client-link` functions require JWT verification. Their privileged database operations use the built-in `SUPABASE_SERVICE_ROLE_KEY` environment variable inside the Edge Function runtime. Never copy that key into browser code.

Optional AI provider secrets:
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

Client invitations additionally require `CLIENT_INVITE_REDIRECT_URL` set to the deployed `/auth/callback` URL and a configured SMTP provider.

## Intentional database restriction

`public.agent_widget_rate_limits` has RLS enabled, no client policies, and grants only to `service_role`. The Security Advisor's informational "RLS Enabled No Policy" notice is intentional: browser and authenticated client roles must not read or modify rate-limit state.
