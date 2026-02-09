# Contributing

## Rules

- Do not build features not in docs/PROJECT_BIBLE.md and docs/PRD.md.
- One PR = one issue (small, reviewable).
- All money-moving endpoints require idempotency.
- All admin actions must write audit logs.

## Commit messages

Conventional commits required, e.g.:

- feat: add otp request endpoint
- fix: prevent duplicate disbursement
- chore: update docs

## Local checks

Run before pushing:

- pnpm format:check
- pnpm lint
- pnpm typecheck
- pnpm test
