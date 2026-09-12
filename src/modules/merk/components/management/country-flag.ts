/** ISO alpha-2 → flag emoji, derived algorithmically (each letter maps to a
 * regional indicator symbol) rather than a hardcoded per-country lookup —
 * works for any country the master data table has a code for. */
export function countryCodeToFlag(code: string | undefined | null): string {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6 - 65; // regional indicator 'A' minus ASCII 'A'
  const chars = code.toUpperCase().split("").map((c) => c.charCodeAt(0));
  if (chars.some((c) => c < 65 || c > 90)) return "";
  return String.fromCodePoint(chars[0] + base, chars[1] + base);
}
