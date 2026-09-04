"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from './api';

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
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
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

  useEffect(() => {
    // Load persisted user or default to Admin
    try {
      const storedUser = localStorage.getItem('fleetcmd_user');
      const storedToken = localStorage.getItem('fleetcmd_token');

      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken || 'local-token');
      } else {
        // No active session -> require login on WOW start page
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }

    // Rezolvare ID admin doar dacă există deja o sesiune activă cu token valid
    const currentToken = localStorage.getItem('fleetcmd_token');
    if (currentToken) {
      fetch(`${API_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
        .then((res) => {
          if (res.status === 401) {
            logout();
            return null;
          }
          return res.json();
        })
        .then((users) => {
          if (Array.isArray(users)) {
            const dbAdmin = users.find((u) => u.username === 'admin' || u.rol === 'ADMIN');
            if (dbAdmin) {
              setUser((prev) => {
                if (prev && (prev.id === 'default-admin-id' || prev.username === 'admin')) {
                  const updated = { ...prev, id: dbAdmin.id, nume: dbAdmin.nume || prev.nume };
                  localStorage.setItem('fleetcmd_user', JSON.stringify(updated));
                  return updated;
                }
                return prev;
              });
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  const login = async (identifier: string, parola: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, parola }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('fleetcmd_user', JSON.stringify(data.user));
        localStorage.setItem('fleetcmd_token', data.token);
        setIsLoginModalOpen(false);
        return { success: true };
      } else {
        const err = await res.json();
        return { success: false, message: err.message || 'Autentificare eșuată' };
      }
    } catch (e: any) {
      return { success: false, message: 'Eroare de conexiune la serverul de autentificare.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('fleetcmd_user');
    localStorage.removeItem('fleetcmd_token');
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
    const headers = new Headers(options.headers || {});
    if (user) {
      headers.set('x-user-id', user.id);
      headers.set('x-user-email', user.email || '');
      headers.set('x-user-name', encodeURIComponent(user.nume));
      headers.set('x-user-role', user.rol);
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 401 && user) {
      // Sesiune invalidată pe server sau expirată
      logout();
    }

    return res;
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
        isLoginModalOpen,
        setIsLoginModalOpen,
        authFetch,
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
