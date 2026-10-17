CREATE TABLE IF NOT EXISTS policy_chunks (
    source_id TEXT PRIMARY KEY,
    document_slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english'::regconfig, title || ' ' || content)
    ) STORED,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS policy_chunks_search_idx
    ON policy_chunks USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS assistant_audit_logs (
    request_id UUID PRIMARY KEY,
    redacted_input TEXT NOT NULL,
    retrieved_chunk_ids TEXT[] NOT NULL,
    tool_calls TEXT[] NOT NULL,
    approvals TEXT[] NOT NULL,
    model TEXT NOT NULL,
    latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
    input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
    refused BOOLEAN NOT NULL,
    escalation_offered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE assistant_audit_logs
    ADD COLUMN IF NOT EXISTS escalation_offered BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS assistant_audit_logs_created_at_idx
    ON assistant_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS handoff_tickets (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redacted_question TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'closed')),
    approval_method TEXT NOT NULL CHECK (approval_method = 'explicit-ui'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    key_hash TEXT PRIMARY KEY,
    window_started_at TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0)
);
