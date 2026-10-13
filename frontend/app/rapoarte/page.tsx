"use client";

import { API_BASE_URL } from '@/lib/api';
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, DollarSign, Layers, Wrench, ShieldAlert, Search, Filter,
  Download, Truck, RefreshCw, Award, Droplets, Calendar, Printer,
  Car, Disc, Check, Info, ChevronDown, ChevronRight, Sparkles, AlertTriangle
} from 'lucide-react';

export default function RapoartePage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [tcoBrands, setTcoBrands] = useState<any[]>([]);
  const [analiticaCasari, setAnaliticaCasari] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------
  // HATÁSKÖR / SZŰRÉSI SZINT: 'FLOTA' (összesítve) | 'CATEGORIE' | 'VEHICUL' (1 autó)
  // -------------------------------------------------------------
  const [scopeMode, setScopeMode] = useState<'FLOTA' | 'CATEGORIE' | 'VEHICUL'>('FLOTA');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('CAP_TRACTOR');
  const [selectedVehiculId, setSelectedVehiculId] = useState<string>('');
  const [searchVehiculFilter, setSearchVehiculFilter] = useState<string>('');

  // -------------------------------------------------------------
  // IDŐSZAK SZŰRŐ (PRESETEK + EGYÉNI DÁTUMOK)
  // -------------------------------------------------------------
  const [periodPreset, setPeriodPreset] = useState<'luna_curenta' | 'luna_trecuta' | 'anul_curent' | 'ultimele_30' | 'ultimele_90' | 'tot' | 'custom'>('anul_curent');
  const [dataStart, setDataStart] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [dataEnd, setDataEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // -------------------------------------------------------------
  // RIPORT ADATOK & AL-FÜLEK
  // -------------------------------------------------------------
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'olajok' | 'anvelope' | 'piese_comenzi' | 'vehicule_tabel' | 'tco_casari'>('olajok');

  // Keresések az al-fülek táblázataiban
  const [searchFluideText, setSearchFluideText] = useState<string>('');
  const [searchAnvelopeText, setSearchAnvelopeText] = useState<string>('');
  const [searchPieseText, setSearchPieseText] = useState<string>('');
  const [searchVehiculeTable, setSearchVehiculeTable] = useState<string>('');

  // Járművek és kiegészítő adatok betöltése
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [resVeh, resTco, resCas] = await Promise.all([
        fetch(`${API_BASE_URL}/vehicule`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE_URL}/anvelope/comparatie-tco`).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE_URL}/anvelope/analitica-casari`).then((r) => (r.ok ? r.json() : null)),
      ]);
      setVehicule(resVeh || []);
      setTcoBrands(resTco || []);
      setAnaliticaCasari(resCas);

      if (resVeh && resVeh.length > 0 && !selectedVehiculId) {
        setSelectedVehiculId(resVeh[0].id);
      }
    } catch (e) {
      console.error('Hiba az alapadatok betöltésekor:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fő riport adatok lekérése a kiválasztott hatáskör és időszak szerint
  const fetchReportData = async () => {
    setLoadingReport(true);
    try {
      const params = new URLSearchParams();

      if (scopeMode === 'VEHICUL' && selectedVehiculId) {
        params.append('vehiculId', selectedVehiculId);
      } else if (scopeMode === 'CATEGORIE' && selectedCategorie) {
        params.append('categorie', selectedCategorie);
      }

      if (dataStart) params.append('dataStart', dataStart);
      if (dataEnd) params.append('dataEnd', dataEnd);

      const res = await fetch(`${API_BASE_URL}/mentenanta/raport-activitate-costuri?${params.toString()}`);
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch (e) {
      console.error('Hiba a riport lekérésekor:', e);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [scopeMode, selectedCategorie, selectedVehiculId, dataStart, dataEnd]);

  // Időszak preset kezelése
  const handlePeriodChange = (preset: 'luna_curenta' | 'luna_trecuta' | 'anul_curent' | 'ultimele_30' | 'ultimele_90' | 'tot') => {
    setPeriodPreset(preset);
    const now = new Date();
    let s = '';
    let e = now.toISOString().split('T')[0];

    if (preset === 'luna_curenta') {
      const startD = new Date(now.getFullYear(), now.getMonth(), 1);
      const endD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      s = startD.toISOString().split('T')[0];
      e = endD.toISOString().split('T')[0];
    } else if (preset === 'luna_trecuta') {
      const startD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endD = new Date(now.getFullYear(), now.getMonth(), 0);
      s = startD.toISOString().split('T')[0];
      e = endD.toISOString().split('T')[0];
    } else if (preset === 'anul_curent') {
      s = `${now.getFullYear()}-01-01`;
      e = `${now.getFullYear()}-12-31`;
    } else if (preset === 'ultimele_30') {
      const startD = new Date();
      startD.setDate(startD.getDate() - 30);
      s = startD.toISOString().split('T')[0];
    } else if (preset === 'ultimele_90') {
      const startD = new Date();
      startD.setDate(startD.getDate() - 90);
      s = startD.toISOString().split('T')[0];
    } else if (preset === 'tot') {
      s = '';
      e = '';
    }

    setDataStart(s);
    setDataEnd(e);
  };

  // Kategóriák listája a járművekből
  const categoriiDisponibile = useMemo(() => {
    const setCat = new Set<string>();
    (vehicule || []).forEach((v) => {
      if (v.categorieEnum) setCat.add(v.categorieEnum);
    });
    return Array.from(setCat).sort();
  }, [vehicule]);

  // Kereshető járművek a kiválasztóhoz
  const filteredVehiculeSelect = useMemo(() => {
    if (!searchVehiculFilter.trim()) return vehicule;
    const q = searchVehiculFilter.toLowerCase();
    return (vehicule || []).filter(
      (v) =>
        v.numarIntern?.toLowerCase().includes(q) ||
        v.numarInmatriculare?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q)
    );
  }, [vehicule, searchVehiculFilter]);

  // Aktuálisan kiválasztott jármű adatai
  const currentVehiculObject = useMemo(() => {
    if (scopeMode !== 'VEHICUL') return null;
    return (vehicule || []).find((v) => v.id === selectedVehiculId) || null;
  }, [vehicule, selectedVehiculId, scopeMode]);

  // Szűrt lista: Olajok & Folyadékok
  const filteredFluide = useMemo(() => {
    const list = reportData?.completariFluide || [];
    if (!searchFluideText.trim()) return list;
    const q = searchFluideText.toLowerCase();
    return list.filter(
      (f: any) =>
        f.tipLichid?.toLowerCase().includes(q) ||
        f.marcaUlei?.toLowerCase().includes(q) ||
        f.articolDenumire?.toLowerCase().includes(q) ||
        f.mecanic?.toLowerCase().includes(q) ||
        f.observatii?.toLowerCase().includes(q) ||
        f.vehicul?.numarIntern?.toLowerCase().includes(q) ||
        f.vehicul?.numarInmatriculare?.toLowerCase().includes(q)
    );
  }, [reportData, searchFluideText]);

  // Szűrt lista: Anvelope
  const filteredAnvelope = useMemo(() => {
    const list = reportData?.anvelopeMontate || [];
    if (!searchAnvelopeText.trim()) return list;
    const q = searchAnvelopeText.toLowerCase();
    return list.filter(
      (a: any) =>
        a.marca?.toLowerCase().includes(q) ||
        a.model?.toLowerCase().includes(q) ||
        a.dimensiune?.toLowerCase().includes(q) ||
        a.serieAnvelopa?.toLowerCase().includes(q) ||
        a.pozitieAx?.toLowerCase().includes(q) ||
        a.operator?.toLowerCase().includes(q) ||
        a.vehicul?.numarIntern?.toLowerCase().includes(q) ||
        a.vehicul?.numarInmatriculare?.toLowerCase().includes(q)
    );
  }, [reportData, searchAnvelopeText]);

  // Szűrt lista: Piese & Comenzi
  const filteredPiese = useMemo(() => {
    const list = reportData?.pieseConsumate || [];
    if (!searchPieseText.trim()) return list;
    const q = searchPieseText.toLowerCase();
    return list.filter(
      (p: any) =>
        p.descriere?.toLowerCase().includes(q) ||
        p.articolDenumire?.toLowerCase().includes(q) ||
        p.articolCod?.toLowerCase().includes(q) ||
        p.furnizor?.toLowerCase().includes(q) ||
        p.numarComanda?.toLowerCase().includes(q) ||
        p.vehicul?.numarIntern?.toLowerCase().includes(q) ||
        p.vehicul?.numarInmatriculare?.toLowerCase().includes(q)
    );
  }, [reportData, searchPieseText]);

  // Szűrt lista: Járművek táblázat
  const filteredVehiculeStats = useMemo(() => {
    const list = reportData?.statisticiVehicule || [];
    if (!searchVehiculeTable.trim()) return list;
    const q = searchVehiculeTable.toLowerCase();
    return list.filter(
      (v: any) =>
        v.numarIntern?.toLowerCase().includes(q) ||
        v.numarInmatriculare?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.categorieEnum?.toLowerCase().includes(q)
    );
  }, [reportData, searchVehiculeTable]);

  // CSV letöltő segéd
  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const dateStr = new Date().toISOString().split('T')[0];

    if (activeSubTab === 'olajok') {
      const headers = ['Data', 'Vehicul', 'Nr. Inmatriculare', 'Tip Fluid', 'Operatiune', 'Denumire / Marca', 'Cantitate Litri', 'Pret Unitar (RON)', 'Cost Total (RON)', 'Index Contor', 'Mecanic', 'Sursa'];
      const rows = (filteredFluide || []).map((f: any) => [
        f.dataCompletare ? new Date(f.dataCompletare).toLocaleDateString('ro-RO') : '',
        `"${f.vehicul?.numarIntern || ''}"`,
        `"${f.vehicul?.numarInmatriculare || ''}"`,
        `"${f.tipLichid || ''}"`,
        f.tipOperatiune === 'SCHIMB_ULEI' ? 'Csere (Revizie)' : 'Pótlás (Completare)',
        `"${(f.articolDenumire || f.marcaUlei || '').replace(/"/g, '""')}"`,
        f.cantitateLitri,
        f.pretPerLitru,
        f.costTotal,
        f.valoareContor,
        `"${f.mecanic || ''}"`,
        `"${f.provenienta || ''}"`,
      ]);
      downloadCSV(headers, rows, `Raport_Olajok_Fluide_${dateStr}.csv`);
    } else if (activeSubTab === 'anvelope') {
      const headers = ['Data Montaj', 'Vehicul', 'Nr. Inmatriculare', 'Marca Anvelopa', 'Model', 'Dimensiune', 'Serie / SN', 'DOT', 'Pozitie Ax', 'Pret Achizitie (RON)', 'Km Montare', 'Operator', 'Sursa'];
      const rows = (filteredAnvelope || []).map((a: any) => [
        a.data ? new Date(a.data).toLocaleDateString('ro-RO') : '',
        `"${a.vehicul?.numarIntern || ''}"`,
        `"${a.vehicul?.numarInmatriculare || ''}"`,
        `"${a.marca || ''}"`,
        `"${a.model || ''}"`,
        `"${a.dimensiune || ''}"`,
        `"${a.serieAnvelopa || ''}"`,
        `"${a.codDot || ''}"`,
        `"${a.pozitieAx || ''}"`,
        a.pretAchizitie,
        a.valoareContor,
        `"${a.operator || ''}"`,
        `"${a.provenienta || ''}"`,
      ]);
      downloadCSV(headers, rows, `Raport_Gumiabroncsok_${dateStr}.csv`);
    } else if (activeSubTab === 'piese_comenzi') {
      const headers = ['Data', 'Comanda Lucru', 'Vehicul', 'Nr. Inmatriculare', 'Denumire Piesa', 'Cod Piesa', 'Cantitate', 'Pret Unitar (RON)', 'Cost Total (RON)', 'Furnizor', 'Nr. Factura'];
      const rows = (filteredPiese || []).map((p: any) => [
        p.data ? new Date(p.data).toLocaleDateString('ro-RO') : '',
        `"${p.numarComanda || ''}"`,
        `"${p.vehicul?.numarIntern || ''}"`,
        `"${p.vehicul?.numarInmatriculare || ''}"`,
        `"${(p.descriere || p.articolDenumire || '').replace(/"/g, '""')}"`,
        `"${p.articolCod || ''}"`,
        p.cantitate,
        p.pretUnitar,
        p.costTotal,
        `"${p.furnizor || ''}"`,
        `"${p.numarFactura || ''}"`,
      ]);
      downloadCSV(headers, rows, `Raport_Alkatreszek_${dateStr}.csv`);
    } else {
      const headers = ['Vehicul', 'Nr. Inmatriculare', 'Categorie', 'Cost Total (RON)', 'Gumira Koltott (RON)', 'Olaj Csere (RON)', 'Olaj Potlas (RON)', 'Alkatreszek (RON)', 'Manopera (RON)', 'Olaj Litri'];
      const rows = (filteredVehiculeStats || []).map((v: any) => [
        `"${v.numarIntern || ''}"`,
        `"${v.numarInmatriculare || ''}"`,
        `"${v.categorieEnum || ''}"`,
        v.totalCost,
        v.costAnvelope,
        v.costFluideCsere,
        v.costFluidePotlas,
        v.costPiese,
        v.costManopera,
        v.volumFluideLitri,
      ]);
      downloadCSV(headers, rows, `Raport_Jarmuonkenti_Osszesites_${dateStr}.csv`);
    }
  };

  const totale = reportData?.totale || {};

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. FEJLÉC (FELESLEGES KÁRTYÁK NÉLKÜL, TISZTA ÉS STRUKTURÁLT)   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-morning-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-sapphire-900 tracking-tight flex items-center space-x-2.5">
            <BarChart3 className="w-7 h-7 text-sapphire-600" />
            <span>Rapoarte & Analitică Costuri Flotă</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium mt-0.5">
            Költségek időszakos bontása: Gumik, Olajok (Csere vs. Pótlás), Alkatrészek és Munkadíjak – Flotta, Kategória vagy 1 Autó szerint.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap">
          <button
            onClick={() => {
              fetchInitialData();
              fetchReportData();
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Adatok újratöltése"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sapphire-600 ${loadingReport ? 'animate-spin' : ''}`} />
            <span>Frissítés</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            title="Aktuális táblázat exportálása CSV fájlba"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Nyomtatás vagy mentés PDF formátumban"
          >
            <Printer className="w-3.5 h-3.5 text-sapphire-600" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. VEZÉRLŐPULT: IDŐSZAK + HATÁSKÖR (TELJES / KATEGÓRIA / 1 AUTÓ) */}
      {/* ------------------------------------------------------------- */}
      <div className="pleasant-card p-5 rounded-2xl border border-morning-200 bg-white space-y-4 shadow-sm">
        {/* SOR 1: IDŐSZAK VÁLASZTÁS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-morning-100 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-sapphire-600" />
            <span className="text-xs font-black text-sapphire-900 uppercase tracking-wider">Időszak (Perioadă):</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'luna_curenta', label: 'Ez a hónap' },
              { key: 'luna_trecuta', label: 'Múlt hónap' },
              { key: 'anul_curent', label: 'Ez az év (YTD)' },
              { key: 'ultimele_30', label: 'Elmúlt 30 nap' },
              { key: 'ultimele_90', label: 'Elmúlt 90 nap' },
              { key: 'tot', label: 'Minden adat' },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePeriodChange(p.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodPreset === p.key
                    ? 'bg-sapphire-600 text-white shadow-2xs font-black'
                    : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="flex items-center space-x-1.5 pl-2 border-l border-morning-200 ml-1">
              <input
                type="date"
                value={dataStart}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setDataStart(e.target.value);
                }}
                className="px-2 py-1 bg-morning-50 border border-morning-300 rounded-lg text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-1 focus:ring-sapphire-500"
                title="Kezdő dátum (De la)"
              />
              <span className="text-xs text-sage-400 font-bold">→</span>
              <input
                type="date"
                value={dataEnd}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setDataEnd(e.target.value);
                }}
                className="px-2 py-1 bg-morning-50 border border-morning-300 rounded-lg text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-1 focus:ring-sapphire-500"
                title="Záró dátum (Până la)"
              />
            </div>
          </div>
        </div>

        {/* SOR 2: HATÁSKÖR / SZŰRÉSI SZINT VÁLASZTÓ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-sapphire-600" />
            <span className="text-xs font-black text-sapphire-900 uppercase tracking-wider">Riport Szintje:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setScopeMode('FLOTA')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                scopeMode === 'FLOTA'
                  ? 'bg-sapphire-900 text-white shadow-sm font-black ring-2 ring-sapphire-600/30'
                  : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
              }`}
            >
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>1. Teljes Flotta (Összesítve)</span>
            </button>

            <button
              onClick={() => setScopeMode('CATEGORIE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                scopeMode === 'CATEGORIE'
                  ? 'bg-sapphire-900 text-white shadow-sm font-black ring-2 ring-sapphire-600/30'
                  : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>2. Kategóriára Összesítve</span>
            </button>

            <button
              onClick={() => setScopeMode('VEHICUL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                scopeMode === 'VEHICUL'
                  ? 'bg-sapphire-900 text-white shadow-sm font-black ring-2 ring-sapphire-600/30'
                  : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
              }`}
            >
              <Car className="w-4 h-4 text-blue-400" />
              <span>3. Egy Konkrét Autóra (1 Jármű)</span>
            </button>
          </div>
        </div>

        {/* SOR 3: HA KATEGÓRIA VAGY EGYEDI JÁRMŰ VAN KIVÁLASZTVA, A MEGFELELŐ LENYÍLÓ VÁLASZTÓ */}
        {scopeMode === 'CATEGORIE' && (
          <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-xl flex items-center space-x-3">
            <span className="text-xs font-extrabold text-amber-950">Válassz Kategóriát:</span>
            <select
              value={selectedCategorie}
              onChange={(e) => setSelectedCategorie(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white font-black text-xs text-sapphire-900 shadow-2xs focus:outline-none"
            >
              {categoriiDisponibile.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-amber-900 font-medium">
              A választott kategóriához tartozó összes jármű összesített költségeit mutatja.
            </span>
          </div>
        )}

        {scopeMode === 'VEHICUL' && (
          <div className="p-3 bg-blue-500/10 border border-blue-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 flex-wrap">
              <span className="text-xs font-extrabold text-blue-950">Válassz Járművet:</span>
              <select
                value={selectedVehiculId}
                onChange={(e) => setSelectedVehiculId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-blue-300 bg-white font-black text-xs text-sapphire-900 shadow-2xs focus:outline-none"
              >
                {filteredVehiculeSelect.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.numarIntern} • {v.numarInmatriculare} ({v.marca} {v.model}) [{v.categorieEnum}]
                  </option>
                ))}
              </select>
            </div>

            {currentVehiculObject && (
              <div className="text-xs font-mono font-bold text-sapphire-900 bg-white px-3 py-1 rounded-lg border border-blue-200">
                Jelenlegi óraállás: <strong className="text-emerald-700">{currentVehiculObject.valoareContorCurent?.toLocaleString('ro-RO')} {currentVehiculObject.tipMasurare}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. FŐ ÖSSZESÍTŐ TÁBLÁZAT: KONKRÉT ÉRTÉKEK A KIVÁLASZTOTT PERIÓDUSRA */}
      {/* ------------------------------------------------------------- */}
      <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-morning-200 pb-3">
          <div>
            <h2 className="text-sm font-black text-sapphire-950 uppercase tracking-wider flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>
                Költségösszesítés:{' '}
                {scopeMode === 'FLOTA'
                  ? 'Teljes Flotta'
                  : scopeMode === 'CATEGORIE'
                  ? `Kategória: ${selectedCategorie.replace(/_/g, ' ')}`
                  : `Jármű: ${currentVehiculObject?.numarIntern || ''} (${currentVehiculObject?.numarInmatriculare || ''})`}
              </span>
            </h2>
            <p className="text-[11px] text-sage-600 font-medium">
              Időszak: {dataStart || 'Kezdet'} → {dataEnd || 'Ma'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-sage-500 uppercase">Összes Ráköltött:</span>
            <div className="text-2xl font-black text-sapphire-900 font-mono">
              {totale.totalGeneral ? totale.totalGeneral.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'} RON
            </div>
          </div>
        </div>

        {/* STRUKTURÁLT KÖLTSÉG KIMUTATÁS (NEM DÍSZKÁRTYÁK, HANEM PONTOS SOROK ÉS SZÁMOK) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* GUMIRA KÖLTÖTT */}
          <div className="p-3.5 rounded-xl border border-morning-200 bg-morning-50/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-sapphire-900 uppercase tracking-wider flex items-center space-x-1">
                <Disc className="w-3.5 h-3.5 text-blue-600" />
                <span>Gumira költött</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded">
                {totale.totalAnvelopeBuc || 0} db
              </span>
            </div>
            <div className="text-xl font-black text-sapphire-950 font-mono mt-1">
              {totale.totalAnvelope ? totale.totalAnvelope.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '0,00'} RON
            </div>
            <p className="text-[10px] text-sage-600 font-medium mt-1">Újonnan autóra szerelt abroncsok vételára</p>
          </div>

          {/* OLAJRA KÖLTÖTT (CSERE + PÓTLÁS) */}
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider flex items-center space-x-1">
                <Droplets className="w-3.5 h-3.5 text-amber-600" />
                <span>Olajra költött</span>
              </span>
              <span className="text-[11px] font-mono font-black text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded">
                {totale.totalVolumFluideLitri || 0} L
              </span>
            </div>
            <div className="text-xl font-black text-amber-950 font-mono mt-1">
              {totale.totalFluide ? totale.totalFluide.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '0,00'} RON
            </div>
            <div className="pt-2 border-t border-amber-200/80 mt-2 space-y-0.5 text-[11px]">
              <div className="flex items-center justify-between font-bold text-amber-950">
                <span>🔄 Ebből Csere (Revízió):</span>
                <span className="font-mono text-emerald-800">
                  {totale.totalFluideCsereCost ? totale.totalFluideCsereCost.toLocaleString('ro-RO') : '0'} RON ({totale.totalFluideCsereLitri || 0} L)
                </span>
              </div>
              <div className="flex items-center justify-between font-bold text-amber-950">
                <span>💧 Ebből Pótlás (Utántöltés):</span>
                <span className="font-mono text-rose-800">
                  {totale.totalFluidePotlasCost ? totale.totalFluidePotlasCost.toLocaleString('ro-RO') : '0'} RON ({totale.totalFluidePotlasLitri || 0} L)
                </span>
              </div>
            </div>
          </div>

          {/* ALKATRÉSZEKRE KÖLTÖTT */}
          <div className="p-3.5 rounded-xl border border-morning-200 bg-morning-50/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-sapphire-900 uppercase tracking-wider flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Alkatrészekre költött</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">
                {totale.numarPieseConsumate || 0} tétel
              </span>
            </div>
            <div className="text-xl font-black text-sapphire-950 font-mono mt-1">
              {totale.totalPiese ? totale.totalPiese.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '0,00'} RON
            </div>
            <p className="text-[10px] text-sage-600 font-medium mt-1">Szűrők, fékek, szerelvények, anyagok</p>
          </div>

          {/* MUNKADÍJ / JAVÍTÁS */}
          <div className="p-3.5 rounded-xl border border-morning-200 bg-morning-50/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-black text-sapphire-900 uppercase tracking-wider flex items-center space-x-1">
                <Wrench className="w-3.5 h-3.5 text-slate-600" />
                <span>Munkadíj & Javítás</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded">
                {totale.numarComenziLucru || 0} munkalap
              </span>
            </div>
            <div className="text-xl font-black text-sapphire-950 font-mono mt-1">
              {totale.totalManopera ? totale.totalManopera.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '0,00'} RON
            </div>
            <p className="text-[10px] text-sage-600 font-medium mt-1">Belső és külső szervizmunkák költsége</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. OLAJOK & FOLYADÉKOK LEBONTÁSA TÍPUSONKÉNT (TÁBLÁZAT)       */}
      {/* ------------------------------------------------------------- */}
      <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-morning-200 pb-2">
          <h2 className="text-sm font-black text-sapphire-950 uppercase tracking-wider flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-amber-600" />
            <span>Olajok és Folyadékok Típus Szerinti Bontása (Mennyiség & Költség)</span>
          </h2>
          <span className="text-xs font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
            Összesen: {totale.totalVolumFluideLitri || 0} L • {totale.totalFluide ? totale.totalFluide.toLocaleString('ro-RO') : '0'} RON
          </span>
        </div>

        {reportData?.fluidePeTipuri && reportData.fluidePeTipuri.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-morning-200 bg-morning-100/70 text-sage-700 font-extrabold uppercase text-[10px]">
                  <th className="p-2.5">Folyadék Típusa</th>
                  <th className="p-2.5 text-right">Összes Mennyiség</th>
                  <th className="p-2.5 text-right text-emerald-800">Ebből Csere (Revízió)</th>
                  <th className="p-2.5 text-right text-rose-800">Ebből Pótlás (Utántöltés)</th>
                  <th className="p-2.5 text-right">Átlagos Ár / Liter</th>
                  <th className="p-2.5 text-right font-black text-sapphire-950">Összes Költség</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-100">
                {reportData.fluidePeTipuri.map((tip: any) => (
                  <tr key={tip.key} className="hover:bg-morning-50/80 transition font-medium">
                    <td className="p-2.5 font-bold text-sapphire-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>{tip.label}</span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-sapphire-950">
                      {tip.totalLitri} L
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-800 font-bold">
                      {tip.csereLitri} L <span className="text-[10px] text-sage-500">({tip.csereCost?.toLocaleString('ro-RO')} RON)</span>
                    </td>
                    <td className="p-2.5 text-right font-mono text-rose-800 font-bold">
                      {tip.potlasLitri} L <span className="text-[10px] text-sage-500">({tip.potlasCost?.toLocaleString('ro-RO')} RON)</span>
                    </td>
                    <td className="p-2.5 text-right font-mono text-sage-700">
                      {tip.pretMediuPerLitru?.toFixed(2)} RON/L
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-sapphire-950">
                      {tip.totalCost?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs font-bold text-sage-500 bg-morning-50 rounded-xl">
            A kiválasztott időszakban és hatáskörben nem történt olajfelhasználás vagy pótlás.
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. RÉSZLETES TÉTELES FÜLEK (OLAJOK, GUMIK, ALKATRÉSZEK, AUTÓK) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        {/* AL-FÜLEK GOMBJAI */}
        <div className="flex items-center space-x-2 border-b border-morning-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('olajok')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'olajok'
                ? 'bg-amber-500 text-white shadow-2xs font-black'
                : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>🛢️ Olajok & Folyadékok Tételei ({reportData?.completariFluide?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('anvelope')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'anvelope'
                ? 'bg-sapphire-600 text-white shadow-2xs font-black'
                : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>🛞 Felszerelt Gumiabroncsok ({reportData?.anvelopeMontate?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('piese_comenzi')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'piese_comenzi'
                ? 'bg-sapphire-600 text-white shadow-2xs font-black'
                : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>🔧 Alkatrészek & Javítások ({reportData?.pieseConsumate?.length || 0})</span>
          </button>

          {scopeMode !== 'VEHICUL' && (
            <button
              onClick={() => setActiveSubTab('vehicule_tabel')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeSubTab === 'vehicule_tabel'
                  ? 'bg-sapphire-600 text-white shadow-2xs font-black'
                  : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>📊 Járművenkénti Bontás ({reportData?.statisticiVehicule?.length || 0})</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('tco_casari')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeSubTab === 'tco_casari'
                ? 'bg-sapphire-900 text-white shadow-2xs font-black'
                : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>🏆 Gumiabroncs TCO & Selejtezések ({analiticaCasari?.totalCasate || 0})</span>
          </button>
        </div>

        {/* FÜL 1: OLAJOK ÉS FOLYADÉKOK TÉTELES LISTÁJA */}
        {activeSubTab === 'olajok' && (
          <div className="pleasant-card rounded-2xl p-4 border border-morning-200 bg-white shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-sapphire-900 uppercase">
                Minden rögzített olajcsere és pótlás az időszakban:
              </span>
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-sage-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Keresés olaj típus, jármű vagy szerelő szerint..."
                  value={searchFluideText}
                  onChange={(e) => setSearchFluideText(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-sapphire-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-morning-200 bg-morning-100/70 text-sage-700 font-extrabold uppercase text-[10px]">
                    <th className="p-2.5">Dátum</th>
                    <th className="p-2.5">Jármű</th>
                    <th className="p-2.5">Művelet</th>
                    <th className="p-2.5">Folyadék Típus / Megnevezés</th>
                    <th className="p-2.5 text-right">Mennyiség</th>
                    <th className="p-2.5 text-right">Egységár</th>
                    <th className="p-2.5 text-right">Összeg</th>
                    <th className="p-2.5">Km / Üzemóra</th>
                    <th className="p-2.5">Felelős / Szerelő</th>
                    <th className="p-2.5">Forrás</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-100">
                  {filteredFluide.length > 0 ? (
                    filteredFluide.map((f: any) => (
                      <tr key={f.id} className="hover:bg-morning-50/80 transition">
                        <td className="p-2.5 font-mono text-sage-700">
                          {f.dataCompletare ? new Date(f.dataCompletare).toLocaleDateString('ro-RO') : '-'}
                        </td>
                        <td className="p-2.5 font-bold text-sapphire-950">
                          {f.vehicul?.numarIntern || '-'} <span className="text-[10px] text-sage-500 font-normal font-mono">({f.vehicul?.numarInmatriculare || ''})</span>
                        </td>
                        <td className="p-2.5">
                          {f.tipOperatiune === 'SCHIMB_ULEI' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                              🔄 Csere (Revízió)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                              💧 Pótlás (Utántöltés)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-medium text-sapphire-900">
                          <div>{f.articolDenumire || f.marcaUlei || f.tipLichid}</div>
                          {f.observatii && <div className="text-[10px] text-sage-500 italic">{f.observatii}</div>}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-amber-900">
                          {f.cantitateLitri} L
                        </td>
                        <td className="p-2.5 text-right font-mono text-sage-700">
                          {Number(f.pretPerLitru || 0).toFixed(2)} RON
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-sapphire-950">
                          {Number(f.costTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </td>
                        <td className="p-2.5 font-mono text-sage-700">
                          {f.valoareContor ? `${f.valoareContor.toLocaleString('ro-RO')} ${f.vehicul?.tipMasurare || 'KM'}` : '-'}
                        </td>
                        <td className="p-2.5 text-slate-800 font-bold">{f.mecanic || '-'}</td>
                        <td className="p-2.5 text-[10px] text-sage-500">{f.provenienta || 'Fluide'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-xs font-bold text-sage-500">
                        Nincs megjeleníthető olaj / folyadék bejegyzés a választott időszakban.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FÜL 2: FELSZERELT GUMIABRONCSOK */}
        {activeSubTab === 'anvelope' && (
          <div className="pleasant-card rounded-2xl p-4 border border-morning-200 bg-white shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-sapphire-900 uppercase">
                Minden felszerelt új/stoc gumiabroncs a járművekre:
              </span>
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-sage-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Keresés márka, méret, DOT vagy autó..."
                  value={searchAnvelopeText}
                  onChange={(e) => setSearchAnvelopeText(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-sapphire-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-morning-200 bg-morning-100/70 text-sage-700 font-extrabold uppercase text-[10px]">
                    <th className="p-2.5">Dátum</th>
                    <th className="p-2.5">Jármű</th>
                    <th className="p-2.5">Márka & Modell</th>
                    <th className="p-2.5">Méret</th>
                    <th className="p-2.5">Széria / SN</th>
                    <th className="p-2.5">DOT</th>
                    <th className="p-2.5">Tengely / Pozíció</th>
                    <th className="p-2.5 text-right font-black text-sapphire-950">Vételár (Költség)</th>
                    <th className="p-2.5">Óraállás</th>
                    <th className="p-2.5">Felelős</th>
                    <th className="p-2.5">Forrás</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-100">
                  {filteredAnvelope.length > 0 ? (
                    filteredAnvelope.map((a: any) => (
                      <tr key={a.id} className="hover:bg-morning-50/80 transition">
                        <td className="p-2.5 font-mono text-sage-700">
                          {a.data ? new Date(a.data).toLocaleDateString('ro-RO') : '-'}
                        </td>
                        <td className="p-2.5 font-bold text-sapphire-950">
                          {a.vehicul?.numarIntern || '-'} <span className="text-[10px] text-sage-500 font-normal font-mono">({a.vehicul?.numarInmatriculare || ''})</span>
                        </td>
                        <td className="p-2.5 font-bold text-sapphire-900">
                          {a.marca} {a.model !== '-' ? a.model : ''}
                        </td>
                        <td className="p-2.5 font-mono text-blue-900 font-bold">{a.dimensiune}</td>
                        <td className="p-2.5 font-mono text-sage-700">{a.serieAnvelopa}</td>
                        <td className="p-2.5 font-mono text-sage-700">{a.codDot}</td>
                        <td className="p-2.5 font-mono font-bold text-sapphire-800 bg-sapphire-50/50">
                          {a.pozitieAx}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-sapphire-950">
                          {Number(a.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </td>
                        <td className="p-2.5 font-mono text-sage-700">
                          {a.valoareContor ? a.valoareContor.toLocaleString('ro-RO') : '-'}
                        </td>
                        <td className="p-2.5 text-slate-800 font-bold">{a.operator || '-'}</td>
                        <td className="p-2.5 text-[10px] text-sage-500">{a.provenienta}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-xs font-bold text-sage-500">
                        Nincs gumiabroncs felszerelés a kiválasztott időszakban.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FÜL 3: ALKATRÉSZEK & JAVÍTÁSOK */}
        {activeSubTab === 'piese_comenzi' && (
          <div className="pleasant-card rounded-2xl p-4 border border-morning-200 bg-white shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-sapphire-900 uppercase">
                Munkalapokon beépített alkatrészek és anyagok:
              </span>
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-sage-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Keresés alkatrész, cikkszám, számla vagy autó..."
                  value={searchPieseText}
                  onChange={(e) => setSearchPieseText(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-sapphire-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-morning-200 bg-morning-100/70 text-sage-700 font-extrabold uppercase text-[10px]">
                    <th className="p-2.5">Dátum</th>
                    <th className="p-2.5">Munkalap Sz.</th>
                    <th className="p-2.5">Jármű</th>
                    <th className="p-2.5">Megnevezés</th>
                    <th className="p-2.5">Cikkszám</th>
                    <th className="p-2.5 text-right">Mennyiség</th>
                    <th className="p-2.5 text-right">Egységár</th>
                    <th className="p-2.5 text-right font-black text-sapphire-950">Összérték</th>
                    <th className="p-2.5">Beszállító</th>
                    <th className="p-2.5">Számlaszám</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-100">
                  {filteredPiese.length > 0 ? (
                    filteredPiese.map((p: any) => (
                      <tr key={p.id} className="hover:bg-morning-50/80 transition">
                        <td className="p-2.5 font-mono text-sage-700">
                          {p.data ? new Date(p.data).toLocaleDateString('ro-RO') : '-'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-sapphire-700">
                          {p.numarComanda || '-'}
                        </td>
                        <td className="p-2.5 font-bold text-sapphire-950">
                          {p.vehicul?.numarIntern || '-'} <span className="text-[10px] text-sage-500 font-normal font-mono">({p.vehicul?.numarInmatriculare || ''})</span>
                        </td>
                        <td className="p-2.5 font-medium text-sapphire-900">
                          {p.descriere || p.articolDenumire}
                        </td>
                        <td className="p-2.5 font-mono text-sage-700">{p.articolCod || '-'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">{p.cantitate}</td>
                        <td className="p-2.5 text-right font-mono text-sage-700">
                          {Number(p.pretUnitar || 0).toFixed(2)} RON
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-sapphire-950">
                          {Number(p.costTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </td>
                        <td className="p-2.5 text-slate-800 font-medium">{p.furnizor || '-'}</td>
                        <td className="p-2.5 font-mono text-sage-700">{p.numarFactura || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-xs font-bold text-sage-500">
                        Nincs beépített alkatrész a választott időszakban.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FÜL 4: JÁRMŰVENKÉNTI ÖSSZEHASONLÍTÓ BONTÁS TÁBLÁZAT */}
        {activeSubTab === 'vehicule_tabel' && scopeMode !== 'VEHICUL' && (
          <div className="pleasant-card rounded-2xl p-4 border border-morning-200 bg-white shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black text-sapphire-900 uppercase">
                Minden gépjármű költsége egy helyen (Rákattintva részletes riport):
              </span>
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 text-sage-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Keresés autó vagy rendszám szerint..."
                  value={searchVehiculeTable}
                  onChange={(e) => setSearchVehiculeTable(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-sapphire-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-morning-200 bg-morning-100/70 text-sage-700 font-extrabold uppercase text-[10px]">
                    <th className="p-2.5">Jármű / Azonosító</th>
                    <th className="p-2.5">Kategória</th>
                    <th className="p-2.5 text-right font-black text-sapphire-950">Összes Ráköltött</th>
                    <th className="p-2.5 text-right text-blue-900 font-bold">Gumira Költött</th>
                    <th className="p-2.5 text-right text-emerald-800 font-bold">Olaj Csere</th>
                    <th className="p-2.5 text-right text-rose-800 font-bold">Olaj Pótlás</th>
                    <th className="p-2.5 text-right text-indigo-900 font-bold">Alkatrészek</th>
                    <th className="p-2.5 text-right text-slate-700">Munkadíj</th>
                    <th className="p-2.5 text-center">Művelet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-100">
                  {filteredVehiculeStats.length > 0 ? (
                    filteredVehiculeStats.map((v: any) => (
                      <tr key={v.id} className="hover:bg-morning-50/80 transition">
                        <td className="p-2.5 font-bold text-sapphire-950">
                          <div>{v.numarIntern}</div>
                          <div className="text-[10px] text-sage-500 font-mono font-normal">{v.numarInmatriculare} ({v.marca} {v.model})</div>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-sage-700">
                          {v.categorieEnum?.replace(/_/g, ' ')}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-sapphire-950 text-sm">
                          {v.totalCost?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                          {v.costAnvelope ? `${v.costAnvelope.toLocaleString('ro-RO')} RON` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-800">
                          {v.costFluideCsere ? `${v.costFluideCsere.toLocaleString('ro-RO')} RON` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-rose-800">
                          {v.costFluidePotlas ? `${v.costFluidePotlas.toLocaleString('ro-RO')} RON` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-indigo-900">
                          {v.costPiese ? `${v.costPiese.toLocaleString('ro-RO')} RON` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {v.costManopera ? `${v.costManopera.toLocaleString('ro-RO')} RON` : '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVehiculId(v.id);
                              setScopeMode('VEHICUL');
                              setActiveSubTab('olajok');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 font-bold text-[11px] transition border border-sapphire-200 cursor-pointer"
                          >
                            Adatlap →
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-xs font-bold text-sage-500">
                        Nincs jármű költség adat a kiválasztott szűrésre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FÜL 5: GUMIABRONCS TCO ÉS CASĂRI RANGSOR */}
        {activeSubTab === 'tco_casari' && (
          <div className="space-y-4">
            <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white shadow-sm space-y-3">
              <h3 className="text-sm font-black text-sapphire-950 uppercase tracking-wider flex items-center space-x-2">
                <Award className="w-4 h-4 text-sapphire-600" />
                <span>Gumiabroncs Márka Rangsor & TCO (Melyik márka mennyit futott)</span>
              </h3>
              <p className="text-xs text-sage-600 font-medium">
                Teljesítmény és költséghatékonyság márka szerint az élettartam alatt (1.000 km-re jutó költség).
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-morning-200 bg-morning-100/70 text-sage-700 font-extrabold uppercase text-[10px]">
                      <th className="p-2.5">Márka</th>
                      <th className="p-2.5 text-right">Abroncsok Száma</th>
                      <th className="p-2.5 text-right">Összes Rulaj (KM)</th>
                      <th className="p-2.5 text-right">Átlagos Rulaj (KM)</th>
                      <th className="p-2.5 text-right">Összes Költség (RON)</th>
                      <th className="p-2.5 text-right font-black text-sapphire-950">TCO (RON / 1.000 KM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-100">
                    {tcoBrands && tcoBrands.length > 0 ? (
                      tcoBrands.map((b: any) => (
                        <tr key={b.marca} className="hover:bg-morning-50/80 transition">
                          <td className="p-2.5 font-bold text-sapphire-900">{b.marca}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-800">{b.numarAnvelope || b.count} db</td>
                          <td className="p-2.5 text-right font-mono text-sage-700">{(b.rulajTotal || 0).toLocaleString('ro-RO')} KM</td>
                          <td className="p-2.5 text-right font-mono text-sage-700">{(b.rulajMediuKm || 0).toLocaleString('ro-RO')} KM</td>
                          <td className="p-2.5 text-right font-mono text-sapphire-900 font-bold">{(b.costTotal || 0).toLocaleString('ro-RO')} RON</td>
                          <td className="p-2.5 text-right font-mono font-black text-sapphire-950 text-sm">
                            {(b.tcoPer1000Km || b.costPer1000Km || 0).toFixed(2)} RON
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs font-bold text-sage-500">
                          Nincs elegendő TCO adat a márkákhoz.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CASARI REGISZTER */}
            {analiticaCasari?.listaDetaliata && analiticaCasari.listaDetaliata.length > 0 && (
              <div className="pleasant-card rounded-2xl p-5 border border-morning-200 bg-white shadow-sm space-y-3">
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-wider flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Gumiabroncs Selejtezések & Sérülések ({analiticaCasari.totalCasate} db)</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-morning-200 bg-morning-100/70 text-sage-700 font-extrabold uppercase text-[10px]">
                        <th className="p-2.5">Dátum</th>
                        <th className="p-2.5">Széria / SN</th>
                        <th className="p-2.5">Márka</th>
                        <th className="p-2.5">Méret</th>
                        <th className="p-2.5">Utolsó Jármű</th>
                        <th className="p-2.5">Selejtezés Oka</th>
                        <th className="p-2.5 text-right">Rulaj (KM)</th>
                        <th className="p-2.5 text-right">Vételár (RON)</th>
                        <th className="p-2.5">Felelős</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-morning-100">
                      {analiticaCasari.listaDetaliata.map((c: any) => (
                        <tr key={c.id} className="hover:bg-morning-50/80 transition">
                          <td className="p-2.5 font-mono text-sage-700">
                            {c.dataCasare ? new Date(c.dataCasare).toLocaleDateString('ro-RO') : '-'}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-sapphire-900">{c.serieAnvelopa}</td>
                          <td className="p-2.5 font-bold text-sapphire-900">{c.marca}</td>
                          <td className="p-2.5 font-mono text-sage-700">{c.dimensiune}</td>
                          <td className="p-2.5 font-bold text-sapphire-950">{c.vehiculUltim}</td>
                          <td className="p-2.5 font-bold text-rose-800">{c.motivCasare}</td>
                          <td className="p-2.5 text-right font-mono text-sage-700">{(c.rulajFinalKm || 0).toLocaleString('ro-RO')} KM</td>
                          <td className="p-2.5 text-right font-mono font-black text-rose-950">{(c.pretAchizitie || 0).toLocaleString('ro-RO')} RON</td>
                          <td className="p-2.5 text-slate-800">{c.operator || '-'}</td>
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
    </div>
  );
}
