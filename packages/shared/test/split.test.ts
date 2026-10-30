import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { splitEvenly } from '../src';

describe('splitEvenly', () => {
  it('gives leftover cents to the first members, deterministically', () => {
    expect(splitEvenly(1000, ['a', 'b', 'c']).map((share) => share.amountCents)).toEqual([
      334, 333, 333,
    ]);
  });

  it('rejects impossible splits', () => {
    expect(() => splitEvenly(100, [])).toThrow(RangeError);
    expect(() => splitEvenly(10.5, ['a'])).toThrow(RangeError);
  });

  it('always adds up to the total and is never more than a cent apart', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100_000_000 }),
        fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 20 }),
        (amount, members) => {
          const shares = splitEvenly(amount, members).map((share) => share.amountCents);
          expect(shares.reduce((sum, cents) => sum + cents, 0)).toBe(amount);
          expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
        },
      ),
    );
  });
});
