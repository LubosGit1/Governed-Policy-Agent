import { NextResponse } from "next/server";
import { z } from "zod";
import { answerPolicyQuestion } from "@/lib/agent/assistant";
import { writeAuditRecord } from "@/lib/agent/audit";
import { createPolicyProvider } from "@/lib/agent/provider";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
}).strict();

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide one question of at most 2,000 characters." }, {
      status: 400,
    });
  }

  try {
    const pool = getDbPool();
    const result = await answerPolicyQuestion(parsed.data.question, {
      db: pool,
      provider: createPolicyProvider(),
      audit: (record) => writeAuditRecord(pool, record),
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "The assistant is temporarily unavailable. Please try again or contact the claims team." },
      { status: 503 },
    );
  }
}
