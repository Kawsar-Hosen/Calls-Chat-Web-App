import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { api, clearTokens, getTokens } from './api';
import { registerDeviceToken } from './notifications';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { displayName: string; username: string; email: string; password: string }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; username?: string; bio?: string; avatarUrl?: string | null; email?: string; phoneCode?: string | null; phone?: string | null }) => Promise<void>;
  uploadAvatar: (uri: string, onProgress?: (pct: number) => void) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        if (await getTokens()) {
          setUser(await api.me());
          void registerDeviceToken();
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login: async (email, password) => {
        const result = await api.login(email, password);
        setUser(result.user);
        void registerDeviceToken();
      },
      register: async (data) => {
        const result = await api.register(data);
        setUser(result.user);
        void registerDeviceToken();
      },
      loginWithGoogle: async (idToken) => {
        const result = await api.googleSignIn(idToken);
        setUser(result.user);
        void registerDeviceToken();
      },
      logout: async () => {
        await api.logout().catch(clearTokens);
        setUser(null);
      },
      updateProfile: async (data) => setUser(await api.updateProfile(data)),
      uploadAvatar: async (uri, onProgress) => setUser(await api.uploadAvatar(uri, onProgress)),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
