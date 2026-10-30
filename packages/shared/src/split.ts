export interface Share {
  readonly memberId: string;
  readonly amountCents: number;
}

/**
 * Splits an amount as evenly as possible. Leftover cents go to the first members in the given
 * order, so the result is deterministic and always adds up to exactly the total.
 * Used by the API (authoritative) and by the web app (live preview), so they always agree.
 */
export function splitEvenly(amountCents: number, memberIds: readonly string[]): Share[] {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new RangeError('amountCents must be a non-negative integer.');
  }
  if (memberIds.length === 0) {
    throw new RangeError('An amount must be split between at least one member.');
  }
  const base = Math.floor(amountCents / memberIds.length);
  const remainder = amountCents - base * memberIds.length;
  return memberIds.map((memberId, index) => ({
    memberId,
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}
