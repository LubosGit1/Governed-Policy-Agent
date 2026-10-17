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
