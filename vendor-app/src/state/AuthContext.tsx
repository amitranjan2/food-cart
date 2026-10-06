import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { verifyVendorOtp } from '../api/auth';
import { isAuthFailure } from '../api/client';
import { getVendorMe } from '../api/vendor';
import { clearToken, getStoredToken, storeToken } from '../services/storage';
import type { Vendor } from '../types';

type AuthState = {
  token: string | null;
  vendor: Vendor | null;
  restoring: boolean;
  login: (mobile: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  setVendor: (vendor: Vendor) => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [restoring, setRestoring] = useState(true);

  const logout = useCallback(async () => {
    await clearToken();
    setToken(null);
    setVendor(null);
  }, []);

  const restore = useCallback(async (session: string) => {
    try {
      const profile = await getVendorMe(session);
      setToken(session);
      setVendor(profile);
    } catch (error) {
      if (isAuthFailure(error)) await clearToken();
      setToken(null);
      setVendor(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await getStoredToken();
      if (!saved) {
        if (!cancelled) setRestoring(false);
        return;
      }
      try {
        await restore(saved);
      } catch {
        // Invalid/expired session falls back to login.
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restore]);

  const login = useCallback(
    async (mobile: string, otp: string) => {
      const auth = await verifyVendorOtp({ mobile, otp });
      await storeToken(auth.token);
      await restore(auth.token);
    },
    [restore],
  );

  const value = useMemo(
    () => ({ token, vendor, restoring, login, logout, setVendor }),
    [token, vendor, restoring, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
