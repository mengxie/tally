import { formatMoney, type Expense, type Group } from '@tally/shared';
import { useState } from 'react';
import { useDeleteExpense } from '../../api/hooks';
import { formatDay } from '../../lib/dates';
import type { NameOf } from './GroupPage';

export function ExpenseList({
  group,
  expenses,
  nameOf,
}: {
  group: Group;
  expenses: Expense[];
  nameOf: NameOf;
}) {
  const deleteExpense = useDeleteExpense(group.id);
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <section className="ledger" aria-labelledby="expenses-heading">
      <h2 id="expenses-heading" className="section-heading">
        Expenses
      </h2>
      {expenses.length === 0 ? (
        <p className="muted">Nothing yet. Add the first thing someone paid for.</p>
      ) : (
        <ul className="ledger__list">
          {expenses.map((expense) => (
            <li key={expense.id} className="ledger__item">
              <div className="ledger__main">
                <span className="ledger__title">{expense.description}</span>
                <span className="muted">
                  {nameOf(expense.paidBy)} paid, {formatDay(expense.createdAt)}
                </span>
              </div>
              <span className="money">{formatMoney(expense.amountCents, group.currency)}</span>
              {confirming === expense.id ? (
                <span className="ledger__confirm">
                  <button
                    type="button"
                    className="button button--small button--danger"
                    aria-label={`Delete ${expense.description}`}
                    onClick={() => {
                      deleteExpense.mutate(expense.id);
                      setConfirming(null);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="button button--small button--quiet"
                    onClick={() => {
                      setConfirming(null);
                    }}
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="button button--small button--quiet"
                  aria-label={`Remove ${expense.description}`}
                  onClick={() => {
                    setConfirming(expense.id);
                  }}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
