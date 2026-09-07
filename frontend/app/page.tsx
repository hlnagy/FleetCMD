"use client";

import { API_BASE_URL } from '@/lib/api';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Truck, AlertTriangle, Droplets, AlertCircle, Plus, CheckCircle2, RefreshCw,
  Filter, Edit3, Trash2, Clock, DollarSign, TrendingUp, ShieldAlert, ArrowUpRight,
  Wrench, X, Calendar, Layers, UserCheck, Users, Search, Phone, Settings,
  Sparkles, Sliders, Check, Eye, EyeOff, LayoutGrid, Zap, ShieldCheck,
  Disc, Package, FileText, ArrowRight, Activity, ChevronRight, BarChart3,
  Flame, Gauge, RefreshCcw, BellRing, ArrowDownRight, ExternalLink, Crown
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';
import { useAuth } from '@/lib/AuthContext';

// WIDGET CONFIGURATION INTERFACE
interface WidgetConfig {
  showKpiMetrics: boolean;
  showQuickActions: boolean;
  showAlertsCenter: boolean;
  showWorkOrders: boolean;
  showMaintenanceTimeline: boolean;
  showFleetTelemetry: boolean;
  showEFacturaStream: boolean;
  showTireMatrix: boolean;
  showInventoryWarranty: boolean;
  showWorkshopTeam: boolean;
  layoutMode: 'comfortable' | 'compact';
}

// HELPER PENTRU PICTOGROME VECTORIALE PROFESIONALE (SVG)
const getPresetIcon = (key: string, isActive: boolean = false) => {
  switch (key) {
    case 'executive':
      return <Crown className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-amber-600'}`} />;
    case 'workshop':
      return <Wrench className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-sapphire-600'}`} />;
    case 'warehouse':
      return <Package className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-emerald-600'}`} />;
    case 'tires':
      return <Disc className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-indigo-600'}`} />;
    case 'custom':
    default:
      return <Sliders className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-600'}`} />;
  }
};

// DEFAULT PRESET CONFIGURATIONS
const PRESETS: Record<string, { name: string; desc: string; config: WidgetConfig }> = {
  executive: {
    name: 'Director Flotă / Executiv',
    desc: 'Privire de ansamblu strategică: KPI-uri majore, costuri, telemetrie, alerte și e-Factura',
    config: {
      showKpiMetrics: true,
      showQuickActions: true,
      showAlertsCenter: true,
      showWorkOrders: true,
      showMaintenanceTimeline: true,
      showFleetTelemetry: true,
      showEFacturaStream: true,
      showTireMatrix: false,
      showInventoryWarranty: true,
      showWorkshopTeam: false,
      layoutMode: 'comfortable',
    },
  },
  workshop: {
    name: 'Șef Atelier & Dispecerat (CMMS)',
    desc: 'Focus operațional: Comenzi de lucru, revizii preventive, mecanici, anomalii și completări fluide',
    config: {
      showKpiMetrics: true,
      showQuickActions: true,
      showAlertsCenter: true,
      showWorkOrders: true,
      showMaintenanceTimeline: true,
      showFleetTelemetry: true,
      showEFacturaStream: false,
      showTireMatrix: true,
      showInventoryWarranty: false,
      showWorkshopTeam: true,
      layoutMode: 'comfortable',
    },
  },
  warehouse: {
    name: 'Magazie, Piese & e-Factura',
    desc: 'Supply Chain: Facturi ANAF, alerte stoc minim, piese serializate în garanție și recepții marfă',
    config: {
      showKpiMetrics: true,
      showQuickActions: true,
      showAlertsCenter: true,
      showWorkOrders: false,
      showMaintenanceTimeline: false,
      showFleetTelemetry: false,
      showEFacturaStream: true,
      showTireMatrix: false,
      showInventoryWarranty: true,
      showWorkshopTeam: false,
      layoutMode: 'comfortable',
    },
  },
  tires: {
    name: 'Gestiune Anvelope & Siguranță',
    desc: 'Monitorizare tren rulare: Uzuri >30%, profile mm, permutări axe și alerte ITP/RCA',
    config: {
      showKpiMetrics: true,
      showQuickActions: true,
      showAlertsCenter: true,
      showWorkOrders: false,
      showMaintenanceTimeline: true,
      showFleetTelemetry: true,
      showEFacturaStream: false,
      showTireMatrix: true,
      showInventoryWarranty: false,
      showWorkshopTeam: false,
      layoutMode: 'comfortable',
    },
  },
  custom: {
    name: 'Personalizat (Configurare Proprie)',
    desc: 'Aspect 100% individual configurat după preferințele tale',
    config: {
      showKpiMetrics: true,
      showQuickActions: true,
      showAlertsCenter: true,
      showWorkOrders: true,
      showMaintenanceTimeline: true,
      showFleetTelemetry: true,
      showEFacturaStream: true,
      showTireMatrix: true,
      showInventoryWarranty: true,
      showWorkshopTeam: true,
      layoutMode: 'comfortable',
    },
  },
};

