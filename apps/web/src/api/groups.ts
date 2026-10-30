import {
  type AddMemberRequest,
  type CreateExpenseRequest,
  type CreateGroupRequest,
  type CreatePaymentRequest,
  ExpenseSchema,
  GroupSchema,
  GroupSummarySchema,
  MemberSchema,
  PaymentSchema,
} from '@tally/shared';
import { z } from 'zod';
import { request, requestWithoutContent } from './client';

const group = (groupId: string) => `/groups/${encodeURIComponent(groupId)}`;

export const groupsApi = {
  create: (body: CreateGroupRequest) => request('/groups', GroupSchema, { method: 'POST', body }),
  get: (groupId: string, signal?: AbortSignal) => request(group(groupId), GroupSchema, { signal }),
  addMember: (groupId: string, body: AddMemberRequest) =>
    request(`${group(groupId)}/members`, MemberSchema, { method: 'POST', body }),
  expenses: (groupId: string, signal?: AbortSignal) =>
    request(`${group(groupId)}/expenses`, z.array(ExpenseSchema), { signal }),
  addExpense: (groupId: string, body: CreateExpenseRequest) =>
    request(`${group(groupId)}/expenses`, ExpenseSchema, { method: 'POST', body }),
  deleteExpense: (groupId: string, expenseId: string) =>
    requestWithoutContent(`${group(groupId)}/expenses/${encodeURIComponent(expenseId)}`, {
      method: 'DELETE',
    }),
  payments: (groupId: string, signal?: AbortSignal) =>
    request(`${group(groupId)}/payments`, z.array(PaymentSchema), { signal }),
  recordPayment: (groupId: string, body: CreatePaymentRequest) =>
    request(`${group(groupId)}/payments`, PaymentSchema, { method: 'POST', body }),
  summary: (groupId: string, signal?: AbortSignal) =>
    request(`${group(groupId)}/summary`, GroupSummarySchema, { signal }),
};
