import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { playNotificationSound } from '@/sounds';

interface NotificationContextValue {
  unreadCount: number;
  refreshCount: () => Promise<void>;
  resetCount: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({ unreadCount: 0, refreshCount: async () => {}, resetCount: () => {} });

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountRef = useRef(0);

  const refreshCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await api.getNotificationCount();
      if (count > prevCountRef.current && prevCountRef.current > 0) {
        playNotificationSound('default');
      }
      prevCountRef.current = count;
      setUnreadCount(count);
    } catch {}
  }, [user]);

  const resetCount = useCallback(() => {
    setUnreadCount(0);
    prevCountRef.current = 0;
  }, []);

  useEffect(() => {
    if (!user) { setUnreadCount(0); prevCountRef.current = 0; return; }
    void refreshCount();
    intervalRef.current = setInterval(() => void refreshCount(), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user, refreshCount]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount, resetCount }}>
      {children}
    </NotificationContext.Provider>
  );
}
