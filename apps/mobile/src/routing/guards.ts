export const ROUTES = {
  authLogin: '/(auth)/login',
  authLanding: '/(app)/home',
  kycGate: '/(app)/profile/kyc',
  tenant: '/tenant'
} as const;

export const ROUTE_GROUPS = {
  auth: '(auth)',
  app: '(app)'
} as const;

export const REQUIRE_TENANT_SELECTION = process.env.EXPO_PUBLIC_REQUIRE_TENANT_SELECTION === 'true';
