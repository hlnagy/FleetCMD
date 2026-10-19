"use client";

import React, { useState, useRef } from 'react';
import {
  LayoutDashboard, FileText, ShoppingCart, History, Wrench, Clock, Truck,
  Gauge, Timer, FileCheck, Link2, PackageCheck, CircleDot, Building2,
  ShieldCheck, Droplets, ShieldAlert, BarChart3, Settings, X, Plus,
  MoreVertical, ChevronRight, Sparkles
} from 'lucide-react';
import { useTabWorkspace, WorkspaceTab, ROUTE_TAB_DEFINITIONS } from '../lib/TabWorkspaceContext';

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  History,
  Wrench,
  Clock,
  Truck,
  Gauge,
  Timer,
  FileCheck,
  Link2,
  PackageCheck,
  CircleDot,
  Building2,
  ShieldCheck,
  Droplets,
  ShieldAlert,
  BarChart3,
  Settings,
};

export default function TabBar() {
  const { tabs, activeTabId, openTab, closeTab, closeOtherTabs, closeAllTabs } = useTabWorkspace();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isTabOptionsOpen, setIsTabOptionsOpen] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);

  const getIcon = (iconName: string) => {
    const Component = ICON_MAP[iconName] || LayoutDashboard;
    return <Component className="w-3.5 h-3.5 shrink-0" />;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (tabListRef.current) {
      tabListRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="bg-slate-200/90 dark:bg-slate-900 border-b border-morning-300 dark:border-slate-800 px-3 sm:px-5 flex items-center justify-between gap-2 select-none z-20 shrink-0">
      {/* SCROLLABLE TABS LIST */}
      <div
        ref={tabListRef}
        onWheel={handleWheel}
        className="flex items-center space-x-1.5 overflow-x-auto py-1.5 no-scrollbar scroll-smooth flex-1 min-w-0"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDashboard = tab.id === '/' || tab.href === '/' || tab.title === 'Dashboard';
          return (
            <div
              key={tab.id}
              onClick={() => openTab(tab)}
              onAuxClick={(e) => {
                // Middle click closes tab (except Dashboard)
                if (e.button === 1 && !isDashboard) {
                  e.preventDefault();
                  closeTab(tab.id);
                }
              }}
              className={`group flex items-center space-x-2 px-3 py-1.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer shrink-0 border border-b-0 ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-sapphire-900 dark:text-white border-morning-300 dark:border-slate-700 shadow-xs font-black relative top-[1px]'
                  : 'bg-morning-100/70 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 border-transparent hover:bg-white/80 dark:hover:bg-slate-800/80 hover:text-slate-900'
              }`}
              title={isDashboard ? 'Dashboard (Panou Principal Permanent)' : `${tab.title} (Clic mijloc pentru închidere)`}
            >
              <span className={isActive ? 'text-sapphire-600 dark:text-cyan-400' : 'text-sage-500'}>
                {getIcon(tab.iconName)}
              </span>
              <span className="truncate max-w-[140px] sm:max-w-[180px] text-[11px] sm:text-xs">
                {tab.title}
              </span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 bg-terracotta-500 text-white rounded-full text-[9px] font-black">
                  {tab.badge}
                </span>
              )}
              {/* Dashboard tab cannot be closed: no X button */}
              {!isDashboard && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="w-4 h-4 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition opacity-70 group-hover:opacity-100 ml-1 cursor-pointer"
                  title="Închide fila"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* PLUS BUTTON (+ DESCHIDE TAB NOU) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
            className="w-7 h-7 rounded-lg bg-white/70 dark:bg-slate-800 hover:bg-white text-slate-600 dark:text-slate-300 hover:text-sapphire-900 dark:hover:text-white border border-morning-300 dark:border-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Deschide modul nou în filă"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* POPUP LISTĂ MODULE PENTRU DESCHIDERE RAPIDĂ */}
          {isQuickMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsQuickMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 max-h-96 overflow-y-auto space-y-1 animate-scale-up text-xs font-bold divide-y divide-morning-100 dark:divide-slate-800">
                <div className="px-3 py-2 text-[10px] font-black uppercase text-sage-500 tracking-wider">
                  Deschide Modul în Filă Nouă
                </div>

                <div className="pt-1 space-y-1">
                  {[
                    { title: 'Comenzi de Lucru (Munkalapok)', href: '/comenzi-lucru', icon: Wrench },
                    { title: 'ANAF e-Factura (Import)', href: '/efactura?tab=efactura', icon: FileText },
                    { title: 'Recepție Manuală Factură', href: '/efactura?tab=manual', icon: ShoppingCart },
                    { title: 'Gestiune Stoc Piese', href: '/stocuri?tab=stoc', icon: PackageCheck },
                    { title: 'Magazie Anvelope (Serii)', href: '/stocuri?tab=anvelope_stoc', icon: CircleDot },
                    { title: 'Fișă Tehnică & Flotă', href: '/fisa-tehnica', icon: Truck },
                    { title: 'Actualizare KM (Pompă)', href: '/import-km', icon: Gauge },
                    { title: 'Ore Funcționare (mTH)', href: '/ore-functionare', icon: Timer },
                    { title: 'Profiluri Mentenanță', href: '/mentenanta', icon: Clock },
                    { title: 'Uleiuri & Fluide Flotă', href: '/fluide', icon: Droplets },
                    { title: 'Alerte & Notificări', href: '/alerte', icon: ShieldAlert },
                    { title: 'Rapoarte & Analitică', href: '/rapoarte', icon: BarChart3 },
                    { title: 'Setări Sistem', href: '/setari', icon: Settings },
                  ].map((m) => {
                    const ModIcon = m.icon;
                    return (
                      <button
                        key={m.href}
                        type="button"
                        onClick={() => {
                          openTab({ href: m.href, title: m.title });
                          setIsQuickMenuOpen(false);
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-slate-700 dark:text-slate-200 hover:bg-morning-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <ModIcon className="w-4 h-4 text-sapphire-600 dark:text-cyan-400 shrink-0" />
                        <span className="truncate">{m.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DREAPTA: OPȚIUNI FILE (ÎNCHIDE CELELALTE) */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setIsTabOptionsOpen(!isTabOptionsOpen)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-sapphire-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Opțiuni File"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {isTabOptionsOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsTabOptionsOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 text-xs font-bold space-y-1 animate-scale-up">
              <button
                type="button"
                onClick={() => {
                  closeOtherTabs(activeTabId);
                  setIsTabOptionsOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-morning-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              >
                Închide celelalte file
              </button>
              <button
                type="button"
                onClick={() => {
                  closeAllTabs();
                  setIsTabOptionsOpen(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition"
              >
                Închide toate filele
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
