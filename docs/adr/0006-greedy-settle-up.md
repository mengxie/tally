# ADR 0006: Greedy debt simplification

- Status: Accepted
- Date: 2026-10-30

## Context

After a trip, a naive list of "who owes whom per expense" can mean dozens of payments. Finding the
true minimum number of payments is NP-hard (it reduces to subset-sum partitioning).

## Decision

Repeatedly match the person who owes the most with the person who is owed the most, transfer the
smaller of the two amounts, and continue. Ties break by member order.

## Consequences

- At most n − 1 payments for n people with a non-zero balance, usually fewer.
- Deterministic: the same balances always give the same suggestions, so they do not reshuffle
  between page loads.
- Easy to explain to users. Not always the theoretical minimum, which is an acceptable trade.
- Verified by property-based tests: every random ledger settles to exactly zero, within n − 1
  positive payments.
