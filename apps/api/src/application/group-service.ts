import { randomUUID } from 'node:crypto';
import {
  type AddMemberRequestSchema,
  type CreateExpenseRequestSchema,
  type CreateGroupRequestSchema,
  type CreatePaymentRequestSchema,
  MAX_MEMBERS,
  splitEvenly,
} from '@tally/shared';
import type { z } from 'zod';
import { computeBalances, settleUp, type Balance, type Settlement } from '../domain/ledger';
import { ConflictError, NotFoundError, ValidationError } from './errors';
import type {
  ExpenseRecord,
  GroupRecord,
  GroupRepository,
  MemberRecord,
  PaymentRecord,
} from './ports';

export type CreateGroupCommand = z.infer<typeof CreateGroupRequestSchema>;
export type AddMemberCommand = z.infer<typeof AddMemberRequestSchema>;
export type AddExpenseCommand = z.infer<typeof CreateExpenseRequestSchema>;
export type RecordPaymentCommand = z.infer<typeof CreatePaymentRequestSchema>;

export interface GroupSummary {
  readonly totalSpentCents: number;
  readonly balances: readonly Balance[];
  readonly settlements: readonly Settlement[];
}

/**
 * Use cases. Commands arrive already shape-validated by the shared schemas; this layer enforces
 * the rules that need data, such as "the payer must belong to the group".
 */
export class GroupService {
  constructor(
    private readonly groups: GroupRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  async createGroup(command: CreateGroupCommand): Promise<GroupRecord> {
    const group: GroupRecord = {
      id: this.newId(),
      name: command.name,
      currency: command.currency,
      createdAt: this.now(),
      members: command.members.map((name) => ({ id: this.newId(), name })),
    };
    await this.groups.createGroup(group);
    return group;
  }

  async getGroup(groupId: string): Promise<GroupRecord> {
    const group = await this.groups.findGroup(groupId);
    if (!group) throw new NotFoundError('group.not_found', 'This group does not exist.');
    return group;
  }

  async addMember(groupId: string, command: AddMemberCommand): Promise<MemberRecord> {
    const group = await this.getGroup(groupId);
    if (group.members.length >= MAX_MEMBERS) {
      throw new ConflictError('group.full', `A group can have up to ${MAX_MEMBERS} people.`);
    }
    if (group.members.some((member) => sameName(member.name, command.name))) {
      throw duplicateMember(command.name);
    }
    const member: MemberRecord = { id: this.newId(), name: command.name };
    await this.groups.addMember(groupId, member);
    return member;
  }

  async listExpenses(groupId: string): Promise<ExpenseRecord[]> {
    await this.getGroup(groupId);
    return this.groups.listExpenses(groupId);
  }

  async addExpense(groupId: string, command: AddExpenseCommand): Promise<ExpenseRecord> {
    const group = await this.getGroup(groupId);
    const members = new Set(group.members.map((member) => member.id));
    requireMember(members, command.paidBy, 'paidBy', 'The person who paid is not in this group.');

    const { split } = command;
    let shares;
    if (split.type === 'equal') {
      split.memberIds.forEach((id, index) => {
        requireMember(
          members,
          id,
          `split.memberIds.${index}`,
          'Everyone sharing must be in this group.',
        );
      });
      // Group order, not request order, decides who absorbs leftover cents: stable and fair.
      const chosen = new Set(split.memberIds);
      const ordered = group.members
        .filter((member) => chosen.has(member.id))
        .map((member) => member.id);
      shares = splitEvenly(command.amountCents, ordered);
    } else {
      split.shares.forEach((share, index) => {
        requireMember(
          members,
          share.memberId,
          `split.shares.${index}`,
          'Everyone sharing must be in this group.',
        );
      });
      shares = split.shares;
    }

    const expense: ExpenseRecord = {
      id: this.newId(),
      groupId,
      description: command.description,
      amountCents: command.amountCents,
      paidBy: command.paidBy,
      shares: shares.filter((share) => share.amountCents > 0),
      createdAt: this.now(),
    };
    await this.groups.addExpense(expense);
    return expense;
  }

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    await this.getGroup(groupId);
    if (!(await this.groups.deleteExpense(groupId, expenseId))) {
      throw new NotFoundError('expense.not_found', 'This expense does not exist.');
    }
  }

  async listPayments(groupId: string): Promise<PaymentRecord[]> {
    await this.getGroup(groupId);
    return this.groups.listPayments(groupId);
  }

  async recordPayment(groupId: string, command: RecordPaymentCommand): Promise<PaymentRecord> {
    const group = await this.getGroup(groupId);
    const members = new Set(group.members.map((member) => member.id));
    requireMember(
      members,
      command.fromMemberId,
      'fromMemberId',
      'The person paying is not in this group.',
    );
    requireMember(
      members,
      command.toMemberId,
      'toMemberId',
      'The person being paid is not in this group.',
    );

    const payment: PaymentRecord = { id: this.newId(), groupId, ...command, createdAt: this.now() };
    await this.groups.addPayment(payment);
    return payment;
  }

  async getSummary(groupId: string): Promise<GroupSummary> {
    const group = await this.getGroup(groupId);
    const [expenses, payments] = await Promise.all([
      this.groups.listExpenses(groupId),
      this.groups.listPayments(groupId),
    ]);
    const balances = computeBalances(
      group.members.map((member) => member.id),
      expenses,
      payments,
    );
    return {
      totalSpentCents: expenses.reduce((sum, expense) => sum + expense.amountCents, 0),
      balances,
      settlements: settleUp(balances),
    };
  }
}

export function sameName(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

export function duplicateMember(name: string): ConflictError {
  return new ConflictError('member.duplicate_name', `${name} is already in this group.`);
}

function requireMember(
  members: ReadonlySet<string>,
  id: string,
  path: string,
  message: string,
): void {
  if (!members.has(id)) {
    throw new ValidationError('member.not_in_group', message, [{ path, message }]);
  }
}
