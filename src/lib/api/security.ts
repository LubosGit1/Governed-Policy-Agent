import { createHmac, timingSafeEqual } from "node:crypto";
import type { Queryable } from "../policy/retrieval";

export const ADMIN_COOKIE_NAME = "policy_admin_session";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function positiveIntegerSetting(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 2_000_000_000) {
    throw new Error(`${name} must be a positive integer no greater than 2,000,000,000.`);
  }
  return value;
}

function rateLimitHashSecret(): string {
  return process.env.RATE_LIMIT_HASH_SECRET ?? "local-dev-only-rate-limit-key";
}

function clientIdentity(request: Request): string {
  const directIp = request.headers.get("x-real-ip");
  if (directIp) return directIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown-client";
}

export async function checkRateLimit(
  db: Queryable,
  request: Request,
  scope: string,
): Promise<RateLimitResult> {
  const maxRequests = positiveIntegerSetting("RATE_LIMIT_MAX_REQUESTS", 30);
  const windowMs = positiveIntegerSetting("RATE_LIMIT_WINDOW_MS", 60_000);
  const keyHash = createHmac("sha256", rateLimitHashSecret())
    .update(`${scope}:${clientIdentity(request)}`)
    .digest("hex");

  const result = await db.query<{
    requestCount: number;
    resetAt: number;
  }>(
    `INSERT INTO rate_limit_buckets (key_hash, window_started_at, request_count)
     VALUES ($1, now(), 1)
     ON CONFLICT (key_hash) DO UPDATE SET
       window_started_at = CASE
         WHEN rate_limit_buckets.window_started_at + ($2 * INTERVAL '1 millisecond') <= now()
         THEN now()
         ELSE rate_limit_buckets.window_started_at
       END,
       request_count = CASE
         WHEN rate_limit_buckets.window_started_at + ($2 * INTERVAL '1 millisecond') <= now()
         THEN 1
         ELSE LEAST(rate_limit_buckets.request_count + 1, $3)
       END
     RETURNING request_count AS "requestCount",
       EXTRACT(EPOCH FROM (
         window_started_at + ($2 * INTERVAL '1 millisecond') - now()
       )) AS "resetAt"`,
    [keyHash, windowMs, maxRequests + 1],
  );

  const state = result.rows[0];
  if (!state) throw new Error("Rate limit storage returned no bucket state.");
  return {
    allowed: state.requestCount <= maxRequests,
    retryAfterSeconds: Math.max(1, Math.ceil(Number(state.resetAt))),
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminSecretConfigured(): boolean {
  return Boolean(process.env.ADMIN_API_KEY?.trim());
}

export function isAdminRequest(request: Request): boolean {
  const secret = process.env.ADMIN_API_KEY?.trim();
  if (!secret) return false;
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.slice(ADMIN_COOKIE_NAME.length + 1);
  if (token === undefined) return false;
  try {
    return constantTimeEqual(decodeURIComponent(token), secret);
  } catch {
    return false;
  }
}

export function adminSecretMatches(candidate: string): boolean {
  const secret = process.env.ADMIN_API_KEY?.trim();
  return Boolean(secret && constantTimeEqual(candidate, secret));
}

export function isAdminToken(candidate: string | undefined): boolean {
  const secret = process.env.ADMIN_API_KEY?.trim();
  return Boolean(secret && candidate && constantTimeEqual(candidate, secret));
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    if (!host) return false;
    return new URL(origin).origin === `${requestUrl.protocol}//${new URL(`${requestUrl.protocol}//${host}`).host}`;
  } catch {
    return false;
  }
}
