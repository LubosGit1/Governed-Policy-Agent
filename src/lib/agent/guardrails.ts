const injectionPatterns = [
  /\bignore\s+(?:all\s+)?(?:previous|prior|system)\s+instructions\b/i,
  /\bdisregard\s+(?:all\s+)?(?:previous|prior|system)\s+instructions\b/i,
  /\breveal\s+(?:the\s+)?(?:system|hidden)\s+prompt\b/i,
  /\breveal\b.{0,40}\b(?:system|hidden)\s+prompt\b/i,
  /\bact\s+as\s+(?:an?\s+)?(?:unrestricted|unfiltered)\b/i,
  /\b(?:bypass|disable)\s+(?:your\s+)?(?:safety|guardrails?)\b/i,
];

export function isPromptInjection(text: string): boolean {
  return injectionPatterns.some((pattern) => pattern.test(text));
}
