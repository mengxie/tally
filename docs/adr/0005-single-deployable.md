# ADR 0005: One deployable: the API serves the web app

- Status: Accepted
- Date: 2026-10-30

## Context

A single-page app is often hosted separately from its API. That brings a second deployment, CORS
configuration, and two origins to secure, which this app does not need.

## Decision

In production the Fastify server also serves the Vite build:

- Fingerprinted files under `assets/` get `Cache-Control: immutable` for a year; `index.html` is
  never cached, so a deploy takes effect immediately.
- Unknown `GET` paths outside `/api` return `index.html`, so client-side routes deep-link.
- Unknown `/api` paths return a 404 problem, never HTML.

The Docker image contains only the API bundle, the web build and the API's production
dependencies, runs as a non-root user and has a health check.

## Consequences

- One container, one origin, no CORS, and one Content Security Policy for everything.
- Static files are served by Node rather than a CDN. For heavier traffic, put a CDN in front: the
  cache headers are already correct for it.
