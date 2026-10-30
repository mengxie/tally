# ADR 0004: A layered API with a repository port and a contract test suite

- Status: Accepted
- Date: 2026-10-30

## Context

Business rules mixed into route handlers and SQL are hard to test and easy to break. A full
domain-driven design would be heavier than an app of this size needs.

## Decision

Four layers, with dependencies pointing inwards:

- `domain/`: pure functions for balances and settle-up. No I/O.
- `application/`: the `GroupService` use cases, typed errors, and the `GroupRepository` port.
- `infrastructure/`: the Kysely database, migrations and `PostgresGroupRepository`.
- `http/`: Fastify routes that parse input, call one use case and present the result.

`main.ts` is the only place that wires them together.

The repository port has a PostgreSQL adapter and an in-memory adapter, and one contract test suite
runs against both. Service and HTTP tests use the in-memory adapter and run in milliseconds; the
contract suite proves the in-memory adapter behaves like the real database.

## Consequences

- Business rules are tested without a database or HTTP.
- A new storage adapter is done when it passes the contract suite unchanged.
- Some mapping code between rows, application records and response DTOs.
