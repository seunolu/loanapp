# Routes Audit

Generated: 2026-03-06

## Scope and Baseline

- Target: `apps/mobile` Expo Router app.
- Goal: inventory routes, identify duplicate or legacy entry points, and consolidate safely without deleting uncertain routes.
- Baseline verification in this pass:
  - `pnpm -C apps/mobile typecheck`: passed.
  - `pnpm -C apps/mobile lint`: codebase is lint-clean; an in-sandbox run hit `EPERM` on locked `node_modules` paths, so lint must be rerun with elevated access for a clean final verification.
- Inventory source: all `apps/mobile/app/**/*.ts` and `apps/mobile/app/**/*.tsx` files, sorted.

## Entry Points and Layouts

| Scope | File | Purpose |
| --- | --- | --- |
| `/` bootstrap | `app/index.tsx` | Chooses the first public route based on auth and onboarding state. |
| Root shell | `app/_layout.tsx` | Mounts providers, enforces auth and tenant guards, and hosts global banners/toasts. |
| Canonical auth layout | `app/(auth)/_layout.tsx` | Stack shell for onboarding, login, OTP, signup, and password reset. |
| Legacy auth layout | `app/auth/_layout.tsx` | Retained only so legacy `/auth/*` wrappers still resolve safely. |
| Authenticated tab shell | `app/(app)/_layout.tsx` | Hosts the main product tabs and hides non-tab screens from the tab bar. |

## Route Table

### Public, bootstrap, and utility routes

| Route path | File path | Purpose | Authenticated? | Tenant required? |
| --- | --- | --- | --- | --- |
| `/` | `app/index.tsx` | Bootstrap redirect for cold start. | No | No |
| `/tenant` | `app/tenant.tsx` | Resolve or reset tenant context before protected flows. | No | No |
| `/health` | `app/health.tsx` | Manual API health diagnostic screen. | No | No |
| `/loan-apply` | `app/loan-apply.tsx` | Legacy public tenant-scoped loan application form using `tenant-sdk`. | No | Yes |

### Canonical auth routes

| Route path | File path | Purpose | Authenticated? | Tenant required? |
| --- | --- | --- | --- | --- |
| `/onboarding` | `app/(auth)/onboarding.tsx` | First-run onboarding carousel. | No | No |
| `/login` | `app/(auth)/login.tsx` | Canonical sign-in entry point. | No | No |
| `/signup` | `app/(auth)/signup.tsx` | Account creation flow. | No | No |
| `/otp` | `app/(auth)/otp.tsx` | Canonical OTP verification step after login. | No | No |
| `/forgot-password` | `app/(auth)/forgot-password.tsx` | Password recovery start screen. | No | No |
| `/reset-password` | `app/(auth)/reset-password.tsx` | Password reset completion screen. | No | No |

### Authenticated product routes

