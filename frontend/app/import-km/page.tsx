"use client";

import { API_BASE_URL } from '@/lib/api';
import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  RefreshCw, Filter, Layers, Check, Edit2, ShieldAlert, Gauge, Clock,
  ChevronDown, ChevronUp, Info, HelpCircle, Save, Car, Truck
} from 'lucide-react';

// Helper pentru extragerea sigură a numelui categoriei ca șir de caractere
function extractCatName(c: any): string {
  if (!c) return '';
  if (typeof c === 'string') return c;
  if (typeof c === 'object') {
    return c.nume || c.name || c.id || '';
  }
  return String(c);
}

// Helper pentru formatarea sigură a kilometrajului (fără excepții pe null/undefined)
function formatKm(val: any): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Math.round(Number(val)).toLocaleString('ro-RO');
}

// Error Boundary pentru captarea oricărei erori la nivel de interfață
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class SafeImportErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMsg: error?.message || 'Eroare necunoscută' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Eroare în componenta Import KM:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-4xl mx-auto my-12 bg-slate-900 border border-rose-500/50 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">A apărut o problemă la afișarea paginii de import</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {this.state.errorMsg || 'A apărut o eroare neașteptată în timpul procesării.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, errorMsg: '' });
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition shadow-md"
          >
            Reîncarcă Pagina
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface FuelHistory {
  data: string;
  ora: string;
  km: number;
  litri?: number;
}

interface PreviewRow {
  idTemp: string;
  normUnit: string;
  cleanUnit: string;
  unitRaw: string;
  data: string;
  ora: string;
  timestamp: number;
  valoareKmInitiala: number;
  valoareKmPropusa: number;
  contorCurent: number;
  deltaKm: number;
  tipMasurare: string;
  vehiculId: string | null;
  numarInmatriculare: string;
  numarIntern: string | null;
  categorieEnum: string;
  status: 'VALID' | 'KM_ZERO' | 'REGRESSIE_KM' | 'DELTA_EXCESIV' | 'VEHICUL_NEGASIȚ' | 'CATEGORIE_IGNORATA';
  anomaliiMesaje: string[];
  aprobat: boolean;
  istoricAlimentariFisier: FuelHistory[];
}

interface Statistici {
  totalVehiculeGasiteInCsv: number;
  valide: number;
  cuAnomalii: number;
  ignorateSauMth: number;
}

