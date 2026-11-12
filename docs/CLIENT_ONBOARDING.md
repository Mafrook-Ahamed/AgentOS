# Client invitations and onboarding

## Admin setup

1. Deploy the dashboard with Vercel Root Directory `apps/dashboard`.
2. In Supabase Edge Function secrets, set:
   - `CLIENT_INVITE_REDIRECT_URL` = `https://YOUR-DEPLOYED-AGENTOS-DOMAIN/auth/callback`
   - Confirm the built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets are available to Edge Functions.
3. In Supabase Authentication > URL Configuration:
   - Set Site URL to the deployed AgentOS dashboard origin.
   - Add `https://YOUR-DEPLOYED-AGENTOS-DOMAIN/auth/callback` to Redirect URLs.
   - Add localhost callback URL for local development if needed.
4. In Authentication > Email Templates, ensure the Invite User template uses the supplied confirmation URL variable.
5. In Authentication > SMTP Settings, configure a production SMTP provider before sending real customer invitations. The built-in email service has strict sending limits and is not intended for production volume.

## Invite a client

1. Create and activate the client record in AgentOS.
2. In Clients, expand the client record and choose Invite a new client user.
3. Enter the user's email and role.
4. Supabase sends an invitation email. The client opens it and completes account setup.
5. The `/auth/callback` route exchanges the one-time auth code and routes the user to `/portal`.

Existing accounts should use the separate Grant portal access action.

## Security

- The `client-invite` Edge Function requires a valid JWT and checks `is_agentos_admin()`.
- Service-role operations stay inside the Edge Function.
- Membership is linked to the exact client ID selected by the admin.
- Client portal queries are constrained by membership and RLS.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in Vercel `NEXT_PUBLIC_*` variables or browser code.
