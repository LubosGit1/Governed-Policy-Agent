import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api/request";
import { checkRateLimit, hasSameOrigin, ADMIN_COOKIE_NAME, adminSecretMatches, isAdminSecretConfigured } from "@/lib/api/security";
import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";

const loginSchema = z.object({ key: z.string().min(1).max(500) }).strict();

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requests must come from this application." }, {
      status: 403,
    });
  }
  if (!isAdminSecretConfigured()) {
    return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });
  }

  let pool: ReturnType<typeof getDbPool>;
  try {
    pool = getDbPool();
    const limit = await checkRateLimit(pool, request, "admin-login");
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many login attempts." }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }
  } catch {
    return NextResponse.json({ error: "Admin service is temporarily unavailable." }, {
      status: 503,
    });
  }

  const body = await readJsonBody(request, 2048);
  if (!body.ok) {
    return NextResponse.json({
      error: body.status === 413 ? "Request body is too large." : "Request body must be valid JSON.",
    }, { status: body.status });
  }
  const parsed = loginSchema.safeParse(body.value);
  if (!parsed.success || !adminSecretMatches(parsed.data.key)) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE_NAME, parsed.data.key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requests must come from this application." }, {
      status: 403,
    });
  }
  try {
    const limit = await checkRateLimit(getDbPool(), request, "admin-logout");
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests." }, {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }
  } catch {
    return NextResponse.json({ error: "Admin service is temporarily unavailable." }, {
      status: 503,
    });
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
