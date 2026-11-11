# AgentOS Architecture

AgentOS is a modular-monolith, multi-tenant SaaS. Next.js provides owner/client dashboards; FastAPI provides APIs, authentication boundary, agent orchestration and tools; PostgreSQL + pgvector stores tenant data and knowledge; Redis supports limits, cache and background jobs; provider adapters support OpenAI and Gemini; an embeddable widget connects client websites.

Every tenant-owned record carries `organization_id`. The API derives the organization from a verified session or validated public widget mapping. It never trusts an arbitrary organization ID supplied by a browser. RLS policies and tenant-scoped transactions must be added before multi-tenant routes are exposed.
