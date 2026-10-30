# ADR 0002: Integer cents and deterministic splitting

- Status: Accepted
- Date: 2026-10-30

## Context

Floating-point numbers cannot represent most decimal amounts exactly (0.1 + 0.2 ≠ 0.3), and
splitting $10.00 three ways cannot be exact in cents. Both problems produce balances that are off
by a cent and never quite settle.

## Decision

- Store and compute every amount as an integer number of cents, in TypeScript and in PostgreSQL
  (`integer` columns with check constraints).
- Parse user input with string arithmetic (`"12.5"` becomes 1250), never `parseFloat`.
- Split evenly with `splitEvenly`: each person gets the floor of the share, and the leftover cents
  go one each to the first members in the group's order. The result always adds up exactly.
- Use the same `splitEvenly` in the browser (live preview) and on the server (authoritative).

## Consequences

- Balances always sum to exactly zero, and settling up reaches exactly zero.
- Leftover cents fall predictably on the same people. Over many expenses this is negligible, and
  it is explainable, which matters more for trust.
- Currencies without two minor units (for example JPY) are not supported yet.
