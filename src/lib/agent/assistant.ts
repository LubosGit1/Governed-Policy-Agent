import { randomUUID } from "node:crypto";
import { searchPolicyDocs, type PolicySearchResult, type Queryable } from "../policy/retrieval";
import { redactPii } from "../privacy/redact-pii";
import { validateCitations, type Citation } from "./citations";
import { isPromptInjection } from "./guardrails";
import type { PolicyProvider } from "./provider";

export interface AuditRecord {
  requestId: string;
  redactedInput: string;
  retrievedChunkIds: string[];
  toolCalls: string[];
  approvals: string[];
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  refused: boolean;
}

export interface AssistantDependencies {
  db: Queryable;
  provider: PolicyProvider;
  audit: (record: AuditRecord) => Promise<void>;
  now?: () => number;
  id?: () => string;
}

export interface AssistantResponse {
  requestId: string;
  answer: string;
  citations: Citation[];
  refused: boolean;
  escalationOffered: boolean;
}

const noEvidenceAnswer =
  "I could not find enough approved policy information to answer this. Please contact the claims team for a human review.";
const injectionAnswer =
  "I can only help with questions about the approved insurance policy information. I cannot follow instructions that ask me to bypass those limits.";

export async function answerPolicyQuestion(
  question: string,
  dependencies: AssistantDependencies,
): Promise<AssistantResponse> {
  const start = (dependencies.now ?? Date.now)();
  const requestId = (dependencies.id ?? randomUUID)();
  const redactedInput = redactPii(question).redactedText;
  const retrievedChunks: PolicySearchResult[] = [];
  let toolCalls: string[] = [];
  let model = dependencies.provider.modelName;
  let inputTokens = 0;
  let outputTokens = 0;
  let refused = false;
  let response: AssistantResponse | undefined;

  try {
    if (isPromptInjection(redactedInput)) {
      refused = true;
      model = "guardrail";
      response = {
        requestId,
        answer: injectionAnswer,
        citations: [],
        refused,
        escalationOffered: false,
      };
    } else {
      retrievedChunks.push(...await searchPolicyDocs(dependencies.db, redactedInput));
      toolCalls = ["search_policy_docs"];

      if (retrievedChunks.length === 0) {
        refused = true;
        response = {
          requestId,
          answer: noEvidenceAnswer,
          citations: [],
          refused,
          escalationOffered: true,
        };
      } else {
        const generated = await dependencies.provider.answer(redactedInput, retrievedChunks);
        inputTokens = generated.inputTokens;
        outputTokens = generated.outputTokens;
        const checked = validateCitations(generated.citations, retrievedChunks);
        if (!checked.valid || (generated.citations.length === 0 && !generated.refused)) {
          refused = true;
          response = {
            requestId,
            answer: noEvidenceAnswer,
            citations: [],
            refused,
            escalationOffered: true,
          };
        } else {
          refused = generated.refused;
          response = {
            requestId,
            answer: generated.answer,
            citations: checked.citations,
            refused,
            escalationOffered: refused,
          };
        }
      }
    }
  } catch (error) {
    refused = true;
    throw error;
  } finally {
    await dependencies.audit({
      requestId,
      redactedInput,
      retrievedChunkIds: retrievedChunks.map((chunk) => chunk.sourceId),
      toolCalls,
      approvals: [],
      model,
      latencyMs: Math.max(0, (dependencies.now ?? Date.now)() - start),
      inputTokens,
      outputTokens,
      refused,
    });
  }

  if (!response) throw new Error("Assistant completed without producing a response.");
  return response;
}
