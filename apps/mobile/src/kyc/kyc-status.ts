type KycLevel = 'NONE' | 'BASIC' | 'FULL';
type KycStep = 'personal' | 'identity' | 'employment' | 'bank' | 'nok';
type IdentityStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';

export type KycChecklistItem = {
  key: KycStep;
  completed: boolean;
};

export type KycStateInput = {
  checklist: KycChecklistItem[];
  identityStatus: IdentityStatus;
  consentAccepted: boolean;
};

export type KycStatusResult = {
  level: KycLevel;
  missing: string[];
  nextMissingStep: KycStep | null;
};

const orderedSteps: KycStep[] = ['personal', 'identity', 'employment', 'bank', 'nok'];

export function getKycStatus(input: KycStateInput): KycStatusResult {
  const completedSteps = new Set(input.checklist.filter((item) => item.completed).map((item) => item.key));

  const missing = orderedSteps.filter((step) => !completedSteps.has(step));
  const basicSatisfied = completedSteps.has('personal') && input.consentAccepted;
  const fullSatisfied = missing.length === 0 && input.identityStatus === 'VERIFIED';

  if (fullSatisfied) {
    return { level: 'FULL', missing: [], nextMissingStep: null };
  }
  if (basicSatisfied) {
    return { level: 'BASIC', missing, nextMissingStep: missing[0] ?? null };
  }
  return {
    level: 'NONE',
    missing: ['personal', ...(input.consentAccepted ? [] : ['consent'])],
    nextMissingStep: completedSteps.has('personal') ? 'identity' : 'personal'
  };
}

