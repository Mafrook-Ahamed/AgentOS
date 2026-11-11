# AgentOS Security Baseline

1. Verify user JWTs server-side.
2. Resolve organization membership server-side.
3. Scope every tenant query to the resolved organization.
4. Enable PostgreSQL RLS for tenant-owned tables.
5. Use a restricted runtime DB role; never use a DB superuser or Supabase service-role key for normal tenant operations.
6. Store provider/integration secrets server-side, encrypted at rest.
7. Store only hashes of API/widget secrets where practical.
8. Apply per-tenant and per-IP rate limits.
9. Allowlist agent tools and validate arguments with typed schemas.
10. Require human approval for consequential actions such as bookings, payments, refunds or sensitive messages.
11. Treat documents and retrieved passages as untrusted input.
12. Audit administrative changes and tool executions.
13. Back up data and test restoration.
