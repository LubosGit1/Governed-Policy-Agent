import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/api/admin";

export const runtime = "nodejs";

function csvCell(value: unknown): string {
  let text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const access = await authorizeAdminApi(request, "admin-export");
  if ("response" in access) return access.response;

  try {
    const result = await access.pool.query<Record<string, unknown>>(
      `SELECT request_id AS "requestId",
              created_at AS "createdAt",
              redacted_input AS "redactedInput",
              retrieved_chunk_ids AS "retrievedChunkIds",
              tool_calls AS "toolCalls",
              approvals,
              model,
              latency_ms AS "latencyMs",
              input_tokens AS "inputTokens",
              output_tokens AS "outputTokens",
              refused,
              escalation_offered AS "escalationOffered"
         FROM assistant_audit_logs
        ORDER BY created_at DESC
        LIMIT 10000`,
    );
    const columns = [
      "requestId",
      "createdAt",
      "redactedInput",
      "retrievedChunkIds",
      "toolCalls",
      "approvals",
      "model",
      "latencyMs",
      "inputTokens",
      "outputTokens",
      "refused",
      "escalationOffered",
    ];
    const lines = [
      columns.map(csvCell).join(","),
      ...result.rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
    ];
    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="policy-assistant-audit.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Audit export could not be created." }, { status: 503 });
  }
}
