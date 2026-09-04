"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import {
  Clock, X, Plus, Edit3, Trash2, Search, Filter, Check, AlertCircle,
  Activity, ShieldCheck, Cpu, User, FileText, CheckCircle2
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';

interface VehicleOdometerModalProps {
  vehiculId: string;
  vehiculInfo?: {
    numarIntern: string;
    numarInmatriculare?: string;
    tipMasurare?: string;
    valoareContorCurent?: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: () => void;
}

export default function VehicleOdometerModal({
  vehiculId,
  vehiculInfo,
  isOpen,
  onClose,
  onUpdateSuccess,
}: VehicleOdometerModalProps) {
  const [istoric, setIstoric] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sursaFilter, setSursaFilter] = useState('');

  // Stare formular adăugare manuală nouă
  const [showAddForm, setShowAddForm] = useState(false);
  const [newValoare, setNewValoare] = useState<number | ''>('');
  const [newData, setNewData] = useState(new Date().toISOString().split('T')[0]);
  const [newOperator, setNewOperator] = useState('Operator Atelier');
  const [newObservatii, setNewObservatii] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stare editare linie existentă (pentru corectare eroare de introducere)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editValoare, setEditValoare] = useState<number>(0);
  const [editData, setEditData] = useState<string>('');
  const [editOperator, setEditOperator] = useState<string>('');
  const [editObservatii, setEditObservatii] = useState<string>('');

  const fetchIstoric = async () => {
    if (!vehiculId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/istoric-contoare?vehiculId=${vehiculId}`);
      if (res.ok) {
        setIstoric(await res.json());
      }
    } catch (e) {
      console.error('Eroare la preluarea istoricului de contor', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && vehiculId) {
      fetchIstoric();
      if (vehiculInfo?.valoareContorCurent !== undefined) {
        setNewValoare(vehiculInfo.valoareContorCurent + 100);
      }
    }
  }, [isOpen, vehiculId]);

  if (!isOpen) return null;

  const tipM = vehiculInfo?.tipMasurare || 'KM';

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newValoare === '') return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/inregistrare-contor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId,
          valoareContor: Number(newValoare),
          dataInregistrare: newData,
          operator: newOperator,
          observatii: newObservatii || 'Înregistrare manuală din registru',
        }),
      });

      if (res.ok) {
        alert('Înregistrare contor adăugată cu succes!');
        setShowAddForm(false);
        setNewObservatii('');
        fetchIstoric();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la salvarea contorului.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (entry: any) => {
    setEditingEntryId(entry.id);
    setEditValoare(entry.valoareContor);
    setEditData(entry.dataInregistrare ? new Date(entry.dataInregistrare).toISOString().split('T')[0] : '');
    setEditOperator(entry.operator || '');
    setEditObservatii(entry.observatii || '');
  };

  const handleSaveEdit = async (entryId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/istoric-contoare/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valoareContor: Number(editValoare),
          dataInregistrare: editData,
          operator: editOperator,
          observatii: editObservatii,
        }),
      });

      if (res.ok) {
        setEditingEntryId(null);
        fetchIstoric();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        alert('Eroare la actualizarea înregistrării.');
      }
    } catch (e) {
      alert('Eroare la procesarea editării.');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    const confirmed = await showConfirm(
      'Ștergere Înregistrare Contor',
      'Sigur doriți să ștergeți această înregistrare de contor?',
      'Da, șterge înregistrarea',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/istoric-contoare/${entryId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchIstoric();
        if (onUpdateSuccess) onUpdateSuccess();
      }
    } catch (e) {
      alert('Eroare la ștergerea înregistrării.');
    }
  };

  const getSourceBadge = (sursa: string) => {
    const sUpper = (sursa || '').toUpperCase();
    if (sUpper.includes('GPS') || sUpper.includes('TELEMATICA')) {
      return { label: ' Automatizat (GPS)', type: 'AUTO', class: 'bg-purple-100 text-purple-800 border-purple-300 whitespace-nowrap' };
    }
    if (sUpper.includes('CUPLARE') || sUpper.includes('TRACTOR')) {
      return { label: ' Automatizat (Ansamblu)', type: 'AUTO', class: 'bg-indigo-100 text-indigo-800 border-indigo-300 whitespace-nowrap' };
    }
    if (sUpper.includes('SERVICE') || sUpper.includes('COMANDĂ') || sUpper.includes('REPARAȚIE')) {
      return { label: ' Service / Comandă Lucru', type: 'MANUAL', class: 'bg-amber-100 text-amber-800 border-amber-300 whitespace-nowrap' };
    }
    if (sUpper.includes('SCHIMB') || sUpper.includes('COMPLETARE') || sUpper.includes('ULEI')) {
      return { label: ' Operat Ulei / Fluide', type: 'MANUAL', class: 'bg-cyan-100 text-cyan-800 border-cyan-300 whitespace-nowrap' };
    }
    if (sUpper.includes('ANVELOPE')) {
      return { label: ' Anvelope', type: 'MANUAL', class: 'bg-emerald-100 text-emerald-800 border-emerald-300 whitespace-nowrap' };
    }
    if (sUpper.includes('CORECȚIE')) {
      return { label: ' Manual Corecție', type: 'MANUAL', class: 'bg-roseash-200 text-terracotta-800 border-roseash-300 whitespace-nowrap' };
    }
    return { label: ' Manual', type: 'MANUAL', class: 'bg-sapphire-100 text-sapphire-800 border-sapphire-300 whitespace-nowrap' };
  };

  const istoricFiltrat = istoric.filter((item) => {
    const matchSursa = sursaFilter ? item.sursa?.toUpperCase().includes(sursaFilter.toUpperCase()) : true;
    if (!searchQuery) return matchSursa;

    const q = searchQuery.toLowerCase();
    const matchObs = item.observatii?.toLowerCase().includes(q);
    const matchOp = item.operator?.toLowerCase().includes(q);
    const matchVal = item.valoareContor?.toString().includes(q);

    return matchSursa && (matchObs || matchOp || matchVal);
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="pleasant-card rounded-2xl max-w-4xl w-full bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-morning-200">
        {/* HEADER MODAL */}
        <div className="p-5 bg-sapphire-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sapphire-800 text-sapphire-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center space-x-2">
                <span>Registru Istoric Contoare ({tipM}) — {vehiculInfo?.numarIntern || 'Vehicul'}</span>
              </h2>
              <p className="text-xs text-sapphire-300 font-medium">
                {vehiculInfo?.numarInmatriculare ? `Înmatriculare: ${vehiculInfo.numarInmatriculare} | ` : ''}
                Contor curent: <span className="font-mono font-bold text-white">{vehiculInfo?.valoareContorCurent || 0} {tipM}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-sapphire-800 hover:bg-sapphire-700 text-sapphire-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUB-HEADER ACȚIUNI & FILTRE */}
        <div className="p-4 bg-morning-100 border-b border-morning-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-sage-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Căutare observații, valoare, operator..."
                className="w-full bg-white border border-morning-200 rounded-xl pl-9 pr-3 py-1.5 font-bold text-sapphire-900 focus:outline-none"
              />
            </div>

            <select
              value={sursaFilter}
              onChange={(e) => setSursaFilter(e.target.value)}
              className="bg-white border border-morning-200 rounded-xl p-1.5 font-bold text-sapphire-900 focus:outline-none cursor-pointer"
            >
              <option value="">Toate Sursele</option>
              <option value="MANUAL"> Doar Manual</option>
              <option value="GPS">Doar GPS (Automat)</option>
              <option value="SERVICE"> Service / Comenzi</option>
              <option value="ULEI"> Schimb Ulei / Fluide</option>
              <option value="ANVELOPE">Anvelope</option>
              <option value="CUPLARE">Cuplare Ansamblu</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20 transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Înregistrează KM / mTH Nou</span>
          </button>
        </div>

        {/* FORMULAR ADĂUGARE MANUALĂ NOUĂ */}
        {showAddForm && (
          <form onSubmit={handleAddManual} className="p-4 bg-sapphire-50 border-b border-sapphire-200 space-y-3 text-xs">
            <h3 className="font-extrabold text-sapphire-900 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-sapphire-500" />
              <span>Înregistrare Contor Nouă (Manual)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Valoare Contor ({tipM}): *</label>
                <input
                  type="number"
                  required
                  value={newValoare}
                  onChange={(e) => setNewValoare(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white border border-sapphire-200 rounded-xl p-2 font-mono font-bold text-sapphire-900 text-sm"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Data Înregistrării:</label>
                <input
                  type="date"
                  value={newData}
                  onChange={(e) => setNewData(e.target.value)}
                  className="w-full bg-white border border-sapphire-200 rounded-xl p-2 font-bold text-sapphire-900"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Operator / Șofer:</label>
                <input
                  type="text"
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  className="w-full bg-white border border-sapphire-200 rounded-xl p-2 font-bold text-sapphire-900"
                />
              </div>
            </div>

            <div>
              <label className="text-sage-700 block mb-1 font-bold">Observații / Motiv Înregistrare:</label>
              <input
                type="text"
                value={newObservatii}
                onChange={(e) => setNewObservatii(e.target.value)}
                placeholder="ex: Verificare la plecare în cursă / Citire bord"
                className="w-full bg-white border border-sapphire-200 rounded-xl p-2 font-medium text-sapphire-900"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-lg bg-morning-200 text-slate-700 font-bold"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-sapphire-500 text-white font-bold shadow-xs"
              >
                Salvează Înregistrarea
              </button>
            </div>
          </form>
        )}

        {/* TABEL ISTORIC CONTOARE */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="p-8 text-center text-sage-500 font-bold">Se încarcă istoricul de contor...</div>
          ) : istoricFiltrat.length === 0 ? (
            <div className="p-8 text-center text-sage-500 font-bold bg-morning-50 rounded-xl">
              Nu s-au găsit înregistrări de contor pentru acest vehicul.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3 font-mono">Dată & Oră</th>
                  <th className="p-3 font-mono">Valoare Contor</th>
                  <th className="p-3">Sursă Înregistrare</th>
                  <th className="p-3">Tip Introducere</th>
                  <th className="p-3">Operator / Notițe</th>
                  <th className="p-3 text-right">Acțiuni Editare</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {istoricFiltrat.map((entry) => {
                  const badge = getSourceBadge(entry.sursa);
                  const isEditing = editingEntryId === entry.id;

                  if (isEditing) {
                    return (
                      <tr key={entry.id} className="bg-amber-50">
                        <td className="p-2">
                          <input
                            type="date"
                            value={editData}
                            onChange={(e) => setEditData(e.target.value)}
                            className="bg-white border border-amber-300 rounded p-1 font-bold text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={editValoare}
                            onChange={(e) => setEditValoare(Number(e.target.value))}
                            className="bg-white border border-amber-300 rounded p-1 font-mono font-bold text-xs w-24"
                          />
                        </td>
                        <td className="p-2 font-bold text-amber-800">{entry.sursa}</td>
                        <td className="p-2">—</td>
                        <td className="p-2 space-y-1">
                          <input
                            type="text"
                            value={editOperator}
                            onChange={(e) => setEditOperator(e.target.value)}
                            placeholder="Operator"
                            className="w-full bg-white border border-amber-300 rounded p-1 text-xs"
                          />
                          <input
                            type="text"
                            value={editObservatii}
                            onChange={(e) => setEditObservatii(e.target.value)}
                            placeholder="Observații / Corecție eroare de introducere"
                            className="w-full bg-white border border-amber-300 rounded p-1 text-xs"
                          />
                        </td>
                        <td className="p-2 text-right space-x-1">
                          <button
                            onClick={() => handleSaveEdit(entry.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                          >
                            Salvează
                          </button>
                          <button
                            onClick={() => setEditingEntryId(null)}
                            className="px-2 py-1 bg-morning-200 text-slate-700 rounded text-[11px] font-bold"
                          >
                            Anulează
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={entry.id} className="hover:bg-morning-50 transition">
                      <td className="p-3 font-mono text-sage-700 font-semibold">
                        {new Date(entry.dataInregistrare).toLocaleDateString('ro-RO')} {' '}
                        {new Date(entry.dataInregistrare).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-mono font-black text-sapphire-900 text-sm">
                        {entry.valoareContor} {tipM}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap inline-block ${badge.class}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold whitespace-nowrap ${badge.type === 'AUTO' ? 'text-purple-700' : 'text-slate-600'}`}>
                          {badge.type === 'AUTO' ? 'Automatizat' : 'Manual'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-sapphire-900 block">{entry.operator || 'Atelier'}</span>
                        <span className="text-[10px] text-sage-600 block">{entry.observatii || '—'}</span>
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => handleStartEdit(entry)}
                          title="Editează valoarea (corecție eroare de introducere)"
                          className="p-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 text-sapphire-700 transition inline-flex items-center"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          title="Șterge înregistrarea"
                          className="p-1.5 rounded-lg bg-roseash-100 hover:bg-roseash-200 text-terracotta-700 transition inline-flex items-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="p-4 bg-morning-100 border-t border-morning-200 flex justify-between items-center text-xs">
          <span className="text-sage-600 font-medium">Total înregistrări istoric contor: {istoric.length}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sapphire-900 hover:bg-sapphire-800 text-white font-bold transition shadow-sm"
          >
            Închide Registrul
          </button>
        </div>
      </div>
    </div>
  );
}
