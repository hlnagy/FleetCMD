"use client";

import React, { useState, useMemo } from 'react';
import {
  Building2, AlertTriangle, CheckCircle2, Undo2, Redo2, Plus, Search, X,
  CheckSquare, Trash2, ArrowRightLeft, Edit2, FileText, Truck, Save, Filter,
} from 'lucide-react';
import FilterableSelect from '@/components/FilterableSelect';
import {
  CombustibilStocData,
  StockHistoryItem,
  combustibilFetch,
  fmtDateRo,
  fmtDateTimeRo,
  fmtNum,
  fmtTimeRo,
  toDatetimeLocalValue,
} from './types';

interface Props {
  data: CombustibilStocData | null;
  loading: boolean;
  activeCompanyId: number | -1 | null;
  onSelectCompany: (id: number | -1) => void;
  onRefresh: () => void;
  onJumpToReports: (companyId: number) => void;
}

export default function CombustibilStocTab({
  data,
  loading,
  activeCompanyId,
  onSelectCompany,
  onRefresh,
  onJumpToReports,
}: Props) {
  const [search, setSearch] = useState('');
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [lastClickedIdx, setLastClickedIdx] = useState<number | null>(null);
  const [bulkMoveTarget, setBulkMoveTarget] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // Quick Add Operation form
  const [opTip, setOpTip] = useState<'IN' | 'OUT' | 'INITIAL'>('IN');
  const [opQty, setOpQty] = useState<string>('');
  const [opDate, setOpDate] = useState<string>(() => toDatetimeLocalValue());
  const [opDesc, setOpDesc] = useState<string>('');

  // Edit modal (supports both StockOperation and Transaction)
  const [editingItem, setEditingItem] = useState<StockHistoryItem | null>(null);
  const [editTip, setEditTip] = useState<string>('IN');
  const [editQty, setEditQty] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editCompId, setEditCompId] = useState<string>('');

  const resolvedCompanyId: number | -1 = useMemo(() => {
    if (!data) return -1;
    if (activeCompanyId === -1) return -1;
    if (activeCompanyId && data.companies.some((c) => c.id === activeCompanyId)) return activeCompanyId;
    return data.companies[0]?.id ?? -1;
  }, [data, activeCompanyId]);

  const currentTab = useMemo(() => {
    if (!data) return null;
    if (resolvedCompanyId === -1) return null;
    return data.companies.find((c) => c.id === resolvedCompanyId) || null;
  }, [data, resolvedCompanyId]);

  const activeHistory = useMemo(() => {
    if (!data) return [];
    const list = resolvedCompanyId === -1 ? data.unallocated.history : currentTab?.history || [];
    const q = search.trim().toLowerCase();
    return list.filter((item) => {
      if (onlyDuplicates && !item.duplicateInfo) return false;
      if (!q) return true;
      const dt = fmtDateTimeRo(item.date).toLowerCase();
      return (
        dt.includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        String(item.quantity).includes(q)
      );
    });
  }, [data, resolvedCompanyId, currentTab, search, onlyDuplicates]);

  if (loading && !data) {
    return <div className="p-12 text-center text-sage-600 font-semibold animate-pulse">Se încarcă detaliile de stoc...</div>;
  }
  if (!data) return null;

  const itemKey = (it: StockHistoryItem) => `${it.kind}:${it.id}`;

  const handleToggleItem = (idx: number, it: StockHistoryItem, shiftKey: boolean) => {
    const k = itemKey(it);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const willSelect = !next.has(k);
      if (shiftKey && lastClickedIdx !== null) {
        const start = Math.min(lastClickedIdx, idx);
        const end = Math.max(lastClickedIdx, idx);
        for (let i = start; i <= end; i++) {
          const rk = itemKey(activeHistory[i]);
          if (willSelect) next.add(rk);
          else next.delete(rk);
        }
      } else {
        if (willSelect) next.add(k);
        else next.delete(k);
      }
      return next;
    });
    setLastClickedIdx(idx);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(activeHistory.map(itemKey)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTab) return;
    const qty = parseFloat(opQty);
    if (!qty || qty <= 0) {
      alert('Introduceți o cantitate validă mai mare ca 0.');
      return;
    }
    setBusy(true);
    try {
      await combustibilFetch('/stoc/operatiuni', {
        method: 'POST',
        body: JSON.stringify({
          gestiuneId: data.gestiuneId,
          companieId: currentTab.id,
          tip: opTip,
          cantitate: qty,
          data: opDate || toDatetimeLocalValue(),
          descriere: opDesc,
        }),
      });
      setOpQty('');
      setOpDesc('');
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la înregistrarea operațiunii.');
    } finally {
      setBusy(false);
    }
  };

  const openEditModal = (it: StockHistoryItem) => {
    setEditingItem(it);
    setEditTip(it.type);
    setEditQty(String(it.quantity));
    setEditDate(toDatetimeLocalValue(it.date));
    setEditDesc(it.description || '');
    setEditCompId(it.companieId ? String(it.companieId) : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setBusy(true);
    try {
      if (editingItem.kind === 'op') {
        await combustibilFetch(`/stoc/operatiuni/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            tip: editTip,
            cantitate: parseFloat(editQty),
            data: editDate,
            descriere: editDesc,
            companieId: editCompId ? Number(editCompId) : null,
          }),
        });
      } else {
        await combustibilFetch(`/stoc/tranzactii/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            cantitate: parseFloat(editQty),
            data: editDate,
            companieId: editCompId ? Number(editCompId) : null,
          }),
        });
      }
      setEditingItem(null);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la actualizare.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSingle = async (it: StockHistoryItem) => {
    if (!confirm(`Sigur doriți să ștergeți înregistrarea (${fmtNum(it.quantity)} L — ${it.description || it.type})?`)) return;
    setBusy(true);
    try {
      await combustibilFetch(it.kind === 'op' ? `/stoc/operatiuni/${it.id}` : `/stoc/tranzactii/${it.id}`, {
        method: 'DELETE',
      });
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergere.');
    } finally {
      setBusy(false);
    }
  };

  const parseSelectedItems = () =>
    Array.from(selectedKeys).map((k) => {
      const [kind, idStr] = k.split(':');
      return { kind: kind as 'op' | 'trans', id: Number(idStr) };
    });

  const handleBulkDelete = async () => {
    const items = parseSelectedItems();
    if (items.length === 0) return;
    if (!confirm(`Sigur doriți să ștergeți ${items.length} înregistrări selectate?`)) return;
    setBusy(true);
    try {
      await combustibilFetch('/stoc/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ gestiuneId: data.gestiuneId, items }),
      });
      setSelectedKeys(new Set());
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergerea în bloc.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkMove = async () => {
    const items = parseSelectedItems();
    if (items.length === 0 || !bulkMoveTarget) {
      alert('Selectați cel puțin un rând și firma destinație.');
      return;
    }
    setBusy(true);
    try {
      await combustibilFetch('/stoc/bulk-move', {
        method: 'POST',
        body: JSON.stringify({
          gestiuneId: data.gestiuneId,
          items,
          newCompanieId: Number(bulkMoveTarget),
        }),
      });
      setSelectedKeys(new Set());
      setBulkMoveTarget('');
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare la mutarea în bloc.');
    } finally {
      setBusy(false);
    }
  };

  const handleUndoRedo = async (action: 'undo' | 'redo') => {
    setBusy(true);
    try {
      const res = await combustibilFetch(`/stoc/${action}`, {
        method: 'POST',
        body: JSON.stringify({ gestiuneId: data.gestiuneId }),
      });
      if (!res.succes) alert(res.mesaj);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Eroare Undo/Redo.');
    } finally {
      setBusy(false);
    }
  };

  const tabStats = resolvedCompanyId === -1 ? data.unallocated : currentTab!;

  return (
    <div className="space-y-4">
      {/* Header Toolbar: Undo / Redo */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-sapphire-900">Gestionare Stoc per Companie</h3>
          <p className="text-xs text-sage-600 font-medium">
            Intrări cisternă, stoc inițial, ieșiri manuale, mutări între firme și detectare duplicate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!data.canUndo || busy}
            onClick={() => handleUndoRedo('undo')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-extrabold transition cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            disabled={!data.canRedo || busy}
            onClick={() => handleUndoRedo('redo')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-xs font-extrabold transition cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span>Redo</span>
          </button>
        </div>
      </div>

      {/* Duplicate Warning Banner */}
      {data.duplicateCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <div className="text-xs font-black text-rose-800 dark:text-rose-200">
                Atenție: s-au detectat {data.duplicateCount} posibile alimentări duplicate!
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-300">
                Tranzacții la aceeași dată și minut cu aceeași cantitate. Verificați și ștergeți dublurile dacă este cazul.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOnlyDuplicates((p) => !p)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              onlyDuplicates
                ? 'bg-slate-800 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{onlyDuplicates ? 'Arată toate rândurile' : 'Arată doar duplicatele'}</span>
          </button>
        </div>
      )}

      {/* Company Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-morning-200 pb-2">
        {data.companies.map((c) => {
          const active = resolvedCompanyId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelectCompany(c.id);
                setSelectedKeys(new Set());
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                active
                  ? 'text-white shadow-sm'
                  : 'bg-morning-50 hover:bg-morning-100 text-sapphire-900 border-morning-200'
              }`}
              style={active ? { backgroundColor: c.colorHex, borderColor: c.colorHex } : undefined}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{c.nume}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  active ? 'bg-white/25 text-white' : 'bg-morning-200 text-sapphire-900'
                }`}
              >
                {fmtNum(c.current, 0)} L
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            onSelectCompany(-1);
            setSelectedKeys(new Set());
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
            resolvedCompanyId === -1
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : data.unallocated.history.length > 0
              ? 'bg-rose-50 text-rose-700 border-rose-300 border-dashed hover:bg-rose-100'
              : 'bg-morning-50 text-sage-600 border-morning-200 hover:bg-morning-100'
          }`}
        >
          {data.unallocated.history.length > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>Alimentări nealocate</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              resolvedCompanyId === -1
                ? 'bg-white/25 text-white'
                : data.unallocated.history.length > 0
                ? 'bg-rose-600 text-white'
                : 'bg-morning-200 text-sage-700'
            }`}
          >
            {data.unallocated.history.length}
          </span>
        </button>
      </div>

      {/* Top 3-column Summary & Quick Add Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Current Stock */}
        <div
          className="lg:col-span-4 rounded-2xl p-5 border border-morning-200 flex flex-col items-center justify-center text-center"
          style={{
            backgroundColor: currentTab ? `${currentTab.colorHex}12` : 'rgba(220, 38, 38, 0.06)',
          }}
        >
          <div
            className="text-[11px] font-extrabold uppercase tracking-wider mb-1"
            style={{ color: currentTab ? currentTab.colorHex : '#dc2626' }}
          >
            {currentTab ? `Stoc Actual — ${currentTab.nume}` : 'Stoc Actual Nealocat'}
          </div>
          <div
            className="text-4xl font-black font-mono"
            style={{ color: currentTab ? currentTab.colorHex : '#dc2626' }}
          >
            {fmtNum(tabStats.current, 2)} <span className="text-lg">L</span>
          </div>
          <div className="text-[11px] text-sage-600 font-semibold mt-2">
            Ultima mișcare: {tabStats.lastUpdate ? fmtDateTimeRo(tabStats.lastUpdate) : '—'}
          </div>
        </div>

        {/* Card 2: Quick Add Form (only when a company is selected) */}
        {currentTab ? (
          <form
            onSubmit={handleQuickAdd}
            className="lg:col-span-5 bg-white rounded-2xl p-4 border border-morning-200 shadow-xs space-y-2.5"
          >
            <div className="flex items-center gap-1.5 text-xs font-black text-sapphire-900">
              <Plus className="w-4 h-4 text-sapphire-600" />
              <span>Adaugă Operațiune Rapidă ({currentTab.nume})</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-sage-600 mb-1">Operațiune</label>
                <select
                  value={opTip}
                  onChange={(e) => setOpTip(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl bg-morning-100 border border-morning-300 text-xs font-bold text-sapphire-900"
                >
                  <option value="IN">Intrare motorină (Cisternă)</option>
                  <option value="OUT">Ieșire manuală / Corecție</option>
                  <option value="INITIAL">Stoc Inițial</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-sage-600 mb-1">Cantitate (Litri)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={opQty}
                  onChange={(e) => setOpQty(e.target.value)}
                  placeholder="ex: 10000"
                  className="w-full px-2.5 py-2 rounded-xl bg-morning-100 border border-morning-300 text-xs font-mono font-bold text-sapphire-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-sage-600 mb-1">Data și Ora</label>
                <input
                  type="datetime-local"
                  required
                  value={opDate}
                  onChange={(e) => setOpDate(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-morning-100 border border-morning-300 text-xs font-mono text-sapphire-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-sage-600 mb-1">
                  {opTip === 'OUT' ? 'Nr. Înmatriculare / Utilaj' : 'Furnizor / Nr. Document'}
                </label>
                <input
                  type="text"
                  list="combustibil-veh-datalist"
                  value={opDesc}
                  onChange={(e) => setOpDesc(e.target.value)}
                  placeholder={opTip === 'OUT' ? 'ex: CV 05 SYI' : 'ex: SMART MANAGEMENT'}
                  className="w-full px-2.5 py-2 rounded-xl bg-morning-100 border border-morning-300 text-xs font-medium text-sapphire-900"
                />
                <datalist id="combustibil-veh-datalist">
                  {data.vehiclesList.map((v) => (
                    <option key={v.id} value={v.numarAuto} />
                  ))}
                </datalist>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-extrabold transition cursor-pointer disabled:opacity-60"
            >
              Înregistrează Operațiunea
            </button>
          </form>
        ) : (
          <div className="lg:col-span-5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl p-4 border border-rose-200 dark:border-rose-800 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
            <div className="text-xs text-rose-900 dark:text-rose-200">
              <div className="font-black mb-1">Tranzacții fără firmă atribuită</div>
              Folosește <strong>Selecție Multiplă → Mută selecția</strong> sau butonul de editare de pe fiecare rând pentru a atribui alimentările firmei corecte.
            </div>
          </div>
        )}

        {/* Card 3: Sumar Total */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-4 border border-morning-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-black text-sapphire-900 mb-2.5">Sumar Total</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-morning-100">
                <span className="text-sage-600 font-semibold">Inițial</span>
                <span className="font-mono font-bold text-sapphire-700">{fmtNum(tabStats.initial, 2)} L</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-morning-100">
                <span className="text-sage-600 font-semibold">Intrări</span>
                <span className="font-mono font-bold text-emerald-700">+{fmtNum(tabStats.in, 2)} L</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-sage-600 font-semibold">Consum</span>
                <span className="font-mono font-bold text-rose-700">-{fmtNum(tabStats.consumed, 2)} L</span>
              </div>
            </div>
          </div>
          {currentTab && (
            <button
              type="button"
              onClick={() => onJumpToReports(currentTab.id)}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-xs font-bold text-sapphire-900 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generează Bonuri PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* History Table Card */}
      <div className="bg-white rounded-2xl border border-morning-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-morning-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută dată, vehicul, categorie, furnizor..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-morning-50 border border-morning-300 text-xs font-medium text-sapphire-900"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-500 hover:text-sapphire-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-sage-600">
              {activeHistory.length} înregistrări
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectionMode((p) => !p);
                setSelectedKeys(new Set());
                setLastClickedIdx(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                selectionMode
                  ? 'bg-sapphire-600 text-white border-sapphire-600'
                  : 'bg-morning-50 hover:bg-morning-100 text-sapphire-900 border-morning-300'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Selecție Multiplă {selectionMode && selectedKeys.size > 0 ? `(${selectedKeys.size})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectionMode && (
          <div className="p-3 bg-morning-100 border-b border-morning-200 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-black text-sapphire-900">
              Selectate: {selectedKeys.size} <span className="font-normal text-sage-600">(Shift+Click pentru interval)</span>
            </span>
            <button
              type="button"
              disabled={selectedKeys.size === 0 || busy}
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-extrabold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Șterge Selectate</span>
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="font-bold text-sage-700">Mută la:</span>
              <div className="w-48">
                <FilterableSelect
                  value={bulkMoveTarget}
                  onChange={(e) => setBulkMoveTarget(e.target.value)}
                  searchPlaceholder="Alege firma..."
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-morning-300 text-xs font-bold text-sapphire-900"
                >
                  <option value="">-- Alege Firma --</option>
                  {data.companies
                    .filter((c) => c.id !== resolvedCompanyId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nume}
                      </option>
                    ))}
                </FilterableSelect>
              </div>
              <button
                type="button"
                disabled={selectedKeys.size === 0 || !bulkMoveTarget || busy}
                onClick={handleBulkMove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-extrabold cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Mută</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-morning-50 border-b border-morning-200 text-[10px] font-extrabold uppercase tracking-wider text-sage-700">
                {selectionMode && (
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={activeHistory.length > 0 && selectedKeys.size === activeHistory.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 accent-sapphire-600 cursor-pointer"
                    />
                  </th>
                )}
                <th className="p-3">Dată &amp; Oră</th>
                <th className="p-3 text-center">Tip</th>
                <th className="p-3 text-right">Cantitate</th>
                <th className="p-3">Detalii / Vehicul</th>
                <th className="p-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-morning-100">
              {activeHistory.length === 0 ? (
                <tr>
                  <td colSpan={selectionMode ? 6 : 5} className="p-8 text-center text-sage-600 italic">
                    Nu există operațiuni înregistrate conform filtrului.
                  </td>
                </tr>
              ) : (
                activeHistory.map((item, idx) => {
                  const key = itemKey(item);
                  const checked = selectedKeys.has(key);
                  return (
                    <tr
                      key={key}
                      className={`transition ${
                        item.duplicateInfo
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/70'
                          : checked
                          ? 'bg-sapphire-50/60'
                          : 'hover:bg-morning-50'
                      }`}
                    >
                      {selectionMode && (
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}}
                            onClick={(e) => handleToggleItem(idx, item, e.shiftKey)}
                            className="w-4 h-4 accent-sapphire-600 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="p-3 whitespace-nowrap font-mono">
                        <div className="font-bold text-sapphire-900">{fmtDateRo(item.date)}</div>
                        <div className="text-[10px] text-sage-600">{fmtTimeRo(item.date)}</div>
                      </td>
                      <td className="p-3 text-center">
                        {item.type === 'TRANSACTION' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            CONSUM
                          </span>
                        ) : item.type === 'IN' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            INTRARE
                          </span>
                        ) : item.type === 'INITIAL' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                            INIȚIAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            {item.type}
                          </span>
                        )}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-black whitespace-nowrap ${
                          item.type === 'IN'
                            ? 'text-emerald-700'
                            : item.type === 'INITIAL'
                            ? 'text-blue-700'
                            : 'text-sapphire-900'
                        }`}
                      >
                        {fmtNum(item.quantity, 2)} L
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.type === 'TRANSACTION' ? (
                            <Truck className="w-3.5 h-3.5 text-sage-500 shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-sage-500 shrink-0" />
                          )}
                          <span className={`font-bold ${item.isUnallocated ? 'text-rose-700' : 'text-sapphire-900'}`}>
                            {item.description || '—'}
                          </span>
                          {item.category && (
                            <span className="px-2 py-0.5 rounded-md bg-morning-100 border border-morning-200 text-[10px] font-bold text-sage-700">
                              {item.category}
                            </span>
                          )}
                          {item.isUnallocated && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-extrabold">
                              NEALOCAT
                            </span>
                          )}
                        </div>
                        {item.duplicateInfo && (
                          <div className="mt-1 text-[10px] font-bold text-rose-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>
                              Posibil duplicat cu {item.duplicateInfo.plate} ({item.duplicateInfo.company})
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            title="Editează / Mută la altă firmă"
                            className="p-1.5 rounded-lg bg-morning-100 hover:bg-sapphire-100 text-sapphire-700 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(item)}
                            title="Șterge"
                            className="p-1.5 rounded-lg bg-morning-100 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Move Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-morning-300 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-sapphire-600 text-white flex items-center justify-between">
              <h4 className="font-black text-sm">
                {editingItem.kind === 'op' ? 'Editează Operațiune Stoc' : `Editează Alimentare (${editingItem.description})`}
              </h4>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5 text-xs">
              {editingItem.kind === 'op' && (
                <div>
                  <label className="block font-bold text-sage-700 mb-1">Tip Operațiune</label>
                  <select
                    value={editTip}
                    onChange={(e) => setEditTip(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-bold text-sapphire-900"
                  >
                    <option value="IN">INTRARE</option>
                    <option value="OUT">IEȘIRE</option>
                    <option value="INITIAL">STOC INIȚIAL</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-sage-700 mb-1">Firmă Asociată (Mutare)</label>
                <FilterableSelect
                  value={editCompId}
                  onChange={(e) => setEditCompId(e.target.value)}
                  searchPlaceholder="Caută firmă..."
                  className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-bold text-sapphire-900"
                >
                  <option value="">-- Nealocat --</option>
                  {data.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nume}
                    </option>
                  ))}
                </FilterableSelect>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-sage-700 mb-1">Cantitate (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-mono font-bold text-sapphire-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-sage-700 mb-1">Data și Ora</label>
                  <input
                    type="datetime-local"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-mono text-sapphire-900"
                  />
                </div>
              </div>

              {editingItem.kind === 'op' && (
                <div>
                  <label className="block font-bold text-sage-700 mb-1">Descriere / Document</label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-morning-100 border border-morning-300 font-medium text-sapphire-900"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 font-bold text-slate-700 cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-extrabold cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvează</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
