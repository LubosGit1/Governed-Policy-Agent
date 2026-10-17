import type { Queryable } from "../policy/retrieval";
import type { AuditRecord } from "./assistant";

export async function writeAuditRecord(db: Queryable, record: AuditRecord): Promise<void> {
  await db.query(
    `INSERT INTO assistant_audit_logs (
       request_id, redacted_input, retrieved_chunk_ids, tool_calls, approvals,
       model, latency_ms, input_tokens, output_tokens, refused, escalation_offered
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
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
      record.escalationOffered,
    ],
  );
}
