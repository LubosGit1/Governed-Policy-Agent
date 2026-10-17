import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, hasSameOrigin, isAdminRequest } from "./security";
import type { Queryable } from "../policy/retrieval";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("API security helpers", () => {
  it("uses a hashed client identity and applies the configured request cap", async () => {
    vi.stubEnv("RATE_LIMIT_MAX_REQUESTS", "2");
    const query = vi.fn().mockResolvedValue({
      rows: [{ requestCount: 3, resetAt: 12 }],
    });
    const db: Queryable = { query };
    const request = new Request("https://policy.example/api/chat", {
      headers: { "x-real-ip": "192.0.2.10" },
    });

    await expect(checkRateLimit(db, request, "chat")).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 12,
    });
    const [sql, values] = query.mock.calls[0];
    expect(sql).toContain("rate_limit_buckets");
    expect(values[0]).not.toContain("192.0.2.10");
    expect(values[1]).toBe(60_000);
  });

  it("accepts only an exact same-origin request", () => {
    expect(hasSameOrigin(new Request("https://policy.example/api/chat", {
      headers: { host: "policy.example", origin: "https://policy.example" },
    }))).toBe(true);
    expect(hasSameOrigin(new Request("http://internal-app:3000/api/admin/session", {
      headers: {
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
    }))).toBe(true);
    expect(hasSameOrigin(new Request("https://policy.example/api/chat", {
      headers: { host: "policy.example", origin: "https://other.example" },
    }))).toBe(false);
    expect(hasSameOrigin(new Request("https://policy.example/api/chat", {
      headers: { host: "policy.example", origin: "http://policy.example" },
    }))).toBe(false);
    expect(hasSameOrigin(new Request("https://policy.example/api/chat"))).toBe(false);
  });

  it("validates the admin session cookie against the configured secret", () => {
    vi.stubEnv("ADMIN_API_KEY", "test-key-123");
    expect(isAdminRequest(new Request("https://policy.example/admin", {
      headers: { cookie: "policy_admin_session=test-key-123" },
    }))).toBe(true);
    expect(isAdminRequest(new Request("https://policy.example/admin", {
      headers: { cookie: "policy_admin_session=wrong-key" },
    }))).toBe(false);
  });
});
