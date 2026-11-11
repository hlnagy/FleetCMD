"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import LoginPage from '@/components/LoginPage';
import TopNavigation from '@/components/TopNavigation';
import TabBar from '@/components/TabBar';
import { TabWorkspaceProvider } from '@/lib/TabWorkspaceContext';
import { ShieldCheck } from 'lucide-react';
import OptiBaseFooter from '@/components/OptiBaseFooter';
import FleetAIAssistant from '@/components/ai/FleetAIAssistant';
import { API_BASE_URL } from '@/lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Interceptor global pentru atașarea automată a token-ului de autorizare și detecția sesiunilor expirate (401)
    if (typeof window !== 'undefined' && !(window as any).__fleetFetchIntercepted) {
      (window as any).__fleetFetchIntercepted = true;
      const originalFetch = window.fetch;
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const urlStr =
          typeof input === 'string'
            ? input
            : input instanceof URL
            ? input.toString()
            : input?.url || '';
        const isBackendRequest =
          urlStr.startsWith(API_BASE_URL) ||
          urlStr.includes('/api/backend') ||
          urlStr.includes('localhost:3001') ||
          urlStr.includes('127.0.0.1:3001') ||
          urlStr.includes('fleetcmd.onrender.com');

        const token = localStorage.getItem('fleetcmd_token');
        if (token && token !== 'local-token' && isBackendRequest) {
          init = init || {};
          const headers = new Headers(
            init.headers || (input instanceof Request ? input.headers : undefined) || {}
          );
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          init.headers = headers;
        }

        const response = await originalFetch(input, init);
        if (
          response.status === 401 &&
          isBackendRequest &&
          !urlStr.includes('/auth/login') &&
          localStorage.getItem('fleetcmd_token')
        ) {
          window.dispatchEvent(new Event('fleetcmd:unauthorized'));
        }
        return response;
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

  // Authenticated -> render full operational cockpit with TopNavigation, TabBar & widescreen workspace
  return (
    <TabWorkspaceProvider>
      <div className="min-h-screen w-full flex flex-col bg-morning-100 text-sapphire-900 transition-colors duration-200 print:bg-white print:min-h-0 print:block">
        <div className="print:hidden">
          <TopNavigation />
          <TabBar />
        </div>
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto w-full print:p-0 print:m-0 print:overflow-visible print:block">
          {children}
        </main>
        <div className="print:hidden">
          <OptiBaseFooter variant="light" />
        </div>
      </div>
      <div className="print:hidden">
        <FleetAIAssistant />
      </div>
    </TabWorkspaceProvider>
  );
}
