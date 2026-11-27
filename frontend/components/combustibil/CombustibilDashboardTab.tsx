"use client";

import React, { useState } from 'react';
import {
  Fuel, Camera, Edit3, AlertTriangle, CheckCircle2, ArrowRight,
  Gauge, Calendar, ArrowDownCircle, Building2, X, Save,
} from 'lucide-react';
import {
  CombustibilDashboardData,
  combustibilFetch,
  fmtDateTimeRo,
  fmtNum,
  generateMobileSnapshotPng,
} from './types';

interface Props {
  data: CombustibilDashboardData | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenCompanyStock: (companyId: number | -1) => void;
}

export default function CombustibilDashboardTab({ data, loading, onRefresh, onOpenCompanyStock }: Props) {
  const [editCapOpen, setEditCapOpen] = useState(false);
  const [capInput, setCapInput] = useState<string>('27000');
  const [savingCap, setSavingCap] = useState(false);

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-sage-600 font-semibold animate-pulse">
        Se încarcă situația stocurilor de combustibil...
      </div>
    );
  }
  if (!data) return null;

  const isCriticalLow = data.totalPercent <= 15;
  const tankPerUnit = Math.max(0, data.totalStock / 3);
  const tankHue = Math.round(Math.max(0, Math.min(100, data.displayPercent)) * 1.2);

  const handleSaveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(capInput);
    if (!val || val <= 0) return;
    setSavingCap(true);
    try {
      await combustibilFetch(`/gestiuni/${data.gestiune.id}/capacitate`, {
        method: 'PUT',
        body: JSON.stringify({ capacitateBazin: val }),
      });
      setEditCapOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvarea capacității.');
    } finally {
      setSavingCap(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-sage-700">
          <Calendar className="w-4 h-4 text-sapphire-600" />
          <span>Ultima actualizare ({data.gestiune.nume}):</span>
          <span className="font-mono font-extrabold text-sapphire-900">
            {data.lastUpdate ? fmtDateTimeRo(data.lastUpdate) : 'Nici o înregistrare'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => generateMobileSnapshotPng(data)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-sapphire-600 dark:hover:bg-sapphire-500 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Snapshot Mobil (PNG)</span>
        </button>
      </div>

      {/* Main Grid: Hero Capacity Card + Company Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT: Panou General & Capacitate Rezervoare */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div
            className={`rounded-2xl p-5 text-white shadow-md relative overflow-hidden flex-1 flex flex-col justify-between ${
              isCriticalLow
                ? 'bg-gradient-to-br from-rose-600 to-red-700'
                : 'bg-gradient-to-br from-sapphire-600 via-blue-700 to-indigo-800'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setCapInput(String(data.tankCapacity));
                setEditCapOpen(true);
              }}
              title="Modifică capacitatea totală a bazinelor"
              className="absolute top-3.5 right-3.5 p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1 mb-4">
              <div className="w-11 h-11 mx-auto rounded-full bg-white/20 flex items-center justify-center shadow-inner mb-2">
                <Gauge className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-black tracking-tight">Panou General — {data.gestiune.nume}</h3>
              <p className="text-[11px] uppercase tracking-widest text-white/75 font-bold">
                Ansamblu Rezerve ({data.gestiune.tipCombustibil})
              </p>
            </div>

            {/* Capacitate Disponibilă (Free Space) */}
            <div className="rounded-2xl bg-emerald-500/25 border border-emerald-300/40 p-4 text-center mb-3">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-200 mb-1">
                <ArrowDownCircle className="w-4 h-4" />
                <span>Capacitate Disponibilă</span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
                {fmtNum(data.freeSpace, 0)} <span className="text-lg font-bold text-white/80">L</span>
              </div>
              <div className="text-[11px] text-white/80 font-medium mt-0.5">
                Loc liber pentru comandă (din {fmtNum(data.tankCapacity, 0)} L maxim)
              </div>
            </div>

            {/* Stoc Total */}
            <div className="rounded-2xl bg-white/12 border border-white/15 p-3.5 text-center mb-4">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/75">
                Stoc Total Disponibil
              </div>
              <div className="text-2xl font-black font-mono mt-0.5">
                {fmtNum(data.totalStock, 1)} <span className="text-sm font-bold text-white/75">L</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-black/25 overflow-hidden max-w-[85%] mx-auto">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{ width: `${data.displayPercent}%` }}
                />
              </div>
              <div className="text-[11px] font-bold text-white/85 mt-1">{data.totalPercent}% Plin</div>
              {data.isOverloaded && (
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-600 border border-white/50 text-[11px] font-extrabold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Supraîncărcat cu {fmtNum(data.overloadQty, 0)} L</span>
                </div>
              )}
            </div>

            {/* 3 Visual Tanks */}
            <div className="rounded-2xl bg-black/20 border border-white/10 p-3">
              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-[10px] font-extrabold uppercase text-white/80 mb-1.5">
                      Rezervor {idx}
                    </div>
                    <div className="mx-auto w-14 h-20 rounded-b-xl rounded-t-md border-2 border-white/40 bg-slate-900/50 relative overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-700"
                        style={{
                          height: `${data.displayPercent}%`,
                          backgroundColor: `hsl(${tankHue}, 75%, 48%)`,
                        }}
                      />
                      <div className="absolute inset-y-0 left-2 w-1.5 bg-white/15 pointer-events-none" />
                    </div>
                    <div className="mt-1.5 text-[11px] font-mono font-extrabold text-white">
                      {fmtNum(tankPerUnit, 0)} L
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Company Stock Cards + Unallocated Card */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {data.stocks.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpenCompanyStock(s.id)}
                className="group text-left bg-white rounded-2xl border border-morning-200 hover:border-sapphire-400 shadow-sm hover:shadow-md transition p-4 relative overflow-hidden cursor-pointer"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: s.colorHex }}
                />

                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${s.colorHex}1F`, color: s.colorHex }}
                      >
                        <Fuel className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-sm text-sapphire-900 truncate group-hover:text-sapphire-600 transition">
                          {s.nume}
                        </div>
                        <div className="text-[10px] font-semibold text-sage-600">
                          Inițial: {fmtNum(s.initial, 1)} L
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-sage-600">
                        Stoc Disponibil
                      </div>
                      <div
                        className="text-2xl font-black font-mono mt-0.5"
                        style={{ color: s.isLowStock ? '#dc2626' : s.colorHex }}
                      >
                        {fmtNum(s.current, 1)} <span className="text-xs font-bold text-sage-500">L</span>
                      </div>
                      {s.isLowStock && (
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>STOC SCĂZUT (&lt; {fmtNum(s.threshold, 0)} L)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-2 shrink-0">
                    <div>
                      <div className="text-[9px] font-extrabold uppercase text-sage-500">Intrări</div>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-mono font-bold">
                        +{fmtNum(s.refill, 0)}
                      </span>
                    </div>
                    <div>
                      <div className="text-[9px] font-extrabold uppercase text-sage-500">Consum</div>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-mono font-bold">
                        -{fmtNum(s.consumed, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Alimentări Nealocate Card */}
            <button
              type="button"
              onClick={() => onOpenCompanyStock(-1)}
              className={`group text-left bg-white rounded-2xl p-4 relative overflow-hidden transition cursor-pointer shadow-sm hover:shadow-md ${
                data.unallocated.count > 0
                  ? 'border-2 border-dashed border-rose-400'
                  : 'border border-morning-200 hover:border-sapphire-300'
              }`}
            >
              <div
                className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  data.unallocated.count > 0 ? 'bg-rose-600' : 'bg-slate-400'
                }`}
              />
              <div className="flex items-start justify-between gap-3 pl-2">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        data.unallocated.count > 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-morning-100 text-sage-600'
                      }`}
                    >
                      {data.unallocated.count > 0 ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <div
                        className={`font-black text-sm ${
                          data.unallocated.count > 0 ? 'text-rose-700' : 'text-sapphire-900'
                        }`}
                      >
                        Alimentări nealocate
                      </div>
                      <div className="text-[10px] font-semibold text-sage-600">
                        Alimentări fără firmă atribuită
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sage-600">
                      Volum Nealocat
                    </div>
                    <div
                      className={`text-2xl font-black font-mono mt-0.5 ${
                        data.unallocated.count > 0 ? 'text-rose-700' : 'text-sage-600'
                      }`}
                    >
                      {fmtNum(data.unallocated.consumed, 1)}{' '}
                      <span className="text-xs font-bold text-sage-500">L</span>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-2 shrink-0">
                  <div>
                    <div className="text-[9px] font-extrabold uppercase text-sage-500">Tranzacții</div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-white text-[11px] font-mono font-bold ${
                        data.unallocated.count > 0 ? 'bg-rose-600' : 'bg-slate-500'
                      }`}
                    >
                      {data.unallocated.count}
                    </span>
                  </div>
                  <div>
                    <div className="text-[9px] font-extrabold uppercase text-sage-500">Ultima</div>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-morning-200 text-sapphire-900 text-[10px] font-mono font-bold">
                      {data.unallocated.lastUpdate ? fmtDateTimeRo(data.unallocated.lastUpdate).slice(0, 5) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onOpenCompanyStock(data.stocks[0]?.id ?? -1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-xs font-extrabold text-sapphire-900 transition cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-sapphire-600" />
              <span>Vezi Toate Detaliile de Stoc</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Editare Capacitate Bazine */}
      {editCapOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-sapphire-600 text-white flex items-center justify-between">
              <h4 className="font-black text-sm">Capacitate Totală Rezervoare ({data.gestiune.nume})</h4>
              <button
                type="button"
                onClick={() => setEditCapOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCapacity} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-sage-700 mb-1.5">
                  Capacitate maximă combinată (Litri):
                </label>
                <input
                  type="number"
                  step="100"
                  min="100"
                  required
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-morning-100 border border-morning-300 font-mono font-black text-lg text-sapphire-900"
                />
                <p className="text-[11px] text-sage-600 mt-1">
                  Ex: 3 bazine × 9.000 L = 27.000 L. Folosit pentru calculul locului liber de descărcare.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setEditCapOpen(false)}
                  className="px-4 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={savingCap}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingCap ? 'Se salvează...' : 'Salvează'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
