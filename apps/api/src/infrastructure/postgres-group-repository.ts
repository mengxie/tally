import type { Currency } from '@tally/shared';
import { type Kysely, sql } from 'kysely';
import { duplicateMember } from '../application/group-service';
import type {
  ExpenseRecord,
  GroupRecord,
  GroupRepository,
  MemberRecord,
  PaymentRecord,
} from '../application/ports';
import { type Database, isUniqueViolation } from './database';

export class PostgresGroupRepository implements GroupRepository {
  constructor(private readonly db: Kysely<Database>) {}

  async createGroup(group: GroupRecord): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('groups')
        .values({
          id: group.id,
          name: group.name,
          currency: group.currency,
          created_at: group.createdAt,
        })
        .execute();
      await trx
        .insertInto('members')
        .values(
          group.members.map((member, position) => ({ ...member, group_id: group.id, position })),
        )
        .execute();
    });
  }

  async findGroup(groupId: string): Promise<GroupRecord | undefined> {
    const group = await this.db
      .selectFrom('groups')
      .selectAll()
      .where('id', '=', groupId)
      .executeTakeFirst();
    if (!group) return undefined;
    const members = await this.db
      .selectFrom('members')
      .select(['id', 'name'])
      .where('group_id', '=', groupId)
      .orderBy('position')
      .execute();
    return {
      id: group.id,
      name: group.name,
      currency: group.currency as Currency,
      createdAt: group.created_at,
      members,
    };
  }

  async addMember(groupId: string, member: MemberRecord): Promise<void> {
    try {
      await this.db
        .insertInto('members')
        .values({
          ...member,
          group_id: groupId,
          position: sql<number>`(SELECT coalesce(max(position), -1) + 1 FROM members WHERE group_id = ${groupId})`,
        })
        .execute();
    } catch (error) {
      if (isUniqueViolation(error, 'members_group_name_unique')) throw duplicateMember(member.name);
      throw error;
    }
  }

  async listExpenses(groupId: string): Promise<ExpenseRecord[]> {
    const expenses = await this.db
      .selectFrom('expenses')
      .selectAll()
      .where('group_id', '=', groupId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute();
    if (expenses.length === 0) return [];

    const shares = await this.db
      .selectFrom('expense_shares')
      .innerJoin('members', 'members.id', 'expense_shares.member_id')
      .select([
        'expense_shares.expense_id',
        'expense_shares.member_id',
        'expense_shares.amount_cents',
      ])
      .where(
        'expense_shares.expense_id',
        'in',
        expenses.map((expense) => expense.id),
      )
      .orderBy('members.position')
      .execute();

    return expenses.map((expense) => ({
      id: expense.id,
      groupId: expense.group_id,
      description: expense.description,
      amountCents: expense.amount_cents,
      paidBy: expense.paid_by,
      shares: shares
        .filter((share) => share.expense_id === expense.id)
        .map((share) => ({ memberId: share.member_id, amountCents: share.amount_cents })),
      createdAt: expense.created_at,
    }));
  }

  async addExpense(expense: ExpenseRecord): Promise<void> {
    await this.db.transaction().execute(async (trx) => {
      await trx
        .insertInto('expenses')
        .values({
          id: expense.id,
          group_id: expense.groupId,
          description: expense.description,
          amount_cents: expense.amountCents,
          paid_by: expense.paidBy,
          created_at: expense.createdAt,
        })
        .execute();
      await trx
        .insertInto('expense_shares')
        .values(
          expense.shares.map((share) => ({
            expense_id: expense.id,
            member_id: share.memberId,
            amount_cents: share.amountCents,
          })),
        )
        .execute();
    });
  }

  async deleteExpense(groupId: string, expenseId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('expenses')
      .where('group_id', '=', groupId)
      .where('id', '=', expenseId)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  }

  async listPayments(groupId: string): Promise<PaymentRecord[]> {
    const rows = await this.db
      .selectFrom('payments')
      .selectAll()
      .where('group_id', '=', groupId)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .execute();
    return rows.map((row) => ({
      id: row.id,
      groupId: row.group_id,
      fromMemberId: row.from_member_id,
      toMemberId: row.to_member_id,
      amountCents: row.amount_cents,
      createdAt: row.created_at,
    }));
  }

  async addPayment(payment: PaymentRecord): Promise<void> {
    await this.db
      .insertInto('payments')
      .values({
        id: payment.id,
        group_id: payment.groupId,
        from_member_id: payment.fromMemberId,
        to_member_id: payment.toMemberId,
        amount_cents: payment.amountCents,
        created_at: payment.createdAt,
      })
      .execute();
  }
}