function ImportKmPompaContent() {
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allVehicule, setAllVehicule] = useState<any[]>([]);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [statistici, setStatistici] = useState<Statistici | null>(null);

  const [activeFilter, setActiveFilter] = useState<'toate' | 'valide' | 'anomalii' | 'ignorate'>('toate');
  const [searchQuery, setSearchQuery] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<any>(null);

  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Categorii tipice pentru autovehicule cu contor KM
  const defaultKmCategories = useMemo(() => [
    'CAP_TRACTOR',
    'CAP_TRACTOR_CU_SEMI',
    'CAMION',
    'AUTOTURISM',
    'AUTOUTILITARA',
    'DUBITA',
    'MICROBUZ',
    'CAMPER',
  ], []);

  // Încărcare vehicule și categorii la montare
  useEffect(() => {
    async function loadData() {
      try {
        const [resVeh, resCat] = await Promise.all([
          fetch(`${API_BASE_URL}/vehicule`),
          fetch(`${API_BASE_URL}/vehicule/categorii`),
        ]);

        if (resVeh.ok) {
          const vehData = await resVeh.json();
          setAllVehicule(Array.isArray(vehData) ? vehData : []);
        }

        if (resCat.ok) {
          const catData = await resCat.json();
          let rawList: any[] = [];
          if (Array.isArray(catData)) {
            rawList = catData;
          } else if (catData && typeof catData === 'object') {
            rawList = [
              ...(Array.isArray(catData.categoriiPersonalizate) ? catData.categoriiPersonalizate : []),
              ...(Array.isArray(catData.categoriiEnum) ? catData.categoriiEnum : []),
            ];
          }

          const catNames = Array.from(
            new Set(rawList.map(extractCatName).filter(Boolean))
          );

          if (catNames.length > 0) {
            setAllCategories(catNames);
            const preselected = catNames.filter((c) => defaultKmCategories.includes(c));
            setSelectedCategories(preselected.length > 0 ? preselected : catNames);
          }
        }
      } catch (err) {
        console.error('Eroare la inițializare import KM:', err);
      }
    }
    loadData();
  }, [defaultKmCategories]);

  // Funcție de analiză CSV
  const processCsvContent = async (rawCsv: string, categoriesToUse?: string[]) => {
    if (!rawCsv || !rawCsv.trim()) {
      setErrorMessage('Fișierul CSV este gol.');
      return;
    }

    setLoadingPreview(true);
    setErrorMessage(null);
    setApplyResult(null);

    const cats = categoriesToUse !== undefined ? categoriesToUse : selectedCategories;

    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/import-km-pompa/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: rawCsv,
          selectedCategories: cats,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Eroare la parsarea fișierului pe server');
      }

      const data = await res.json();
      const rows: PreviewRow[] = Array.isArray(data.previewRows) ? data.previewRows : [];
      setPreviewRows(rows);
      setStatistici(data.statistici || null);

      if (Array.isArray(data.categoriiDisponibile) && data.categoriiDisponibile.length > 0) {
        const extraCats = data.categoriiDisponibile.map(extractCatName).filter(Boolean);
        setAllCategories((prev) => Array.from(new Set([...prev, ...extraCats])));
      }
    } catch (err: any) {
      console.error('Eroare previzualizare:', err);
      setErrorMessage(`Eroare la procesarea fișierului CSV: ${err.message || err}`);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handler fișier CSV (Auto-procesare la selectare)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setCsvContent(text);
      processCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setCsvContent(text);
      processCsvContent(text);
    };
    reader.readAsText(file);
  };

  // Modificare manuală a kilometrajului propus
  const handleEditKm = (idTemp: string, valStr: string) => {
    const newVal = parseInt(valStr, 10);
    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row.idTemp !== idTemp) return row;
        const safeVal = isNaN(newVal) ? 0 : newVal;
        const curKm = row.contorCurent || 0;
        const newDelta = row.vehiculId ? safeVal - curKm : 0;

        let newStatus = row.status;
        const newAnomalii: string[] = [];

        if (!row.vehiculId) {
          newStatus = 'VEHICUL_NEGASIȚ';
          newAnomalii.push(`Vehiculul "${row.cleanUnit}" nu a fost identificat.`);
        } else if (row.status === 'CATEGORIE_IGNORATA') {
          // Păstrează categoria ignorată dacă este nebifată
        } else if (safeVal === 0) {
          newStatus = 'KM_ZERO';
          newAnomalii.push('Contor 0 km raportat.');
        } else if (safeVal < curKm) {
          newStatus = 'REGRESSIE_KM';
          newAnomalii.push(`Indexul nou (${formatKm(safeVal)} km) este mai mic decât contorul curent (${formatKm(curKm)} km).`);
        } else if (curKm > 0 && newDelta > 5000) {
          newStatus = 'DELTA_EXCESIV';
          newAnomalii.push(`Salt mare de kilometraj (+${formatKm(newDelta)} km).`);
        } else {
          newStatus = 'VALID';
        }

        return {
          ...row,
          valoareKmPropusa: safeVal,
          deltaKm: newDelta,
          status: newStatus,
          anomaliiMesaje: newAnomalii,
          aprobat: newStatus === 'VALID',
        };
      })
    );
  };

  // Asociere manuală vehicul
  const handleAssignVehicle = (idTemp: string, vehiculId: string) => {
    const veh = allVehicule.find((v) => v.id === vehiculId);
    if (!veh) return;

    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row.idTemp !== idTemp) return row;
        const curKm = veh.valoareContorCurent || 0;
        const newDelta = row.valoareKmPropusa - curKm;

        let newStatus: PreviewRow['status'] = 'VALID';
        const newAnomalii: string[] = [];

        if (row.valoareKmPropusa === 0) {
          newStatus = 'KM_ZERO';
          newAnomalii.push('Contor 0 km raportat.');
        } else if (row.valoareKmPropusa < curKm) {
          newStatus = 'REGRESSIE_KM';
          newAnomalii.push(`Index nou (${formatKm(row.valoareKmPropusa)} km) mai mic decât înregistrarea din sistem (${formatKm(curKm)} km).`);
        } else if (curKm > 0 && newDelta > 5000) {
          newStatus = 'DELTA_EXCESIV';
          newAnomalii.push(`Salt mare de kilometraj (+${formatKm(newDelta)} km).`);
        }

        return {
          ...row,
          vehiculId: veh.id,
          numarInmatriculare: veh.numarInmatriculare || row.cleanUnit,
          numarIntern: veh.numarIntern || null,
          categorieEnum: extractCatName(veh.categorieEnum) || 'CAP_TRACTOR',
          contorCurent: curKm,
          deltaKm: newDelta,
          status: newStatus,
          anomaliiMesaje: newAnomalii,
          aprobat: newStatus === 'VALID',
        };
      })
    );
  };

  const toggleRowApproval = (idTemp: string) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.idTemp === idTemp ? { ...r, aprobat: !r.aprobat } : r))
    );
  };

  const handleSelectAllVisible = (select: boolean) => {
    const visibleIds = new Set(filteredRows.map((r) => r.idTemp));
    setPreviewRows((prev) =>
      prev.map((r) => (visibleIds.has(r.idTemp) ? { ...r, aprobat: select } : r))
    );
  };

  const handleApplyUpdates = async () => {
    const approved = previewRows.filter((r) => r.aprobat && r.vehiculId && r.valoareKmPropusa > 0);
    if (approved.length === 0) {
      alert('Niciun rând valid nu este selectat pentru aplicare.');
      return;
    }

    if (!confirm(`Confirmi actualizarea kilometrajului pentru ${approved.length} vehicule?`)) {
      return;
    }

    setIsApplying(true);
    setApplyResult(null);

    try {
      const payload = {
        entries: approved.map((r) => ({
          vehiculId: r.vehiculId!,
          valoareKm: r.valoareKmPropusa,
          data: r.data,
          ora: r.ora,
          observatii: `Pompă Combustibil ${r.data} ${r.ora} (CSV: ${r.unitRaw})`,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/vehicule/import-km-pompa/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Eroare la aplicarea contoarelor.');
      }

      const result = await res.json();
      setApplyResult(result);
      setPreviewRows((prev) => prev.filter((r) => !approved.some((a) => a.idTemp === r.idTemp)));
    } catch (err: any) {
      alert(`Eroare la salvare: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Filtrare tabel
  const filteredRows = useMemo(() => {
    if (!Array.isArray(previewRows)) return [];
    return previewRows.filter((row) => {
      if (!row) return false;
      if (activeFilter === 'valide' && row.status !== 'VALID') return false;
      if (
        activeFilter === 'anomalii' &&
        !['REGRESSIE_KM', 'KM_ZERO', 'DELTA_EXCESIV', 'VEHICUL_NEGASIȚ'].includes(row.status)
      )
        return false;
      if (activeFilter === 'ignorate' && row.status !== 'CATEGORIE_IGNORATA') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPlate = String(row.numarInmatriculare || '').toLowerCase().includes(q);
        const matchIntern = String(row.numarIntern || '').toLowerCase().includes(q);
        const matchRaw = String(row.unitRaw || '').toLowerCase().includes(q);
        const matchClean = String(row.cleanUnit || '').toLowerCase().includes(q);
        if (!matchPlate && !matchIntern && !matchRaw && !matchClean) return false;
      }

      return true;
    });
  }, [previewRows, activeFilter, searchQuery]);

  const approvedCount = previewRows.filter((r) => r.aprobat && r.vehiculId && r.valoareKmPropusa > 0).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 shadow-sm">
              <Gauge className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Actualizare KM din CSV Pompă Combustibil
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Procesare livrări pompă, selecție după categorii (KM vs. MTH), deduplicare zilnică și reconciliere anomalii.
              </p>
            </div>
          </div>
        </div>

        {csvContent && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => processCsvContent(csvContent)}
              disabled={loadingPreview}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm border border-slate-600 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPreview ? 'animate-spin' : ''}`} />
              Reanalizează
            </button>
          </div>
        )}
      </div>

      {/* MESAJ EROARE */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl flex items-start gap-3 animate-fadeIn">
          <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1 text-xs text-rose-300">
            <strong className="block font-semibold mb-0.5">A apărut o problemă la procesare:</strong>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* REZULTAT SALVARE REUȘITĂ */}
      {applyResult && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-emerald-300 font-semibold text-sm">
              {applyResult.mesaj || 'Kilometrajul a fost actualizat cu succes în baza de date!'}
            </h4>
            <p className="text-emerald-400/80 text-xs mt-1">
              Au fost actualizate {applyResult.numarActualizate || 0} vehicule. Dacă au existat capete tractor cuplate cu semiremorci active, rulajul s-a propagat automat.
            </p>
          </div>
          <button
            onClick={() => setApplyResult(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs"
          >
            ✕ Închide
          </button>
        </div>
      )}

      {/* PAS 1 & 2: UPLOAD & CONFIGURARE CATEGORII */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ZONA DE UPLOAD */}
        <div className="lg:col-span-1 bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2 text-white font-semibold mb-3">
              <UploadCloud className="w-5 h-5 text-blue-400" />
              <span>1. Fișier Livrări Pompă (CSV)</span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                fileName
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-slate-600 hover:border-blue-500 bg-slate-900/40'
              }`}
            >
              <input
                type="file"
                id="csvInput"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="csvInput" className="cursor-pointer block">
                {fileName ? (
                  <div className="flex flex-col items-center">
                    <FileText className="w-10 h-10 text-emerald-400 mb-2" />
                    <span className="text-sm font-medium text-white break-all">{fileName}</span>
                    <span className="text-xs text-slate-400 mt-1">
                      {csvContent.split('\n').filter(Boolean).length} rânduri citite
                    </span>
                    <span className="text-xs text-emerald-400 mt-2 hover:underline">
                      Click pentru a schimba fișierul
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-10 h-10 text-slate-400 mb-2 group-hover:text-blue-400" />
                    <span className="text-sm font-medium text-slate-200">
                      Trage fișierul CSV aici sau apasă pentru a alege
                    </span>
                    <span className="text-xs text-slate-500 mt-1">
                      Export din sistemul pompei (ex: 11.csv)
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <button
              onClick={() => processCsvContent(csvContent)}
              disabled={!csvContent || loadingPreview}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl font-medium text-sm transition shadow-md shadow-blue-900/20"
            >
              {loadingPreview ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Se procesează CSV-ul...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Analizează & Reconciliază CSV
                </>
              )}
            </button>
          </div>
        </div>

        {/* SELECTARE CATEGORII VEHICULE (KM vs MTH) */}
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/70 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-sm">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Filter className="w-5 h-5 text-indigo-400" />
                <span>2. Categorii de extras KM (Exclude utilajele cu ore / mTH)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const roadOnly = allCategories.filter((c) => defaultKmCategories.includes(c));
                    setSelectedCategories(roadOnly);
                    if (csvContent) processCsvContent(csvContent, roadOnly);
                  }}
                  className="text-xs px-2.5 py-1 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-lg border border-indigo-500/30 transition"
                >
                  Doar Autovehicule KM (Recomandat)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories(allCategories);
                    if (csvContent) processCsvContent(csvContent, allCategories);
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition"
                >
                  Toate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories([]);
                    if (csvContent) processCsvContent(csvContent, []);
                  }}
                  className="text-xs px-2 py-1 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg transition"
                >
                  Deselectează
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Pompa cere indexul la fiecare alimentare. Utilajele grele (excavatoare, buldozere, dumpere 8x4) funcționează pe <strong>ore de funcționare (mTH)</strong> sau introduc 0. Selectează doar categoriile pe care dorești să le actualizezi în KM.
            </p>

            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1">
              {allCategories.map((rawCat) => {
                const cat = extractCatName(rawCat);
                if (!cat) return null;
                const isSelected = selectedCategories.includes(cat);
                const isKmRecommended = defaultKmCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const nextCats = isSelected
                        ? selectedCategories.filter((c) => c !== cat)
                        : [...selectedCategories, cat];
                      setSelectedCategories(nextCats);
                      if (csvContent) processCsvContent(csvContent, nextCats);
                    }}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600/30 text-blue-200 border-blue-500/60 shadow-sm'
                        : 'bg-slate-900/40 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-slate-600'}`}
                    />
                    <span>{cat}</span>
                    {isKmRecommended && (
                      <span className="text-[10px] text-blue-300 font-mono">KM</span>
                    )}
                  </button>
                );
              })}
              {allCategories.length === 0 && (
                <span className="text-xs text-slate-500 italic">
                  Se încarcă categoriile de vehicule din sistem...
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
            <span>
              Categorii active: <strong>{selectedCategories.length}</strong> din {allCategories.length}
            </span>
            <span className="text-slate-500">
              * Pentru categoriile neselectate, vehiculele vor fi marcate ca <em>Ignorate</em>.
            </span>
          </div>
        </div>
      </div>

      {/* STATISTICI / SUMAR */}
      {statistici && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fadeIn">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase font-medium tracking-wider">
              Total Vehicule CSV
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {statistici.totalVehiculeGasiteInCsv || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">unități distincte găsite</div>
          </div>

          <div
            onClick={() => setActiveFilter('valide')}
            className={`cursor-pointer rounded-xl p-4 border transition ${
              activeFilter === 'valide'
                ? 'bg-emerald-950/40 border-emerald-500'
                : 'bg-slate-800/40 border-slate-700/60 hover:border-emerald-500/50'
            }`}
          >
            <div className="text-xs text-emerald-400 uppercase font-medium tracking-wider flex items-center justify-between">
              <span>Valide pentru Salvare</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{statistici.valide || 0}</div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">gata de import</div>
          </div>

          <div
            onClick={() => setActiveFilter('anomalii')}
            className={`cursor-pointer rounded-xl p-4 border transition ${
              activeFilter === 'anomalii'
                ? 'bg-amber-950/40 border-amber-500'
                : 'bg-slate-800/40 border-slate-700/60 hover:border-amber-500/50'
            }`}
          >
            <div className="text-xs text-amber-400 uppercase font-medium tracking-wider flex items-center justify-between">
              <span>Necesită Atenție</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-amber-300 mt-1">{statistici.cuAnomalii || 0}</div>
            <div className="text-[11px] text-amber-500/80 mt-0.5">0 km, regresiuni, salturi mari</div>
          </div>

          <div
            onClick={() => setActiveFilter('ignorate')}
            className={`cursor-pointer rounded-xl p-4 border transition ${
              activeFilter === 'ignorate'
                ? 'bg-slate-700/40 border-slate-500'
                : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-500/50'
            }`}
          >
            <div className="text-xs text-slate-400 uppercase font-medium tracking-wider flex items-center justify-between">
              <span>Ignorate / MTH</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-300 mt-1">
              {statistici.ignorateSauMth || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">din categorii excluse</div>
          </div>
        </div>
      )}

      {/* TABEL RECONCILIERE KM */}
      {previewRows.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl animate-fadeIn">
          {/* BARĂ FILTRE & CĂUTARE TABEL */}
          <div className="p-4 border-b border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveFilter('toate')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  activeFilter === 'toate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Toate ({previewRows.length})
              </button>
              <button
                onClick={() => setActiveFilter('valide')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  activeFilter === 'valide'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Valide ({previewRows.filter((r) => r.status === 'VALID').length})
              </button>
              <button
                onClick={() => setActiveFilter('anomalii')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  activeFilter === 'anomalii'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Anomalii / Atenție ({statistici?.cuAnomalii || 0})
              </button>
              <button
                onClick={() => setActiveFilter('ignorate')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  activeFilter === 'ignorate'
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Ignorate ({statistici?.ignorateSauMth || 0})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută număr înmatriculare, cod intern..."
                className="bg-slate-900/60 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 w-64"
              />

              <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
                <button
                  type="button"
                  onClick={() => handleSelectAllVisible(true)}
                  className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition"
                  title="Selectează toate rândurile afișate"
                >
                  Bifează afișate
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAllVisible(false)}
                  className="text-xs px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition"
                  title="Deselectează toate rândurile afișate"
                >
                  Debifează
                </button>
              </div>
            </div>
          </div>

          {/* TABEL */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/70 border-b border-slate-700/70 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredRows.length > 0 && filteredRows.every((r) => r.aprobat)
                      }
                      onChange={(e) => handleSelectAllVisible(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Vehicul CSV</th>
                  <th className="p-3">Vehicul Asociat Flotă</th>
                  <th className="p-3">Ultima Alimentare</th>
                  <th className="p-3 text-right">Contor Curent (DB)</th>
                  <th className="p-3 text-right">Contor Nou (CSV / Editabil)</th>
                  <th className="p-3 text-right">Diferență (Delta)</th>
                  <th className="p-3">Diagnostic / Status</th>
                  <th className="p-3 text-center">Istoric Zi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredRows.map((row) => {
                  const isExpanded = expandedRowId === row.idTemp;
                  const isAnomaly = ['REGRESSIE_KM', 'KM_ZERO', 'DELTA_EXCESIV'].includes(
                    row.status
                  );
                  const isIgnored = row.status === 'CATEGORIE_IGNORATA';

                  const curContorStr = row.vehiculId ? `${formatKm(row.contorCurent)} km` : '-';
                  const deltaKmVal = Number(row.deltaKm || 0);

                  return (
                    <React.Fragment key={row.idTemp}>
                      <tr
                        className={`transition-colors ${
                          row.aprobat
                            ? 'bg-blue-950/20 hover:bg-blue-950/30'
                            : isIgnored
                            ? 'bg-slate-900/40 text-slate-500'
                            : isAnomaly
                            ? 'bg-amber-950/15 hover:bg-amber-950/25'
                            : 'hover:bg-slate-700/30'
                        }`}
                      >
                        {/* CHECKBOX */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(row.aprobat)}
                            disabled={!row.vehiculId || isIgnored}
                            onChange={() => toggleRowApproval(row.idTemp)}
                            className="rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer disabled:opacity-30"
                          />
                        </td>

                        {/* VEHICUL CSV */}
                        <td className="p-3">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{row.cleanUnit || '-'}</span>
                          </div>
                          {row.unitRaw !== row.cleanUnit && (
                            <span className="text-[10px] text-slate-500">
                              raw: &quot;{row.unitRaw}&quot;
                            </span>
                          )}
                        </td>

                        {/* VEHICUL ASOCIAT */}
                        <td className="p-3">
                          {row.vehiculId ? (
                            <div>
                              <div className="font-medium text-slate-200 flex items-center gap-1">
                                <span>{row.numarInmatriculare}</span>
                                {row.numarIntern && (
                                  <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                                    {row.numarIntern}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {extractCatName(row.categorieEnum)}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Neatribuit automat
                              </span>
                              <select
                                onChange={(e) => handleAssignVehicle(row.idTemp, e.target.value)}
                                defaultValue=""
                                className="bg-slate-900 border border-amber-500/50 text-[11px] text-slate-200 rounded px-2 py-1 max-w-[180px] focus:outline-none focus:border-blue-500"
                              >
                                <option value="" disabled>
                                  Asociază manual vehicul...
                                </option>
                                {Array.isArray(allVehicule) && allVehicule.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.numarInmatriculare} ({v.numarIntern || extractCatName(v.categorieEnum)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </td>

                        {/* DATA & ORA */}
                        <td className="p-3 text-slate-300">
                          <div className="font-medium">{row.data}</div>
                          <div className="text-[10px] text-slate-500">ora {row.ora}</div>
                          {Array.isArray(row.istoricAlimentariFisier) && row.istoricAlimentariFisier.length > 1 && (
                            <span className="inline-block mt-0.5 text-[9px] bg-blue-900/50 text-blue-300 px-1 rounded">
                              Ultima din {row.istoricAlimentariFisier.length} alimentări
                            </span>
                          )}
                        </td>

                        {/* CONTOR CURENT DB */}
                        <td className="p-3 text-right font-mono text-slate-300">
                          {curContorStr}
                        </td>

                        {/* CONTOR NOU CSV EDITABIL */}
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              value={row.valoareKmPropusa}
                              onChange={(e) => handleEditKm(row.idTemp, e.target.value)}
                              disabled={isIgnored}
                              className={`w-24 text-right font-mono text-xs px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                isAnomaly
                                  ? 'bg-amber-950/40 border-amber-500/70 text-amber-200'
                                  : 'bg-slate-900 border-slate-700 text-white'
                              }`}
                            />
                            <span className="text-slate-500 text-[10px]">km</span>
                          </div>
                        </td>

                        {/* DELTA */}
                        <td className="p-3 text-right font-mono">
                          {row.vehiculId && row.valoareKmPropusa > 0 ? (
                            deltaKmVal >= 0 ? (
                              <span
                                className={`${
                                  deltaKmVal > 5000
                                    ? 'text-amber-400 font-bold'
                                    : 'text-emerald-400 font-medium'
                                }`}
                              >
                                +{formatKm(deltaKmVal)} km
                              </span>
                            ) : (
                              <span className="text-rose-400 font-bold">
                                {formatKm(deltaKmVal)} km
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* STATUS & DIAGNOSTIC */}
                        <td className="p-3">
                          {row.status === 'VALID' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Valid (+{formatKm(deltaKmVal)} km)
                            </span>
                          )}
                          {row.status === 'KM_ZERO' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/60 text-slate-300 border border-slate-600 rounded text-[11px] font-medium">
                              0 KM raportat
                            </span>
                          )}
                          {row.status === 'REGRESSIE_KM' && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[11px] font-semibold">
                                <XCircle className="w-3 h-3" />
                                Regresie index
                              </span>
                              <p className="text-[10px] text-rose-400/90 mt-0.5">
                                Nou ({formatKm(row.valoareKmPropusa)}) &lt; Curent ({formatKm(row.contorCurent)})
                              </p>
                            </div>
                          )}
                          {row.status === 'DELTA_EXCESIV' && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[11px] font-semibold">
                                <AlertTriangle className="w-3 h-3" />
                                Salt excesiv
                              </span>
                              <p className="text-[10px] text-amber-400/90 mt-0.5">
                                +{formatKm(deltaKmVal)} km (posibilă tastare greșită)
                              </p>
                            </div>
                          )}
                          {row.status === 'VEHICUL_NEGASIȚ' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded text-[11px] font-medium">
                              Vehicul necunoscut
                            </span>
                          )}
                          {row.status === 'CATEGORIE_IGNORATA' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[11px]">
                              Categorie MTH / Exclusă
                            </span>
                          )}
                        </td>

                        {/* BUTON EXPAND ISTORIC ALIMENTARI */}
                        <td className="p-3 text-center">
                          {Array.isArray(row.istoricAlimentariFisier) && row.istoricAlimentariFisier.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : row.idTemp)}
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center gap-0.5 mx-auto"
                              title="Vezi toate alimentările din această zi"
                            >
                              <span>{row.istoricAlimentariFisier.length}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-600">1</span>
                          )}
                        </td>
                      </tr>

                      {/* DETALII EXPANDATE (Dacă vehiculul a alimentat de mai multe ori) */}
                      {isExpanded && (
                        <tr className="bg-slate-900/90 border-b border-slate-700">
                          <td colSpan={9} className="p-3 pl-12">
                            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 max-w-xl">
                              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <span>
                                  Istoric alimentări înregistrate în fișier pentru {row.cleanUnit}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {(row.istoricAlimentariFisier || []).map((al, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between text-xs px-2.5 py-1 rounded ${
                                      idx === (row.istoricAlimentariFisier?.length || 1) - 1
                                        ? 'bg-blue-950/50 text-blue-200 border border-blue-500/30'
                                        : 'bg-slate-900 text-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono">{al.data}</span>
                                      <span className="font-mono text-slate-300">{al.ora}</span>
                                      {idx === (row.istoricAlimentariFisier?.length || 1) - 1 && (
                                        <span className="text-[10px] bg-blue-600 text-white px-1 rounded">
                                          reținută
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                      {al.litri !== undefined && (
                                        <span className="text-slate-400">{al.litri} L</span>
                                      )}
                                      <span className="font-mono font-semibold text-white">
                                        {formatKm(al.km)} km
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[11px] text-slate-400 mt-2 italic">
                                * Conform cerinței, sistemul reține automat <strong>ultima alimentare</strong> a zilei ({row.ora} cu {formatKm(row.valoareKmInitiala)} km).
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* BARA INFERIOARĂ DE ACȚIUNE */}
          <div className="p-4 bg-slate-900/90 border-t border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Selectate pentru actualizare:{' '}
              <strong className="text-white font-semibold text-sm">{approvedCount}</strong> vehicule
            </div>

            <button
              onClick={handleApplyUpdates}
              disabled={approvedCount === 0 || isApplying}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-900/20 transition"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Se salvează în baza de date...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Aplică Actualizările de Kilometraj ({approvedCount})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* GHID / INFORMARE UTILIZATOR */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400 space-y-2">
        <div className="font-semibold text-slate-300 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Cum funcționează reconcilierea kilometrajelor de la pompă:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400">
          <li>
            <strong>Deduplicare automată pe zile:</strong> Dacă un vehicul a alimentat de 2 sau mai multe ori în aceeași zi, se reține exclusiv alimentarea cu ora cea mai târzie.
          </li>
          <li>
            <strong>Separare pe categorii:</strong> Autovehiculele rutiere (capete tractor, autoutilitare) folosesc KM. Utilajele de carieră / construcții (excavatoare, buldozere) folosesc ore de funcționare (mTH) sau tastează 0 la pompă și sunt excluse automat.
          </li>
          <li>
            <strong>Detectare anomalii & editare manuală:</strong> Dacă un șofer a tastat greșit un index la pompă (regresie sau salt nerealist de kilometraj), rândul este semnalizat vizual. Poți corecta valoarea direct în căsuța de text înainte de salvare.
          </li>
          <li>
            <strong>Propagare la semiremorci cuplate:</strong> Când se actualizează kilometrajul unui cap tractor, rulajul parcurs (+km) este transmis automat semiremorcii cuplate activ.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function ImportKmPompaPage() {
  return (
    <SafeImportErrorBoundary>
      <ImportKmPompaContent />
    </SafeImportErrorBoundary>
  );
}