export default function MasterDashboardPage() {
  const { user: authUser } = useAuth();

  // STATE: DATA
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [alerteCentralizate, setAlerteCentralizate] = useState<any[]>([]);
  const [comenziLucru, setComenziLucru] = useState<any[]>([]);
  const [sarciniMentenanta, setSarciniMentenanta] = useState<any[]>([]);
  const [mecanici, setMecanici] = useState<any[]>([]);
  const [istoricServicii, setIstoricServicii] = useState<any[]>([]);
  const [articoleStoc, setArticoleStoc] = useState<any[]>([]);
  const [anvelope, setAnvelope] = useState<any[]>([]);
  const [facturi, setFacturi] = useState<any[]>([]);
  const [eFacturaConfig, setEFacturaConfig] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // STATE: PERSONALIZATION & PRESETS
  const [activePreset, setActivePreset] = useState<string>('executive');
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>(PRESETS.executive.config);
  const [showCustomizerModal, setShowCustomizerModal] = useState(false);

  // STATE: FILTERS & SEARCH
  const [searchVehicul, setSearchVehicul] = useState('');
  const [selectedCategorieFilter, setSelectedCategorieFilter] = useState('');
  const [searchQueryServicii, setSearchQueryServicii] = useState('');
  const [selectedMecanicFilter, setSelectedMecanicFilter] = useState('');

  // STATE: QUICK ACTION MODALS
  const [showQuickComandaModal, setShowQuickComandaModal] = useState(false);
  const [showQuickUleiModal, setShowQuickUleiModal] = useState(false);
  const [showAddMecanicModal, setShowAddMecanicModal] = useState(false);

  // QUICK COMANDA STATE
  const [quickVehiculId, setQuickVehiculId] = useState('');
  const [quickNumarComanda, setQuickNumarComanda] = useState('');
  const [quickMecanic, setQuickMecanic] = useState('');
  const [quickObservatii, setQuickObservatii] = useState('');
  const [quickContor, setQuickContor] = useState(0);

  // QUICK ULEI STATE
  const [quickUleiVehiculId, setQuickUleiVehiculId] = useState('');
  const [quickUleiTip, setQuickUleiTip] = useState('ULEI_MOTOR');
  const [quickUleiCantitate, setQuickUleiCantitate] = useState(5);
  const [quickUleiMecanic, setQuickUleiMecanic] = useState('');
  const [quickUleiObservatii, setQuickUleiObservatii] = useState('');

  // QUICK MECANIC STATE
  const [newMecanicNume, setNewMecanicNume] = useState('');
  const [newMecanicFunctie, setNewMecanicFunctie] = useState('Mecanic Atelier');
  const [newMecanicTelefon, setNewMecanicTelefon] = useState('');

  // QUICK SYNC STATE
  const [quickSyncing, setQuickSyncing] = useState(false);
  const [quickSyncMessage, setQuickSyncMessage] = useState<string | null>(null);

  // LOAD PERSONALIZATION FROM LOCALSTORAGE
  useEffect(() => {
    try {
      const savedPreset = localStorage.getItem('fleetcmd_dashboard_preset');
      const savedConfig = localStorage.getItem('fleetcmd_dashboard_config');
      if (savedPreset && PRESETS[savedPreset]) {
        setActivePreset(savedPreset);
      }
      if (savedConfig) {
        setWidgetConfig(JSON.parse(savedConfig));
      }
    } catch (e) {
      console.warn('Nu s-au putut încărca preferințele de dashboard din localStorage');
    }
  }, []);

  // SAVE PERSONALIZATION
  const updatePreset = (presetKey: string) => {
    setActivePreset(presetKey);
    const newConfig = PRESETS[presetKey].config;
    setWidgetConfig(newConfig);
    try {
      localStorage.setItem('fleetcmd_dashboard_preset', presetKey);
      localStorage.setItem('fleetcmd_dashboard_config', JSON.stringify(newConfig));
    } catch (e) {}
  };

  const toggleWidget = (key: keyof WidgetConfig) => {
    setActivePreset('custom');
    setWidgetConfig((prev) => {
      const updated = {
        ...prev,
        [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
      };
      try {
        localStorage.setItem('fleetcmd_dashboard_preset', 'custom');
        localStorage.setItem('fleetcmd_dashboard_config', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const toggleLayoutMode = () => {
    setWidgetConfig((prev) => {
      const updated = {
        ...prev,
        layoutMode: (prev.layoutMode === 'comfortable' ? 'compact' : 'comfortable') as 'comfortable' | 'compact',
      };
      try {
        localStorage.setItem('fleetcmd_dashboard_config', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // FETCH ALL MASTER DATA
  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      const [
        resVeh, resAlerts, resComenzi, resSarcini, resMec,
        resIstoric, resStoc, resAnvelope, resFact, resEfactConfig
      ] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/vehicule`),
        fetch(`${API_BASE_URL}/anomalii/alerte-centralizate`),
        fetch(`${API_BASE_URL}/mentenanta/comenzi-lucru`),
        fetch(`${API_BASE_URL}/mentenanta/sarcini`),
        fetch(`${API_BASE_URL}/mentenanta/mecanici`),
        fetch(`${API_BASE_URL}/mentenanta/istoric-servicii-mecanic`),
        fetch(`${API_BASE_URL}/stocuri-garantii/articole`),
        fetch(`${API_BASE_URL}/anvelope`),
        fetch(`${API_BASE_URL}/efactura/facturi`),
        fetch(`${API_BASE_URL}/efactura/config`),
      ]);

      if (resVeh.status === 'fulfilled' && resVeh.value.ok) setVehicule(await resVeh.value.json());
      if (resAlerts.status === 'fulfilled' && resAlerts.value.ok) setAlerteCentralizate(await resAlerts.value.json());
      if (resComenzi.status === 'fulfilled' && resComenzi.value.ok) setComenziLucru(await resComenzi.value.json());
      if (resSarcini.status === 'fulfilled' && resSarcini.value.ok) setSarciniMentenanta(await resSarcini.value.json());
      if (resMec.status === 'fulfilled' && resMec.value.ok) setMecanici(await resMec.value.json());
      if (resIstoric.status === 'fulfilled' && resIstoric.value.ok) setIstoricServicii(await resIstoric.value.json());
      if (resStoc.status === 'fulfilled' && resStoc.value.ok) setArticoleStoc(await resStoc.value.json());
      if (resAnvelope.status === 'fulfilled' && resAnvelope.value.ok) setAnvelope(await resAnvelope.value.json());
      if (resFact.status === 'fulfilled' && resFact.value.ok) setFacturi(await resFact.value.json());
      if (resEfactConfig.status === 'fulfilled' && resEfactConfig.value.ok) setEFacturaConfig(await resEfactConfig.value.json());
    } catch (err) {
      console.warn('Eroare la încărcarea datelor master dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // COMPUTED KPI METRICS
  const kpis = useMemo(() => {
    const totalVehicule = vehicule.length;
    const vehiculeInReparatie = vehicule.filter((v) => v.stare === 'IN_REPARATIE').length;
    const vehiculeActive = vehicule.filter((v) => v.stare === 'ACTIV' || !v.stare).length;

    const alerteCritice = alerteCentralizate.filter((a) => a.urgenta === 'CRITIC').length;
    const alerteAvertizari = alerteCentralizate.filter((a) => a.urgenta === 'AVERTIZARE').length;

    const comenziInLucru = comenziLucru.filter((c) => c.stare === 'IN_LUCRU').length;
    const valoareComenziInLucru = comenziLucru
      .filter((c) => c.stare === 'IN_LUCRU')
      .reduce((sum, c) => sum + (c.elementeComanda || []).reduce((subSum: number, el: any) => subSum + (el.costTotal || 0), 0), 0);

    const facturiNeprocesate = facturi.filter(
      (f) => f.stare === 'NEPROCESAT' || f.stare === 'IMPORTAT_PARȚIAL' || (f.articole && f.articole.some((a: any) => a.stare === 'NEPROCESAT'))
    ).length;

    const valoareTotalaFacturi = facturi.reduce((sum, f) => sum + (f.valoareTotala || 0), 0);

    const stocuriCritice = articoleStoc.filter((a) => (a.stocCurent || 0) <= (a.stocMinim || 0)).length;

    const anvelopeUzuraCritica = anvelope.filter((anv) => (anv.adancimeCurentaMm || 0) <= 4).length;

    return {
      totalVehicule,
      vehiculeActive,
      vehiculeInReparatie,
      alerteCritice,
      alerteAvertizari,
      comenziInLucru,
      valoareComenziInLucru,
      facturiNeprocesate,
      valoareTotalaFacturi,
      stocuriCritice,
      anvelopeUzuraCritica,
    };
  }, [vehicule, alerteCentralizate, comenziLucru, facturi, articoleStoc, anvelope]);

  // QUICK FORCE SYNC ANAF
  const handleTriggerQuickSync = async () => {
    try {
      setQuickSyncing(true);
      setQuickSyncMessage('Inițiere sincronizare ANAF SPV...');
      const res = await fetch(`${API_BASE_URL}/efactura/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zile: 60 }),
      });
      if (res.ok) {
        setQuickSyncMessage('Sincronizare pornită în fundal! Se verifică...');
        setTimeout(() => {
          fetchAllData();
          setQuickSyncing(false);
          setQuickSyncMessage('Finalizat!');
          setTimeout(() => setQuickSyncMessage(null), 3000);
        }, 3000);
      } else {
        const err = await res.json();
        setQuickSyncMessage(`Eroare: ${err.message || 'Eșuat'}`);
        setQuickSyncing(false);
      }
    } catch (e) {
      setQuickSyncMessage('Eroare de conexiune.');
      setQuickSyncing(false);
    }
  };

  // HANDLER: QUICK COMANDĂ CREATE
  const handleQuickCreateComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVehiculId) return;
    try {
      const v = vehicule.find((item) => item.id === quickVehiculId);
      const generatedNumar = quickNumarComanda || `CMD-${Date.now().toString().slice(-6)}`;
      const res = await fetch(`${API_BASE_URL}/mentenanta/comenzi-lucru`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numarComanda: generatedNumar,
          vehiculId: quickVehiculId,
          mecanicResponsabil: quickMecanic || (mecanici[0]?.nume || 'Mecanic Atelier'),
          valoareContorLaExecutie: Number(quickContor) || (v?.valoareContorCurent || 0),
          observatii: quickObservatii || 'Deschis rapid din Master Dashboard',
          elemente: [],
        }),
      });

      if (res.ok) {
        alert(`Comanda de Lucru ${generatedNumar} a fost deschisă cu succes!`);
        setShowQuickComandaModal(false);
        setQuickNumarComanda('');
        setQuickObservatii('');
        fetchAllData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la crearea comenzii de lucru.');
    }
  };

  // HANDLER: QUICK ULEI CREATE
  const handleQuickAddUlei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUleiVehiculId) return;
    try {
      const v = vehicule.find((item) => item.id === quickUleiVehiculId);
      const res = await fetch(`${API_BASE_URL}/anomalii/completare-ulei`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: quickUleiVehiculId,
          tipLichid: quickUleiTip,
          cantitateLitri: Number(quickUleiCantitate),
          valoareContor: v?.valoareContorCurent || 0,
          mecanic: quickUleiMecanic || (mecanici[0]?.nume || 'Mecanic Atelier'),
          observatii: quickUleiObservatii || 'Completare înregistrată rapid din Dashboard',
        }),
      });

      if (res.ok) {
        alert('Completarea de lichid / ulei a fost salvată cu succes!');
        setShowQuickUleiModal(false);
        setQuickUleiObservatii('');
        fetchAllData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la înregistrarea uleiului.');
    }
  };

  // HANDLER: CREATE MECANIC
  const handleCreateMecanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMecanicNume) return;
    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/mecanici`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: newMecanicNume,
          functie: newMecanicFunctie,
          telefon: newMecanicTelefon,
        }),
      });

      if (res.ok) {
        alert('Mecanic adăugat cu succes în echipă!');
        setShowAddMecanicModal(false);
        setNewMecanicNume('');
        fetchAllData();
      }
    } catch (e) {
      alert('Eroare la salvare mecanic.');
    }
  };

  // FILTERED VEHICULES
  const filteredVehicule = useMemo(() => {
    return vehicule.filter((v) => {
      const matchCat = selectedCategorieFilter ? v.categorieEnum === selectedCategorieFilter : true;
      const q = searchVehicul.toLowerCase().trim();
      const matchSearch =
        !q ||
        v.numarIntern?.toLowerCase().includes(q) ||
        v.numarInmatriculare?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [vehicule, selectedCategorieFilter, searchVehicul]);

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP COMMAND HEADER: GREETING, PRESET SELECTOR & PERSONALIZATION BUTTON */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-3xl border border-morning-200 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sapphire-50 border border-sapphire-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sapphire-900">
              FleetCMD Master Command Center • 24/7 Live
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-sapphire-900 tracking-tight flex items-center space-x-3">
            <span>Panou de Control Central</span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold font-mono uppercase">
              {authUser?.rol || 'OPERATOR'}
            </span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">
            Bună ziua, <strong className="text-sapphire-900">{authUser?.nume || 'Utilizator'}</strong>! Sistemul este operațional. Toate modulele sunt sincronizate în timp real.
          </p>
        </div>

        {/* PRESET SWITCHER & CUSTOMIZE BUTTON */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center bg-morning-100 p-1 rounded-2xl border border-morning-200 overflow-x-auto max-w-full">
            {Object.entries(PRESETS).map(([key, p]) => {
              const isActive = activePreset === key;
              return (
                <button
                  key={key}
                  onClick={() => updatePreset(key)}
                  title={p.desc}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-sapphire-600 text-white shadow-xs'
                      : 'text-sage-700 hover:text-sapphire-900 hover:bg-white/60'
                  }`}
                >
                  {getPresetIcon(key, isActive)}
                  <span className="hidden sm:inline">{p.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAllData}
            title="Reîmprospătează toate datele din baza de date"
            className="p-2.5 rounded-xl bg-white hover:bg-morning-100 border border-morning-200 text-sapphire-900 shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-sapphire-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Personalizează Modal Trigger */}
          <button
            onClick={() => setShowCustomizerModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sapphire-600 to-indigo-600 hover:from-sapphire-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md shadow-sapphire-500/20 transition cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Personalizează</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. QUICK ACTION LAUNCHPAD: FAST ACCESS BUTTONS */}
      {/* ========================================================================= */}
      {widgetConfig.showQuickActions && (
        <div className="bg-gradient-to-r from-sapphire-900 via-indigo-900 to-slate-900 p-4 sm:p-5 rounded-3xl text-white shadow-xl shadow-sapphire-950/20 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-sapphire-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Lansator Rapid de Măsuri Operaționale</span>
              </span>
              <p className="text-sm font-extrabold text-white">Acțiuni Frecvente & Înregistrări Rapide</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowQuickComandaModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Comandă de Lucru</span>
              </button>

              <button
                onClick={() => setShowQuickUleiModal(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md transition cursor-pointer"
              >
                <Droplets className="w-4 h-4" />
                <span>Completare Ulei</span>
              </button>

              <button
                onClick={handleTriggerQuickSync}
                disabled={quickSyncing}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-md transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCcw className={`w-3.5 h-3.5 text-cyan-300 ${quickSyncing ? 'animate-spin' : ''}`} />
                <span>{quickSyncMessage || 'Sync ANAF e-Factura'}</span>
              </button>

              <Link
                href="/efactura?tab=manual"
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md transition"
              >
                <Package className="w-4 h-4" />
                <span>Recepție Marfă</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. KEY PERFORMANCE INDICATORS (KPI HERO STRIP) */}
      {/* ========================================================================= */}
      {widgetConfig.showKpiMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1: VEHICULE */}
          <Link href="/ansambluri" className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-sage-600">Parc Auto & Flotă</span>
              <div className="w-9 h-9 rounded-xl bg-sapphire-50 border border-sapphire-200 text-sapphire-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black text-sapphire-900 font-mono">{kpis.totalVehicule}</span>
                <span className="text-xs font-bold text-emerald-600 font-mono">({kpis.vehiculeActive} active)</span>
              </div>
              <p className="text-[11px] text-sage-600 font-medium mt-0.5">
                {kpis.vehiculeInReparatie > 0 ? (
                  <span className="text-terracotta-600 font-bold">{kpis.vehiculeInReparatie} utilaje în reparație</span>
                ) : (
                  'Flotă 100% disponibilă'
                )}
              </p>
            </div>
          </Link>

          {/* KPI 2: COMENZI DE LUCRU CMMS */}
          <Link href="/comenzi-lucru" className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex flex-col justify-between group border-l-4 border-l-sapphire-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-sapphire-700">Comenzi de Lucru Active</span>
              <div className="w-9 h-9 rounded-xl bg-sapphire-100 text-sapphire-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black text-sapphire-900 font-mono">{kpis.comenziInLucru}</span>
                <span className="text-xs font-bold text-sage-600 font-mono">în lucru</span>
              </div>
              <p className="text-[11px] text-sage-600 font-medium mt-0.5 font-mono">
                Valoare devize: <strong>{kpis.valoareComenziInLucru.toLocaleString('ro-RO')} RON</strong>
              </p>
            </div>
          </Link>

          {/* KPI 3: ALERTE ACTIVE & RISC */}
          <Link href="/alerte" className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex flex-col justify-between group border-l-4 border-l-terracotta-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-terracotta-600">Alerte & Atenționări</span>
              <div className="w-9 h-9 rounded-xl bg-roseash-100 border border-roseash-300 text-terracotta-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black text-terracotta-600 font-mono">{alerteCentralizate.length}</span>
                {kpis.alerteCritice > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-roseash-200 text-terracotta-700 font-black font-mono">
                    {kpis.alerteCritice} CRITICE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-sage-600 font-medium mt-0.5">
                Expirări ITP/RCA, tahograf & scurgeri
              </p>
            </div>
          </Link>

          {/* KPI 4: E-FACTURA ANAF */}
          <Link href="/efactura" className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-sage-600">ANAF e-Factura</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-black text-sapphire-900 font-mono">{facturi.length}</span>
                <span className="text-xs font-bold text-amber-600 font-mono">({kpis.facturiNeprocesate} neprocesate)</span>
              </div>
              <p className="text-[11px] text-sage-600 font-medium mt-0.5 font-mono">
                Total: <strong>{kpis.valoareTotalaFacturi.toLocaleString('ro-RO')} RON</strong>
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SMART ALERTS RADAR: CRITICAL WARNINGS & ACTIONS */}
      {/* ========================================================================= */}
      {widgetConfig.showAlertsCenter && alerteCentralizate.length > 0 && (
        <div className="pleasant-card p-5 rounded-3xl border-2 border-roseash-300/80 bg-gradient-to-br from-roseash-50/50 to-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-terracotta-500 text-white flex items-center justify-center shadow-sm">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black text-sapphire-900 uppercase tracking-wide">
                  Centru de Alertare & Risc Imediat ({alerteCentralizate.length})
                </h3>
                <p className="text-[11px] text-sage-600">Necesită atenția dispeceratului sau a atelierului</p>
              </div>
            </div>

            <Link href="/alerte" className="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 flex items-center space-x-1">
              <span>Vezi toate alertele</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            {alerteCentralizate.slice(0, 3).map((a: any, idx: number) => {
              const isCrit = a.urgenta === 'CRITIC';
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex items-start justify-between space-x-2 transition ${
                    isCrit ? 'bg-roseash-100/90 border-roseash-300' : 'bg-amber-50/80 border-amber-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono ${
                        isCrit ? 'bg-terracotta-600 text-white' : 'bg-amber-500 text-slate-950'
                      }`}>
                        {a.urgenta || 'AVERTIZARE'}
                      </span>
                      <strong className="text-xs font-bold text-sapphire-900">{a.vehiculNumar || 'Flotă'}</strong>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{a.titlu}</p>
                    <p className="text-[10px] text-sage-600 leading-snug line-clamp-1">{a.mesaj}</p>
                  </div>
                  <Link
                    href={a.linkHref || '/alerte'}
                    className="shrink-0 p-1.5 rounded-lg bg-white shadow-2xs hover:bg-slate-100 text-sapphire-900 transition"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DUAL COLUMN: WORK ORDERS IN PROGRESS & MAINTENANCE TIMELINE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ACTIVE WORK ORDERS */}
        {widgetConfig.showWorkOrders && (
          <div className={`${widgetConfig.showMaintenanceTimeline ? 'lg:col-span-7' : 'lg:col-span-12'} pleasant-card p-5 sm:p-6 rounded-3xl space-y-4`}>
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-sapphire-100 text-sapphire-700 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-sapphire-900">Comenzi de Lucru & Procese Atelier</h3>
                  <p className="text-[11px] text-sage-600">Comenzi active în atelier, cu mecanici responsabili</p>
                </div>
              </div>

              <Link href="/comenzi-lucru" className="text-xs font-bold text-sapphire-600 hover:text-sapphire-700 flex items-center space-x-1">
                <span>Toate Comenzile ({comenziLucru.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {comenziLucru.filter((c) => c.stare === 'IN_LUCRU').length === 0 ? (
              <div className="p-8 text-center bg-morning-50 rounded-2xl border border-morning-200 text-sage-600 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-sapphire-900">Nu există comenzi de lucru deschise în acest moment.</p>
                <p className="text-[11px] text-sage-500 mt-1">Toate utilajele sunt operaționale pe șantiere.</p>
              </div>
            ) : (
              <div className="divide-y divide-morning-200">
                {comenziLucru
                  .filter((c) => c.stare === 'IN_LUCRU')
                  .slice(0, 4)
                  .map((c: any) => {
                    const totalCost = (c.elementeComanda || []).reduce((acc: number, el: any) => acc + (el.costTotal || 0), 0);
                    return (
                      <div key={c.id} className="py-3 flex items-center justify-between hover:bg-morning-50/80 px-2 rounded-xl transition">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-black font-mono text-sapphire-900">{c.numarComanda}</span>
                            <span className="px-2 py-0.5 rounded-full bg-sapphire-100 text-sapphire-800 text-[10px] font-bold font-mono">
                              {c.vehicul?.numarIntern || 'Utilaj'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 font-medium line-clamp-1">{c.observatii || 'Revizie / Reparație curentă'}</p>
                          <p className="text-[10px] text-sage-500 flex items-center space-x-2">
                            <span>Mecanic: <strong className="text-slate-700">{c.mecanicResponsabil}</strong></span>
                            <span>•</span>
                            <span>{new Date(c.dataDeschidere).toLocaleDateString('ro-RO')}</span>
                          </p>
                        </div>

                        <div className="text-right space-y-1">
                          <p className="text-xs font-mono font-black text-sapphire-900">{totalCost ? `${totalCost} RON` : 'Cost nefinalizat'}</p>
                          <Link
                            href={`/comenzi-lucru`}
                            className="inline-block text-[11px] font-bold text-sapphire-600 hover:underline"
                          >
                            Deschide deviz →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* RIGHT COLUMN: PREVENTIVE MAINTENANCE SCHEDULE */}
        {widgetConfig.showMaintenanceTimeline && (
          <div className={`${widgetConfig.showWorkOrders ? 'lg:col-span-5' : 'lg:col-span-12'} pleasant-card p-5 sm:p-6 rounded-3xl space-y-4`}>
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-periwinkle-100 text-periwinkle-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-sapphire-900">Mentenanță Preventivă</h3>
                  <p className="text-[11px] text-sage-600">Intervale MTH / KM & Revizii</p>
                </div>
              </div>

              <Link href="/mentenanta" className="text-xs font-bold text-periwinkle-700 hover:underline">
                Planuri ({sarciniMentenanta.length})
              </Link>
            </div>

            <div className="space-y-2.5">
              {sarciniMentenanta.slice(0, 4).map((s: any) => (
                <div key={s.id} className="p-3 rounded-2xl bg-morning-100/70 border border-morning-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sapphire-900">{s.nume}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white text-[10px] font-mono font-extrabold text-slate-700 border">
                      la {s.intervalRulaj} {s.tipMasurare}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-sage-600">
                    <span>Tip: {s.tipSarcina?.replace(/_/g, ' ')}</span>
                    <span className="font-mono">Ultimul: {s.ultimulRulajExecutie || 0} {s.tipMasurare}</span>
                  </div>
                </div>
              ))}

              {sarciniMentenanta.length === 0 && (
                <p className="text-center text-xs text-sage-500 py-4">Nu există sarcini preventive configurate.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. FLEET TELEMETRY & MASTER VEHICLE OVERVIEW TABLE */}
      {/* ========================================================================= */}
      {widgetConfig.showFleetTelemetry && (
        <div className="pleasant-card p-6 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-morning-200 pb-4">
            <div>
              <h3 className="text-base font-black text-sapphire-900 flex items-center space-x-2">
                <Truck className="w-5 h-5 text-sapphire-600" />
                <span>Registru Flotă & Telemetrie Utilaje</span>
              </h3>
              <p className="text-xs text-sage-600">Monitorizare contor ore funcționare (MTH) și kilometri (KM)</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={searchVehicul}
                  onChange={(e) => setSearchVehicul(e.target.value)}
                  placeholder="Caută utilaj, VIN, număr..."
                  className="bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-sapphire-900 font-bold focus:outline-none"
                />
              </div>

              <select
                value={selectedCategorieFilter}
                onChange={(e) => setSelectedCategorieFilter(e.target.value)}
                className="bg-morning-100 border border-morning-200 rounded-xl px-2.5 py-1.5 text-xs text-sapphire-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="">Toate Categoriile ({vehicule.length})</option>
                <option value="BASCULANTA">Basculantă</option>
                <option value="EXCAVATOR">Excavator</option>
                <option value="CAP_TRACTOR">Cap Tractor</option>
                <option value="REMORCA">Remorcă</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Număr Intern & Model</th>
                  <th className="p-3">Înmatriculare</th>
                  <th className="p-3">Categorie</th>
                  <th className="p-3 font-mono">Contor Curent</th>
                  <th className="p-3">Stare</th>
                  <th className="p-3 text-right">Fișă Tehnică</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {filteredVehicule.slice(0, 6).map((v) => (
                  <tr key={v.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-extrabold text-sapphire-900">
                      <Link href={`/fisa-tehnica?id=${v.id}`} className="hover:text-sapphire-600 transition flex items-center space-x-1.5">
                        <span>{v.numarIntern}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-sage-400" />
                      </Link>
                      <span className="text-[10px] text-sage-500 font-normal block">{v.marca} {v.model}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">{v.numarInmatriculare}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-morning-200 text-sapphire-900 border border-morning-300">
                        {v.categorieEnum}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-black text-sapphire-900">
                      {v.valoareContorCurent} {v.tipMasurare}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        v.stare === 'IN_REPARATIE'
                          ? 'bg-roseash-200 text-terracotta-700 border border-roseash-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}>
                        {v.stare || 'ACTIV'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/fisa-tehnica?id=${v.id}`}
                        className="px-3 py-1.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 font-bold text-xs transition border border-sapphire-200 inline-block"
                      >
                        Deschide Fișă
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DUAL COLUMN: ANAF E-FACTURA LIVE STREAM & INVENTORY/TIRE MATRIX */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ANAF E-FACTURA LIVE STREAM */}
        {widgetConfig.showEFacturaStream && (
          <div className="lg:col-span-6 pleasant-card p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-sapphire-900">ANAF e-Factura Stream</h3>
                  <p className="text-[11px] text-sage-600">Cele mai recente facturi descărcate din SPV</p>
                </div>
              </div>

              <Link href="/efactura" className="text-xs font-bold text-emerald-700 hover:underline">
                Toate ({facturi.length})
              </Link>
            </div>

            <div className="divide-y divide-morning-200">
              {facturi.slice(0, 4).map((f: any) => (
                <div key={f.id} className="py-2.5 flex items-center justify-between hover:bg-morning-50/80 px-2 rounded-xl transition">
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-sapphire-900 line-clamp-1">{f.numeVanzator}</p>
                    <p className="text-[10px] text-sage-500 font-mono">
                      {f.numarFactura} • {new Date(f.dataFactura).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-xs font-mono font-black text-sapphire-900">
                      {Number(f.valoareTotala || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {f.moneda || 'RON'}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      f.stare === 'NEPROCESAT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {f.stare}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TIRE MATRIX OR INVENTORY/WARRANTY */}
        {widgetConfig.showTireMatrix && (
          <div className="lg:col-span-6 pleasant-card p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
                  <Disc className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-sapphire-900">Gestiune Anvelope & Axe</h3>
                  <p className="text-[11px] text-sage-600">Stare profil mm & alerte uzură</p>
                </div>
              </div>

              <Link href="/anvelope" className="text-xs font-bold text-cyan-800 hover:underline">
                Harta Axelor ({anvelope.length})
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200 text-center">
                <span className="text-[10px] uppercase font-bold text-cyan-900 block">Total Anvelope</span>
                <span className="text-2xl font-black text-cyan-950 font-mono mt-1 block">{anvelope.length}</span>
                <span className="text-[10px] text-cyan-800 font-medium">montate & pe stoc</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-roseash-100/70 border border-roseash-300 text-center">
                <span className="text-[10px] uppercase font-bold text-terracotta-700 block">Profil Critic ≤4mm</span>
                <span className="text-2xl font-black text-terracotta-700 font-mono mt-1 block">
                  {kpis.anvelopeUzuraCritica}
                </span>
                <span className="text-[10px] text-terracotta-600 font-medium">necesită înlocuire</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              {anvelope.slice(0, 3).map((anv: any) => (
                <div key={anv.id} className="p-2.5 rounded-xl bg-morning-100/70 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-sapphire-900">{anv.marca} {anv.dimensiune}</span>
                    <span className="text-[10px] text-sage-500 block font-mono">{anv.codDot || 'DOT'}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-black ${
                      (anv.adancimeCurentaMm || 0) <= 4 ? 'text-terracotta-600' : 'text-emerald-700'
                    }`}>
                      {anv.adancimeCurentaMm} mm
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 8. WORKSHOP TEAM & MECANICI ACTIVITY */}
      {/* ========================================================================= */}
      {widgetConfig.showWorkshopTeam && (
        <div className="pleasant-card p-6 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-morning-200 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-sapphire-100 text-sapphire-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-sapphire-900">Echipa Atelierului & Mecanici</h3>
                <p className="text-xs text-sage-600">Lucrări finalizate și alocări curente</p>
              </div>
            </div>

            <button
              onClick={() => setShowAddMecanicModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adaugă Mecanic</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {mecanici.map((m: any) => (
              <div key={m.id} className="p-3.5 rounded-2xl bg-white border border-morning-200 hover:border-sapphire-300 transition">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-sapphire-900">{m.nume}</span>
                  <span className="px-2 py-0.5 rounded-full bg-sapphire-50 text-sapphire-800 text-[10px] font-mono font-bold">
                    {m.totalLucrari || 0} servicii
                  </span>
                </div>
                <p className="text-[11px] text-sage-600 mt-0.5">{m.functie || 'Mecanic Atelier'}</p>
                {m.telefon && (
                  <p className="text-[10px] font-mono text-sage-500 mt-1 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-sage-400" />
                    <span>{m.telefon}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PERSONALIZARE DASHBOARD & WIDGET CONFIGURATOR */}
      {/* ========================================================================= */}
      {showCustomizerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-morning-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-morning-200 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-sapphire-600 text-white flex items-center justify-center shadow-md shadow-sapphire-500/20">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-sapphire-900">Personalizează Panoul de Control</h3>
                  <p className="text-xs text-sage-600">Selectează ce carduri și secțiuni să apară pe panoul principal</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomizerModal(false)}
                className="p-1.5 rounded-xl hover:bg-morning-100 text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRESETS SELECTION */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-sapphire-900 tracking-wider block">
                Profiluri de Vizualizare (Preseturi)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(PRESETS).map(([key, p]) => {
                  const isSelected = activePreset === key;
                  return (
                    <button
                      key={key}
                      onClick={() => updatePreset(key)}
                      className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'bg-sapphire-50 border-2 border-sapphire-600 shadow-xs'
                          : 'bg-morning-50 border-morning-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-sapphire-600 text-white' : 'bg-white border border-morning-200'
                        }`}>
                          {getPresetIcon(key, isSelected)}
                        </div>
                        <strong className="text-xs text-sapphire-900">{p.name}</strong>
                      </div>
                      <p className="text-[10px] text-sage-600 mt-1 line-clamp-2">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TOGGLE INDIVIDUAL WIDGETS */}
            <div className="space-y-3 pt-2 border-t border-morning-200">
              <label className="text-xs font-black uppercase text-sapphire-900 tracking-wider block">
                Activare / Dezactivare Carduri & Module
              </label>

              <div className="space-y-2">
                {[
                  { key: 'showKpiMetrics', label: 'Bandă Indicatori Cheie (KPI)', desc: 'Telemetrie flotă, sumare comenzi service, e-Factura și alerte' },
                  { key: 'showQuickActions', label: 'Lansator Rapid de Măsuri', desc: 'Butoane de acces rapid pentru comenzi noi și completări fluide' },
                  { key: 'showAlertsCenter', label: 'Centru de Alertare & Risc Imediat', desc: 'Alerte critice ITP, RCA, Tahograf și scurgeri de ulei' },
                  { key: 'showWorkOrders', label: 'Comenzi de Lucru în Desfășurare', desc: 'Lucrări de service în derulare și costuri deviz' },
                  { key: 'showMaintenanceTimeline', label: 'Planificare Mentenanță Preventivă', desc: 'Revizii periodice programate după KM și MTH' },
                  { key: 'showFleetTelemetry', label: 'Registru Flotă & Telemetrie Utilaje', desc: 'Lista vehiculelor și monitorizarea contoarelor' },
                  { key: 'showEFacturaStream', label: 'Flux Live ANAF e-Factura', desc: 'Cele mai recente facturi SPV și recepții stoc' },
                  { key: 'showTireMatrix', label: 'Gestiune Anvelope & Axe', desc: 'Monitorizare uzură profil mm și diferențe între roți' },
                  { key: 'showWorkshopTeam', label: 'Echipa Atelierului & Mecanici', desc: 'Încărcarea mecanicilor și evidența lucrărilor' },
                ].map(({ key, label, desc }) => {
                  const isChecked = !!widgetConfig[key as keyof WidgetConfig];
                  return (
                    <div
                      key={key}
                      onClick={() => toggleWidget(key as keyof WidgetConfig)}
                      className="p-3 rounded-2xl bg-morning-50 hover:bg-morning-100/80 border border-morning-200 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-sapphire-900">{label}</p>
                        <p className="text-[10px] text-sage-600">{desc}</p>
                      </div>

                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                        isChecked ? 'bg-sapphire-600' : 'bg-slate-300'
                      }`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          isChecked ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-morning-200 flex justify-end">
              <button
                onClick={() => setShowCustomizerModal(false)}
                className="px-6 py-2.5 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-bold shadow-md shadow-sapphire-600/20"
              >
                Finalizează & Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK CREATE COMANDĂ DE LUCRU */}
      {/* ========================================================================= */}
      {showQuickComandaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-morning-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-black text-sapphire-900 flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-sapphire-600" />
                <span>Deschidere Rapidă Comandă de Lucru</span>
              </h3>
              <button onClick={() => setShowQuickComandaModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateComanda} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 font-bold block mb-1">Alege Utilajul / Vehiculul: *</label>
                <select
                  required
                  value={quickVehiculId}
                  onChange={(e) => setQuickVehiculId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="">Selectează Vehicul...</option>
                  {vehicule.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern} ({v.marca} {v.model}) - {v.valoareContorCurent} {v.tipMasurare}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 font-bold block mb-1">Mecanic Responsabil:</label>
                <select
                  value={quickMecanic}
                  onChange={(e) => setQuickMecanic(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {mecanici.map((m) => (
                    <option key={m.id} value={m.nume}>{m.nume} ({m.functie})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 font-bold block mb-1">Descriere Lucrare / Observații:</label>
                <textarea
                  rows={2}
                  value={quickObservatii}
                  onChange={(e) => setQuickObservatii(e.target.value)}
                  placeholder="ex: Schimb plăcuțe frână axă 1, verificare jocuri..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowQuickComandaModal(false)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-bold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-black shadow-md shadow-sapphire-600/20"
                >
                  Deschide Comandă
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK ADD ULEI / FLUID */}
      {/* ========================================================================= */}
      {showQuickUleiModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-morning-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-black text-sapphire-900 flex items-center space-x-2">
                <Droplets className="w-5 h-5 text-amber-500" />
                <span>Înregistrare Rapidă Completare Ulei</span>
              </h3>
              <button onClick={() => setShowQuickUleiModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddUlei} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 font-bold block mb-1">Vehicul: *</label>
                <select
                  required
                  value={quickUleiVehiculId}
                  onChange={(e) => setQuickUleiVehiculId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="">Selectează Vehicul...</option>
                  {vehicule.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern} - {v.numarInmatriculare}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sage-700 font-bold block mb-1">Tip Lichid:</label>
                  <select
                    value={quickUleiTip}
                    onChange={(e) => setQuickUleiTip(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="ULEI_MOTOR">Ulei Motor (15W40 / 10W40)</option>
                    <option value="ULEI_HIDRAULIC">Ulei Hidraulic (HLP 46)</option>
                    <option value="ULEI_TRANSMISIE">Ulei Transmisie (80W90)</option>
                    <option value="LICHID_RACIRE">Antigel / Răcire</option>
                  </select>
                </div>
                <div>
                  <label className="text-sage-700 font-bold block mb-1">Cantitate (Litri):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={quickUleiCantitate}
                    onChange={(e) => setQuickUleiCantitate(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 font-bold block mb-1">Mecanic Executant:</label>
                <select
                  value={quickUleiMecanic}
                  onChange={(e) => setQuickUleiMecanic(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {mecanici.map((m) => (
                    <option key={m.id} value={m.nume}>{m.nume}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 font-bold block mb-1">Observații / Șantier:</label>
                <input
                  type="text"
                  value={quickUleiObservatii}
                  onChange={(e) => setQuickUleiObservatii(e.target.value)}
                  placeholder="ex: Completat pe șantier la pornire de dimineață"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowQuickUleiModal(false)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-bold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md"
                >
                  Salvează Completare
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD MECANIC */}
      {/* ========================================================================= */}
      {showAddMecanicModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-morning-200 shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-black text-sapphire-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-sapphire-600" />
                <span>Înregistrare Mecanic Nou în Atelier</span>
              </h3>
              <button onClick={() => setShowAddMecanicModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMecanic} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 font-bold block mb-1">Nume & Prenume: *</label>
                <input
                  required
                  value={newMecanicNume}
                  onChange={(e) => setNewMecanicNume(e.target.value)}
                  placeholder="ex: Vasile Ionescu"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 font-bold block mb-1">Funcție / Specialitate:</label>
                <select
                  value={newMecanicFunctie}
                  onChange={(e) => setNewMecanicFunctie(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="Mecanic Șef">Mecanic Șef</option>
                  <option value="Mecanic Atelier">Mecanic Atelier</option>
                  <option value="Mecanic Utilaje Grele">Mecanic Utilaje Grele</option>
                  <option value="Electrician Auto">Electrician Auto</option>
                  <option value="Vulcanizator">Vulcanizator</option>
                </select>
              </div>

              <div>
                <label className="text-sage-700 font-bold block mb-1">Telefon Contact:</label>
                <input
                  value={newMecanicTelefon}
                  onChange={(e) => setNewMecanicTelefon(e.target.value)}
                  placeholder="0744..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowAddMecanicModal(false)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-bold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-black shadow-md shadow-sapphire-600/20"
                >
                  Salvează Mecanic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
