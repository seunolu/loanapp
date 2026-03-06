import { LegacyRouteRedirect } from '../../src/routing/LegacyRouteRedirect';

export default function LegacyAuthLoginScreen() {
  return <LegacyRouteRedirect href="/login" message="Opening sign in" />;
}