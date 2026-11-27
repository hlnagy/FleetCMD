"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Fuel, LayoutDashboard, Layers, Truck, BarChart3, UploadCloud,
  FileText, Settings, RefreshCw, MapPin, AlertTriangle,
} from 'lucide-react';
import CombustibilDashboardTab from '@/components/combustibil/CombustibilDashboardTab';
import CombustibilStocTab from '@/components/combustibil/CombustibilStocTab';
import CombustibilParcAutoTab from '@/components/combustibil/CombustibilParcAutoTab';
import CombustibilAnalizaTab from '@/components/combustibil/CombustibilAnalizaTab';
import CombustibilImportTab from '@/components/combustibil/CombustibilImportTab';
import CombustibilRapoarteTab from '@/components/combustibil/CombustibilRapoarteTab';
import CombustibilAdminTab from '@/components/combustibil/CombustibilAdminTab';
import {
  CombustibilDashboardData,
  CombustibilGestiune,
  CombustibilStocData,
  combustibilFetch,
  fmtNum,
} from '@/components/combustibil/types';

type TabKey = 'panou' | 'stoc' | 'parc' | 'analiza' | 'import' | 'rapoarte' | 'admin';

const VALID_VIEWS: TabKey[] = ['panou', 'stoc', 'parc', 'analiza', 'import', 'rapoarte', 'admin'];
const GESTIUNE_STORAGE_KEY = 'fleetcmd_combustibil_gestiune_id';

function CombustibilPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get('view') as TabKey | null;
  const [activeTab, setActiveTab] = useState<TabKey>(
    viewParam && VALID_VIEWS.includes(viewParam) ? viewParam : 'panou',
  );

  // Sync URL ?view= changes (e.g. clicking TopNavigation dropdown items)
  useEffect(() => {
    const v = searchParams.get('view') as TabKey | null;
    if (v && VALID_VIEWS.includes(v)) {
      setActiveTab(v);
    } else if (!v) {
      setActiveTab('panou');
    }
  }, [searchParams]);

  const [gestiuni, setGestiuni] = useState<CombustibilGestiune[]>([]);
  const [gestiuneId, setGestiuneId] = useState<number | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shared loaded datasets for active gestiune
  const [dashboardData, setDashboardData] = useState<CombustibilDashboardData | null>(null);
  const [stocData, setStocData] = useState<CombustibilStocData | null>(null);
  const [parcData, setParcData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Cross-tab handoff state
  const [activeStockCompanyId, setActiveStockCompanyId] = useState<number | -1 | null>(null);
  const [reportInitialCompanyId, setReportInitialCompanyId] = useState<number | null>(null);
  const [adminInitialSubTab, setAdminInitialSubTab] = useState<'companii' | 'nealocate' | 'categorii' | 'gestiuni'>('companii');

  const switchTab = (next: TabKey) => {
    setActiveTab(next);
    const qs = next === 'panou' ? '/combustibil' : `/combustibil?view=${next}`;
    router.replace(qs, { scroll: false });
  };

  const loadGestiuni = useCallback(async (preferredId?: number): Promise<number | null> => {
    try {
      const list: CombustibilGestiune[] = await combustibilFetch('/gestiuni');
      setGestiuni(list);
      if (list.length === 0) {
        setGestiuneId(null);
        return null;
      }

      let chosen = preferredId;
      if (!chosen && typeof window !== 'undefined') {
        const stored = parseInt(localStorage.getItem(GESTIUNE_STORAGE_KEY) || '', 10);
        if (!isNaN(stored) && list.some((g) => g.id === stored)) {
          chosen = stored;
        }
      }
      if (!chosen || !list.some((g) => g.id === chosen)) {
        chosen = list[0].id;
      }
      setGestiuneId(chosen);
      if (typeof window !== 'undefined') {
        localStorage.setItem(GESTIUNE_STORAGE_KEY, String(chosen));
      }
      return chosen;
    } catch (err: any) {
      setErrorMsg(err?.message || 'Nu s-au putut încărca gestiunile de combustibil.');
      return null;
    } finally {
      setLoadingInit(false);
    }
  }, []);

  const loadGestiuneData = useCallback(async (gId: number) => {
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const [dash, stoc, parc] = await Promise.all([
        combustibilFetch<CombustibilDashboardData>(`/dashboard?gestiuneId=${gId}`),
        combustibilFetch<CombustibilStocData>(`/stoc?gestiuneId=${gId}`),
        combustibilFetch<any[]>(`/parc-auto?gestiuneId=${gId}`),
      ]);
      setDashboardData(dash);
      setStocData(stoc);
      setParcData(Array.isArray(parc) ? parc : []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Eroare la încărcarea datelor de combustibil.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadGestiuni();
  }, [loadGestiuni]);

  useEffect(() => {
    if (gestiuneId !== null) {
      setActiveStockCompanyId(null);
      loadGestiuneData(gestiuneId);
    }
  }, [gestiuneId, loadGestiuneData]);

  const handleSelectGestiune = (newId: number) => {
    setGestiuneId(newId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(GESTIUNE_STORAGE_KEY, String(newId));
    }
  };

  const handleRefreshAll = async (switchToId?: number) => {
    const resolvedId = await loadGestiuni(switchToId ?? gestiuneId ?? undefined);
    if (resolvedId !== null) {
      await loadGestiuneData(resolvedId);
    }
  };

  const activeGestiune = gestiuni.find((g) => g.id === gestiuneId) || dashboardData?.gestiune || null;

  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: any;
    badge?: number | string;
    badgeTone?: 'amber' | 'rose';
  }> = [
    { key: 'panou', label: 'Panou General', icon: LayoutDashboard },
    {
      key: 'stoc',
      label: 'Gestionare Stoc',
      icon: Layers,
      badge: (stocData?.duplicateCount || 0) > 0
        ? stocData!.duplicateCount
        : (dashboardData?.unallocated.count || 0) > 0
          ? dashboardData!.unallocated.count
          : undefined,
      badgeTone: (stocData?.duplicateCount || 0) > 0 ? 'rose' : 'amber',
    },
    { key: 'parc', label: 'Parc Auto', icon: Truck },
    { key: 'analiza', label: 'Analiză Consum', icon: BarChart3 },
    { key: 'import', label: 'Import CSV', icon: UploadCloud },
    { key: 'rapoarte', label: 'Rapoarte PDF', icon: FileText },
    { key: 'admin', label: 'Administrare', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-morning-50 dark:bg-slate-950 p-4 sm:p-6 space-y-5">
      {/* HEADER BAR */}
      <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sapphire-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-sapphire-600/20 shrink-0">
              <Fuel className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-sapphire-900 dark:text-white tracking-tight">
                  Combustibil
                </h1>
                {activeGestiune && (
                  <span className="px-2 py-0.5 rounded-lg bg-sapphire-50 dark:bg-slate-800 border border-sapphire-200 dark:border-slate-700 text-[11px] font-extrabold text-sapphire-700 dark:text-cyan-300">
                    {activeGestiune.tipCombustibil || 'Motorină'}
                  </span>
                )}
              </div>
              <p className="text-xs text-sage-600 dark:text-slate-400 font-medium truncate">
                Gestiune bazine carburant, stocuri pe firme, import pompă Seler, analiză MC &amp; bonuri PDF
              </p>
            </div>
          </div>

          {/* RIGHT CONTROLS: GESTIUNE SWITCHER + QUICK STOCK SUMMARY + REFRESH */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Gestiune Selector Pills / Dropdown */}
            {gestiuni.length > 0 && (
              <div className="flex items-center gap-1.5 bg-morning-100 dark:bg-slate-800 p-1 rounded-xl border border-morning-200 dark:border-slate-700">
                <span className="flex items-center gap-1 pl-2 pr-1 text-[10px] font-black uppercase tracking-wider text-sage-600 dark:text-slate-400">
                  <MapPin className="w-3 h-3 text-sapphire-600 dark:text-cyan-400" />
                  Gestiune
                </span>
                {gestiuni.length <= 4 ? (
                  gestiuni.map((g) => {
                    const active = g.id === gestiuneId;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGestiune(g.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                          active
                            ? 'bg-sapphire-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                        }`}
                      >
                        {g.nume}
                      </button>
                    );
                  })
                ) : (
                  <select
                    value={gestiuneId ?? ''}
                    onChange={(e) => handleSelectGestiune(Number(e.target.value))}
                    className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-extrabold text-sapphire-900 dark:text-white"
                  >
                    {gestiuni.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nume}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Quick Live Summary Pill */}
            {dashboardData && (
              <div className="hidden xl:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-morning-50 dark:bg-slate-800/80 border border-morning-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-sage-500 block leading-none">Stoc Total</span>
                  <span className="font-mono font-black text-sapphire-900 dark:text-white">
                    {fmtNum(dashboardData.totalStock)} L
                  </span>
                </div>
                <div className="w-px h-6 bg-morning-200 dark:bg-slate-700" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-sage-500 block leading-none">Loc Liber</span>
                  <span
                    className={`font-mono font-black ${
                      dashboardData.isOverloaded
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {dashboardData.isOverloaded
                      ? `+${fmtNum(dashboardData.overloadQty)} L`
                      : `${fmtNum(dashboardData.freeSpace)} L`}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleRefreshAll()}
              disabled={loadingData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-morning-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-morning-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
              title="Reîncarcă datele"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin text-sapphire-600' : ''}`} />
              <span className="hidden sm:inline">Actualizează</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS STRIP */}
        <div className="mt-4 pt-3 border-t border-morning-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => switchTab(t.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  active
                    ? 'bg-sapphire-600 text-white shadow-sm shadow-sapphire-600/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-morning-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-sage-500 dark:text-slate-400'}`} />
                <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${
                      active
                        ? 'bg-white/25 text-white'
                        : t.badgeTone === 'rose'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200 font-bold">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => handleRefreshAll()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer shrink-0"
          >
            Reîncearcă
          </button>
        </div>
      )}

      {/* INITIAL LOADING */}
      {loadingInit ? (
        <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-12 text-center text-sm font-bold text-sage-600 animate-pulse">
          Se încarcă modulul Combustibil...
        </div>
      ) : gestiuneId === null ? (
        <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Fuel className="w-10 h-10 mx-auto text-sage-400" />
          <p className="text-sm font-bold text-sapphire-900 dark:text-white">
            Nu există gestiuni de combustibil configurate.
          </p>
        </div>
      ) : (
        /* ACTIVE TAB CONTENT */
        <div>
          {activeTab === 'panou' && (
            <CombustibilDashboardTab
              data={dashboardData}
              loading={loadingData}
              onRefresh={() => handleRefreshAll()}
              onOpenCompanyStock={(compId) => {
                setActiveStockCompanyId(compId);
                switchTab('stoc');
              }}
            />
          )}

          {activeTab === 'stoc' && (
            <CombustibilStocTab
              data={stocData}
              loading={loadingData}
              activeCompanyId={activeStockCompanyId}
              onSelectCompany={(id) => setActiveStockCompanyId(id)}
              onRefresh={() => handleRefreshAll()}
              onJumpToReports={(compId) => {
                setReportInitialCompanyId(compId);
                switchTab('rapoarte');
              }}
            />
          )}

          {activeTab === 'parc' && (
            <CombustibilParcAutoTab
              categories={parcData}
              loading={loadingData}
              onOpenAdminCategories={() => {
                setAdminInitialSubTab('categorii');
                switchTab('admin');
              }}
            />
          )}

          {activeTab === 'analiza' && <CombustibilAnalizaTab gestiuneId={gestiuneId} />}

          {activeTab === 'import' && (
            <CombustibilImportTab
              gestiune={activeGestiune}
              onImportDone={() => handleRefreshAll()}
            />
          )}

          {activeTab === 'rapoarte' && (
            <CombustibilRapoarteTab
              gestiune={activeGestiune}
              companies={dashboardData?.stocks || []}
              initialCompanyId={reportInitialCompanyId}
            />
          )}

          {activeTab === 'admin' && (
            <CombustibilAdminTab
              gestiuneId={gestiuneId}
              gestiuni={gestiuni}
              initialSubTab={adminInitialSubTab}
              onRefreshAll={(switchToId) => handleRefreshAll(switchToId)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function CombustibilPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm font-bold text-sage-600 animate-pulse">
          Se încarcă modulul Combustibil...
        </div>
      }
    >
      <CombustibilPageInner />
    </Suspense>
  );
}
