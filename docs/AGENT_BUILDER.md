# AgentOS Agent Builder

## Included
- Admin-only agent creation and configuration.
- Client assignment, OpenAI and Gemini model selection.
- System instructions, temperature, welcome message and output token limit.
- Private test chat with persistent conversations and messages.
- Per-response token usage records.
- Row Level Security on agents, conversations, messages and usage.

## Provider secrets
Set `OPENAI_API_KEY` and/or `GEMINI_API_KEY` in Supabase Dashboard → Edge Functions → Secrets. Never put provider keys in browser code, NEXT_PUBLIC variables, or Git.

## Current scope
This is the admin-side agent builder and test runtime. Public website widgets, tenant user accounts, knowledge-base ingestion/RAG, tool calling, human approval flows, budgets, billing and production rate limiting are separate milestones.
