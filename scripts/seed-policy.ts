import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { chunkPolicyDocument } from "../src/lib/policy/chunking";

const knowledgeBasePath = fileURLToPath(new URL("../knowledge-base/", import.meta.url));
const schemaPath = fileURLToPath(new URL("../db/schema.sql", import.meta.url));
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set to seed the policy knowledge base.");
}

const pool = new Pool({ connectionString });

try {
  await pool.query(await readFile(schemaPath, "utf8"));
  const files = (await readdir(knowledgeBasePath))
    .filter((file) => file.endsWith(".md"))
    .sort();
  let chunkCount = 0;

  for (const file of files) {
    const documentSlug = file.slice(0, -".md".length);
    const markdown = await readFile(join(knowledgeBasePath, file), "utf8");
    const title = markdown.match(/^#\s+(.+)$/m)?.[1];
    if (!title) throw new Error(`Policy document is missing a title: ${file}`);

    for (const chunk of chunkPolicyDocument(documentSlug, title, markdown)) {
      await pool.query(
        `INSERT INTO policy_chunks (source_id, document_slug, title, content)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (source_id) DO UPDATE
           SET title = EXCLUDED.title,
               content = EXCLUDED.content,
               updated_at = now()`,
        [chunk.sourceId, chunk.documentSlug, chunk.title, chunk.content],
      );
      chunkCount += 1;
    }
  }

  console.info(`Seeded ${files.length} synthetic policy documents (${chunkCount} chunks).`);
} finally {
  await pool.end();
}
