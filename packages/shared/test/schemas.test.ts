import { describe, expect, it } from 'vitest';
import {
  CreateExpenseRequestSchema,
  CreateGroupRequestSchema,
  CreatePaymentRequestSchema,
} from '../src';

const alice = '0f8fad5b-d9cb-469f-a165-70867728950e';
const bob = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

describe('CreateGroupRequestSchema', () => {
  it('trims names and accepts a valid group', () => {
    const group = CreateGroupRequestSchema.parse({
      name: '  Flat 4  ',
      currency: 'NZD',
      members: [' Aroha', 'Sam '],
    });
    expect(group).toEqual({ name: 'Flat 4', currency: 'NZD', members: ['Aroha', 'Sam'] });
  });

  it('rejects duplicate names regardless of case, pointing at the duplicate', () => {
    const result = CreateGroupRequestSchema.safeParse({
      name: 'Trip',
      currency: 'NZD',
      members: ['Sam', 'sam'],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['members', 1]);
  });

  it('needs at least two people', () => {
    const result = CreateGroupRequestSchema.safeParse({
      name: 'Solo',
      currency: 'NZD',
      members: ['Me'],
    });
    expect(result.error?.issues[0]?.message).toBe('Add at least two people.');
  });
});

describe('CreateExpenseRequestSchema', () => {
  const base = { description: 'Groceries', amountCents: 1000, paidBy: alice };

  it('accepts exact shares that add up to the total', () => {
    const split = {
      type: 'exact',
      shares: [
        { memberId: alice, amountCents: 400 },
        { memberId: bob, amountCents: 600 },
      ],
    };
    expect(CreateExpenseRequestSchema.safeParse({ ...base, split }).success).toBe(true);
  });

  it('rejects exact shares that do not add up', () => {
    const split = { type: 'exact', shares: [{ memberId: alice, amountCents: 999 }] };
    const result = CreateExpenseRequestSchema.safeParse({ ...base, split });
    expect(result.error?.issues[0]?.message).toBe('The shares must add up to the total.');
  });

  it('rejects someone listed twice in an equal split', () => {
    const split = { type: 'equal', memberIds: [alice, alice] };
    expect(CreateExpenseRequestSchema.safeParse({ ...base, split }).success).toBe(false);
  });

  it('rejects fractional cents', () => {
    const split = { type: 'equal', memberIds: [alice] };
    expect(
      CreateExpenseRequestSchema.safeParse({ ...base, amountCents: 10.5, split }).success,
    ).toBe(false);
  });
});

describe('CreatePaymentRequestSchema', () => {
  it('rejects paying yourself', () => {
    const result = CreatePaymentRequestSchema.safeParse({
      fromMemberId: alice,
      toMemberId: alice,
      amountCents: 100,
    });
    expect(result.error?.issues[0]?.path).toEqual(['toMemberId']);
  });
});
