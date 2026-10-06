// Dollar-string -> integer cents, done entirely with string/integer
// operations. No parseFloat, no `* 100` on a float -- that's exactly the
// class of bug that loses a cent on inputs like 0.1 + 0.2. Returns null for
// anything that isn't a valid amount, so callers can show a validation
// error instead of silently coercing garbage.
export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const negative = trimmed.startsWith("-");
  const abs = negative ? trimmed.slice(1) : trimmed;
  const [whole, frac = ""] = abs.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
  return negative ? -cents : cents;
}

export function centsToDollarsInput(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}
