"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import {
  Timer, Clock, Calendar, AlertTriangle, CheckCircle2, XCircle, ArrowRight,
  RefreshCw, Search, Filter, Plus, Trash2, Edit3, ShieldAlert, FileText,
  Truck, Layers, ChevronRight, HelpCircle, Save, X, Info, Gauge, Activity
} from 'lucide-react';

interface UtilajItem {
  id: string;
  numarIntern: string;
  numarInmatriculare: string;
  marca: string;
  model: string;
  anFabricatie?: number;
  categorieEnum: string;
  tipMasurare: string;
  valoareContorCurent: number;
  valoareContorInitial: number;
  dataInregistrareContor?: string;
  stare: string;
  numarPerioade: number;
  ultimaPerioada?: {
    id: string;
    dataStart: string;
    dataEnd: string;
    oreFunctionare: number;
    indexContorEnd: number;
    stareContinuitate: string;
  } | null;
}

interface PerioadaItem {
  id: string;
  vehiculId: string;
  dataStart: string;
  dataEnd: string;
  oreFunctionare: number;
  indexContorStart: number;
  indexContorEnd: number;
  areGol: boolean;
  zileGol: number;
  dataGolInceput?: string | null;
  dataGolSfarsit?: string | null;
  stareContinuitate: string;
  explicatieGol?: string | null;
  sursa: string;
  operator?: string | null;
  observatii?: string | null;
  createdAt: string;
}

interface ValidareContinuitate {
  valid: boolean;
  status: 'CONTINUU' | 'GOL_DETECTAT' | 'SUPRAPUNERE' | 'PRIMA_INREGISTRARE' | 'EROARE';
  nrZile?: number;
  medieOrePeZi?: number;
  zileGol?: number;
  dataGolInceput?: string;
  dataGolSfarsit?: string;
  sugestieDataStart?: string;
  mesaj?: string;
  indexContorStartEstimat?: number;
  indexContorEndEstimat?: number;
  perioadaSuprapusa?: any;
}

