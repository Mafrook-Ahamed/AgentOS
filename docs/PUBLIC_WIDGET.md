# AgentOS Public Website Chat Widget

## Architecture

- Dashboard admins issue a random widget token for an active agent.
- Only the SHA-256 token hash is stored in `public.agent_widgets`.
- The embed script is served from the AgentOS dashboard at `/widget.js`.
- The browser sends the token and message to the Supabase `public-chat` Edge Function.
- The function checks the token, exact browser Origin, agent status and a per-token/IP rate limit before calling the configured AI provider.
- Conversation and message writes use the server-side Supabase service-role key. Never expose this key to the browser.

## Setup

1. Ensure the Supabase Edge Function environment has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the provider key required by the agent (`OPENAI_API_KEY` or `GEMINI_API_KEY`). Supabase normally provides its project URL and service-role key to Edge Functions; verify them in Edge Function secrets without copying them into the dashboard.
2. Deploy the dashboard from the repository root with Vercel Root Directory `apps/dashboard`.
3. Set the agent status to **Active**.
4. Open the agent detail page. Under **Website chat widget**, enter the website origin exactly, for example `https://client.example`, then choose **Enable widget**.
5. Copy the embed snippet immediately. The raw widget token is shown once. It is not retrievable later; rotate the key to issue a replacement.
6. Paste the snippet before the closing `</body>` tag on the client website.

## Security controls

- Widget token is generated with 256 bits of randomness and stored only as a SHA-256 hash.
- Exact Origin allowlist is enforced server-side; CORS is not treated as authentication.
- Requests are rate-limited to 30 messages per minute per token/IP bucket.
- The widget only serves agents in the active state.
- Public conversation records have a null `created_by`; no end-user auth identity is fabricated.
- Disable the widget in AgentOS to revoke its token immediately. Rotating the token invalidates the previous one.
- Do not put provider keys or Supabase service-role keys in the embed snippet or client website.

## Limitations of this first version

- Text chat only; no streaming, file upload, human handoff, or analytics UI yet.
- Browser Origin checks deter casual cross-site use but are not a substitute for rate limits and monitoring. Non-browser clients can spoof Origin; keep token rotation and rate limiting enabled.
- The widget uses the active agent's configured provider and model. Knowledge retrieval runs when the client has indexed documents and the OpenAI embedding key is configured.
