"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Calculator, Gauge, Loader2, Clock } from 'lucide-react';
import FilterableSelect from '@/components/FilterableSelect';
import {
  CombustibilGestiune,
  DashboardCompanyStock,
  combustibilFetch,
  downloadCombustibilPdf,
  fmtDateTimeRo,
  fmtNum,
} from './types';

interface Props {
  gestiune: CombustibilGestiune | null;
  companies: DashboardCompanyStock[];
  initialCompanyId?: number | null;
}

export default function CombustibilRapoarteTab({ gestiune, companies, initialCompanyId }: Props) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00`;
  const todayEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T23:59`;

  // Form 1: Anexă Bon de Consum
  const [bonStart, setBonStart] = useState(monthStart);
  const [bonEnd, setBonEnd] = useState(todayEnd);
  const [bonCompanyId, setBonCompanyId] = useState<string>(initialCompanyId ? String(initialCompanyId) : '');
  const [bonNumber, setBonNumber] = useState('');
  const [stats, setStats] = useState<{ totalLiters: number; count: number; lastStart?: string | null; lastEnd?: string | null }>({
    totalLiters: 0,
    count: 0,
  });
  const [loadingBon, setLoadingBon] = useState(false);

  // Form 2: Raport Lunar
  const [lunarStart, setLunarStart] = useState(monthStart);
  const [lunarEnd, setLunarEnd] = useState(todayEnd);
  const [initialSeries, setInitialSeries] = useState('');
  const [finalSeries, setFinalSeries] = useState('');
  const [loadingLunar, setLoadingLunar] = useState(false);

  useEffect(() => {
    if (initialCompanyId) setBonCompanyId(String(initialCompanyId));
  }, [initialCompanyId]);

  // Auto-calculate selected liters preview
  useEffect(() => {
    if (!gestiune || !bonStart || !bonEnd) return;
    let active = true;
    const qs = new URLSearchParams({
      gestiuneId: String(gestiune.id),
      start: bonStart,
      end: bonEnd,
    });
    if (bonCompanyId) qs.set('companyId', bonCompanyId);
    combustibilFetch(`/rapoarte/stats?${qs.toString()}`)
      .then((res) => {
        if (!active) return;
        setStats({
          totalLiters: res.totalLiters || 0,
          count: res.count || 0,
          lastStart: res.hasSavedDates ? res.companyLastStart : null,
          lastEnd: res.hasSavedDates ? res.companyLastEnd : null,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [gestiune?.id, bonCompanyId, bonStart, bonEnd]);

  // When changing company, check saved last report dates
  const handleCompanyChange = async (nextId: string) => {
    setBonCompanyId(nextId);
    if (!gestiune || !nextId) return;
    try {
      const res = await combustibilFetch(`/rapoarte/stats?gestiuneId=${gestiune.id}&companyId=${nextId}`);
      if (res.hasSavedDates && res.companyLastStart && res.companyLastEnd) {
        setBonStart(res.companyLastStart);
        setBonEnd(res.companyLastEnd);
      }
    } catch {}
  };

  const handleGenerateBonuri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gestiune) return;
    setLoadingBon(true);
    try {
      const filename = await downloadCombustibilPdf(
        '/rapoarte/bonuri-pdf',
        {
          gestiuneId: gestiune.id,
          startDate: bonStart,
          endDate: bonEnd,
          companyId: bonCompanyId ? Number(bonCompanyId) : null,
          bonNumber,
        },
        'Bonuri_Consum.pdf',
      );
      alert(`PDF generat și descărcat cu succes: ${filename}`);
    } catch (err: any) {
      alert(err?.message || 'Eroare la generarea PDF.');
    } finally {
      setLoadingBon(false);
    }
  };

  const handleGenerateLunar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gestiune) return;
    setLoadingLunar(true);
    try {
      const filename = await downloadCombustibilPdf(
        '/rapoarte/lunar-pdf',
        {
          gestiuneId: gestiune.id,
          startDate: lunarStart,
          endDate: lunarEnd,
          initialSeries: parseFloat(initialSeries) || 0,
          finalSeries: parseFloat(finalSeries) || 0,
        },
        'Raport_Lunar.pdf',
      );
      alert(`Raport Lunar descărcat cu succes: ${filename}`);
    } catch (err: any) {
      alert(err?.message || 'Eroare la generarea raportului lunar.');
    } finally {
      setLoadingLunar(false);
    }
  };

  if (!gestiune) return null;

  const seriesDiff = (parseFloat(finalSeries) || 0) - (parseFloat(initialSeries) || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Left: Generare Anexă Bon de Consum */}
      <div className="bg-white rounded-2xl border border-morning-200 shadow-xs overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-sapphire-600 text-white text-center">
          <div className="inline-flex items-center gap-2 font-black text-base">
            <FileText className="w-5 h-5" />
            <span>Generare Anexă Bon de Consum</span>
          </div>
        </div>
        <form onSubmit={handleGenerateBonuri} className="p-5 flex-1 flex flex-col justify-between space-y-4 text-xs">
          <div className="space-y-4">
            <p className="text-center text-sage-600">
              Selectați perioada și firma pentru a genera bonurile individuale de alimentare în format PDF ({gestiune.nume}).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-extrabold uppercase text-[10px] text-sage-700 mb-1">De la:</label>
                <input
                  type="datetime-local"
                  required
                  value={bonStart}
                  onChange={(e) => setBonStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-morning-50 border border-morning-300 font-mono font-bold text-sapphire-900"
                />
              </div>
              <div>
                <label className="block font-extrabold uppercase text-[10px] text-sage-700 mb-1">Până la:</label>
                <input
                  type="datetime-local"
                  required
                  value={bonEnd}
                  onChange={(e) => setBonEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-morning-50 border border-morning-300 font-mono font-bold text-sapphire-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-extrabold uppercase text-[10px] text-sage-700 mb-1">Firmă</label>
              <FilterableSelect
                value={bonCompanyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                searchPlaceholder="Caută firmă..."
                className="w-full px-3 py-2 rounded-xl bg-morning-50 border border-morning-300 font-bold text-sapphire-900"
              >
                <option value="">-- Toate Firmele (Raport Global) --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nume}
                  </option>
                ))}
              </FilterableSelect>
            </div>

            {/* Live Total Preview */}
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200">
                  <Calculator className="w-4 h-4 text-sky-600" />
                  <span>Total Combustibil ({stats.count} bonuri):</span>
                </span>
                <span className="text-base font-black font-mono text-sky-800 dark:text-sky-200">
                  {fmtNum(stats.totalLiters, 2)} L
                </span>
              </div>
              {stats.lastStart && stats.lastEnd && (
                <div className="pt-1.5 border-t border-sky-200/70 text-[11px] text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Ultimul raport generat: <strong>{fmtDateTimeRo(stats.lastStart)} — {fmtDateTimeRo(stats.lastEnd)}</strong>
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-extrabold uppercase text-[10px] text-sage-700 mb-1">Număr Bon Consum *</label>
              <input
                type="text"
                required
                value={bonNumber}
                onChange={(e) => setBonNumber(e.target.value)}
                placeholder="ex: 104"
                className="w-full px-3 py-2 rounded-xl bg-morning-50 border border-morning-300 font-mono font-bold text-sapphire-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingBon}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {loadingBon ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>{loadingBon ? 'Se generează PDF...' : 'Generează Bonuri PDF'}</span>
          </button>
        </form>
      </div>

      {/* Right: Raport Lunar */}
      <div className="bg-white rounded-2xl border border-morning-200 shadow-xs overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-emerald-600 text-white text-center">
          <div className="inline-flex items-center gap-2 font-black text-base">
            <Calendar className="w-5 h-5" />
            <span>Raport Lunar Complet</span>
          </div>
        </div>
        <form onSubmit={handleGenerateLunar} className="p-5 flex-1 flex flex-col justify-between space-y-4 text-xs">
          <div className="space-y-4">
            <p className="text-center text-sage-600">
              Generează raport lunar cu sumar stocuri per firmă, verificarea contoarelor pompei și istoricul cronologic complet.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-extrabold uppercase text-[10px] text-sage-700 mb-1">De la:</label>
                <input
                  type="datetime-local"
                  required
                  value={lunarStart}
                  onChange={(e) => setLunarStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-morning-50 border border-morning-300 font-mono font-bold text-sapphire-900"
                />
              </div>
              <div>
                <label className="block font-extrabold uppercase text-[10px] text-sage-700 mb-1">Până la:</label>
                <input
                  type="datetime-local"
                  required
                  value={lunarEnd}
                  onChange={(e) => setLunarEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-morning-50 border border-morning-300 font-mono font-bold text-sapphire-900"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-morning-50 border border-morning-200 space-y-3">
              <div className="flex items-center gap-1.5 font-black text-sapphire-900">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <span>Contoare Pompă (Verificare Discrepanțe)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold uppercase text-[10px] text-sage-700 mb-1">Serie Inițială *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={initialSeries}
                    onChange={(e) => setInitialSeries(e.target.value)}
                    placeholder="ex: 12345.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-morning-300 font-mono font-bold text-sapphire-900"
                  />
                </div>
                <div>
                  <label className="block font-extrabold uppercase text-[10px] text-sage-700 mb-1">Serie Finală *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={finalSeries}
                    onChange={(e) => setFinalSeries(e.target.value)}
                    placeholder="ex: 56000.00"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-morning-300 font-mono font-bold text-sapphire-900"
                  />
                </div>
              </div>
              {initialSeries && finalSeries && (
                <div className="text-right text-[11px] font-bold text-emerald-700">
                  Diferență calculată pompă: <span className="font-mono font-black">{fmtNum(seriesDiff, 2)} L</span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingLunar}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {loadingLunar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            <span>{loadingLunar ? 'Se generează Raportul...' : 'Generează Raport Lunar PDF'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
