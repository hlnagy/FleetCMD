"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Truck, Plus, Edit2, Trash2, AlertTriangle, Grid, Search,
  X, Save, CheckCircle2, MapPin,
} from 'lucide-react';
import FilterableSelect from '@/components/FilterableSelect';
import { CombustibilGestiune, combustibilFetch } from './types';

interface Props {
  gestiuneId: number;
  gestiuni: CombustibilGestiune[];
  initialSubTab?: 'companii' | 'nealocate' | 'categorii' | 'gestiuni';
  onRefreshAll: (switchToGestiuneId?: number) => void;
}

export default function CombustibilAdminTab({ gestiuneId, gestiuni, initialSubTab, onRefreshAll }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'companii' | 'nealocate' | 'categorii' | 'gestiuni'>(initialSubTab || 'companii');
  const [activeCompId, setActiveCompId] = useState<number | null>(null);
  const [vehSearch, setVehSearch] = useState('');
  const [busy, setBusy] = useState(false);

  // Bulk selections
  const [selUnalloc, setSelUnalloc] = useState<Set<number>>(new Set());
  const [bulkCompTarget, setBulkCompTarget] = useState<string>('');
  const [selUncat, setSelUncat] = useState<Set<number>>(new Set());
  const [bulkCatTarget, setBulkCatTarget] = useState<string>('');

  // Modals
  const [compModal, setCompModal] = useState<{ mode: 'new' | 'edit'; id?: number; nume: string; cui: string; adresa: string; codProdus: string } | null>(null);
  const [vehModal, setVehModal] = useState<{ mode: 'new' | 'edit'; id?: number; numarAuto: string; companieId: string; categorieId: string } | null>(null);
  const [catModal, setCatModal] = useState<{ mode: 'new' | 'edit'; id?: number; nume: string; descriere: string } | null>(null);
  const [gestModal, setGestModal] = useState<{ mode: 'new' | 'edit'; id?: number; nume: string; codPunctLucru: string; tipCombustibil: string; capacitateBazin: string } | null>(null);

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const res = await combustibilFetch(`/admin?gestiuneId=${gestiuneId}`);
      setData(res);
      if (res.companies?.length > 0 && (!activeCompId || !res.companies.some((c: any) => c.id === activeCompId))) {
        setActiveCompId(res.companies[0].id);
      }
    } catch (err: any) {
      alert(err?.message || 'Eroare la încărcarea administrării.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, [gestiuneId]);

  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);

  const activeCompany = useMemo(() => {
    if (!data?.companies?.length) return null;
    return data.companies.find((c: any) => c.id === activeCompId) || data.companies[0];
  }, [data, activeCompId]);

  const refreshBoth = async (switchGid?: number) => {
    await loadAdmin();
    onRefreshAll(switchGid);
  };

  // --- Handlers ---
  const saveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compModal) return;
    setBusy(true);
    try {
      if (compModal.mode === 'new') {
        await combustibilFetch('/admin/companii', {
          method: 'POST',
          body: JSON.stringify({ gestiuneId, nume: compModal.nume, cui: compModal.cui, adresa: compModal.adresa, codProdus: compModal.codProdus }),
        });
      } else {
        await combustibilFetch(`/admin/companii/${compModal.id}`, {
          method: 'PUT',
          body: JSON.stringify({ nume: compModal.nume, cui: compModal.cui, adresa: compModal.adresa, codProdus: compModal.codProdus }),
        });
      }
      setCompModal(null);
      await refreshBoth();
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvarea companiei.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCompany = async (c: any) => {
    if (!confirm(`ATENȚIE! Sigur ștergeți compania ${c.nume}?`)) return;
    setBusy(true);
    try {
      await combustibilFetch(`/admin/companii/${c.id}`, { method: 'DELETE' });
      await refreshBoth();
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergere.');
    } finally {
      setBusy(false);
    }
  };

  const saveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehModal) return;
    setBusy(true);
    try {
      const payload = {
        gestiuneId,
        numarAuto: vehModal.numarAuto,
        companieId: vehModal.companieId ? Number(vehModal.companieId) : null,
        categorieId: vehModal.categorieId ? Number(vehModal.categorieId) : null,
      };
      if (vehModal.mode === 'new') {
        await combustibilFetch('/admin/vehicule', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        await combustibilFetch(`/admin/vehicule/${vehModal.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      }
      setVehModal(null);
      await refreshBoth();
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvarea vehiculului.');
    } finally {
      setBusy(false);
    }
  };

  const deleteVehicle = async (v: any) => {
    if (!confirm(`Sigur ștergeți vehiculul ${v.numarAuto}?`)) return;
    setBusy(true);
    try {
      await combustibilFetch(`/admin/vehicule/${v.id}`, { method: 'DELETE' });
      await refreshBoth();
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergere.');
    } finally {
      setBusy(false);
    }
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catModal) return;
    setBusy(true);
    try {
      if (catModal.mode === 'new') {
        await combustibilFetch('/admin/categorii', {
          method: 'POST',
          body: JSON.stringify({ gestiuneId, nume: catModal.nume, descriere: catModal.descriere }),
        });
      } else {
        await combustibilFetch(`/admin/categorii/${catModal.id}`, {
          method: 'PUT',
          body: JSON.stringify({ nume: catModal.nume, descriere: catModal.descriere }),
        });
      }
      setCatModal(null);
      await refreshBoth();
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvarea categoriei.');
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (cat: any) => {
    if (!confirm(`Ștergeți categoria ${cat.nume}? Vehiculele vor rămâne necategorizate.`)) return;
    setBusy(true);
    try {
      await combustibilFetch(`/admin/categorii/${cat.id}`, { method: 'DELETE' });
      await refreshBoth();
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergere.');
    } finally {
      setBusy(false);
    }
  };

  const saveGestiune = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gestModal) return;
    setBusy(true);
    try {
      if (gestModal.mode === 'new') {
        const created = await combustibilFetch('/gestiuni', {
          method: 'POST',
          body: JSON.stringify({
            nume: gestModal.nume,
            codPunctLucru: gestModal.codPunctLucru,
            tipCombustibil: gestModal.tipCombustibil,
            capacitateBazin: parseFloat(gestModal.capacitateBazin) || 27000,
          }),
        });
        setGestModal(null);
        await refreshBoth(created.id);
      } else {
        await combustibilFetch(`/gestiuni/${gestModal.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            nume: gestModal.nume,
            codPunctLucru: gestModal.codPunctLucru,
            tipCombustibil: gestModal.tipCombustibil,
            capacitateBazin: parseFloat(gestModal.capacitateBazin) || 27000,
          }),
        });
        setGestModal(null);
        await refreshBoth();
      }
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvarea gestiunii.');
    } finally {
      setBusy(false);
    }
  };

  const deleteGestiune = async (g: CombustibilGestiune) => {
    if (!confirm(`ATENȚIE! Ștergeți definitiv gestiunea "${g.nume}" și toate datele ei?`)) return;
    setBusy(true);
    try {
      await combustibilFetch(`/gestiuni/${g.id}`, { method: 'DELETE' });
      const remaining = gestiuni.find((x) => x.id !== g.id);
      await refreshBoth(remaining?.id);
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergere.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkAssignCompany = async () => {
    if (selUnalloc.size === 0 || !bulkCompTarget) return;
    setBusy(true);
    try {
      await combustibilFetch('/admin/vehicule/bulk-company', {
        method: 'POST',
        body: JSON.stringify({ gestiuneId, vehicleIds: Array.from(selUnalloc), companieId: Number(bulkCompTarget) }),
      });
      setSelUnalloc(new Set());
      setBulkCompTarget('');
      await refreshBoth();
    } catch (err: any) {
      alert(err?.message || 'Eroare la alocare.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkSetCategory = async () => {
    if (selUncat.size === 0 || !bulkCatTarget) return;
    setBusy(true);
    try {
      await combustibilFetch('/admin/vehicule/bulk-category', {
        method: 'POST',
        body: JSON.stringify({ gestiuneId, vehicleIds: Array.from(selUncat), categorieId: Number(bulkCatTarget) }),
      });
      setSelUncat(new Set());
      setBulkCatTarget('');
      await refreshBoth();
    } catch (err: any) {
      alert(err?.message || 'Eroare la categorisire.');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return <div className="p-12 text-center text-sage-600 font-semibold animate-pulse">Se încarcă datele de administrare...</div>;
  }
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'companii', label: `Companii (${data.companies.length})`, icon: Building2 },
            { id: 'nealocate', label: `Nealocate (${data.unallocatedVehicles.length})`, icon: AlertTriangle, warn: data.unallocatedVehicles.length > 0 },
            { id: 'categorii', label: `Categorii & Utilaje (${data.categories.length})`, icon: Grid, badge: data.uncategorizedVehicles.length },
            { id: 'gestiuni', label: `Gestiuni / Puncte de Lucru (${gestiuni.length})`, icon: MapPin },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as any)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                  active
                    ? 'bg-sapphire-600 text-white border-sapphire-600 shadow-sm'
                    : t.warn
                    ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                    : 'bg-morning-50 hover:bg-morning-100 text-sapphire-900 border-morning-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">{t.badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCompModal({ mode: 'new', nume: '', cui: '', adresa: '', codProdus: '' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Companie Nouă</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setVehModal({
                mode: 'new',
                numarAuto: '',
                companieId: activeCompany ? String(activeCompany.id) : '',
                categorieId: '',
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-extrabold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Vehicul Nou</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: COMPANII & VEHICULE ALOCATE */}
      {subTab === 'companii' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {data.companies.map((c: any) => {
              const active = activeCompany?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCompId(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    active ? 'text-white shadow-xs' : 'bg-white text-sapphire-900 border-morning-200 hover:bg-morning-50'
                  }`}
                  style={active ? { backgroundColor: c.hex, borderColor: c.hex } : undefined}
                >
                  {c.nume} ({c.vehicule.length})
                </button>
              );
            })}
          </div>

          {activeCompany && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 bg-white rounded-2xl border border-morning-200 p-5 relative overflow-hidden space-y-3 text-xs">
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: activeCompany.hex }} />
                <div className="pl-2 space-y-3">
                  <h4 className="text-base font-black text-sapphire-900">{activeCompany.nume}</h4>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-sage-600">CUI</div>
                    <div className="font-mono font-bold text-sapphire-900">{activeCompany.cui || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-sage-600">Adresă</div>
                    <div className="font-medium text-sapphire-900">{activeCompany.adresa || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase text-sage-600">Cod Produs (Bon Consum)</div>
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-lg bg-morning-100 border border-morning-200 font-mono font-black text-sapphire-800">
                      {activeCompany.codProdus || '—'}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-morning-200 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCompModal({
                          mode: 'edit',
                          id: activeCompany.id,
                          nume: activeCompany.nume,
                          cui: activeCompany.cui || '',
                          adresa: activeCompany.adresa || '',
                          codProdus: activeCompany.codProdus || '',
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-morning-100 hover:bg-sapphire-100 text-sapphire-800 font-extrabold cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editează</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCompany(activeCompany)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 bg-white rounded-2xl border border-morning-200 overflow-hidden">
                <div className="p-3.5 border-b border-morning-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-black text-sapphire-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-sapphire-600" />
                    <span>Vehicule Alocate ({activeCompany.vehicule.length})</span>
                  </div>
                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                    <input
                      type="text"
                      value={vehSearch}
                      onChange={(e) => setVehSearch(e.target.value)}
                      placeholder="Caută vehicul..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-morning-50 border border-morning-300 text-xs text-sapphire-900"
                    />
                  </div>
                </div>
                <div className="divide-y divide-morning-100 max-h-[440px] overflow-y-auto">
                  {activeCompany.vehicule
                    .filter((v: any) => !vehSearch.trim() || v.numarAuto.toLowerCase().includes(vehSearch.trim().toLowerCase()))
                    .map((v: any) => (
                      <div key={v.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-morning-50 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-black text-sapphire-900">{v.numarAuto}</span>
                          {v.categorie && (
                            <span className="px-2 py-0.5 rounded-md bg-morning-100 border border-morning-200 text-[10px] font-bold text-sage-700">
                              {v.categorie.nume}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setVehModal({
                                mode: 'edit',
                                id: v.id,
                                numarAuto: v.numarAuto,
                                companieId: v.companieId ? String(v.companieId) : '',
                                categorieId: v.categorieId ? String(v.categorieId) : '',
                              })
                            }
                            className="p-1.5 rounded-lg bg-morning-100 hover:bg-sapphire-100 text-sapphire-700 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteVehicle(v)}
                            className="p-1.5 rounded-lg bg-morning-100 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: NEALOCATE */}
      {subTab === 'nealocate' && (
        <div className="bg-white rounded-2xl border border-morning-200 overflow-hidden text-xs">
          <div className="p-3.5 bg-rose-50 border-b border-rose-200 flex flex-wrap items-center justify-between gap-2">
            <div className="font-black text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Vehicule fără firmă asignată ({data.unallocatedVehicles.length})</span>
            </div>
            {data.unallocatedVehicles.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-48">
                  <FilterableSelect
                    value={bulkCompTarget}
                    onChange={(e) => setBulkCompTarget(e.target.value)}
                    searchPlaceholder="Alege firma..."
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-morning-300 font-bold text-sapphire-900"
                  >
                    <option value="">-- Alocă selectate la --</option>
                    {data.companies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.nume}</option>
                    ))}
                  </FilterableSelect>
                </div>
                <button
                  type="button"
                  disabled={selUnalloc.size === 0 || !bulkCompTarget || busy}
                  onClick={handleBulkAssignCompany}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-extrabold cursor-pointer"
                >
                  Alocă ({selUnalloc.size})
                </button>
              </div>
            )}
          </div>
          {data.unallocatedVehicles.length === 0 ? (
            <div className="p-8 text-center text-emerald-700 font-bold flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <span>Toate vehiculele sunt alocate corect unei companii.</span>
            </div>
          ) : (
            <div className="divide-y divide-morning-100">
              {data.unallocatedVehicles.map((v: any) => (
                <div key={v.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-morning-50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selUnalloc.has(v.id)}
                      onChange={(e) => {
                        setSelUnalloc((prev) => {
                          const n = new Set(prev);
                          if (e.target.checked) n.add(v.id);
                          else n.delete(v.id);
                          return n;
                        });
                      }}
                      className="w-4 h-4 accent-sapphire-600"
                    />
                    <span className="font-mono font-black text-rose-700">{v.numarAuto}</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setVehModal({ mode: 'edit', id: v.id, numarAuto: v.numarAuto, companieId: '', categorieId: v.categorieId ? String(v.categorieId) : '' })
                      }
                      className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold cursor-pointer"
                    >
                      Alocă la Firmă
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteVehicle(v)}
                      className="p-1.5 rounded-lg bg-morning-100 hover:bg-rose-100 text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: CATEGORII & NECATEGORIZATE */}
      {subTab === 'categorii' && (
        <div className="space-y-4 text-xs">
          {/* Uncategorized Vehicles */}
          {data.uncategorizedVehicles.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-300 overflow-hidden">
              <div className="p-3.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-amber-900">
                  Vehicule Necategorizate ({data.uncategorizedVehicles.length})
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-48">
                    <FilterableSelect
                      value={bulkCatTarget}
                      onChange={(e) => setBulkCatTarget(e.target.value)}
                      searchPlaceholder="Alege categoria..."
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-morning-300 font-bold text-sapphire-900"
                    >
                      <option value="">-- Setează categorie --</option>
                      {data.categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.nume}</option>
                      ))}
                    </FilterableSelect>
                  </div>
                  <button
                    type="button"
                    disabled={selUncat.size === 0 || !bulkCatTarget || busy}
                    onClick={handleBulkSetCategory}
                    className="px-3 py-1.5 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 disabled:opacity-40 text-white font-extrabold cursor-pointer"
                  >
                    Aplică ({selUncat.size})
                  </button>
                </div>
              </div>
              <div className="divide-y divide-morning-100 max-h-[260px] overflow-y-auto">
                {data.uncategorizedVehicles.map((v: any) => (
                  <div key={v.id} className="px-4 py-2 flex items-center justify-between hover:bg-morning-50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selUncat.has(v.id)}
                        onChange={(e) => {
                          setSelUncat((prev) => {
                            const n = new Set(prev);
                            if (e.target.checked) n.add(v.id);
                            else n.delete(v.id);
                            return n;
                          });
                        }}
                        className="w-4 h-4 accent-sapphire-600"
                      />
                      <span className="font-mono font-black text-sapphire-900">{v.numarAuto}</span>
                      {v.companie && <span className="text-[10px] font-bold text-sage-600">({v.companie.nume})</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setVehModal({ mode: 'edit', id: v.id, numarAuto: v.numarAuto, companieId: v.companieId ? String(v.companieId) : '', categorieId: '' })
                      }
                      className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-sapphire-100 text-sapphire-800 font-bold cursor-pointer"
                    >
                      Setează
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Categories Grid */}
          <div className="flex items-center justify-between">
            <h4 className="font-black text-sm text-sapphire-900">Categorii Definite ({data.categories.length})</h4>
            <button
              type="button"
              onClick={() => setCatModal({ mode: 'new', nume: '', descriere: '' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-extrabold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Categorie Nouă</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.categories.map((cat: any) => (
              <div key={cat.id} className="bg-white rounded-2xl border border-morning-200 p-4 flex items-center justify-between shadow-xs">
                <div>
                  <div className="font-black text-sm text-sapphire-900">{cat.nume}</div>
                  <div className="text-[11px] text-sage-600">{cat.vehicule?.length || 0} vehicule alocate</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCatModal({ mode: 'edit', id: cat.id, nume: cat.nume, descriere: cat.descriere || '' })}
                    className="p-1.5 rounded-lg bg-morning-100 hover:bg-sapphire-100 text-sapphire-700 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat)}
                    className="p-1.5 rounded-lg bg-morning-100 hover:bg-rose-100 text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: GESTIUNI (PUNCTE DE LUCRU) */}
      {subTab === 'gestiuni' && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-black text-sm text-sapphire-900">Gestiuni / Puncte de Lucru ({gestiuni.length})</h4>
              <p className="text-sage-600">Izolare completă a stocurilor, companiilor și tranzacțiilor pe fiecare punct de lucru.</p>
            </div>
            <button
              type="button"
              onClick={() =>
                setGestModal({ mode: 'new', nume: '', codPunctLucru: '', tipCombustibil: 'Motorină', capacitateBazin: '27000' })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-extrabold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gestiune Nouă</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gestiuni.map((g) => {
              const isActive = g.id === gestiuneId;
              return (
                <div
                  key={g.id}
                  className={`bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between space-y-3 ${
                    isActive ? 'border-sapphire-500 ring-2 ring-sapphire-500/20' : 'border-morning-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="text-base font-black text-sapphire-900">{g.nume}</h5>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-morning-100 border border-morning-200 text-[10px] font-bold text-sage-700">
                            {g.codPunctLucru || 'Fără Cod'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                            {g.tipCombustibil}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setGestModal({
                              mode: 'edit',
                              id: g.id,
                              nume: g.nume,
                              codPunctLucru: g.codPunctLucru || '',
                              tipCombustibil: g.tipCombustibil,
                              capacitateBazin: String(g.capacitateBazin || 27000),
                            })
                          }
                          className="p-1.5 rounded-lg bg-morning-100 hover:bg-sapphire-100 text-sapphire-700 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {gestiuni.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteGestiune(g)}
                            className="p-1.5 rounded-lg bg-morning-100 hover:bg-rose-100 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-sage-600 space-y-0.5">
                      <div>Capacitate bazine: <strong className="font-mono text-sapphire-900">{g.capacitateBazin.toLocaleString('ro-RO')} L</strong></div>
                      <div>{g.compCount ?? 0} companii • {g.vehCount ?? 0} vehicule • {g.trCount ?? 0} alimentări</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isActive}
                    onClick={() => onRefreshAll(g.id)}
                    className={`w-full py-2 rounded-xl font-extrabold transition ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800 cursor-default'
                        : 'bg-sapphire-600 hover:bg-sapphire-700 text-white cursor-pointer'
                    }`}
                  >
                    {isActive ? 'Gestiune Activă' : 'Activează această gestiune'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODALS */}
      {compModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-md overflow-hidden text-xs">
            <div className="px-5 py-3.5 bg-emerald-600 text-white flex items-center justify-between">
              <h4 className="font-black text-sm">{compModal.mode === 'new' ? 'Companie Nouă' : 'Editează Companie'}</h4>
              <button type="button" onClick={() => setCompModal(null)} className="p-1 rounded-lg hover:bg-white/20 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={saveCompany} className="p-5 space-y-3">
              <div>
                <label className="block font-bold text-sage-700 mb-1">Nume Companie *</label>
                <input type="text" required value={compModal.nume} onChange={(e) => setCompModal({ ...compModal, nume: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-bold text-sapphire-900" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-sage-700 mb-1">CUI</label>
                  <input type="text" value={compModal.cui} onChange={(e) => setCompModal({ ...compModal, cui: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-mono text-sapphire-900" />
                </div>
                <div>
                  <label className="block font-bold text-sage-700 mb-1">Cod Produs</label>
                  <input type="text" value={compModal.codProdus} onChange={(e) => setCompModal({ ...compModal, codProdus: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-mono text-sapphire-900" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-sage-700 mb-1">Adresă</label>
                <input type="text" value={compModal.adresa} onChange={(e) => setCompModal({ ...compModal, adresa: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 text-sapphire-900" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-morning-200">
                <button type="button" onClick={() => setCompModal(null)} className="px-4 py-2 rounded-xl bg-morning-100 font-bold text-slate-700 cursor-pointer">Anulează</button>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold cursor-pointer"><Save className="w-3.5 h-3.5" /><span>Salvează</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {vehModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-md overflow-hidden text-xs">
            <div className="px-5 py-3.5 bg-sapphire-600 text-white flex items-center justify-between">
              <h4 className="font-black text-sm">{vehModal.mode === 'new' ? 'Vehicul Nou' : 'Editează Vehicul'}</h4>
              <button type="button" onClick={() => setVehModal(null)} className="p-1 rounded-lg hover:bg-white/20 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={saveVehicle} className="p-5 space-y-3">
              <div>
                <label className="block font-bold text-sage-700 mb-1">Număr Înmatriculare / Cod Card Pompă *</label>
                <input type="text" required value={vehModal.numarAuto} onChange={(e) => setVehModal({ ...vehModal, numarAuto: e.target.value.toUpperCase() })} placeholder="ex: CV06CRA B" className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-mono font-bold text-sapphire-900" />
              </div>
              <div>
                <label className="block font-bold text-sage-700 mb-1">Firmă</label>
                <FilterableSelect value={vehModal.companieId} onChange={(e) => setVehModal({ ...vehModal, companieId: e.target.value })} searchPlaceholder="Caută firmă..." className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-bold text-sapphire-900">
                  <option value="">-- Nealocat --</option>
                  {data.companies.map((c: any) => <option key={c.id} value={c.id}>{c.nume}</option>)}
                </FilterableSelect>
              </div>
              <div>
                <label className="block font-bold text-sage-700 mb-1">Categorie Utilaj</label>
                <FilterableSelect value={vehModal.categorieId} onChange={(e) => setVehModal({ ...vehModal, categorieId: e.target.value })} searchPlaceholder="Caută categorie..." className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-bold text-sapphire-900">
                  <option value="">-- Fără Categorie --</option>
                  {data.categories.map((c: any) => <option key={c.id} value={c.id}>{c.nume}</option>)}
                </FilterableSelect>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-morning-200">
                <button type="button" onClick={() => setVehModal(null)} className="px-4 py-2 rounded-xl bg-morning-100 font-bold text-slate-700 cursor-pointer">Anulează</button>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-extrabold cursor-pointer"><Save className="w-3.5 h-3.5" /><span>Salvează</span></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {catModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-sm overflow-hidden text-xs">
            <div className="px-5 py-3.5 bg-sapphire-600 text-white flex items-center justify-between">
              <h4 className="font-black text-sm">{catModal.mode === 'new' ? 'Categorie Nouă' : 'Editează Categorie'}</h4>
              <button type="button" onClick={() => setCatModal(null)} className="p-1 rounded-lg hover:bg-white/20 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={saveCategory} className="p-5 space-y-3">
              <div>
                <label className="block font-bold text-sage-700 mb-1">Nume Categorie *</label>
                <input type="text" required value={catModal.nume} onChange={(e) => setCatModal({ ...catModal, nume: e.target.value })} placeholder="ex: Excavator, Vola..." className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-bold text-sapphire-900" />
              </div>
              <div>
                <label className="block font-bold text-sage-700 mb-1">Descriere</label>
                <input type="text" value={catModal.descriere} onChange={(e) => setCatModal({ ...catModal, descriere: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 text-sapphire-900" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-morning-200">
                <button type="button" onClick={() => setCatModal(null)} className="px-4 py-2 rounded-xl bg-morning-100 font-bold text-slate-700 cursor-pointer">Anulează</button>
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-extrabold cursor-pointer">Salvează</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {gestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-md overflow-hidden text-xs">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="font-black text-sm">{gestModal.mode === 'new' ? 'Gestiune Nouă' : 'Editează Gestiune'}</h4>
              <button type="button" onClick={() => setGestModal(null)} className="p-1 rounded-lg hover:bg-white/20 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={saveGestiune} className="p-5 space-y-3">
              <div>
                <label className="block font-bold text-sage-700 mb-1">Nume Gestiune *</label>
                <input type="text" required value={gestModal.nume} onChange={(e) => setGestModal({ ...gestModal, nume: e.target.value })} placeholder="ex: Budila, Covasna..." className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-bold text-sapphire-900" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-sage-700 mb-1">Cod Punct Lucru</label>
                  <input type="text" value={gestModal.codPunctLucru} onChange={(e) => setGestModal({ ...gestModal, codPunctLucru: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-mono text-sapphire-900" />
                </div>
                <div>
                  <label className="block font-bold text-sage-700 mb-1">Capacitate Bazin (L)</label>
                  <input type="number" step="100" value={gestModal.capacitateBazin} onChange={(e) => setGestModal({ ...gestModal, capacitateBazin: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-mono font-bold text-sapphire-900" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-sage-700 mb-1">Tip Combustibil Implicit</label>
                <input type="text" value={gestModal.tipCombustibil} onChange={(e) => setGestModal({ ...gestModal, tipCombustibil: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 text-sapphire-900" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-morning-200">
                <button type="button" onClick={() => setGestModal(null)} className="px-4 py-2 rounded-xl bg-morning-100 font-bold text-slate-700 cursor-pointer">Anulează</button>
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-extrabold cursor-pointer">Salvează</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
