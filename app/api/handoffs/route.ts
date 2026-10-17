import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditRecord } from "@/lib/agent/audit";
import { ToolExecutor } from "@/lib/agent/tools";
import { readJsonBody } from "@/lib/api/request";
import { checkRateLimit, hasSameOrigin } from "@/lib/api/security";
import { getDbPool } from "@/lib/db";
import { redactPii } from "@/lib/privacy/redact-pii";

export const runtime = "nodejs";

const handoffRequestSchema = z.object({
  approved: z.literal(true),
  question: z.string().trim().min(5).max(1000),
}).strict();

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requests must come from this application." }, {
      status: 403,
    });
  }

  let pool: ReturnType<typeof getDbPool>;
  try {
    pool = getDbPool();
    const rateLimit = await checkRateLimit(pool, request, "handoff");
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

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({
      error: body.status === 413 ? "Request body is too large." : "Request body must be valid JSON.",
    }, { status: body.status });
  }

  const parsed = handoffRequestSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "A clear human approval is required to create a ticket." }, {
      status: 400,
    });
  }

  const requestId = randomUUID();
  const start = Date.now();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const executor = new ToolExecutor({
      db: client,
      createHandoff: async (redactedQuestion) => {
        const inserted = await client.query<{ ticketId: string }>(
          `INSERT INTO handoff_tickets (redacted_question, approval_method)
           VALUES ($1, 'explicit-ui')
           RETURNING ticket_id AS "ticketId"`,
          [redactedQuestion],
        );
        const ticket = inserted.rows[0];
        if (!ticket) throw new Error("Handoff ticket was not persisted.");
        return { ticketId: ticket.ticketId };
      },
    });
    const ticket = z.object({ ticketId: z.string().uuid() }).parse(
      await executor.execute("create_handoff_ticket", parsed.data),
    );
    const redactedQuestion = redactPii(parsed.data.question).redactedText;
    await writeAuditRecord(client, {
      requestId,
      redactedInput: redactedQuestion,
      retrievedChunkIds: [],
      toolCalls: ["create_handoff_ticket"],
      approvals: ["explicit-ui-confirmation"],
      model: "human-approved-tool",
      latencyMs: Math.max(0, Date.now() - start),
      inputTokens: 0,
      outputTokens: 0,
      refused: false,
      escalationOffered: false,
    });
    await client.query("COMMIT");
    return NextResponse.json({ requestId, ticketId: ticket.ticketId }, { status: 201 });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "The handoff could not be created." }, { status: 503 });
  } finally {
    client.release();
  }
}
