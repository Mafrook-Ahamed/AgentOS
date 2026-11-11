# AgentOS

Multi-tenant AI Agent Management Platform.

## Milestone 0: Foundation

FastAPI bootstrap, environment-based configuration, health/readiness endpoints, OpenAI and Gemini provider adapters, PostgreSQL + pgvector and Redis development services, and an initial tenant schema foundation.

This is a development scaffold, not a production-ready SaaS release. Authentication, tenant membership enforcement, full RLS policies, agent execution, and billing are later milestones.

## Setup

- Python 3.11+
- Copy `.env.example` to `.env`.
- Install: `pip install -e ".[dev]"`
- Start infrastructure: `docker compose up -d`
- Run API: `uvicorn app.main:app --reload --app-dir apps/api`
- API docs: `http://127.0.0.1:8000/docs`

Never commit `.env` or secrets. Do not use a database superuser or service-role key for normal tenant queries.
