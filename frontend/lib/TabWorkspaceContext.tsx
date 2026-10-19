"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface WorkspaceTab {
  id: string; // unique ID / key, e.g. '/comenzi-lucru' or '/efactura?tab=efactura'
  title: string;
  href: string;
  iconName: string;
  badge?: string | number;
}

// Registry of known route definitions
export const ROUTE_TAB_DEFINITIONS: Record<string, { title: string; iconName: string }> = {
  '/': { title: 'Dashboard', iconName: 'LayoutDashboard' },
  '/comenzi-lucru': { title: 'Comenzi de Lucru', iconName: 'Wrench' },
  '/efactura': { title: 'ANAF e-Factura', iconName: 'FileText' },
  '/efactura?tab=efactura': { title: 'ANAF e-Factura', iconName: 'FileText' },
  '/efactura?tab=manual': { title: 'Recepție Factură', iconName: 'ShoppingCart' },
  '/efactura?tab=istoric': { title: 'Istoric Facturi', iconName: 'History' },
  '/fisa-tehnica': { title: 'Fișă Tehnică & Flotă', iconName: 'Truck' },
  '/import-km': { title: 'Actualizare KM (Pompă)', iconName: 'Gauge' },
  '/ore-functionare': { title: 'Ore Funcționare (mTH)', iconName: 'Timer' },
  '/documente': { title: 'Valabilitate Acte', iconName: 'FileCheck' },
  '/ansambluri': { title: 'Cuplare Ansambluri', iconName: 'Link2' },
  '/mentenanta': { title: 'Profiluri Mentenanță', iconName: 'Clock' },
  '/stocuri': { title: 'Piese & Consumabile', iconName: 'PackageCheck' },
  '/stocuri?tab=stoc': { title: 'Piese & Consumabile', iconName: 'PackageCheck' },
  '/stocuri?tab=anvelope_stoc': { title: 'Magazie Anvelope', iconName: 'CircleDot' },
  '/stocuri?tab=depozite': { title: 'Depozite Flotă', iconName: 'Building2' },
  '/stocuri?tab=componente': { title: 'Garanții Piese', iconName: 'ShieldCheck' },
  '/anvelope': { title: 'Anvelope & Harta Axe', iconName: 'CircleDot' },
  '/fluide': { title: 'Uleiuri & Fluide', iconName: 'Droplets' },
  '/alerte': { title: 'Alerte Active', iconName: 'ShieldAlert' },
  '/rapoarte': { title: 'Rapoarte & Analitică', iconName: 'BarChart3' },
  '/setari': { title: 'Setări Sistem', iconName: 'Settings' },
};

export function resolveTabInfo(pathname: string, searchParams?: any): WorkspaceTab {
  const currentTab = searchParams?.get('tab');
  let compositeKey = pathname;

  if (currentTab && (pathname === '/efactura' || pathname === '/stocuri')) {
    compositeKey = `${pathname}?tab=${currentTab}`;
  }

  const def = ROUTE_TAB_DEFINITIONS[compositeKey] || ROUTE_TAB_DEFINITIONS[pathname];

  if (def) {
    let fullHref = pathname;
    const queryString = searchParams?.toString();
    if (queryString) {
      fullHref = `${pathname}?${queryString}`;
    }
    return {
      id: compositeKey,
      title: def.title,
      href: fullHref,
      iconName: def.iconName,
    };
  }

  // Fallback for custom or dynamic routes (e.g. /fisa-tehnica?id=123)
  const cleanName = pathname.replace('/', '').replace(/-/g, ' ');
  const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  const fullHref = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

  return {
    id: compositeKey,
    title: capitalized || 'Modul',
    href: fullHref,
    iconName: 'LayoutDashboard',
  };
}

export const DASHBOARD_TAB: WorkspaceTab = {
  id: '/',
  title: 'Dashboard',
  href: '/',
  iconName: 'LayoutDashboard',
};

export const ensureDashboardFirst = (tabList: WorkspaceTab[]): WorkspaceTab[] => {
  if (!Array.isArray(tabList) || tabList.length === 0) {
    return [DASHBOARD_TAB];
  }
  const filtered = tabList.filter((t) => t.id !== '/' && t.href !== '/');
  return [DASHBOARD_TAB, ...filtered];
};

interface TabWorkspaceContextType {
  tabs: WorkspaceTab[];
  activeTabId: string;
  openTab: (tab: Partial<WorkspaceTab> & { href: string; title?: string; iconName?: string }) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
}

const TabWorkspaceContext = createContext<TabWorkspaceContextType>({
  tabs: [DASHBOARD_TAB],
  activeTabId: '/',
  openTab: () => {},
  closeTab: () => {},
  closeOtherTabs: () => {},
  closeAllTabs: () => {},
});

