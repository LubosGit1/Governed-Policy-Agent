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
    `WITH user_terms AS (
       SELECT websearch_to_tsquery('english', $1) AS exact_query,
              tsvector_to_array(to_tsvector('english', $1)) AS lexemes,
              to_tsquery(
                'english',
                array_to_string(tsvector_to_array(to_tsvector('english', $1)), ' | ')
              ) AS broad_query
     )
     SELECT policy_chunks.source_id AS "sourceId",
            policy_chunks.document_slug AS "documentSlug",
            policy_chunks.title,
            policy_chunks.content,
            ts_rank(policy_chunks.search_vector, user_terms.exact_query)
              + ts_rank(policy_chunks.search_vector, user_terms.broad_query) AS rank
       FROM policy_chunks
       CROSS JOIN user_terms
       CROSS JOIN LATERAL (
         SELECT COUNT(*)::int AS matched_count
           FROM unnest(user_terms.lexemes) AS tokens(lexeme)
          WHERE tokens.lexeme = ANY(tsvector_to_array(policy_chunks.search_vector))
            AND tokens.lexeme <> ALL(ARRAY[
              'policy', 'insur', 'cover', 'home', 'claim', 'damage', 'loss',
              'limit', 'deductible', 'property', 'term'
            ]::text[])
       ) AS matches
      WHERE policy_chunks.search_vector @@ user_terms.exact_query
         OR matches.matched_count >= 2
      ORDER BY (policy_chunks.search_vector @@ user_terms.exact_query) DESC,
               rank DESC,
               policy_chunks.source_id ASC
      LIMIT $2`,
    [normalizedQuery, safeLimit],
  );
  return result.rows;
}
