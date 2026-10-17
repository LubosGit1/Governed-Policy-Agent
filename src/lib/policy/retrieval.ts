export interface PolicySearchResult {
  sourceId: string;
  documentSlug: string;
  title: string;
  content: string;
  rank: number;
}

export interface Queryable {
  query<T extends object>(
    text: string,
    values: unknown[],
  ): Promise<{ rows: T[] }>;
}

export async function searchPolicyDocs(
  db: Queryable,
  query: string,
  limit = 5,
): Promise<PolicySearchResult[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 10) : 5;

  const result = await db.query<PolicySearchResult>(
    `SELECT source_id AS "sourceId",
            document_slug AS "documentSlug",
            title,
            content,
            ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS rank
       FROM policy_chunks
      WHERE search_vector @@ websearch_to_tsquery('english', $1)
      ORDER BY rank DESC, source_id ASC
      LIMIT $2`,
    [normalizedQuery, safeLimit],
  );
  return result.rows;
}
