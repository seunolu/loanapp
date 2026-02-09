# ADR 0001 — Modular monolith + ledger-first accounting

## Status

Accepted

## Context

We are building a regulated digital lending system where financial correctness, auditability, and compliance are critical.

## Decision

- Use a NestJS modular monolith with clear module boundaries.
- Use PostgreSQL as the source of truth.
- Use a double-entry ledger (journal entries/lines) as the foundation for balances.
- Use ports/adapters for external providers (payments, KYC, disbursement, notifications).

## Consequences

- Faster delivery than microservices while preserving future split potential.
- Strong auditability and dispute resolution capability.
- Slightly more upfront design work, fewer production “money bugs.”
