import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from '../src/application/errors';
import { GroupService } from '../src/application/group-service';
import { InMemoryGroupRepository } from './in-memory-group-repository';

describe('GroupService', () => {
  let service: GroupService;
  let clock: number;

  beforeEach(() => {
    clock = Date.UTC(2026, 9, 30);
    service = new GroupService(new InMemoryGroupRepository(), () => new Date((clock += 1000)));
  });

  const newGroup = () =>
    service.createGroup({
      name: 'Wānaka trip',
      currency: 'NZD',
      members: ['Aroha', 'Sam', 'Mere'],
    });

  it('creates a group with an id for every member', async () => {
    const group = await newGroup();
    expect(group.members.map((m) => m.name)).toEqual(['Aroha', 'Sam', 'Mere']);
    expect(await service.getGroup(group.id)).toEqual(group);
  });

  it('reports an unknown group as not found', async () => {
    await expect(service.getGroup(randomUUID())).rejects.toBeInstanceOf(NotFoundError);
  });

  it('refuses a second member with the same name', async () => {
    const group = await newGroup();
    await expect(service.addMember(group.id, { name: 'SAM' })).rejects.toMatchObject({
      code: 'member.duplicate_name',
    });
  });

  it('gives leftover cents to members in group order, not request order', async () => {
    const group = await newGroup();
    const [aroha, sam, mere] = group.members.map((m) => m.id) as [string, string, string];
    const expense = await service.addExpense(group.id, {
      description: 'Petrol',
      amountCents: 1000,
      paidBy: aroha,
      split: { type: 'equal', memberIds: [mere, sam, aroha] },
    });
    expect(expense.shares).toEqual([
      { memberId: aroha, amountCents: 334 },
      { memberId: sam, amountCents: 333 },
      { memberId: mere, amountCents: 333 },
    ]);
  });

  it('drops zero shares from an exact split', async () => {
    const group = await newGroup();
    const [aroha, sam] = group.members.map((m) => m.id) as [string, string];
    const expense = await service.addExpense(group.id, {
      description: 'Concert',
      amountCents: 5000,
      paidBy: aroha,
      split: {
        type: 'exact',
        shares: [
          { memberId: aroha, amountCents: 0 },
          { memberId: sam, amountCents: 5000 },
        ],
      },
    });
    expect(expense.shares).toEqual([{ memberId: sam, amountCents: 5000 }]);
  });

  it('rejects people who are not in the group, naming the field', async () => {
    const group = await newGroup();
    const stranger = randomUUID();
    const attempt = service.addExpense(group.id, {
      description: 'Snacks',
      amountCents: 100,
      paidBy: stranger,
      split: { type: 'equal', memberIds: [stranger] },
    });
    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await expect(attempt).rejects.toMatchObject({ errors: [{ path: 'paidBy' }] });
    await expect(
      service.recordPayment(group.id, {
        fromMemberId: stranger,
        toMemberId: group.members[0]?.id ?? '',
        amountCents: 1,
      }),
    ).rejects.toMatchObject({ code: 'member.not_in_group' });
  });

  it('summarises a trip and settles to zero once the suggestions are paid', async () => {
    const group = await newGroup();
    const [aroha, sam, mere] = group.members.map((m) => m.id) as [string, string, string];
    await service.addExpense(group.id, {
      description: 'Bach',
      amountCents: 60000,
      paidBy: aroha,
      split: { type: 'equal', memberIds: [aroha, sam, mere] },
    });
    await service.addExpense(group.id, {
      description: 'Groceries',
      amountCents: 9000,
      paidBy: sam,
      split: { type: 'equal', memberIds: [aroha, sam, mere] },
    });

    const summary = await service.getSummary(group.id);
    expect(summary.totalSpentCents).toBe(69000);
    expect(summary.balances.map((b) => b.netCents)).toEqual([37000, -14000, -23000]);
    expect(summary.settlements).toEqual([
      { fromMemberId: mere, toMemberId: aroha, amountCents: 23000 },
      { fromMemberId: sam, toMemberId: aroha, amountCents: 14000 },
    ]);

    for (const s of summary.settlements) await service.recordPayment(group.id, s);
    const settled = await service.getSummary(group.id);
    expect(settled.settlements).toEqual([]);
    expect(settled.balances.every((b) => b.netCents === 0)).toBe(true);
  });

  it('reports deleting an unknown expense as not found', async () => {
    const group = await newGroup();
    await expect(service.deleteExpense(group.id, randomUUID())).rejects.toMatchObject({
      code: 'expense.not_found',
    });
  });

  it('caps the size of a group', async () => {
    const group = await service.createGroup({
      name: 'Big',
      currency: 'NZD',
      members: Array.from({ length: 20 }, (_, i) => `Person ${i}`),
    });
    await expect(service.addMember(group.id, { name: 'One more' })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});
