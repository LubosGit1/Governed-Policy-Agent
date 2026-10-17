import type { PolicySearchResult } from "../policy/retrieval";

export interface Citation {
  sourceId: string;
  title: string;
}

export function validateCitations(
  citationIds: string[],
  retrievedChunks: PolicySearchResult[],
): { valid: boolean; citations: Citation[] } {
  const retrievedById = new Map(retrievedChunks.map((chunk) => [chunk.sourceId, chunk]));
  const uniqueIds = [...new Set(citationIds)];
  const valid = uniqueIds.every((sourceId) => retrievedById.has(sourceId));

  return {
    valid,
    citations: valid
      ? uniqueIds.map((sourceId) => {
        const chunk = retrievedById.get(sourceId)!;
        return { sourceId: chunk.sourceId, title: chunk.title };
      })
      : [],
  };
}
