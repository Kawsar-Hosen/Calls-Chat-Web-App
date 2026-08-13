import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, storeTokens } from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { displayName: string; username: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(setUser).catch(() => storeTokens(null)).finally(() => setLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login: async (email, password) => setUser((await api.login(email, password)).user),
    register: async (data) => setUser((await api.register(data)).user),
    logout: () => {
      void api.logout().catch(() => undefined);
      storeTokens(null);
      setUser(null);
    },
    updateUser: async (data) => setUser(await api.updateProfile(data)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
