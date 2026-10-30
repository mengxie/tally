import { formatMoney, type Group, type GroupSummary } from '@tally/shared';
import { useRecordPayment } from '../../api/hooks';
import { describeError } from '../../components/ErrorState';
import { Receipt, ReceiptRule } from '../../components/Receipt';
import type { NameOf } from './GroupPage';

const paymentsNeeded = (count: number) =>
  count === 1 ? 'One payment settles everyone.' : `${String(count)} payments settle everyone.`;

export function SettleUp({
  group,
  summary,
  nameOf,
}: {
  group: Group;
  summary: GroupSummary;
  nameOf: NameOf;
}) {
  const recordPayment = useRecordPayment(group.id);
  const money = (cents: number) => formatMoney(cents, group.currency);

  return (
    <Receipt title="Settle up">
      <p className="receipt__total">
        <span>Spent so far</span>
        <span className="money">{money(summary.totalSpentCents)}</span>
      </p>
      <ReceiptRule />

      {summary.settlements.length === 0 ? (
        <p className="receipt__square">Everyone is square.</p>
      ) : (
        <ul className="receipt__lines">
          {summary.settlements.map((settlement) => (
            <li
              key={`${settlement.fromMemberId}:${settlement.toMemberId}`}
              className="receipt__line receipt__line--action"
            >
              <span>
                {nameOf(settlement.fromMemberId)} pays {nameOf(settlement.toMemberId)}
              </span>
              <span className="money">{money(settlement.amountCents)}</span>
              <button
                type="button"
                className="button button--small"
                disabled={recordPayment.isPending}
                onClick={() => {
                  recordPayment.mutate(settlement);
                }}
              >
                Mark as paid
              </button>
            </li>
          ))}
        </ul>
      )}
      {recordPayment.isError && (
        <p className="form__error" role="alert">
          {describeError(recordPayment.error)}
        </p>
      )}

      <ReceiptRule />
      <ul className="receipt__balances" aria-label="Balances">
        {summary.balances.map((balance) => (
          <li key={balance.memberId} className="receipt__line">
            <span>{nameOf(balance.memberId)}</span>
            {balance.netCents > 0 && (
              <span className="money gets">gets back {money(balance.netCents)}</span>
            )}
            {balance.netCents < 0 && (
              <span className="money owes">owes {money(-balance.netCents)}</span>
            )}
            {balance.netCents === 0 && <span className="money">square</span>}
          </li>
        ))}
      </ul>
      {summary.settlements.length > 0 && (
        <p className="receipt__footer">{paymentsNeeded(summary.settlements.length)}</p>
      )}
    </Receipt>
  );
}