| Route path | File path | Purpose | Authenticated? | Tenant required? |
| --- | --- | --- | --- | --- |
| `/home` | `app/(app)/home.tsx` | Dashboard, greeting, quick actions, and recent loan summary. | Yes | Conditional |
| `/loans` | `app/(app)/loans/index.tsx` | Loan history list and apply CTA. | Yes | Conditional |
| `/loans/[id]` | `app/(app)/loans/[id].tsx` | Loan detail screen. | Yes | Conditional |
| `/loans/apply/offers` | `app/(app)/loans/apply/offers.tsx` | Canonical start of the authenticated loan application flow. | Yes | Conditional |
| `/loans/apply/configure` | `app/(app)/loans/apply/configure.tsx` | Configure amount and tenor for a selected product. | Yes | Conditional |
| `/loans/apply/review` | `app/(app)/loans/apply/review.tsx` | Review and submit a loan application. | Yes | Conditional |
| `/loans/apply/submitted` | `app/(app)/loans/apply/submitted.tsx` | Submission success and next-step screen. | Yes | Conditional |
| `/repay` | `app/(app)/repay/index.tsx` | Repayment overview and due amount summary. | Yes | Conditional |
| `/repay/methods` | `app/(app)/repay/methods.tsx` | Repayment method selection. | Yes | Conditional |
| `/repay/pay-now` | `app/(app)/repay/pay-now.tsx` | Amount entry and repayment confirmation. | Yes | Conditional |
| `/repay/processing` | `app/(app)/repay/processing.tsx` | Repayment in-progress state. | Yes | Conditional |
| `/repay/success` | `app/(app)/repay/success.tsx` | Repayment success state. | Yes | Conditional |
| `/repay/failed` | `app/(app)/repay/failed.tsx` | Repayment failure state. | Yes | Conditional |
| `/transactions` | `app/(app)/transactions/index.tsx` | Transaction history list, filters, and search. | Yes | Conditional |
| `/transactions/[id]` | `app/(app)/transactions/[id].tsx` | Transaction detail card and reference copy action. | Yes | Conditional |
| `/notifications` | `app/(app)/notifications/index.tsx` | Notification inbox and unread management. | Yes | Conditional |
| `/notifications/[id]` | `app/(app)/notifications/[id].tsx` | Notification detail view. | Yes | Conditional |
| `/support` | `app/(app)/support/index.tsx` | Support home, FAQs, and ticket preview. | Yes | Conditional |
| `/support/faq` | `app/(app)/support/faq.tsx` | FAQ accordion. | Yes | Conditional |
| `/support/new` | `app/(app)/support/new.tsx` | Create a support ticket. | Yes | Conditional |
| `/support/[id]` | `app/(app)/support/[id].tsx` | Ticket thread and reply composer. | Yes | Conditional |
| `/profile` | `app/(app)/profile/index.tsx` | Profile overview entry point. | Yes | Conditional |
| `/profile/settings` | `app/(app)/profile/settings.tsx` | Settings hub for security, notifications, and legal. | Yes | Conditional |
| `/profile/security` | `app/(app)/profile/security.tsx` | Security preferences such as biometrics and PIN placeholders. | Yes | Conditional |
| `/profile/notifications` | `app/(app)/profile/notifications.tsx` | Notification preference toggles. | Yes | Conditional |
| `/profile/legal` | `app/(app)/profile/legal.tsx` | Privacy policy and terms placeholders. | Yes | Conditional |
| `/profile/kyc` | `app/(app)/profile/kyc/index.tsx` | KYC landing and overall checklist. | Yes | Conditional |
| `/profile/kyc/personal` | `app/(app)/profile/kyc/personal.tsx` | Personal details step. | Yes | Conditional |
| `/profile/kyc/identity` | `app/(app)/profile/kyc/identity.tsx` | Identity verification step. | Yes | Conditional |
| `/profile/kyc/employment` | `app/(app)/profile/kyc/employment.tsx` | Employment details step. | Yes | Conditional |
| `/profile/kyc/bank` | `app/(app)/profile/kyc/bank.tsx` | Bank account step. | Yes | Conditional |
| `/profile/kyc/nok` | `app/(app)/profile/kyc/nok.tsx` | Next-of-kin step. | Yes | Conditional |
| `/hardship` | `app/(app)/hardship/index.tsx` | Hardship support request list. | Yes | Conditional |
| `/hardship/new` | `app/(app)/hardship/new.tsx` | Create hardship request. | Yes | Conditional |
| `/hardship/[id]` | `app/(app)/hardship/[id].tsx` | Hardship request detail. | Yes | Conditional |
| `/maintenance` | `app/(app)/maintenance.tsx` | Stubbed maintenance state route for future guards. | Yes | Conditional |
| `/session-expired` | `app/(app)/session-expired.tsx` | Stubbed session-expired state route for future guards. | Yes | Conditional |
| `/offline` | `app/(app)/offline.tsx` | Stubbed offline state route for future guards. | Yes | Conditional |

### Legacy and dev routes

| Route path | File path | Purpose | Authenticated? | Tenant required? |
| --- | --- | --- | --- | --- |
| `/auth/login` | `app/auth/login.tsx` | Deprecated legacy auth entry; now redirects to `/login`. | No | No |
| `/auth/verify` | `app/auth/verify.tsx` | Deprecated legacy OTP entry; now redirects to `/otp`. | No | No |
| `/apply` | `app/(app)/apply.tsx` | Deprecated placeholder apply screen; now redirects to canonical apply flow or KYC. | Yes | Conditional |
| `/loan` | `app/(app)/loan.tsx` | Deprecated placeholder loan screen; now redirects to `/loans`. | Yes | Conditional |
| `/ui-preview` | `app/(dev)/ui-preview/index.tsx` | Canonical dev-only UI preview screen; redirects to `/home` outside development. | No | No |
| `/ui-preview/screen-foundation` | `app/ui-preview/screen-foundation.tsx` | Deprecated preview entry; now redirects to `/ui-preview`. | No | No |

## Primary User Journey Map

- Cold start -> `/` -> auth known? if yes `/home`; if no and onboarding unseen `/onboarding`; if no and onboarding seen `/login`.
- Tenant selection -> `/tenant` when tenant is required and unresolved; tenant flow may still hand off to preserved legacy `/loan-apply` for tenant-specific public application testing.
- Onboarding -> `/onboarding` -> `/login` -> `/otp` -> `/home`.
- Home -> `/home` -> `/loans` -> `/loans/[id]` -> `/loans/apply/offers` -> `/loans/apply/configure` -> `/loans/apply/review` -> `/loans/apply/submitted`.
- Home -> `/repay` -> `/repay/methods` -> `/repay/pay-now` -> `/repay/processing` -> `/repay/success` or `/repay/failed`.
- Home -> `/transactions` -> `/transactions/[id]`.
- Home -> `/notifications` -> `/notifications/[id]`.
- Home -> `/support` -> `/support/faq`, `/support/new`, `/support/[id]`.
- Home -> `/profile` -> `/profile/kyc` and KYC steps, or `/profile/settings` -> `/profile/security`, `/profile/notifications`, `/profile/legal`.

## Suspected Duplicates and Reachability Findings

### `/auth/login` vs `/login`

