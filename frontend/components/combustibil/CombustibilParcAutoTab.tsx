"use client";

import React, { useState, useMemo } from 'react';
import { Truck, Calculator, Search, Fuel, Settings } from 'lucide-react';
import { fmtDateRo, fmtNum, fmtTimeRo } from './types';

interface ParcCategory {
  id: number;
  nume: string;
  descriere?: string | null;
  icon?: string;
  vehicleCount: number;
  totalQty: number;
  recentTransactions: Array<{
    id: number;
    data: string;
    cantitate: number;
    numarAuto: string;
    companieNume: string | null;
    companieColorHex: string | null;
  }>;
}

interface Props {
  categories: ParcCategory[];
  loading: boolean;
  onOpenAdminCategories: () => void;
}

export default function CombustibilParcAutoTab({ categories, loading, onOpenAdminCategories }: Props) {
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [fuelPrice, setFuelPrice] = useState<string>('');
  const [materialMc, setMaterialMc] = useState<string>('');

  const activeCat = useMemo(() => {
    if (categories.length === 0) return null;
    return categories.find((c) => c.id === selectedCatId) || categories[0];
  }, [categories, selectedCatId]);

  const filteredTrans = useMemo(() => {
    if (!activeCat) return [];
    const q = search.trim().toLowerCase();
    if (!q) return activeCat.recentTransactions;
    return activeCat.recentTransactions.filter(
      (t) =>
        t.numarAuto.toLowerCase().includes(q) ||
        (t.companieNume || '').toLowerCase().includes(q) ||
        fmtDateRo(t.data).includes(q),
    );
  }, [activeCat, search]);

  if (loading && categories.length === 0) {
    return <div className="p-12 text-center text-sage-600 font-semibold animate-pulse">Se încarcă parcul auto...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-morning-200 p-10 text-center space-y-3">
        <Truck className="w-10 h-10 mx-auto text-sage-400" />
        <h3 className="text-base font-black text-sapphire-900">Nici o categorie configurată</h3>
        <p className="text-xs text-sage-600">Mergeți la Administrare pentru a defini categorii de utilaje.</p>
        <button
          type="button"
          onClick={onOpenAdminCategories}
          className="px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-extrabold cursor-pointer"
        >
          Configurează Categorii
        </button>
      </div>
    );
  }

  const mcNum = parseFloat(materialMc) || 0;
  const priceNum = parseFloat(fuelPrice) || 0;
  const consumPerMc = activeCat && mcNum > 0 ? activeCat.totalQty / mcNum : 0;
  const costPerMc = activeCat && mcNum > 0 ? (activeCat.totalQty * priceNum) / mcNum : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-sapphire-900">Parc Auto — Monitorizare Consum pe Categorii</h3>
          <p className="text-xs text-sage-600 font-medium">
            Total combustibil consumat per categorie, calculator eficiență L/MC &amp; Cost/MC și istoric alimentări.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAdminCategories}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-xs font-extrabold text-sapphire-900 transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Gestionare Categorii</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5 border-b border-morning-200 pb-2.5">
        {categories.map((cat) => {
          const active = activeCat?.id === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCatId(cat.id);
                setSearch('');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                active
                  ? 'bg-sapphire-600 text-white border-sapphire-600 shadow-sm'
                  : 'bg-morning-50 hover:bg-morning-100 text-sapphire-900 border-morning-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{cat.nume}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  active ? 'bg-white/25 text-white' : 'bg-morning-200 text-sapphire-900'
                }`}
              >
                {cat.vehicleCount}
              </span>
            </button>
          );
        })}
      </div>

      {activeCat && (
        <>
          {/* 3 Stat Cards + Efficiency Calculator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-sapphire-50 dark:bg-sapphire-950/30 rounded-2xl p-5 border border-sapphire-200 dark:border-sapphire-800 flex flex-col items-center justify-center text-center">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-sapphire-700 dark:text-sapphire-300">
                Consum Total Categorie
              </div>
              <div className="text-3xl font-black font-mono text-sapphire-900 dark:text-white mt-1.5">
                {fmtNum(activeCat.totalQty, 2)} <span className="text-base font-bold text-sapphire-600">L</span>
              </div>
              <div className="text-[11px] text-sage-600 font-medium mt-1">
                Cumulat pentru toate unitățile ({activeCat.nume})
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-morning-200 shadow-xs flex flex-col items-center justify-center text-center">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-sage-600">
                Parc Auto / Utilaje
              </div>
              <div className="text-4xl font-black font-mono text-sapphire-900 mt-1">{activeCat.vehicleCount}</div>
              <div className="text-[11px] text-sage-600 font-medium mt-1">Unități active în această categorie</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-300/70 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                <Calculator className="w-4 h-4" />
                <span>Calculator Eficiență</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-sage-600 mb-0.5">Preț Motorină (RON/L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(e.target.value)}
                    placeholder="ex: 7.45"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-morning-100 border border-morning-300 font-mono font-bold text-sapphire-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-sage-600 mb-0.5">Cantitate Material (MC)</label>
                  <input
                    type="number"
                    step="1"
                    value={materialMc}
                    onChange={(e) => setMaterialMc(e.target.value)}
                    placeholder="ex: 15000"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-morning-100 border border-morning-300 font-mono font-bold text-sapphire-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-morning-200 text-center">
                <div className="p-2 rounded-xl bg-morning-50 border border-morning-200">
                  <div className="text-[9px] font-extrabold uppercase text-sage-600">CONSUM / MC</div>
                  <div className="text-sm font-black font-mono text-sapphire-700">
                    {fmtNum(consumPerMc, 2)} <span className="text-[10px]">L</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-morning-50 border border-morning-200">
                  <div className="text-[9px] font-extrabold uppercase text-sage-600">COST / MC</div>
                  <div className="text-sm font-black font-mono text-emerald-700">
                    {fmtNum(costPerMc, 2)} <span className="text-[10px]">RON</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Fuelings Table */}
          <div className="bg-white rounded-2xl border border-morning-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-morning-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-sapphire-600" />
                <span className="text-xs font-black text-sapphire-900">
                  Alimentări — {activeCat.nume} ({filteredTrans.length})
                </span>
              </div>
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Caută utilaj, dată, firmă..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-morning-50 border border-morning-300 text-xs font-medium text-sapphire-900"
                />
              </div>
            </div>
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-morning-50 border-b border-morning-200 text-[10px] font-extrabold uppercase tracking-wider text-sage-700">
                  <tr>
                    <th className="p-3">Dată &amp; Oră</th>
                    <th className="p-3">Nr. Înmatriculare / Utilaj</th>
                    <th className="p-3">Firmă / Apartenență</th>
                    <th className="p-3 text-right">Cantitate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-100">
                  {filteredTrans.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-sage-600 italic">
                        Nici o alimentare înregistrată pentru această categorie.
                      </td>
                    </tr>
                  ) : (
                    filteredTrans.map((t) => (
                      <tr key={t.id} className="hover:bg-morning-50 transition">
                        <td className="p-3 font-mono whitespace-nowrap">
                          <span className="font-bold text-sapphire-900">{fmtDateRo(t.data)}</span>{' '}
                          <span className="text-sage-600">{fmtTimeRo(t.data)}</span>
                        </td>
                        <td className="p-3 font-mono font-black text-sapphire-900">{t.numarAuto}</td>
                        <td className="p-3">
                          {t.companieNume ? (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-white text-[10px] font-extrabold"
                              style={{ backgroundColor: t.companieColorHex || '#2563eb' }}
                            >
                              {t.companieNume}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
                              Nealocat
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sapphire-700 whitespace-nowrap">
                          {fmtNum(t.cantitate, 2)} L
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
