# ADR-004: Bun as package manager

## Status

Accepted

## Context

The repo ships `bun.lock`. Mixing npm lockfiles causes drift.

## Decision

Prefer Bun for install and scripts (`bun install`, `bun run dev`). Keep a single lockfile (`bun.lock`).

## Alternatives considered

- npm/`package-lock.json` only — fine if team standardizes, but would replace Bun lock intentionally
- Dual lockfiles — rejected

## Consequences

- Faster installs when Bun is on PATH
- Contributors need Bun (or must consciously migrate lockfiles)
