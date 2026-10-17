import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/api/admin";

export const runtime = "nodejs";

interface AuditRow {
  requestId: string;
  redactedInput: string;
  retrievedChunkIds: string[];
  toolCalls: string[];
  approvals: string[];
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  refused: boolean;
  escalationOffered: boolean;
  createdAt: string;
}

export async function GET(request: Request) {
  const access = await authorizeAdminApi(request, "admin-data");
  if ("response" in access) return access.response;

  try {
    const [metricsResult, logsResult] = await Promise.all([
      access.pool.query<{
        requests: number;
        refusals: number;
        escalations: number;
        averageLatencyMs: number;
      }>(
        `SELECT COUNT(*)::int AS requests,
                COUNT(*) FILTER (WHERE refused)::int AS refusals,
                COUNT(*) FILTER (WHERE escalation_offered)::int AS escalations,
                COALESCE(AVG(latency_ms), 0)::float AS "averageLatencyMs"
           FROM assistant_audit_logs`,
      ),
      access.pool.query<AuditRow>(
        `SELECT request_id AS "requestId",
                redacted_input AS "redactedInput",
                retrieved_chunk_ids AS "retrievedChunkIds",
                tool_calls AS "toolCalls",
                approvals,
                model,
                latency_ms AS "latencyMs",
                input_tokens AS "inputTokens",
                output_tokens AS "outputTokens",
                refused,
                escalation_offered AS "escalationOffered",
                created_at AS "createdAt"
           FROM assistant_audit_logs
          ORDER BY created_at DESC
          LIMIT 50`,
      ),
    ]);

    const metrics = metricsResult.rows[0];
    if (!metrics) throw new Error("Admin metrics query returned no row.");
    return NextResponse.json({
      metrics: {
        requests: metrics.requests,
        refusals: metrics.refusals,
        escalationRate: metrics.requests === 0 ? 0 : metrics.escalations / metrics.requests,
        averageLatencyMs: Math.round(metrics.averageLatencyMs),
      },
      requests: logsResult.rows,
    });
  } catch {
    return NextResponse.json({ error: "Admin data could not be loaded." }, { status: 503 });
  }
}
