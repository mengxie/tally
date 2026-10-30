import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ConflictError } from '../src/application/errors';
import type { GroupRecord, GroupRepository } from '../src/application/ports';

/** Behaviour every GroupRepository must have. A new adapter is done when this passes. */
export function describeRepositoryContract(name: string, repository: () => GroupRepository): void {
  describe(`GroupRepository contract: ${name}`, () => {
    let tick = Date.UTC(2026, 9, 30, 9);
    const at = (): Date => new Date((tick += 1000));

    async function seedGroup(repo: GroupRepository): Promise<GroupRecord> {
      const group: GroupRecord = {
        id: randomUUID(),
        name: 'Flat 4',
        currency: 'NZD',
        createdAt: at(),
        members: [
          { id: randomUUID(), name: 'Aroha' },
          { id: randomUUID(), name: 'Sam' },
          { id: randomUUID(), name: 'Mere' },
        ],
      };
      await repo.createGroup(group);
      return group;
    }

    it('stores a group and returns it with members in order', async () => {
      const repo = repository();
      const group = await seedGroup(repo);
      expect(await repo.findGroup(group.id)).toEqual(group);
      expect(await repo.findGroup(randomUUID())).toBeUndefined();
    });

    it('appends members and rejects a duplicate name in any case', async () => {
      const repo = repository();
      const group = await seedGroup(repo);
      await repo.addMember(group.id, { id: randomUUID(), name: 'Tama' });
      await expect(
        repo.addMember(group.id, { id: randomUUID(), name: 'tama' }),
      ).rejects.toBeInstanceOf(ConflictError);
      expect((await repo.findGroup(group.id))?.members.map((m) => m.name)).toEqual([
        'Aroha',
        'Sam',
        'Mere',
        'Tama',
      ]);
    });

    it('lists expenses newest first, with shares in member order', async () => {
      const repo = repository();
      const group = await seedGroup(repo);
      const [aroha, sam, mere] = group.members as [
        GroupRecord['members'][0],
        GroupRecord['members'][0],
        GroupRecord['members'][0],
      ];
      const older = {
        id: randomUUID(),
        groupId: group.id,
        description: 'Power',
        amountCents: 900,
        paidBy: aroha.id,
        shares: [
          { memberId: aroha.id, amountCents: 300 },
          { memberId: sam.id, amountCents: 300 },
          { memberId: mere.id, amountCents: 300 },
        ],
        createdAt: at(),
      };
      const newer = {
        id: randomUUID(),
        groupId: group.id,
        description: 'Pizza',
        amountCents: 500,
        paidBy: sam.id,
        shares: [{ memberId: mere.id, amountCents: 500 }],
        createdAt: at(),
      };
      await repo.addExpense(older);
      await repo.addExpense(newer);

      const expenses = await repo.listExpenses(group.id);
      expect(expenses.map((e) => e.description)).toEqual(['Pizza', 'Power']);
      expect(expenses[1]).toEqual(older);
    });

    it('deletes an expense only within its own group', async () => {
      const repo = repository();
      const group = await seedGroup(repo);
      const other = await seedGroup(repo);
      const payer = group.members[0]?.id ?? '';
      const expense = {
        id: randomUUID(),
        groupId: group.id,
        description: 'Milk',
        amountCents: 300,
        paidBy: payer,
        shares: [{ memberId: payer, amountCents: 300 }],
        createdAt: at(),
      };
      await repo.addExpense(expense);

      expect(await repo.deleteExpense(other.id, expense.id)).toBe(false);
      expect(await repo.deleteExpense(group.id, expense.id)).toBe(true);
      expect(await repo.deleteExpense(group.id, expense.id)).toBe(false);
      expect(await repo.listExpenses(group.id)).toEqual([]);
    });

    it('lists payments newest first', async () => {
      const repo = repository();
      const group = await seedGroup(repo);
      const [a, b] = group.members.map((m) => m.id) as [string, string];
      const first = {
        id: randomUUID(),
        groupId: group.id,
        fromMemberId: a,
        toMemberId: b,
        amountCents: 100,
        createdAt: at(),
      };
      const second = { ...first, id: randomUUID(), amountCents: 200, createdAt: at() };
      await repo.addPayment(first);
      await repo.addPayment(second);
      expect(await repo.listPayments(group.id)).toEqual([second, first]);
    });
  });
}
