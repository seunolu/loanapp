import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

type KycStep = 'personal' | 'identity' | 'employment' | 'bank' | 'nok';
type IdentityStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';

const STORAGE_KEY = 'loanapp.mobile.kyc.checklist.v1';

type KycContextValue = {
  checklist: { key: KycStep; label: string; completed: boolean }[];
  percentComplete: number;
  markComplete: (step: KycStep) => Promise<void>;
  markPending: (step: KycStep) => Promise<void>;
  resetKyc: () => Promise<void>;
  isComplete: boolean;
  identityStatus: IdentityStatus;
  setIdentityStatus: (status: IdentityStatus) => Promise<void>;
  consentAccepted: boolean;
  setConsentAccepted: (accepted: boolean) => Promise<void>;
};

const stepLabels: Record<KycStep, string> = {
  personal: 'Personal Information',
  identity: 'Identity Verification',
  employment: 'Employment Details',
  bank: 'Bank Account',
  nok: 'Next of Kin'
};

const orderedSteps: KycStep[] = ['personal', 'identity', 'employment', 'bank', 'nok'];

const KycContext = React.createContext<KycContextValue | undefined>(undefined);

export function KycProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [state, setState] = React.useState<Record<KycStep, boolean>>({
    personal: false,
    identity: false,
    employment: false,
    bank: false,
    nok: false
  });
  const [identityStatus, setIdentityStatusState] = React.useState<IdentityStatus>('UNVERIFIED');
  const [consentAccepted, setConsentAcceptedState] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as {
          steps?: Record<KycStep, boolean>;
          identityStatus?: IdentityStatus;
          consentAccepted?: boolean;
        };
        if (parsed.steps) setState((prev) => ({ ...prev, ...parsed.steps }));
        if (parsed.identityStatus) setIdentityStatusState(parsed.identityStatus);
        if (typeof parsed.consentAccepted === 'boolean') setConsentAcceptedState(parsed.consentAccepted);
      } catch {
        return;
      }
    })();
  }, []);

  const persist = React.useCallback(
    async (nextSteps: Record<KycStep, boolean>, nextIdentityStatus: IdentityStatus, nextConsent: boolean) => {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          steps: nextSteps,
          identityStatus: nextIdentityStatus,
          consentAccepted: nextConsent
        })
      );
    },
    []
  );

  const markComplete = React.useCallback(
    async (step: KycStep) => {
      const next = { ...state, [step]: true };
      setState(next);
      await persist(next, identityStatus, consentAccepted);
    },
    [state, identityStatus, consentAccepted, persist]
  );

  const markPending = React.useCallback(
    async (step: KycStep) => {
      const next = { ...state, [step]: false };
      setState(next);
      await persist(next, identityStatus, consentAccepted);
    },
    [state, identityStatus, consentAccepted, persist]
  );

  const setIdentityStatus = React.useCallback(
    async (status: IdentityStatus) => {
      setIdentityStatusState(status);
      await persist(state, status, consentAccepted);
    },
    [state, consentAccepted, persist]
  );

  const setConsentAccepted = React.useCallback(
    async (accepted: boolean) => {
      setConsentAcceptedState(accepted);
      await persist(state, identityStatus, accepted);
    },
    [state, identityStatus, persist]
  );

  const resetKyc = React.useCallback(async () => {
    const next = { personal: false, identity: false, employment: false, bank: false, nok: false };
    setState(next);
    setIdentityStatusState('UNVERIFIED');
    setConsentAcceptedState(false);
    await persist(next, 'UNVERIFIED', false);
  }, [persist]);

  const checklist = orderedSteps.map((key) => ({
    key,
    label: stepLabels[key],
    completed: state[key]
  }));
  const completed = checklist.filter((item) => item.completed).length;
  const percentComplete = Math.round((completed / checklist.length) * 100);

  const value = React.useMemo<KycContextValue>(
    () => ({
      checklist,
      percentComplete,
      markComplete,
      markPending,
      resetKyc,
      isComplete: checklist.every((item) => item.completed),
      identityStatus,
      setIdentityStatus,
      consentAccepted,
      setConsentAccepted
    }),
    [
      checklist,
      percentComplete,
      markComplete,
      markPending,
      resetKyc,
      identityStatus,
      setIdentityStatus,
      consentAccepted,
      setConsentAccepted
    ]
  );

  return <KycContext.Provider value={value}>{children}</KycContext.Provider>;
}

export function useKyc(): KycContextValue {
  const ctx = React.useContext(KycContext);
  if (!ctx) throw new Error('useKyc must be used within KycProvider');
  return ctx;
}
