"use client";

import React, { useState } from 'react';
import {
  UploadCloud, Download, CheckCircle2, AlertTriangle, Gauge, Trash2,
  ArrowRightLeft, Loader2, FileSpreadsheet,
} from 'lucide-react';
import { CombustibilGestiune, combustibilFetch, fmtNum } from './types';

interface Props {
  gestiune: CombustibilGestiune | null;
  onImportDone: () => void;
}

export default function CombustibilImportTab({ gestiune, onImportDone }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [syncFleetKm, setSyncFleetKm] = useState<boolean>(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedDupIds, setSelectedDupIds] = useState<Set<number>>(new Set());
  const [busyDup, setBusyDup] = useState(false);

  if (!gestiune) return null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    try {
      // Decode Latin-1 / ISO-8859-1 cleanly (exact match with Seler pump exports)
      const buf = await selectedFile.arrayBuffer();
      let text = '';
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
      } catch {
        text = new TextDecoder('iso-8859-1').decode(buf);
      }

      const res = await combustibilFetch('/import-csv', {
        method: 'POST',
        body: JSON.stringify({
          gestiuneId: gestiune.id,
          csvText: text,
          syncFleetKm,
        }),
      });
      setResult(res);
      setSelectedDupIds(new Set());
      onImportDone();
    } catch (err: any) {
      alert(err?.message || 'Eroare la procesarea CSV.');
    } finally {
      setUploading(false);
    }
  };

  const handleAcceptDup = async (dup: any) => {
    if (!dup.companyId) {
      alert('Nu există firmă determinată automat pentru acest duplicat.');
      return;
    }
    setBusyDup(true);
    try {
      await combustibilFetch(`/stoc/tranzactii/${dup.existingId}`, {
        method: 'PUT',
        body: JSON.stringify({ companieId: dup.companyId }),
      });
      setResult((prev: any) =>
        prev ? { ...prev, duplicates: prev.duplicates.filter((d: any) => d.existingId !== dup.existingId) } : prev,
      );
      onImportDone();
    } catch (err: any) {
      alert(err?.message || 'Eroare la acceptare.');
    } finally {
      setBusyDup(false);
    }
  };

  const handleDeleteDup = async (existingId: number) => {
    if (!confirm('Sigur doriți să ștergeți tranzacția existentă din baza de date?')) return;
    setBusyDup(true);
    try {
      await combustibilFetch(`/stoc/tranzactii/${existingId}`, { method: 'DELETE' });
      setResult((prev: any) =>
        prev ? { ...prev, duplicates: prev.duplicates.filter((d: any) => d.existingId !== existingId) } : prev,
      );
      onImportDone();
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergere.');
    } finally {
      setBusyDup(false);
    }
  };

  const handleBulkDeleteDups = async () => {
    const ids = Array.from(selectedDupIds);
    if (ids.length === 0) return;
    if (!confirm(`Ștergeți ${ids.length} înregistrări existente selectate?`)) return;
    setBusyDup(true);
    try {
      await combustibilFetch('/stoc/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({
          gestiuneId: gestiune.id,
          items: ids.map((id) => ({ kind: 'trans', id })),
        }),
      });
      setResult((prev: any) =>
        prev ? { ...prev, duplicates: prev.duplicates.filter((d: any) => !selectedDupIds.has(d.existingId)) } : prev,
      );
      setSelectedDupIds(new Set());
      onImportDone();
    } catch (err: any) {
      alert(err?.message || 'Eroare la ștergere.');
    } finally {
      setBusyDup(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await combustibilFetch(`/backup/export?gestiuneId=${gestiune.id}`);
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FuelManager_${gestiune.nume}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err: any) {
      alert(err?.message || 'Eroare la export backup.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: CSV Import (Seler) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-morning-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-sapphire-600 text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <h4 className="font-black text-sm">Importare CSV Pompă (Seler) — {gestiune.nume}</h4>
          </div>
          <form onSubmit={handleUpload} className="p-5 space-y-4 text-xs">
            <p className="text-sage-700 font-medium">
              Încărcați fișierul CSV exportat din sistemul <strong>SelfService / Seler</strong>. Sistemul detectează automat separatorul, corectează formatarea cantităților ≥ 1.000 L, atribuie compania vehiculului și filtrează duplicatele.
            </p>

            <label className="block p-6 rounded-2xl border-2 border-dashed border-sapphire-300 bg-sapphire-50/50 hover:bg-sapphire-50 transition text-center cursor-pointer">
              <UploadCloud className="w-8 h-8 mx-auto text-sapphire-600 mb-2" />
              <div className="font-black text-sapphire-900">
                {selectedFile ? selectedFile.name : 'Selectați fișierul CSV Seler (.csv)'}
              </div>
              <div className="text-[11px] text-sage-600 mt-1">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Click pentru a alege fișierul'}
              </div>
              <input
                type="file"
                accept=".csv,text/csv"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            {/* FleetCMD KM Sync Toggle */}
            <label className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={syncFleetKm}
                onChange={(e) => setSyncFleetKm(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-emerald-600"
              />
              <div>
                <div className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Actualizează automat și kilometrajul (KM) vehiculelor din FleetCMD</span>
                </div>
                <div className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                  Extrage odometrul din același CSV Seler, aplică protecția rollover 1.000.000 KM și actualizează contorul vehiculelor KM + semiremorcile cuplate.
                </div>
              </div>
            </label>

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="w-full py-2.5 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 disabled:opacity-50 text-white font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              <span>{uploading ? 'Se procesează fișierul...' : 'Upload & Procesare CSV'}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Backup Profil */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-morning-200 shadow-xs overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 bg-amber-500 text-white flex items-center gap-2">
            <Download className="w-4 h-4" />
            <h4 className="font-black text-sm">Backup Date Gestiune ({gestiune.nume})</h4>
          </div>
          <div className="p-5 flex-1 flex flex-col justify-between space-y-4 text-xs">
            <div className="space-y-2 text-sage-700">
              <p>
                Toate datele de combustibil sunt stocate centralizat în baza de date <strong>PostgreSQL Cloud</strong> a FleetCMD și intră automat în backup-ul zilnic al sistemului.
              </p>
              <p>
                Puteți descărca oricând o copie completă în format JSON pentru gestiunea activă (companii, vehicule, categorii, intrări stoc, alimentări și setări analiză).
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descarcă Backup JSON ({gestiune.nume})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import Result Summary */}
      {result && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-black text-emerald-900 dark:text-emerald-200">{result.mesaj}</div>
                {result.newVehicles?.length > 0 && (
                  <div className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Vehicule noi detectate ({result.newVehicles.length}): {result.newVehicles.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KM Sync Report */}
          {result.kmSyncSummary?.enabled && result.kmSyncSummary.updatedVehicles?.length > 0 && (
            <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden">
              <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200 text-xs font-black text-emerald-900 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <span>Contoare KM actualizate în FleetCMD ({result.kmSyncSummary.updatedCount})</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-morning-50 border-b border-morning-200 text-[10px] font-extrabold uppercase text-sage-700">
                      <th className="p-2.5">Vehicul FleetCMD</th>
                      <th className="p-2.5 text-right">KM Anterior</th>
                      <th className="p-2.5 text-right">KM Nou</th>
                      <th className="p-2.5 text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-100">
                    {result.kmSyncSummary.updatedVehicles.map((v: any) => (
                      <tr key={v.numarIntern}>
                        <td className="p-2.5 font-mono font-black text-sapphire-900">{v.numarIntern}</td>
                        <td className="p-2.5 text-right font-mono text-sage-600">{fmtNum(v.oldKm, 0)} km</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          {fmtNum(v.newKm, 0)} km {v.rollover && <span className="text-[10px] text-amber-600">(1M)</span>}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-sapphire-700">+{fmtNum(v.delta, 0)} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Duplicates Review Table */}
          {result.duplicates?.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-300 overflow-hidden">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Intrări Duplicate Omise ({result.duplicates.length})</span>
                </div>
                <button
                  type="button"
                  disabled={selectedDupIds.size === 0 || busyDup}
                  onClick={handleBulkDeleteDups}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-extrabold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Șterge Selectate ({selectedDupIds.size})</span>
                </button>
              </div>
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-morning-50 border-b border-morning-200 text-[10px] font-extrabold uppercase text-sage-700">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedDupIds.size === result.duplicates.length && result.duplicates.length > 0}
                          onChange={(e) =>
                            setSelectedDupIds(
                              e.target.checked ? new Set(result.duplicates.map((d: any) => d.existingId)) : new Set(),
                            )
                          }
                          className="w-4 h-4 accent-sapphire-600"
                        />
                      </th>
                      <th className="p-2.5">Rând</th>
                      <th className="p-2.5">Dată / Oră</th>
                      <th className="p-2.5">Vehicul</th>
                      <th className="p-2.5 text-right">Cantitate</th>
                      <th className="p-2.5">Firmă Detectată</th>
                      <th className="p-2.5 text-right">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-100">
                    {result.duplicates.map((d: any) => (
                      <tr key={`${d.rowNumber}-${d.existingId}`} className="hover:bg-morning-50">
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={selectedDupIds.has(d.existingId)}
                            onChange={(e) => {
                              setSelectedDupIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(d.existingId);
                                else next.delete(d.existingId);
                                return next;
                              });
                            }}
                            className="w-4 h-4 accent-sapphire-600"
                          />
                        </td>
                        <td className="p-2.5 font-mono text-sage-600">#{d.rowNumber}</td>
                        <td className="p-2.5 font-mono">
                          {d.date} {d.time}
                        </td>
                        <td className="p-2.5 font-mono font-black text-sapphire-900">{d.plate}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{fmtNum(d.quantity, 2)} L</td>
                        <td className="p-2.5 font-bold text-sapphire-800">{d.company}</td>
                        <td className="p-2.5 text-right whitespace-nowrap space-x-1">
                          {d.companyId && (
                            <button
                              type="button"
                              disabled={busyDup}
                              onClick={() => handleAcceptDup(d)}
                              title="Mută intrarea existentă la firma detectată"
                              className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyDup}
                            onClick={() => handleDeleteDup(d.existingId)}
                            title="Șterge intrarea existentă"
                            className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
