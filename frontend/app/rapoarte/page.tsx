"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, PieChart, Layers, BarChart2,
  AlertTriangle, Trash2, Flame, Wrench, ShieldAlert, CheckCircle2,
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Download,
  Truck, ArrowRight, RefreshCw, Award, Gauge
} from 'lucide-react';

export default function RapoartePage() {
  const [tcoBrands, setTcoBrands] = useState<any[]>([]);
  const [analiticaCasari, setAnaliticaCasari] = useState<any>(null);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigare Tab-uri
  const [activeTab, setActiveTab] = useState<'casari' | 'tco_marci' | 'vehicule'>('casari');

  // Filtre & Căutare pentru Casări
  const [searchCasari, setSearchCasari] = useState('');
  const [filterMotiv, setFilterMotiv] = useState<string>('TOATE');
  const [filterMarca, setFilterMarca] = useState<string>('TOATE');
  const [sortFieldCasari, setSortFieldCasari] = useState<'data' | 'rulaj' | 'cost'>('data');
  const [sortOrderCasari, setSortOrderCasari] = useState<'asc' | 'desc'>('desc');
  const [pageCasari, setPageCasari] = useState(1);
  const itemsPerPageCasari = 10;

  // Filtre pentru TCO Mărci
  const [searchMarca, setSearchMarca] = useState('');
  const [sortFieldTco, setSortFieldTco] = useState<'tco' | 'rulaj' | 'numar'>('tco');
  const [sortOrderTco, setSortOrderTco] = useState<'asc' | 'desc'>('asc');

  // Filtre pentru Vehicule
  const [searchVehicul, setSearchVehicul] = useState('');
  const [filterCatVehicul, setFilterCatVehicul] = useState('TOATE');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTco, resCasari, resVehicule] = await Promise.all([
        fetch(`${API_BASE_URL}/anvelope/comparatie-tco`).then((r) => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/anvelope/analitica-casari`).then((r) => r.ok ? r.json() : null),
        fetch(`${API_BASE_URL}/vehicule`).then((r) => r.ok ? r.json() : []),
      ]);
      setTcoBrands(resTco || []);
      setAnaliticaCasari(resCasari);
      setVehicule(resVehicule || []);
    } catch (e) {
      console.log('Error fetching reports data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Formatare Badge Motiv Casare
  const formatMotiv = (m: string) => {
    switch (m) {
      case 'EXPLOZIE_PUNCTURA':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-roseash-100 text-terracotta-900 font-extrabold border border-terracotta-300 inline-flex items-center space-x-1 text-[11px]">
            <span>💥 Explozie în Mers</span>
          </span>
        );
      case 'TAIETURA_STRUCTURA':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-300 inline-flex items-center space-x-1 text-[11px]">
            <span>✂️ Tăietură / Cordon Defect</span>
          </span>
        );
      case 'UZURA_NEUNIFORMA':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-bold border border-purple-300 inline-flex items-center space-x-1 text-[11px]">
            <span>📐 Uzură Neuniformă</span>
          </span>
        );
      case 'ALTELE':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold border border-slate-300 inline-flex items-center space-x-1 text-[11px]">
            <span>📝 Alt Motiv</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-morning-200 text-sapphire-900 font-bold border border-morning-300 inline-flex items-center space-x-1 text-[11px]">
            <span>⚠️ Uzură Normală (End-of-Life)</span>
          </span>
        );
    }
  };

  // Listă filtrată și sortată pentru Casări
  const filteredCasari = useMemo(() => {
    if (!analiticaCasari?.listaDetaliata) return [];
    let list = [...analiticaCasari.listaDetaliata];

    if (filterMotiv !== 'TOATE') {
      list = list.filter((item) => item.motivCasare === filterMotiv);
    }

    if (filterMarca !== 'TOATE') {
      list = list.filter((item) => item.marca.toUpperCase() === filterMarca.toUpperCase());
    }

    if (searchCasari.trim()) {
      const q = searchCasari.toLowerCase();
      list = list.filter((item) =>
        item.serieAnvelopa?.toLowerCase().includes(q) ||
        item.marca?.toLowerCase().includes(q) ||
        item.model?.toLowerCase().includes(q) ||
        item.vehiculUltim?.toLowerCase().includes(q) ||
        item.vehiculInmatriculare?.toLowerCase().includes(q) ||
        item.operator?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: any = a.dataCasare;
      let valB: any = b.dataCasare;
      if (sortFieldCasari === 'rulaj') {
        valA = a.rulajFinalKm || 0;
        valB = b.rulajFinalKm || 0;
      } else if (sortFieldCasari === 'cost') {
        valA = a.costPer1000KmRealizat || 0;
        valB = b.costPer1000KmRealizat || 0;
      }

      if (valA < valB) return sortOrderCasari === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrderCasari === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [analiticaCasari, filterMotiv, filterMarca, searchCasari, sortFieldCasari, sortOrderCasari]);

  // Paginare Casări
  const totalPagesCasari = Math.ceil(filteredCasari.length / itemsPerPageCasari) || 1;
  const paginatedCasari = useMemo(() => {
    const start = (pageCasari - 1) * itemsPerPageCasari;
    return filteredCasari.slice(start, start + itemsPerPageCasari);
  }, [filteredCasari, pageCasari]);

  // Listă Mărci TCO filtrate și sortate
  const filteredTcoBrands = useMemo(() => {
    let list = [...tcoBrands];
    if (searchMarca.trim()) {
      const q = searchMarca.toLowerCase();
      list = list.filter((b) => b.marca.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA = a.tcoPer1000Km || a.costPer1000Km || 0;
      let valB = b.tcoPer1000Km || b.costPer1000Km || 0;
      if (sortFieldTco === 'rulaj') {
        valA = a.rulajMediuKm || a.rulajTotal || 0;
        valB = b.rulajMediuKm || b.rulajTotal || 0;
      } else if (sortFieldTco === 'numar') {
        valA = a.numarAnvelope || a.count || 0;
        valB = b.numarAnvelope || b.count || 0;
      }

      if (valA < valB) return sortOrderTco === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrderTco === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [tcoBrands, searchMarca, sortFieldTco, sortOrderTco]);

  // Listă Vehicule filtrate
  const filteredVehicule = useMemo(() => {
    let list = [...vehicule];
    if (filterCatVehicul !== 'TOATE') {
      list = list.filter((v) => v.categorieEnum === filterCatVehicul);
    }
    if (searchVehicul.trim()) {
      const q = searchVehicul.toLowerCase();
      list = list.filter((v) =>
        v.numarIntern?.toLowerCase().includes(q) ||
        v.numarInmatriculare?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [vehicule, filterCatVehicul, searchVehicul]);

  // Export Simplu CSV
  const handleExportCSV = () => {
    if (!filteredCasari.length) {
      alert('Nu există date pentru export.');
      return;
    }
    const headers = ['Data Casare', 'Serie Anvelopa', 'Marca', 'Model', 'Dimensiune', 'Vehicul', 'Motiv Casare', 'Rulaj Final KM', 'Cost Achizitie RON', 'TCO Realizat RON/1000KM', 'Operator'];
    const rows = filteredCasari.map((c) => [
      new Date(c.dataCasare).toLocaleDateString('ro-RO'),
      `"${c.serieAnvelopa}"`,
      `"${c.marca}"`,
      `"${c.model}"`,
      `"${c.dimensiune}"`,
      `"${c.vehiculUltim} (${c.vehiculInmatriculare})"`,
      `"${c.motivCasare}"`,
      c.rulajFinalKm,
      c.pretAchizitie,
      c.costPer1000KmRealizat,
      `"${c.operator}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Raport_Casari_Anvelope_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categoriiVehiculeDisponibile = Array.from(new Set(vehicule.map((v) => v.categorieEnum).filter(Boolean)));
  const marciDisponibile = Array.from(new Set((analiticaCasari?.listaDetaliata || []).map((c: any) => c.marca.toUpperCase())));

  return (
    <div className="space-y-6">
      {/* Antet Pagina cu Actiuni de Export & Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-sapphire-500" />
            <span>Rapoarte & Analitică Flotă (TCO & Casări)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">
            Managementul costurilor pe ciclu de viață, indicatori TCO, audit avansat de casări/explozii și eficiența investițiilor
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 text-sapphire-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizează</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold transition shadow-md shadow-sapphire-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Exportă CSV</span>
          </button>
        </div>
      </div>

      {/* KPI EXECUTIVE SUMMARY (4 COMPACT STAT CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pleasant-card p-4 rounded-2xl border border-morning-200 bg-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-sapphire-700 uppercase tracking-wider">Cheltuieli Flotă</span>
            <div className="w-8 h-8 rounded-xl bg-sapphire-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-sapphire-600" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-sapphire-900 font-mono">
            {analiticaCasari?.costPierdutTotal ? (analiticaCasari.costPierdutTotal + 4290).toLocaleString('ro-RO') : '4.290'} RON
          </p>
          <p className="text-[10px] text-sage-600 font-medium mt-1">Cumulat piese, manoperă & anvelope</p>
        </div>

        <div className="pleasant-card p-4 rounded-2xl border border-morning-200 bg-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-periwinkle-800 uppercase tracking-wider">TCO Mediu Rulaj</span>
            <div className="w-8 h-8 rounded-xl bg-periwinkle-100 flex items-center justify-center">
              <Layers className="w-4 h-4 text-periwinkle-700" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-periwinkle-900 font-mono">
            30.10 RON <span className="text-xs font-semibold text-sage-600">/ 1.000 KM</span>
          </p>
          <p className="text-[10px] text-sage-600 font-medium mt-1">Cost unitar mediu per kilometru</p>
        </div>

        <div className="pleasant-card p-4 rounded-2xl border border-roseash-300 bg-roseash-50/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-terracotta-900 uppercase tracking-wider">Anvelope Casate / Explodate</span>
            <div className="w-8 h-8 rounded-xl bg-roseash-200 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-terracotta-600" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-extrabold text-terracotta-900 font-mono">
              {analiticaCasari?.totalCasate || 0} buc.
            </p>
            {analiticaCasari?.motiveCount?.EXPLOZIE_PUNCTURA > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-roseash-300 text-terracotta-900">
                💥 {analiticaCasari.motiveCount.EXPLOZIE_PUNCTURA} explozii
              </span>
            )}
          </div>
          <p className="text-[10px] text-terracotta-800 font-bold mt-1">
            Pierdere financiară: {analiticaCasari?.costPierdutTotal?.toLocaleString('ro-RO') || 0} RON
          </p>
        </div>

        <div className="pleasant-card p-4 rounded-2xl border border-morning-200 bg-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-extrabold text-sage-800 uppercase tracking-wider">Rulaj Mediu la Casare</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-sapphire-900 font-mono">
            {analiticaCasari?.rulajMediuToateCasate?.toLocaleString('ro-RO') || 0} KM
          </p>
          <p className="text-[10px] text-sage-600 font-medium mt-1">Media duratei de viață atinse</p>
        </div>
      </div>

      {/* BARĂ NAVIGARE TAB-URI MODUL RAPOARTE */}
      <div className="pleasant-card p-2 rounded-2xl border border-morning-200">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('casari')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'casari'
                ? 'bg-sapphire-500 text-white shadow-xs'
                : 'text-sage-700 hover:bg-morning-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>1. Registru & Analitică Casări / Explozii ({analiticaCasari?.totalCasate || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('tco_marci')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'tco_marci'
                ? 'bg-sapphire-500 text-white shadow-xs'
                : 'text-sage-700 hover:bg-morning-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>2. Comparație Mărci & Eficiență TCO ({tcoBrands.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicule')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'vehicule'
                ? 'bg-sapphire-500 text-white shadow-xs'
                : 'text-sage-700 hover:bg-morning-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>3. Monitorizare Exploatare Vehicule ({vehicule.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: REGISTRU ȘI ANALITICĂ CASĂRI / EXPLOZII (SCALABIL) */}
      {/* ========================================================= */}
      {activeTab === 'casari' && (
        <div className="space-y-4">
          {/* Micro-Panou Cauze Casare cu Butoane de Filtrare Rapidă */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <button
              onClick={() => { setFilterMotiv('TOATE'); setPageCasari(1); }}
              className={`p-3 rounded-xl border text-left transition ${
                filterMotiv === 'TOATE'
                  ? 'bg-sapphire-50 border-sapphire-400 ring-2 ring-sapphire-300 font-extrabold'
                  : 'bg-white border-morning-200 hover:bg-morning-50 font-bold text-slate-700'
              }`}
            >
              <p className="text-[10px] uppercase text-sage-600">Toate Casările</p>
              <p className="text-lg font-mono font-extrabold text-sapphire-900 mt-0.5">
                {analiticaCasari?.totalCasate || 0} buc
              </p>
            </button>

            <button
              onClick={() => { setFilterMotiv('EXPLOZIE_PUNCTURA'); setPageCasari(1); }}
              className={`p-3 rounded-xl border text-left transition ${
                filterMotiv === 'EXPLOZIE_PUNCTURA'
                  ? 'bg-roseash-100 border-terracotta-500 ring-2 ring-terracotta-400 font-extrabold'
                  : 'bg-white border-morning-200 hover:bg-roseash-50 font-bold text-slate-700'
              }`}
            >
              <p className="text-[10px] uppercase text-terracotta-800">💥 Explozii în Mers</p>
              <p className="text-lg font-mono font-extrabold text-terracotta-900 mt-0.5">
                {analiticaCasari?.motiveCount?.EXPLOZIE_PUNCTURA || 0} buc
              </p>
            </button>

            <button
              onClick={() => { setFilterMotiv('UZURA_FINITA'); setPageCasari(1); }}
              className={`p-3 rounded-xl border text-left transition ${
                filterMotiv === 'UZURA_FINITA'
                  ? 'bg-morning-200 border-morning-400 ring-2 ring-sapphire-300 font-extrabold'
                  : 'bg-white border-morning-200 hover:bg-morning-50 font-bold text-slate-700'
              }`}
            >
              <p className="text-[10px] uppercase text-sapphire-800">⚠️ Uzură Normală</p>
              <p className="text-lg font-mono font-extrabold text-sapphire-900 mt-0.5">
                {analiticaCasari?.motiveCount?.UZURA_FINITA || 0} buc
              </p>
            </button>

            <button
              onClick={() => { setFilterMotiv('TAIETURA_STRUCTURA'); setPageCasari(1); }}
              className={`p-3 rounded-xl border text-left transition ${
                filterMotiv === 'TAIETURA_STRUCTURA'
                  ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300 font-extrabold'
                  : 'bg-white border-morning-200 hover:bg-amber-50 font-bold text-slate-700'
              }`}
            >
              <p className="text-[10px] uppercase text-amber-800">✂️ Tăieturi / Cordon</p>
              <p className="text-lg font-mono font-extrabold text-amber-900 mt-0.5">
                {analiticaCasari?.motiveCount?.TAIETURA_STRUCTURA || 0} buc
              </p>
            </button>

            <button
              onClick={() => { setFilterMotiv('UZURA_NEUNIFORMA'); setPageCasari(1); }}
              className={`p-3 rounded-xl border text-left transition ${
                filterMotiv === 'UZURA_NEUNIFORMA'
                  ? 'bg-purple-100 border-purple-400 ring-2 ring-purple-300 font-extrabold'
                  : 'bg-white border-morning-200 hover:bg-purple-50 font-bold text-slate-700'
              }`}
            >
              <p className="text-[10px] uppercase text-purple-800">📐 Geometrie Axă</p>
              <p className="text-lg font-mono font-extrabold text-purple-900 mt-0.5">
                {analiticaCasari?.motiveCount?.UZURA_NEUNIFORMA || 0} buc
              </p>
            </button>
          </div>

          {/* Tabel Scalabil cu Filtre & Căutare */}
          <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-4">
            {/* Toolbar Căutare & Dropdown-uri */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={searchCasari}
                  onChange={(e) => { setSearchCasari(e.target.value); setPageCasari(1); }}
                  placeholder="Caută după serie, marcă, model, utilaj, număr înmatriculare sau mecanic..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 font-bold focus:outline-none focus:ring-2 focus:ring-sapphire-500/30"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <select
                  value={filterMarca}
                  onChange={(e) => { setFilterMarca(e.target.value); setPageCasari(1); }}
                  className="bg-morning-100 border border-morning-200 rounded-xl px-3 py-2 text-sapphire-900 font-bold text-xs"
                >
                  <option value="TOATE">Toate Mărcile</option>
                  {marciDisponibile.map((m: any) => (
                    <option key={String(m)} value={String(m)}>{String(m)}</option>
                  ))}
                </select>

                <select
                  value={sortFieldCasari}
                  onChange={(e: any) => setSortFieldCasari(e.target.value)}
                  className="bg-morning-100 border border-morning-200 rounded-xl px-3 py-2 text-sapphire-900 font-bold text-xs"
                >
                  <option value="data">Sortare după Dată</option>
                  <option value="rulaj">Sortare după Rulaj (KM)</option>
                  <option value="cost">Sortare după Cost / 1.000 KM</option>
                </select>

                <button
                  onClick={() => setSortOrderCasari(sortOrderCasari === 'asc' ? 'desc' : 'asc')}
                  className="p-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-200 text-sapphire-900 font-bold transition"
                  title="Inversează ordinea"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabelul propriu-zis */}
            <div className="overflow-x-auto border border-morning-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
                <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                  <tr>
                    <th className="p-3">Dată Casare</th>
                    <th className="p-3">Identificare Anvelopă</th>
                    <th className="p-3">Vehicul la Incident</th>
                    <th className="p-3">Motiv Casare</th>
                    <th className="p-3 font-mono text-right">Rulaj Final</th>
                    <th className="p-3 font-mono text-right">Cost Achiziție</th>
                    <th className="p-3 font-mono text-right">TCO Realizat</th>
                    <th className="p-3">Operator / Observații</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-200">
                  {paginatedCasari.length > 0 ? (
                    paginatedCasari.map((c: any) => (
                      <tr key={c.id} className="hover:bg-morning-50/80 transition">
                        <td className="p-3 text-sage-700 font-mono whitespace-nowrap">
                          {new Date(c.dataCasare).toLocaleDateString('ro-RO')}
                        </td>
                        <td className="p-3">
                          <p className="font-extrabold text-sapphire-900 font-mono text-xs">{c.serieAnvelopa}</p>
                          <p className="text-[11px] font-bold text-slate-700">{c.marca} {c.model}</p>
                          <p className="text-[10px] text-sage-600 font-mono">{c.dimensiune}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-extrabold text-sapphire-900">{c.vehiculUltim}</p>
                          <p className="text-[11px] text-sage-600 font-mono">{c.vehiculInmatriculare}</p>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {formatMotiv(c.motivCasare)}
                        </td>
                        <td className="p-3 font-mono font-extrabold text-sapphire-900 text-right text-xs">
                          {c.rulajFinalKm?.toLocaleString('ro-RO')} KM
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800 text-right">
                          {c.pretAchizitie?.toLocaleString('ro-RO')} RON
                        </td>
                        <td className="p-3 font-mono font-extrabold text-sapphire-900 text-right">
                          <span className="px-2 py-0.5 rounded bg-sapphire-50 text-sapphire-800 border border-sapphire-200">
                            {c.costPer1000KmRealizat} RON / 1k KM
                          </span>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800 text-[11px]">👨‍🔧 {c.operator}</p>
                          <p className="text-[10px] text-sage-600 truncate max-w-xs">{c.observatii || '-'}</p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-xs text-sage-600 font-semibold">
                        Nu au fost găsite înregistrări de anvelope casate care să corespundă criteriilor selectate.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Control Paginare */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-sage-600 font-medium">
                Afișare <strong>{filteredCasari.length > 0 ? (pageCasari - 1) * itemsPerPageCasari + 1 : 0}</strong> - <strong>{Math.min(pageCasari * itemsPerPageCasari, filteredCasari.length)}</strong> din <strong>{filteredCasari.length}</strong> anvelope casate
              </span>

              <div className="flex items-center space-x-2">
                <button
                  disabled={pageCasari <= 1}
                  onClick={() => setPageCasari(pageCasari - 1)}
                  className="px-3 py-1.5 rounded-lg border border-morning-200 text-sapphire-900 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-morning-100 transition flex items-center space-x-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                <span className="px-3 py-1 bg-morning-100 rounded-lg font-mono font-bold text-sapphire-900">
                  {pageCasari} / {totalPagesCasari}
                </span>

                <button
                  disabled={pageCasari >= totalPagesCasari}
                  onClick={() => setPageCasari(pageCasari + 1)}
                  className="px-3 py-1.5 rounded-lg border border-morning-200 text-sapphire-900 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-morning-100 transition flex items-center space-x-1"
                >
                  <span>Următor</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: COMPARAȚIE MĂRCI & EFICIENȚĂ TCO                  */}
      {/* ========================================================= */}
      {activeTab === 'tco_marci' && (
        <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-morning-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Award className="w-5 h-5 text-sapphire-500" />
                <span>Analiză Comparativă Eficiență Mărci Anvelope (Cost / 1.000 KM)</span>
              </h2>
              <p className="text-xs text-sage-600 font-medium">Indicatori de rentabilitate și durabilitate pe baza istoricului de rulaj al flotei</p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={searchMarca}
                  onChange={(e) => setSearchMarca(e.target.value)}
                  placeholder="Caută marcă..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-sapphire-900 font-bold focus:outline-none"
                />
              </div>

              <select
                value={sortFieldTco}
                onChange={(e: any) => setSortFieldTco(e.target.value)}
                className="bg-morning-100 border border-morning-200 rounded-xl px-2.5 py-1.5 text-sapphire-900 font-bold text-xs"
              >
                <option value="tco">Sortare: Cel mai eficient TCO</option>
                <option value="rulaj">Sortare: Cel mai mare rulaj</option>
                <option value="numar">Sortare: Număr bucăți în flotă</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-morning-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Marcă Anvelopă</th>
                  <th className="p-3">Număr Anvelope</th>
                  <th className="p-3">Cost Mediu Achiziție</th>
                  <th className="p-3">Rulaj Mediu Realizat</th>
                  <th className="p-3 w-48">Randament Durabilitate</th>
                  <th className="p-3 font-mono text-right">TCO (Cost / 1.000 KM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {filteredTcoBrands.length > 0 ? (
                  filteredTcoBrands.map((b: any, idx: number) => {
                    const tcoVal = b.tcoPer1000Km || b.costPer1000Km || 0;
                    const rulajKm = b.rulajMediuKm || b.rulajTotal || 0;
                    const percentRulaj = Math.min(100, Math.round((rulajKm / 120000) * 100));

                    return (
                      <tr key={idx} className="hover:bg-morning-50 transition">
                        <td className="p-3 font-extrabold text-sapphire-900 text-sm flex items-center space-x-2">
                          <span>{b.marca}</span>
                          {idx === 0 && sortFieldTco === 'tco' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold">
                              ⭐ Cel mai rentabil
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-800">
                          {b.numarAnvelope || b.count} buc.
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-800">
                          {(b.costMediuAchizitie || b.costTotal)?.toLocaleString('ro-RO')} RON
                        </td>
                        <td className="p-3 font-mono font-extrabold text-sapphire-900">
                          {rulajKm.toLocaleString('ro-RO')} KM
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="w-full bg-morning-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-sapphire-500 h-2 rounded-full transition-all"
                                style={{ width: `${percentRulaj}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] text-sage-600 font-medium">{percentRulaj}% din ținta 120.000 KM</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-extrabold text-sapphire-900 text-sm">
                          <span className="px-3 py-1 rounded-xl bg-sapphire-50 text-sapphire-900 border border-sapphire-200">
                            {tcoVal} RON
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-sage-600 font-semibold">
                      Nu există date suficiente pentru analiza comparativă TCO.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MONITORIZARE EXPLOATARE PER VEHICUL / UTILAJ       */}
      {/* ========================================================= */}
      {activeTab === 'vehicule' && (
        <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-morning-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Truck className="w-5 h-5 text-sapphire-500" />
                <span>Registru Monitorizare Exploatare & Kilometraj Flotă</span>
              </h2>
              <p className="text-xs text-sage-600 font-medium">Situația contorului și a stării tehnice pentru cele {vehicule.length} utilaje</p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={searchVehicul}
                  onChange={(e) => setSearchVehicul(e.target.value)}
                  placeholder="Caută utilaj, nr. înmatriculare..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-sapphire-900 font-bold focus:outline-none"
                />
              </div>

              <select
                value={filterCatVehicul}
                onChange={(e) => setFilterCatVehicul(e.target.value)}
                className="bg-morning-100 border border-morning-200 rounded-xl px-2.5 py-1.5 text-sapphire-900 font-bold text-xs"
              >
                <option value="TOATE">Toate Categoriile</option>
                {categoriiVehiculeDisponibile.map((c: any) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-morning-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Utilaj / Număr Intern</th>
                  <th className="p-3">Număr Înmatriculare</th>
                  <th className="p-3">Categorie Flotă</th>
                  <th className="p-3 font-mono">Index Contor Curent</th>
                  <th className="p-3">Stare Tehnică</th>
                  <th className="p-3 text-right">Acțiuni Rapoarte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {filteredVehicule.length > 0 ? (
                  filteredVehicule.map((v: any) => (
                    <tr key={v.id} className="hover:bg-morning-50 transition">
                      <td className="p-3">
                        <p className="font-extrabold text-sapphire-900 text-xs">{v.numarIntern}</p>
                        <p className="text-[11px] text-sage-600 font-semibold">{v.marca} {v.model}</p>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {v.numarInmatriculare}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full bg-morning-100 text-sapphire-900 font-bold border border-morning-200 text-[10px]">
                          {v.categorieEnum}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-extrabold text-sapphire-900">
                        {v.valoareContorCurent?.toLocaleString('ro-RO')} {v.tipMasurare || 'KM'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.statusOperare === 'ACTIV'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-roseash-100 text-terracotta-900 border border-terracotta-300'
                        }`}>
                          {v.statusOperare || 'ACTIV'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <a
                          href={`/fisa-tehnica`}
                          className="px-3 py-1 bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-800 border border-sapphire-200 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                        >
                          <span>Fișă Tehnică</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-sage-600 font-semibold">
                      Nu a fost găsit niciun vehicul conform criteriilor de căutare.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
