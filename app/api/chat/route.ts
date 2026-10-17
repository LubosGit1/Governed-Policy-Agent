import { NextResponse } from "next/server";
import { z } from "zod";
import { answerPolicyQuestion } from "@/lib/agent/assistant";
import { writeAuditRecord } from "@/lib/agent/audit";
import { createPolicyProvider } from "@/lib/agent/provider";
import { readJsonBody } from "@/lib/api/request";
import { checkRateLimit, hasSameOrigin } from "@/lib/api/security";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(2000),
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
    const rateLimit = await checkRateLimit(pool, request, "chat");
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again shortly." }, {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
    }
  } catch {
    return NextResponse.json({ error: "The assistant is temporarily unavailable." }, {
      status: 503,
    });
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json({
      error: body.status === 413 ? "Request body is too large." : "Request body must be valid JSON.",
    }, { status: body.status });
  }

  const parsed = requestSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide one question of at most 2,000 characters." }, {
      status: 400,
    });
  }

  try {
    const result = await answerPolicyQuestion(parsed.data.question, {
      db: pool,
      provider: createPolicyProvider,
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
