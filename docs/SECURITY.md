# Security model

## Scope and trust boundaries

This is a portfolio demonstration, not an insurer production system. The only policy material is fictional and checked into `knowledge-base/`. The main assets are the approved policy summaries, the admin credential, and the redacted audit trail. Trust boundaries are the employee's browser, the Next.js API, PostgreSQL, and the optional Anthropic API.

The user question, retrieved chunks, and model output are all treated as untrusted. The model receives only a PII-redacted question and retrieved policy excerpts; it has no database credentials, network tools, or direct write access. Server code owns retrieval and tool execution. The mock provider is the default.

## Mitigations in this repository

| Risk | Control in code | Remaining limitation |
|---|---|---|
| Prompt injection in user text | High-signal instruction-override patterns are refused before retrieval; the Anthropic system instruction also treats questions and evidence as data. | Pattern matching is incomplete. Prompt injection is not solved by a system prompt alone. |
| Instructions embedded in retrieved text | Evidence is passed as JSON data and the provider is explicitly told to ignore instructions inside it. The model can cite only retrieved source IDs. | A compromised policy file could still contain persuasive text; review and version approved content. |
| PII disclosure | Email, phone, IBAN, and Czech birth-number patterns are redacted before search/model input and before audit/ticket writes. | Detection is pattern-based and can miss variants; do not submit sensitive claim details. |
| Unsupported answers | PostgreSQL full-text retrieval is the only evidence source. No evidence or invalid citations produces a refusal and human-review offer. | Search quality is lexical, not semantic; summaries may omit full contract wording. |
| Excessive agency / tool misuse | Server-side Zod schemas, an allow-list, a four-call tool executor cap, and deterministic payout calculation. The model is not given callable tools. | This demo has no employee identity or role-based access control for chat. |
| Unapproved handoff | Ticket creation requires `approved: true`, same-origin POST, and a UI confirmation step; creation and its audit event use one database transaction. | Same-origin and a browser button are not proof of employee identity. Production needs authenticated sessions and server-verifiable approval. |
| Admin data disclosure | Admin metrics and CSV APIs require an `ADMIN_API_KEY`-backed HttpOnly, SameSite=Strict cookie. The key is compared in constant time. | A shared key is a demo-only control; use SSO, individual roles, and key rotation in production. |
| Resource exhaustion | PostgreSQL-backed per-client rate-limit buckets and request-size/field bounds on chat. | Correct client-IP handling depends on a trusted reverse proxy. Configure rate-limit values and review database capacity. |
| CSV formula injection | Exported cells beginning with spreadsheet formula characters are escaped. | CSV is limited to the latest 10,000 audit rows. |
| Secrets and dependencies | Secrets are environment-only; `.env` is ignored, `.env.example` contains placeholders, and `npm audit` is part of validation. | Operators must rotate credentials and keep runtime images/dependencies current. |

## OWASP Top 10 for LLM Applications mapping

The mapping uses the current LLM application risk themes. Some risks are only partially applicable because this prototype has no training pipeline, vector database, or autonomous web browsing.

| LLM risk | Relevant mitigation / status |
|---|---|
| LLM01 Prompt Injection | User pattern guardrail, untrusted-context instructions, fixed system prompt, and injection regression cases. Not a complete detector. |
| LLM02 Sensitive Information Disclosure | PII redaction before provider and logs; synthetic policy data; no raw question in audit. |
| LLM03 Supply Chain | Lockfile, dependency audit, provider isolation, and CI. Model/provider changes require review. |
| LLM04 Data and Model Poisoning | No training. Policy Markdown is reviewed, synthetic, and treated as untrusted at inference. Repository write access remains a trust boundary. |
| LLM05 Improper Output Handling | Model response is schema-parsed; citations are validated against retrieved source IDs; UI renders text, not HTML. |
| LLM06 Excessive Agency | No model-invoked tool-calling loop; narrow server allow-list and four-step cap; human approval for ticket creation. |
| LLM07 System Prompt Leakage | The assistant refuses requests to reveal prompts and does not treat disclosure requests as policy questions. Prompts are not secrets and cannot be guaranteed confidential. |
| LLM08 Vector and Embedding Weaknesses | No embeddings/vector store are used. PostgreSQL full-text search is parameterized, ranked, and returns stable chunk IDs. |
| LLM09 Misinformation | Answer only from retrieved chunks, validate citations, refuse without evidence, and offer a human review. Coverage remains a claims-team decision. |
| LLM10 Unbounded Consumption | Input limits, bounded retrieval, rate limits, one bounded model response, and no autonomous recursion. |

## OWASP API Security Top 10 (2023) mapping

| API risk | Relevant mitigation / status |
|---|---|
| API1 Broken Object Level Authorization | No user-addressable claim or ticket read endpoint exists. Admin audit access is protected. |
| API2 Broken Authentication | Admin API uses a configured secret in an HttpOnly cookie; chat has no employee authentication and must not be exposed as an internal production service without SSO. |
| API3 Broken Object Property Level Authorization | Zod `.strict()` schemas reject unexpected request properties; admin responses expose only audit fields. |
| API4 Unrestricted Resource Consumption | PostgreSQL-backed rate limits, request/field limits, bounded results and bounded CSV export. |
| API5 Broken Function Level Authorization | Admin data and export endpoints check the admin session; there are no user roles yet. |
| API6 Unrestricted Access to Sensitive Business Flows | Handoff requires an explicit approval step and is separately audited; production must bind approval to an authenticated employee. |
| API7 Server Side Request Forgery | The app does not fetch user-supplied URLs. Provider calls use a fixed Anthropic endpoint. |
| API8 Security Misconfiguration | `.env.example`, non-secret defaults, same-origin checks, secure production cookies, and security documentation. Deployment headers/network policies still need production hardening. |
| API9 Improper Inventory Management | The Postman collection and this document enumerate the current endpoints; CI exercises them. |
| API10 Unsafe Consumption of APIs | Anthropic responses are treated as untrusted JSON, parsed and citation-checked; provider failures do not produce success-shaped fallbacks. |

## Operational checklist

- Keep `.env` out of version control and set strong, distinct `ADMIN_API_KEY` and `RATE_LIMIT_HASH_SECRET` values.
- Put the application behind an authenticated employee gateway before using real data.
- Use TLS and a trusted reverse proxy; configure trusted client-IP forwarding.
- Back up PostgreSQL with access controls and an explicit retention/deletion policy.
- Review synthetic policy changes and rerun the evaluation before release.
- Treat a human handoff as a request for review, not a claim acceptance or payment decision.
