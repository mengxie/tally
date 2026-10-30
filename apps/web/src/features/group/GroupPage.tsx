import type { Group } from '@tally/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../../api/client';
import { expensesQuery, groupQuery, paymentsQuery, summaryQuery } from '../../api/hooks';
import { ErrorState } from '../../components/ErrorState';
import { rememberGroup } from '../../lib/recent-groups';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';
import { MembersBar } from './MembersBar';
import { PaymentList } from './PaymentList';
import { SettleUp } from './SettleUp';
import { ShareLink } from './ShareLink';

export type NameOf = (memberId: string) => string;

export function GroupPage() {
  const { groupId = '' } = useParams();
  const group = useQuery(groupQuery(groupId));

  if (group.isPending) {
    return (
      <p className="page-message" aria-busy="true">
        Loading group…
      </p>
    );
  }
  if (group.isError) {
    if (group.error instanceof ApiError && group.error.status === 404) {
      return (
        <div className="page-message">
          <h1>This group doesn’t exist</h1>
          <p>Check that you have the whole link, or start a new group.</p>
          <Link to="/">Start a group</Link>
        </div>
      );
    }
    return <ErrorState error={group.error} onRetry={() => void group.refetch()} />;
  }
  return <GroupView group={group.data} />;
}

function GroupView({ group }: { group: Group }) {
  const expenses = useQuery(expensesQuery(group.id));
  const payments = useQuery(paymentsQuery(group.id));
  const summary = useQuery(summaryQuery(group.id));

  const nameOf = useMemo<NameOf>(() => {
    const names = new Map(group.members.map((member) => [member.id, member.name]));
    return (memberId) => names.get(memberId) ?? 'Someone';
  }, [group.members]);

  useEffect(() => {
    rememberGroup({ id: group.id, name: group.name });
    document.title = `${group.name} | Tally`;
  }, [group.id, group.name]);

  return (
    <div className="group">
      <header className="group__header">
        <h1 className="group__name">{group.name}</h1>
        <ShareLink />
        <MembersBar group={group} />
      </header>

      <aside className="group__settle">
        {summary.isSuccess && <SettleUp group={group} summary={summary.data} nameOf={nameOf} />}
        {summary.isError && (
          <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
        )}
      </aside>

      <div className="group__ledger">
        <ExpenseForm group={group} />
        {expenses.isSuccess && (
          <ExpenseList group={group} expenses={expenses.data} nameOf={nameOf} />
        )}
        {expenses.isError && (
          <ErrorState error={expenses.error} onRetry={() => void expenses.refetch()} />
        )}
        {payments.isSuccess && (
          <PaymentList group={group} payments={payments.data} nameOf={nameOf} />
        )}
      </div>
    </div>
  );
}
