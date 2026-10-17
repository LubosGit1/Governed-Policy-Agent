import { describe, expect, it, vi } from "vitest";
import { searchPolicyDocs, type Queryable } from "./retrieval";

describe("searchPolicyDocs", () => {
  it("queries ranked chunks with a parameterized term and bounded limit", async () => {
    const rows = [{
      sourceId: "water-damage#001",
      documentSlug: "water-damage",
      title: "Escape of Water",
      content: "Sudden accidental escape from a fixed pipe may be covered.",
      rank: 0.4,
    }];
    const query = vi.fn().mockResolvedValue({ rows });
    const db: Queryable = { query };

    await expect(searchPolicyDocs(db, "  burst pipe  ", 99)).resolves.toEqual(rows);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("websearch_to_tsquery"),
      ["burst pipe", 10],
    );
  });

  it("does not query for blank input and defaults invalid limits", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const db: Queryable = { query };

    await expect(searchPolicyDocs(db, "  ")).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
    await searchPolicyDocs(db, "claims", 1.5);
    expect(query.mock.calls[0][1]).toEqual(["claims", 5]);
  });
});
