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

type KycStore = {
  steps: Record<KycStep, boolean>;
  identityStatus: IdentityStatus;
  consentAccepted: boolean;
};

const defaultStore: KycStore = {
  steps: {
    personal: false,
    identity: false,
    employment: false,
    bank: false,
    nok: false
  },
  identityStatus: 'UNVERIFIED',
  consentAccepted: false
};

export function KycProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [store, setStore] = React.useState<KycStore>(defaultStore);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as {
          steps?: Record<KycStep, boolean>;
          identityStatus?: IdentityStatus;
          consentAccepted?: boolean;
        };
        setStore((prev) => ({
          steps: parsed.steps ? { ...prev.steps, ...parsed.steps } : prev.steps,
          identityStatus: parsed.identityStatus ?? prev.identityStatus,
          consentAccepted: typeof parsed.consentAccepted === 'boolean' ? parsed.consentAccepted : prev.consentAccepted
        }));
      } catch {
        setHydrated(true);
        return;
      }
      setHydrated(true);
    })();
  }, []);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    (async () => {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          steps: store.steps,
          identityStatus: store.identityStatus,
          consentAccepted: store.consentAccepted
        })
      );
    })();
  }, [store, hydrated]);

  const markComplete = React.useCallback(async (step: KycStep) => {
    setStore((prev) => ({
      ...prev,
      steps: { ...prev.steps, [step]: true }
    }));
  }, []);

  const markPending = React.useCallback(async (step: KycStep) => {
    setStore((prev) => ({
      ...prev,
      steps: { ...prev.steps, [step]: false }
    }));
  }, []);

  const setIdentityStatus = React.useCallback(async (status: IdentityStatus) => {
    setStore((prev) => ({
      ...prev,
      identityStatus: status
    }));
  }, []);

  const setConsentAccepted = React.useCallback(async (accepted: boolean) => {
    setStore((prev) => ({
      ...prev,
      consentAccepted: accepted
    }));
  }, []);

  const resetKyc = React.useCallback(async () => {
    setStore(defaultStore);
  }, []);

  const checklist = orderedSteps.map((key) => ({
    key,
    label: stepLabels[key],
    completed: store.steps[key]
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
      identityStatus: store.identityStatus,
      setIdentityStatus,
      consentAccepted: store.consentAccepted,
      setConsentAccepted
    }),
    [
      checklist,
      percentComplete,
      markComplete,
      markPending,
      resetKyc,
      store.identityStatus,
      setIdentityStatus,
      store.consentAccepted,
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
