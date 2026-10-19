"use client";

import { API_BASE_URL } from '@/lib/api';
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, DollarSign, Layers, Wrench, ShieldAlert, Search, Filter,
  Download, Truck, RefreshCw, Award, Droplets, Calendar, Printer,
  Car, Disc, Check, Info, ChevronDown, ChevronRight, Sparkles, AlertTriangle,
  FileText, Clock, TrendingUp, AlertOctagon, CheckCircle2, XCircle
} from 'lucide-react';

type TipRaport = 'CHELTUIELI_TOTAL' | 'COST_UNITAR' | 'CONSUM_ULEI' | 'FURNIZORI_EFACTURA' | 'SCADENTAR';
type ScopeMode = 'FLOTA' | 'CATEGORIE' | 'VEHICUL';
type PeriodPreset = 'luna_curenta' | 'luna_trecuta' | 'anul_curent' | 'ultimele_30' | 'ultimele_90' | 'tot' | 'custom';

export default function RapoartePage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------
  // TIP RAPORT SELECTAT
  // -------------------------------------------------------------
  const [tipRaport, setTipRaport] = useState<TipRaport>('CHELTUIELI_TOTAL');

  // -------------------------------------------------------------
  // NIVEL AGREGARE / FILTRU: 'FLOTA' | 'CATEGORIE' | 'VEHICUL'
  // -------------------------------------------------------------
  const [scopeMode, setScopeMode] = useState<ScopeMode>('FLOTA');
  const [selectedCategorie, setSelectedCategorie] = useState<string>('CAP_TRACTOR');
  const [selectedVehiculId, setSelectedVehiculId] = useState<string>('');
  const [searchVehiculFilter, setSearchVehiculFilter] = useState<string>('');

  // -------------------------------------------------------------
  // FILTRU PERIOADĂ (PRESETURI + SELECTOR DATĂ)
  // -------------------------------------------------------------
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('anul_curent');
  const [dataStart, setDataStart] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [dataEnd, setDataEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // -------------------------------------------------------------
  // DATE RAPORT DIN BACKEND
  // -------------------------------------------------------------
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Sub-filtre și căutări specifice fiecărui raport
  const [subTabCheltuieli, setSubTabCheltuieli] = useState<'fluide_detaliu' | 'anvelope' | 'comenzi_piese' | 'centralizator_vehicule'>('fluide_detaliu');
  const [cautaFluideText, setCautaFluideText] = useState<string>('');
  const [cautaAnvelopeText, setCautaAnvelopeText] = useState<string>('');
  const [cautaPieseText, setCautaPieseText] = useState<string>('');
  const [cautaCostUnitar, setCautaCostUnitar] = useState<string>('');
  const [cautaConsumUlei, setCautaConsumUlei] = useState<string>('');
  const [cautaFurnizor, setCautaFurnizor] = useState<string>('');
  const [subTabScadentar, setSubTabScadentar] = useState<'documente' | 'revizii'>('documente');
  const [subTabEfactura, setSubTabEfactura] = useState<'categorii' | 'furnizori'>('categorii');
  const [cautaCategorieText, setCautaCategorieText] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>({});
  const [filtruStatusEficienta, setFiltruStatusEficienta] = useState<string>('TOATE');
  const [filtruStatusUlei, setFiltruStatusUlei] = useState<string>('TOATE');

  // Toggle expand categorie
  const toggleCategory = (catName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catName]: prev[catName] === false ? true : false,
    }));
  };

  // Toggle toate categoriile
  const toggleAllCategories = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    (reportData?.achizitiiCategorii || []).forEach((c: any) => {
      nextState[c.categorie] = expand;
    });
    setExpandedCategories(nextState);
  };

  // Toggle detalii articole alkategória
  const toggleSubcategory = (subKey: string) => {
    setExpandedSubcategories((prev) => ({
      ...prev,
      [subKey]: !prev[subKey],
    }));
  };

  // Încărcare listă inițială de vehicule
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const resVeh = await fetch(`${API_BASE_URL}/vehicule`).then((r) => (r.ok ? r.json() : []));
      setVehicule(resVeh || []);
      if (resVeh && resVeh.length > 0 && !selectedVehiculId) {
        setSelectedVehiculId(resVeh[0].id);
      }
    } catch (e) {
      console.error('Eroare la încărcarea vehiculelor:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Încărcare date raport pe baza filtrelor active
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
        const json = await res.json();
        setReportData(json);
      }
    } catch (e) {
      console.error('Eroare la obținerea datelor de raport:', e);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [scopeMode, selectedCategorie, selectedVehiculId, dataStart, dataEnd]);

  // Schimbare preset perioadă
  const handlePeriodChange = (preset: PeriodPreset) => {
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

  // Categorii disponibile
  const categoriiDisponibile = useMemo(() => {
    const setCat = new Set<string>();
    (vehicule || []).forEach((v) => {
      if (v.categorieEnum) setCat.add(v.categorieEnum);
    });
    return Array.from(setCat).sort();
  }, [vehicule]);

  // Vehicul selectat
  const currentVehiculObject = useMemo(() => {
    if (scopeMode !== 'VEHICUL') return null;
    return (vehicule || []).find((v) => v.id === selectedVehiculId) || null;
  }, [vehicule, selectedVehiculId, scopeMode]);

  // Filtrare lista selectie vehicule
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

  // Denumire lizibilă a raportului curent
  const getTitluRaportCurent = () => {
    switch (tipRaport) {
      case 'CHELTUIELI_TOTAL':
        return 'Raport Cheltuieli Mentenanță, Piese, Anvelope & Uleiuri';
      case 'COST_UNITAR':
        return 'Raport Cost Unitar & Eficiență Exploatare (RON / 100 KM & RON / Oră)';
      case 'CONSUM_ULEI':
        return 'Raport Consum Excesiv de Ulei & Alertă Pierderi (Scurgeri / Top-up)';
      case 'FURNIZORI_EFACTURA':
        return subTabEfactura === 'categorii'
          ? 'Raport Achiziții Facturate: Categorii Principale & Subcategorii (ANAF e-Factura)'
          : 'Raport Achiziții Furnizori ANAF e-Factura';
      case 'SCADENTAR':
        return 'Scadențar Mentenanță & Documente (Următoarele 30-60 Zile)';
    }
  };

  // Nivel agregare lizibil
  const getDescriereAgregare = () => {
    if (scopeMode === 'FLOTA') return 'Toată Flota (Centralizat)';
    if (scopeMode === 'CATEGORIE') return `Categoria: ${selectedCategorie}`;
    if (scopeMode === 'VEHICUL') {
      return currentVehiculObject
        ? `Vehicul: ${currentVehiculObject.numarIntern || ''} (${currentVehiculObject.numarInmatriculare || '-'}) - ${currentVehiculObject.marca || ''} ${currentVehiculObject.model || ''}`
        : 'Vehicul Individual';
    }
    return '';
  };

  // Descriere perioadă lizibilă
  const getDescrierePerioada = () => {
    if (!dataStart && !dataEnd) return 'Toată Perioada Înregistrată';
    if (dataStart && dataEnd) return `${dataStart} → ${dataEnd}`;
    if (dataStart) return `De la ${dataStart}`;
    if (dataEnd) return `Până la ${dataEnd}`;
    return '-';
  };

  // Tipărire / Generare PDF curat
  const handlePrint = () => {
    window.print();
  };

  // Export CSV dedicat pentru fiecare raport în parte
  const handleExportCSV = () => {
    if (!reportData) return;

    let csvRows: string[] = [];
    let filename = `raport_${tipRaport.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;

    if (tipRaport === 'CHELTUIELI_TOTAL') {
      csvRows.push('Tip Fluid / Categorie,Volum Schimb (L),Cost Schimb (RON),Volum Completare (L),Cost Completare (RON),Total Volum (L),Total Cost (RON),Pret Mediu (RON/L)');
      (reportData.fluidePeTipuri || []).forEach((f: any) => {
        csvRows.push(
          `"${f.label}",${f.csereLitri},${f.csereCost},${f.potlasLitri},${f.potlasCost},${f.totalLitri},${f.totalCost},${f.pretMediuPerLitru}`
        );
      });
    } else if (tipRaport === 'COST_UNITAR') {
      csvRows.push('Vehicul,Numar Inmatriculare,Categorie,Tip Masurare,Contor Start,Contor End,Rulaj,Cost Total RON,Cost Piese RON,Cost Manopera RON,Cost Anvelope RON,Cost Fluide RON,Cost Unitar (RON/100km sau RON/h),Status Eficienta');
      (reportData.eficientaCostUnitar || []).forEach((e: any) => {
        const unitar = e.costPer100Km !== null ? `${e.costPer100Km} RON/100km` : (e.costPerOra !== null ? `${e.costPerOra} RON/h` : '-');
        csvRows.push(
          `"${e.numarIntern}","${e.numarInmatriculare || '-'}","${e.categorieEnum || '-'}","${e.tipMasurare}",${e.contorStart},${e.contorEnd},${e.deltaRulaj},${e.costTotal},${e.costPiese},${e.costManopera},${e.costAnvelope},${e.costFluide},"${unitar}","${e.statusEficienta}"`
        );
      });
    } else if (tipRaport === 'CONSUM_ULEI') {
      csvRows.push('Vehicul,Numar Inmatriculare,Categorie,Tip Masurare,Rulaj Perioada,Litri Completati (Top-up),Cost Completari RON,Litri Schimb Revizie,Cost Schimb RON,Nr Completari,Nr Alerte Scurgere,Rata Consum Mediu,Status Diagnostic');
      (reportData.analizaConsumUlei || []).forEach((u: any) => {
        const rata = u.rataConsumPer1000Km !== null ? `${u.rataConsumPer1000Km} L/1000km` : (u.rataConsumPer100Ore !== null ? `${u.rataConsumPer100Ore} L/100h` : '-');
        csvRows.push(
          `"${u.numarIntern}","${u.numarInmatriculare || '-'}","${u.categorieEnum || '-'}","${u.tipMasurare}",${u.deltaRulaj},${u.litriPotlas},${u.costPotlas},${u.litriCsere},${u.costCsere},${u.numarCompletari},${u.numarAlerteScurgeri},"${rata}","${u.statusConsum}"`
        );
      });
    } else if (tipRaport === 'FURNIZORI_EFACTURA') {
      if (subTabEfactura === 'categorii') {
        csvRows.push('Fokategoria (Main Category),Alkategoria (Subcategory),Cantitate Totala,UM,Numar Pozitii,Total Achizitii RON,Fara TVA RON,Pondere Categorie (%),Pondere Total (%)');
        (reportData.achizitiiCategorii || []).forEach((cat: any) => {
          (cat.subcategorii || []).forEach((sub: any) => {
            csvRows.push(
              `"${cat.categorie}","${sub.subcategorie}",${sub.cantitateTotala},"${sub.unitateMasura}",${sub.numarPozitii},${sub.valoareTotalaRON},${sub.valoareFaraTVARON},${sub.procentDinCategorie}%,${sub.procentDinTotal}%`
            );
          });
        });
      } else {
        csvRows.push('Furnizor,CIF / CUI,Numar Facturi,Total Achizitii RON,Pondere din Total (%)');
        (reportData.achizitiiFurnizori || []).forEach((fn: any) => {
          csvRows.push(
            `"${fn.nume}","${fn.cif}",${fn.numarFacturi},${fn.valoareTotalaRON},${fn.procentDinTotal}%`
          );
        });
      }
    } else if (tipRaport === 'SCADENTAR') {
      csvRows.push('Vehicul,Numar Inmatriculare,Tip Document,Serie / Numar,Emitent,Data Expirare,Zile Ramase,Status Alert');
      (reportData.scadentarMentenanta?.documenteScadente || []).forEach((d: any) => {
        csvRows.push(
          `"${d.vehicul?.numarIntern || '-'}","${d.vehicul?.numarInmatriculare || '-'}","${d.tipDocument}","${d.serieDocument}","${d.emitent}","${d.dataExpirare ? new Date(d.dataExpirare).toISOString().split('T')[0] : '-'}","${d.zileRamase}","${d.status}"`
        );
      });
    }

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrare tabel Cost Unitar
  const filteredCostUnitar = useMemo(() => {
    const list = reportData?.eficientaCostUnitar || [];
    return list.filter((item: any) => {
      if (filtruStatusEficienta !== 'TOATE' && item.statusEficienta !== filtruStatusEficienta) return false;
      if (!cautaCostUnitar.trim()) return true;
      const q = cautaCostUnitar.toLowerCase();
      return (
        item.numarIntern?.toLowerCase().includes(q) ||
        item.numarInmatriculare?.toLowerCase().includes(q) ||
        item.marca?.toLowerCase().includes(q) ||
        item.model?.toLowerCase().includes(q) ||
        item.categorieEnum?.toLowerCase().includes(q)
      );
    });
  }, [reportData?.eficientaCostUnitar, cautaCostUnitar, filtruStatusEficienta]);

  // Filtrare tabel Consum Ulei
  const filteredConsumUlei = useMemo(() => {
    const list = reportData?.analizaConsumUlei || [];
    return list.filter((item: any) => {
      if (filtruStatusUlei !== 'TOATE' && item.statusConsum !== filtruStatusUlei) return false;
      if (!cautaConsumUlei.trim()) return true;
      const q = cautaConsumUlei.toLowerCase();
      return (
        item.numarIntern?.toLowerCase().includes(q) ||
        item.numarInmatriculare?.toLowerCase().includes(q) ||
        item.marca?.toLowerCase().includes(q) ||
        item.model?.toLowerCase().includes(q) ||
        item.categorieEnum?.toLowerCase().includes(q)
      );
    });
  }, [reportData?.analizaConsumUlei, cautaConsumUlei, filtruStatusUlei]);

  // Filtrare categorii & subcategorii achiziții
  const filteredCategorii = useMemo(() => {
    const list = reportData?.achizitiiCategorii || [];
    if (!cautaCategorieText.trim()) return list;
    const q = cautaCategorieText.toLowerCase();

    return list
      .map((cat: any) => {
        const catMatches = cat.categorie?.toLowerCase().includes(q);
        const matchingSubs = (cat.subcategorii || []).filter(
          (sub: any) =>
            sub.subcategorie?.toLowerCase().includes(q) ||
            (sub.articoleRecente || []).some(
              (art: any) =>
                art.descriere?.toLowerCase().includes(q) ||
                art.furnizor?.toLowerCase().includes(q) ||
                art.numarFactura?.toLowerCase().includes(q) ||
                art.codArticol?.toLowerCase().includes(q)
            )
        );

        if (catMatches) return cat;
        if (matchingSubs.length > 0) {
          return {
            ...cat,
            subcategorii: matchingSubs,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [reportData?.achizitiiCategorii, cautaCategorieText]);

  // Filtrare furnizori
  const filteredFurnizori = useMemo(() => {
    const list = reportData?.achizitiiFurnizori || [];
    if (!cautaFurnizor.trim()) return list;
    const q = cautaFurnizor.toLowerCase();
    return list.filter(
      (fn: any) =>
        fn.nume?.toLowerCase().includes(q) ||
        fn.cif?.toLowerCase().includes(q)
    );
  }, [reportData?.achizitiiFurnizori, cautaFurnizor]);

  // Filtrare fluide detaliu
  const filteredFluideDetaliu = useMemo(() => {
    const list = reportData?.completariFluide || [];
    if (!cautaFluideText.trim()) return list;
    const q = cautaFluideText.toLowerCase();
    return list.filter(
      (f: any) =>
        f.tipLichid?.toLowerCase().includes(q) ||
        f.marcaUlei?.toLowerCase().includes(q) ||
        f.tipOperatiune?.toLowerCase().includes(q) ||
        f.mecanic?.toLowerCase().includes(q) ||
        f.vehicul?.numarIntern?.toLowerCase().includes(q) ||
        f.vehicul?.numarInmatriculare?.toLowerCase().includes(q)
    );
  }, [reportData?.completariFluide, cautaFluideText]);

  // Filtrare anvelope montate
  const filteredAnvelope = useMemo(() => {
    const list = reportData?.anvelopeMontate || [];
    if (!cautaAnvelopeText.trim()) return list;
    const q = cautaAnvelopeText.toLowerCase();
    return list.filter(
      (a: any) =>
        a.marca?.toLowerCase().includes(q) ||
        a.serieAnvelopa?.toLowerCase().includes(q) ||
        a.pozitieAx?.toLowerCase().includes(q) ||
        a.vehicul?.numarIntern?.toLowerCase().includes(q) ||
        a.vehicul?.numarInmatriculare?.toLowerCase().includes(q)
    );
  }, [reportData?.anvelopeMontate, cautaAnvelopeText]);

  // Filtrare piese consumate
  const filteredPiese = useMemo(() => {
    const list = reportData?.pieseConsumate || [];
    if (!cautaPieseText.trim()) return list;
    const q = cautaPieseText.toLowerCase();
    return list.filter(
      (p: any) =>
        p.descriere?.toLowerCase().includes(q) ||
        p.articolCod?.toLowerCase().includes(q) ||
        p.numarComanda?.toLowerCase().includes(q) ||
        p.vehicul?.numarIntern?.toLowerCase().includes(q) ||
        p.vehicul?.numarInmatriculare?.toLowerCase().includes(q)
    );
  }, [reportData?.pieseConsumate, cautaPieseText]);

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* ANTET TIPĂRIRE / ANTET OFICIAL (VIZIBIL DOAR LA PRINT) */}
      {/* ========================================================= */}
      <div className="hidden print:block bg-white text-black p-6 border-b-2 border-black mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight">FLEET-CMD | SISTEM MANAGEMENT FLOTĂ</h1>
            <p className="text-sm font-semibold text-slate-700 mt-1">{getTitluRaportCurent()}</p>
          </div>
          <div className="text-right text-xs">
            <p><strong>Data Generării:</strong> {new Date().toLocaleString('ro-RO')}</p>
            <p><strong>Nivel Agregare:</strong> {getDescriereAgregare()}</p>
            <p><strong>Perioada Analizată:</strong> {getDescrierePerioada()}</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* BARA SUPERIOARĂ DE CONTROL ȘI FILTRARE (NON-PRINT) */}
      {/* ========================================================= */}
      <div className="print:hidden space-y-4">
        {/* Titlu Pagină & Acțiuni principale */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-morning-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-sapphire-100 dark:bg-indigo-500/10 text-sapphire-700 dark:text-indigo-400 rounded-xl border border-sapphire-200 dark:border-indigo-500/20">
                <BarChart3 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-sapphire-900 dark:text-white flex items-center gap-2">
                  Rapoarte & Analitică
                </h1>
                <p className="text-xs text-sage-600 dark:text-slate-400">
                  Selectați raportul dorit, stabiliți intervalul și generați sinteza dedicată.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchReportData}
              disabled={loadingReport}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-morning-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-morning-200 dark:border-slate-700 shadow-xs transition"
              title="Reîmprospătează datele"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin text-sapphire-500 dark:text-indigo-400' : ''}`} />
              Actualizează
            </button>

            <button
              onClick={handleExportCSV}
              disabled={!reportData}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-700/50 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Exportă CSV
            </button>

            <button
              onClick={handlePrint}
              disabled={!reportData}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-sapphire-500 hover:bg-sapphire-600 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-sapphire-500/20 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Tipărește Raport / Salvează PDF
            </button>
          </div>
        </div>

        {/* SELECTOR RAPORT (CELE 5 RAPOARTE CONCRETE) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          <button
            onClick={() => setTipRaport('CHELTUIELI_TOTAL')}
            className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
              tipRaport === 'CHELTUIELI_TOTAL'
                ? 'bg-sapphire-50 dark:bg-indigo-950/50 border-sapphire-500 dark:border-indigo-500 text-sapphire-900 dark:text-white shadow-sm ring-1 ring-sapphire-500/30 dark:ring-indigo-500/30'
                : 'bg-white dark:bg-slate-900/70 border-morning-200 dark:border-slate-800 hover:border-morning-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className={`w-4 h-4 ${tipRaport === 'CHELTUIELI_TOTAL' ? 'text-sapphire-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-sapphire-600 dark:text-indigo-400">Raport 1</span>
            </div>
            <span className="text-xs md:text-sm font-bold text-sapphire-900 dark:text-slate-100">Cheltuieli & Totaluri</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Piese, Anvelope & Uleiuri</span>
          </button>

          <button
            onClick={() => setTipRaport('COST_UNITAR')}
            className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
              tipRaport === 'COST_UNITAR'
                ? 'bg-sapphire-50 dark:bg-indigo-950/50 border-sapphire-500 dark:border-indigo-500 text-sapphire-900 dark:text-white shadow-sm ring-1 ring-sapphire-500/30 dark:ring-indigo-500/30'
                : 'bg-white dark:bg-slate-900/70 border-morning-200 dark:border-slate-800 hover:border-morning-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className={`w-4 h-4 ${tipRaport === 'COST_UNITAR' ? 'text-sapphire-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-sapphire-600 dark:text-indigo-400">Raport 2</span>
            </div>
            <span className="text-xs md:text-sm font-bold text-sapphire-900 dark:text-slate-100">Cost Unitar & Eficiență</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">RON / 100 KM & RON / Oră</span>
          </button>

          <button
            onClick={() => setTipRaport('CONSUM_ULEI')}
            className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
              tipRaport === 'CONSUM_ULEI'
                ? 'bg-sapphire-50 dark:bg-indigo-950/50 border-sapphire-500 dark:border-indigo-500 text-sapphire-900 dark:text-white shadow-sm ring-1 ring-sapphire-500/30 dark:ring-indigo-500/30'
                : 'bg-white dark:bg-slate-900/70 border-morning-200 dark:border-slate-800 hover:border-morning-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets className={`w-4 h-4 ${tipRaport === 'CONSUM_ULEI' ? 'text-sapphire-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-sapphire-600 dark:text-indigo-400">Raport 3</span>
            </div>
            <span className="text-xs md:text-sm font-bold text-sapphire-900 dark:text-slate-100">Consum Excesiv Ulei</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Alertă Pierderi / Top-up</span>
          </button>

          <button
            onClick={() => setTipRaport('FURNIZORI_EFACTURA')}
            className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
              tipRaport === 'FURNIZORI_EFACTURA'
                ? 'bg-sapphire-50 dark:bg-indigo-950/50 border-sapphire-500 dark:border-indigo-500 text-sapphire-900 dark:text-white shadow-sm ring-1 ring-sapphire-500/30 dark:ring-indigo-500/30'
                : 'bg-white dark:bg-slate-900/70 border-morning-200 dark:border-slate-800 hover:border-morning-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className={`w-4 h-4 ${tipRaport === 'FURNIZORI_EFACTURA' ? 'text-sapphire-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-sapphire-600 dark:text-indigo-400">Raport 4</span>
            </div>
            <span className="text-xs md:text-sm font-bold text-sapphire-900 dark:text-slate-100">Achiziții Furnizori</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ANAF RO e-Factura</span>
          </button>

          <button
            onClick={() => setTipRaport('SCADENTAR')}
            className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
              tipRaport === 'SCADENTAR'
                ? 'bg-sapphire-50 dark:bg-indigo-950/50 border-sapphire-500 dark:border-indigo-500 text-sapphire-900 dark:text-white shadow-sm ring-1 ring-sapphire-500/30 dark:ring-indigo-500/30'
                : 'bg-white dark:bg-slate-900/70 border-morning-200 dark:border-slate-800 hover:border-morning-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className={`w-4 h-4 ${tipRaport === 'SCADENTAR' ? 'text-sapphire-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-sapphire-600 dark:text-indigo-400">Raport 5</span>
            </div>
            <span className="text-xs md:text-sm font-bold text-sapphire-900 dark:text-slate-100">Scadențar Mentenanță</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Documente & Revizii (30-60 Zile)</span>
          </button>
        </div>

        {/* PANOU FILTRE PERIOADĂ ȘI NIVEL AGREGARE */}
        <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Nivel Agregare / Hatáskör */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-sapphire-900 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sapphire-600 dark:text-indigo-400" />
                Nivel Agregare / Filtru Utilaje
              </label>
              <div className="grid grid-cols-3 gap-1 bg-morning-100 dark:bg-slate-950 p-1 rounded-xl border border-morning-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setScopeMode('FLOTA')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition ${
                    scopeMode === 'FLOTA'
                      ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 hover:bg-morning-200/60 dark:hover:bg-slate-900'
                  }`}
                >
                  Toată Flota
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('CATEGORIE')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition ${
                    scopeMode === 'CATEGORIE'
                      ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 hover:bg-morning-200/60 dark:hover:bg-slate-900'
                  }`}
                >
                  Pe Categorie
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode('VEHICUL')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition ${
                    scopeMode === 'VEHICUL'
                      ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 hover:bg-morning-200/60 dark:hover:bg-slate-900'
                  }`}
                >
                  Vehicul Unic
                </button>
              </div>
            </div>

            {/* Selector Categorie sau Selector Vehicul */}
            <div className="md:col-span-7 space-y-1.5">
              {scopeMode === 'CATEGORIE' && (
                <div>
                  <label className="text-xs font-bold text-sapphire-900 dark:text-slate-300">Selectați Categoria de Utilaje</label>
                  <select
                    value={selectedCategorie}
                    onChange={(e) => setSelectedCategorie(e.target.value)}
                    className="w-full mt-1 bg-white dark:bg-slate-950 border border-morning-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-sapphire-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                  >
                    {categoriiDisponibile.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scopeMode === 'VEHICUL' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-sapphire-900 dark:text-slate-300">Selectați Vehiculul / Utilajul</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filtrează după nr. intern, nr. înmatriculare sau marcă..."
                        value={searchVehiculFilter}
                        onChange={(e) => setSearchVehiculFilter(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-morning-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-sapphire-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                      />
                    </div>
                    <select
                      value={selectedVehiculId}
                      onChange={(e) => setSelectedVehiculId(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-950 border border-morning-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-sapphire-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                    >
                      {filteredVehiculeSelect.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.numarIntern || 'Fără nr.'} - {v.numarInmatriculare || 'Fără înmatr.'} ({v.marca} {v.model})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {scopeMode === 'FLOTA' && (
                <div className="bg-morning-50 dark:bg-slate-950/60 border border-morning-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sapphire-700 dark:text-indigo-400 font-semibold">
                    <Truck className="w-4 h-4" />
                    Analiză consolidată pentru întreg parcul activ
                  </span>
                  <span className="font-bold text-sapphire-900 dark:text-slate-300">
                    {vehicule.length} utilaje înregistrate
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Selector Perioadă Dată */}
          <div className="pt-3 border-t border-morning-100 dark:border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-sapphire-900 dark:text-slate-300 flex items-center gap-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-sapphire-600 dark:text-indigo-400" /> Perioadă:
              </span>
              {[
                { id: 'luna_curenta', label: 'Luna Curentă' },
                { id: 'luna_trecuta', label: 'Luna Trecută' },
                { id: 'anul_curent', label: 'Anul Curent (YTD)' },
                { id: 'ultimele_30', label: 'Ultimele 30 Zile' },
                { id: 'ultimele_90', label: 'Ultimele 90 Zile' },
                { id: 'tot', label: 'Toată Perioada' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePeriodChange(p.id as PeriodPreset)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition ${
                    periodPreset === p.id
                      ? 'bg-sapphire-500 dark:bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200 hover:bg-morning-200/60 dark:hover:bg-slate-800 border border-morning-200 dark:border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-morning-100 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">De la:</span>
                <input
                  type="date"
                  value={dataStart}
                  onChange={(e) => {
                    setDataStart(e.target.value);
                    setPeriodPreset('custom');
                  }}
                  className="bg-transparent text-sapphire-900 dark:text-white focus:outline-none text-xs font-semibold"
                />
              </div>

              <div className="flex items-center gap-1 bg-morning-100 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Până la:</span>
                <input
                  type="date"
                  value={dataEnd}
                  onChange={(e) => {
                    setDataEnd(e.target.value);
                    setPeriodPreset('custom');
                  }}
                  className="bg-transparent text-sapphire-900 dark:text-white focus:outline-none text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CORPUL RAPORTULUI SELECTAT */}
      {/* ========================================================= */}
      {loadingReport ? (
        <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-16 text-center space-y-3 shadow-xs">
          <RefreshCw className="w-8 h-8 text-sapphire-500 dark:text-indigo-400 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-sapphire-900 dark:text-slate-200">Se compilează datele raportului...</h3>
          <p className="text-xs text-sage-600 dark:text-slate-400">Analizăm comenzile de lucru, permutarile de anvelope și fluidele înregistrate.</p>
        </div>
      ) : !reportData ? (
        <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xs">
          Nu există date disponibile pentru selecția curentă.
        </div>
      ) : (
        <div className="space-y-6">
          {/* ======================================================= */}
          {/* RAPORT 1: CHELTUIELI & TOTALURI (PIESE, GUMI, OLAJOK) */}
          {/* ======================================================= */}
          {tipRaport === 'CHELTUIELI_TOTAL' && (
            <div className="space-y-6">
              {/* Sinteză Financiară Consolidată */}
              <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-morning-200 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-sapphire-900 dark:text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Sinteză Costuri & Categorii Cheltuieli
                    </h2>
                    <p className="text-xs text-sage-600 dark:text-slate-400 mt-0.5">
                      {getDescriereAgregare()} | {getDescrierePerioada()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Cost Total General</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {Number(reportData.totale?.totalGeneral || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                    </span>
                  </div>
                </div>

                {/* Benzi de repartizare pe piloni: Anvelope, Fluide (Schimb vs Completare), Piese, Manoperă */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-morning-50 dark:bg-slate-950 p-3.5 rounded-xl border border-morning-200 dark:border-slate-800/80">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Disc className="w-4 h-4 text-amber-500" />
                      Anvelope Montate
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-sapphire-900 dark:text-white">
                        {Number(reportData.totale?.totalAnvelope || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </span>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                        {reportData.totale?.totalAnvelopeBuc || 0} buc.
                      </span>
                    </div>
                  </div>

                  <div className="bg-morning-50 dark:bg-slate-950 p-3.5 rounded-xl border border-morning-200 dark:border-slate-800/80">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      Total Fluide & Uleiuri
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-sapphire-900 dark:text-white">
                        {Number(reportData.totale?.totalFluide || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </span>
                      <span className="text-xs text-cyan-700 dark:text-cyan-400 font-bold">
                        {reportData.totale?.totalVolumFluideLitri || 0} L
                      </span>
                    </div>
                  </div>

                  <div className="bg-morning-50 dark:bg-slate-950 p-3.5 rounded-xl border border-morning-200 dark:border-slate-800/80">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Piese de Schimb
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-sapphire-900 dark:text-white">
                        {Number(reportData.totale?.totalPiese || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                        {reportData.totale?.numarPieseConsumate || 0} articole
                      </span>
                    </div>
                  </div>

                  <div className="bg-morning-50 dark:bg-slate-950 p-3.5 rounded-xl border border-morning-200 dark:border-slate-800/80">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Manoperă & Servicii
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-lg font-black text-sapphire-900 dark:text-white">
                        {Number(reportData.totale?.totalManopera || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </span>
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                        {reportData.totale?.numarComenziLucru || 0} comenzi
                      </span>
                    </div>
                  </div>
                </div>

                {/* Evidențiere concretă solicitată de utilizator: ULEIURI DEFALCATE PE SCHIMB (REVIZIE) vs COMPLETARE (TOP-UP) */}
                <div className="bg-cyan-50/50 dark:bg-slate-950/80 border border-cyan-200 dark:border-cyan-900/40 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    Structura Consumului de Fluide: Schimb (Revizie) vs Completare (Top-up / Pierderi)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-morning-200 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Schimb Ulei / Fluid (Revizie Tehnică)</span>
                        <span className="font-extrabold text-sapphire-900 dark:text-white">{reportData.totale?.totalFluideCsereLitri || 0} Litri</span>
                      </div>
                      <div className="text-xl font-black text-sapphire-900 dark:text-white">
                        {Number(reportData.totale?.totalFluideCsereCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Operațiuni planificate la revizii și comenzi periodice de mentenanță.
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-morning-200 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
                        <span className="font-bold text-amber-700 dark:text-amber-400">Completare Ulei / Fluid (Top-up & Pierderi)</span>
                        <span className="font-extrabold text-sapphire-900 dark:text-white">{reportData.totale?.totalFluidePotlasLitri || 0} Litri</span>
                      </div>
                      <div className="text-xl font-black text-sapphire-900 dark:text-white">
                        {Number(reportData.totale?.totalFluidePotlasCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Lichid adăugat între revizii pentru refacerea nivelului optim.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tabel defalcat pe tipuri specifice de uleiuri & fluide */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold text-sapphire-900 dark:text-slate-300 uppercase tracking-wider">
                    Defalcare Fluide pe Tipuri (Motor, Hidraulic, Transmisie, Antigel, Vaselină, AdBlue)
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-morning-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Tip Fluid</th>
                          <th className="p-3 text-right">Volum Schimb (L)</th>
                          <th className="p-3 text-right">Cost Schimb (RON)</th>
                          <th className="p-3 text-right">Volum Completare (L)</th>
                          <th className="p-3 text-right">Cost Completare (RON)</th>
                          <th className="p-3 text-right">Total Volum (L)</th>
                          <th className="p-3 text-right">Cost Total (RON)</th>
                          <th className="p-3 text-right">Preț Mediu / Litru</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60 font-medium">
                        {(reportData.fluidePeTipuri || []).map((f: any) => (
                          <tr key={f.key} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                            <td className="p-3 font-bold text-sapphire-900 dark:text-slate-200">{f.label}</td>
                            <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">{f.csereLitri || 0} L</td>
                            <td className="p-3 text-right text-slate-700 dark:text-slate-300">{Number(f.csereCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right text-amber-700 dark:text-amber-400 font-semibold">{f.potlasLitri || 0} L</td>
                            <td className="p-3 text-right text-slate-700 dark:text-slate-300">{Number(f.potlasCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-black text-cyan-800 dark:text-cyan-300">{f.totalLitri || 0} L</td>
                            <td className="p-3 text-right font-black text-sapphire-900 dark:text-white">{Number(f.totalCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                            <td className="p-3 text-right text-slate-500 dark:text-slate-400">{f.pretMediuPerLitru || 0} RON/L</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sub-taburi pentru liste itemizate și detalii */}
              <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-morning-200 dark:border-slate-800 pb-3">
                  <div className="flex flex-wrap items-center gap-1.5 bg-morning-100 dark:bg-slate-950 p-1 rounded-xl border border-morning-200 dark:border-slate-800">
                    <button
                      onClick={() => setSubTabCheltuieli('fluide_detaliu')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        subTabCheltuieli === 'fluide_detaliu'
                          ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Operațiuni Fluide ({reportData.completariFluide?.length || 0})
                    </button>
                    <button
                      onClick={() => setSubTabCheltuieli('anvelope')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        subTabCheltuieli === 'anvelope'
                          ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Anvelope Montate ({reportData.anvelopeMontate?.length || 0})
                    </button>
                    <button
                      onClick={() => setSubTabCheltuieli('comenzi_piese')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        subTabCheltuieli === 'comenzi_piese'
                          ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Piese Consumate ({reportData.pieseConsumate?.length || 0})
                    </button>
                    <button
                      onClick={() => setSubTabCheltuieli('centralizator_vehicule')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                        subTabCheltuieli === 'centralizator_vehicule'
                          ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Centralizator pe Utilaje ({reportData.statisticiVehicule?.length || 0})
                    </button>
                  </div>
                </div>

                {/* A. Detaliu Operațiuni Fluide */}
                {subTabCheltuieli === 'fluide_detaliu' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Caută în operațiunile de fluide după mecanic, utilaj sau denumire fluid..."
                        value={cautaFluideText}
                        onChange={(e) => setCautaFluideText(e.target.value)}
                        className="w-full bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                      />
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 max-h-96 shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold sticky top-0 border-b border-morning-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">Data</th>
                            <th className="p-3">Vehicul</th>
                            <th className="p-3">Tip Operațiune</th>
                            <th className="p-3">Denumire Fluid</th>
                            <th className="p-3 text-right">Cantitate</th>
                            <th className="p-3 text-right">Cost Total</th>
                            <th className="p-3">Mecanic / Sursă</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                          {filteredFluideDetaliu.map((f: any) => (
                            <tr key={f.id} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                              <td className="p-3 text-slate-500 dark:text-slate-400">{new Date(f.dataCompletare).toLocaleDateString('ro-RO')}</td>
                              <td className="p-3 font-bold text-sapphire-900 dark:text-white">
                                {f.vehicul?.numarIntern || '-'} <span className="text-slate-500 dark:text-slate-400 font-normal">({f.vehicul?.numarInmatriculare || '-'})</span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  f.tipOperatiune?.includes('SCHIMB')
                                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                }`}>
                                  {f.tipOperatiune?.includes('SCHIMB') ? 'Schimb Revizie' : 'Completare (Top-up)'}
                                </span>
                              </td>
                              <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{f.marcaUlei || f.articolDenumire || f.tipLichid}</td>
                              <td className="p-3 text-right font-black text-cyan-800 dark:text-cyan-300">{f.cantitateLitri} L</td>
                              <td className="p-3 text-right font-black text-sapphire-900 dark:text-white">{Number(f.costTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                              <td className="p-3 text-slate-500 dark:text-slate-400">{f.mecanic || f.provenienta}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* B. Anvelope Montate */}
                {subTabCheltuieli === 'anvelope' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Caută anvelopă după serie, marcă, ax sau utilaj..."
                        value={cautaAnvelopeText}
                        onChange={(e) => setCautaAnvelopeText(e.target.value)}
                        className="w-full bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                      />
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 max-h-96 shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold sticky top-0 border-b border-morning-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">Data Montaj</th>
                            <th className="p-3">Vehicul</th>
                            <th className="p-3">Marcă & Model</th>
                            <th className="p-3">Serie / DOT</th>
                            <th className="p-3">Poziție Ax</th>
                            <th className="p-3 text-right">Cost Anvelopă</th>
                            <th className="p-3">Proveniență</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                          {filteredAnvelope.map((a: any) => (
                            <tr key={a.id} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                              <td className="p-3 text-slate-500 dark:text-slate-400">{new Date(a.data).toLocaleDateString('ro-RO')}</td>
                              <td className="p-3 font-bold text-sapphire-900 dark:text-white">
                                {a.vehicul?.numarIntern || '-'} <span className="text-slate-500 dark:text-slate-400 font-normal">({a.vehicul?.numarInmatriculare || '-'})</span>
                              </td>
                              <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{a.marca} {a.model !== '-' ? a.model : ''}</td>
                              <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">{a.serieAnvelopa} {a.codDot !== '-' ? `(DOT ${a.codDot})` : ''}</td>
                              <td className="p-3 text-amber-700 dark:text-amber-400 font-bold">{a.pozitieAx}</td>
                              <td className="p-3 text-right font-black text-sapphire-900 dark:text-white">{Number(a.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                              <td className="p-3 text-slate-500 dark:text-slate-400">{a.provenienta}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* C. Piese Consumate pe Comenzi */}
                {subTabCheltuieli === 'comenzi_piese' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Caută piesă consumată după denumire, cod sau nr. comandă..."
                        value={cautaPieseText}
                        onChange={(e) => setCautaPieseText(e.target.value)}
                        className="w-full bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                      />
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 max-h-96 shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold sticky top-0 border-b border-morning-200 dark:border-slate-800">
                          <tr>
                            <th className="p-3">Data</th>
                            <th className="p-3">Comandă Lucru</th>
                            <th className="p-3">Vehicul</th>
                            <th className="p-3">Descriere Piesă</th>
                            <th className="p-3 text-right">Cantitate</th>
                            <th className="p-3 text-right">Preț Unitar</th>
                            <th className="p-3 text-right">Cost Total</th>
                            <th className="p-3">Proveniență</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                          {filteredPiese.map((p: any) => (
                            <tr key={p.id} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                              <td className="p-3 text-slate-500 dark:text-slate-400">{new Date(p.data).toLocaleDateString('ro-RO')}</td>
                              <td className="p-3 font-bold text-sapphire-700 dark:text-indigo-400">{p.numarComanda}</td>
                              <td className="p-3 font-bold text-sapphire-900 dark:text-white">
                                {p.vehicul?.numarIntern || '-'} <span className="text-slate-500 dark:text-slate-400 font-normal">({p.vehicul?.numarInmatriculare || '-'})</span>
                              </td>
                              <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{p.descriere}</td>
                              <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">{p.cantitate} buc.</td>
                              <td className="p-3 text-right text-slate-500 dark:text-slate-400">{Number(p.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}</td>
                              <td className="p-3 text-right font-black text-sapphire-900 dark:text-white">{Number(p.costTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                              <td className="p-3 text-slate-500 dark:text-slate-400">{p.provenienta}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* D. Centralizator pe Utilaje */}
                {subTabCheltuieli === 'centralizator_vehicule' && (
                  <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 max-h-96 shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold sticky top-0 border-b border-morning-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Vehicul</th>
                          <th className="p-3">Categorie</th>
                          <th className="p-3 text-right">Cost Anvelope</th>
                          <th className="p-3 text-right">Cost Ulei Schimb</th>
                          <th className="p-3 text-right">Cost Ulei Completare</th>
                          <th className="p-3 text-right">Cost Piese</th>
                          <th className="p-3 text-right">Cost Manoperă</th>
                          <th className="p-3 text-right font-black">Cost Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                        {(reportData.statisticiVehicule || []).map((v: any) => (
                          <tr key={v.id} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                            <td className="p-3 font-bold text-sapphire-900 dark:text-white">
                              {v.numarIntern || '-'} <span className="text-slate-500 dark:text-slate-400 font-normal">({v.numarInmatriculare || '-'})</span>
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400">{v.categorieEnum}</td>
                            <td className="p-3 text-right text-amber-700 dark:text-amber-400 font-bold">{Number(v.costAnvelope || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">{Number(v.costFluideCsere || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right text-cyan-700 dark:text-cyan-400 font-bold">{Number(v.costFluidePotlas || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right text-blue-700 dark:text-blue-400 font-bold">{Number(v.costPiese || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right text-purple-700 dark:text-purple-400 font-bold">{Number(v.costManopera || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-black text-sapphire-900 dark:text-white">{Number(v.totalCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* RAPORT 2: COST UNITAR & EFICIENȚĂ EXPLOATARE */}
          {/* ======================================================= */}
          {tipRaport === 'COST_UNITAR' && (
            <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-morning-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-sapphire-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sapphire-600 dark:text-indigo-400" />
                    Raport Cost Unitar & Eficiență Exploatare
                  </h2>
                  <p className="text-xs text-sage-600 dark:text-slate-400 mt-0.5">
                    Calculează costul real per 100 KM rulați sau per Oră lucrată (MTH) pe baza cheltuielilor totale și a variației contorului în perioadă.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Filtrează Diagnostic:</span>
                  <select
                    value={filtruStatusEficienta}
                    onChange={(e) => setFiltruStatusEficienta(e.target.value)}
                    className="bg-morning-100 dark:bg-slate-950 border border-morning-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-sapphire-900 dark:text-white focus:outline-none"
                  >
                    <option value="TOATE">Toate Diagnosticele</option>
                    <option value="OPTIM">Eficiență Optimă</option>
                    <option value="MODERAT">Cost Moderat</option>
                    <option value="RIDICAT">Cost Ridicat / Atenție</option>
                    <option value="FARA_RULAJ">Fără Rulaj Înregistrat</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Caută utilaj în raportul de cost unitar..."
                  value={cautaCostUnitar}
                  onChange={(e) => setCautaCostUnitar(e.target.value)}
                  className="w-full bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-morning-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Vehicul</th>
                      <th className="p-3">Categorie</th>
                      <th className="p-3">Măsurare</th>
                      <th className="p-3 text-right">Contor Start → End</th>
                      <th className="p-3 text-right">Rulaj Perioadă</th>
                      <th className="p-3 text-right">Cost Total (RON)</th>
                      <th className="p-3 text-right bg-sapphire-50 dark:bg-indigo-950/40 text-sapphire-800 dark:text-indigo-300 font-black">Cost Unitar</th>
                      <th className="p-3 text-center">Diagnostic Eficiență</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                    {filteredCostUnitar.map((item: any) => (
                      <tr key={item.vehiculId} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                        <td className="p-3 font-bold text-sapphire-900 dark:text-white">
                          {item.numarIntern || '-'} <span className="text-slate-500 dark:text-slate-400 font-normal">({item.numarInmatriculare || '-'})</span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{item.categorieEnum}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold">{item.tipMasurare}</td>
                        <td className="p-3 text-right text-slate-500 dark:text-slate-400">
                          {item.contorStart?.toLocaleString()} → {item.contorEnd?.toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-black text-sapphire-900 dark:text-white">
                          {item.deltaRulaj?.toLocaleString()} {item.tipMasurare}
                        </td>
                        <td className="p-3 text-right font-black text-slate-800 dark:text-slate-200">
                          {Number(item.costTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </td>
                        <td className="p-3 text-right bg-sapphire-50/50 dark:bg-indigo-950/20 font-black text-sm text-sapphire-800 dark:text-indigo-300">
                          {item.costPer100Km !== null ? (
                            <span>{item.costPer100Km} <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">RON/100km</span></span>
                          ) : item.costPerOra !== null ? (
                            <span>{item.costPerOra} <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">RON/Oră</span></span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.statusEficienta === 'OPTIM' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Eficiență Optimă
                            </span>
                          )}
                          {item.statusEficienta === 'MODERAT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Info className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Cost Moderat
                            </span>
                          )}
                          {item.statusEficienta === 'RIDICAT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Cost Ridicat / Atenție
                            </span>
                          )}
                          {item.statusEficienta === 'FARA_RULAJ' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-morning-100 dark:bg-slate-950 border border-morning-200 dark:border-slate-800">
                              Fără rulaj în perioadă
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* RAPORT 3: CONSUM EXCESIV DE ULEI & PIERDERI */}
          {/* ======================================================= */}
          {tipRaport === 'CONSUM_ULEI' && (
            <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-morning-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-sapphire-900 dark:text-white flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    Raport Consum Excesiv de Ulei & Alertă Pierderi (Scurgeri / Top-up)
                  </h2>
                  <p className="text-xs text-sage-600 dark:text-slate-400 mt-0.5">
                    Identifică utilajele unde cantitatea completată între revizii depășește normele admise sau indică defecțiuni mecanice.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Diagnostic:</span>
                  <select
                    value={filtruStatusUlei}
                    onChange={(e) => setFiltruStatusUlei(e.target.value)}
                    className="bg-morning-100 dark:bg-slate-950 border border-morning-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-sapphire-900 dark:text-white focus:outline-none"
                  >
                    <option value="TOATE">Toate Utilajele</option>
                    <option value="CRITIC">Alertă Critică (Pierderi)</option>
                    <option value="ATENTIE">Atenție (Consum Peste Normă)</option>
                    <option value="NORMAL">Normal</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Caută utilaj în raportul de consum de ulei..."
                  value={cautaConsumUlei}
                  onChange={(e) => setCautaConsumUlei(e.target.value)}
                  className="w-full bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-morning-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Vehicul</th>
                      <th className="p-3">Categorie</th>
                      <th className="p-3 text-right">Rulaj Perioadă</th>
                      <th className="p-3 text-right bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 font-bold">Litri Completați (Top-up)</th>
                      <th className="p-3 text-right">Cost Completări</th>
                      <th className="p-3 text-right">Litri Schimb (Revizie)</th>
                      <th className="p-3 text-right bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300 font-bold">Rată Medie Completare</th>
                      <th className="p-3 text-center">Diagnostic Pierderi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                    {filteredConsumUlei.map((item: any) => (
                      <tr key={item.vehiculId} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                        <td className="p-3 font-bold text-sapphire-900 dark:text-white">
                          {item.numarIntern || '-'} <span className="text-slate-500 dark:text-slate-400 font-normal">({item.numarInmatriculare || '-'})</span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{item.categorieEnum}</td>
                        <td className="p-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                          {item.deltaRulaj?.toLocaleString()} {item.tipMasurare}
                        </td>
                        <td className="p-3 text-right bg-amber-50/50 dark:bg-amber-950/20 font-black text-amber-800 dark:text-amber-300 text-sm">
                          {item.litriPotlas || 0} L
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">{item.numarCompletari} operațiuni</span>
                        </td>
                        <td className="p-3 text-right font-black text-sapphire-900 dark:text-white">
                          {Number(item.costPotlas || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          {item.litriCsere || 0} L
                        </td>
                        <td className="p-3 text-right bg-cyan-50/50 dark:bg-cyan-950/20 font-black text-cyan-800 dark:text-cyan-300">
                          {item.rataConsumPer1000Km !== null ? (
                            <span>{item.rataConsumPer1000Km} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">L / 1.000 KM</span></span>
                          ) : item.rataConsumPer100Ore !== null ? (
                            <span>{item.rataConsumPer100Ore} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">L / 100 Ore</span></span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.statusConsum === 'CRITIC' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Alertă Pierderi / Consum Excesiv
                            </span>
                          ) : item.statusConsum === 'ATENTIE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Atenție (Peste Medie)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* RAPORT 4: ACHIZIȚII FACTURATE ANAF E-FACTURA (CATEGORII & FURNIZORI) */}
          {/* ======================================================= */}
          {tipRaport === 'FURNIZORI_EFACTURA' && (
            <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
              {/* Antet Raport & Switcher Vizualizare */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-morning-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-sapphire-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-sapphire-600 dark:text-indigo-400" />
                    Raport Achiziții Facturate (ANAF RO e-Factura)
                  </h2>
                  <p className="text-xs text-sage-600 dark:text-slate-400 mt-0.5">
                    Centralizează achizițiile din SPV e-Factura pe categorii principale și subcategorii de piese, materiale și fluide, cu urmărire furnizori și prețuri.
                  </p>
                </div>

                {/* Sub-tab Switcher: Categorii Principale & Subcategorii vs. Furnizori */}
                <div className="flex items-center gap-1.5 bg-morning-100 dark:bg-slate-950 p-1 rounded-xl border border-morning-200 dark:border-slate-800 self-start lg:self-auto">
                  <button
                    onClick={() => setSubTabEfactura('categorii')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      subTabEfactura === 'categorii'
                        ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Categorii Principale & Subcategorii
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      subTabEfactura === 'categorii'
                        ? 'bg-white/20 text-white'
                        : 'bg-morning-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {reportData?.totale?.numarCategoriiAchizitii || (reportData?.achizitiiCategorii || []).length}
                    </span>
                  </button>
                  <button
                    onClick={() => setSubTabEfactura('furnizori')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      subTabEfactura === 'furnizori'
                        ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Parteneri & Furnizori
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      subTabEfactura === 'furnizori'
                        ? 'bg-white/20 text-white'
                        : 'bg-morning-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {(reportData?.achizitiiFurnizori || []).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* ===================================================== */}
              {/* VIZUALIZARE 1: CATEGORII PRINCIPALE & SUBCATEGORII    */}
              {/* ===================================================== */}
              {subTabEfactura === 'categorii' && (
                <div className="space-y-4">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Total Achiziții Facturate</span>
                        <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-xl font-black text-sapphire-900 dark:text-white">
                        {Number(reportData?.totale?.totalAchizitiiCategoriiRON || reportData?.totale?.totalAchizitiiEFacturaRON || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} <span className="text-xs font-semibold text-slate-500">RON</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Fără TVA: {Number(reportData?.totale?.totalAchizitiiFaraTVARON || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                      </div>
                    </div>

                    <div className="bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Categorii Principale Active</span>
                        <Layers className="w-4 h-4 text-sapphire-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-xl font-black text-sapphire-900 dark:text-white">
                        {reportData?.totale?.numarCategoriiAchizitii || (reportData?.achizitiiCategorii || []).length}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Grupare principală piese & fluide
                      </div>
                    </div>

                    <div className="bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Subcategorii Active</span>
                        <Disc className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <div className="text-xl font-black text-sapphire-900 dark:text-white">
                        {reportData?.totale?.numarSubcategoriiAchizitii || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Clase specifice piese / componente
                      </div>
                    </div>

                    <div className="bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl p-3.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Poziții Facturate</span>
                        <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-xl font-black text-sapphire-900 dark:text-white">
                        {reportData?.totale?.numarPozitiiFacturate || 0}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Articole individuale înregistrate
                      </div>
                    </div>
                  </div>

                  {/* Toolbar căutare & Expand/Collapse */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Caută categorie, subcategorie, cod piesă sau denumire în raport..."
                        value={cautaCategorieText}
                        onChange={(e) => setCautaCategorieText(e.target.value)}
                        className="w-full bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => toggleAllCategories(true)}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-morning-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-morning-200 dark:hover:bg-slate-700 transition"
                      >
                        Deschide Toate
                      </button>
                      <button
                        onClick={() => toggleAllCategories(false)}
                        className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-morning-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-morning-200 dark:hover:bg-slate-700 transition"
                      >
                        Închide Toate
                      </button>
                    </div>
                  </div>

                  {/* Arbore Ierarhic Categorii Principale & Subcategorii */}
                  {filteredCategorii.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs bg-morning-50 dark:bg-slate-950 rounded-xl border border-morning-200 dark:border-slate-800">
                      Nu s-au găsit categorii sau articole facturate pentru filtrele aplicate în această perioadă.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredCategorii.map((cat: any) => {
                        const isExpanded = expandedCategories[cat.categorie] !== false;

                        return (
                          <div
                            key={cat.categorie}
                            className="rounded-xl border border-morning-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs transition"
                          >
                            {/* Antet Categorie (Clickable Accordion) */}
                            <div
                              onClick={() => toggleCategory(cat.categorie)}
                              className="p-3.5 bg-morning-50/70 dark:bg-slate-850 hover:bg-morning-100/70 dark:hover:bg-slate-800 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-morning-200/80 dark:border-slate-800/80 select-none"
                            >
                              <div className="flex items-center gap-2.5">
                                <button className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:bg-morning-200 dark:hover:bg-slate-700 transition">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-sapphire-600 dark:text-indigo-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-sapphire-950 dark:text-white">
                                      {cat.categorie}
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sapphire-100 dark:bg-indigo-950/70 text-sapphire-800 dark:text-indigo-300 border border-sapphire-200 dark:border-indigo-800/40">
                                      {cat.subcategorii?.length || 0} subcategorii
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-morning-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      {cat.numarPozitii || 0} poziții
                                    </span>
                                    {cat.numarFacturi > 0 && (
                                      <span className="hidden sm:inline-block text-[10px] text-slate-500 dark:text-slate-400">
                                        ({cat.numarFacturi} facturi)
                                      </span>
                                    )}
                                  </div>
                                  {/* Furnizori principali în această categorie */}
                                  {cat.furnizoriPrincipali && cat.furnizoriPrincipali.length > 0 && (
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1">
                                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Top furnizori:</span>
                                      {cat.furnizoriPrincipali.map((fp: any, idx: number) => (
                                        <span key={idx} className="bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded border border-morning-200 dark:border-slate-800 text-[10px]">
                                          {fp.nume} ({Number(fp.valoareRON || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON)
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Pondere & Valoare Categorie */}
                              <div className="flex items-center justify-between md:justify-end gap-5 pl-7 md:pl-0">
                                {/* Visual progress bar pondere */}
                                <div className="w-32 hidden sm:block">
                                  <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                    <span>Pondere Total</span>
                                    <span className="text-sapphire-700 dark:text-indigo-400">{cat.procentDinTotal}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-morning-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-sapphire-500 dark:bg-indigo-500 rounded-full"
                                      style={{ width: `${Math.min(cat.procentDinTotal || 0, 100)}%` }}
                                    />
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-base font-black text-sapphire-900 dark:text-white block">
                                    {Number(cat.valoareTotalaRON || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                    fără TVA: {Number(cat.valoareFaraTVARON || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON ({cat.procentDinTotal}%)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Corp Categorie: Tabel Subcategorii */}
                            {isExpanded && (
                              <div className="overflow-x-auto divide-y divide-morning-100 dark:divide-slate-800/60">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-morning-100/60 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-morning-200 dark:border-slate-800">
                                    <tr>
                                      <th className="p-3 pl-6">Subcategorie</th>
                                      <th className="p-3 text-right">Cantitate Totală</th>
                                      <th className="p-3 text-right">Linii Factură</th>
                                      <th className="p-3 text-right w-36">Pondere în Categorie</th>
                                      <th className="p-3 text-right">Pondere din Total</th>
                                      <th className="p-3 text-right font-black">Valoare Totală (RON)</th>
                                      <th className="p-3 text-center">Articole Recente</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                    {(cat.subcategorii || []).map((sub: any) => {
                                      const subKey = `${cat.categorie}_${sub.subcategorie}`;
                                      const isSubExpanded = !!expandedSubcategories[subKey];

                                      return (
                                        <>
                                          <tr key={sub.subcategorie} className="hover:bg-morning-50/70 dark:hover:bg-slate-850/60 transition">
                                            <td className="p-3 pl-6">
                                              <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-sapphire-400 dark:bg-indigo-400" />
                                                <span className="font-bold text-sapphire-900 dark:text-slate-200">
                                                  {sub.subcategorie}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                                              {sub.cantitateTotala.toLocaleString('ro-RO')} {sub.unitateMasura}
                                            </td>
                                            <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                                              {sub.numarPozitii} linii
                                            </td>
                                            <td className="p-3 text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-1.5 bg-morning-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                  <div
                                                    className="h-full bg-emerald-500 rounded-full"
                                                    style={{ width: `${Math.min(sub.procentDinCategorie || 0, 100)}%` }}
                                                  />
                                                </div>
                                                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] w-9 text-right">
                                                  {sub.procentDinCategorie}%
                                                </span>
                                              </div>
                                            </td>
                                            <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                              {sub.procentDinTotal}%
                                            </td>
                                            <td className="p-3 text-right font-black text-sm text-sapphire-900 dark:text-white">
                                              {Number(sub.valoareTotalaRON || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                            </td>
                                            <td className="p-3 text-center">
                                              {sub.articoleRecente && sub.articoleRecente.length > 0 ? (
                                                <button
                                                  onClick={() => toggleSubcategory(subKey)}
                                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                                    isSubExpanded
                                                      ? 'bg-sapphire-100 dark:bg-indigo-950 text-sapphire-800 dark:text-indigo-300 border-sapphire-300 dark:border-indigo-700'
                                                      : 'bg-morning-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-morning-200 dark:border-slate-700 hover:bg-morning-200'
                                                  }`}
                                                >
                                                  {isSubExpanded ? 'Ascunde Linii' : `Linii Factură (${sub.articoleRecente.length})`}
                                                </button>
                                              ) : (
                                                <span className="text-slate-400">-</span>
                                              )}
                                            </td>
                                          </tr>

                                          {/* Subcategory recent items drawer */}
                                          {isSubExpanded && sub.articoleRecente && (
                                            <tr key={`${sub.subcategorie}_drawer`} className="bg-morning-50/50 dark:bg-slate-950/70">
                                              <td colSpan={7} className="p-3 pl-8 pr-4">
                                                <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
                                                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-morning-200 dark:border-slate-800">
                                                    <span className="text-[11px] font-bold text-sapphire-900 dark:text-white flex items-center gap-1.5">
                                                      <FileText className="w-3.5 h-3.5 text-sapphire-600 dark:text-indigo-400" />
                                                      Exemple de articole facturate sub „{sub.subcategorie}”
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                      Prețuri și furnizori preluați din facturi
                                                    </span>
                                                  </div>
                                                  <div className="overflow-x-auto">
                                                    <table className="w-full text-[11px] text-left">
                                                      <thead>
                                                        <tr className="text-slate-500 dark:text-slate-400 uppercase text-[9px] font-bold border-b border-morning-100 dark:border-slate-800">
                                                          <th className="pb-1.5">Furnizor</th>
                                                          <th className="pb-1.5">Factură / Dată</th>
                                                          <th className="pb-1.5">Denumire Piesă / Cod</th>
                                                          <th className="pb-1.5 text-right">Cantitate</th>
                                                          <th className="pb-1.5 text-right">Preț Unitar</th>
                                                          <th className="pb-1.5 text-right font-black">Valoare Totală</th>
                                                          <th className="pb-1.5 text-center">Stare</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-morning-100 dark:divide-slate-800">
                                                        {sub.articoleRecente.map((art: any, aIdx: number) => (
                                                          <tr key={aIdx} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                                                            <td className="py-1.5 font-semibold text-sapphire-900 dark:text-white">{art.furnizor}</td>
                                                            <td className="py-1.5 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
                                                              {art.numarFactura} <span className="text-slate-400">({art.dataFactura ? new Date(art.dataFactura).toISOString().split('T')[0] : '-'})</span>
                                                            </td>
                                                            <td className="py-1.5 text-slate-700 dark:text-slate-300">
                                                              {art.descriere}
                                                              {art.codArticol && art.codArticol !== '-' && (
                                                                <span className="ml-1 px-1 py-0.2 rounded bg-morning-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[9px]">
                                                                  {art.codArticol}
                                                                </span>
                                                             )}
                                                            </td>
                                                            <td className="py-1.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                                                              {art.cantitate} {art.unitateMasura}
                                                            </td>
                                                            <td className="py-1.5 text-right text-slate-600 dark:text-slate-400">
                                                              {Number(art.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="py-1.5 text-right font-black text-emerald-700 dark:text-emerald-400">
                                                              {Number(art.valoareTotala || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                                            </td>
                                                            <td className="py-1.5 text-center">
                                                              {art.stare === 'IMPORTAT' ? (
                                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                  IMPORTAT
                                                                </span>
                                                              ) : (
                                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-morning-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-morning-200 dark:border-slate-700">
                                                                  NEPROCESAT
                                                                </span>
                                                              )}
                                                            </td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ===================================================== */}
              {/* VIZUALIZARE 2: SITUAȚIE PE PARTENERI & FURNIZORI */}
              {/* ===================================================== */}
              {subTabEfactura === 'furnizori' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Caută furnizor după denumire sau cod fiscal (CIF/CUI)..."
                      value={cautaFurnizor}
                      onChange={(e) => setCautaFurnizor(e.target.value)}
                      className="w-full bg-morning-50 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                    />
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 shadow-xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-morning-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Furnizor (Denumire Partener)</th>
                          <th className="p-3">Cod Fiscal (CIF / CUI)</th>
                          <th className="p-3 text-right">Număr Facturi</th>
                          <th className="p-3 text-right font-black">Valoare Totală Achiziții</th>
                          <th className="p-3 text-right">Pondere din Total</th>
                          <th className="p-3">Ultimele Facturi Înregistrate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                        {filteredFurnizori.map((fn: any) => (
                          <tr key={fn.cif} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                            <td className="p-3 font-bold text-sapphire-900 dark:text-white">{fn.nume}</td>
                            <td className="p-3 text-slate-500 dark:text-slate-400 font-mono">{fn.cif}</td>
                            <td className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">{fn.numarFacturi} facturi</td>
                            <td className="p-3 text-right font-black text-sm text-emerald-700 dark:text-emerald-400">
                              {Number(fn.valoareTotalaRON || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                            </td>
                            <td className="p-3 text-right font-black text-sapphire-700 dark:text-indigo-400">
                              {fn.procentDinTotal}%
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400">
                              <div className="flex flex-wrap gap-1">
                                {(fn.facturiRecente || []).map((fc: any, idx: number) => (
                                  <span key={idx} className="bg-morning-100 dark:bg-slate-950 border border-morning-200 dark:border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-300 font-mono">
                                    {fc.numarFactura} ({fc.valoareTotala} RON)
                                  </span>
                                ))}
                              </div>
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

          {/* ======================================================= */}
          {/* RAPORT 5: SCADENȚAR MENTENANȚĂ (URMĂTOARELE 30-60 ZILE) */}
          {/* ======================================================= */}
          {tipRaport === 'SCADENTAR' && (
            <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-morning-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-sapphire-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sapphire-600 dark:text-indigo-400" />
                    Scadențar Mentenanță & Documente (Următoarele 30 - 60 Zile)
                  </h2>
                  <p className="text-xs text-sage-600 dark:text-slate-400 mt-0.5">
                    Evidențiază documentele de circulație expirate sau scadente în curând (ITP, RCA, Rovinietă, Tahograf) și reviziile tehnice preconizate.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-morning-100 dark:bg-slate-950 p-1 rounded-xl border border-morning-200 dark:border-slate-800">
                  <button
                    onClick={() => setSubTabScadentar('documente')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      subTabScadentar === 'documente'
                        ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Documente Scadente ({reportData.scadentarMentenanta?.documenteScadente?.length || 0})
                  </button>
                  <button
                    onClick={() => setSubTabScadentar('revizii')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      subTabScadentar === 'revizii'
                        ? 'bg-sapphire-500 dark:bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Revizii & Ulei Preconizat ({reportData.scadentarMentenanta?.reviziiPreconizate?.length || 0})
                  </button>
                </div>
              </div>

              {subTabScadentar === 'documente' ? (
                <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-morning-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Vehicul</th>
                        <th className="p-3">Tip Document</th>
                        <th className="p-3">Serie / Număr</th>
                        <th className="p-3">Emitent</th>
                        <th className="p-3">Data Expirare</th>
                        <th className="p-3 text-right">Zile Rămase</th>
                        <th className="p-3 text-center">Status Scadență</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                      {(reportData.scadentarMentenanta?.documenteScadente || []).map((d: any) => (
                        <tr key={d.id} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                          <td className="p-3 font-bold text-sapphire-900 dark:text-white">
                            {d.vehicul?.numarIntern || '-'} <span className="text-slate-500 dark:text-slate-400 font-normal">({d.vehicul?.numarInmatriculare || '-'})</span>
                          </td>
                          <td className="p-3 font-bold text-sapphire-900 dark:text-slate-200">{d.tipDocument}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">{d.serieDocument}</td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{d.emitent}</td>
                          <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{new Date(d.dataExpirare).toLocaleDateString('ro-RO')}</td>
                          <td className="p-3 text-right font-black">
                            {d.zileRamase < 0 ? (
                              <span className="text-rose-600 dark:text-rose-400">Expirat de {Math.abs(d.zileRamase)} zile</span>
                            ) : (
                              <span className={d.zileRamase <= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-sapphire-900 dark:text-slate-200'}>
                                {d.zileRamase} zile
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {d.status === 'EXPIRAT' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Expirat
                              </span>
                            )}
                            {d.status === 'CRITIC' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50/80 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-700">
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Critic (≤15 Zile)
                              </span>
                            )}
                            {d.status === 'URGENT' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Urgent (≤30 Zile)
                              </span>
                            )}
                            {d.status === 'ATENTIE' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Atenție (≤60 Zile)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-morning-200 dark:border-slate-800 shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-morning-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase font-bold border-b border-morning-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Vehicul</th>
                        <th className="p-3">Tip Serviciu</th>
                        <th className="p-3 text-right">Contor Curent</th>
                        <th className="p-3 text-right">Interval Configurat</th>
                        <th className="p-3 text-right">Contor Scadent</th>
                        <th className="p-3 text-right font-black">Rămas până la Service</th>
                        <th className="p-3 text-center">Alertă Preconizată</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-morning-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">
                      {(reportData.scadentarMentenanta?.reviziiPreconizate || []).map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-morning-50 dark:hover:bg-slate-850">
                          <td className="p-3 font-bold text-sapphire-900 dark:text-white">
                            {r.vehicul?.numarIntern || '-'} <span className="text-slate-500 dark:text-slate-400 font-normal">({r.vehicul?.numarInmatriculare || '-'})</span>
                          </td>
                          <td className="p-3 font-bold text-sapphire-900 dark:text-slate-200">{r.tipLichid?.replace(/_/g, ' ')}</td>
                          <td className="p-3 text-right font-semibold text-slate-700 dark:text-slate-300">{r.contorCurent?.toLocaleString()} {r.unitate}</td>
                          <td className="p-3 text-right text-slate-500 dark:text-slate-400">{r.interval?.toLocaleString()} {r.unitate}</td>
                          <td className="p-3 text-right font-black text-sapphire-900 dark:text-white">{r.contorScadent?.toLocaleString()} {r.unitate}</td>
                          <td className="p-3 text-right font-black">
                            {r.ramase <= 0 ? (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">Depășit cu {Math.abs(r.ramase)} {r.unitate}</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">{r.ramase} {r.unitate}</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {r.status === 'DEPASIT' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <AlertOctagon className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Depășit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Revizie Scadentă
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
