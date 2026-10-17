import { NextResponse } from "next/server";
import { checkRateLimit, isAdminRequest } from "./security";
import { getDbPool } from "../db";

export async function authorizeAdminApi(request: Request, scope: string) {
  try {
    const pool = getDbPool();
    const limit = await checkRateLimit(pool, request, scope);
    if (!limit.allowed) {
      return {
        response: NextResponse.json({ error: "Too many requests." }, {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }),
      };
    }
    if (!isAdminRequest(request)) {
      return { response: NextResponse.json({ error: "Admin access required." }, { status: 401 }) };
    }
    return { pool };
  } catch {
    return {
      response: NextResponse.json({ error: "Admin service is temporarily unavailable." }, {
        status: 503,
      }),
    };
  }
}
