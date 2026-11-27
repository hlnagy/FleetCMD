"use client";

import React, { useState, useEffect } from 'react';
import {
  Sliders, FileText, Plus, Filter, MapPin, TrendingUp, Truck, Fuel,
  Package, MoreVertical, Check, X, Save, Loader2,
} from 'lucide-react';
import { combustibilFetch, downloadCombustibilPdf, fmtNum } from './types';

interface Props {
  gestiuneId: number;
}

export default function CombustibilAnalizaTab({ gestiuneId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Modals
  const [mcModalOpen, setMcModalOpen] = useState(false);
  const [mcForm, setMcForm] = useState<Record<string, string>>({});
  const [savingMc, setSavingMc] = useState(false);

  const [visModalOpen, setVisModalOpen] = useState(false);
  const [visSelected, setVisSelected] = useState<string[]>([]);
  const [visExcludeHidden, setVisExcludeHidden] = useState(false);
  const [savingVis, setSavingVis] = useState(false);

  const [basisModalCat, setBasisModalCat] = useState<{ category: string; currentBasis: string } | null>(null);

  const loadData = async (s?: string, e?: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ gestiuneId: String(gestiuneId) });
      if (s) qs.set('start', s);
      if (e) qs.set('end', e);
      const res = await combustibilFetch(`/analiza?${qs.toString()}`);
      setData(res);
      setStartDate(res.startDate || '');
      setEndDate(res.endDate || '');
    } catch (err: any) {
      alert(err?.message || 'Eroare la încărcarea analizei.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [gestiuneId]);

  const openMcModal = () => {
    if (!data) return;
    const f: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.mcValues || {})) {
      f[k] = String(v ?? 0);
    }
    setMcForm(f);
    setMcModalOpen(true);
  };

  const handleSaveMc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMc(true);
    try {
      await combustibilFetch('/analiza/productie', {
        method: 'POST',
        body: JSON.stringify({ gestiuneId, ...mcForm }),
      });
      setMcModalOpen(false);
      await loadData(startDate, endDate);
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvarea datelor de producție.');
    } finally {
      setSavingMc(false);
    }
  };

  const openVisModal = () => {
    if (!data) return;
    setVisSelected(data.visibleCategories || []);
    setVisExcludeHidden(Boolean(data.excludeHidden));
    setVisModalOpen(true);
  };

  const handleSaveVis = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVis(true);
    try {
      await combustibilFetch('/analiza/setari', {
        method: 'POST',
        body: JSON.stringify({
          gestiuneId,
          visibleCategories: visSelected,
          excludeHidden: visExcludeHidden,
        }),
      });
      setVisModalOpen(false);
      await loadData(startDate, endDate);
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvarea vizibilității.');
    } finally {
      setSavingVis(false);
    }
  };

  const handleSelectBasis = async (basisKey: string) => {
    if (!basisModalCat) return;
    try {
      await combustibilFetch('/analiza/baza-categorie', {
        method: 'POST',
        body: JSON.stringify({
          gestiuneId,
          category: basisModalCat.category,
          basis: basisKey,
        }),
      });
      setBasisModalCat(null);
      await loadData(startDate, endDate);
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvarea bazei de calcul.');
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadCombustibilPdf(
        '/rapoarte/analiza-pdf',
        { gestiuneId, startDate, endDate },
        'Raport_Analiza.pdf',
      );
    } catch (err: any) {
      alert(err?.message || 'Eroare la generarea PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading && !data) {
    return <div className="p-12 text-center text-sage-600 font-semibold animate-pulse">Se încarcă analiza de eficiență...</div>;
  }
  if (!data) return null;

  const mc = data.mcValues || {};
  const sortPct = mc.total_mc_vanduti > 0 ? Math.round((mc.mc_sorturi_vanduti / mc.total_mc_vanduti) * 100) : 0;

  // Live modal calculated values
  const modalStocStatie = (parseFloat(mcForm.mc_exploatati || '0') || 0) - (parseFloat(mcForm.mc_balast_sortati || '0') || 0);
  const modalCapMc = (parseFloat(mcForm.to_cap_tractor || '0') || 0) / 1.5;
  const modalSorturiVanduti = (parseFloat(mcForm.total_mc_vanduti || '0') || 0) - (parseFloat(mcForm.mc_balast || '0') || 0);

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-sapphire-900">Analiză Consum &amp; Eficiență Operațională</h3>
          <p className="text-xs text-sage-600 font-medium">
            Corelare litri motorină consumați cu volumul de balast / sorturi / nisip (MC) — Budila &amp; Ghidfalău.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openVisModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-xs font-extrabold text-sapphire-900 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Vizibilitate</span>
          </button>
          <button
            type="button"
            disabled={downloadingPdf}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60"
          >
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            <span>Raport PDF</span>
          </button>
          <button
            type="button"
            onClick={openMcModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-extrabold shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Date Producție (MC)</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadData(startDate, endDate);
        }}
        className="bg-white rounded-2xl border border-morning-200 p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
      >
        <div className="md:col-span-5">
          <label className="block text-[10px] font-extrabold uppercase text-sage-600 mb-1">De la data</label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-morning-50 border border-morning-300 text-xs font-mono font-bold text-sapphire-900"
          />
        </div>
        <div className="md:col-span-5">
          <label className="block text-[10px] font-extrabold uppercase text-sage-600 mb-1">Până la data</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-morning-50 border border-morning-300 text-xs font-mono font-bold text-sapphire-900"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sapphire-600 dark:hover:bg-sapphire-500 text-white text-xs font-extrabold cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Actualizează</span>
          </button>
        </div>
      </form>

      {/* Primary KPI Row (Budila) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-white/80">
            <span>BALAST EXPLOATAT</span>
            <span className="px-2 py-0.5 rounded-full bg-white/15">BRUT</span>
          </div>
          <div className="text-3xl font-black font-mono mt-2">
            {fmtNum(mc.mc_exploatati, 1)} <span className="text-sm font-bold text-white/75">MC</span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/15 text-[11px] space-y-0.5 text-white/85">
            <div className="flex justify-between">
              <span>Din care sortat:</span>
              <span className="font-mono font-bold">{fmtNum(mc.mc_balast_sortati, 1)} MC</span>
            </div>
            <div className="flex justify-between">
              <span>Stoc stație:</span>
              <span className="font-mono font-bold">{fmtNum(mc.mc_stoc_statie, 1)} MC</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-white/80">
            <span>TOTAL VÂNDUT (S+B)</span>
            <span className="px-2 py-0.5 rounded-full bg-white/15">TOTAL</span>
          </div>
          <div className="text-3xl font-black font-mono mt-2">
            {fmtNum(mc.total_mc_vanduti, 1)} <span className="text-sm font-bold text-white/75">MC</span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/15 text-[11px] flex justify-between text-white/85">
            <span>Din care balast:</span>
            <span className="font-mono font-bold">{fmtNum(mc.mc_balast, 1)} MC</span>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-cyan-600 to-sky-700 text-white shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-white/80">
            <span>SORTURI VÂNDUTE</span>
            <span className="px-2 py-0.5 rounded-full bg-white/15">NET</span>
          </div>
          <div className="text-3xl font-black font-mono mt-2">
            {fmtNum(mc.mc_sorturi_vanduti, 1)} <span className="text-sm font-bold text-white/75">MC</span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/15 text-[11px] space-y-1 text-white/85">
            <div className="h-1.5 rounded-full bg-black/20 overflow-hidden">
              <div className="h-full bg-white rounded-full" style={{ width: `${Math.max(0, Math.min(100, sortPct))}%` }} />
            </div>
            <div className="flex justify-between">
              <span>Pondere Sorturi</span>
              <span className="font-mono font-bold">{sortPct}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-white/85">
            <span>CONSUM NET BUDILA</span>
            <span className="px-2 py-0.5 rounded-full bg-white/15">FUEL</span>
          </div>
          <div className="text-3xl font-black font-mono mt-2">
            {fmtNum(data.netEngineFuel, 1)} <span className="text-sm font-bold text-white/80">LTR</span>
          </div>
          <div className="mt-3 pt-2 border-t border-white/15 text-[11px] flex justify-between text-white/90">
            <span>Brut: {fmtNum(data.totalEngineFuel, 0)} L</span>
            {mc.consum_extra_8x4 > 0 && <span className="font-mono font-bold">-{fmtNum(mc.consum_extra_8x4, 0)} L extra</span>}
          </div>
        </div>
      </div>

      {/* Budila Category Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-sapphire-600 text-white">
            <MapPin className="w-3.5 h-3.5" />
          </span>
          <h4 className="text-sm font-black text-sapphire-900">Eficiență pe Categorii de Utilaje — Budila</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {(data.budilaData || []).map((item: any) => {
            const share = data.totalEngineFuel > 0 ? Math.round((item.fuel / data.totalEngineFuel) * 100) : 0;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-morning-200 border-l-4 border-l-sapphire-600 p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sapphire-50 text-sapphire-700 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="font-black text-xs text-sapphire-900 truncate">{item.category}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBasisModalCat({ category: item.category, currentBasis: item.basis })}
                    title="Schimbă baza de calcul"
                    className="p-1 rounded-lg hover:bg-morning-100 text-sage-600 cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-sage-600 font-semibold">Consumat:</span>
                    <span className="font-mono font-black text-sapphire-900">{fmtNum(item.fuel, 1)} L</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-morning-100 overflow-hidden">
                    <div className="h-full bg-sapphire-600 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBasisModalCat({ category: item.category, currentBasis: item.basis })}
                  className="w-full text-center p-2 rounded-xl bg-morning-50 hover:bg-morning-100 border border-morning-200 transition cursor-pointer"
                >
                  <div className="text-[9px] font-extrabold uppercase text-sage-600">Baza de calcul:</div>
                  <div className="text-[11px] font-bold text-sapphire-900 truncate mt-0.5">{item.basisLabel}</div>
                </button>

                <div className="text-center pt-1">
                  {item.fuel > 0 ? (
                    <>
                      <div className="text-2xl font-black font-mono text-sapphire-700">{fmtNum(item.efficiency, 4)}</div>
                      <div className="text-[10px] font-extrabold uppercase text-sage-600">LTR / MC</div>
                    </>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full bg-morning-100 text-sage-600 text-[11px] font-semibold">
                      Niciun consum
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ghidfalău Section */}
      {(data.ghidfalauData || []).length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500 text-white">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <h4 className="text-sm font-black text-sapphire-900">Rezumat Operațional &amp; Categorii — Ghidfalău</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/85">NISIP EXPLOATAT GHIDFALĂU</div>
              <div className="text-3xl font-black font-mono mt-1.5">
                {fmtNum(mc.nisip_exploatat_ghidfalau, 1)} <span className="text-sm font-bold text-white/80">MC</span>
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/85">NISIP TRANSPORTAT LA BUDILA</div>
              <div className="text-3xl font-black font-mono mt-1.5">
                {fmtNum(mc.nisip_transportat_budila, 1)} <span className="text-sm font-bold text-white/80">MC</span>
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-cyan-600 to-sky-700 text-white shadow-sm">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/85">CONSUM NET GHIDFALĂU</div>
              <div className="text-3xl font-black font-mono mt-1.5">
                {fmtNum(data.ghidfalauNetFuel, 0)} <span className="text-sm font-bold text-white/80">LTR</span>
              </div>
              <div className="mt-2 pt-2 border-t border-white/15 text-[11px] flex justify-between text-white/90">
                <span>Brut: {fmtNum(data.ghidfalauTotalFuel, 0)} L</span>
                <span>Extra: -{fmtNum(mc.consum_extra_ghidfalau, 0)} L</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {data.ghidfalauData.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-morning-200 border-l-4 border-l-amber-500 p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-black text-xs text-sapphire-900 truncate">{item.category}</div>
                  <button
                    type="button"
                    onClick={() => setBasisModalCat({ category: item.category, currentBasis: item.basis })}
                    className="p-1 rounded-lg hover:bg-morning-100 text-sage-600 cursor-pointer"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-sage-600 font-semibold">Consumat:</span>
                  <span className="font-mono font-black text-sapphire-900">{fmtNum(item.fuel, 1)} L</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBasisModalCat({ category: item.category, currentBasis: item.basis })}
                  className="w-full text-center p-2 rounded-xl bg-morning-50 hover:bg-morning-100 border border-morning-200 text-[11px] font-bold text-sapphire-900 cursor-pointer"
                >
                  {item.basisLabel}
                </button>
                <div className="text-center">
                  <div className="text-2xl font-black font-mono text-amber-600">{fmtNum(item.efficiency, 4)}</div>
                  <div className="text-[10px] font-extrabold uppercase text-sage-600">LTR / MC</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Energy Efficiency Index Executive Board */}
      <div className="rounded-2xl p-5 sm:p-6 bg-slate-900 text-white shadow-lg border border-slate-700 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <h4 className="text-lg font-black">Energy Efficiency Index</h4>
          </div>
          <p className="text-xs text-slate-300">Performanța energetică agregată a întregii flote pe perioada selectată.</p>
          <div className="pt-2 space-y-2 border-t border-slate-700">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Consum Net Budila</div>
              <div className="text-2xl font-black font-mono text-white">{fmtNum(data.netEngineFuel, 1)} L</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold">Consum Net Ghidfalău</div>
              <div className="text-lg font-black font-mono text-amber-400">{fmtNum(data.ghidfalauNetFuel, 1)} L</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-300">Scor / TOTAL MC VÂNDUȚI</div>
              <div className="text-xs text-emerald-400 font-bold">{fmtNum(mc.total_mc_vanduti, 1)} MC raportați</div>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black font-mono text-white">{fmtNum(data.scores?.vanduti, 4)}</div>
              <div className="text-[10px] font-extrabold text-emerald-400">LTR / MC</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-slate-300">Scor / TOTAL BALAST SORTAT</div>
              <div className="text-xs text-emerald-400 font-bold">{fmtNum(mc.mc_balast_sortati, 1)} MC raportați</div>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black font-mono text-white">{fmtNum(data.scores?.sortati, 4)}</div>
              <div className="text-[10px] font-extrabold text-emerald-400">LTR / MC</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/25 flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-amber-300">Scor / NISIP EXPLOATAT GHIDFALĂU</div>
              <div className="text-xs text-amber-400 font-bold">{fmtNum(mc.nisip_exploatat_ghidfalau, 1)} MC raportați</div>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">{fmtNum(data.scores?.ghidfalau, 4)}</div>
              <div className="text-[10px] font-extrabold text-amber-400">LTR / MC</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Date Producție (MC) */}
      {mcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-black text-base">Actualizare Date Producție (MC)</h4>
                <p className="text-[11px] text-slate-300">Sincronizare valori pentru analiza de eficiență</p>
              </div>
              <button type="button" onClick={() => setMcModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveMc} className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-morning-50 border border-morning-200">
                  <label className="block font-extrabold text-[10px] uppercase text-sage-700 mb-1">A. TOTAL BALAST EXPLOATAȚI (MC)</label>
                  <input type="number" step="0.01" required value={mcForm.mc_exploatati || ''} onChange={(e) => setMcForm({ ...mcForm, mc_exploatati: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white border border-morning-300 font-mono font-bold text-sapphire-900" />
                </div>
                <div className="p-3 rounded-xl bg-morning-50 border border-morning-200">
                  <label className="block font-extrabold text-[10px] uppercase text-sage-700 mb-1">B. TOTAL BALAST SORTAT (MC)</label>
                  <input type="number" step="0.01" value={mcForm.mc_balast_sortati || ''} onChange={(e) => setMcForm({ ...mcForm, mc_balast_sortati: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white border border-morning-300 font-mono font-bold text-sapphire-900" />
                </div>
                <div className="p-3 rounded-xl bg-sapphire-50 border border-sapphire-200">
                  <div className="font-extrabold text-[10px] uppercase text-sapphire-700 mb-1">C. STOC TOTAL BALAST STAȚIE (A - B)</div>
                  <div className="text-lg font-black font-mono text-sapphire-900">{fmtNum(modalStocStatie, 1)} MC</div>
                </div>
                <div className="p-3 rounded-xl bg-morning-50 border border-morning-200">
                  <label className="block font-extrabold text-[10px] uppercase text-sage-700 mb-1">D. TRANSP. CAP TRACTOR (TONE → MC ÷ 1,5)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.01" value={mcForm.to_cap_tractor || ''} onChange={(e) => setMcForm({ ...mcForm, to_cap_tractor: e.target.value })} className="w-1/2 px-3 py-2 rounded-lg bg-white border border-morning-300 font-mono font-bold text-sapphire-900" />
                    <span className="font-mono font-black text-sapphire-700">≈ {fmtNum(modalCapMc, 1)} MC</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-black uppercase tracking-wider text-sage-600 border-b border-morning-200 pb-1">Vânzări &amp; Consum Extra Budila</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-morning-50 border border-morning-200">
                  <label className="block font-extrabold text-[10px] uppercase text-sage-700 mb-1">E. TOTAL VÂNDUȚI (S+B) (MC)</label>
                  <input type="number" step="0.01" required value={mcForm.total_mc_vanduti || ''} onChange={(e) => setMcForm({ ...mcForm, total_mc_vanduti: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white border border-morning-300 font-mono font-bold text-sapphire-900" />
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <label className="block font-extrabold text-[10px] uppercase text-amber-800 mb-1">H. CONSUM EXTRA BUDILA (LTR)</label>
                  <input type="number" step="0.01" value={mcForm.consum_extra_8x4 || ''} onChange={(e) => setMcForm({ ...mcForm, consum_extra_8x4: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white border border-amber-300 font-mono font-bold text-sapphire-900" />
                </div>
                <div className="p-3 rounded-xl bg-morning-50 border border-morning-200">
                  <label className="block font-extrabold text-[10px] uppercase text-sage-700 mb-1">F. TOTAL BALAST VÂNDUT (MC)</label>
                  <input type="number" step="0.01" value={mcForm.mc_balast || ''} onChange={(e) => setMcForm({ ...mcForm, mc_balast: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white border border-morning-300 font-mono font-bold text-sapphire-900" />
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="font-extrabold text-[10px] uppercase text-emerald-700 mb-1">G. TOTAL SORTURI VÂNDUȚI (E - F)</div>
                  <div className="text-lg font-black font-mono text-emerald-800">{fmtNum(modalSorturiVanduti, 1)} MC</div>
                </div>
              </div>

              <div className="text-[10px] font-black uppercase tracking-wider text-sage-600 border-b border-morning-200 pb-1">Logistică Ghidfalău</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-morning-50 border border-morning-200">
                  <label className="block font-extrabold text-[10px] uppercase text-sage-700 mb-1">I. NISIP EXPLOATAT (MC)</label>
                  <input type="number" step="0.01" value={mcForm.nisip_exploatat_ghidfalau || ''} onChange={(e) => setMcForm({ ...mcForm, nisip_exploatat_ghidfalau: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white border border-morning-300 font-mono font-bold text-sapphire-900" />
                </div>
                <div className="p-3 rounded-xl bg-morning-50 border border-morning-200">
                  <label className="block font-extrabold text-[10px] uppercase text-sage-700 mb-1">J. TRANSPORTAT BUDILA (MC)</label>
                  <input type="number" step="0.01" value={mcForm.nisip_transportat_budila || ''} onChange={(e) => setMcForm({ ...mcForm, nisip_transportat_budila: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white border border-morning-300 font-mono font-bold text-sapphire-900" />
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <label className="block font-extrabold text-[10px] uppercase text-amber-800 mb-1">K. CONSUM EXTRA GHID. (L)</label>
                  <input type="number" step="0.01" value={mcForm.consum_extra_ghidfalau || ''} onChange={(e) => setMcForm({ ...mcForm, consum_extra_ghidfalau: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white border border-amber-300 font-mono font-bold text-sapphire-900" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setMcModalOpen(false)} className="px-4 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 font-bold text-slate-700 cursor-pointer">
                  Anulează
                </button>
                <button type="submit" disabled={savingMc} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sapphire-600 text-white font-extrabold cursor-pointer disabled:opacity-60">
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingMc ? 'Se salvează...' : 'Salvează Modificările'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Vizibilitate Categorii */}
      {visModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="font-black text-sm">Personalizare Vizualizare Categorii</h4>
              <button type="button" onClick={() => setVisModalOpen(false)} className="p-1 rounded-lg hover:bg-white/15 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveVis} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {(data.allCategories || []).map((c: any) => {
                  const checked = visSelected.includes(c.nume);
                  return (
                    <label
                      key={c.id}
                      className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                        checked ? 'bg-sapphire-50 border-sapphire-300 font-bold text-sapphire-900' : 'bg-morning-50 border-morning-200 text-sage-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setVisSelected((prev) =>
                            e.target.checked ? [...prev, c.nume] : prev.filter((x) => x !== c.nume),
                          );
                        }}
                        className="w-4 h-4 accent-sapphire-600"
                      />
                      <span className="truncate">{c.nume}</span>
                    </label>
                  );
                })}
              </div>

              <label className="p-3 rounded-xl bg-morning-50 border border-morning-200 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visExcludeHidden}
                  onChange={(e) => setVisExcludeHidden(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-sapphire-600"
                />
                <div>
                  <div className="font-extrabold text-sapphire-900">Exclude categoriile ascunse din Consumul Total</div>
                  <div className="text-[11px] text-sage-600">Consumul Net va însuma doar categoriile bifate mai sus.</div>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-morning-200">
                <button type="button" onClick={() => setVisModalOpen(false)} className="px-4 py-2 rounded-xl bg-morning-100 font-bold text-slate-700 cursor-pointer">
                  Închide
                </button>
                <button type="submit" disabled={savingVis} className="px-5 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-extrabold cursor-pointer disabled:opacity-60">
                  Aplică Modificările
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Selectează Baza de Calcul per Categorie */}
      {basisModalCat && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-sapphire-600 text-white flex items-center justify-between">
              <div>
                <h4 className="font-black text-sm">Baza de calcul</h4>
                <p className="text-[11px] text-white/80">{basisModalCat.category}</p>
              </div>
              <button type="button" onClick={() => setBasisModalCat(null)} className="p-1 rounded-lg hover:bg-white/20 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-1.5 max-h-[65vh] overflow-y-auto">
              {Object.entries(data.basisLabels || {}).map(([key, label]) => {
                const active = key === basisModalCat.currentBasis;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectBasis(key)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                      active
                        ? 'bg-sapphire-600 text-white'
                        : 'bg-morning-50 hover:bg-morning-100 text-sapphire-900'
                    }`}
                  >
                    <span>{String(label)}</span>
                    {active && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
