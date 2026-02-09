# Architecture (V1)

## 1. Components

Clients:

- Borrower Mobile App
- Admin Web Dashboard

Core:

- NestJS API (modular monolith)
- PostgreSQL (source of truth)
- Redis (rate limiting, queues, sessions)
- Worker (BullMQ) for async jobs

External providers (adapters):

- Payments (Paystack for collections)
- Disbursement provider (bank transfer partner)
- KYC provider (BVN/NIN/ID)
- SMS/Email provider

## 2. Architecture Style

- Modular monolith (clean boundaries)
- Hexagonal ports/adapters for providers
- Ledger-first accounting
- Audit logs + idempotency on money-moving flows

## 3. Core Data Flow

Apply → Offer → Accept → Disburse → Repay (webhook) → Ledger posting → Close

## 4. Cross-cutting

- Idempotency keys
- Audit logs
- State machines
- Background jobs with retries
- Observability hooks (requestId, correlationId)
