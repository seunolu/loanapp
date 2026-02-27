import * as React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useKyc } from '../providers/kyc-provider';
import { ROUTES } from '../routing/guards';
import { getKycStatus } from './kyc-status';

type KycRequiredLevel = 'NONE' | 'BASIC' | 'FULL';

type UseKycGateOptions = {
  redirectTo?: string;
};

const rank: Record<KycRequiredLevel, number> = {
  NONE: 0,
  BASIC: 1,
  FULL: 2
};

export function useKycGate(requiredLevel: KycRequiredLevel, options: UseKycGateOptions = {}): { allowed: boolean } {
  const router = useRouter();
  const { checklist, identityStatus, consentAccepted } = useKyc();
  const messageShownRef = React.useRef(false);
  const redirectingRef = React.useRef(false);

  const status = React.useMemo(
    () => getKycStatus({ checklist, identityStatus, consentAccepted }),
    [checklist, consentAccepted, identityStatus]
  );

  const allowed = rank[status.level] >= rank[requiredLevel];

  React.useEffect(() => {
    if (allowed || redirectingRef.current) {
      return;
    }
    redirectingRef.current = true;
    if (!messageShownRef.current) {
      messageShownRef.current = true;
      Alert.alert('KYC Required', 'Complete your KYC to continue');
    }
    const target = options.redirectTo ?? ROUTES.kycGate;
    router.replace(target as never);
  }, [allowed, options.redirectTo, router]);

  return { allowed };
}

