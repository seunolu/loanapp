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

1. Open app and go to `Welcome`.
2. Create account or login (single-tenant borrower flow, no tenant picker).
3. Enter OTP on verify screen.
4. App stores tokens in `expo-secure-store` and routes to `/home`.
6. Kill and reopen app; protected screens should still work if refresh/session valid.
7. Force token expiry in backend (short TTL), call `/home` again:
   - client should refresh with `/api/v1/auth/refresh` and retry once automatically.

## API base URL

- Set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env` for physical device testing.
- If unset, Android emulator defaults to `http://10.0.2.2:3000`.
- For physical device, set LAN URL explicitly, e.g. `http://192.168.1.10:3000`.

## Windows monorepo Metro note

Metro is intentionally restricted to `apps/mobile` plus `packages` in `apps/mobile/metro.config.js`. This avoids Windows pnpm symlink/permission issues where Metro can crash on `node_modules/.ignored_*` entries with `EACCES`.

If the dev client asks for a server URL, use the LAN URL emitted by `expo start` (for example `exp+...://...?url=http://192.168.x.x:8081`), not `10.0.2.2`, unless you are explicitly using `adb reverse`.

How to run:
- `cd apps/mobile`
- `pnpm start --clear`
- Open the Android dev client
