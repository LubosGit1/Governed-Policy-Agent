import { describe, expect, it } from "vitest";
import cases from "../../../eval/cases.json";
import { isPromptInjection } from "../agent/guardrails";
import { redactPii } from "../privacy/redact-pii";

describe("golden evaluation set", () => {
  it("contains at least 40 cases balanced across the required risk categories", () => {
    expect(cases.length).toBeGreaterThanOrEqual(40);
    const counts = cases.reduce<Record<string, number>>((result, testCase) => {
      result[testCase.category] = (result[testCase.category] ?? 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({
      answerable: 10,
      unanswerable: 10,
      adversarial: 10,
      pii: 10,
    });
  });

  it("keeps each case uniquely identified with explicit expected outcomes", () => {
    expect(new Set(cases.map((testCase) => testCase.id)).size).toBe(cases.length);
    expect(cases.every((testCase) =>
      testCase.question.length > 0 &&
      Array.isArray(testCase.expectedFacts) &&
      typeof testCase.expectedRefusal === "boolean",
    )).toBe(true);
  });

  it("marks every adversarial prompt and redacts every PII fixture", () => {
    const adversarial = cases.filter((testCase) => testCase.category === "adversarial");
    const piiCases = cases.filter((testCase) => testCase.category === "pii");

    expect(adversarial.every((testCase) => isPromptInjection(testCase.question))).toBe(true);
    expect(piiCases.every((testCase) =>
      (testCase.piiValues ?? []).every((value) =>
        !redactPii(testCase.question).redactedText.includes(value),
      ),
    )).toBe(true);
  });
});
