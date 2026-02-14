# LoanApp Mobile (Expo)

Android-first borrower app built with Expo + expo-router.

## Prerequisites

- Node.js 18+ (20 recommended)
- Android Studio + emulator (or physical Android device with Expo Go)
- Backend API running and reachable from emulator/device

## Setup

1. Install workspace dependencies:
   - `pnpm install`
2. Copy env file:
   - `cp apps/mobile/.env.example apps/mobile/.env`
3. Start app:
   - `pnpm -C apps/mobile start`

## Android run

- Emulator:
  - Ensure API is on host machine and `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000`
  - Run `pnpm -C apps/mobile start`, then press `a`
- Physical device:
  - Use your machine LAN IP, e.g. `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000`
  - Start Expo and scan QR in Expo Go

## Typecheck and lint

- `pnpm -C apps/mobile typecheck`
- `pnpm -C apps/mobile lint`

## Auth flow test (end-to-end)

1. Open app and go to `Tenant` screen.
2. Enter lender slug (for example `acme`) and continue.
3. On login screen, enter phone and request OTP.
4. Enter OTP on verify screen.
5. App stores tokens in `expo-secure-store` and routes to `/home`.
6. Kill and reopen app; protected screens should still work if refresh/session valid.
7. Force token expiry in backend (short TTL), call `/home` again:
   - client should refresh with `/api/v1/auth/refresh` and retry once automatically.

## Windows monorepo Metro note

On Windows in this monorepo, Metro may crash if it traverses `apps/borrower/node_modules` (for example on hidden `.ignored_*` entries with `EACCES`). We block that path in `apps/mobile/metro.config.js` to keep the Expo dev server stable.

How to run:
- `cd apps/mobile`
- `pnpm start --clear`
- Open the Android dev client
