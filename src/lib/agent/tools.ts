import { z } from "zod";
import { searchPolicyDocs, type PolicySearchResult, type Queryable } from "../policy/retrieval";
import { redactPii } from "../privacy/redact-pii";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(10).optional(),
}).strict();

export const claimPayoutSchema = z.object({
  coverageLimit: z.number().finite().nonnegative().max(1_000_000_000),
  deductible: z.number().finite().nonnegative().max(1_000_000_000),
  damageAmount: z.number().finite().nonnegative().max(1_000_000_000),
}).strict();

const handoffSchema = z.object({
  approved: z.literal(true),
  question: z.string().trim().min(5).max(1000),
}).strict();

export type HandoffWriter = (redactedQuestion: string) => Promise<{ ticketId: string }>;
export type ToolName = "search_policy_docs" | "estimate_claim_payout" | "create_handoff_ticket";

export interface ToolDependencies {
  db: Queryable;
  createHandoff: HandoffWriter;
}

export interface ClaimPayout {
  estimatedPayment: number;
  appliedDeductible: number;
  coverageLimit: number;
  disclaimer: string;
}

export function estimateClaimPayout(input: unknown): ClaimPayout {
  const { coverageLimit, deductible, damageAmount } = claimPayoutSchema.parse(input);
  const estimatedPayment = Math.min(
    Math.max(damageAmount - deductible, 0),
    coverageLimit,
  );

  return {
    estimatedPayment,
    appliedDeductible: Math.min(damageAmount, deductible),
    coverageLimit,
    disclaimer: "Illustrative estimate only; coverage and payment require claims-team assessment.",
  };
}

export class ToolExecutor {
  private steps = 0;

  constructor(private readonly dependencies: ToolDependencies, private readonly maxSteps = 4) {
    if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 4) {
      throw new Error("Tool execution is limited to a maximum of four steps.");
    }
  }

  async execute(name: string, input: unknown): Promise<unknown> {
    this.steps += 1;
    if (this.steps > this.maxSteps) {
      throw new Error("The tool step limit for this request has been reached.");
    }

    switch (name) {
      case "search_policy_docs": {
        const args = searchSchema.parse(input);
        return searchPolicyDocs(
          this.dependencies.db,
          redactPii(args.query).redactedText,
          args.limit,
        );
      }
      case "estimate_claim_payout":
        return estimateClaimPayout(input);
      case "create_handoff_ticket": {
        const args = handoffSchema.parse(input);
        const redacted = redactPii(args.question).redactedText;
        return this.dependencies.createHandoff(redacted);
      }
      default:
        throw new Error(`Tool is not allow-listed: ${name}`);
    }
  }

  get stepsUsed() {
    return this.steps;
  }
}

export type PolicySearchToolResult = PolicySearchResult[];
