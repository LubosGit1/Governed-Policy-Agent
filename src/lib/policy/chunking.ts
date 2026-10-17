export interface PolicyChunk {
  sourceId: string;
  documentSlug: string;
  title: string;
  content: string;
}

const DEFAULT_MAX_CHARS = 700;

export function chunkPolicyDocument(
  documentSlug: string,
  title: string,
  markdown: string,
  maxChars = DEFAULT_MAX_CHARS,
): PolicyChunk[] {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(documentSlug)) {
    throw new Error("Document slug must be lowercase kebab-case.");
  }
  if (!Number.isInteger(maxChars) || maxChars < 100) {
    throw new Error("Chunk size must be an integer of at least 100 characters.");
  }

  const paragraphs = markdown
    .replace(/^#\s+.*(?:\r?\n|$)/, "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const pieces = paragraph.length > maxChars
      ? paragraph.match(new RegExp(`.{1,${maxChars}}`, "g")) ?? []
      : [paragraph];

    for (const piece of pieces) {
      const combined = current ? `${current} ${piece}` : piece;
      if (combined.length > maxChars && current) {
        chunks.push(current);
        current = piece;
      } else {
        current = combined;
      }
    }
  }
  if (current) chunks.push(current);

  return chunks.map((content, index) => ({
    sourceId: `${documentSlug}#${String(index + 1).padStart(3, "0")}`,
    documentSlug,
    title,
    content,
  }));
}
