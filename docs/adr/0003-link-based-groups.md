# ADR 0003: Groups reached by link instead of accounts

- Status: Accepted
- Date: 2026-10-30

## Context

Splitting costs is usually a short-lived, social task: a trip or a flat. Requiring everyone to
create an account is the main reason people fall back to a spreadsheet.

## Decision

A group is reached through an unguessable link containing a random version 4 UUID (122 bits of
randomness), in the style of capability URLs. There is no endpoint that lists groups. Malformed
ids are answered as "not found", and the API is rate limited. The interface states plainly that
anyone with the link can see and edit the group, and the browser remembers recently opened groups
locally.

## Consequences

- No sign-up, passwords or personal data to protect.
- The link is the credential: anyone it is shared with can edit. That suits groups of people who
  trust each other, and is stated in the interface.
- There is no per-person audit trail yet. An optional edit PIN and an activity log are the next
  steps if groups need more control.
