/** Currencies with two minor units. Amounts are always handled as integer cents, never floats. */
export const CURRENCIES = ['NZD', 'AUD', 'USD', 'EUR', 'GBP', 'CAD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** $1,000,000.00. Keeps every total far inside Number.MAX_SAFE_INTEGER and a Postgres integer. */
export const MAX_AMOUNT_CENTS = 100_000_000;

const AMOUNT_PATTERN = /^(\d{1,7})(?:\.(\d{1,2}))?$/;

/**
 * Parses what a person types ("12", "12.5", "$1,234.50") into integer cents, using string
 * arithmetic so that 0.1 + 0.2 problems can never reach the ledger.
 */
export function parseAmountToCents(input: string): number | undefined {
  const normalised = input.trim().replace(/^\$/, '').replace(/[,\s]/g, '');
  const match = AMOUNT_PATTERN.exec(normalised);
  if (!match) return undefined;
  const dollars = Number(match[1]);
  const cents = Number((match[2] ?? '').padEnd(2, '0'));
  const total = dollars * 100 + cents;
  return total <= MAX_AMOUNT_CENTS ? total : undefined;
}

/** "12.50" style text for an input field. */
export function centsToAmountInput(cents: number): string {
  return `${Math.trunc(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(cents: number, currency: Currency, locale = 'en-NZ'): string {
  const key = `${locale}:${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: 'currency', currency });
    formatters.set(key, formatter);
  }
  return formatter.format(cents / 100);
}
