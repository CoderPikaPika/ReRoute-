import { createContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  clearStoredAccessToken,
  getStoredAccessToken,
  storeAccessToken,
} from '../../lib/auth-storage';
import { authApi } from '../../services/authApi';
import type { LoginInput, PublicUser, RegisterInput } from '../../types/auth';

interface AuthContextValue {
  user: PublicUser | null;
  isRestoringSession: boolean;
  login(input: LoginInput): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      setIsRestoringSession(false);
      return;
    }

    void authApi
      .me()
      .then((currentUser) => setUser(currentUser))
      .catch(() => clearStoredAccessToken())
      .finally(() => setIsRestoringSession(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isRestoringSession,
      async login(input) {
        const result = await authApi.login(input);
        storeAccessToken(result.accessToken);
        setUser(result.user);
      },
      async register(input) {
        const result = await authApi.register(input);
        storeAccessToken(result.accessToken);
        setUser(result.user);
      },
      async logout() {
        try {
          await authApi.logout();
        } finally {
          clearStoredAccessToken();
          setUser(null);
        }
      },
    }),
    [isRestoringSession, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
