# ADR 0001: A monorepo with one shared contract package

- Status: Accepted
- Date: 2026-10-30

## Context

A frontend and an API that describe the same data separately drift apart: a renamed field or a
new validation rule is updated on one side and forgotten on the other, and the mismatch surfaces
as a runtime bug.

## Decision

Keep the web app, the API and a `shared` package in one npm-workspaces monorepo. `shared` defines
every request and response as a zod schema, and exports the TypeScript types inferred from them.

- The API parses every request body with the request schemas.
- The web app validates its forms with the same rules, and parses every response with the response
  schemas, so an unexpected payload fails at the boundary with a clear error.

## Consequences

- One change to the contract is a compile error in both apps until both agree.
- Users see the same validation messages in the browser as the API would return.
- The shared package must stay free of browser- and server-specific code. It contains only zod
  and plain functions.
