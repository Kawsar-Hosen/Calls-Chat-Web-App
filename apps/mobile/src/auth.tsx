import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { api, clearTokens, getTokens } from './api';
import { registerDeviceToken } from './notifications';
import type { User } from './types';
import * as SecureStore from 'expo-secure-store';

const ACCOUNTS_KEY = 'freecoid.accounts';

export interface SavedAccount {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
  tokens: { accessToken: string; refreshToken: string };
}

async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function setSavedAccounts(accounts: SavedAccount[]) {
  await SecureStore.setItemAsync(ACCOUNTS_KEY, JSON.stringify(accounts));
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  accounts: SavedAccount[];
  addingAccount: boolean;
  setAddingAccount: (v: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { displayName: string; username: string; email: string; password: string; dateOfBirth?: string; gender?: string }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  loginWithTelegram: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  removeSavedAccount: (accountId: string) => Promise<void>;
  updateProfile: (data: { displayName?: string; username?: string; bio?: string; avatarUrl?: string | null; coverUrl?: string | null; customStatus?: string | null; accentColor?: string | null; location?: string | null; website?: string | null; email?: string; phoneCode?: string | null; phone?: string | null; lastSeenVisible?: boolean; onlineVisible?: boolean; whoCanMessage?: string; whoCanSeePosts?: string; readReceipts?: boolean; typingIndicator?: boolean; fontSize?: string; fontStyle?: string; chatWallpaper?: string | null }) => Promise<void>;
  uploadAvatar: (uri: string, onProgress?: (pct: number) => void) => Promise<void>;
  uploadCover: (uri: string, onProgress?: (pct: number) => void) => Promise<void>;
  deleteAvatar: () => Promise<void>;
  deleteCover: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [addingAccount, setAddingAccount] = useState(false);

  const saveCurrentAccount = useCallback(async (u: User) => {
    const tokens = await getTokens();
    if (!tokens) return;
    const saved = await getSavedAccounts();
    const entry: SavedAccount = {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      email: u.email ?? '',
      tokens,
    };
    const exists = saved.findIndex((a) => a.id === u.id);
    const next = exists >= 0 ? saved.map((a, i) => i === exists ? entry : a) : [...saved, entry];
    setAccounts(next);
    await setSavedAccounts(next);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await getSavedAccounts();
        setAccounts(saved);
        if (await getTokens()) {
          const u = await api.me();
          setUser(u);
          void registerDeviceToken();
          void saveCurrentAccount(u);
        }
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    setUser(result.user);
    setAddingAccount(false);
    void registerDeviceToken();
    void saveCurrentAccount(result.user);
  };

  const register = async (data: { displayName: string; username: string; email: string; password: string; dateOfBirth?: string; gender?: string }) => {
    const result = await api.register(data);
    setUser(result.user);
    setAddingAccount(false);
    void registerDeviceToken();
    void saveCurrentAccount(result.user);
  };

  const loginWithGoogle = async (idToken: string) => {
    const result = await api.googleSignIn(idToken);
    setUser(result.user);
    setAddingAccount(false);
    void registerDeviceToken();
    void saveCurrentAccount(result.user);
  };

  const loginWithFacebook = async (accessToken: string) => {
    const result = await api.facebookSignIn(accessToken);
    setUser(result.user);
    setAddingAccount(false);
    void registerDeviceToken();
    void saveCurrentAccount(result.user);
  };

  const loginWithTelegram = async (phone: string, code: string) => {
    const result = await api.telegramVerify(phone, code);
    setUser(result.user);
    setAddingAccount(false);
    void registerDeviceToken();
    void saveCurrentAccount(result.user);
  };

  const logout = async () => {
    if (user) {
      const saved = await getSavedAccounts();
      const next = saved.filter((a) => a.id !== user.id);
      setAccounts(next);
      await setSavedAccounts(next);
    }
    await api.logout().catch(clearTokens);
    setUser(null);
  };

  const switchAccount = async (accountId: string) => {
    const saved = await getSavedAccounts();
    const target = saved.find((a) => a.id === accountId);
    if (!target) return;
    await clearTokens();
    await SecureStore.setItemAsync('xyteee.session', JSON.stringify(target.tokens));
    try {
      const u = await api.me();
      setUser(u);
      void registerDeviceToken();
    } catch {
      setUser(null);
    }
  };

  const removeSavedAccount = async (accountId: string) => {
    const saved = await getSavedAccounts();
    const next = saved.filter((a) => a.id !== accountId);
    setAccounts(next);
    await setSavedAccounts(next);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      accounts,
      addingAccount,
      setAddingAccount,
      login,
      register,
      loginWithGoogle,
      loginWithFacebook,
      loginWithTelegram,
      logout,
      switchAccount,
      removeSavedAccount,
      updateProfile: async (data) => setUser(await api.updateProfile(data)),
      uploadAvatar: async (uri, onProgress) => setUser(await api.uploadAvatar(uri, onProgress)),
      uploadCover: async (uri, onProgress) => setUser(await api.uploadCover(uri, onProgress)),
      deleteAvatar: async () => setUser(await api.deleteAvatar()),
      deleteCover: async () => setUser(await api.deleteCover()),
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
