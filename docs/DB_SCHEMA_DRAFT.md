# DB Schema Draft (PostgreSQL, V1)

Principles:

- UUID/ULID IDs
- money stored as integer kobo
- immutable records: consent_records, journal_entries, audit_logs
- derived balances from ledger

Core tables:

- borrowers, borrower_profiles, borrower_devices, sessions
- files
- kyc_cases, kyc_documents
- loan_applications, loan_offers, loans, repayment_schedule_items
- bank_accounts, disbursements
- payments, webhook_events
- ledger_accounts, journal_entries, journal_lines
- consent_records, audit_logs
- admin_users
- idempotency_keys

The canonical draft lives in the previous spec; we implement actual schema in migrations during Issue 005.
