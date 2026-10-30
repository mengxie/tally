import type { Expense, Group, GroupSummary, Payment } from '@tally/shared';
import { http, HttpResponse } from 'msw';

export const ids = {
  group: '6f1d1b6e-2a1f-4c51-9a8d-0d8f0f6a4b11',
  aroha: '0f8fad5b-d9cb-469f-a165-70867728950e',
  sam: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  mere: '9b2f3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d',
  expense: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
};

export const group: Group = {
  id: ids.group,
  name: 'Weekend in Wānaka',
  currency: 'NZD',
  createdAt: '2026-10-30T09:00:00.000Z',
  members: [
    { id: ids.aroha, name: 'Aroha' },
    { id: ids.sam, name: 'Sam' },
    { id: ids.mere, name: 'Mere' },
  ],
};

export const expenses: Expense[] = [
  {
    id: ids.expense,
    description: 'Bach for two nights',
    amountCents: 60_000,
    paidBy: ids.aroha,
    shares: [
      { memberId: ids.aroha, amountCents: 20_000 },
      { memberId: ids.sam, amountCents: 20_000 },
      { memberId: ids.mere, amountCents: 20_000 },
    ],
    createdAt: '2026-10-30T10:00:00.000Z',
  },
];

export const summary: GroupSummary = {
  totalSpentCents: 60_000,
  balances: [
    { memberId: ids.aroha, netCents: 40_000 },
    { memberId: ids.sam, netCents: -20_000 },
    { memberId: ids.mere, netCents: -20_000 },
  ],
  settlements: [
    { fromMemberId: ids.sam, toMemberId: ids.aroha, amountCents: 20_000 },
    { fromMemberId: ids.mere, toMemberId: ids.aroha, amountCents: 20_000 },
  ],
};

export const noPayments: Payment[] = [];

/** The API as the group page sees it, at network level. Tests override individual routes. */
export const handlers = () => [
  http.get('*/api/groups/:groupId', ({ params }) =>
    params['groupId'] === ids.group
      ? HttpResponse.json(group)
      : HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Not Found',
            status: 404,
            detail: 'This group does not exist.',
            code: 'group.not_found',
          },
          { status: 404, headers: { 'content-type': 'application/problem+json' } },
        ),
  ),
  http.get('*/api/groups/:groupId/expenses', () => HttpResponse.json(expenses)),
  http.get('*/api/groups/:groupId/payments', () => HttpResponse.json(noPayments)),
  http.get('*/api/groups/:groupId/summary', () => HttpResponse.json(summary)),
];
