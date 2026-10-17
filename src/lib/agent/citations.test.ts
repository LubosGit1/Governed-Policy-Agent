import { describe, expect, it } from "vitest";
import { validateCitations } from "./citations";
import type { PolicySearchResult } from "../policy/retrieval";

const evidence: PolicySearchResult[] = [{
  sourceId: "water-damage#001",
  documentSlug: "water-damage",
  title: "Escape of Water",
  content: "Sudden accidental escape may be covered.",
  rank: 0.5,
}];

describe("validateCitations", () => {
  it("returns source metadata only for retrieved chunks", () => {
    expect(validateCitations(["water-damage#001"], evidence)).toEqual({
      valid: true,
      citations: [{ sourceId: "water-damage#001", title: "Escape of Water" }],
    });
  });

  it("rejects unknown IDs and removes all citations from the result", () => {
    expect(validateCitations(["unknown#001"], evidence)).toEqual({
      valid: false,
      citations: [],
    });
  });
});
