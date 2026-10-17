import { describe, expect, it } from "vitest";
import { redactPii } from "./redact-pii";

describe("redactPii", () => {
  it("redacts email, phone, IBAN and Czech birth number", () => {
    const result = redactPii(
      "Contact jana.novakova@example.test at +420 000 000 000. " +
      "IBAN CZ00 0000 0000 0000 0000 0000, birth number 000000/0000.",
    );

    expect(result.redactedText).toBe(
      "Contact [REDACTED_EMAIL] at [REDACTED_PHONE]. " +
      "IBAN [REDACTED_IBAN], birth number [REDACTED_BIRTH_NUMBER].",
    );
    expect(result.detectedTypes).toEqual([
      "email",
      "iban",
      "czech-birth-number",
      "phone",
    ]);
    expect(result.searchableText).toBe(
      "at . , .",
    );
  });

  it("leaves ordinary text and short numeric values unchanged", () => {
    const result = redactPii("The deductible is 2,000 CZK and policy 12345.");

    expect(result.redactedText).toBe("The deductible is 2,000 CZK and policy 12345.");
    expect(result.detectedTypes).toEqual([]);
    expect(result.searchableText).toBe(result.redactedText);
  });
});
