'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api } from './api';
import type { Role, User } from './types';

export interface Toast {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface AppState {
  /** null = logged out; undefined = still checking the session. */
  user: User | null | undefined;
  toasts: Toast[];
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; role: Exclude<Role, 'RIDER'> }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

let toastId = 0;

/** Where each role lands after login. */
export function homeFor(role: Role): string {
  return role === 'RIDER' ? '/rider' : '/dashboard';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `toast-${++toastId}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.get<{ user: User | null }>('/auth/session');
      setUser(data.user);
    } catch {
      setUser((prev) => prev ?? null);
    }
  }, []);

  // Initial session check: who is logged in (from the HTTP-only cookie)?
  useEffect(() => {
    let active = true;
    api
      .get<{ user: User | null }>('/auth/session')
      .then((data) => active && setUser(data.user))
      .catch(() => active && setUser(null));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User }>('/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; role: Exclude<Role, 'RIDER'> }) => {
      const data = await api.post<{ user: User }>('/auth/register', input);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, toasts, login, register, logout, refreshUser, addToast, removeToast }),
    [user, toasts, login, register, logout, refreshUser, addToast, removeToast],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/** The logged-in user. Only call inside AppLayout, which renders children once the user is known. */
export function useCurrentUser(): User {
  const { user } = useApp();
  if (!user) throw new Error('useCurrentUser used outside an authenticated page');
  return user;
}
