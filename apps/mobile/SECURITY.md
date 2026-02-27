# Mobile Security Audit and Hardening (Expo Managed)

Last updated: 2026-02-27

## 1) Security Audit Report

### Token lifecycle mapping
- Create/store:
  - `src/lib/api.ts` -> `verifyOtp(...)` stores tokens through `setTokens(...)`.
  - `src/auth/AuthProvider.tsx` dev bypass stores synthetic tokens through `setTokens(...)`.
- Read:
  - `src/auth/auth-service.ts` -> `hydrateStoredSession()`, `validateSession()`, `refreshSessionTokens()`.
  - `src/auth/auth-client.ts` -> `buildHeaders(...)`.
  - `src/lib/api.ts` -> `logout()`, `hasActiveSession()`.
  - `src/lib/http/client.ts` -> `request(...)` via `getSessionTokens()`.
- Refresh:
  - `src/auth/auth-service.ts` -> `POST /api/v1/auth/refresh` with `{ refreshToken }`.
  - `src/auth/auth-client.ts` -> single-flight refresh (`refreshPromise`) + one retry max (`retryOnUnauthorized: false`).
- Clear:
  - `src/auth/token-storage.ts` -> `clearTokens()`.
  - Called by `logout()`, session expiry path in `auth-client`, and local reset.

### Every Authorization header setter
- `src/auth/auth-service.ts` (`validateSession`) sets `Authorization: Bearer <accessToken>`.
- `src/auth/auth-client.ts` (`buildHeaders`) sets `Authorization: Bearer <accessToken>`.
- `src/lib/api.ts` (`fetchJson`) sets `Authorization` when `input.token` is provided.
- `src/lib/http/client.ts` (`request`) sets `Authorization` from session token.

### Persistence mechanisms
- Tokens:
  - `expo-secure-store` only (hardened).
  - Legacy AsyncStorage token fallback keys are migrated once, then deleted.
- Tenant slug + device ID:
  - AsyncStorage (`src/lib/storage.ts`).
- KYC progress/checklist:
  - AsyncStorage (`src/providers/kyc-provider.tsx`).

### Sensitive data in plaintext (current state)
- Stored in AsyncStorage (non-token):
  - Tenant slug.
  - Device ID.
  - KYC completion snapshot/checklist state.
- Not stored in plaintext anymore:
  - Access token / refresh token (SecureStore only).

### Error/telemetry exposure review
- Hardening added:
  - `src/security/redaction.ts` to redact token-like strings from surfaced error messages.
  - No explicit logs of Authorization/token values in app code.
- Existing console error logging retained for crash diagnostics:
  - `src/errors/ErrorBoundary.tsx`
  - `src/ui/feedback/ErrorBoundary.tsx`
  - These do not intentionally print tokens.

## 2) Implemented Hardening

### Secure token storage
- Removed AsyncStorage fallback for active token reads/writes.
- Added one-time migration from legacy AsyncStorage token keys into SecureStore.
- Added secure tenant-binding key for session consistency checks.

### Session/device binding
- Added headers on auth requests:
  - `x-device-id`
  - `x-app-version`
  - `x-platform`
- Kept existing `X-Device-Id` for compatibility.
- Added tenant binding soft mitigation:
  - If authenticated requests observe tenant mismatch vs bound tenant, session is expired and user must sign in again.

### Network hardening
- Added `secureFetch(...)`:
  - Request timeout via AbortController (default 15s).
  - Exponential backoff retry only for idempotent GET and only for timeout/network failures.
- Applied to auth and API paths.
- Refresh remains single-flight and one-retry max.

### Maintenance mode
- Added global maintenance signal and full-screen overlay.
- Triggered on status/code patterns (`503`, `MAINTENANCE_MODE`, `SERVICE_UNAVAILABLE`).

### App lock (optional)
- Added App Lock preference:
  - SecureStore-backed setting.
  - Toggle exposed in Profile Settings.
  - On foreground resume, if enabled, biometric/PIN unlock is required.
- If unlock fails, user is redirected to login.

### Screen capture protection (best effort, Expo managed)
- Added runtime guards for sensitive screens with graceful fallback if `expo-screen-capture` is not installed.
- Sensitive capture detection warns user via toast.
- Applied to:
  - Loan detail screen.
  - KYC route group.
- Build-time hardening path:
  - Install `expo-screen-capture` and add its config plugin in `app.json` for production EAS builds.

### Risk signals (best effort)
- Added runtime risk signals:
  - dev build
  - Expo Go/runtime indicators
  - likely emulator
  - likely debugger attached
- Shows security notice toast on high-risk runtime.

## 3) Intentional Limits and Deferred Items

- Full jailbreak/root detection:
  - Not fully available in Expo Managed without additional native modules.
  - Deferred path: add native root/jailbreak SDK via EAS Build + custom dev client.
- Absolute screenshot prevention guarantees:
  - Runtime APIs and platform behavior vary by environment (Expo Go vs production build), and `expo-screen-capture` may not be present in all local dev environments.
  - Best effort implemented now; enforce in production EAS builds and validate on-device.
- Backend-enforced device binding:
  - Client now sends device/app/platform headers and tenant binding checks locally.
  - Strong mitigation requires backend policy enforcement and token/device attestation.

## 4) Local Security Check

- Run before push:
  - `pnpm -C apps/mobile security:check`
- This runs:
  - typecheck
  - lint
  - token logging static scan script
