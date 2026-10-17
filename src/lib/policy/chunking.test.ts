import { describe, expect, it } from "vitest";
import { chunkPolicyDocument } from "./chunking";

describe("chunkPolicyDocument", () => {
  it("creates stable source IDs and keeps content within the limit", () => {
    const markdown = "# Title\n\nFirst paragraph.\n\nSecond paragraph.";
    const chunks = chunkPolicyDocument("water-damage", "Water Damage", markdown, 100);

    expect(chunks).toEqual([
      {
        sourceId: "water-damage#001",
        documentSlug: "water-damage",
        title: "Water Damage",
        content: "First paragraph. Second paragraph.",
      },
    ]);
    expect(chunkPolicyDocument("water-damage", "Water Damage", markdown, 100)).toEqual(chunks);
  });

  it("splits long paragraphs without exceeding the configured size", () => {
    const chunks = chunkPolicyDocument("home-standard", "Home", "x".repeat(220), 100);

    expect(chunks.map((chunk) => chunk.content.length)).toEqual([100, 100, 20]);
    expect(chunks.map((chunk) => chunk.sourceId)).toEqual([
      "home-standard#001",
      "home-standard#002",
      "home-standard#003",
    ]);
  });

  it("rejects invalid slugs and chunk sizes", () => {
    expect(() => chunkPolicyDocument("../secret", "Title", "Text")).toThrow(/slug/i);
    expect(() => chunkPolicyDocument("valid-slug", "Title", "Text", 10)).toThrow(/chunk size/i);
  });
});
