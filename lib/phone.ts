/** Turns what a rep types ("(435) 555-1234", "4355551234", "+1 435...") into E.164 (+14355551234), or null. */
export function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (input.trim().startsWith("+") && digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** +14355551234 → (435) 555-1234 */
export function prettyPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}
