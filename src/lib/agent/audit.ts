import type { Pool } from "pg";
import type { AuditRecord } from "./assistant";

export async function writeAuditRecord(db: Pool, record: AuditRecord): Promise<void> {
  await db.query(
    `INSERT INTO assistant_audit_logs (
       request_id, redacted_input, retrieved_chunk_ids, tool_calls, approvals,
       model, latency_ms, input_tokens, output_tokens, refused
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      record.requestId,
      record.redactedInput,
      record.retrievedChunkIds,
      record.toolCalls,
      record.approvals,
      record.model,
      record.latencyMs,
      record.inputTokens,
      record.outputTokens,
      record.refused,
    ],
  );
}
