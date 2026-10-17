# Architecture decisions

## ADR-001: Next.js App Router with TypeScript

**Decision:** Keep the chat, admin views, and HTTP endpoints in one typed Next.js application.

**Why:** The portfolio remains small to run and deploy while still separating browser code, API routes, and server-side services. **Trade-off:** A single application is not a substitute for a separately scaled production API.

## ADR-002: PostgreSQL full-text retrieval

**Decision:** Store Markdown chunks in PostgreSQL and query a generated English `tsvector` with stable source IDs.

**Why:** No vector service or external retrieval dependency is required; source IDs are auditable and the database is already part of the requested stack. **Trade-off:** Lexical ranking has lower semantic recall than embeddings and must refuse when evidence is weak.

## ADR-003: Provider interface and mock-first operation

**Decision:** Define a provider interface, use a deterministic mock by default, and offer Anthropic only through an explicit environment setting.

**Why:** CI and local development need to run without a key and produce reproducible results. **Trade-off:** Mock outputs do not represent Claude quality; provider-specific behavior requires separate evaluation.

## ADR-004: Model cannot call tools directly

**Decision:** Server code owns the allow-listed tool executor; the model receives retrieved evidence but no tool-calling capability.

**Why:** This bounds agency, keeps validation close to side effects, and makes payout estimates deterministic. **Trade-off:** The assistant does not autonomously chain tools; a user-facing estimate flow can call the calculation directly.

## ADR-005: Approval-gated human handoff

**Decision:** Create a handoff only through a separate confirmation UI and write the redacted ticket plus audit event in one transaction.

**Why:** Human oversight should be explicit and auditable. **Trade-off:** The demo has no employee identity, so the confirmation is not a production authorization decision.

## ADR-006: Redacted audit records

**Decision:** Persist redacted input and operational metadata, not raw user text or generated answer text.

**Why:** The audit trail supports traceability while minimizing stored sensitive content. **Trade-off:** Incident review cannot reconstruct the exact original user message; operational retention and access policies remain deployment responsibilities.

## ADR-007: No vector database or claim-system integration

**Decision:** Keep policy retrieval local and do not connect to real policy administration or claims systems.

**Why:** This is a synthetic portfolio project and must avoid real customer/company data. **Trade-off:** The assistant cannot verify an individual policy schedule or claim status.
