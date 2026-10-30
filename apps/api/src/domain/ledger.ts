/**
 * Pure ledger arithmetic: no I/O, no framework, integer cents only.
 */

export interface LedgerExpense {
  readonly paidBy: string;
  readonly amountCents: number;
  readonly shares: readonly { readonly memberId: string; readonly amountCents: number }[];
}

export interface LedgerPayment {
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amountCents: number;
}

export interface Balance {
  readonly memberId: string;
  /** Positive: the group owes this person. Negative: this person owes the group. */
  readonly netCents: number;
}

export interface Settlement {
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amountCents: number;
}

/**
 * Net position of every member. Paying for an expense or paying someone back increases your
 * balance; your share of an expense, or money you received, decreases it. Balances always sum
 * to zero.
 */
export function computeBalances(
  memberIds: readonly string[],
  expenses: readonly LedgerExpense[],
  payments: readonly LedgerPayment[],
): Balance[] {
  const net = new Map(memberIds.map((id) => [id, 0]));
  const add = (memberId: string, cents: number): void => {
    const current = net.get(memberId);
    if (current === undefined) throw new Error(`Ledger refers to unknown member ${memberId}.`);
    net.set(memberId, current + cents);
  };

  for (const expense of expenses) {
    add(expense.paidBy, expense.amountCents);
    for (const share of expense.shares) add(share.memberId, -share.amountCents);
  }
  for (const payment of payments) {
    add(payment.fromMemberId, payment.amountCents);
    add(payment.toMemberId, -payment.amountCents);
  }
  return memberIds.map((memberId) => ({ memberId, netCents: net.get(memberId) ?? 0 }));
}

/**
 * Suggests payments that bring every balance to zero: repeatedly, whoever owes the most pays
 * whoever is owed the most. That needs at most n − 1 payments, and usually far fewer. (The true
 * minimum is NP-hard to find; greedy is the standard, explainable choice.) Ties break by member
 * order, so the same balances always produce the same suggestions.
 */
export function settleUp(balances: readonly Balance[]): Settlement[] {
  const position = new Map(balances.map((balance, index) => [balance.memberId, index]));
  const largestFirst = (a: Party, b: Party): number =>
    b.cents - a.cents || (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0);

  const creditors: Party[] = balances
    .filter((balance) => balance.netCents > 0)
    .map((balance) => ({ id: balance.memberId, cents: balance.netCents }));
  const debtors: Party[] = balances
    .filter((balance) => balance.netCents < 0)
    .map((balance) => ({ id: balance.memberId, cents: -balance.netCents }));

  const settlements: Settlement[] = [];
  for (;;) {
    creditors.sort(largestFirst);
    debtors.sort(largestFirst);
    const creditor = creditors[0];
    const debtor = debtors[0];
    if (!creditor || !debtor) return settlements;

    const amountCents = Math.min(creditor.cents, debtor.cents);
    settlements.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amountCents });
    creditor.cents -= amountCents;
    debtor.cents -= amountCents;
    if (creditor.cents === 0) creditors.shift();
    if (debtor.cents === 0) debtors.shift();
  }
}

interface Party {
  readonly id: string;
  cents: number;
}
