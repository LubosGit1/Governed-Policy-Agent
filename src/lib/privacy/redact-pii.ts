export type PiiType = "email" | "phone" | "iban" | "czech-birth-number";

export interface RedactionResult {
  redactedText: string;
  detectedTypes: PiiType[];
}

const patterns: Array<{ type: PiiType; expression: RegExp; replacement: string }> = [
  {
    type: "email",
    expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    type: "iban",
    expression: /\b[A-Z]{2}\d{2}(?:[ \t]?[A-Z0-9]){11,30}\b/gi,
    replacement: "[REDACTED_IBAN]",
  },
  {
    type: "czech-birth-number",
    expression: /\b\d{6}\/?\d{3,4}\b/g,
    replacement: "[REDACTED_BIRTH_NUMBER]",
  },
];

export function redactPii(input: string): RedactionResult {
  let redactedText = input;
  const detectedTypes = new Set<PiiType>();

  for (const { type, expression, replacement } of patterns) {
    redactedText = redactedText.replace(expression, () => {
      detectedTypes.add(type);
      return replacement;
    });
  }

  redactedText = redactedText.replace(
    /(?<!\w)\+?\d[\d ().-]{7,}\d(?!\w)/g,
    (match) => {
      const digitCount = (match.match(/\d/g) ?? []).length;
      if (digitCount < 9 || digitCount > 15) return match;
      detectedTypes.add("phone");
      return "[REDACTED_PHONE]";
    },
  );

  return { redactedText, detectedTypes: [...detectedTypes] };
}
