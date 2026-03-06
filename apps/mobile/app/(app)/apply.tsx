import { useKyc } from '../../src/providers/kyc-provider';
import { LegacyRouteRedirect } from '../../src/routing/LegacyRouteRedirect';

export default function LegacyApplyScreen() {
  const { isComplete } = useKyc();

  return <LegacyRouteRedirect href={isComplete ? '/loans/apply/offers' : '/profile/kyc'} message="Opening loan application" />;
}