export default function OreFunctionarePage() {
  const { user } = useAuth();

  // Stări pentru date
  const [utilaje, setUtilaje] = useState<UtilajItem[]>([]);
  const [loadingUtilaje, setLoadingUtilaje] = useState(true);
  const [selectedVehiculId, setSelectedVehiculId] = useState<string>('');
  const [filtreazaDoarMth, setFiltreazaDoarMth] = useState(true);
  const [cautareUtilaj, setCautareUtilaj] = useState('');

  // Perioade pentru utilajul selectat
  const [perioade, setPerioade] = useState<PerioadaItem[]>([]);
  const [statisticiVehicul, setStatisticiVehicul] = useState<any>(null);
  const [loadingPerioade, setLoadingPerioade] = useState(false);

  // Formular perioadă nouă
  const [dataStart, setDataStart] = useState('');
  const [dataEnd, setDataEnd] = useState('');
  const [oreFunctionare, setOreFunctionare] = useState<string>('');
  const [observatii, setObservatii] = useState('');
  const [indexContorStartPersonalizat, setIndexContorStartPersonalizat] = useState<string>('');
  const [confirmaInactivDacaGol, setConfirmaInactivDacaGol] = useState(false);
  const [salvareInProgress, setSalvareInProgress] = useState(false);

  // Feedback și validare în timp real
  const [validare, setValidare] = useState<ValidareContinuitate | null>(null);
  const [validareLoading, setValidareLoading] = useState(false);
  const [notificare, setNotificare] = useState<{ tip: 'success' | 'error' | 'info'; mesaj: string } | null>(null);

  // Modale ștergere și editare
  const [perioadaDeSters, setPerioadaDeSters] = useState<PerioadaItem | null>(null);
  const [perioadaDeEditat, setPerioadaDeEditat] = useState<PerioadaItem | null>(null);
  const [editOre, setEditOre] = useState<string>('');
  const [editObservatii, setEditObservatii] = useState('');
  const [editInProgress, setEditInProgress] = useState(false);

  // Modal setare bază inițială contor (mTH la punere în funcțiune)
  const [modalBazaOpen, setModalBazaOpen] = useState(false);
  const [valoareBazaInput, setValoareBazaInput] = useState<string>('');
  const [dataBazaInput, setDataBazaInput] = useState<string>('');
  const [salvareBazaInProgress, setSalvareBazaInProgress] = useState(false);

  // Headers autorizare
  const getHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(user?.id ? { 'x-user-id': user.id } : {}),
    };
  }, [user]);

  // Încărcare utilaje
  const loadUtilaje = useCallback(async (selectIdAfterLoad?: string) => {
    try {
      setLoadingUtilaje(true);
      const res = await fetch(`${API_BASE_URL}/vehicule/ore-functionare/utilaje?all=${!filtreazaDoarMth}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUtilaje(data);
        if (selectIdAfterLoad) {
          setSelectedVehiculId(selectIdAfterLoad);
        } else if (!selectedVehiculId && data.length > 0) {
          setSelectedVehiculId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Eroare la încărcarea utilajelor:', err);
    } finally {
      setLoadingUtilaje(false);
    }
  }, [filtreazaDoarMth, getHeaders, selectedVehiculId]);

  useEffect(() => {
    loadUtilaje();
  }, [filtreazaDoarMth]);

  // Încărcare perioade când se schimbă utilajul selectat
  const loadPerioade = useCallback(async (vehId: string) => {
    if (!vehId) return;
    try {
      setLoadingPerioade(true);
      const res = await fetch(`${API_BASE_URL}/vehicule/ore-functionare/perioade?vehiculId=${vehId}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPerioade(data.perioade || []);
        setStatisticiVehicul(data.statistici || null);

        // Pre-completare inteligentă a datei de start cu ziua următoare ultimei perioade
        if (data.perioade && data.perioade.length > 0) {
          const ultima = data.perioade[0]; // sortate desc
          const lastEndDate = new Date(ultima.dataEnd);
          const nextDay = new Date(lastEndDate);
          nextDay.setDate(nextDay.getDate() + 1);
          setDataStart(nextDay.toISOString().split('T')[0]);
        } else {
          // Prima înregistrare - data de început de lună curentă
          const today = new Date();
          const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          setDataStart(firstOfMonth.toISOString().split('T')[0]);
        }
        setDataEnd('');
        setOreFunctionare('');
        setObservatii('');
        setConfirmaInactivDacaGol(false);
        setValidare(null);
      }
    } catch (err) {
      console.error('Eroare la încărcarea perioadelor:', err);
    } finally {
      setLoadingPerioade(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (selectedVehiculId) {
      loadPerioade(selectedVehiculId);
    }
  }, [selectedVehiculId, loadPerioade]);

  // Utilajul selectat activ
  const selectedVehicul = useMemo(() => {
    return utilaje.find((u) => u.id === selectedVehiculId) || null;
  }, [utilaje, selectedVehiculId]);

  // Lista utilaje filtrate după căutare
  const utilajeFiltrate = useMemo(() => {
    if (!cautareUtilaj.trim()) return utilaje;
    const q = cautareUtilaj.toLowerCase();
    return utilaje.filter(
      (u) =>
        u.numarIntern.toLowerCase().includes(q) ||
        u.numarInmatriculare.toLowerCase().includes(q) ||
        u.marca.toLowerCase().includes(q) ||
        u.model.toLowerCase().includes(q) ||
        u.categorieEnum.toLowerCase().includes(q)
    );
  }, [utilaje, cautareUtilaj]);

  // Verificare continuitate în timp real (Debounced)
  useEffect(() => {
    if (!selectedVehiculId || !dataStart || !dataEnd) {
      setValidare(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setValidareLoading(true);
        const res = await fetch(`${API_BASE_URL}/vehicule/ore-functionare/verifica-continuitate`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            vehiculId: selectedVehiculId,
            dataStart,
            dataEnd,
            oreFunctionare: Number(oreFunctionare || 0),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setValidare(data);
          // Dacă este continuu sau prima înregistrare, resetăm confirmarea de gol
          if (data.status !== 'GOL_DETECTAT') {
            setConfirmaInactivDacaGol(false);
          }
        }
      } catch (err) {
        console.error('Eroare la verificarea continuității:', err);
      } finally {
        setValidareLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedVehiculId, dataStart, dataEnd, oreFunctionare, getHeaders]);

  // Salvare perioadă nouă
  const handleSalveazaPerioada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    if (!dataStart || !dataEnd) {
      setNotificare({ tip: 'error', mesaj: 'Vă rugăm să selectați atât data de început cât și data de sfârșit!' });
      return;
    }

    const oreNum = parseFloat(oreFunctionare);
    if (isNaN(oreNum) || oreNum < 0) {
      setNotificare({ tip: 'error', mesaj: 'Vă rugăm să introduceți un număr valid de ore de funcționare!' });
      return;
    }

    if (validare?.status === 'GOL_DETECTAT' && !confirmaInactivDacaGol) {
      setNotificare({
        tip: 'error',
        mesaj: `Interval lipsă detectat (${validare.zileGol} zile). Vă rugăm să confirmați că utilajul a fost inactiv sau ajustați data de început!`,
      });
      return;
    }

    try {
      setSalvareInProgress(true);
      setNotificare(null);

      const payload: any = {
        vehiculId: selectedVehiculId,
        dataStart,
        dataEnd,
        oreFunctionare: oreNum,
        confirmaInactivDacaGol,
        observatii: observatii.trim() || undefined,
        operator: user?.nume || user?.email || 'Operator',
      };

      if (indexContorStartPersonalizat && Number(indexContorStartPersonalizat) >= 0) {
        payload.indexContorStartPersonalizat = Number(indexContorStartPersonalizat);
      }

      const res = await fetch(`${API_BASE_URL}/vehicule/ore-functionare/inregistrare`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setNotificare({ tip: 'error', mesaj: json.message || 'Eroare la înregistrarea perioadei!' });
        return;
      }

      setNotificare({
        tip: 'success',
        mesaj: `Perioada a fost salvată cu succes! Contor curent actualizat la ${json.vehicul?.valoareContorCurent || json.perioada?.indexContorEnd} mTH.`,
      });

      // Reîncărcare perioade și utilaje
      await loadPerioade(selectedVehiculId);
      await loadUtilaje(selectedVehiculId);
    } catch (err: any) {
      setNotificare({ tip: 'error', mesaj: err.message || 'Eroare la conexiunea cu serverul!' });
    } finally {
      setSalvareInProgress(false);
    }
  };

  // Ștergere perioadă
  const handleConfirmaStergere = async () => {
    if (!perioadaDeSters) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/ore-functionare/perioada/${perioadaDeSters.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setNotificare({ tip: 'info', mesaj: 'Perioada a fost ștearsă, iar contorul a fost recalculat!' });
        setPerioadaDeSters(null);
        await loadPerioade(selectedVehiculId);
        await loadUtilaje(selectedVehiculId);
      } else {
        const json = await res.json();
        setNotificare({ tip: 'error', mesaj: json.message || 'Eroare la ștergerea perioadei!' });
      }
    } catch (err: any) {
      setNotificare({ tip: 'error', mesaj: err.message || 'Eroare la ștergerea perioadei!' });
    }
  };

  // Salvare editare
  const handleSalveazaEditare = async () => {
    if (!perioadaDeEditat) return;
    try {
      setEditInProgress(true);
      const res = await fetch(`${API_BASE_URL}/vehicule/ore-functionare/perioada/${perioadaDeEditat.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          oreFunctionare: parseFloat(editOre),
          observatii: editObservatii,
        }),
      });
      if (res.ok) {
        setNotificare({ tip: 'success', mesaj: 'Perioada a fost actualizată și contorul a fost recalculat!' });
        setPerioadaDeEditat(null);
        await loadPerioade(selectedVehiculId);
        await loadUtilaje(selectedVehiculId);
      } else {
        const json = await res.json();
        setNotificare({ tip: 'error', mesaj: json.message || 'Eroare la modificarea perioadei!' });
      }
    } catch (err: any) {
      setNotificare({ tip: 'error', mesaj: err.message || 'Eroare la salvare!' });
    } finally {
      setEditInProgress(false);
    }
  };

  // Salvare bază inițială contor utilaj la punerea în funcțiune
  const handleSalveazaBazaInitiala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    const val = parseFloat(valoareBazaInput);
    if (isNaN(val) || val < 0) {
      setNotificare({ tip: 'error', mesaj: 'Vă rugăm să introduceți o valoare numerică validă pentru baza inițială!' });
      return;
    }

    try {
      setSalvareBazaInProgress(true);
      const res = await fetch(`${API_BASE_URL}/vehicule/ore-functionare/baza-initiala`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          vehiculId: selectedVehiculId,
          valoareBaza: val,
          dataInitiala: dataBazaInput || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setNotificare({ tip: 'error', mesaj: json.message || 'Eroare la salvarea bazei inițiale!' });
        return;
      }

      setNotificare({
        tip: 'success',
        mesaj: `Contorul inițial de pornire a fost setat la ${val.toLocaleString('ro-RO')} mTH! Toate perioadele GPS se adaugă la această bază.`,
      });

      setModalBazaOpen(false);
      await loadPerioade(selectedVehiculId);
      await loadUtilaje(selectedVehiculId);
    } catch (err: any) {
      setNotificare({ tip: 'error', mesaj: err.message || 'Eroare la salvarea bazei inițiale!' });
    } finally {
      setSalvareBazaInProgress(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-6 lg:p-8 space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-500/20">
            <Timer className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight">Ore de Funcționare (mTH / GPS)</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                GPS Telematics
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Evidență pe linie temporală a orelor utilajelor din rapoarte GPS, verificarea continuității și calculul contorului cumulat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={() => {
              if (selectedVehiculId) {
                loadPerioade(selectedVehiculId);
              }
              loadUtilaje();
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition shadow-sm"
            title="Reîmprospătează datele"
          >
            <RefreshCw className={`w-4 h-4 ${loadingUtilaje || loadingPerioade ? 'animate-spin text-indigo-500' : ''}`} />
            Actualizează
          </button>
        </div>
      </div>

      {/* NOTIFICARE ALERT */}
      {notificare && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all ${
            notificare.tip === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : notificare.tip === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {notificare.tip === 'success' && <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />}
            {notificare.tip === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />}
            {notificare.tip === 'info' && <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />}
            <span className="text-sm font-medium">{notificare.mesaj}</span>
          </div>
          <button
            onClick={() => setNotificare(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* BARA DE SELECȚIE ȘI FILTRARE UTILAJ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLOANA STÂNGA: SELECTOR UTILAJ */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-500" />
              Selectare Utilaj / Vehicul
            </h2>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFiltreazaDoarMth(true)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  filtreazaDoarMth
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Doar mTH
              </button>
              <button
                type="button"
                onClick={() => setFiltreazaDoarMth(false)}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                  !filtreazaDoarMth
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Toate
              </button>
            </div>
          </div>

          {/* CĂUTARE UTILAJ */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Caută după număr, marcă, model..."
              value={cautareUtilaj}
              onChange={(e) => setCautareUtilaj(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* LISTA DERULABILĂ UTILAJ */}
          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-700/50">
            {loadingUtilaje ? (
              <div className="p-6 text-center text-sm text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Se încarcă utilajele...
              </div>
            ) : utilajeFiltrate.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                Nu s-a găsit niciun utilaj care să corespundă filtrului.
              </div>
            ) : (
              utilajeFiltrate.map((u) => {
                const isSelected = u.id === selectedVehiculId;
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedVehiculId(u.id)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 shadow-sm'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 border border-transparent'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                          {u.numarIntern}
                        </span>
                        {u.numarInmatriculare && u.numarInmatriculare !== u.numarIntern && (
                          <span className="text-xs text-slate-500 font-mono">
                            ({u.numarInmatriculare})
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            (u.tipMasurare || '').toUpperCase().includes('MTH')
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {u.tipMasurare}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[220px]">
                        {u.marca} {u.model} • {u.categorieEnum}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {Number(u.valoareContorCurent || 0).toLocaleString('ro-RO')}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">mTH</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {u.numarPerioade} {u.numarPerioade === 1 ? 'perioadă' : 'perioade'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLOANA DREAPTA: CARD PROFIL UTILAJ SELECTAT + KPI RAPID */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          {selectedVehicul ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {selectedVehicul.numarIntern}
                    </h2>
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
                      {selectedVehicul.numarInmatriculare}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md">
                      {selectedVehicul.stare}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedVehicul.marca} {selectedVehicul.model} • Categorie: {selectedVehicul.categorieEnum}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 text-right">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Contor Curent Cumulat
                  </div>
                  <div className="text-3xl font-black text-indigo-700 dark:text-indigo-300">
                    {Number(selectedVehicul.valoareContorCurent || 0).toLocaleString('ro-RO')}
                    <span className="text-sm font-bold text-indigo-500 ml-1.5">mTH</span>
                  </div>
                </div>
              </div>

              {/* STATISTICI CHEIE UTILAJ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <div className="text-xs text-slate-500 font-medium">Perioade GPS</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {statisticiVehicul?.numarPerioade || 0}
                  </div>
                  <div className="text-[10px] text-slate-400">înregistrări salvate</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <div className="text-xs text-slate-500 font-medium">Total Ore GPS</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {Number(statisticiVehicul?.totalOreInregistrate || 0).toLocaleString('ro-RO')}
                  </div>
                  <div className="text-[10px] text-slate-400">ore acumulate</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                  <div className="text-xs text-slate-500 font-medium">Ultima Perioadă</div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                    {selectedVehicul.ultimaPerioada
                      ? `${new Date(selectedVehicul.ultimaPerioada.dataStart).toLocaleDateString('ro-RO')} - ${new Date(selectedVehicul.ultimaPerioada.dataEnd).toLocaleDateString('ro-RO')}`
                      : 'Nicio înregistrare'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {selectedVehicul.ultimaPerioada ? `${selectedVehicul.ultimaPerioada.oreFunctionare} ore raportate` : 'N/A'}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Bază Contor Inițial</span>
                    <button
                      type="button"
                      onClick={() => {
                        setValoareBazaInput(String(selectedVehicul.valoareContorInitial || 0));
                        setDataBazaInput('');
                        setModalBazaOpen(true);
                      }}
                      className="px-2 py-0.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-md transition border border-indigo-200 dark:border-indigo-800"
                    >
                      ✏️ {selectedVehicul.valoareContorInitial > 0 ? 'Modifică' : 'Setează'}
                    </button>
                  </div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {Number(selectedVehicul.valoareContorInitial || 0).toLocaleString('ro-RO')}
                    <span className="text-xs font-normal text-slate-400 ml-1">mTH</span>
                  </div>
                  <div className="text-[10px] text-slate-400">contor bord la punere în funcțiune</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-slate-400 text-sm">
              Selectați un utilaj din lista din stânga pentru a-i vizualiza detaliile și istoricul.
            </div>
          )}
        </div>
      </div>

      {/* FORMULAR ÎNREGISTRARE PERIOADĂ NOUĂ + CONSILIER CONTINUITATE */}
      {selectedVehicul && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Înregistrare Perioadă Nouă din Raport GPS
                </h3>
                <p className="text-xs text-slate-500">
                  Introduceți intervalul generat din programul GPS și orele lucrate de utilajul{' '}
                  <strong className="text-indigo-600">{selectedVehicul.numarIntern}</strong>.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSalveazaPerioada} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* DATA START */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Data de Început *
                </label>
                <input
                  type="date"
                  required
                  value={dataStart}
                  onChange={(e) => {
                    setDataStart(e.target.value);
                    setConfirmaInactivDacaGol(false);
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* DATA END */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Data de Sfârșit *
                </label>
                <input
                  type="date"
                  required
                  value={dataEnd}
                  onChange={(e) => {
                    setDataEnd(e.target.value);
                    setConfirmaInactivDacaGol(false);
                  }}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* ORE FUNCTIONARE */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Ore de Funcționare (mTH) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="ex: 200 sau 145.5"
                  value={oreFunctionare}
                  onChange={(e) => setOreFunctionare(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              {/* OBSERVATII */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Observații / Sursă GPS
                </label>
                <input
                  type="text"
                  placeholder="ex: Raport lunar GPS TrackGPS"
                  value={observatii}
                  onChange={(e) => setObservatii(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* INFORMARE SAU SETARE BAZĂ INIȚIALĂ CONTOR */}
            {selectedVehicul.valoareContorInitial > 0 ? (
              <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span>
                    Bază contor inițial stabilită la <strong>{Number(selectedVehicul.valoareContorInitial).toLocaleString('ro-RO')} mTH</strong>. Perioadele GPS introduse se adaugă cumulativ la acest index de pornire.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setValoareBazaInput(String(selectedVehicul.valoareContorInitial || 0));
                    setDataBazaInput('');
                    setModalBazaOpen(true);
                  }}
                  className="px-3 py-1.5 font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Modifică Baza Inițială
                </button>
              </div>
            ) : (!selectedVehicul.ultimaPerioada && selectedVehicul.valoareContorCurent === 0) ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
                    Inițializare Contor: Utilajul are în prezent contor 0 mTH.
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    Dacă utilajul pornește de la un index de bord existent înainte de prima perioadă GPS, introduceți-l aici:
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="ex: 1500 (sau 0 dacă începe de la 0)"
                    value={indexContorStartPersonalizat}
                    onChange={(e) => setIndexContorStartPersonalizat(e.target.value)}
                    className="w-48 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setValoareBazaInput('0');
                      setDataBazaInput('');
                      setModalBazaOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
                  >
                    sau configurează baza detaliată
                  </button>
                </div>
              </div>
            ) : null}

            {/* CARD CONSILIER CONTINUITATE (LIVE CONTINUITY ADVISOR) */}
            {validare && (
              <div
                className={`p-4 rounded-xl border transition-all ${
                  validare.status === 'CONTINUU' || validare.status === 'PRIMA_INREGISTRARE'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : validare.status === 'GOL_DETECTAT'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    : validare.status === 'SUPRAPUNERE'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* MESAJ PRINCIPAL SI STATUS */}
                  <div className="flex items-start gap-3">
                    {validare.status === 'CONTINUU' || validare.status === 'PRIMA_INREGISTRARE' ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : validare.status === 'GOL_DETECTAT' ? (
                      <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm">
                          {validare.status === 'CONTINUU' && 'Continuitate Perfectă'}
                          {validare.status === 'PRIMA_INREGISTRARE' && 'Prima Înregistrare Utilaj'}
                          {validare.status === 'GOL_DETECTAT' && `Interval Lipsă Detectat (${validare.zileGol} ${validare.zileGol === 1 ? 'zi' : 'zile'})`}
                          {validare.status === 'SUPRAPUNERE' && 'Suprapunere de Perioade (Risc de Dublare)'}
                          {validare.status === 'EROARE' && 'Eroare de Validare'}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-white/70 dark:bg-black/30 rounded-full font-mono">
                          {validare.nrZile} zile în perioadă • Medie: {validare.medieOrePeZi} ore/zi
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        {validare.mesaj}
                      </p>
                    </div>
                  </div>

                  {/* PREVIZIUNE INDEX CONTOR */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-mono font-bold shadow-sm self-start lg:self-center">
                    <span className="text-slate-500">Pornire: {validare.indexContorStartEstimat || 0} mTH</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">
                      Final: {validare.indexContorEndEstimat || 0} mTH
                    </span>
                  </div>
                </div>

                {/* BUTOANE DE ACȚIUNE DEDICATE ÎN CAZ DE GOL (GAP) SAU SUPRAPUNERE (OVERLAP) */}
                {validare.status === 'GOL_DETECTAT' && (
                  <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="text-xs text-amber-900 dark:text-amber-200">
                      Ce s-a întâmplat în perioada lipsă (<strong>{validare.dataGolInceput} - {validare.dataGolSfarsit}</strong>)?
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmaInactivDacaGol(!confirmaInactivDacaGol)}
                        className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition flex items-center gap-2 shadow-sm ${
                          confirmaInactivDacaGol
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {confirmaInactivDacaGol
                          ? 'Inactiv Confirmat (0 ore pauză)'
                          : 'Confirmă Utilaj Inactiv (0 ore)'}
                      </button>

                      {validare.sugestieDataStart && (
                        <button
                          type="button"
                          onClick={() => {
                            setDataStart(validare.sugestieDataStart!);
                            setConfirmaInactivDacaGol(false);
                          }}
                          className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl transition shadow-sm"
                        >
                          Ajustează data start la {validare.sugestieDataStart}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {validare.status === 'SUPRAPUNERE' && validare.sugestieDataStart && (
                  <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-800 flex items-center justify-between">
                    <span className="text-xs text-rose-800 dark:text-rose-300">
                      Eliminați suprapunerea pentru a preveni dublarea orelor înregistrate:
                    </span>
                    <button
                      type="button"
                      onClick={() => setDataStart(validare.sugestieDataStart!)}
                      className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition"
                    >
                      Setează începutul la {validare.sugestieDataStart}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* BUTON DE SUBMIT */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={
                  salvareInProgress ||
                  !dataStart ||
                  !dataEnd ||
                  !oreFunctionare ||
                  validare?.status === 'SUPRAPUNERE' ||
                  validare?.status === 'EROARE' ||
                  (validare?.status === 'GOL_DETECTAT' && !confirmaInactivDacaGol)
                }
                className={`px-6 py-2.5 text-sm font-extrabold rounded-xl text-white transition flex items-center gap-2 shadow-md ${
                  salvareInProgress ||
                  !dataStart ||
                  !dataEnd ||
                  !oreFunctionare ||
                  validare?.status === 'SUPRAPUNERE' ||
                  validare?.status === 'EROARE' ||
                  (validare?.status === 'GOL_DETECTAT' && !confirmaInactivDacaGol)
                    ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 active:scale-95'
                }`}
              >
                {salvareInProgress ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {salvareInProgress ? 'Se înregistrează...' : 'Înregistrează Perioadă GPS'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ISTORIC PERIOADE & AUDIT CRONOLOGIC */}
      {selectedVehicul && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Linie Temporală & Istoric Perioade GPS
              </h3>
              <p className="text-xs text-slate-500">
                Toate perioadele înregistrate pentru <strong>{selectedVehicul.numarIntern}</strong>, în ordine cronologică.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Total: {perioade.length} {perioade.length === 1 ? 'perioadă' : 'perioade'}
            </div>
          </div>

          {/* TABEL PERIOADE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="p-3.5">Perioadă Raportată</th>
                  <th className="p-3.5">Durată</th>
                  <th className="p-3.5">Ore Lucrate</th>
                  <th className="p-3.5">Ritm (Ore/Zi)</th>
                  <th className="p-3.5 font-mono">Index Contor</th>
                  <th className="p-3.5">Stare Continuitate</th>
                  <th className="p-3.5">Observații / Operator</th>
                  <th className="p-3.5 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loadingPerioade ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                      Se încarcă istoricul perioadelor...
                    </td>
                  </tr>
                ) : perioade.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                      Nicio perioadă de funcționare înregistrată încă pentru acest utilaj.
                    </td>
                  </tr>
                ) : (
                  perioade.map((p) => {
                    const startStr = new Date(p.dataStart).toLocaleDateString('ro-RO');
                    const endStr = new Date(p.dataEnd).toLocaleDateString('ro-RO');
                    const diffDays = Math.round((new Date(p.dataEnd).getTime() - new Date(p.dataStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const medie = diffDays > 0 ? (p.oreFunctionare / diffDays).toFixed(1) : '0';

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        {/* PERIOADA */}
                        <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {startStr} ➔ {endStr}
                        </td>

                        {/* DURATA */}
                        <td className="p-3.5 text-xs text-slate-500 whitespace-nowrap">
                          {diffDays} {diffDays === 1 ? 'zi' : 'zile'}
                        </td>

                        {/* ORE LUCRATE */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-black text-indigo-600 dark:text-indigo-400 text-base">
                            +{p.oreFunctionare}
                          </span>
                          <span className="text-xs font-normal text-slate-400 ml-1">ore</span>
                        </td>

                        {/* RITM ZILNIC */}
                        <td className="p-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {medie} h/zi
                        </td>

                        {/* INDEX CONTOR */}
                        <td className="p-3.5 font-mono text-xs whitespace-nowrap">
                          <span className="text-slate-400">{p.indexContorStart}</span>
                          <span className="mx-1.5 text-slate-300">➔</span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">
                            {p.indexContorEnd} mTH
                          </span>
                        </td>

                        {/* STARE CONTINUITATE */}
                        <td className="p-3.5 whitespace-nowrap">
                          {p.stareContinuitate === 'CONTINUU' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Continuu
                            </span>
                          )}
                          {p.stareContinuitate === 'GOL_CONFIRMAT_INACTIV' && (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 cursor-help"
                              title={p.explicatieGol || 'Utilaj confirmat inactiv'}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Inactiv ({p.zileGol} {p.zileGol === 1 ? 'zi' : 'zile'})
                            </span>
                          )}
                          {p.stareContinuitate === 'PRIMA_INREGISTRARE' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                              Punct Pornire
                            </span>
                          )}
                          {p.stareContinuitate === 'SUPRAPUNERE' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                              Suprapunere
                            </span>
                          )}
                        </td>

                        {/* OBSERVATII & OPERATOR */}
                        <td className="p-3.5 text-xs text-slate-500 max-w-xs truncate">
                          {p.observatii ? (
                            <span title={p.observatii}>{p.observatii}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                          {p.operator && (
                            <span className="block text-[10px] text-slate-400">Op: {p.operator}</span>
                          )}
                        </td>

                        {/* ACTIUNI */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setPerioadaDeEditat(p);
                                setEditOre(String(p.oreFunctionare));
                                setEditObservatii(p.observatii || '');
                              }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                              title="Editează perioada"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPerioadaDeSters(p)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-500 hover:text-rose-600 rounded-lg transition"
                              title="Șterge perioada și recalculează"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}

      {/* MODAL CONFIRMARE ȘTERGERE */}
      {perioadaDeSters && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Confirmare Ștergere Perioadă
              </h4>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Sunteți sigur că doriți să ștergeți perioada{' '}
              <strong>
                {new Date(perioadaDeSters.dataStart).toLocaleDateString('ro-RO')} -{' '}
                {new Date(perioadaDeSters.dataEnd).toLocaleDateString('ro-RO')}
              </strong>{' '}
              ({perioadaDeSters.oreFunctionare} ore)?
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
              ⚠️ <strong>Recalculare Automată:</strong> Ștergerea va recalcula automat întregul lanț cronologic și contorul utilajului.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPerioadaDeSters(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleConfirmaStergere}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-md shadow-rose-600/20"
              >
                Da, Șterge și Recalculează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITARE PERIOADĂ */}
      {perioadaDeEditat && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Editare Perioadă Funcționare
                </h4>
              </div>
              <button
                onClick={() => setPerioadaDeEditat(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="text-slate-400">Interval fixat:</span>{' '}
                <strong>
                  {new Date(perioadaDeEditat.dataStart).toLocaleDateString('ro-RO')} -{' '}
                  {new Date(perioadaDeEditat.dataEnd).toLocaleDateString('ro-RO')}
                </strong>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ore Funcționare (mTH) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editOre}
                  onChange={(e) => setEditOre(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observații / Notă
                </label>
                <input
                  type="text"
                  value={editObservatii}
                  onChange={(e) => setEditObservatii(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPerioadaDeEditat(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={editInProgress || !editOre}
                onClick={handleSalveazaEditare}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/20"
              >
                {editInProgress ? 'Se recalculează...' : 'Salvează și Recalculează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SETARE / MODIFICARE BAZĂ INIȚIALĂ CONTOR */}
      {modalBazaOpen && selectedVehicul && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Bază Inițială Contor (Pornire mTH)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Utilaj: <strong className="text-indigo-600 dark:text-indigo-400">{selectedVehicul.numarIntern}</strong> ({selectedVehicul.marca} {selectedVehicul.model})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalBazaOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalveazaBazaInitiala} className="space-y-4 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  Cum funcționează baza inițială?
                </div>
                <p className="text-[11px] leading-relaxed">
                  Deoarece utilajele au lucrat deja înainte de implementarea sistemului, introduceți contorul de bord de la care începe evidența. Toate perioadele de funcționare din GPS se vor adăuga cumulativ peste această bază.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Valoare Contor Inițial de Pornire (mTH) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="ex: 3450 sau 0 dacă e utilaj nou"
                  value={valoareBazaInput}
                  onChange={(e) => setValoareBazaInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-black text-base text-slate-900 dark:text-slate-100"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Indexul afișat pe ceasul/bordul utilajului la momentul intrării în sistem.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Data Înregistrării Bazei (Opțional)
                </label>
                <input
                  type="date"
                  value={dataBazaInput}
                  onChange={(e) => setDataBazaInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              {selectedVehicul.numarPerioade > 0 && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-900 dark:text-indigo-200 text-[11px]">
                  <strong>🔄 Recalculare automată:</strong> Utilajul are deja <strong>{selectedVehicul.numarPerioade}</strong> perioade GPS înregistrate. Modificarea acestei baze va transpune și recalcula automat toate indexurile perioadelor existente, actualizând contorul curent.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalBazaOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={salvareBazaInProgress || !valoareBazaInput}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  {salvareBazaInProgress ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Se salvează...
                    </>
                  ) : (
                    'Salvează Baza și Recalculează'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
