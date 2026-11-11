"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from './api';
import { showToast } from './swal';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  nume: string;
  username: string;
  email?: string;
  rol: UserRole;
  functie?: string;
  telefon?: string;
  activ?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isViewer: boolean;
  canEdit: (module?: string) => boolean;
  login: (identifier: string, parola: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  sessionExpiredMsg: string | null;
  clearSessionExpiredMsg: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  updateCurrentUser: (data: Partial<User>) => void;
}

function parseJwtPayload(jwtToken: string): { exp?: number; iat?: number; sub?: string } | null {
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenLocallyExpired(jwtToken: string | null): boolean {
  if (!jwtToken || jwtToken === 'local-token') return true;
  const payload = parseJwtPayload(jwtToken);
  if (!payload) return true;

  if (typeof window !== 'undefined') {
    const storedExpiresAt = localStorage.getItem('fleetcmd_expires_at');
    if (storedExpiresAt) {
      const expMs = Number(storedExpiresAt);
      if (!Number.isNaN(expMs) && expMs > 0) {
        return Date.now() >= expMs;
      }
    }
  }

  if (typeof payload.exp === 'number') {
    return payload.exp * 1000 <= Date.now();
  }
  return false;
}

function clearStoredSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('fleetcmd_user');
  localStorage.removeItem('fleetcmd_token');
  localStorage.removeItem('fleetcmd_expires_at');
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ADMIN: User = {
  id: 'default-admin-id',
  nume: 'Administrator Principal',
  email: 'admin@fleetcmd.ro',
  username: 'admin',
  rol: 'ADMIN',
  functie: 'Administrator Sistem',
  telefon: '0744111222',
  activ: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState<string | null>(null);

  const sessionActiveRef = useRef(false);
  const expiryNotifiedRef = useRef(false);
  const lastServerCheckRef = useRef(0);

  const expireSession = useCallback(() => {
    const hadSession =
      sessionActiveRef.current ||
      (typeof window !== 'undefined' &&
        (Boolean(localStorage.getItem('fleetcmd_token')) || Boolean(localStorage.getItem('fleetcmd_user'))));

    clearStoredSession();
    sessionActiveRef.current = false;
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
    setIsLoginModalOpen(true);

    if (hadSession && !expiryNotifiedRef.current) {
      expiryNotifiedRef.current = true;
      const msg = 'Sesiunea anterioară a expirat. Vă rugăm să vă autentificați din nou.';
      setSessionExpiredMsg(msg);
      showToast('Sesiunea a expirat! Vă rugăm să vă autentificați din nou.', 'warning', 4500);
    }
  }, []);

  const clearSessionExpiredMsg = useCallback(() => {
    setSessionExpiredMsg(null);
  }, []);

  useEffect(() => {
    // Load persisted session and verify JWT validity
    let validStoredToken: string | null = null;
    try {
      const storedUser = localStorage.getItem('fleetcmd_user');
      const storedToken = localStorage.getItem('fleetcmd_token');

      if (storedUser && storedToken && storedToken !== 'local-token' && !isTokenLocallyExpired(storedToken)) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        sessionActiveRef.current = true;
        expiryNotifiedRef.current = false;
        validStoredToken = storedToken;
      } else {
        if (storedUser || storedToken) {
          expireSession();
        } else {
          setUser(null);
          setToken(null);
        }
      }
    } catch (e) {
      clearStoredSession();
      sessionActiveRef.current = false;
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }

    // Sincronizare profil utilizator curent cu datele din baza de date & verificare token pe server
    if (validStoredToken) {
      lastServerCheckRef.current = Date.now();
      fetch(`${API_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${validStoredToken}` },
      })
        .then((res) => {
          if (res.status === 401) {
            expireSession();
            return null;
          }
          return res.json();
        })
        .then((users) => {
          if (Array.isArray(users)) {
            setUser((prev) => {
              if (!prev) return null;
              const freshUser = users.find((u) => u.id === prev.id || u.username === prev.username);
              if (freshUser) {
                if (freshUser.activ === false) {
                  expireSession();
                  return null;
                }
                const updated = {
                  ...prev,
                  id: freshUser.id,
                  nume: freshUser.nume || prev.nume,
                  username: freshUser.username || prev.username,
                  rol: freshUser.rol || prev.rol,
                  functie: freshUser.functie || prev.functie,
                  email: freshUser.email || prev.email,
                  telefon: freshUser.telefon || prev.telefon,
                  activ: freshUser.activ !== undefined ? freshUser.activ : prev.activ,
                };
                localStorage.setItem('fleetcmd_user', JSON.stringify(updated));
                return updated;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }
  }, [expireSession]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUnauthorizedEvent = () => {
      expireSession();
    };

    const handleFocusOrVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!sessionActiveRef.current) return;

      const currentToken = localStorage.getItem('fleetcmd_token');
      if (!currentToken || isTokenLocallyExpired(currentToken)) {
        expireSession();
        return;
      }

      // Dacă au trecut peste 5 minute de la ultima verificare pe server, validăm discret sesiunea
      const now = Date.now();
      if (now - lastServerCheckRef.current > 5 * 60 * 1000) {
        lastServerCheckRef.current = now;
        fetch(`${API_BASE_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        })
          .then((res) => {
            if (res.status === 401) {
              expireSession();
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener('fleetcmd:unauthorized', handleUnauthorizedEvent);
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      window.removeEventListener('fleetcmd:unauthorized', handleUnauthorizedEvent);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, [expireSession]);

  const login = async (identifier: string, parola: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, parola }),
      });

      if (res.ok) {
        const data = await res.json();
        expiryNotifiedRef.current = false;
        sessionActiveRef.current = true;
        lastServerCheckRef.current = Date.now();
        setSessionExpiredMsg(null);
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('fleetcmd_user', JSON.stringify(data.user));
        localStorage.setItem('fleetcmd_token', data.token);

        const payload = parseJwtPayload(data.token);
        if (payload?.exp && payload?.iat && payload.exp > payload.iat) {
          const ttlMs = (payload.exp - payload.iat) * 1000;
          localStorage.setItem('fleetcmd_expires_at', String(Date.now() + ttlMs));
        } else {
          localStorage.removeItem('fleetcmd_expires_at');
        }

        setIsLoginModalOpen(false);
        return { success: true };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err.message || 'Autentificare eșuată' };
      }
    } catch (e: any) {
      return { success: false, message: 'Eroare de conexiune la serverul de autentificare.' };
    }
  };

  const logout = () => {
    expiryNotifiedRef.current = false;
    sessionActiveRef.current = false;
    clearStoredSession();
    setSessionExpiredMsg(null);
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/');
    }
    setIsLoginModalOpen(true);
  };

  const isAdmin = user?.rol === 'ADMIN';
  const isOperator = user?.rol === 'OPERATOR';
  const isViewer = user?.rol === 'VIEWER';

  const canEdit = (module?: string) => {
    if (!user) return false;
    if (user.rol === 'ADMIN') return true;
    if (user.rol === 'VIEWER') return false;
    // OPERATOR can edit standard fleet modules, but NOT SETARI / UTILIZATORI system config
    if (module === 'SETARI' || module === 'UTILIZATORI' || module === 'AUDIT') return false;
    return true;
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const activeToken =
      token || (typeof window !== 'undefined' ? localStorage.getItem('fleetcmd_token') : null);
    const headers = new Headers(options.headers || {});
    if (user) {
      headers.set('x-user-id', user.id);
      headers.set('x-user-email', user.email || '');
      headers.set('x-user-name', encodeURIComponent(user.nume));
      headers.set('x-user-role', user.rol);
    }
    if (activeToken && activeToken !== 'local-token') {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && !url.includes('/auth/login') && (user || activeToken)) {
      // Sesiune invalidată pe server sau expirată
      expireSession();
    }

    return res;
  };

  const updateCurrentUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('fleetcmd_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        isOperator,
        isViewer,
        canEdit,
        login,
        logout,
        sessionExpiredMsg,
        clearSessionExpiredMsg,
        isLoginModalOpen,
        setIsLoginModalOpen,
        authFetch,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
