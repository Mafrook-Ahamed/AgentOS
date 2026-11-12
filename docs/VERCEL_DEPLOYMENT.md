# Vercel deployment: AgentOS dashboard

This repository is already a single Git repository containing both the AgentOS dashboard and its supporting services. Do not create a separate dashboard repository.

## Vercel project settings

| Setting | Value |
|---|---|
| Git repository | Mafrook-Ahamed/AgentOS |
| Production branch | main |
| Root Directory | apps/dashboard |
| Framework Preset | Next.js |
| Install Command | npm install |
| Build Command | npm run build |
| Output Directory | Default (leave blank) |

Enable "Include files outside the Root Directory in the Build Step" only if Vercel reports that a required file outside apps/dashboard is needed. The current dashboard imports its runtime code from within its own directory, so this should not normally be necessary.

## Environment variables

Set for Production, Preview, and Development:

- NEXT_PUBLIC_SUPABASE_URL: Supabase project URL.
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Supabase publishable key.

Use the existing values from apps/dashboard/.env.example and the Supabase project settings. Do not commit .env.local.

Never put the Supabase service-role key, OPENAI_API_KEY, or GEMINI_API_KEY in a NEXT_PUBLIC variable. The AI provider keys belong in Supabase Edge Function Secrets.

## Runtime topology

Browser -> AgentOS Next.js dashboard (Vercel)
Dashboard -> Supabase Auth and Postgres
Dashboard -> Supabase Edge Function: agent-chat
agent-chat -> OpenAI API and/or Gemini API (provider keys stored in Supabase)

Optional FastAPI foundation: apps/api (not needed for this deployment).

Vercel hosts the dashboard only. Supabase continues to host the database, authentication, and agent execution. The Python API is not part of the current dashboard request path.

## Before declaring deployment complete

- Confirm the Vercel build succeeds.
- Confirm admin login works on the deployed domain.
- Add the deployed Vercel domain to Supabase Auth's allowed redirect URLs (and Site URL as appropriate).
- Confirm the admin user is present in public.agentos_admins.
- Configure the required provider secret in Supabase.
- Test creating a client, creating an agent, and sending a test chat message.

A successful Vercel build alone does not prove the AI runtime works. Test the full flow after deployment.
