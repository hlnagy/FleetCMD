"use client";

import { useState, useEffect } from 'react';
import {
  Droplets, Plus, ShieldAlert, AlertTriangle, RefreshCw, ShoppingCart, Clock, Calendar,
  CheckCircle2, X, Filter, Sliders, ArrowUpRight, Search, Layers, Database, Truck, ChevronDown, Check, Wrench, ShieldCheck, Activity
} from 'lucide-react';
import VehicleSelector from '@/components/VehicleSelector';

export default function FluidePage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [activeTab, setActiveTab] = useState<'flota' | 'iesiri' | 'config' | 'anomalii'>('flota');
  const [stocUleiuri, setStocUleiuri] = useState<any[]>([]);
  const [flotaFluide, setFlotaFluide] = useState<any[]>([]);
  const [statusSchimburi, setStatusSchimburi] = useState<any[]>([]);
  const [alerte, setAlerte] = useState<any[]>([]);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);

  // Filtre
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TOATE'); // TOATE, DEPASITE, AVERTIZARE, OK
  const [selectedTipLichidFilter, setSelectedTipLichidFilter] = useState('');

  // Stare Formular Ieșiri Ulei (Schimb vs Completare pe vehicul)
  const [iesireTipLichid, setIesireTipLichid] = useState('ULEI_MOTOR');
  const [iesireOperatiune, setIesireOperatiune] = useState('SCHIMB_ULEI');
  const [selectedArticolStocId, setSelectedArticolStocId] = useState('');
  const [iesireMarca, setIesireMarca] = useState('Mobil1');
  const [iesireCantitate, setIesireCantitate] = useState(15);
  const [iesireContor, setIesireContor] = useState(0);
  const [iesireData, setIesireData] = useState(new Date().toISOString().split('T')[0]);
  const [iesireMecanic, setIesireMecanic] = useState('Brașoveanu Virgil (Șef Atelier)');
  const [iesireObservatii, setIesireObservatii] = useState('');

  // Stare Formular Configurare Intervale (Reguli mTH, KM, Luni)
  const [cfgTipLichid, setCfgTipLichid] = useState('ULEI_MOTOR');
  const [cfgIntervalMth, setCfgIntervalMth] = useState(250);
  const [cfgIntervalKm, setCfgIntervalKm] = useState(15000);
  const [cfgIntervalLuni, setCfgIntervalLuni] = useState(24);
  const [cfgPragMth, setCfgPragMth] = useState(50);
  const [cfgPragKm, setCfgPragKm] = useState(1000);
  const [cfgPragLuni, setCfgPragLuni] = useState(1);

  // Modal Rezolvare Alertă
  const [solvingAlerta, setSolvingAlerta] = useState<any>(null);
  const [solutieRezolvare, setSolutieRezolvare] = useState('Constatare și reparație scurgere în atelier');

  const fetchInitialData = async () => {
    try {
      const resFlota = await fetch('http://localhost:3001/anomalii/flota-fluide');
      if (resFlota.ok) setFlotaFluide(await resFlota.json());

      const resMec = await fetch('http://localhost:3001/mentenanta/mecanici');
      if (resMec.ok) {
        const dataMec = await resMec.json();
        setMecaniciList(dataMec);
        if (dataMec.length > 0) setIesireMecanic(dataMec[0].nume);
      }

      const resVeh = await fetch('http://localhost:3001/vehicule');
      if (resVeh.ok) {
        const dataVeh = await resVeh.json();
        setVehicule(dataVeh);
        if (dataVeh.length > 0 && !selectedVehiculId) {
          setSelectedVehiculId(dataVeh[0].id);
          setIesireContor(dataVeh[0].valoareContorCurent || 0);
        }
      }

      const resStoc = await fetch('http://localhost:3001/stocuri-garantii/stocuri');
      if (resStoc.ok) {
        const dataStoc = await resStoc.json();
        const lubeStoc = dataStoc.filter((s: any) => 
          s.categorie?.toLowerCase().includes('lubrifian') || 
          s.denumire?.toLowerCase().includes('ulei')
        );
        setStocUleiuri(lubeStoc);
        if (lubeStoc.length > 0 && !selectedArticolStocId) {
          setSelectedArticolStocId(lubeStoc[0].id);
          setIesireMarca(lubeStoc[0].marcaUlei || lubeStoc[0].denumire);
        }
      }

      const resAlert = await fetch('http://localhost:3001/anomalii/alerte');
      if (resAlert.ok) setAlerte(await resAlert.json());
    } catch (e) {
      console.log('Error fetching initial data for fluids', e);
    }
  };

  const fetchStatusSchimburi = async (vId: string) => {
    if (!vId) return;
    try {
      const res = await fetch(`http://localhost:3001/anomalii/status-schimburi/${vId}`);
      if (res.ok) setStatusSchimburi(await res.json());
    } catch (e) {
      console.log('Error fetching vehicle oil status', e);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedVehiculId) {
      fetchStatusSchimburi(selectedVehiculId);
      const v = vehicule.find(item => item.id === selectedVehiculId);
      if (v) setIesireContor(v.valoareContorCurent || 0);
    }
  }, [selectedVehiculId]);

  const handleIesireUlei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    try {
      const res = await fetch('http://localhost:3001/anomalii/iesire-ulei', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedVehiculId,
          tipLichid: iesireTipLichid,
          tipOperatiune: iesireOperatiune,
          articolStocId: selectedArticolStocId || undefined,
          marcaUlei: iesireMarca,
          cantitateLitri: Number(iesireCantitate),
          valoareContor: Number(iesireContor),
          dataOperatiune: iesireData,
          mecanic: iesireMecanic,
          observatii: iesireObservatii,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Înregistrare operațiune ulei salvată cu succes! Stocul a fost scos automat.');
        setActiveTab('flota');
        fetchInitialData();
        fetchStatusSchimburi(selectedVehiculId);
      } else {
        const err = await res.json();
        alert(`Eroare la salvare: ${err.message || 'Verificați datele introduse'}`);
      }
    } catch (e) {
      alert('Eroare la procesarea cererii de ieșire ulei.');
    }
  };

  const handleSalveazaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    try {
      const res = await fetch('http://localhost:3001/anomalii/configurare-ulei', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedVehiculId,
          tipLichid: cfgTipLichid,
          intervalMth: Number(cfgIntervalMth),
          intervalKm: Number(cfgIntervalKm),
          intervalLuni: Number(cfgIntervalLuni),
          pragAvertizareMth: Number(cfgPragMth),
          pragAvertizareKm: Number(cfgPragKm),
          pragAvertizareLuni: Number(cfgPragLuni),
        }),
      });

      if (res.ok) {
        alert('Regulă de interval și avertisment salvată cu succes!');
        fetchStatusSchimburi(selectedVehiculId);
        fetchInitialData();
      }
    } catch (e) {
      alert('Eroare la salvarea regulilor de interval.');
    }
  };

  const handleRezolvaAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solvingAlerta) return;

    try {
      const res = await fetch(`http://localhost:3001/anomalii/alerte/${solvingAlerta.id}/rezolva`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutie: solutieRezolvare }),
      });
      if (res.ok) {
        alert('✅ Alertă marcată ca REZOLVATĂ!');
        setSolvingAlerta(null);
        fetchInitialData();
      }
    } catch (e) {
      alert('Eroare la rezolvarea alertei.');
    }
  };

  // Calcul Statistici Flotă Fluide
  const totalPuncte = flotaFluide.length;
  const numDepasite = flotaFluide.filter(f => f.esteDepasit).length;
  const numAvertizari = flotaFluide.filter(f => f.esteInPragAvertizare && !f.esteDepasit).length;
  const numAlerteActive = alerte.length;

  const fluideFiltrate = flotaFluide.filter((f) => {
    const matchStatus = 
      selectedStatusFilter === 'TOATE' ? true :
      selectedStatusFilter === 'DEPASITE' ? f.esteDepasit :
      selectedStatusFilter === 'AVERTIZARE' ? f.esteInPragAvertizare && !f.esteDepasit :
      selectedStatusFilter === 'OK' ? !f.esteDepasit && !f.esteInPragAvertizare : true;

    const matchLichid = selectedTipLichidFilter ? f.tipLichid === selectedTipLichidFilter : true;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const mIntern = f.vehiculNumarIntern?.toLowerCase().includes(q);
      const mInmat = f.vehiculInmatriculare?.toLowerCase().includes(q);
      const mLichid = f.tipLichid?.toLowerCase().includes(q);
      const mMarca = f.vehiculMarca?.toLowerCase().includes(q);
      return matchStatus && matchLichid && (mIntern || mInmat || mLichid || mMarca);
    }
    return matchStatus && matchLichid;
  });

  const currentVehicul = vehicule.find((v) => v.id === selectedVehiculId);

  return (
    <div className="space-y-6">
      {/* Antet Titlu & Acțiuni Rapide */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <Droplets className="w-6 h-6 text-sapphire-500" />
            <span>Gestiune Fluide & Monitorizare Uleiuri (Anomalii)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Monitoring automat schimburi, scădere din stoc și detector anomalii scurgeri</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveTab('iesiri')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Înregistrează Schimb / Dopare Ulei</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-sapphire-50 border border-sapphire-200 text-sapphire-700">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-sage-600 font-semibold block">Puncte Monitorizate</span>
            <span className="text-xl font-black font-mono text-sapphire-900">{totalPuncte}</span>
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-roseash-100 border border-roseash-300 text-terracotta-600">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-sage-600 font-semibold block">Schimburi Depășite</span>
            <span className="text-xl font-black font-mono text-terracotta-600">{numDepasite}</span>
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-morning-100 border border-morning-300 text-sapphire-900">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-sage-600 font-semibold block">În Prag Avertizare</span>
            <span className="text-xl font-black font-mono text-slate-800">{numAvertizari}</span>
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-terracotta-100 border border-terracotta-300 text-terracotta-700">
            <ShieldAlert className="w-5 h-5 animate-bounce text-terracotta-600" />
          </div>
          <div>
            <span className="text-xs text-sage-600 font-semibold block">Alerte Scurgeri</span>
            <span className="text-xl font-black font-mono text-terracotta-700">{numAlerteActive}</span>
          </div>
        </div>
      </div>

      {/* BANNER ALERTE ACTIVE DETECȚIE ANOMALII SCURGERI */}
      {alerte.length > 0 && (
        <div className="p-4 rounded-2xl bg-roseash-100 border-2 border-roseash-300 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-terracotta-600 font-extrabold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-terracotta-500 animate-bounce" />
              <span>🚨 Detector Anomalii Scurgeri - Alerte Neconcordanță Nivel ({alerte.length} active):</span>
            </div>
            <span className="text-[10px] bg-terracotta-600 text-white font-bold px-2.5 py-1 rounded-full uppercase">Acțiune Necesară</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerte.map((a: any) => (
              <div key={a.id} className="p-3 rounded-xl bg-white border border-roseash-300 flex items-center justify-between text-xs shadow-2xs">
                <div className="space-y-0.5">
                  <p className="font-extrabold text-sapphire-900">{a.vehicul}</p>
                  <p className="text-terracotta-600 font-bold text-[11px]">{a.mesaj}</p>
                  <p className="text-[10px] text-sage-500 font-mono">Data sesizării: {new Date(a.data).toLocaleDateString('ro-RO')}</p>
                </div>
                <button
                  onClick={() => setSolvingAlerta(a)}
                  className="px-3 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold shadow-xs whitespace-nowrap"
                >
                  Rezolvă Alertă
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SELECTOR SCALABIL UTILAJ */}
      <VehicleSelector
        selectedId={selectedVehiculId}
        onSelect={(v) => setSelectedVehiculId(v.id)}
        vehicule={vehicule}
      />

      {/* TAB-URI MENIU PRINCIPAL */}
      <div className="pleasant-card p-2 rounded-2xl flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('flota')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'flota' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          1. Matrice Stare Uleiuri ({flotaFluide.length})
        </button>

        <button
          onClick={() => setActiveTab('iesiri')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'iesiri' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          2. Înregistrează Schimb / Dopare Ulei din Stoc
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'config' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          3. Reguli Intervale & Praguri ({statusSchimburi.length})
        </button>

        <button
          onClick={() => setActiveTab('anomalii')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'anomalii' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          4. Detector Anomalii Scurgeri ({alerte.length})
        </button>
      </div>

      {/* TAB 1: MATRICE STARE ULEIURI FLOTĂ */}
      {activeTab === 'flota' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-morning-100 rounded-2xl border border-morning-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Căutare utilaj, număr intern, tip lichid..."
                className="w-full bg-white border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 font-bold focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs flex-wrap">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="TOATE">Toate Stările</option>
                <option value="DEPASITE">🔴 Doar Schimburi Depășite</option>
                <option value="AVERTIZARE">⚠️ Doar În Prag Avertizare</option>
                <option value="OK">✅ Doar În Grafic (OK)</option>
              </select>

              <select
                value={selectedTipLichidFilter}
                onChange={(e) => setSelectedTipLichidFilter(e.target.value)}
                className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="">Toate Tipurile de Ulei</option>
                <option value="ULEI_MOTOR">Ulei Motor</option>
                <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Utilaj</th>
                  <th className="p-3">Tip Lichid</th>
                  <th className="p-3 font-mono">Ultimul Schimb</th>
                  <th className="p-3 font-mono">Rulaj Curent / Limită</th>
                  <th className="p-3">Progres Interval</th>
                  <th className="p-3">Stare Schimb</th>
                  <th className="p-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {fluideFiltrate.map((f: any, idx: number) => {
                  const limit = f.limitInterval || (f.tipMasurare === 'MTH' ? 250 : 15000);
                  const pct = Math.min(100, Math.round((f.rulajDeLaUltimulSchimb / limit) * 100));

                  return (
                    <tr key={idx} className={`hover:bg-morning-50 transition ${f.esteDepasit ? 'bg-roseash-50' : ''}`}>
                      <td className="p-3">
                        <span className="font-extrabold text-sapphire-900 block">{f.vehiculNumarIntern}</span>
                        <span className="text-[10px] text-sage-600 block font-medium">{f.vehiculMarca} {f.vehiculModel} ({f.vehiculInmatriculare})</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-morning-200 text-sapphire-900 font-bold text-[11px]">
                          {f.tipLichid?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-sage-700 font-semibold">
                        {f.ultimulSchimbContor} {f.tipMasurare}
                        {f.ultimulSchimbData && (
                          <span className="text-[10px] text-sage-500 block">
                            {new Date(f.ultimulSchimbData).toLocaleDateString('ro-RO')}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-extrabold text-sapphire-900">
                        {f.rulajDeLaUltimulSchimb} / {limit} {f.tipMasurare}
                      </td>
                      <td className="p-3 w-36">
                        <div className="space-y-1">
                          <div className="w-full bg-morning-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                f.esteDepasit ? 'bg-terracotta-500 animate-pulse' :
                                f.esteInPragAvertizare ? 'bg-amber-500' : 'bg-sapphire-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-sage-600 font-bold">{pct}% consumat</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          f.esteDepasit ? 'bg-roseash-200 text-terracotta-700 border border-terracotta-300 animate-pulse' :
                          f.esteInPragAvertizare ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-sapphire-50 text-sapphire-700 border border-sapphire-200'
                        }`}>
                          {f.esteDepasit ? `🔴 ${f.motivAvertisment || 'DEPAȘIT / SCHIMB NECESAR'}` :
                           f.esteInPragAvertizare ? `⚠️ ${f.motivAvertisment || 'ÎN PRAG AVERTIZARE'}` :
                           '✅ OK (ÎN GRAFIC)'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedVehiculId(f.vehiculId);
                            setIesireTipLichid(f.tipLichid);
                            setActiveTab('iesiri');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold shadow-xs transition"
                        >
                          + Schimb / Dopare
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IEȘIRI ULEI DIN STOC */}
      {activeTab === 'iesiri' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4 max-w-2xl mx-auto shadow-xl">
          <div className="border-b border-morning-200 pb-3">
            <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-sapphire-500" />
              <span>Înregistrare Operativă Schimb / Dopare Ulei pe Utilaj</span>
            </h2>
            <p className="text-xs text-sage-600 font-medium">Scădere automata de litri din Stocul de Lubrifianți & resetare contor interval</p>
          </div>

          <form onSubmit={handleIesireUlei} className="space-y-4 text-xs">
            <div>
              <label className="text-sage-700 block mb-1 font-bold">Selectează Utilaj: *</label>
              <select
                value={selectedVehiculId}
                onChange={(e) => setSelectedVehiculId(e.target.value)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-extrabold text-sm"
              >
                {vehicule.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.numarIntern} — {v.marca} {v.model} ({v.numarInmatriculare}) — Contor: {v.valoareContorCurent} {v.tipMasurare}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Tip Operatiune: *</label>
                <select value={iesireOperatiune} onChange={(e) => setIesireOperatiune(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                  <option value="SCHIMB_ULEI">🔄 SCHIMB COMPLET ULEI (Resetează Contorul)</option>
                  <option value="COMPLETARE_ULEI">🛢️ COMPLETARE / SUPLIMENTARE (Dopare)</option>
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Tip Lichid: *</label>
                <select value={iesireTipLichid} onChange={(e) => setIesireTipLichid(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                  <option value="ULEI_MOTOR">Ulei Motor</option>
                  <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                  <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                  <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                  <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                  <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sage-700 block mb-1 font-bold">Articol Lubrifiant din Stoc (Scădere Automată): *</label>
              <select
                value={selectedArticolStocId}
                onChange={(e) => {
                  setSelectedArticolStocId(e.target.value);
                  const st = stocUleiuri.find(s => s.id === e.target.value);
                  if (st) setIesireMarca(st.marcaUlei || st.denumire);
                }}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
              >
                {stocUleiuri.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.denumire} ({st.codArticol}) — Stoc Curent: {st.stocCurent} Litri ({st.depozit?.nume || 'Depozit Central'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Cantitate (Litri): *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={iesireCantitate}
                  onChange={(e) => setIesireCantitate(Number(e.target.value))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Odometru / Contor La Operare ({currentVehicul?.tipMasurare || 'mTH/KM'}): *</label>
                <input
                  type="number"
                  required
                  value={iesireContor}
                  onChange={(e) => setIesireContor(Number(e.target.value))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Mecanic / Operator Atelier: *</label>
                <select
                  required
                  value={iesireMecanic}
                  onChange={(e) => setIesireMecanic(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {mecaniciList.map((m: any) => (
                    <option key={m.id} value={m.nume}>
                      👨‍🔧 {m.nume} ({m.functie || 'Mecanic'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Data Operațiune:</label>
                <input
                  type="date"
                  value={iesireData}
                  onChange={(e) => setIesireData(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-sage-700 block mb-1 font-bold">Observații / Notițe Atelier:</label>
              <input
                value={iesireObservatii}
                onChange={(e) => setIesireObservatii(e.target.value)}
                placeholder="ex: Schimb complet filtre + ulei transmisie"
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => setActiveTab('flota')}
                className="px-4 py-2.5 rounded-xl bg-morning-200 text-slate-700 font-semibold"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
              >
                Salvează & Scade din Stoc
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: REGULI INTERVALE & PRAGURI ALERTE PER UTILAJ */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 pleasant-card rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-sapphire-900 border-b border-morning-200 pb-2">Configurare Regulă Nouă</h2>
            <form onSubmit={handleSalveazaConfig} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Utilaj Selectat:</label>
                <select
                  value={selectedVehiculId}
                  onChange={(e) => setSelectedVehiculId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                >
                  {vehicule.map((v) => (
                    <option key={v.id} value={v.id}>{v.numarIntern} ({v.numarInmatriculare})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Tip Lichid:</label>
                <select value={cfgTipLichid} onChange={(e) => setCfgTipLichid(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold">
                  <option value="ULEI_MOTOR">Ulei Motor</option>
                  <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                  <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                  <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                  <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                  <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
                </select>
              </div>

              <div className="p-3 bg-morning-100 rounded-xl border border-morning-200 space-y-2">
                <p className="font-bold text-sapphire-900">1. Limite Schimb Standard:</p>
                <div>
                  <label className="text-sage-700 block mb-1 font-medium">Interval mTH:</label>
                  <input type="number" value={cfgIntervalMth} onChange={(e) => setCfgIntervalMth(Number(e.target.value))} className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-medium">Interval KM:</label>
                  <input type="number" value={cfgIntervalKm} onChange={(e) => setCfgIntervalKm(Number(e.target.value))} className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-medium">Interval Luni:</label>
                  <input type="number" value={cfgIntervalLuni} onChange={(e) => setCfgIntervalLuni(Number(e.target.value))} className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
              </div>

              <div className="p-3 bg-roseash-50 rounded-xl border border-roseash-200 space-y-2">
                <p className="font-bold text-terracotta-700">2. Marjă / Prag Avertizare Înainte:</p>
                <div>
                  <label className="text-sage-700 block mb-1 font-medium">Prag mTH (ex: 50 mTH înainte):</label>
                  <input type="number" value={cfgPragMth} onChange={(e) => setCfgPragMth(Number(e.target.value))} className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-medium">Prag KM (ex: 1000 KM înainte):</label>
                  <input type="number" value={cfgPragKm} onChange={(e) => setCfgPragKm(Number(e.target.value))} className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
              </div>

              <button type="submit" className="w-full py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">
                Salvează Regulă Interval
              </button>
            </form>
          </div>

          <div className="md:col-span-2 pleasant-card rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-sapphire-900 border-b border-morning-200 pb-2">
              Reguli Configurate pe Utilajul {currentVehicul?.numarIntern || ''} ({statusSchimburi.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3">Tip Lichid</th>
                    <th className="p-3 font-mono">Interval mTH / KM</th>
                    <th className="p-3 font-mono">Interval Luni</th>
                    <th className="p-3 font-mono">Prag Avertizare</th>
                    <th className="p-3">Stare Curentă</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-200">
                  {statusSchimburi.map((cfg: any, idx: number) => (
                    <tr key={idx} className="hover:bg-morning-50 transition">
                      <td className="p-3 font-bold text-sapphire-900">{cfg.tipLichid?.replace(/_/g, ' ')}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {cfg.intervalMth ? `${cfg.intervalMth} mTH` : `${cfg.intervalKm} KM`}
                      </td>
                      <td className="p-3 font-mono text-sage-700">{cfg.intervalLuni} Luni</td>
                      <td className="p-3 font-mono text-sage-700">
                        {cfg.pragAvertizareMth ? `${cfg.pragAvertizareMth} mTH` : `${cfg.pragAvertizareKm} KM`}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cfg.esteDepasit ? 'bg-roseash-200 text-terracotta-700' :
                          cfg.esteInPragAvertizare ? 'bg-amber-100 text-amber-800' :
                          'bg-sapphire-50 text-sapphire-700'
                        }`}>
                          {cfg.esteDepasit ? '🔴 DEPAȘIT' : cfg.esteInPragAvertizare ? '⚠️ AVERTIZARE' : '✅ OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DETECTOR ANOMALII & ISTORIC SCURGERI */}
      {activeTab === 'anomalii' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-morning-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-terracotta-500" />
                <span>Detector Anomalii Consum Nejustificat & Scurgeri Ulei</span>
              </h2>
              <p className="text-xs text-sage-600 font-medium">Algoritmul compară cantitățile completate și frecvența dopărilor pe un interval scurt de ore/KM</p>
            </div>
          </div>

          {alerte.length === 0 ? (
            <div className="p-8 text-center bg-morning-100 rounded-2xl space-y-2">
              <ShieldCheck className="w-10 h-10 text-sapphire-500 mx-auto" />
              <h3 className="font-extrabold text-sapphire-900 text-sm">Nu există alerte active de scurgere în flotă!</h3>
              <p className="text-xs text-sage-600">Toate completările de ulei se încadrează în limitele normale de consum admis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerte.map((a: any) => (
                <div key={a.id} className="p-4 rounded-2xl bg-white border-2 border-roseash-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-terracotta-500 text-white font-extrabold text-[10px] uppercase">
                        🚨 Alertă Scurgere Activă
                      </span>
                      <span className="font-extrabold text-sapphire-900 text-sm">{a.vehicul}</span>
                    </div>
                    <p className="text-xs text-terracotta-700 font-bold">{a.mesaj}</p>
                    <p className="text-[11px] text-sage-600 font-mono">
                      Contor sesizare: {a.valoareContor} | Data: {new Date(a.data).toLocaleString('ro-RO')}
                    </p>
                  </div>

                  <button
                    onClick={() => setSolvingAlerta(a)}
                    className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 whitespace-nowrap"
                  >
                    Marchează Remediat în Atelier
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL REZOLVARE ALERTĂ SCURGERE */}
      {solvingAlerta && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-lg font-bold text-sapphire-900">Remediere Alertă Scurgere ({solvingAlerta.vehicul})</h3>
              <button onClick={() => setSolvingAlerta(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRezolvaAlerta} className="space-y-3 text-xs">
              <div className="p-3 bg-roseash-50 border border-roseash-200 rounded-xl space-y-1">
                <p className="font-extrabold text-terracotta-700">{solvingAlerta.mesaj}</p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Soluție Rezolvare / Constatare Atelier: *</label>
                <textarea
                  required
                  rows={3}
                  value={solutieRezolvare}
                  onChange={(e) => setSolutieRezolvare(e.target.value)}
                  placeholder="ex: Schimbat garnitură baie ulei, strâns racord furtun hidraulic"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setSolvingAlerta(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Confirmă Remedierea Alertei</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
