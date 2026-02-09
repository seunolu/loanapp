# API Contracts (V1 Draft)

Base: /api/v1  
Auth: Bearer JWT  
Idempotency: money-moving endpoints require Idempotency-Key header.

Main route groups:

- /auth/\*
- /me, /me/profile, /me/consents
- /files/\*
- /kyc/\*
- /loans/\*
- /payments/\*
- /webhooks/paystack
- /admin/\*

See docs/openapi.yaml for endpoint skeleton and payload shapes.
