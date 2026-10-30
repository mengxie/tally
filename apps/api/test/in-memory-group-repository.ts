import { duplicateMember, sameName } from '../src/application/group-service';
import type {
  ExpenseRecord,
  GroupRecord,
  GroupRepository,
  MemberRecord,
  PaymentRecord,
} from '../src/application/ports';

/** Test double for the persistence port. Verified by the same contract suite as Postgres. */
export class InMemoryGroupRepository implements GroupRepository {
  readonly #groups = new Map<string, GroupRecord>();
  readonly #expenses: ExpenseRecord[] = [];
  readonly #payments: PaymentRecord[] = [];

  createGroup(group: GroupRecord): Promise<void> {
    this.#groups.set(group.id, structuredClone(group));
    return Promise.resolve();
  }

  findGroup(groupId: string): Promise<GroupRecord | undefined> {
    const group = this.#groups.get(groupId);
    return Promise.resolve(group ? structuredClone(group) : undefined);
  }

  addMember(groupId: string, member: MemberRecord): Promise<void> {
    const group = this.#groups.get(groupId);
    if (!group) return Promise.reject(new Error(`No group ${groupId}`));
    if (group.members.some((existing) => sameName(existing.name, member.name))) {
      return Promise.reject(duplicateMember(member.name));
    }
    this.#groups.set(groupId, { ...group, members: [...group.members, { ...member }] });
    return Promise.resolve();
  }

  listExpenses(groupId: string): Promise<ExpenseRecord[]> {
    return Promise.resolve(
      structuredClone(newestFirst(this.#expenses.filter((e) => e.groupId === groupId))),
    );
  }

  addExpense(expense: ExpenseRecord): Promise<void> {
    this.#expenses.push(structuredClone(expense));
    return Promise.resolve();
  }

  deleteExpense(groupId: string, expenseId: string): Promise<boolean> {
    const index = this.#expenses.findIndex((e) => e.groupId === groupId && e.id === expenseId);
    if (index >= 0) this.#expenses.splice(index, 1);
    return Promise.resolve(index >= 0);
  }

  listPayments(groupId: string): Promise<PaymentRecord[]> {
    return Promise.resolve(
      structuredClone(newestFirst(this.#payments.filter((p) => p.groupId === groupId))),
    );
  }

  addPayment(payment: PaymentRecord): Promise<void> {
    this.#payments.push(structuredClone(payment));
    return Promise.resolve();
  }
}

function newestFirst<T extends { createdAt: Date; id: string }>(items: T[]): T[] {
  return items.toSorted(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
  );
}