const STORAGE_KEY = 'fleetcmd_open_tabs_v1';

function TabWorkspaceInnerProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tabs, setTabs] = useState<WorkspaceTab[]>([DASHBOARD_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>('/');
  const [isLoaded, setIsLoaded] = useState(false);

  // Restore tabs from localStorage on mount (always guaranteeing Dashboard is first)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(ensureDashboardFirst(parsed));
        }
      }
    } catch (e) {
      console.warn('Could not load saved tabs', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
      } catch (e) {
        console.warn('Could not save tabs to localStorage', e);
      }
    }
  }, [tabs, isLoaded]);

  // Synchronize active route with tabs (keeping Dashboard at index 0)
  useEffect(() => {
    if (!pathname) return;
    const currentTabInfo = resolveTabInfo(pathname, searchParams);
    setActiveTabId(currentTabInfo.id);

    setTabs((prevTabs) => {
      const ensured = ensureDashboardFirst(prevTabs);
      const existingIndex = ensured.findIndex((t) => t.id === currentTabInfo.id);
      if (existingIndex >= 0) {
        // Update href if query params changed (e.g. ?id=...)
        const copy = [...ensured];
        copy[existingIndex] = {
          ...copy[existingIndex],
          href: currentTabInfo.href,
        };
        return copy;
      } else {
        // Append new tab
        return [...ensured, currentTabInfo];
      }
    });
  }, [pathname, searchParams]);

  // Open / Switch to a tab
  const openTab = useCallback((target: Partial<WorkspaceTab> & { href: string; title?: string; iconName?: string }) => {
    const [pathPart, queryPart] = target.href.split('?');
    const sp = queryPart ? new URLSearchParams(queryPart) : null;
    const info = resolveTabInfo(pathPart, sp);

    const newTab: WorkspaceTab = {
      id: target.id || info.id,
      title: target.title || info.title,
      href: target.href,
      iconName: target.iconName || info.iconName,
      badge: target.badge,
    };

    setTabs((prev) => {
      const ensured = ensureDashboardFirst(prev);
      const exists = ensured.some((t) => t.id === newTab.id);
      if (!exists) {
        return [...ensured, newTab];
      }
      return ensured.map((t) => (t.id === newTab.id ? { ...t, href: newTab.href } : t));
    });

    setActiveTabId(newTab.id);
    router.push(newTab.href);
  }, [router]);

  // Close a tab (Dashboard can NEVER be closed!)
  const closeTab = useCallback((tabId: string) => {
    if (tabId === '/' || tabId === 'Dashboard') return;

    setTabs((prevTabs) => {
      const closingIndex = prevTabs.findIndex((t) => t.id === tabId);
      if (closingIndex === -1) return prevTabs;

      const remaining = prevTabs.filter((t) => t.id !== tabId);
      const guaranteed = ensureDashboardFirst(remaining);

      // If the closed tab was active, switch to adjacent or fallback to Dashboard
      if (tabId === activeTabId) {
        const nextActiveIndex = closingIndex > 0 ? closingIndex - 1 : 0;
        const nextTab = guaranteed[nextActiveIndex] || guaranteed[0] || DASHBOARD_TAB;
        setActiveTabId(nextTab.id);
        router.push(nextTab.href);
      }

      return guaranteed;
    });
  }, [activeTabId, router]);

  // Close other tabs (keeping Dashboard + the target tab)
  const closeOtherTabs = useCallback((keepTabId: string) => {
    setTabs((prevTabs) => {
      if (keepTabId === '/' || keepTabId === 'Dashboard') {
        setActiveTabId('/');
        router.push('/');
        return [DASHBOARD_TAB];
      }
      const keepTab = prevTabs.find((t) => t.id === keepTabId);
      if (keepTab) {
        setActiveTabId(keepTab.id);
        router.push(keepTab.href);
        return [DASHBOARD_TAB, keepTab];
      }
      return [DASHBOARD_TAB];
    });
  }, [router]);

  // Close all tabs -> reset to Dashboard
  const closeAllTabs = useCallback(() => {
    setTabs([DASHBOARD_TAB]);
    setActiveTabId('/');
    router.push('/');
  }, [router]);

  return (
    <TabWorkspaceContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        closeOtherTabs,
        closeAllTabs,
      }}
    >
      {children}
    </TabWorkspaceContext.Provider>
  );
}

export function TabWorkspaceProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-2 text-xs font-mono">Se încarcă spațiul de lucru...</div>}>
      <TabWorkspaceInnerProvider>{children}</TabWorkspaceInnerProvider>
    </Suspense>
  );
}

export const useTabWorkspace = () => useContext(TabWorkspaceContext);
