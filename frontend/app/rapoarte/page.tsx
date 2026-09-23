"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, PieChart, Layers, BarChart2,
  AlertTriangle, Trash2, Flame, Wrench, ShieldAlert, CheckCircle2,
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Download,
  Truck, ArrowRight, RefreshCw, Award, Gauge, Droplets, FileText, Calendar, Printer, Check, Info, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';

export default function RapoartePage() {
  const [tcoBrands, setTcoBrands] = useState<any[]>([]);
  const [analiticaCasari, setAnaliticaCasari] = useState<any>(null);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigare Tab-uri Principale
  const [activeTab, setActiveTab] = useState<'costuri_activitate' | 'casari' | 'tco_marci' | 'vehicule'>('costuri_activitate');

  // Stare Raport Costuri, Reparații & Fluide (Vehicul / Categorie / Perioadă)
  const [reportVehiculId, setReportVehiculId] = useState<string>('TOATE');
  const [reportCategorie, setReportCategorie] = useState<string>('TOATE');
  const [reportPeriodPreset, setReportPeriodPreset] = useState<string>('anul_curent');
  const [reportDataStart, setReportDataStart] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [reportDataEnd, setReportDataEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [reportSubTab, setReportSubTab] = useState<'rezumat' | 'reparatii' | 'piese' | 'fluide'>('rezumat');
  const [searchReparatii, setSearchReparatii] = useState<string>('');
  const [searchPiese, setSearchPiese] = useState<string>('');
  const [searchFluide, setSearchFluide] = useState<string>('');

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

  const fetchReportCosturi = async () => {
    setLoadingReport(true);
    try {
      const params = new URLSearchParams();
      if (reportVehiculId && reportVehiculId !== 'TOATE') params.append('vehiculId', reportVehiculId);
      if (reportCategorie && reportCategorie !== 'TOATE') params.append('categorie', reportCategorie);
      if (reportDataStart) params.append('dataStart', reportDataStart);
      if (reportDataEnd) params.append('dataEnd', reportDataEnd);

      const res = await fetch(`${API_BASE_URL}/mentenanta/raport-activitate-costuri?${params.toString()}`);
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch (e) {
      console.error('Error fetching cost report', e);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchReportCosturi();
  }, [reportVehiculId, reportCategorie, reportDataStart, reportDataEnd]);

  const handlePeriodPreset = (preset: 'luna_curenta' | 'luna_trecuta' | 'trimestru' | 'anul_curent' | 'tot') => {
    setReportPeriodPreset(preset);
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    if (preset === 'luna_curenta') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      start = s.toISOString().split('T')[0];
      end = e.toISOString().split('T')[0];
    } else if (preset === 'luna_trecuta') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      start = s.toISOString().split('T')[0];
      end = e.toISOString().split('T')[0];
    } else if (preset === 'trimestru') {
      const s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      start = s.toISOString().split('T')[0];
      end = e.toISOString().split('T')[0];
    } else if (preset === 'anul_curent') {
      start = `${now.getFullYear()}-01-01`;
      end = `${now.getFullYear()}-12-31`;
    } else if (preset === 'tot') {
      start = '';
      end = '';
    }

    setReportDataStart(start);
    setReportDataEnd(end);
  };

  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCostReportCSV = () => {
    if (!reportData) return;

    if (reportSubTab === 'reparatii') {
      const headers = ['Nr. Comanda', 'Data Deschidere', 'Data Finalizare', 'Stare', 'Utilaj', 'Nr. Inmatriculare', 'Categorie', 'Mecanic Responsabil', 'Cost Piese (RON)', 'Cost Manopera (RON)', 'Cost Total (RON)', 'Observatii'];
      const rows = (reportData.comenziLucru || []).map((c: any) => [
        `"${c.numarComanda}"`,
        c.dataDeschidere ? new Date(c.dataDeschidere).toLocaleDateString('ro-RO') : '',
        c.dataFinalizare ? new Date(c.dataFinalizare).toLocaleDateString('ro-RO') : '',
        c.stare,
        `"${c.vehicul?.numarIntern || ''}"`,
        `"${c.vehicul?.numarInmatriculare || ''}"`,
        `"${c.vehicul?.categorieEnum || ''}"`,
        `"${c.mecanicResponsabil || ''}"`,
        c.costPiese,
        c.costManopera,
        c.costTotal,
        `"${(c.observatii || '').replace(/"/g, '""')}"`,
      ]);
      downloadCSV(headers, rows, `Raport_Comenzi_Lucru_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (reportSubTab === 'piese') {
      const headers = ['Data', 'Nr. Comanda', 'Utilaj', 'Categorie', 'Denumire Piesa', 'Cod Piesa', 'Pilon Cost', 'Cantitate', 'Pret Unitar (RON)', 'Valoare Totala (RON)', 'Provenienta', 'Furnizor', 'Factura'];
      const rows = (reportData.pieseConsumate || []).map((p: any) => [
        p.data ? new Date(p.data).toLocaleDateString('ro-RO') : '',
        `"${p.numarComanda}"`,
        `"${p.vehicul?.numarIntern || ''}"`,
        `"${p.vehicul?.categorieEnum || ''}"`,
        `"${(p.descriere || p.articolDenumire || '').replace(/"/g, '""')}"`,
        `"${p.articolCod || ''}"`,
        p.pilonCost,
        p.cantitate,
        p.pretUnitar,
        p.costTotal,
        `"${p.provenienta || ''}"`,
        `"${p.furnizor || ''}"`,
        `"${p.numarFactura || ''}"`,
      ]);
      downloadCSV(headers, rows, `Raport_Piese_Consumate_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (reportSubTab === 'fluide') {
      const headers = ['Data Interventie', 'Utilaj', 'Nr. Inmatriculare', 'Categorie', 'Tip Fluid', 'Tip Operatiune', 'Articol / Marca', 'Cantitate Litri', 'Pret / Litru FIFO (RON)', 'Cost Total (RON)', 'Index Contor', 'Mecanic Responsabil', 'Observatii'];
      const rows = (reportData.completariFluide || []).map((f: any) => [
        f.dataCompletare ? new Date(f.dataCompletare).toLocaleDateString('ro-RO') : '',
        `"${f.vehicul?.numarIntern || ''}"`,
        `"${f.vehicul?.numarInmatriculare || ''}"`,
        `"${f.vehicul?.categorieEnum || ''}"`,
        `"${f.tipLichid}"`,
        `"${f.tipOperatiune}"`,
        `"${(f.articolDenumire || f.marcaUlei || '').replace(/"/g, '""')}"`,
        f.cantitateLitri,
        f.pretPerLitru,
        f.costTotal,
        f.valoareContor,
        `"${f.mecanic || ''}"`,
        `"${(f.observatii || '').replace(/"/g, '""')}"`,
      ]);
      downloadCSV(headers, rows, `Raport_Olajpotlasok_Fluide_${new Date().toISOString().split('T')[0]}.csv`);
    } else {
      const headers = ['Indicator Financiar / Activitate', 'Valoare', 'Unitate Masura'];
      const t = reportData?.totale || {};
      const rows = [
        ['Cost Total General', t.totalGeneral || 0, 'RON'],
        ['Cost Piese & Materiale Consumate', t.totalPiese || 0, 'RON'],
        ['Cost Manopera & Prestatii Externe', t.totalManopera || 0, 'RON'],
        ['Cost Uleiuri & Fluide (Top-up + Schimb)', t.totalFluide || 0, 'RON'],
        ['Volum Total Fluide Introduse', t.totalVolumFluideLitri || 0, 'Litri'],
        ['Numar Total Comenzi de Lucru', t.numarComenziLucru || 0, 'Comenzi'],
        ['Numar Articole Piese Consumate', t.numarPieseConsumate || 0, 'Articole'],
        ['Numar Interventii Uleiuri & Fluide', t.numarCompletariFluide || 0, 'Interventii'],
        ['Numar Utilaje Afectate', t.totalVehiculeAfectate || 0, 'Utilaje'],
      ];
      downloadCSV(headers, rows, `Raport_Rezumat_Costuri_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  // Formatare Badge Motiv Casare
  const formatMotiv = (m: string) => {
    switch (m) {
      case 'EXPLOZIE_PUNCTURA':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-roseash-100 text-terracotta-900 font-extrabold border border-terracotta-300 inline-flex items-center space-x-1 text-[11px]">
            <span>Explozie în Mers</span>
          </span>
        );
      case 'TAIETURA_STRUCTURA':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-300 inline-flex items-center space-x-1 text-[11px]">
            <span>Tăietură / Cordon Defect</span>
          </span>
        );
      case 'UZURA_NEUNIFORMA':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-bold border border-purple-300 inline-flex items-center space-x-1 text-[11px]">
            <span>Uzură Neuniformă</span>
          </span>
        );
      case 'ALTELE':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold border border-slate-300 inline-flex items-center space-x-1 text-[11px]">
            <span>Alt Motiv</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-morning-200 text-sapphire-900 font-bold border border-morning-300 inline-flex items-center space-x-1 text-[11px]">
            <span>Uzură Normală (End-of-Life)</span>
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
            <span>Rapoarte & Analitică Flotă (Costuri, Reparații & Fluide)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">
            Managementul costurilor pe ciclu de viață (TCO), consumabile, completări de ulei, audit casări anvelope și reparații
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              fetchData();
              fetchReportCosturi();
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-sapphire-500 ${loading || loadingReport ? 'animate-spin' : ''}`} />
            <span>Actualizează</span>
          </button>

          <button
            onClick={activeTab === 'costuri_activitate' ? handleExportCostReportCSV : handleExportCSV}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold transition shadow-md shadow-sapphire-500/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportă CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold transition shadow-xs cursor-pointer"
            title="Tipărește raportul sau exportă în format PDF"
          >
            <Printer className="w-4 h-4 text-sapphire-600" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* KPI EXECUTIVE SUMMARY (DYNAMIC PE TAB-UL ACTIV) */}
      {activeTab === 'costuri_activitate' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="pleasant-card p-4 rounded-2xl border border-sapphire-200 bg-sapphire-50/70 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-sapphire-900 uppercase tracking-wider">Cost Total General (Összérték)</span>
              <div className="w-8 h-8 rounded-xl bg-sapphire-600 text-white flex items-center justify-center shadow-xs">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-sapphire-950 font-mono">
              {reportData?.totale?.totalGeneral ? reportData.totale.totalGeneral.toLocaleString('ro-RO') : '0'} RON
            </p>
            <p className="text-[10px] text-sage-600 font-medium">Cumulat piese, manoperă & fluide în perioada selectată</p>
          </div>

          <div className="pleasant-card p-4 rounded-2xl border border-morning-200 bg-white space-y-1 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-blue-900 uppercase tracking-wider">Piese & Materiale Consumate</span>
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-blue-900 font-mono">
              {reportData?.totale?.totalPiese ? reportData.totale.totalPiese.toLocaleString('ro-RO') : '0'} RON
            </p>
            <p className="text-[10px] text-sage-600 font-medium">{reportData?.totale?.numarPieseConsumate || 0} articole eliberate din stoc/achiziții</p>
          </div>

          <div className="pleasant-card p-4 rounded-2xl border border-morning-200 bg-white space-y-1 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider">Javítások / Manoperă Lucrări</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-indigo-900 font-mono">
              {reportData?.totale?.totalManopera ? reportData.totale.totalManopera.toLocaleString('ro-RO') : '0'} RON
            </p>
            <p className="text-[10px] text-sage-600 font-medium">{reportData?.totale?.numarComenziLucru || 0} comenzi de lucru atelier</p>
          </div>

          <div className="pleasant-card p-4 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider">Olajpótlások & Fluide</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Droplets className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-amber-900 font-mono">
              {reportData?.totale?.totalFluide ? reportData.totale.totalFluide.toLocaleString('ro-RO') : '0'} RON
            </p>
            <p className="text-[10px] text-amber-800 font-bold">
              {reportData?.totale?.totalVolumFluideLitri || 0} L în {reportData?.totale?.numarCompletariFluide || 0} completări / schimburi
            </p>
          </div>
        </div>
      ) : (
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
                  {analiticaCasari.motiveCount.EXPLOZIE_PUNCTURA} explozii
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
      )}

      {/* BARĂ NAVIGARE TAB-URI MODUL RAPOARTE */}
      <div className="pleasant-card p-2 rounded-2xl border border-morning-200 bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('costuri_activitate')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'costuri_activitate'
                ? 'bg-sapphire-600 text-white shadow-xs font-black'
                : 'text-sage-700 hover:bg-morning-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1. Raport Centralizat Costuri, Reparații & Fluide (Vehicul / Categorie)</span>
          </button>

          <button
            onClick={() => setActiveTab('casari')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'casari'
                ? 'bg-sapphire-500 text-white shadow-xs font-black'
                : 'text-sage-700 hover:bg-morning-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>2. Registru & Analitică Casări / Explozii ({analiticaCasari?.totalCasate || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('tco_marci')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'tco_marci'
                ? 'bg-sapphire-500 text-white shadow-xs font-black'
                : 'text-sage-700 hover:bg-morning-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>3. Comparație Mărci & Eficiență TCO ({tcoBrands.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicule')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'vehicule'
                ? 'bg-sapphire-500 text-white shadow-xs font-black'
                : 'text-sage-700 hover:bg-morning-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>4. Registru Tehnic Exploatare ({vehicule.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RAPORT CENTRALIZAT COSTURI, REPARAȚII, PIESE & FLUIDE             */}
      {/* ========================================================================= */}
      {activeTab === 'costuri_activitate' && (
        <div className="space-y-5">
          {/* PANOU FILTRARE RAPORT PE VEHICUL / CATEGORIE ȘI INTERVAL DE TIMP */}
          <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-4 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-morning-200 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-sapphire-600" />
                  <span>Parametri Raport: Filtrare Utilaj / Categorie & Interval Timp</span>
                </h2>
                <p className="text-xs text-sage-600 font-medium">
                  Selectați utilajul specific sau întreaga categorie și intervalul dorit pentru agregarea automată a costurilor
                </p>
              </div>

              {/* BUTOANE RAPIDE PRESET PERIOADĂ */}
              <div className="flex items-center space-x-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-sage-500 mr-1">Perioadă:</span>
                {[
                  { key: 'luna_curenta', label: 'Luna Curentă' },
                  { key: 'luna_trecuta', label: 'Luna Trecută' },
                  { key: 'trimestru', label: 'Ultimul Trimestru' },
                  { key: 'anul_curent', label: 'Anul Curent (YTD)' },
                  { key: 'tot', label: 'Tot Istoricul' },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handlePeriodPreset(p.key as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      reportPeriodPreset === p.key
                        ? 'bg-sapphire-900 text-white shadow-2xs'
                        : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CÂMPURI DE SELECȚIE: CATEGORIE, UTILAJ, DE LA DATA, PÂNĂ LA DATA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* 1. Selector Categorie */}
              <div>
                <label className="text-[11px] font-bold text-sage-700 block mb-1">
                  1. Categorie Vehicule / Utilaje:
                </label>
                <select
                  value={reportCategorie}
                  onChange={(e) => {
                    setReportCategorie(e.target.value);
                    setReportVehiculId('TOATE');
                  }}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500 cursor-pointer"
                >
                  <option value="TOATE">Toate Categoriile Flotei</option>
                  {categoriiVehiculeDisponibile.map((c: any) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Selector Vehicul */}
              <div>
                <label className="text-[11px] font-bold text-sage-700 block mb-1">
                  2. Utilaj Specific (opțional):
                </label>
                <select
                  value={reportVehiculId}
                  onChange={(e) => setReportVehiculId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500 cursor-pointer"
                >
                  <option value="TOATE">
                    {reportCategorie === 'TOATE'
                      ? 'Toate Utilajele Flotei'
                      : `Toate utilajele din ${reportCategorie.replace(/_/g, ' ')}`}
                  </option>
                  {(reportCategorie === 'TOATE'
                    ? vehicule
                    : vehicule.filter((v: any) => v.categorieEnum === reportCategorie)
                  ).map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern} ({v.numarInmatriculare}) - {v.marca} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. De la Data */}
              <div>
                <label className="text-[11px] font-bold text-sage-700 block mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-sapphire-600" />
                  <span>De la Data:</span>
                </label>
                <input
                  type="date"
                  value={reportDataStart}
                  onChange={(e) => {
                    setReportDataStart(e.target.value);
                    setReportPeriodPreset('personalizat');
                  }}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500"
                />
              </div>

              {/* 4. Până la Data */}
              <div>
                <label className="text-[11px] font-bold text-sage-700 block mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-sapphire-600" />
                  <span>Până la Data:</span>
                </label>
                <input
                  type="date"
                  value={reportDataEnd}
                  onChange={(e) => {
                    setReportDataEnd(e.target.value);
                    setReportPeriodPreset('personalizat');
                  }}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500"
                />
              </div>
            </div>

            {/* BARA SUB-RAPORT: BUTOANE ACȚIUNE & INFORMARE */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-morning-200 text-xs">
              <div className="text-sage-600 font-medium">
                {loadingReport ? (
                  <span className="flex items-center space-x-1 text-sapphire-600 font-bold animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Se recalculează agregările financiare...</span>
                  </span>
                ) : (
                  <span>
                    Agregare activă pentru:{' '}
                    <strong className="text-sapphire-900">
                      {reportVehiculId !== 'TOATE'
                        ? vehicule.find((v: any) => v.id === reportVehiculId)?.numarIntern || 'Utilaj'
                        : reportCategorie !== 'TOATE'
                        ? `Categoria ${reportCategorie.replace(/_/g, ' ')}`
                        : 'Toată Flota'}
                    </strong>{' '}
                    ({reportData?.totale?.totalVehiculeAfectate || 0} utilaje) • Perioada:{' '}
                    <strong>{reportDataStart || 'Început'}</strong> → <strong>{reportDataEnd || 'Prezent'}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchReportCosturi}
                  disabled={loadingReport}
                  className="px-3.5 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 font-bold transition flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
                  <span>Actualizează</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCostReportCSV}
                  className="px-3.5 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold transition flex items-center space-x-1 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportă CSV ({reportSubTab.toUpperCase()})</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 font-bold transition flex items-center space-x-1 cursor-pointer"
                  title="Tipărește raportul sau exportă în PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* BARA SUB-TAB-URI: REZUMAT vs REPARAȚII vs PIESE vs FLUIDE */}
          <div className="pleasant-card p-1.5 rounded-2xl border border-morning-200 bg-white">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setReportSubTab('rezumat')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-2 cursor-pointer ${
                  reportSubTab === 'rezumat'
                    ? 'bg-sapphire-900 text-white shadow-2xs font-extrabold'
                    : 'text-sage-700 hover:bg-morning-100'
                }`}
              >
                <PieChart className="w-4 h-4" />
                <span>1. Structură & Grafic Costuri (Rezumat)</span>
              </button>

              <button
                type="button"
                onClick={() => setReportSubTab('reparatii')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-2 cursor-pointer ${
                  reportSubTab === 'reparatii'
                    ? 'bg-sapphire-900 text-white shadow-2xs font-extrabold'
                    : 'text-sage-700 hover:bg-morning-100'
                }`}
              >
                <Wrench className="w-4 h-4 text-sapphire-500" />
                <span>
                  2. Javítások / Comenzi Lucru ({reportData?.totale?.numarComenziLucru || 0})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportSubTab('piese')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-2 cursor-pointer ${
                  reportSubTab === 'piese'
                    ? 'bg-sapphire-900 text-white shadow-2xs font-extrabold'
                    : 'text-sage-700 hover:bg-morning-100'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-500" />
                <span>
                  3. Felhasznált Alkatrészek ({reportData?.totale?.numarPieseConsumate || 0})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportSubTab('fluide')}
                className={`px-4 py-2 rounded-xl font-bold transition flex items-center space-x-2 cursor-pointer ${
                  reportSubTab === 'fluide'
                    ? 'bg-sapphire-900 text-white shadow-2xs font-extrabold'
                    : 'text-sage-700 hover:bg-morning-100'
                }`}
              >
                <Droplets className="w-4 h-4 text-amber-500" />
                <span>
                  4. Olajpótlások & Fluide ({reportData?.totale?.numarCompletariFluide || 0})
                </span>
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: REZUMAT FINANCIAR & STRUCTURĂ COSTURI */}
          {reportSubTab === 'rezumat' && (
            <div className="space-y-4">
              {/* DISTRIBUȚIE VIZUALĂ COSTURI */}
              <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-sapphire-900 uppercase tracking-wider flex items-center space-x-2">
                    <PieChart className="w-4 h-4 text-sapphire-600" />
                    <span>Distribuția Procentuală a Cheltuielilor în Perioadă</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-sapphire-900">
                    Összérték (Total): {reportData?.totale?.totalGeneral ? reportData.totale.totalGeneral.toLocaleString('ro-RO') : '0'} RON
                  </span>
                </div>

                {/* Segmented Percentage Bar */}
                {(() => {
                  const tot = reportData?.totale?.totalGeneral || 0;
                  const piese = reportData?.totale?.totalPiese || 0;
                  const manopera = reportData?.totale?.totalManopera || 0;
                  const fluide = reportData?.totale?.totalFluide || 0;

                  const pPct = tot > 0 ? Math.round((piese / tot) * 100) : 0;
                  const mPct = tot > 0 ? Math.round((manopera / tot) * 100) : 0;
                  const fPct = tot > 0 ? Math.max(0, 100 - pPct - mPct) : 0;

                  return (
                    <div className="space-y-2">
                      <div className="h-5 rounded-full overflow-hidden flex bg-morning-200 p-0.5 border border-morning-300">
                        {pPct > 0 && (
                          <div
                            style={{ width: `${pPct}%` }}
                            className="h-full bg-blue-500 rounded-l-full flex items-center justify-center text-[10px] text-white font-extrabold"
                            title={`Piese: ${piese.toLocaleString('ro-RO')} RON (${pPct}%)`}
                          >
                            {pPct}% Piese
                          </div>
                        )}
                        {mPct > 0 && (
                          <div
                            style={{ width: `${mPct}%` }}
                            className="h-full bg-indigo-500 flex items-center justify-center text-[10px] text-white font-extrabold"
                            title={`Manoperă: ${manopera.toLocaleString('ro-RO')} RON (${mPct}%)`}
                          >
                            {mPct}% Manoperă
                          </div>
                        )}
                        {fPct > 0 && (
                          <div
                            style={{ width: `${fPct}%` }}
                            className="h-full bg-amber-500 rounded-r-full flex items-center justify-center text-[10px] text-amber-950 font-extrabold"
                            title={`Fluide/Uleiuri: ${fluide.toLocaleString('ro-RO')} RON (${fPct}%)`}
                          >
                            {fPct}% Uleiuri
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                          <div className="w-3.5 h-3.5 rounded bg-blue-500 shrink-0"></div>
                          <div>
                            <span className="font-bold text-blue-950 block">Piese & Materiale Consumate</span>
                            <span className="font-mono font-black text-blue-900">
                              {piese.toLocaleString('ro-RO')} RON ({pPct}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                          <div className="w-3.5 h-3.5 rounded bg-indigo-500 shrink-0"></div>
                          <div>
                            <span className="font-bold text-indigo-950 block">Manoperă & Servicii Reparații</span>
                            <span className="font-mono font-black text-indigo-900">
                              {manopera.toLocaleString('ro-RO')} RON ({mPct}%)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                          <div className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0"></div>
                          <div>
                            <span className="font-bold text-amber-950 block">Olajpótlások & Fluide</span>
                            <span className="font-mono font-black text-amber-900">
                              {fluide.toLocaleString('ro-RO')} RON ({fPct}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* TABEL EVOLUȚIE LUNARĂ */}
              <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-3">
                <h3 className="text-xs font-black text-sapphire-900 uppercase tracking-wider flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-sapphire-600" />
                  <span>Evoluție Lunară a Costurilor în Perioadă</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 min-w-[650px]">
                    <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                      <tr>
                        <th className="p-3">Luna Calendaristică</th>
                        <th className="p-3 font-mono">Cost Piese</th>
                        <th className="p-3 font-mono">Cost Manoperă</th>
                        <th className="p-3 font-mono">Cost Fluide / Uleiuri</th>
                        <th className="p-3 font-mono font-black text-right">Total Lună (RON)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-morning-200">
                      {(reportData?.evolutieLunara || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-sage-500 font-medium">
                            Nu există date de cost înregistrate în această perioadă.
                          </td>
                        </tr>
                      ) : (
                        reportData.evolutieLunara.map((row: any) => (
                          <tr key={row.luna} className="hover:bg-morning-50 transition">
                            <td className="p-3 font-bold text-sapphire-900 flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-sapphire-500" />
                              <span>{row.luna}</span>
                            </td>
                            <td className="p-3 font-mono font-bold text-blue-700">
                              {row.piese.toLocaleString('ro-RO')} RON
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-700">
                              {row.manopera.toLocaleString('ro-RO')} RON
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-700">
                              {row.fluide.toLocaleString('ro-RO')} RON
                            </td>
                            <td className="p-3 font-mono font-black text-sapphire-900 text-right">
                              {row.total.toLocaleString('ro-RO')} RON
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: JAVÍTÁSOK / COMENZI DE LUCRU */}
          {reportSubTab === 'reparatii' && (
            <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-morning-200 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                    <Wrench className="w-5 h-5 text-sapphire-600" />
                    <span>Centralizator Javítások & Comenzi de Lucru Mentenanță</span>
                  </h3>
                  <p className="text-xs text-sage-600 font-medium">
                    Toate intervențiile și reparațiile atelier deschise sau executate în perioada selectată
                  </p>
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                  <input
                    type="text"
                    value={searchReparatii}
                    onChange={(e) => setSearchReparatii(e.target.value)}
                    placeholder="Caută comandă, mecanic, utilaj..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-2 text-xs text-sapphire-900 font-medium focus:outline-none focus:border-sapphire-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {(() => {
                  const filtered = (reportData?.comenziLucru || []).filter((c: any) => {
                    if (!searchReparatii.trim()) return true;
                    const q = searchReparatii.toLowerCase();
                    return (
                      c.numarComanda?.toLowerCase().includes(q) ||
                      c.mecanicResponsabil?.toLowerCase().includes(q) ||
                      c.vehicul?.numarIntern?.toLowerCase().includes(q) ||
                      c.vehicul?.numarInmatriculare?.toLowerCase().includes(q) ||
                      c.observatii?.toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-2 bg-morning-50/50 rounded-2xl border border-dashed border-morning-200">
                        <Wrench className="w-8 h-8 text-sage-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">
                          Nu au fost găsite comenzi de lucru pentru filtrele aplicate.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
                      <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                        <tr>
                          <th className="p-3">Nr. Comandă & Dată</th>
                          <th className="p-3">Utilaj / Categorie</th>
                          <th className="p-3">Mecanic Responsabil</th>
                          <th className="p-3">Stare Comandă</th>
                          <th className="p-3 font-mono">Cost Piese</th>
                          <th className="p-3 font-mono">Cost Manoperă</th>
                          <th className="p-3 font-mono font-black">Cost Total</th>
                          <th className="p-3 text-right">Acțiuni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-200">
                        {filtered.map((c: any) => (
                          <tr key={c.id} className="hover:bg-morning-50 transition">
                            <td className="p-3">
                              <span className="font-extrabold text-sapphire-900 block font-mono">
                                #{c.numarComanda}
                              </span>
                              <span className="text-[10px] text-sage-500 font-medium">
                                {c.dataDeschidere ? new Date(c.dataDeschidere).toLocaleDateString('ro-RO') : ''}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-sapphire-900 block">
                                {c.vehicul?.numarIntern} ({c.vehicul?.numarInmatriculare})
                              </span>
                              <span className="text-[10px] text-sage-500">
                                {c.vehicul?.marca} {c.vehicul?.model} • {c.vehicul?.categorieEnum?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-3 font-medium text-slate-800">
                              {c.mecanicResponsabil || 'Atelier'}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  c.stare === 'FINALIZAT'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : c.stare === 'ANULAT'
                                    ? 'bg-roseash-100 text-terracotta-800'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {c.stare}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-blue-700">
                              {c.costPiese.toLocaleString('ro-RO')} RON
                            </td>
                            <td className="p-3 font-mono font-bold text-indigo-700">
                              {c.costManopera.toLocaleString('ro-RO')} RON
                            </td>
                            <td className="p-3 font-mono font-black text-sapphire-900">
                              {c.costTotal.toLocaleString('ro-RO')} RON
                            </td>
                            <td className="p-3 text-right">
                              <a
                                href={`/comenzi-lucru`}
                                className="px-3 py-1 bg-morning-100 hover:bg-morning-200 text-sapphire-900 border border-morning-300 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                              >
                                <span>Deschide</span>
                                <ArrowRight className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: FELHASZNÁLT ALKATRÉSZEK / PIESE CONSUMATE */}
          {reportSubTab === 'piese' && (
            <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-morning-200 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <span>Registru Felhasznált Alkatrészek & Materiale Consumate</span>
                  </h3>
                  <p className="text-xs text-sage-600 font-medium">
                    Toate piesele eliberate din stoc, piese din dezmembrări sau achiziții directe asociate lucrărilor
                  </p>
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                  <input
                    type="text"
                    value={searchPiese}
                    onChange={(e) => setSearchPiese(e.target.value)}
                    placeholder="Caută piesă, cod, factură..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-2 text-xs text-sapphire-900 font-medium focus:outline-none focus:border-sapphire-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                {(() => {
                  const filtered = (reportData?.pieseConsumate || []).filter((p: any) => {
                    if (!searchPiese.trim()) return true;
                    const q = searchPiese.toLowerCase();
                    return (
                      p.descriere?.toLowerCase().includes(q) ||
                      p.articolDenumire?.toLowerCase().includes(q) ||
                      p.articolCod?.toLowerCase().includes(q) ||
                      p.numarComanda?.toLowerCase().includes(q) ||
                      p.furnizor?.toLowerCase().includes(q) ||
                      p.numarFactura?.toLowerCase().includes(q) ||
                      p.vehicul?.numarIntern?.toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-2 bg-morning-50/50 rounded-2xl border border-dashed border-morning-200">
                        <Layers className="w-8 h-8 text-sage-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">
                          Nu au fost găsite piese consumate conform criteriilor de filtrare.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
                      <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                        <tr>
                          <th className="p-3">Dată & Comandă</th>
                          <th className="p-3">Denumire Piesă / Material</th>
                          <th className="p-3">Cod / Serie</th>
                          <th className="p-3">Utilaj Destinație</th>
                          <th className="p-3">Tip Pilon Cost</th>
                          <th className="p-3 font-mono text-center">Cantitate</th>
                          <th className="p-3 font-mono">Preț Unitar</th>
                          <th className="p-3 font-mono font-black text-right">Cost Total (RON)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-200">
                        {filtered.map((p: any) => (
                          <tr key={p.id} className="hover:bg-morning-50 transition">
                            <td className="p-3">
                              <span className="font-bold text-sapphire-900 block font-mono">
                                #{p.numarComanda}
                              </span>
                              <span className="text-[10px] text-sage-500">
                                {p.data ? new Date(p.data).toLocaleDateString('ro-RO') : ''}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-extrabold text-sapphire-900 block">
                                {p.articolDenumire || p.descriere}
                              </span>
                              {p.furnizor && (
                                <span className="text-[10px] text-sage-500 block">
                                  Furnizor: {p.furnizor} {p.numarFactura ? `(Fact. ${p.numarFactura})` : ''}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-slate-700 font-bold">
                              {p.articolCod || '—'}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-sapphire-900 block">
                                {p.vehicul?.numarIntern}
                              </span>
                              <span className="text-[10px] text-sage-500">
                                {p.vehicul?.categorieEnum?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-morning-100 text-slate-700 border border-morning-200">
                                {p.pilonCost}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-black text-center text-sapphire-900">
                              {p.cantitate}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-700">
                              {Number(p.pretUnitar || 0).toLocaleString('ro-RO')} RON
                            </td>
                            <td className="p-3 font-mono font-black text-sapphire-900 text-right">
                              {Number(p.costTotal || 0).toLocaleString('ro-RO')} RON
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

          {/* SUB-TAB 4: OLAJPÓTLÁSOK & INTERVENȚII FLUIDE (DETALIAT) */}
          {reportSubTab === 'fluide' && (
            <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white space-y-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-morning-200 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                    <Droplets className="w-5 h-5 text-amber-500" />
                    <span>Registru Completări Ulei & Schimburi Fluide (Olajpótlások)</span>
                  </h3>
                  <p className="text-xs text-sage-600 font-medium">
                    Evidența detaliată a fiecărei completări de nivel și a fiecărui schimb complet de fluid pe utilaj
                  </p>
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                  <input
                    type="text"
                    value={searchFluide}
                    onChange={(e) => setSearchFluide(e.target.value)}
                    placeholder="Caută fluid, mecanic, utilaj..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-2 text-xs text-sapphire-900 font-medium focus:outline-none focus:border-sapphire-500"
                  />
                </div>
              </div>

              {/* STATISTICI RAPIDE TAB FLUIDE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800">Volum Total Introdus</span>
                  <p className="text-lg font-mono font-black text-amber-950 mt-0.5">
                    {reportData?.totale?.totalVolumFluideLitri ? reportData.totale.totalVolumFluideLitri.toLocaleString('ro-RO') : '0'} Litri
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-800">Cost Total Fluide</span>
                  <p className="text-lg font-mono font-black text-amber-950 mt-0.5">
                    {reportData?.totale?.totalFluide ? reportData.totale.totalFluide.toLocaleString('ro-RO') : '0'} RON
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-morning-100 border border-morning-200">
                  <span className="text-[10px] uppercase font-bold text-sage-600">Total Intervenții</span>
                  <p className="text-lg font-mono font-black text-sapphire-900 mt-0.5">
                    {reportData?.totale?.numarCompletariFluide || 0} operațiuni
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-morning-100 border border-morning-200">
                  <span className="text-[10px] uppercase font-bold text-sage-600">Cost Mediu / Litru</span>
                  <p className="text-lg font-mono font-black text-sapphire-900 mt-0.5">
                    {(() => {
                      const tot = reportData?.totale?.totalFluide || 0;
                      const litri = reportData?.totale?.totalVolumFluideLitri || 0;
                      return litri > 0 ? (tot / litri).toFixed(2) : '0.00';
                    })()}{' '}
                    RON/L
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                {(() => {
                  const filtered = (reportData?.completariFluide || []).filter((f: any) => {
                    if (!searchFluide.trim()) return true;
                    const q = searchFluide.toLowerCase();
                    return (
                      f.tipLichid?.toLowerCase().includes(q) ||
                      f.mecanic?.toLowerCase().includes(q) ||
                      f.articolDenumire?.toLowerCase().includes(q) ||
                      f.marcaUlei?.toLowerCase().includes(q) ||
                      f.vehicul?.numarIntern?.toLowerCase().includes(q) ||
                      f.vehicul?.numarInmatriculare?.toLowerCase().includes(q) ||
                      f.observatii?.toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-2 bg-morning-50/50 rounded-2xl border border-dashed border-morning-200">
                        <Droplets className="w-8 h-8 text-sage-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">
                          Nu au fost găsite înregistrări de completare sau schimb ulei în această perioadă.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left text-xs text-slate-700 min-w-[950px]">
                      <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                        <tr>
                          <th className="p-3">Dată Operațiune</th>
                          <th className="p-3">Utilaj / Categorie</th>
                          <th className="p-3">Tip Fluid</th>
                          <th className="p-3">Operațiune</th>
                          <th className="p-3">Articol / Marcă Ulei</th>
                          <th className="p-3 font-mono text-center">Cantitate</th>
                          <th className="p-3 font-mono">Preț / Litru FIFO</th>
                          <th className="p-3 font-mono font-black">Cost Total</th>
                          <th className="p-3 font-mono">Contor Utilaj</th>
                          <th className="p-3">Mecanic / Operator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-200">
                        {filtered.map((f: any) => {
                          const isSchimb = f.tipOperatiune === 'SCHIMB_ULEI';
                          return (
                            <tr key={f.id} className="hover:bg-morning-50 transition">
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-bold text-sapphire-900 block">
                                  {f.dataCompletare ? new Date(f.dataCompletare).toLocaleDateString('ro-RO') : ''}
                                </span>
                                <span className="text-[10px] text-sage-500 font-mono">
                                  {f.dataCompletare ? new Date(f.dataCompletare).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-extrabold text-sapphire-900 block">
                                  {f.vehicul?.numarIntern} ({f.vehicul?.numarInmatriculare})
                                </span>
                                <span className="text-[10px] text-sage-500">
                                  {f.vehicul?.marca} {f.vehicul?.model} • {f.vehicul?.categorieEnum?.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200 inline-block text-[11px]">
                                  {f.tipLichid?.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isSchimb
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}
                                >
                                  {isSchimb ? 'Schimb Complet' : 'Completare (Top-up)'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-bold text-sapphire-900 block">
                                  {f.articolDenumire || f.marcaUlei || 'Standard'}
                                </span>
                                {f.articolCod && (
                                  <span className="text-[10px] text-sage-500 font-mono">
                                    Cod: {f.articolCod}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono font-black text-center text-sapphire-900 text-sm">
                                {f.cantitateLitri} L
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-700">
                                {Number(f.pretPerLitru || 0).toFixed(2)} RON/L
                              </td>
                              <td className="p-3 font-mono font-black text-amber-900">
                                {Number(f.costTotal || 0).toFixed(2)} RON
                              </td>
                              <td className="p-3 font-mono font-bold text-sapphire-800">
                                {Number(f.valoareContor || 0).toLocaleString('ro-RO')} {f.vehicul?.tipMasurare || 'KM'}
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-slate-800 block text-xs">
                                  {f.mecanic || 'Atelier'}
                                </span>
                                {f.observatii && (
                                  <span className="text-[10px] text-sage-500 italic block truncate max-w-[150px]">
                                    {f.observatii}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: REGISTRU ȘI ANALITICĂ CASĂRI / EXPLOZII (SCALABIL) */}
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
              <p className="text-[10px] uppercase text-terracotta-800"> Explozii în Mers</p>
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
              <p className="text-[10px] uppercase text-sapphire-800"> Uzură Normală</p>
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
              <p className="text-[10px] uppercase text-amber-800"> Tăieturi / Cordon</p>
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
              <p className="text-[10px] uppercase text-purple-800"> Geometrie Axă</p>
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
                          <p className="font-semibold text-slate-800 text-[11px]"> {c.operator}</p>
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
                              Cel mai rentabil
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
