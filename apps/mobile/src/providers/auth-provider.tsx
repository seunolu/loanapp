import * as React from 'react';
import { requestOtp, verifyOtp as verifyOtpApi } from '../lib/api';
import { clearSessionTokens, getSessionTokens, setSessionTokens } from '../lib/storage';

type LoginInput = { phone: string; password: string };
type SignupInput = { phone: string; password: string; fullName: string };
type OtpInput = { phone: string; code: string };

type AuthContextValue = {
  isLoading: boolean;
  isAuthed: boolean;
  token: string | null;
  login: (credentials: LoginInput) => Promise<void>;
  signup: (payload: SignupInput) => Promise<void>;
  verifyOtp: (payload: OtpInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function isDevBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_BORROWER_DEV_BYPASS === 'true';
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [isLoading, setIsLoading] = React.useState(true);
  const [token, setToken] = React.useState<string | null>(null);
  const [pendingOtpRef, setPendingOtpRef] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const session = await getSessionTokens();
      if (session?.accessToken) {
        setToken(session.accessToken);
      } else if (isDevBypassEnabled()) {
        await setSessionTokens({ accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' });
        setToken('dev-access-token');
      }
      setIsLoading(false);
    })();
  }, []);

  const login = React.useCallback(async (credentials: LoginInput) => {
    if (isDevBypassEnabled()) {
      await setSessionTokens({ accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' });
      setToken('dev-access-token');
      return;
    }
    const otp = await requestOtp(credentials.phone);
    setPendingOtpRef(otp.otpRef);
  }, []);

  const signup = React.useCallback(async (payload: SignupInput) => {
    if (isDevBypassEnabled()) {
      await setSessionTokens({ accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' });
      setToken('dev-access-token');
      return;
    }
    const otp = await requestOtp(payload.phone);
    setPendingOtpRef(otp.otpRef);
  }, []);

  const verifyOtp = React.useCallback(
    async (payload: OtpInput) => {
      if (isDevBypassEnabled()) {
        await setSessionTokens({ accessToken: 'dev-access-token', refreshToken: 'dev-refresh-token' });
        setToken('dev-access-token');
        return;
      }
      const otpRef = pendingOtpRef;
      if (!otpRef) {
        throw new Error('OTP session is missing. Request OTP again.');
      }
      const tokens = await verifyOtpApi({
        phone: payload.phone,
        otpRef,
        otp: payload.code
      });
      await setSessionTokens(tokens);
      setToken(tokens.accessToken);
      setPendingOtpRef(null);
    },
    [pendingOtpRef]
  );

  const logout = React.useCallback(async () => {
    await clearSessionTokens();
    setToken(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthed: Boolean(token),
      token,
      login,
      signup,
      verifyOtp,
      logout
    }),
    [isLoading, token, login, signup, verifyOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
