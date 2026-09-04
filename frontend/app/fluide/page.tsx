"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import {
  Droplets, Plus, ShieldAlert, AlertTriangle, RefreshCw, ShoppingCart, Clock, Calendar,
  CheckCircle2, X, Filter, Sliders, ArrowUpRight, Search, Layers, Database, Truck, ChevronDown, ChevronUp, Check, Wrench, ShieldCheck, Activity, FileText
} from 'lucide-react';
import VehicleSelector from '@/components/VehicleSelector';

export default function FluidePage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [activeTab, setActiveTab] = useState<'flota' | 'config' | 'anomalii'>('flota');
  const [stocUleiuri, setStocUleiuri] = useState<any[]>([]);
  const [flotaFluide, setFlotaFluide] = useState<any[]>([]);
  const [statusSchimburi, setStatusSchimburi] = useState<any[]>([]);
  const [alerte, setAlerte] = useState<any[]>([]);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);
  const [isAlerteCollapsed, setIsAlerteCollapsed] = useState<boolean>(false);

  // Modal Înregistrare Completare Ulei (Top-up)
  const [showCompletareModal, setShowCompletareModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fluide_alerte_collapsed');
      if (saved !== null) {
        setIsAlerteCollapsed(saved === 'true');
      }
    } catch (e) {}
  }, []);

  const toggleAlerteCollapse = () => {
    setIsAlerteCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fluide_alerte_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Filtre Tab Flotă
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TOATE'); // TOATE, DEPASITE, AVERTIZARE, OK
  const [selectedTipLichidFilter, setSelectedTipLichidFilter] = useState('');

  // Stare Formular Ieșiri Ulei (Completare pe vehicul)
  const [iesireTipLichid, setIesireTipLichid] = useState('ULEI_MOTOR');
  const [iesireOperatiune, setIesireOperatiune] = useState('COMPLETARE_ULEI');
  const [selectedArticolStocId, setSelectedArticolStocId] = useState('');
  const [iesireMarca, setIesireMarca] = useState('Mobil1');
  const [iesireCantitate, setIesireCantitate] = useState(5);
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
      const resFlota = await fetch(`${API_BASE_URL}/anomalii/flota-fluide`);
      if (resFlota.ok) setFlotaFluide(await resFlota.json());

      const resMec = await fetch(`${API_BASE_URL}/mentenanta/mecanici`);
      if (resMec.ok) {
        const dataMec = await resMec.json();
        setMecaniciList(dataMec);
        if (dataMec.length > 0) setIesireMecanic(dataMec[0].nume);
      }

      const resVeh = await fetch(`${API_BASE_URL}/vehicule`);
      if (resVeh.ok) {
        const dataVeh = await resVeh.json();
        setVehicule(dataVeh);
        if (dataVeh.length > 0 && !selectedVehiculId) {
          setSelectedVehiculId(dataVeh[0].id);
          setIesireContor(dataVeh[0].valoareContorCurent || 0);
        }
      }

      const resStoc = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri`);
      if (resStoc.ok) {
        const dataStoc = await resStoc.json();
        // Filtrăm STRICT doar articolele de tip ulei / lubrifiant / fluid (excludem categoric filtrele de ulei/aer!)
        const lubeStoc = dataStoc.filter((s: any) => {
          const cat = (s.categorie || '').toLowerCase();
          const den = (s.denumire || '').toLowerCase();
          const isFilter = cat.includes('filtr') || den.includes('filtr') || cat === 'filtre';
          const isLube = cat.includes('lubrifian') || cat.includes('ulei') || cat.includes('fluid') || s.unitateMasura === 'L' || s.unitateMasura === 'Litri' || den.startsWith('ulei');
          return isLube && !isFilter;
        });
        setStocUleiuri(lubeStoc);
        if (lubeStoc.length > 0 && !selectedArticolStocId) {
          setSelectedArticolStocId(lubeStoc[0].id);
          setIesireMarca(lubeStoc[0].marcaUlei || lubeStoc[0].denumire);
        }
      }

      const resAlert = await fetch(`${API_BASE_URL}/anomalii/alerte`);
      if (resAlert.ok) {
        const rawAlerts = await resAlert.json();
        const lubeAlerts = rawAlerts.filter((a: any) =>
          a.categorieAlert === 'SCURGERI_ULEI' ||
          a.titlu?.toLowerCase().includes('ulei') ||
          a.titlu?.toLowerCase().includes('fluid') ||
          a.titlu?.toLowerCase().includes('lichid') ||
          a.mesaj?.toLowerCase().includes('ulei')
        );
        setAlerte(lubeAlerts);
      }
    } catch (e) {
      console.log('Error fetching initial data for fluids', e);
    }
  };

  const fetchStatusSchimburi = async (vId: string) => {
    if (!vId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/status-schimburi/${vId}`);
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

  const handleOpenCompletare = (vehiculId?: string, tipLichid?: string) => {
    if (vehiculId) setSelectedVehiculId(vehiculId);
    if (tipLichid) setIesireTipLichid(tipLichid);
    setIesireOperatiune('COMPLETARE_ULEI');
    setShowCompletareModal(true);
  };

  const handleIesireUlei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/iesire-ulei`, {
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
        alert(data.mesaj || 'Înregistrare completare salvată cu succes! Stocul de ulei a fost scăzut automat.');
        setShowCompletareModal(false);
        fetchInitialData();
        fetchStatusSchimburi(selectedVehiculId);
      } else {
        const err = await res.json();
        alert(`Eroare la salvare: ${err.message || 'Verificați datele introduse'}`);
      }
    } catch (e) {
      alert('Eroare la procesarea cererii de completare ulei.');
    }
  };

  const handleSalveazaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei`, {
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
        alert('Normă de interval și prag salvate cu succes!');
        fetchStatusSchimburi(selectedVehiculId);
        fetchInitialData();
      }
    } catch (e) {
      alert('Eroare la salvarea normelor de interval.');
    }
  };

  const handleRezolvaAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solvingAlerta) return;

    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/alerte/${solvingAlerta.id}/rezolva`, {
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
      {/* ANTET TITLU & ACȚIUNI PRINCIPALE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
              <Droplets className="w-6 h-6" />
            </div>
            <span>Gestiune Fluide & Lubrifianți Flotă</span>
          </h1>
          <p className="text-xs text-sage-600 font-medium mt-1">
            Monitorizare preventivă niveluri, intervale schimb, detecție automată scurgeri și scăderi din stoc
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/comenzi-lucru"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold transition border border-morning-300"
          >
            <FileText className="w-4 h-4 text-sapphire-600" />
            <span>Comenzi de Lucru (Revizii)</span>
          </a>

          <button
            onClick={() => handleOpenCompletare()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Înregistrează Completare Ulei</span>
          </button>
        </div>
      </div>

      {/* BANNER ALERTE ACTIVE SCHIMB ULEI & FLUIDE */}
      {alerte.length > 0 && (
        <div className="p-4 rounded-2xl bg-roseash-100 border-2 border-roseash-300 space-y-3 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-terracotta-700 font-extrabold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-terracotta-600 animate-bounce" />
              <span>🚨 Alerte Active Schimb Ulei & Fluide ({alerte.length} active):</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] bg-terracotta-600 text-white font-bold px-2.5 py-1 rounded-full uppercase">
                Acțiune Necesară
              </span>

              <button
                type="button"
                onClick={toggleAlerteCollapse}
                className="px-3 py-1 bg-white hover:bg-roseash-50 text-terracotta-700 border border-roseash-300 text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1"
                title={isAlerteCollapsed ? 'Extinde Panou' : 'Restrânge Panou'}
              >
                <span>{isAlerteCollapsed ? 'Extinde Panou' : 'Restrânge Panou'}</span>
                {isAlerteCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isAlerteCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {alerte.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-white border border-roseash-300 flex flex-col justify-between text-xs shadow-2xs space-y-2 hover:border-roseash-400 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-sapphire-100 border border-sapphire-200 text-sapphire-900 font-black text-[11px] font-mono">
                          🚜 {a.vehiculNumar || 'Utilaj'}
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]" title={a.titlu}>
                          {a.titlu}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        a.urgenta === 'CRITIC' ? 'bg-roseash-200 text-terracotta-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a.urgenta || 'CRITIC'}
                      </span>
                    </div>

                    <p className="text-terracotta-700 font-bold text-[11px] leading-snug">{a.mesaj}</p>

                    <div className="flex items-center space-x-2 text-[10px] text-sage-600 font-mono pt-0.5">
                      <span>• {a.modCalcul || (a.dataReferinta ? `Data referință: ${new Date(a.dataReferinta).toLocaleDateString('ro-RO')}` : 'Dată nespecificată')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-morning-100">
                    <button
                      type="button"
                      onClick={() => handleOpenCompletare(a.vehiculId, a.tipLichid)}
                      className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-[11px] font-bold transition flex items-center space-x-1"
                    >
                      <Droplets className="w-3 h-3 text-sapphire-600" />
                      <span>Completare Nivel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSolvingAlerta(a)}
                      className="px-3 py-1 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold shadow-xs transition"
                    >
                      Rezolvă Alertă
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MENIU TABS PROFESIONAL (FĂRĂ NUMERE) */}
      <div className="flex space-x-2 border-b border-morning-300 pb-1">
        <button
          onClick={() => setActiveTab('flota')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'flota'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Monitorizare Flotă & Nivel Uleiuri</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'flota' ? 'bg-white/20 text-white' : 'bg-morning-200 text-slate-700'
          }`}>
            {flotaFluide.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'config'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Norme & Configurare Intervale</span>
        </button>

        <button
          onClick={() => setActiveTab('anomalii')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'anomalii'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Detecție Anomalii & Scurgeri</span>
          {alerte.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-terracotta-500 text-white">
              {alerte.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MONITORIZARE FLOTĂ & NIVEL ULEIURI */}
      {activeTab === 'flota' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm">
          {/* BARA DE FILTRARE & CĂUTARE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-morning-100 rounded-2xl border border-morning-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Căutare utilaj, număr intern, înmatriculare, tip ulei..."
                className="w-full bg-white border border-morning-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-sapphire-900 font-bold focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs flex-wrap">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="TOATE">Toate Stările</option>
                <option value="DEPASITE">🔴 Doar Schimburi Depășite</option>
                <option value="AVERTIZARE">⚠️ Doar În Prag Avertizare</option>
                <option value="OK">✅ Doar În Grafic (OK)</option>
              </select>

              <select
                value={selectedTipLichidFilter}
                onChange={(e) => setSelectedTipLichidFilter(e.target.value)}
                className="bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="">Toate Tipurile de Lubrifiant</option>
                <option value="ULEI_MOTOR">Ulei Motor</option>
                <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
              </select>
            </div>
          </div>

          {/* TABEL CENTRALIZATOR STARE ULEIURI */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Utilaj / Vehicul</th>
                  <th className="p-3">Tip Lubrifiant</th>
                  <th className="p-3 font-mono">Ultimul Schimb</th>
                  <th className="p-3 font-mono">Rulaj Curent / Limită</th>
                  <th className="p-3">Consum Interval</th>
                  <th className="p-3">Stare Schimb</th>
                  <th className="p-3 text-right">Acțiuni Operative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {fluideFiltrate.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sage-500 font-medium">
                      Nu s-au găsit înregistrări conform filtrelor aplicate.
                    </td>
                  </tr>
                ) : (
                  fluideFiltrate.map((f: any, idx: number) => {
                    const limit = f.limitInterval || (f.tipMasurare === 'MTH' ? 250 : 15000);
                    const pct = Math.min(100, Math.round((f.rulajDeLaUltimulSchimb / limit) * 100));

                    return (
                      <tr key={idx} className={`hover:bg-morning-50 transition ${f.esteDepasit ? 'bg-roseash-50/60' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className="p-1.5 rounded-lg bg-morning-200 text-sapphire-800">
                              <Truck className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="font-black text-sapphire-900 block text-xs">{f.vehiculNumarIntern}</span>
                              <span className="text-[10px] text-sage-600 block font-medium">
                                {f.vehiculMarca} {f.vehiculModel} ({f.vehiculInmatriculare})
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-lg bg-sapphire-50 border border-sapphire-200 text-sapphire-900 font-bold text-[11px]">
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
                        <td className="p-3 font-mono">
                          <span className={`font-bold ${f.esteDepasit ? 'text-terracotta-600' : 'text-slate-800'}`}>
                            {f.rulajDeLaUltimulSchimb} {f.tipMasurare}
                          </span>
                          <span className="text-sage-500 text-[10px] block">/ {limit} {f.tipMasurare}</span>
                        </td>
                        <td className="p-3">
                          <div className="w-28 bg-morning-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                f.esteDepasit ? 'bg-terracotta-500' : f.esteInPragAvertizare ? 'bg-amber-500' : 'bg-sage-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-mono text-sage-600 font-bold mt-0.5 block">{pct}% consumat</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1 w-fit ${
                            f.esteDepasit ? 'bg-roseash-200 text-terracotta-700' :
                            f.esteInPragAvertizare ? 'bg-amber-100 text-amber-800' :
                            'bg-sage-100 text-sage-700'
                          }`}>
                            {f.esteDepasit ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-terracotta-600" />
                                <span>DEPĂȘIT</span>
                              </>
                            ) : f.esteInPragAvertizare ? (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>ÎN PRAG</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-sage-600" />
                                <span>ÎN GRAFIC</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenCompletare(f.vehiculId, f.tipLichid)}
                              className="px-3 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1"
                              title="Înregistrează completare rapidă de ulei"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Completare</span>
                            </button>

                            <a
                              href={`/comenzi-lucru?vehiculId=${f.vehiculId}`}
                              className="px-2.5 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 font-bold text-xs transition border border-morning-300"
                              title="Deschide comandă de lucru pentru revizie completă"
                            >
                              Revizie
                            </a>
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

      {/* TAB 2: NORME & CONFIGURARE INTERVALE */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          {/* SELECTOR UTILAJ INTEGRAT */}
          <VehicleSelector
            selectedId={selectedVehiculId}
            onSelect={(v) => setSelectedVehiculId(v.id)}
            vehicule={vehicule}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 pleasant-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-morning-200 pb-2">
                <h2 className="text-base font-bold text-sapphire-900">Configurare Normă Nouă</h2>
                <p className="text-xs text-sage-600 font-medium">Setare intervale recomandate de producător</p>
              </div>

              <form onSubmit={handleSalveazaConfig} className="space-y-3 text-xs">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Utilaj Selectat:</label>
                  <input
                    type="text"
                    disabled
                    value={currentVehicul ? `${currentVehicul.numarIntern} (${currentVehicul.numarInmatriculare})` : 'Alege utilajul de sus'}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Lubrifiant / Fluid:</label>
                  <select
                    value={cfgTipLichid}
                    onChange={(e) => setCfgTipLichid(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="ULEI_MOTOR">Ulei Motor</option>
                    <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                    <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                    <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                    <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                    <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
                  </select>
                </div>

                <div className="p-3.5 bg-morning-100 rounded-xl border border-morning-200 space-y-2">
                  <p className="font-bold text-sapphire-900 text-xs">1. Limite Schimb Standard:</p>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Interval mTH (Ore):</label>
                    <input
                      type="number"
                      value={cfgIntervalMth}
                      onChange={(e) => setCfgIntervalMth(Number(e.target.value))}
                      className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Interval KM:</label>
                    <input
                      type="number"
                      value={cfgIntervalKm}
                      onChange={(e) => setCfgIntervalKm(Number(e.target.value))}
                      className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Interval Luni (Timp):</label>
                    <input
                      type="number"
                      value={cfgIntervalLuni}
                      onChange={(e) => setCfgIntervalLuni(Number(e.target.value))}
                      className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-roseash-50 rounded-xl border border-roseash-200 space-y-2">
                  <p className="font-bold text-terracotta-700 text-xs">2. Marjă Avertizare Înainte:</p>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Avertizare mTH Înainte:</label>
                    <input
                      type="number"
                      value={cfgPragMth}
                      onChange={(e) => setCfgPragMth(Number(e.target.value))}
                      className="w-full bg-white border border-roseash-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Avertizare KM Înainte:</label>
                    <input
                      type="number"
                      value={cfgPragKm}
                      onChange={(e) => setCfgPragKm(Number(e.target.value))}
                      className="w-full bg-white border border-roseash-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Avertizare Luni Înainte:</label>
                    <input
                      type="number"
                      value={cfgPragLuni}
                      onChange={(e) => setCfgPragLuni(Number(e.target.value))}
                      className="w-full bg-white border border-roseash-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20 transition"
                >
                  Salvează Regulă Interval
                </button>
              </form>
            </div>

            <div className="md:col-span-2 pleasant-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-morning-200 pb-2">
                <h2 className="text-base font-bold text-sapphire-900">
                  Norme Active pe Utilajul {currentVehicul?.numarIntern || ''} ({statusSchimburi.length})
                </h2>
                <p className="text-xs text-sage-600 font-medium">Situația consumului curent raportat la limitele setate</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
                  <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                    <tr>
                      <th className="p-3">Tip Lubrifiant</th>
                      <th className="p-3 font-mono">Interval Normat</th>
                      <th className="p-3 font-mono">Rulaj Curent</th>
                      <th className="p-3 font-mono">Prag Avertizare</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200">
                    {statusSchimburi.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-sage-500">
                          Nu există norme configurate manual pentru acest utilaj. Se aplică intervalele implicite de 250 mTH / 15.000 KM.
                        </td>
                      </tr>
                    ) : (
                      statusSchimburi.map((cfg: any, idx: number) => (
                        <tr key={idx} className="hover:bg-morning-50">
                          <td className="p-3 font-bold text-sapphire-900">{cfg.tipLichid?.replace(/_/g, ' ')}</td>
                          <td className="p-3 font-mono text-slate-800 font-semibold">
                            {cfg.intervalMth ? `${cfg.intervalMth} mTH` : `${cfg.intervalKm} KM`}
                          </td>
                          <td className="p-3 font-mono font-bold text-sapphire-700">
                            {cfg.rulajCurent} {cfg.tipMasurare}
                          </td>
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETECȚIE ANOMALII & SCURGERI */}
      {activeTab === 'anomalii' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-morning-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-terracotta-500" />
                <span>Centralizator Alerte Mentenanță & Scurgeri Ulei</span>
              </h2>
              <p className="text-xs text-sage-600 font-medium">
                Algoritmul monitorizează depășirile de intervale și completările anormale de ulei pe termen scurt
              </p>
            </div>
          </div>

          {alerte.length === 0 ? (
            <div className="p-8 text-center bg-morning-100 rounded-2xl space-y-2">
              <ShieldCheck className="w-10 h-10 text-sapphire-500 mx-auto" />
              <h3 className="font-extrabold text-sapphire-900 text-sm">Nu există alerte active în flotă!</h3>
              <p className="text-xs text-sage-600">Toate intervalele și completările de ulei se încadrează în limitele normale admise.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerte.map((a: any) => (
                <div key={a.id} className="p-4 rounded-2xl bg-white border-2 border-roseash-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-terracotta-500 text-white font-extrabold text-[10px] uppercase">
                        {a.categorieText || '🚨 Alertă Activă'}
                      </span>
                      <span className="font-extrabold text-sapphire-900 text-sm">🚜 {a.vehiculNumar || 'Utilaj'}</span>
                      <span className="text-xs text-slate-700 font-bold">• {a.titlu}</span>
                    </div>
                    <p className="text-xs text-terracotta-700 font-bold">{a.mesaj}</p>
                    <p className="text-[11px] text-sage-600 font-mono">
                      {a.modCalcul || (a.dataReferinta ? `Data referință: ${new Date(a.dataReferinta).toLocaleDateString('ro-RO')}` : '')}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenCompletare(a.vehiculId, a.tipLichid)}
                      className="px-3 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Droplets className="w-3.5 h-3.5 text-sapphire-600" />
                      <span>Completare Nivel</span>
                    </button>

                    <button
                      onClick={() => setSolvingAlerta(a)}
                      className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 whitespace-nowrap"
                    >
                      Rezolvă Alertă
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL RAPID: ÎNREGISTRARE COMPLETĂRI ULEI (TOP-UP) */}
      {showCompletareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">Înregistrare Completare Ulei (Top-up)</h3>
                  <p className="text-[11px] text-sage-600 font-medium">Scădere automată din stocul de lubrifianți</p>
                </div>
              </div>
              <button
                onClick={() => setShowCompletareModal(false)}
                className="text-sage-500 hover:text-sapphire-900 p-1 rounded-lg hover:bg-morning-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AVERTIZARE PENTRU REVIZIE COMPLETĂ */}
            <div className="p-3 bg-sapphire-50 border border-sapphire-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-600 font-medium">
                Schimbați și filtrele (revizie completă)?
              </span>
              <a
                href={`/comenzi-lucru?vehiculId=${selectedVehiculId}`}
                className="px-3 py-1 bg-sapphire-500 text-white rounded-lg font-bold text-[11px] hover:bg-sapphire-600 whitespace-nowrap"
              >
                Deschide Comandă de Lucru →
              </a>
            </div>

            <form onSubmit={handleIesireUlei} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Utilaj Destinație:</label>
                  <select
                    value={selectedVehiculId}
                    onChange={(e) => setSelectedVehiculId(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {vehicule.map((v) => (
                      <option key={v.id} value={v.id}>
                        🚜 {v.numarIntern} ({v.numarInmatriculare}) - {v.marca}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Lubrifiant / Fluid:</label>
                  <select
                    value={iesireTipLichid}
                    onChange={(e) => setIesireTipLichid(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="ULEI_MOTOR">Ulei Motor</option>
                    <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                    <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                    <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                    <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                    <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Articol Ulei din Stoc:</label>
                  <select
                    value={selectedArticolStocId}
                    onChange={(e) => {
                      setSelectedArticolStocId(e.target.value);
                      const item = stocUleiuri.find((s: any) => s.id === e.target.value);
                      if (item) setIesireMarca(item.marcaUlei || item.denumire);
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  >
                    {stocUleiuri.length === 0 ? (
                      <option value="">Fără lubrifianți în stoc (Se introduce manual)</option>
                    ) : (
                      stocUleiuri.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          🛢️ {s.denumire} (Stoc: {s.stocCurent} {s.unitateMasura || 'L'} • {s.pretUnitar} RON/L)
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cantitate Completată (Litri): *</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={iesireCantitate}
                    onChange={(e) => setIesireCantitate(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Index Contor Utilaj la Completare:</label>
                  <input
                    type="number"
                    value={iesireContor}
                    onChange={(e) => setIesireContor(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Mecanic / Responsabil: *</label>
                  <select
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
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Notițe Atelier:</label>
                <input
                  value={iesireObservatii}
                  onChange={(e) => setIesireObservatii(e.target.value)}
                  placeholder="ex: Completat 2L ulei motor înainte de plecare pe șantier"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowCompletareModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  Salvează Completarea & Scade din Stoc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REZOLVARE ALERTĂ */}
      {solvingAlerta && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-lg font-bold text-sapphire-900">Remediere Alertă ({solvingAlerta.vehiculNumar || solvingAlerta.titlu})</h3>
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
                  placeholder="ex: Schimbat garnitură baie ulei, efectuat revizie completă"
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
