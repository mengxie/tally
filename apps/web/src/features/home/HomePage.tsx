import { formatMoney } from '@tally/shared';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { Receipt, ReceiptRule } from '../../components/Receipt';
import { readRecentGroups } from '../../lib/recent-groups';
import { CreateGroupForm } from './CreateGroupForm';

const example = [
  { from: 'Mere', to: 'Aroha', cents: 23_000 },
  { from: 'Sam', to: 'Aroha', cents: 14_000 },
];

export function HomePage() {
  const recent = readRecentGroups();
  useEffect(() => {
    document.title = 'Tally: who owes who, sorted';
  }, []);

  return (
    <div className="home">
      <section className="home__intro">
        <h1 className="home__headline">Who owes who, sorted.</h1>
        <p className="home__lede">
          Log what everyone pays for. Tally keeps the running balance to the cent, then works out
          the fewest payments that square everyone up.
        </p>
        <CreateGroupForm />
        {recent.length > 0 && (
          <nav className="recent" aria-labelledby="recent-heading">
            <h2 id="recent-heading" className="recent__heading">
              Your groups on this device
            </h2>
            <ul className="recent__list">
              {recent.map((group) => (
                <li key={group.id}>
                  <Link to={`/groups/${group.id}`}>{group.name}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>

      <figure className="home__example">
        <Receipt title="Weekend in Wānaka">
          <p className="receipt__total">
            <span>Spent</span>
            <span className="money">{formatMoney(69_000, 'NZD')}</span>
          </p>
          <ReceiptRule />
          <ul className="receipt__lines">
            {example.map((line) => (
              <li key={line.from} className="receipt__line">
                <span>
                  {line.from} pays {line.to}
                </span>
                <span className="money">{formatMoney(line.cents, 'NZD')}</span>
              </li>
            ))}
          </ul>
          <ReceiptRule />
          <p className="receipt__footer">Two payments settle everyone.</p>
        </Receipt>
        <figcaption>What a trip for three looks like once Tally has done the sums.</figcaption>
      </figure>
    </div>
  );
}
