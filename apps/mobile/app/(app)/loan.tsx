import { LegacyRouteRedirect } from '../../src/routing/LegacyRouteRedirect';

export default function LegacyLoanScreen() {
  return <LegacyRouteRedirect href="/loans" message="Opening loans" />;
}