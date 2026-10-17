import { describe, expect, it } from "vitest";
import { redactPii } from "./redact-pii";

describe("redactPii", () => {
  it("redacts email, phone, IBAN and Czech birth number", () => {
    const result = redactPii(
      "Contact jana.novakova@example.test at +420 777 123 456. " +
      "IBAN CZ65 0800 0000 1920 0014 5399, birth number 850101/1234.",
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
  });

  it("leaves ordinary text and short numeric values unchanged", () => {
    const result = redactPii("The deductible is 2,000 CZK and policy 12345.");

    expect(result.redactedText).toBe("The deductible is 2,000 CZK and policy 12345.");
    expect(result.detectedTypes).toEqual([]);
  });
});
