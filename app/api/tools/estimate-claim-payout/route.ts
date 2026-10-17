import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { writeAuditRecord } from "@/lib/agent/audit";
import { ToolExecutor, claimPayoutSchema } from "@/lib/agent/tools";
import { checkRateLimit, hasSameOrigin } from "@/lib/api/security";
import { getDbPool } from "@/lib/db";
import { redactPii } from "@/lib/privacy/redact-pii";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requests must come from this application." }, {
      status: 403,
    });
  }

  let pool: ReturnType<typeof getDbPool>;
  try {
    pool = getDbPool();
    const rateLimit = await checkRateLimit(pool, request, "payout");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again shortly." }, {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
    }
  } catch {
    return NextResponse.json({ error: "The service is temporarily unavailable." }, {
      status: 503,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = claimPayoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid estimate arguments." }, { status: 400 });
  }

  const requestId = randomUUID();
  const start = Date.now();
  try {
    const executor = new ToolExecutor({
      db: pool,
      createHandoff: async () => {
        throw new Error("Handoff creation is not available from the estimate endpoint.");
      },
    });
    const estimate = await executor.execute("estimate_claim_payout", parsed.data);
    await writeAuditRecord(pool, {
      requestId,
      redactedInput: redactPii(JSON.stringify(parsed.data)).redactedText,
      retrievedChunkIds: [],
      toolCalls: ["estimate_claim_payout"],
      approvals: [],
      model: "deterministic-calculation",
      latencyMs: Math.max(0, Date.now() - start),
      inputTokens: 0,
      outputTokens: 0,
      refused: false,
      escalationOffered: false,
    });
    return NextResponse.json({ requestId, estimate });
  } catch {
    return NextResponse.json({ error: "The estimate could not be completed." }, { status: 503 });
  }
}
