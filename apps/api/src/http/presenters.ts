import type { Expense, Group, Payment } from '@tally/shared';
import type { ExpenseRecord, GroupRecord, PaymentRecord } from '../application/ports';

export const toGroupDto = (group: GroupRecord): Group => ({
  id: group.id,
  name: group.name,
  currency: group.currency,
  createdAt: group.createdAt.toISOString(),
  members: group.members.map((member) => ({ id: member.id, name: member.name })),
});

export const toExpenseDto = (expense: ExpenseRecord): Expense => ({
  id: expense.id,
  description: expense.description,
  amountCents: expense.amountCents,
  paidBy: expense.paidBy,
  shares: expense.shares.map((share) => ({
    memberId: share.memberId,
    amountCents: share.amountCents,
  })),
  createdAt: expense.createdAt.toISOString(),
});

export const toPaymentDto = (payment: PaymentRecord): Payment => ({
  id: payment.id,
  fromMemberId: payment.fromMemberId,
  toMemberId: payment.toMemberId,
  amountCents: payment.amountCents,
  createdAt: payment.createdAt.toISOString(),
});
