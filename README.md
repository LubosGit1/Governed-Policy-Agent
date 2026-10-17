# Policy Assistant

A governed AI assistant for fictional Nordlight Insurance employees to ask questions about synthetic home-insurance terms and claims.

> This project is under active development. The chat interface is a scaffold; responses and policy content are not yet implemented.

## Knowledge base

The repository includes nine fictional Markdown policy summaries in `knowledge-base/`. On startup, the Compose `seed` service chunks them into stable IDs such as `water-damage#001` and upserts them into PostgreSQL. PostgreSQL full-text search ranks matching chunks; it is not a semantic/vector search. All policy terms and amounts are synthetic and are not suitable for real coverage decisions.

For an existing local PostgreSQL instance, seed with:

```bash
DATABASE_URL=postgresql://policy:policy@localhost:5432/policy_assistant npm run db:seed
```

## Quick start

Requirements: Docker Compose.

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The initial scaffold does not require an API key. For local development, copy `.env.example` to `.env` and run `npm install && npm run dev`.

## Architecture

```mermaid
flowchart LR
    Employee --> Web[Next.js App Router]
    Web --> Assistant[Governed assistant service - planned]
    Assistant --> Provider[Provider interface - planned]
    Provider --> Mock[Deterministic mock - planned]
    Provider --> Claude[Optional Anthropic Claude - planned]
    Assistant --> DB[(PostgreSQL\npolicy full-text search)]
    Assistant --> Tools[Allow-listed tools - planned]
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

- Implemented: synthetic policy documents, PostgreSQL chunk schema and seeding, ranked full-text retrieval, PII redaction utility.
- Planned: cited assistant responses, provider adapters, validated tools, handoff approval, audit/admin, evaluation suite, security/API/E2E tests, and CI.

## How this was built

This portfolio project was built with an AI coding agent under the author's direction and review. The author is responsible for reviewing the implementation and understanding its design and limitations before presenting it.
