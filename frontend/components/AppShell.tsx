"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import LoginPage from '@/components/LoginPage';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { SidebarProvider } from '@/lib/SidebarContext';
import { ShieldCheck } from 'lucide-react';
import OptiBaseFooter from '@/components/OptiBaseFooter';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Interceptor global pentru atașarea automată a token-ului de autorizare pe toate apelurile fetch
    if (typeof window !== 'undefined' && !(window as any).__fleetFetchIntercepted) {
      (window as any).__fleetFetchIntercepted = true;
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const token = localStorage.getItem('fleetcmd_token');
        if (token) {
          init = init || {};
          const headers = new Headers(init.headers || {});
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          init.headers = headers;
        }
        return originalFetch(input, init);
      };
    }
  }, []);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#070b14] text-white space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sapphire-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-sapphire-500/40 ring-1 ring-white/20 animate-pulse">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-cyan-400/20 blur-sm -z-10 animate-ping" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-black tracking-tight text-white flex items-center justify-center space-x-1">
            <span>Fleet</span>
            <span className="text-cyan-400">CMD</span>
          </p>
          <p className="text-xs font-mono text-slate-400">Se inițializează mediul securizat...</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> show WOW Start / Login Page
  if (!user) {
    return <LoginPage />;
  }

  // Authenticated -> render full operational cockpit with Sidebar & Navbar
  return (
    <SidebarProvider>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
        <OptiBaseFooter variant="light" />
      </div>
    </SidebarProvider>
  );
}
