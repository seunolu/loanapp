import * as React from 'react';
import { useKyc } from '../providers/kyc-provider';
import { getKycStatus } from './kyc-status';

export type KycRequiredLevel = 'NONE' | 'BASIC' | 'FULL';

type KycRequirementResult = {
  allowed: boolean;
  level: KycRequiredLevel;
  missing: string[];
  nextMissingStep: 'personal' | 'identity' | 'employment' | 'bank' | 'nok' | null;
};

const rank: Record<KycRequiredLevel, number> = {
  NONE: 0,
  BASIC: 1,
  FULL: 2
};

export function useKycRequirement(requiredLevel: KycRequiredLevel): KycRequirementResult {
  const { checklist, identityStatus, consentAccepted } = useKyc();

  return React.useMemo(() => {
    const status = getKycStatus({ checklist, identityStatus, consentAccepted });
    return {
      allowed: rank[status.level] >= rank[requiredLevel],
      level: status.level,
      missing: status.missing,
      nextMissingStep: status.nextMissingStep
    };
  }, [checklist, consentAccepted, identityStatus, requiredLevel]);
}
