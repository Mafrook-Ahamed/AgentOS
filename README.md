# AgentOS

AgentOS is a multi-tenant AI agent management platform. This repository contains the Next.js admin dashboard, Supabase Edge Functions, database migrations, and the optional Python API foundation.

## Current deployable application

The dashboard is the primary application and can be deployed independently to Vercel.

- **Dashboard:** Next.js 15, React 19, TypeScript (apps/dashboard)
- **Authentication and database:** Supabase Auth + Postgres with Row Level Security
- **Agent runtime:** Supabase Edge Function at supabase/functions/agent-chat
- **AI providers:** OpenAI and Gemini, configured as Supabase Edge Function secrets
- **Optional API foundation:** FastAPI in apps/api; it is not required to deploy or run the current dashboard and agent chat flow.

## Deploy the dashboard to Vercel

1. Import this GitHub repository: https://github.com/Mafrook-Ahamed/AgentOS
2. In Vercel, set **Root Directory** to apps/dashboard.
3. Keep **Framework Preset** as Next.js.
4. Use npm install as the install command and npm run build as the build command. Leave the output directory at its Next.js default.
5. Add these Environment Variables for Production, Preview, and Development:

   - NEXT_PUBLIC_SUPABASE_URL=https://qisthhtqtvgvmhvqzsbx.supabase.co
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

6. Deploy.

The publishable key is intended for browser use. Never add a Supabase service-role key or OpenAI/Gemini API key to a NEXT_PUBLIC variable or client-side code.

## Configure the agent runtime

The dashboard calls the deployed Supabase Edge Function named agent-chat. Configure provider keys in the Supabase project's Edge Function Secrets:

- OPENAI_API_KEY
- GEMINI_API_KEY

Only configure the provider(s) you intend to use. These secrets stay in Supabase and are not exposed to the browser.

The Supabase database migrations are in infrastructure/migrations. The agent chat function is in supabase/functions/agent-chat.

## Local dashboard development

From apps/dashboard, run npm install and npm run dev.

Create apps/dashboard/.env.local with the two Supabase public environment variables shown above.

## Repository layout

- apps/dashboard — Next.js AgentOS admin dashboard (Vercel root)
- apps/api — Optional FastAPI foundation
- supabase/functions/agent-chat — Authenticated AI agent execution
- infrastructure/migrations — Supabase database schema and RLS policies
- docs — Architecture, security, and feature documentation

## Current scope

The current dashboard supports admin authentication, client management, agent creation/configuration, agent status management, and private agent test conversations. Tenant-facing portals, public website embeds, knowledge-base/RAG, workflow tools, billing, and production rate limiting are future milestones. This is not yet a complete production SaaS release.
