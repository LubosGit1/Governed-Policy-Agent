import { describe, expect, it } from "vitest";
import { readJsonBody } from "./request";

describe("readJsonBody", () => {
  it("parses valid JSON within the byte limit", async () => {
    await expect(readJsonBody(new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ question: "Is water damage covered?" }),
    }))).resolves.toEqual({
      ok: true,
      value: { question: "Is water damage covered?" },
    });
  });

  it("returns explicit errors for malformed and oversized bodies", async () => {
    await expect(readJsonBody(new Request("https://example.test", {
      method: "POST",
      body: "{",
    }))).resolves.toEqual({ ok: false, status: 400 });
    await expect(readJsonBody(new Request("https://example.test", {
      method: "POST",
      body: "12345",
    }), 4)).resolves.toEqual({ ok: false, status: 413 });
  });
});
