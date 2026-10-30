import type { CreateExpenseRequest, CreatePaymentRequest, Group } from '@tally/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from './groups';

/** One place for cache keys, so invalidation can never miss a query. */
export const groupKeys = {
  detail: (groupId: string) => ['groups', groupId] as const,
  expenses: (groupId: string) => ['groups', groupId, 'expenses'] as const,
  payments: (groupId: string) => ['groups', groupId, 'payments'] as const,
  summary: (groupId: string) => ['groups', groupId, 'summary'] as const,
};

export const groupQuery = (groupId: string) =>
  queryOptions({
    queryKey: groupKeys.detail(groupId),
    queryFn: ({ signal }) => groupsApi.get(groupId, signal),
  });
export const expensesQuery = (groupId: string) =>
  queryOptions({
    queryKey: groupKeys.expenses(groupId),
    queryFn: ({ signal }) => groupsApi.expenses(groupId, signal),
  });
export const paymentsQuery = (groupId: string) =>
  queryOptions({
    queryKey: groupKeys.payments(groupId),
    queryFn: ({ signal }) => groupsApi.payments(groupId, signal),
  });
export const summaryQuery = (groupId: string) =>
  queryOptions({
    queryKey: groupKeys.summary(groupId),
    queryFn: ({ signal }) => groupsApi.summary(groupId, signal),
  });

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsApi.create,
    // Seed the cache so the group page renders instantly after navigation.
    onSuccess: (group: Group) => queryClient.setQueryData(groupKeys.detail(group.id), group),
  });
}

export function useAddMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => groupsApi.addMember(groupId, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
  });
}

export function useAddExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateExpenseRequest) => groupsApi.addExpense(groupId, body),
    onSuccess: () => invalidateLedger(queryClient, groupId),
  });
}

export function useDeleteExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (expenseId: string) => groupsApi.deleteExpense(groupId, expenseId),
    onSuccess: () => invalidateLedger(queryClient, groupId),
  });
}

export function useRecordPayment(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePaymentRequest) => groupsApi.recordPayment(groupId, body),
    onSuccess: () => invalidateLedger(queryClient, groupId),
  });
}

function invalidateLedger(queryClient: ReturnType<typeof useQueryClient>, groupId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: groupKeys.expenses(groupId) }),
    queryClient.invalidateQueries({ queryKey: groupKeys.payments(groupId) }),
    queryClient.invalidateQueries({ queryKey: groupKeys.summary(groupId) }),
  ]);
}
