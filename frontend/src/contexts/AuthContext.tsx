import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, inviteCode: string) => Promise<void>;
  loginWithDemo: () => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loginWithPassword: async () => {},
  register: async () => {},
  loginWithDemo: async () => {},
  logout: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('chat_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;

    const verify = async () => {
      try {
        const u = await api.me();
        if (!cancelled) setUser(u);
      } catch {
        try {
          const res = await api.refreshToken();
          if (!cancelled) {
            localStorage.setItem('chat_token', res.token);
            setToken(res.token);
            const u = await api.me();
            setUser(u);
          }
        } catch {
          if (!cancelled) {
            localStorage.removeItem('chat_token');
            setToken(null);
            setUser(null);
          }
        }
      }
      if (!cancelled) setLoading(false);
    };

    verify();
    const interval = setInterval(async () => {
      try { const res = await api.refreshToken(); localStorage.setItem('chat_token', res.token); setToken(res.token); } catch {};
    }, 7 * 24 * 60 * 60 * 1000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [token]);

  const loginWithPassword = useCallback(async (username: string, password: string) => {
    const res = await api.loginWithPassword(username, password);
    localStorage.setItem('chat_token', res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(async (username: string, password: string, inviteCode: string) => {
    const res = await api.register(username, password, inviteCode);
    localStorage.setItem('chat_token', res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('chat_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loginWithPassword, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
