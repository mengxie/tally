import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeBalances, settleUp } from '../src/domain/ledger';

const share = (memberId: string, amountCents: number) => ({ memberId, amountCents });

describe('computeBalances', () => {
  it('credits the payer and debits every share', () => {
    const balances = computeBalances(
      ['a', 'b', 'c'],
      [
        {
          paidBy: 'a',
          amountCents: 9000,
          shares: [share('a', 3000), share('b', 3000), share('c', 3000)],
        },
      ],
      [],
    );
    expect(balances).toEqual([
      { memberId: 'a', netCents: 6000 },
      { memberId: 'b', netCents: -3000 },
      { memberId: 'c', netCents: -3000 },
    ]);
  });

  it('treats a payment as paying back what you owe', () => {
    const balances = computeBalances(
      ['a', 'b'],
      [{ paidBy: 'a', amountCents: 2000, shares: [share('b', 2000)] }],
      [{ fromMemberId: 'b', toMemberId: 'a', amountCents: 2000 }],
    );
    expect(balances.map((b) => b.netCents)).toEqual([0, 0]);
  });

  it('refuses to silently ignore an unknown member', () => {
    expect(() => computeBalances(['a'], [{ paidBy: 'x', amountCents: 1, shares: [] }], [])).toThrow(
      /unknown member x/,
    );
  });
});

describe('settleUp', () => {
  it('has the biggest debtor pay the biggest creditor first', () => {
    expect(
      settleUp([
        { memberId: 'a', netCents: 6000 },
        { memberId: 'b', netCents: -1000 },
        { memberId: 'c', netCents: -5000 },
      ]),
    ).toEqual([
      { fromMemberId: 'c', toMemberId: 'a', amountCents: 5000 },
      { fromMemberId: 'b', toMemberId: 'a', amountCents: 1000 },
    ]);
  });

  it('suggests nothing when everyone is square', () => {
    expect(
      settleUp([
        { memberId: 'a', netCents: 0 },
        { memberId: 'b', netCents: 0 },
      ]),
    ).toEqual([]);
  });

  it('breaks ties by member order, so suggestions never shuffle', () => {
    expect(
      settleUp([
        { memberId: 'a', netCents: 100 },
        { memberId: 'b', netCents: 100 },
        { memberId: 'c', netCents: -100 },
        { memberId: 'd', netCents: -100 },
      ]),
    ).toEqual([
      { fromMemberId: 'c', toMemberId: 'a', amountCents: 100 },
      { fromMemberId: 'd', toMemberId: 'b', amountCents: 100 },
    ]);
  });

  it('always settles everyone, in at most n - 1 positive payments', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), { minLength: 1, maxLength: 15 }),
        (amounts) => {
          const nets = [...amounts, -amounts.reduce((sum, n) => sum + n, 0)];
          const balances = nets.map((netCents, i) => ({ memberId: `m${i}`, netCents }));
          const settlements = settleUp(balances);

          const after = new Map(balances.map((b) => [b.memberId, b.netCents]));
          for (const s of settlements) {
            expect(s.amountCents).toBeGreaterThan(0);
            after.set(s.fromMemberId, (after.get(s.fromMemberId) ?? 0) + s.amountCents);
            after.set(s.toMemberId, (after.get(s.toMemberId) ?? 0) - s.amountCents);
          }
          expect([...after.values()].every((net) => net === 0)).toBe(true);
          const involved = nets.filter((net) => net !== 0).length;
          expect(settlements.length).toBeLessThanOrEqual(Math.max(0, involved - 1));
        },
      ),
    );
  });
});