- Internal references to `/auth/login`: none found in `app/` or `src/`.
- Canonical route: `/login`.
- Action taken: keep `/auth/login` as a redirect wrapper for deep-link and bookmark safety.

### `/auth/verify` vs `/otp`

- Internal references to `/auth/verify`: only `app/auth/login.tsx` referenced it, and that screen is now a wrapper.
- Canonical route: `/otp`.
- Action taken: keep `/auth/verify` as a redirect wrapper and preserve search params.

### `/loan-apply` vs authenticated apply flow

- Internal references to `/loan-apply`: only `app/tenant.tsx` routes here after tenant resolution.
- Behavior difference: `/loan-apply` is a public, tenant-scoped `tenant-sdk` flow; `/loans/apply/*` is the authenticated product flow.
- Decision: do not redirect or deprecate yet. This route is preserved until product confirms it is obsolete.

### `/apply` vs `/loans/apply/offers`

- Exact internal references to `/apply`: none found.
- `/apply` was only a placeholder route under the authenticated shell.
- Canonical route: `/loans/apply/offers` when KYC is complete, else `/profile/kyc`.
- Action taken: replace the placeholder with a redirect wrapper.

### `/loan` vs `/loans`

- Exact internal references to `/loan`: none found.
- `/loan` was only a placeholder route under the authenticated shell.
- Canonical route: `/loans`.
- Action taken: replace the placeholder with a redirect wrapper.

### `app/ui-preview/*` vs `app/(dev)/ui-preview/*`

- Internal references to `ui-preview`: none found in `app/` or `src/`.
- Canonical route: `/ui-preview` from `app/(dev)/ui-preview/index.tsx`.
- Action taken: keep the canonical preview dev-gated; deprecate `/ui-preview/screen-foundation` with a redirect to `/ui-preview`.
- Deferred cleanup: the root `app/ui-preview/` directory remains only because the deprecated route still needs a file target until it can be deleted in a later cleanup pass.

### `/health` and `/tenant`

- `/tenant` is actively referenced by `app/_layout.tsx`, `src/routing/guards.ts`, `app/(app)/profile/settings.tsx`, and tenant-reset flows.
- `/health` is referenced by `app/tenant.tsx` and by its own diagnostic screen.
- Decision: both are active utility routes and should not be deprecated in this pass.

## Canonical Routes

The following are the canonical user-facing routes after this consolidation pass:

- `/`
- `/tenant`
- `/health`
- `/loan-apply` (preserved legacy public tenant flow; not yet deprecated)
- `/onboarding`
- `/login`
- `/signup`
- `/otp`
- `/forgot-password`
- `/reset-password`
- `/home`
- `/loans`
- `/loans/[id]`
- `/loans/apply/offers`
- `/loans/apply/configure`
- `/loans/apply/review`
- `/loans/apply/submitted`
- `/repay`
- `/repay/methods`
- `/repay/pay-now`
- `/repay/processing`
- `/repay/success`
- `/repay/failed`
- `/transactions`
- `/transactions/[id]`
- `/notifications`
- `/notifications/[id]`
- `/support`
- `/support/faq`
- `/support/new`
- `/support/[id]`
- `/profile`
- `/profile/settings`
- `/profile/security`
- `/profile/notifications`
- `/profile/legal`
- `/profile/kyc`
- `/profile/kyc/personal`
- `/profile/kyc/identity`
- `/profile/kyc/employment`
- `/profile/kyc/bank`
- `/profile/kyc/nok`
- `/hardship`
- `/hardship/new`
- `/hardship/[id]`
- `/maintenance`
- `/session-expired`
- `/offline`
- `/ui-preview` (development only)

## Deprecated Routes and Redirect Plan

| Deprecated route | Redirect target | Strategy |
| --- | --- | --- |
| `/auth/login` | `/login` | Wrapper redirect kept for backward compatibility. |
| `/auth/verify` | `/otp` | Wrapper redirect kept; search params preserved. |
| `/apply` | `/loans/apply/offers` or `/profile/kyc` | Wrapper redirect kept; uses current KYC state to avoid bypassing gating. |
| `/loan` | `/loans` | Wrapper redirect kept for stale bookmarks or old links. |
| `/ui-preview/screen-foundation` | `/ui-preview` | Wrapper redirect kept for legacy dev preview entry. |

Recommended deletion rule for a later cleanup PR:

- Option A (recommended): keep wrappers for at least one release while monitoring logs, QA notes, and deep-link docs.
- Option B: remove the wrapper file only after references stay empty, no deep-link contract depends on the old path, and the route is not part of onboarding or tenant setup.

## Safe No-Change Decisions

- `/loan-apply` was not redirected because it is behaviorally different from the authenticated `/loans/apply/*` flow and is still invoked by `/tenant`.
- `/tenant` was not moved under `(auth)` or `(app)` because the root shell explicitly guards and redirects to it.
- `/health` was left intact because it is a useful diagnostics route and is explicitly linked from `/tenant`.
- `app/auth/_layout.tsx` was kept because the legacy `/auth/*` wrappers still need a resolving layout until those routes can be deleted.