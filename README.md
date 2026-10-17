# Policy Assistant

A governed AI assistant for fictional Nordlight Insurance employees to ask questions about synthetic home-insurance terms and claims.

> This project is under active development. The chat API and core safety services are implemented; the chat UI and remaining governance surfaces are still in progress.

## Knowledge base

The repository includes nine fictional Markdown policy summaries in `knowledge-base/`. On startup, the Compose `seed` service chunks them into stable IDs such as `water-damage#001` and upserts them into PostgreSQL. PostgreSQL full-text search ranks matching chunks; it is not a semantic/vector search. All policy terms and amounts are synthetic and are not suitable for real coverage decisions.

For an existing local PostgreSQL instance, seed with:

```bash
DATABASE_URL=postgresql://policy:policy@localhost:5432/policy_assistant npm run db:seed
```

The default `LLM_PROVIDER=mock` needs no API key. To use Claude, configure `LLM_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, and optionally `ANTHROPIC_MODEL` in `.env`, then restart Compose. Claude API usage is billed separately from a Claude Max subscription.

## Quick start

Requirements: Docker Compose.

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The assistant uses the mock provider by default and does not require an API key. To enable admin access, copy `.env.example` to `.env`, replace `ADMIN_API_KEY` and `RATE_LIMIT_HASH_SECRET` with long random values, and restart Compose. For local development, run `npm install && npm run dev`.

## Architecture

```mermaid
flowchart LR
    Employee --> Web[Next.js App Router]
    Web --> Assistant[Governed assistant service]
    Assistant --> Provider[Provider interface]
    Provider --> Mock[Deterministic mock]
    Provider --> Claude[Optional Anthropic Claude]
    Assistant --> DB[(PostgreSQL\npolicy search + audit)]
    Assistant --> Tools[Allow-listed tools]
    Tools --> Approval[Human approval for handoff - planned]
```

## Development

```bash
npm test
npm run lint
npm run type-check
npm run build
```

## Implementation status

- Implemented: synthetic policy documents, PostgreSQL chunk schema and seeding, ranked full-text retrieval, PII redaction, mock/Claude provider adapters, grounded assistant API, citation validation, audit persistence, injection refusal, validated allow-listed tools, approval-gated handoff, chat UI, and admin metrics/CSV.
- Planned: evaluation suite, API/E2E/security tests, governance docs, and CI.

## How this was built

This portfolio project was built with an AI coding agent under the author's direction and review. The author is responsible for reviewing the implementation and understanding its design and limitations before presenting it.
