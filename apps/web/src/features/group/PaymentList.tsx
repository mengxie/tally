import { formatMoney, type Group, type Payment } from '@tally/shared';
import { formatDay } from '../../lib/dates';
import type { NameOf } from './GroupPage';

export function PaymentList({
  group,
  payments,
  nameOf,
}: {
  group: Group;
  payments: Payment[];
  nameOf: NameOf;
}) {
  if (payments.length === 0) return null;
  return (
    <section className="ledger" aria-labelledby="payments-heading">
      <h2 id="payments-heading" className="section-heading">
        Payments
      </h2>
      <ul className="ledger__list">
        {payments.map((payment) => (
          <li key={payment.id} className="ledger__item">
            <div className="ledger__main">
              <span className="ledger__title">
                {nameOf(payment.fromMemberId)} paid {nameOf(payment.toMemberId)}
              </span>
              <span className="muted">{formatDay(payment.createdAt)}</span>
            </div>
            <span className="money">{formatMoney(payment.amountCents, group.currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
