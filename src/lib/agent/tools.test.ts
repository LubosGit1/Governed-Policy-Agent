import { describe, expect, it, vi } from "vitest";
import { estimateClaimPayout, ToolExecutor } from "./tools";
import type { Queryable } from "../policy/retrieval";

const db: Queryable = { query: vi.fn().mockResolvedValue({ rows: [] }) };
const createHandoff = vi.fn().mockResolvedValue({ ticketId: "ticket-123" });

describe("estimateClaimPayout", () => {
  it("subtracts the deductible and caps payment at the coverage limit", () => {
    expect(estimateClaimPayout({
      coverageLimit: 5000,
      deductible: 500,
      damageAmount: 8000,
    })).toMatchObject({ estimatedPayment: 5000, appliedDeductible: 500 });
  });

  it("never produces a negative payment and rejects malformed arguments", () => {
    expect(estimateClaimPayout({
      coverageLimit: 5000,
      deductible: 500,
      damageAmount: 200,
    }).estimatedPayment).toBe(0);
    expect(() => estimateClaimPayout({
      coverageLimit: -1,
      deductible: 0,
      damageAmount: 10,
    })).toThrow();
    expect(() => estimateClaimPayout({
      coverageLimit: 100,
      deductible: 0,
      damageAmount: 10,
      unexpected: true,
    })).toThrow();
  });
});

describe("ToolExecutor", () => {
  it("rejects unapproved handoff requests and redacts approved ticket details", async () => {
    const executor = new ToolExecutor({ db, createHandoff });

    await expect(executor.execute("create_handoff_ticket", {
      approved: false,
      question: "Please call me at 777 123 456.",
    })).rejects.toThrow();
    expect(createHandoff).not.toHaveBeenCalled();

    await expect(executor.execute("create_handoff_ticket", {
      approved: true,
      question: "Please call me at 777 123 456.",
    })).resolves.toEqual({ ticketId: "ticket-123" });
    expect(createHandoff).toHaveBeenCalledWith("Please call me at [REDACTED_PHONE].");
  });

  it("only executes allow-listed tools and enforces four steps", async () => {
    const executor = new ToolExecutor({ db, createHandoff });

    await expect(executor.execute("read_database", {})).rejects.toThrow(/allow-listed/i);
    for (let index = 0; index < 2; index += 1) {
      await executor.execute("estimate_claim_payout", {
        coverageLimit: 100,
        deductible: 0,
        damageAmount: 10,
      });
    }
    await executor.execute("estimate_claim_payout", {
      coverageLimit: 100,
      deductible: 0,
      damageAmount: 10,
    });
    await expect(executor.execute("estimate_claim_payout", {
      coverageLimit: 100,
      deductible: 0,
      damageAmount: 10,
    })).rejects.toThrow(/step limit/i);
  });
});
