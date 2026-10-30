import type { Currency, Share } from '@tally/shared';

/** Application models. Persistence and HTTP map to and from these; neither leaks inward. */
export interface MemberRecord {
  readonly id: string;
  readonly name: string;
}

export interface GroupRecord {
  readonly id: string;
  readonly name: string;
  readonly currency: Currency;
  readonly createdAt: Date;
  readonly members: readonly MemberRecord[];
}

export interface ExpenseRecord {
  readonly id: string;
  readonly groupId: string;
  readonly description: string;
  readonly amountCents: number;
  readonly paidBy: string;
  readonly shares: readonly Share[];
  readonly createdAt: Date;
}

export interface PaymentRecord {
  readonly id: string;
  readonly groupId: string;
  readonly fromMemberId: string;
  readonly toMemberId: string;
  readonly amountCents: number;
  readonly createdAt: Date;
}

/**
 * Persistence port. Implemented by PostgresGroupRepository in production and by an in-memory
 * fake in tests; both pass the same contract test suite.
 */
export interface GroupRepository {
  createGroup(group: GroupRecord): Promise<void>;
  findGroup(groupId: string): Promise<GroupRecord | undefined>;
  /** @throws ConflictError when the name is already taken in the group (case-insensitive). */
  addMember(groupId: string, member: MemberRecord): Promise<void>;
  /** Newest first. */
  listExpenses(groupId: string): Promise<ExpenseRecord[]>;
  addExpense(expense: ExpenseRecord): Promise<void>;
  /** @returns false when no such expense exists in the group. */
  deleteExpense(groupId: string, expenseId: string): Promise<boolean>;
  /** Newest first. */
  listPayments(groupId: string): Promise<PaymentRecord[]>;
  addPayment(payment: PaymentRecord): Promise<void>;
}
