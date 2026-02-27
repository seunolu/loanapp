import * as React from 'react';
import { requestOtp, verifyOtp as verifyOtpApi } from '../lib/api';
import { clearTokens, setTokens } from './token-storage';
import { hydrateStoredSession, validateSession } from './auth-service';
import { subscribeSessionExpired } from './session-events';

type LoginInput = { phone: string; password: string };
type SignupInput = { phone: string; password: string; fullName: string };
type OtpInput = { phone: string; code: string };
export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  isLoading: boolean;
  isAuthed: boolean;
  token: string | null;
  login: (credentials: LoginInput) => Promise<void>;
  signup: (payload: SignupInput) => Promise<void>;
  verifyOtp: (payload: OtpInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }
  const compact = trimmed.replace(/[\s()-]/g, '');
  if (compact.startsWith('00')) {
    return `+${compact.slice(2)}`;
  }
  return compact;
}

function toApiPhoneOrThrow(input: string): string {
  const normalized = normalizePhone(input);
  if (!PHONE_REGEX.test(normalized)) {
    throw new Error('Enter phone in international format, e.g. +2348012345678.');
  }
  return normalized;
}

function isDevBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_BORROWER_DEV_BYPASS === 'true';
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = React.useState<AuthStatus>('unknown');
  const [token, setToken] = React.useState<string | null>(null);
  const [pendingOtpRef, setPendingOtpRef] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    (async () => {
      const stored = await hydrateStoredSession();
      if (!active) {
        return;
      }
      if (!stored?.accessToken) {
        setStatus('unauthenticated');
        setToken(null);
        return;
      }

      setToken(stored.accessToken);
      const valid = await validateSession();
      if (!active) {
        return;
      }

      if (valid || isDevBypassEnabled()) {
        setStatus('authenticated');
      } else {
        await clearTokens();
        setToken(null);
        setStatus('unauthenticated');
      }
    })();

    const unsubscribe = subscribeSessionExpired(() => {
      setToken(null);
      setStatus('unauthenticated');
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = React.useCallback(async (credentials: LoginInput) => {
    if (isDevBypassEnabled()) {
      const devToken = { accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' };
      await setTokens(devToken);
      setToken(devToken.accessToken);
      setStatus('authenticated');
      return;
    }
    const otp = await requestOtp(toApiPhoneOrThrow(credentials.phone));
    setPendingOtpRef(otp.otpRef);
  }, []);

  const signup = React.useCallback(async (payload: SignupInput) => {
    if (isDevBypassEnabled()) {
      const devToken = { accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' };
      await setTokens(devToken);
      setToken(devToken.accessToken);
      setStatus('authenticated');
      return;
    }
    const otp = await requestOtp(toApiPhoneOrThrow(payload.phone));
    setPendingOtpRef(otp.otpRef);
  }, []);

  const verifyOtp = React.useCallback(
    async (payload: OtpInput) => {
      if (isDevBypassEnabled()) {
        const devToken = { accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' };
        await setTokens(devToken);
        setToken(devToken.accessToken);
        setStatus('authenticated');
        return;
      }

      const otpRef = pendingOtpRef;
      if (!otpRef) {
        throw new Error('OTP session is missing. Request OTP again.');
      }

      const tokens = await verifyOtpApi({
        phone: toApiPhoneOrThrow(payload.phone),
        otpRef,
        otp: payload.code
      });
      await setTokens(tokens);
      setToken(tokens.accessToken);
      setPendingOtpRef(null);
      setStatus('authenticated');
    },
    [pendingOtpRef]
  );

  const logout = React.useCallback(async () => {
    await clearTokens();
    setPendingOtpRef(null);
    setToken(null);
    setStatus('unauthenticated');
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      isLoading: status === 'unknown',
      isAuthed: status === 'authenticated',
      token,
      login,
      signup,
      verifyOtp,
      logout
    }),
    [status, token, login, signup, verifyOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

