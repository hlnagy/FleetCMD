"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect, useMemo } from 'react';
import {
  Droplets, Plus, ShieldAlert, AlertTriangle, RefreshCw, ShoppingCart, Clock, Calendar,
  CheckCircle2, X, Filter, Sliders, ArrowUpRight, Search, Layers, Database, Truck, ChevronDown, ChevronUp, Check, Wrench, ShieldCheck, Activity, FileText,
  Edit3, Trash2, DollarSign, TrendingDown, Gauge, Car, Info, Sparkles, Tractor, CircleDot, Bike, Cog, Link2,
  LayoutGrid, LayoutList, RotateCcw, ArrowUp, ArrowDown, ArrowUpDown, Wind
} from 'lucide-react';
import VehicleSelector from '@/components/VehicleSelector';
import SearchableCombobox, { ComboboxOption } from '@/components/SearchableCombobox';
import FilterableSelect from '@/components/FilterableSelect';
import FluidStatusMatrix from '@/components/FluidStatusMatrix';
import { getCategoryColor } from '@/lib/categoryColors';
import { showConfirm } from '@/lib/swal';
import {
  FALLBACK_TIPURI_FLUIDE,
  TipFluidDef,
  buildSubcatTipMap,
  buildTipLichidLabelMap,
  getAccentClasses,
  getNormUnitMeasure,
  getTipFluidLabel,
  isArticolMatchingTipLichid,
  isConsumablePieceNorm,
  normalizeTipuriFluideList,
  resolveEffectiveTipLichid,
} from '@/lib/fluids';

const CategoryIcon = ({ catName, className = "w-4 h-4" }: { catName?: string; className?: string }) => {
  const c = (catName || '').toUpperCase();
  if (c.includes('EXC') || c.includes('VOLE') || c.includes('INCARCATOR') || c.includes('BULLDOZER') || c.includes('BOBCAT') || c.includes('AUTOVALT') || c.includes('UTILAJ')) {
    return <Tractor className={className} />;
  }
  if (c.includes('CONCASOR') || c.includes('STATIE')) {
    return <Cog className={className} />;
  }
  if (c.includes('TRACTOR') || c.includes('BASCULANTA') || c.includes('CAMION') || c.includes('AUTOUTILITARA')) {
    return <Truck className={className} />;
  }
  if (c.includes('SEMIREMORCA') || c.includes('REMORCA')) {
    return <CircleDot className={className} />;
  }
  if (c.includes('AUTOTURISM')) {
    return <Car className={className} />;
  }
  if (c.includes('ATV')) {
    return <Bike className={className} />;
  }
  return <Cog className={className} />;
};

function getNormTrackingMode(norma: any, catTipMasurare?: string): 'MTH' | 'KM' | 'LUNI' {
  if (norma?.intervalMth && Number(norma.intervalMth) > 0) return 'MTH';
  if (norma?.intervalKm && Number(norma.intervalKm) > 0) return 'KM';
  if (norma?.intervalLuni && Number(norma.intervalLuni) > 0) return 'LUNI';
  return (catTipMasurare || 'KM').toUpperCase() === 'MTH' ? 'MTH' : 'KM';
}

export default function FluidePage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [activeTab, setActiveTab] = useState<'flota' | 'stocuri' | 'istoric' | 'config' | 'anomalii'>('flota');
  const [stocUleiuri, setStocUleiuri] = useState<any[]>([]);
  const [stocConsumabile, setStocConsumabile] = useState<any[]>([]);
  const [flotaFluide, setFlotaFluide] = useState<any[]>([]);
  const [statusSchimburi, setStatusSchimburi] = useState<any[]>([]);
  const [alerte, setAlerte] = useState<any[]>([]);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);
  const [isAlerteCollapsed, setIsAlerteCollapsed] = useState<boolean>(false);

  // Filtre & Mod Vizualizare Tab Status Flotă & Schimburi
  const [flotaViewMode, setFlotaViewMode] = useState<'matrice' | 'lista'>('matrice');
  const [flotaMatrixColMode, setFlotaMatrixColMode] = useState<'GROUPED' | 'EXACT'>('GROUPED');
  const [searchFlota, setSearchFlota] = useState<string>('');
  const [filterFlotaStatus, setFilterFlotaStatus] = useState<'TOATE' | 'PROBLEME' | 'DEPASIT' | 'AVERTIZARE' | 'OPTIM'>('TOATE');
  const [filterFlotaTip, setFilterFlotaTip] = useState<string>('TOATE');
  const [filterFlotaCategorie, setFilterFlotaCategorie] = useState<string>('TOATE');
  const [filterFlotaUnit, setFilterFlotaUnit] = useState<'TOATE' | 'KM' | 'MTH' | 'LUNI'>('TOATE');
  const [flotaListSortCol, setFlotaListSortCol] = useState<'progres' | 'utilaj' | 'tip' | 'ultimulSchimb'>('progres');
  const [flotaListSortDir, setFlotaListSortDir] = useState<'asc' | 'desc'>('desc');

  // Istoric Completări & Schimburi Fluide
  const [istoricCompletari, setIstoricCompletari] = useState<any[]>([]);
  const [loadingIstoric, setLoadingIstoric] = useState<boolean>(false);
  const [searchIstoric, setSearchIstoric] = useState<string>('');
  const [filterIstoricTip, setFilterIstoricTip] = useState<string>('TOATE');
  const [filterIstoricOperatiune, setFilterIstoricOperatiune] = useState<'TOATE' | 'SCHIMB' | 'COMPLETARE'>('TOATE');
  const [filterIstoricVehicul, setFilterIstoricVehicul] = useState<string>('TOATE');
  const [filterIstoricMecanic, setFilterIstoricMecanic] = useState<string>('TOATE');
  const [filterIstoricDateFrom, setFilterIstoricDateFrom] = useState<string>('');
  const [filterIstoricDateTo, setFilterIstoricDateTo] = useState<string>('');
  const [istoricPage, setIstoricPage] = useState<number>(1);
  const [istoricPageSize, setIstoricPageSize] = useState<number>(50);

  // Categorii & Depozite Fluide + Tipuri Fluide Dinamice
  const [categoriiFluide, setCategoriiFluide] = useState<any[]>([]);
  const [toateCategoriileStoc, setToateCategoriileStoc] = useState<any[]>([]);
  const [tipuriFluide, setTipuriFluide] = useState<TipFluidDef[]>(FALLBACK_TIPURI_FLUIDE);
  const [depoziteList, setDepoziteList] = useState<any[]>([]);

  const tipLichidLabels = useMemo(() => buildTipLichidLabelMap(tipuriFluide), [tipuriFluide]);
  const subcatTipMap = useMemo(
    () => buildSubcatTipMap(toateCategoriileStoc.length > 0 ? toateCategoriileStoc : categoriiFluide),
    [toateCategoriileStoc, categoriiFluide],
  );

  // Filtre & Sortare Tab Stocuri Fluide
  const [searchStoc, setSearchStoc] = useState('');
  const [selectedDepozitStoc, setSelectedDepozitStoc] = useState('');
  const [selectedCategorieStoc, setSelectedCategorieStoc] = useState('');
  const [selectedTipFluidStoc, setSelectedTipFluidStoc] = useState('');
  const [selectedStatusStoc, setSelectedStatusStoc] = useState<'TOATE' | 'CRITIC' | 'OPTIM'>('TOATE');
  const [stocSortCol, setStocSortCol] = useState<'denumire' | 'categorie' | 'depozit' | 'stocCurent' | 'stocMinim' | 'stare'>('denumire');
  const [stocSortDir, setStocSortDir] = useState<'asc' | 'desc'>('asc');

  const handleStocSort = (col: 'denumire' | 'categorie' | 'depozit' | 'stocCurent' | 'stocMinim' | 'stare') => {
    if (stocSortCol === col) {
      setStocSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setStocSortCol(col);
      setStocSortDir(col === 'stocCurent' || col === 'stocMinim' ? 'desc' : 'asc');
    }
  };

  // Modal Asociere Tip Normă & Reclasificare Articol Stoc
  const [editingStockTipArticol, setEditingStockTipArticol] = useState<any>(null);
  const [stockTipValue, setStockTipValue] = useState<string>('');
  const [stockMarcaValue, setStockMarcaValue] = useState<string>('');
  const [stockCategorieValue, setStockCategorieValue] = useState<string>('');
  const [stockSubcategorieValue, setStockSubcategorieValue] = useState<string>('');
  const [stockUmValue, setStockUmValue] = useState<string>('L');
  const [isSavingStockTip, setIsSavingStockTip] = useState<boolean>(false);

  // Modal Nomenclator Tip Fluid Nou / Editare
  const [showTipFluidModal, setShowTipFluidModal] = useState<boolean>(false);
  const [editingTipFluid, setEditingTipFluid] = useState<TipFluidDef | null>(null);
  const [tipFluidForm, setTipFluidForm] = useState({
    cod: '',
    nume: '',
    descriere: '',
    presetKmText: '15000, 30000',
    presetMthText: '250, 500',
  });
  const [isSavingTipFluid, setIsSavingTipFluid] = useState<boolean>(false);

  // Modal Ajustare Prag Alertă Stoc Minim per Articol
  const [editingAlertArticol, setEditingAlertArticol] = useState<any>(null);
  const [newPragAlert, setNewPragAlert] = useState<number>(0);
  const [isSavingAlert, setIsSavingAlert] = useState<boolean>(false);

  // Modal Gestiune Categorie Fluid (CRUD)
  const [showAddCatModal, setShowAddCatModal] = useState<boolean>(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catNume, setCatNume] = useState<string>('');
  const [catDescriere, setCatDescriere] = useState<string>('');
  const [catStocMinim, setCatStocMinim] = useState<number>(20);

  // Modal Gestiune Subcategorie Fluid (CRUD)
  const [showAddSubcatModal, setShowAddSubcatModal] = useState<boolean>(false);
  const [editingSubcat, setEditingSubcat] = useState<any>(null);
  const [targetCatForSubcat, setTargetCatForSubcat] = useState<string>('');
  const [subcatNume, setSubcatNume] = useState<string>('');
  const [subcatDescriere, setSubcatDescriere] = useState<string>('');
  const [subcatTipLichid, setSubcatTipLichid] = useState<string>('');

  // Modal Trasabilitate Loturi FIFO
  const [viewingFifoArticol, setViewingFifoArticol] = useState<any>(null);
  const [fifoLoturiList, setFifoLoturiList] = useState<any[]>([]);
  const [loadingFifoLoturi, setLoadingFifoLoturi] = useState<boolean>(false);

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

  // Stare Formular Ieșiri Ulei (Completare pe vehicul)
  const [iesireTipLichid, setIesireTipLichid] = useState('ULEI_MOTOR_15W40');
  const [iesireOperatiune, setIesireOperatiune] = useState('COMPLETARE_ULEI');
  const [selectedArticolStocId, setSelectedArticolStocId] = useState('');
  const [iesireMarca, setIesireMarca] = useState('Mobil1');
  const [iesireCantitate, setIesireCantitate] = useState(5);
  const [iesireContor, setIesireContor] = useState(0);
  const [iesireUnitateContor, setIesireUnitateContor] = useState<'KM' | 'MTH'>('KM');
  const [iesireData, setIesireData] = useState(new Date().toISOString().split('T')[0]);
  const [iesireMecanic, setIesireMecanic] = useState('');
  const [iesireObservatii, setIesireObservatii] = useState('');
  const [arataToateFluidele, setArataToateFluidele] = useState<boolean>(false);
  const [faraDeducereStoc, setFaraDeducereStoc] = useState<boolean>(false);
  const [isSubmittingIesire, setIsSubmittingIesire] = useState<boolean>(false);

  const isIesirePiece = useMemo(() => isConsumablePieceNorm(iesireTipLichid), [iesireTipLichid]);

  // Sursa activă de stoc pentru modalul de intervenție (filtre/consumabile vs fluide/uleiuri)
  const stocSursaModal = useMemo(
    () => (isIesirePiece ? stocConsumabile : stocUleiuri),
    [isIesirePiece, stocConsumabile, stocUleiuri],
  );

  // Filtrare automată a articolelor din stoc după Tip Normă selectat
  const articoleStocFiltrate = useMemo(() => {
    if (arataToateFluidele) return stocSursaModal;
    return stocSursaModal.filter((art) => isArticolMatchingTipLichid(art, iesireTipLichid, subcatTipMap));
  }, [stocSursaModal, iesireTipLichid, arataToateFluidele, subcatTipMap]);

  // Actualizare automată a selecției când se schimbă categoria sau lista filtrată
  useEffect(() => {
    if (showCompletareModal) {
      const selectedValidInAll = stocSursaModal.some((a) => a.id === selectedArticolStocId);
      if (articoleStocFiltrate.length > 0) {
        const exists = articoleStocFiltrate.some((a) => a.id === selectedArticolStocId);
        if (!exists) {
          setSelectedArticolStocId(articoleStocFiltrate[0].id);
          setIesireMarca(articoleStocFiltrate[0].marcaUlei || articoleStocFiltrate[0].denumire);
        }
      } else if (!arataToateFluidele || !selectedValidInAll) {
        setSelectedArticolStocId('');
        setIesireMarca('');
      }
    }
  }, [iesireTipLichid, articoleStocFiltrate, showCompletareModal, arataToateFluidele, stocSursaModal, selectedArticolStocId]);

  // Stare Formular Configurare Intervale pe Categorii (Reguli mTH, KM, Luni)
  const [categoriiNormeList, setCategoriiNormeList] = useState<any[]>([]);
  const [selectedCatEnum, setSelectedCatEnum] = useState<string>('');
  const [arataToateNormeleCategoriilor, setArataToateNormeleCategoriilor] = useState<boolean>(false);
  const [isSavingConfigCat, setIsSavingConfigCat] = useState<boolean>(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'TOATE' | 'MTH' | 'KM'>('TOATE');
  const [searchNorme, setSearchNorme] = useState<string>('');
  const [configViewMode, setConfigViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [filtreazaDoarNormeActive, setFiltreazaDoarNormeActive] = useState<boolean>(false);

  // Modal Editare / Configurare Normă Fluid pe Categorie
  const [modalNormaOpen, setModalNormaOpen] = useState<boolean>(false);
  const [modalNormaCategorie, setModalNormaCategorie] = useState<string>('');
  const [modalNormaTipLichid, setModalNormaTipLichid] = useState<string>('ULEI_MOTOR_15W40');
  const [modalNormaTrackingMode, setModalNormaTrackingMode] = useState<'KM' | 'MTH' | 'LUNI'>('KM');
  const [modalNormaIntervalKm, setModalNormaIntervalKm] = useState<number>(15000);
  const [modalNormaPragKm, setModalNormaPragKm] = useState<number>(1000);
  const [modalNormaIntervalMth, setModalNormaIntervalMth] = useState<number>(500);
  const [modalNormaPragMth, setModalNormaPragMth] = useState<number>(50);
  const [modalNormaIntervalLuni, setModalNormaIntervalLuni] = useState<number | ''>(12);
  const [modalNormaPragLuni, setModalNormaPragLuni] = useState<number>(1);
  const [isModalSaving, setIsModalSaving] = useState<boolean>(false);

  // Modal Actualizare Rapidă Contor mTH / Ultimul Schimb per Utilaj (Status Flotă)
  const [editingBaselineRow, setEditingBaselineRow] = useState<any>(null);
  const [baselineMthValue, setBaselineMthValue] = useState<number>(0);
  const [baselineSchimbContor, setBaselineSchimbContor] = useState<number>(0);
  const [baselineSchimbData, setBaselineSchimbData] = useState<string>('');
  const [isSavingVehicleBaseline, setIsSavingVehicleBaseline] = useState<boolean>(false);

  const [cfgTipLichid, setCfgTipLichid] = useState('ULEI_MOTOR_15W40');
  const [cfgIntervalMth, setCfgIntervalMth] = useState(250);
  const [cfgIntervalKm, setCfgIntervalKm] = useState(15000);
  const [cfgIntervalLuni, setCfgIntervalLuni] = useState(12);
  const [cfgPragMth, setCfgPragMth] = useState(50);
  const [cfgPragKm, setCfgPragKm] = useState(1000);
  const [cfgPragLuni, setCfgPragLuni] = useState(1);

  const selectedCatObj = useMemo(() => {
    return categoriiNormeList.find((c) => c.nume === selectedCatEnum) || categoriiNormeList[0] || null;
  }, [categoriiNormeList, selectedCatEnum]);

  const isCatKm = useMemo(() => {
    if (!selectedCatObj) return true;
    return (selectedCatObj.tipMasurareImplicit || 'KM').toUpperCase() === 'KM';
  }, [selectedCatObj]);

  // Actualizare automată a valorilor din formular când se schimbă categoria sau fluidul selectat
  useEffect(() => {
    if (!selectedCatObj) return;
    const existingNorm = (selectedCatObj.norme || []).find((n: any) => n.tipLichid === cfgTipLichid);
    if (existingNorm) {
      if (existingNorm.intervalKm) setCfgIntervalKm(existingNorm.intervalKm);
      if (existingNorm.pragAvertizareKm) setCfgPragKm(existingNorm.pragAvertizareKm);
      if (existingNorm.intervalMth) setCfgIntervalMth(existingNorm.intervalMth);
      if (existingNorm.pragAvertizareMth) setCfgPragMth(existingNorm.pragAvertizareMth);
      if (existingNorm.intervalLuni) setCfgIntervalLuni(existingNorm.intervalLuni);
      if (existingNorm.pragAvertizareLuni) setCfgPragLuni(existingNorm.pragAvertizareLuni);
    } else {
      // Valori inițiale implicite recomandate
      if (isCatKm) {
        setCfgIntervalKm(cfgTipLichid === 'ULEI_MOTOR' ? 15000 : 30000);
        setCfgPragKm(1000);
      } else {
        setCfgIntervalMth(cfgTipLichid === 'ULEI_MOTOR' ? 250 : 500);
        setCfgPragMth(50);
      }
      setCfgIntervalLuni(12);
      setCfgPragLuni(1);
    }
  }, [selectedCatEnum, cfgTipLichid, selectedCatObj, isCatKm]);

  const fetchCategoriiNorme = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei/categorii`);
      if (res.ok) {
        const data = await res.json();
        setCategoriiNormeList(data);
        if (data.length > 0) {
          setSelectedCatEnum((prev) => prev || data[0].nume);
        }
      }
    } catch (e) {
      console.error('Eroare la încărcarea normelor pe categorii:', e);
    }
  };

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
        const consumableStoc = dataStoc.filter((s: any) => {
          const cat = (s.categorie || '').toLowerCase();
          const den = (s.denumire || '').toLowerCase();
          const sub = (s.subcategorie || '').toLowerCase();
          if (s.tipLichid && isConsumablePieceNorm(s.tipLichid)) return true;
          return cat.includes('filtr') || den.includes('filtr') || sub.includes('filtr');
        });
        setStocConsumabile(consumableStoc);

        const lubeStoc = dataStoc.filter((s: any) => {
          if (s.tipLichid && isConsumablePieceNorm(s.tipLichid)) return false;
          const cat = (s.categorie || '').toLowerCase();
          const den = (s.denumire || '').toLowerCase();
          const sub = (s.subcategorie || '').toLowerCase();
          const isFilter = cat.includes('filtr') || den.includes('filtr') || cat === 'filtre';
          const isNonFluid = /\b(bec|pozitie|cireasa|vopsea|kober|diluant|grund|spuma|curatitor|spray|degresant|sapun|senzor|vas expansiune|furtun|pompa|taxa|manus[ia]|cizm[ae]|bocanc|salopet[ae]|echipament)\b/i.test(`${cat} ${den} ${sub}`);
          if (isFilter || isNonFluid) return false;

          const isFluid =
            Boolean(s.tipLichid && String(s.tipLichid).trim() !== '') ||
            cat.includes('lubrifian') ||
            cat.includes('ulei') ||
            cat.includes('fluid') ||
            cat.includes('antigel') ||
            cat.includes('racire') ||
            cat.includes('adblue') ||
            sub.includes('antigel') ||
            sub.includes('g12') ||
            sub.includes('g11') ||
            sub.includes('adblue') ||
            sub.includes('ulei') ||
            sub.includes('punte') ||
            sub.includes('cutie') ||
            den.includes('antigel') ||
            den.includes('adblue') ||
            den.includes('ulei') ||
            den.includes('mobil') ||
            den.includes('castrol') ||
            den.includes('hlp') ||
            den.includes('gear');
          return isFluid;
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
        const lubeAlerts = rawAlerts.filter((a: any) => {
          // Normele configurate în acest modul (uleiuri, fluide & filtre monitorizate) se afișează întotdeauna
          if (a.categorieAlert === 'SCURGERI_ULEI' || a.categorieAlert === 'SCHIMB_ULEI') {
            return true;
          }
          const titlu = (a.titlu || '').toLowerCase();
          const mesaj = (a.mesaj || '').toLowerCase();
          const isLegacyFilterRule = titlu.includes('filtru') || titlu.includes('filter');
          if (isLegacyFilterRule) return false;
          return (
            titlu.includes('ulei') ||
            titlu.includes('fluid') ||
            titlu.includes('lichid') ||
            mesaj.includes('ulei')
          );
        });
        setAlerte(lubeAlerts);
      }

      // Fetch Categorii Fluide + toate categoriile (pentru mapare subcategorii filtre -> norme)
      const resCat = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`);
      if (resCat.ok) {
        const catData = await resCat.json();
        const allCats = [
          ...(Array.isArray(catData.categoriiImplicite) ? catData.categoriiImplicite : []),
          ...(Array.isArray(catData.categoriiCustom) ? catData.categoriiCustom : []),
        ];
        setToateCategoriileStoc(allCats);
        const fluidsOnly = allCats.filter((c: any) =>
          c.esteFluid === true ||
          /lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(c.nume || '')
        );
        setCategoriiFluide(fluidsOnly);
        if (fluidsOnly.length > 0) {
          setTargetCatForSubcat((prev) => prev || fluidsOnly[0].nume);
        }
      }

      // Fetch Depozite
      const resDep = await fetch(`${API_BASE_URL}/stocuri-garantii/depozite`);
      if (resDep.ok) {
        const depData = await resDep.json();
        setDepoziteList(Array.isArray(depData) ? depData : []);
      }

      // Fetch Tipuri Fluide Dinamice
      const resTipuri = await fetch(`${API_BASE_URL}/anomalii/tipuri-fluide`);
      if (resTipuri.ok) {
        const tipuriData = await resTipuri.json();
        setTipuriFluide(normalizeTipuriFluideList(tipuriData));
      }

      // Fetch Norme pe Categorii
      await fetchCategoriiNorme();

      // Fetch Istoric Completări Flotă (toate înregistrările, paginat în UI)
      const resIstoric = await fetch(`${API_BASE_URL}/anomalii/istoric-completari`);
      if (resIstoric.ok) setIstoricCompletari(await resIstoric.json());
    } catch (e) {
      console.log('Error fetching initial data for fluids', e);
    }
  };

  const fetchIstoricCompletari = async () => {
    setLoadingIstoric(true);
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/istoric-completari`);
      if (res.ok) setIstoricCompletari(await res.json());
    } catch (e) {
      console.error('Error fetching completions history', e);
    } finally {
      setLoadingIstoric(false);
    }
  };

  // Ascultăm schimbarea tab-ului și a vizualizării din URL (?tab=stocuri&view=matrice|lista) + localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t === 'flota' || t === 'stocuri' || t === 'istoric' || t === 'config' || t === 'anomalii') {
          setActiveTab(t);
        }
        const v = params.get('view');
        if (v === 'matrice' || v === 'lista') {
          setFlotaViewMode(v);
        } else {
          const savedView = localStorage.getItem('fleetcmd_fluide_flota_view_mode');
          if (savedView === 'matrice' || savedView === 'lista') {
            setFlotaViewMode(savedView);
          }
        }
      }
    } catch (e) {}
  }, []);

  const handleChangeFlotaViewMode = (mode: 'matrice' | 'lista') => {
    setFlotaViewMode(mode);
    try {
      localStorage.setItem('fleetcmd_fluide_flota_view_mode', mode);
    } catch (e) {}
  };

  // Handlers Modificare Prag Alertă per Articol
  const handleOpenEditAlert = (art: any) => {
    setEditingAlertArticol(art);
    setNewPragAlert(art.stocMinim || 0);
  };

  const handleSavePragAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlertArticol) return;
    if (newPragAlert < 0) {
      alert('Pragul de alertă stoc minim nu poate fi un număr negativ!');
      return;
    }
    setIsSavingAlert(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${editingAlertArticol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocMinim: Math.max(0, Number(newPragAlert) || 0) }),
      });
      if (res.ok) {
        alert(`Pragul minim de alertă pentru "${editingAlertArticol.denumire}" a fost setat la ${newPragAlert} ${editingAlertArticol.unitateMasura || 'L'}.`);
        setEditingAlertArticol(null);
        fetchInitialData();
      } else {
        alert('Eroare la actualizarea pragului de alertă.');
      }
    } catch (e) {
      alert('Eroare de rețea la actualizarea pragului.');
    } finally {
      setIsSavingAlert(false);
    }
  };

  // Handlers CRUD Categorii Fluide
  const openAddCat = () => {
    setEditingCat(null);
    setCatNume('');
    setCatDescriere('');
    setCatStocMinim(20);
    setShowAddCatModal(true);
  };

  const openEditCat = (c: any) => {
    setEditingCat(c);
    setCatNume(c.nume || '');
    setCatDescriere(c.descriere || '');
    setCatStocMinim(c.stocMinimImplicit || 20);
    setShowAddCatModal(true);
  };

  const handleSaveFluidCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNume.trim()) {
      alert('Vă rugăm introduceți denumirea categoriei de fluid!');
      return;
    }
    if (catStocMinim < 0) {
      alert('Pragul de alertă stoc minim nu poate fi negativ!');
      return;
    }
    try {
      const url = editingCat
        ? `${API_BASE_URL}/stocuri-garantii/categorii/${editingCat.id}`
        : `${API_BASE_URL}/stocuri-garantii/categorii`;
      const method = editingCat ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: catNume.trim(),
          descriere: catDescriere.trim() || null,
          stocMinimImplicit: Math.max(0, Number(catStocMinim) || 0),
          esteFluid: true,
        }),
      });

      if (res.ok) {
        alert(`Categoria de fluid "${catNume.trim()}" a fost ${editingCat ? 'actualizată' : 'creată'} cu succes!`);
        setShowAddCatModal(false);
        setEditingCat(null);
        setCatNume('');
        setCatDescriere('');
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea categoriei de fluid.');
    }
  };

  const handleDeleteFluidCategorie = async (id: string, nume: string) => {
    const confirmed = await showConfirm(
      'Ștergere Categorie Fluid',
      `Sigur doriți să ștergeți categoria de fluide "${nume}" și toate subtipurile acesteia?\n\nArticolele existente în stoc își vor păstra denumirile.`,
      'Da, șterge categoria',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`Categoria de fluid "${nume}" a fost ștearsă.`);
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge categoria'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea categoriei.');
    }
  };

  // Handlers CRUD Subcategorii Fluide
  const openAddSubcat = (catNumeParam?: string) => {
    setEditingSubcat(null);
    setTargetCatForSubcat(catNumeParam || (categoriiFluide[0]?.nume || ''));
    setSubcatNume('');
    setSubcatDescriere('');
    setSubcatTipLichid('');
    setShowAddSubcatModal(true);
  };

  const openEditSubcat = (sc: any, catNumeParam: string) => {
    setEditingSubcat(sc);
    setTargetCatForSubcat(catNumeParam);
    setSubcatNume(sc.nume || '');
    setSubcatDescriere(sc.descriere || '');
    setSubcatTipLichid(sc.tipLichid || '');
    setShowAddSubcatModal(true);
  };

  const handleSaveFluidSubcategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcatNume.trim() || !targetCatForSubcat) {
      alert('Vă rugăm selectați Categoria de fluid și introduceți numele Subcategoriei!');
      return;
    }
    try {
      const url = editingSubcat
        ? `${API_BASE_URL}/stocuri-garantii/subcategorii/${editingSubcat.id}`
        : `${API_BASE_URL}/stocuri-garantii/subcategorii`;
      const method = editingSubcat ? 'PATCH' : 'POST';

      const targetCatObj = categoriiFluide.find((c: any) => c.nume === targetCatForSubcat);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorieNume: targetCatForSubcat,
          categorieStocId: targetCatObj?.id,
          nume: subcatNume.trim(),
          descriere: subcatDescriere.trim() || null,
          tipLichid: subcatTipLichid.trim() || null,
        }),
      });

      if (res.ok) {
        alert(`Subcategoria de fluid "${subcatNume.trim()}" a fost ${editingSubcat ? 'actualizată' : 'salvată'} cu succes!`);
        setShowAddSubcatModal(false);
        setEditingSubcat(null);
        setSubcatNume('');
        setSubcatDescriere('');
        setSubcatTipLichid('');
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea subcategoriei.');
    }
  };

  // Handlers Asociere Tip Normă & Reclasificare Articol Stoc
  const handleOpenEditStockTip = (art: any) => {
    const resolved = resolveEffectiveTipLichid(art, subcatTipMap);
    setEditingStockTipArticol(art);
    setStockTipValue(art.tipLichid || resolved.cod || '');
    setStockMarcaValue(art.marcaUlei || '');
    setStockCategorieValue(art.categorie || '');
    setStockSubcategorieValue(art.subcategorie || '');
    setStockUmValue(art.unitateMasura || 'L');
  };

  const handleSaveStockTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockTipArticol) return;
    setIsSavingStockTip(true);
    try {
      const catClean = stockCategorieValue.trim() || editingStockTipArticol.categorie;
      const subClean = stockSubcategorieValue.trim() || null;
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${editingStockTipArticol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorie: catClean,
          subcategorie: subClean,
          unitateMasura: stockUmValue.trim() || editingStockTipArticol.unitateMasura || 'L',
          tipLichid: stockTipValue.trim() || null,
          marcaUlei: stockMarcaValue.trim() || null,
        }),
      });
      if (res.ok) {
        setEditingStockTipArticol(null);
        await fetchInitialData();
      } else {
        alert('Nu s-a putut actualiza asocierea articolului.');
      }
    } catch {
      alert('Eroare de rețea la actualizarea articolului.');
    } finally {
      setIsSavingStockTip(false);
    }
  };

  const handleRemoveArticolFromFluids = async () => {
    if (!editingStockTipArticol) return;
    const confirmed = await showConfirm(
      'Scoți articolul din Gestiunea Fluidelor?',
      `„${editingStockTipArticol.denumire}” va fi mutat în categoria Alte ▸ Alte piese, fără normă de fluid asociată (iar unitatea de măsură va fi trecută pe buc dacă era L). Articolul rămâne în Stocuri Generale.`,
      'Mută în Alte (scoate din Fluide)',
      'Anulează',
      'warning',
    );
    if (!confirmed) return;

    setIsSavingStockTip(true);
    try {
      const nextUm = /^(l|litri|litru)$/i.test(String(editingStockTipArticol.unitateMasura || '').trim())
        ? 'buc'
        : editingStockTipArticol.unitateMasura || 'buc';
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${editingStockTipArticol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorie: 'Alte',
          subcategorie: 'Alte piese',
          tipLichid: null,
          marcaUlei: null,
          unitateMasura: nextUm,
        }),
      });
      if (res.ok) {
        setEditingStockTipArticol(null);
        await fetchInitialData();
      } else {
        alert('Nu s-a putut muta articolul din Fluide.');
      }
    } catch {
      alert('Eroare de rețea la mutarea articolului.');
    } finally {
      setIsSavingStockTip(false);
    }
  };

  // Handlers CRUD Nomenclator Tipuri Lubrifianți (Master Registry)
  const openAddTipFluid = () => {
    setEditingTipFluid(null);
    setTipFluidForm({
      cod: '',
      nume: '',
      descriere: '',
      presetKmText: '15000, 30000, 50000',
      presetMthText: '250, 500, 1000',
    });
    setShowTipFluidModal(true);
  };

  const openEditTipFluid = (tf: TipFluidDef) => {
    setEditingTipFluid(tf);
    setTipFluidForm({
      cod: tf.cod,
      nume: tf.nume,
      descriere: tf.descriere || '',
      presetKmText: (tf.presetKm || [15000, 30000]).join(', '),
      presetMthText: (tf.presetMth || [250, 500]).join(', '),
    });
    setShowTipFluidModal(true);
  };

  const handleSaveTipFluid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipFluidForm.nume.trim()) {
      alert('Introduceți denumirea tipului de lubrifiant!');
      return;
    }
    const parseNums = (raw: string) =>
      raw
        .split(/[,;\s]+/)
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n) && n > 0);

    setIsSavingTipFluid(true);
    try {
      const targetId = editingTipFluid ? (editingTipFluid.dbId || editingTipFluid.cod) : '';
      const url = editingTipFluid
        ? `${API_BASE_URL}/anomalii/tipuri-fluide/${encodeURIComponent(targetId)}`
        : `${API_BASE_URL}/anomalii/tipuri-fluide`;
      const method = editingTipFluid ? 'PATCH' : 'POST';

      const payload: any = {
        nume: tipFluidForm.nume.trim(),
        descriere: tipFluidForm.descriere.trim() || null,
        presetKm: parseNums(tipFluidForm.presetKmText),
        presetMth: parseNums(tipFluidForm.presetMthText),
      };
      if (!editingTipFluid && tipFluidForm.cod.trim()) {
        payload.cod = tipFluidForm.cod.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowTipFluidModal(false);
        setEditingTipFluid(null);
        await fetchInitialData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare: ${err.message || 'Verificați datele introduse.'}`);
      }
    } catch {
      alert('Eroare de rețea la salvarea tipului de lubrifiant.');
    } finally {
      setIsSavingTipFluid(false);
    }
  };

  const handleDeleteTipFluid = async (tf: TipFluidDef) => {
    const confirmed = await showConfirm(
      'Ștergere Tip Lubrifiant',
      `Sigur doriți să ștergeți tipul "${tf.nume}" (${tf.cod})?\n\nVor fi dezactivate normele de pe categorii/utilaje și dezlegate asocierile directe din stoc pentru acest tip (istoricul de consum rămâne păstrat).`,
      'Da, șterge tipul',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const targetId = tf.dbId || tf.cod;
      const res = await fetch(`${API_BASE_URL}/anomalii/tipuri-fluide/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchInitialData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge tipul.'}`);
      }
    } catch {
      alert('Eroare de rețea la ștergere.');
    }
  };

  const handleDeleteFluidSubcategorie = async (id: string, nume: string) => {
    const confirmed = await showConfirm(
      'Ștergere Subcategorie Fluid',
      `Sigur doriți să ștergeți subcategoria de fluid "${nume}"?`,
      'Da, șterge',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/subcategorii/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`Subcategoria "${nume}" a fost ștearsă.`);
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge subcategoria'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea subcategoriei.');
    }
  };

  // Handler Deschidere Loturi FIFO
  const handleOpenFifoLoturi = async (articol: any) => {
    setViewingFifoArticol(articol);
    setLoadingFifoLoturi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${articol.id}/loturi`);
      if (res.ok) {
        setFifoLoturiList(await res.json());
      } else {
        setFifoLoturiList([]);
      }
    } catch (e) {
      console.error('Eroare la încărcare loturi FIFO:', e);
      setFifoLoturiList([]);
    } finally {
      setLoadingFifoLoturi(false);
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

  const resolveInterventionCounter = (vehId: string, tipCod: string) => {
    const v = vehicule.find((item) => item.id === vehId);
    if (!v) return { unit: 'KM' as 'KM' | 'MTH', contor: 0 };
    const isVehMth = (v.tipMasurare || '').toUpperCase().includes('MTH');
    if (isVehMth) {
      return { unit: 'MTH' as const, contor: Number(v.valoareContorCurent || 0) };
    }
    const catObj = categoriiNormeList.find((c) => c.nume === v.categorieEnum);
    const catNorm = (catObj?.norme || []).find((n: any) => n.tipLichid === tipCod);
    const rowMatch = flotaFluide.find((f) => f.vehiculId === vehId && f.tipLichid === tipCod);
    const usesMth =
      rowMatch?.trackingMode === 'MTH' ||
      Boolean(catNorm?.intervalMth && Number(catNorm.intervalMth) > 0);
    if (usesMth) {
      return { unit: 'MTH' as const, contor: Number(v.oreFunctionareCurent || 0) };
    }
    return { unit: 'KM' as const, contor: Number(v.valoareContorCurent || 0) };
  };

  useEffect(() => {
    if (selectedVehiculId) {
      fetchStatusSchimburi(selectedVehiculId);
      const resolved = resolveInterventionCounter(selectedVehiculId, iesireTipLichid);
      setIesireUnitateContor(resolved.unit);
      setIesireContor(resolved.contor);
    }
  }, [selectedVehiculId, iesireTipLichid]);

  const handleOpenCompletare = (
    arg1?: string | { vehiculId?: string; tipLichid?: string; tipOperatiune?: string; articol?: any },
    tipLichidArg?: string,
  ) => {
    const opts: { vehiculId?: string; tipLichid?: string; tipOperatiune?: string; articol?: any } =
      typeof arg1 === 'object' && arg1 !== null
        ? arg1
        : { vehiculId: typeof arg1 === 'string' ? arg1 : undefined, tipLichid: tipLichidArg };

    const targetVehId = opts.vehiculId || selectedVehiculId;
    let targetTip = opts.tipLichid || iesireTipLichid;

    if (opts.vehiculId) {
      setSelectedVehiculId(opts.vehiculId);
    }

    if (opts.articol) {
      const resolved = resolveEffectiveTipLichid(opts.articol, subcatTipMap);
      targetTip = resolved.cod || 'ULEI_MOTOR_15W40';
      setIesireTipLichid(targetTip);
      setSelectedArticolStocId(opts.articol.id);
      setIesireMarca(opts.articol.marcaUlei || opts.articol.denumire);
      setArataToateFluidele(!isArticolMatchingTipLichid(opts.articol, targetTip, subcatTipMap));
    } else {
      if (opts.tipLichid) {
        setIesireTipLichid(opts.tipLichid);
      }
      setArataToateFluidele(false);
    }

    if (targetVehId) {
      const cMeta = resolveInterventionCounter(targetVehId, targetTip);
      setIesireUnitateContor(cMeta.unit);
      setIesireContor(cMeta.contor);
    }

    const isTargetPiece = isConsumablePieceNorm(targetTip);
    setIesireOperatiune(
      isTargetPiece ? 'SCHIMB_FILTRU' : (opts.tipOperatiune || 'COMPLETARE_ULEI'),
    );
    setIesireCantitate(isTargetPiece ? 1 : 5);
    setIesireData(new Date().toISOString().split('T')[0]);
    setIesireObservatii('');
    setFaraDeducereStoc(false);
    setShowCompletareModal(true);
  };

  const handleIesireUlei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    const cant = Number(iesireCantitate || 0);
    if (cant <= 0) {
      alert('Cantitatea trebuie să fie mai mare ca 0.');
      return;
    }

    const selectedArt = selectedArticolStocId
      ? [...stocUleiuri, ...stocConsumabile].find((s: any) => s.id === selectedArticolStocId)
      : null;
    const qtyUnit = getNormUnitMeasure(iesireTipLichid, selectedArt?.unitateMasura);

    if (!faraDeducereStoc) {
      if (!selectedArt) {
        alert('Selectați un articol din stoc sau bifați opțiunea "Fără deducere din depozit" dacă produsul nu este în stoc.');
        return;
      }
      if (Number(selectedArt.stocCurent || 0) < cant) {
        alert(
          `Stoc insuficient pentru "${selectedArt.denumire}"!\nDisponibil: ${selectedArt.stocCurent} ${selectedArt.unitateMasura || qtyUnit}, solicitat: ${cant} ${qtyUnit}.`
        );
        return;
      }
    }

    setIsSubmittingIesire(true);
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/iesire-ulei`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedVehiculId,
          tipLichid: iesireTipLichid,
          tipOperatiune: isIesirePiece ? 'SCHIMB_FILTRU' : iesireOperatiune,
          articolStocId: !faraDeducereStoc && selectedArticolStocId ? selectedArticolStocId : undefined,
          faraDeducereStoc,
          marcaUlei: iesireMarca,
          cantitateLitri: cant,
          valoareContor: Number(iesireContor || 0),
          unitateContor: iesireUnitateContor,
          dataOperatiune: iesireData,
          mecanic: iesireMecanic,
          observatii: iesireObservatii,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Înregistrare salvată cu succes!');
        setShowCompletareModal(false);
        await fetchInitialData();
        await fetchStatusSchimburi(selectedVehiculId);
      } else {
        const rawText = await res.text().catch(() => '');
        let parsedMsg = '';
        try {
          const err = JSON.parse(rawText);
          parsedMsg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message || err?.error || '');
        } catch {
          parsedMsg = rawText.slice(0, 180);
        }
        alert(`Eroare la salvare (${res.status}): ${parsedMsg || 'Verificați datele introduse'}`);
      }
    } catch (e) {
      alert('Eroare la procesarea cererii de înregistrare.');
    } finally {
      setIsSubmittingIesire(false);
    }
  };

  const handleStergeCompletare = async (rec: any) => {
    const tipLabel = tipLichidLabels[rec.tipLichid] || rec.tipLichid;
    const recUm = getNormUnitMeasure(rec.tipLichid, rec.articolStoc?.unitateMasura);
    const confirmed = await showConfirm(
      'Anulare & Ștergere Intervenție',
      `Doriți să ștergeți înregistrarea (${rec.cantitateLitri} ${recUm} ${tipLabel}) pentru ${rec.vehicul?.numarIntern || 'vehicul'}?\n\n${
        rec.articolStocId
          ? `Cantitatea de ${rec.cantitateLitri} ${recUm} va fi restituită în stocul articolului "${rec.articolStoc?.denumire || ''}".`
          : 'Această înregistrare va fi eliminată din istoric.'
      }`,
      'Da, șterge',
      'Renunță'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/iesire-ulei/${rec.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchInitialData();
        if (selectedVehiculId) await fetchStatusSchimburi(selectedVehiculId);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare la ștergere: ${err.message || 'Verificați datele.'}`);
      }
    } catch (e) {
      alert('Eroare de rețea la ștergerea înregistrării.');
    }
  };

  const handleSalveazaConfigCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatEnum) {
      alert('Vă rugăm selectați o categorie de utilaj!');
      return;
    }

    setIsSavingConfigCat(true);
    try {
      const payload: any = {
        categorieEnum: selectedCatEnum,
        tipLichid: cfgTipLichid,
        intervalLuni: cfgIntervalLuni ? Number(cfgIntervalLuni) : null,
        pragAvertizareLuni: cfgPragLuni ? Number(cfgPragLuni) : 1,
      };

      if (isCatKm) {
        payload.intervalKm = Number(cfgIntervalKm);
        payload.pragAvertizareKm = Number(cfgPragKm);
        payload.intervalMth = null;
        payload.pragAvertizareMth = null;
      } else {
        payload.intervalMth = Number(cfgIntervalMth);
        payload.pragAvertizareMth = Number(cfgPragMth);
        payload.intervalKm = null;
        payload.pragAvertizareKm = null;
      }

      const res = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei/categorie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Norma pe categorie a fost salvată cu succes!');
        await fetchCategoriiNorme();
        await fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare la salvare: ${err.message || 'Verificați datele introduse'}`);
      }
    } catch (e) {
      alert('Eroare de rețea la salvarea normei de categorie.');
    } finally {
      setIsSavingConfigCat(false);
    }
  };

  const handleStergeConfigCategorie = async (normaId?: string, tipFluid?: string, catNume?: string) => {
    const targetCat = catNume || selectedCatObj?.nume;
    const targetFluid = tipFluid || modalNormaTipLichid;
    const fluidLabel = tipLichidLabels[targetFluid] || targetFluid?.replace(/_/g, ' ');
    const confirmed = await showConfirm(
      'Ștergere / Dezactivare Normă Fluid',
      `Sigur doriți să ștergeți / dezactivați norma pentru "${fluidLabel}" din categoria "${targetCat?.replace(/_/g, ' ')}"?\n\nToate utilajele din această categorie NU vor mai necesita și nu vor mai monitoriza acest schimb de ulei/fluid.`,
      'Da, șterge norma',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      let res: Response | null = null;
      if (normaId) {
        res = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei/categorie/${normaId}`, {
          method: 'DELETE',
        });
      } else if (targetCat && targetFluid) {
        res = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei/categorie-tip/${encodeURIComponent(targetCat)}/${encodeURIComponent(targetFluid)}`, {
          method: 'DELETE',
        });
      }
      if (res && res.ok) {
        alert('Norma a fost ștearsă cu succes.');
        await fetchCategoriiNorme();
        await fetchInitialData();
        setModalNormaOpen(false);
      } else {
        const err = res ? await res.json() : {};
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge norma'}`);
      }
    } catch (e) {
      alert('Eroare de rețea la ștergerea normei.');
    }
  };

  const handleOpenModalNorma = (catEnum: string, tipLichid: string) => {
    setModalNormaCategorie(catEnum);
    setModalNormaTipLichid(tipLichid);

    const cat = categoriiNormeList.find((c) => c.nume === catEnum);
    const isKm = (cat?.tipMasurareImplicit || 'KM').toUpperCase() === 'KM';
    const existing = (cat?.norme || []).find((n: any) => n.tipLichid === tipLichid);

    if (existing) {
      const mode = getNormTrackingMode(existing, cat?.tipMasurareImplicit);
      setModalNormaTrackingMode(mode);
      setModalNormaIntervalKm(existing.intervalKm || 15000);
      setModalNormaPragKm(existing.pragAvertizareKm || 1000);
      setModalNormaIntervalMth(existing.intervalMth || 500);
      setModalNormaPragMth(existing.pragAvertizareMth || 50);
      setModalNormaIntervalLuni(existing.intervalLuni || '');
      setModalNormaPragLuni(existing.pragAvertizareLuni || 1);
    } else {
      const defaultMode: 'KM' | 'MTH' | 'LUNI' = cat?.areContorDualMth
        ? 'MTH'
        : (isKm ? 'KM' : 'MTH');
      setModalNormaTrackingMode(defaultMode);
      setModalNormaIntervalKm(tipLichid.includes('MOTOR') ? 15000 : 50000);
      setModalNormaPragKm(1500);
      setModalNormaIntervalMth(tipLichid.includes('MOTOR') ? 500 : 2000);
      setModalNormaPragMth(100);
      setModalNormaIntervalLuni('');
      setModalNormaPragLuni(1);
    }
    setModalNormaOpen(true);
  };

  const handleSaveModalNorma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNormaCategorie || !modalNormaTipLichid) return;

    if (modalNormaTrackingMode === 'LUNI' && (!modalNormaIntervalLuni || Number(modalNormaIntervalLuni) <= 0)) {
      alert('Pentru monitorizarea calendaristică introduceți intervalul în luni (ex: 24 luni).');
      return;
    }

    setIsModalSaving(true);
    try {
      const luniVal = modalNormaIntervalLuni ? Number(modalNormaIntervalLuni) : null;
      const payload: any = {
        categorieEnum: modalNormaCategorie,
        tipLichid: modalNormaTipLichid,
        intervalLuni: luniVal,
        pragAvertizareLuni: luniVal ? (modalNormaPragLuni ? Number(modalNormaPragLuni) : 1) : null,
      };

      if (modalNormaTrackingMode === 'KM') {
        payload.intervalKm = Number(modalNormaIntervalKm);
        payload.pragAvertizareKm = Number(modalNormaPragKm);
        payload.intervalMth = null;
        payload.pragAvertizareMth = null;
      } else if (modalNormaTrackingMode === 'MTH') {
        payload.intervalMth = Number(modalNormaIntervalMth);
        payload.pragAvertizareMth = Number(modalNormaPragMth);
        payload.intervalKm = null;
        payload.pragAvertizareKm = null;
      } else {
        payload.intervalKm = null;
        payload.pragAvertizareKm = null;
        payload.intervalMth = null;
        payload.pragAvertizareMth = null;
      }

      const res = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei/categorie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Norma a fost salvată cu succes!');
        setModalNormaOpen(false);
        await fetchCategoriiNorme();
        await fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare la salvare: ${err.message || 'Verificați datele introduse'}`);
      }
    } catch (e) {
      alert('Eroare de rețea la salvarea normei de categorie.');
    } finally {
      setIsModalSaving(false);
    }
  };

  const handleOpenVehicleBaseline = (row: any) => {
    setEditingBaselineRow(row);
    setBaselineMthValue(Number(row.oreFunctionareCurent || 0));
    setBaselineSchimbContor(Number(row.ultimulSchimbContor || 0));
    setBaselineSchimbData(
      row.ultimulSchimbData
        ? new Date(row.ultimulSchimbData).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    );
  };

  const handleSaveVehicleBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBaselineRow) return;
    setIsSavingVehicleBaseline(true);
    try {
      // 1. Dacă vehiculul are contor dual mTH (CAP_TRACTOR) sau mTH manual, actualizăm mTH-ul curent dacă s-a modificat
      if (editingBaselineRow.areContorDualMth && baselineMthValue !== Number(editingBaselineRow.oreFunctionareCurent || 0)) {
        const resMth = await fetch(`${API_BASE_URL}/vehicule/inregistrare-contor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehiculId: editingBaselineRow.vehiculId,
            valoareContor: Number(baselineMthValue),
            tipContor: 'MTH',
            operator: 'Atelier / Lubrifianți',
            observatii: `Actualizare manuală ore funcționare (${Number(baselineMthValue)} mTH)`,
          }),
        });
        if (!resMth.ok) {
          const err = await resMth.json().catch(() => ({}));
          throw new Error(err.message || 'Eroare la salvarea orelor de funcționare mTH.');
        }
      }

      // 2. Actualizăm valoarea de bază a ultimului schimb pentru norma selectată (păstrăm flag-ul estimat dacă s-a modificat doar mTH-ul curent)
      const origContor = Number(editingBaselineRow.ultimulSchimbContor || 0);
      const origDate = editingBaselineRow.ultimulSchimbData
        ? new Date(editingBaselineRow.ultimulSchimbData).toISOString().split('T')[0]
        : '';
      const baselineChanged =
        Number(baselineSchimbContor || 0) !== origContor ||
        (baselineSchimbData || '') !== origDate;

      const resCfg = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: editingBaselineRow.vehiculId,
          tipLichid: editingBaselineRow.tipLichid,
          ultimulSchimbContor: Number(baselineSchimbContor || 0),
          ultimulSchimbData: baselineSchimbData || undefined,
          ultimulSchimbEstimat: baselineChanged ? false : Boolean(editingBaselineRow.ultimulSchimbEstimat),
        }),
      });
      if (!resCfg.ok) {
        const err = await resCfg.json().catch(() => ({}));
        throw new Error(err.message || 'Eroare la salvarea ultimului schimb.');
      }

      setEditingBaselineRow(null);
      await fetchInitialData();
    } catch (err: any) {
      alert(err?.message || 'Eroare la salvare.');
    } finally {
      setIsSavingVehicleBaseline(false);
    }
  };



  // Calcule & Filtrare Stocuri Fluide
  const totalVolumFluide = stocUleiuri.reduce((acc, s) => acc + (Number(s.stocCurent) || 0), 0);
  const totalValoareFluide = stocUleiuri.reduce((acc, s) => acc + ((Number(s.stocCurent) || 0) * (Number(s.pretUnitar) || 0)), 0);
  const fluideCriticeCount = stocUleiuri.filter((s) => (Number(s.stocMinim) || 0) > 0 && (Number(s.stocCurent) || 0) < (Number(s.stocMinim) || 0)).length;
  const totalSubcategoriiFluide = categoriiFluide.reduce((acc, c) => acc + (c.subcategorii?.length || 0), 0);

  // Calcule & Filtrare Status Flotă (Matrice & Listă Schimburi)
  const flotaDepasiteCount = flotaFluide.filter((f) => f.esteDepasit).length;
  const flotaAvertCount = flotaFluide.filter((f) => !f.esteDepasit && f.esteInPragAvertizare).length;
  const flotaOptimeCount = Math.max(0, flotaFluide.length - flotaDepasiteCount - flotaAvertCount);

  const flotaTotalVehiclesCount = useMemo(
    () => new Set(flotaFluide.map((f) => f.vehiculId)).size,
    [flotaFluide],
  );

  const flotaCategorySummary = useMemo(() => {
    const map = new Map<string, { vehIds: Set<string>; overdue: number; warn: number }>();
    flotaFluide.forEach((f) => {
      const cat = f.vehiculCategorie;
      if (!cat) return;
      if (!map.has(cat)) {
        map.set(cat, { vehIds: new Set(), overdue: 0, warn: 0 });
      }
      const entry = map.get(cat)!;
      entry.vehIds.add(f.vehiculId);
      if (f.esteDepasit) entry.overdue++;
      else if (f.esteInPragAvertizare) entry.warn++;
    });
    return Array.from(map.entries())
      .map(([cat, info]) => ({
        cat,
        vehicleCount: info.vehIds.size,
        overdue: info.overdue,
        warn: info.warn,
      }))
      .sort((a, b) => a.cat.localeCompare(b.cat, 'ro', { numeric: true, sensitivity: 'base' }));
  }, [flotaFluide]);

  const matchesFlotaUnitFilter = (f: any, unitFilter: 'TOATE' | 'KM' | 'MTH' | 'LUNI') => {
    if (unitFilter === 'MTH') {
      return f.trackingMode === 'MTH' || ((f.unitateMasura || '').toUpperCase() === 'MTH' && f.trackingMode !== 'LUNI');
    }
    if (unitFilter === 'KM') {
      return f.trackingMode === 'KM' || ((f.unitateMasura || '').toUpperCase() === 'KM' && f.trackingMode !== 'LUNI');
    }
    if (unitFilter === 'LUNI') {
      return f.trackingMode === 'LUNI';
    }
    return true;
  };

  const handleFlotaListSort = (col: 'progres' | 'utilaj' | 'tip' | 'ultimulSchimb') => {
    if (flotaListSortCol === col) {
      setFlotaListSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setFlotaListSortCol(col);
    setFlotaListSortDir(col === 'progres' || col === 'ultimulSchimb' ? 'desc' : 'asc');
  };

  const flotaFluideFiltrate = useMemo(() => {
    const q = searchFlota.trim().toLowerCase();
    const natCmp = (a?: string | null, b?: string | null) =>
      String(a || '').localeCompare(String(b || ''), 'ro', { numeric: true, sensitivity: 'base' });

    const getProgressRatio = (x: any): number => {
      if (x.trackingMode === 'LUNI' && x.intervalLuni && Number(x.intervalLuni) > 0) {
        return Number(x.luniTrecute || 0) / Number(x.intervalLuni);
      }
      if (x.intervalPrincipal && Number(x.intervalPrincipal) > 0) {
        return Number(x.rulajEfectiv || 0) / Number(x.intervalPrincipal);
      }
      return Number(x.procentConsum || 0) / 100;
    };

    const compareByProgressDesc = (a: any, b: any): number => {
      const rank = (x: any) => (x.esteDepasit ? 0 : x.esteInPragAvertizare ? 1 : 2);
      const rDiff = rank(a) - rank(b);
      if (rDiff !== 0) return rDiff;
      const ratioDiff = getProgressRatio(b) - getProgressRatio(a);
      if (Math.abs(ratioDiff) > 1e-6) return ratioDiff;
      const pDiff = Number(b.procentConsum || 0) - Number(a.procentConsum || 0);
      if (pDiff !== 0) return pDiff;
      return natCmp(a.vehiculNumarIntern || a.vehiculInmatriculare, b.vehiculNumarIntern || b.vehiculInmatriculare);
    };

    const dir = flotaListSortDir === 'asc' ? 1 : -1;

    return [...flotaFluide]
      .filter((f) => {
        if (q) {
          const tipLabel = (tipLichidLabels[f.tipLichid] || f.tipLichid || '').toLowerCase();
          const match =
            (f.vehiculNumarIntern || '').toLowerCase().includes(q) ||
            (f.vehiculInmatriculare || '').toLowerCase().includes(q) ||
            (f.vehiculMarca || '').toLowerCase().includes(q) ||
            (f.vehiculModel || '').toLowerCase().includes(q) ||
            (f.vehiculCategorie || '').toLowerCase().includes(q) ||
            tipLabel.includes(q);
          if (!match) return false;
        }
        if (filterFlotaStatus === 'DEPASIT' && !f.esteDepasit) return false;
        if (filterFlotaStatus === 'AVERTIZARE' && (f.esteDepasit || !f.esteInPragAvertizare)) return false;
        if (filterFlotaStatus === 'OPTIM' && (f.esteDepasit || f.esteInPragAvertizare)) return false;
        if (filterFlotaStatus === 'PROBLEME' && !f.esteDepasit && !f.esteInPragAvertizare) return false;
        if (filterFlotaTip !== 'TOATE' && f.tipLichid !== filterFlotaTip) return false;
        if (filterFlotaCategorie !== 'TOATE' && f.vehiculCategorie !== filterFlotaCategorie) return false;
        if (!matchesFlotaUnitFilter(f, filterFlotaUnit)) return false;
        return true;
      })
      .sort((a, b) => {
        if (flotaListSortCol === 'progres') {
          const base = compareByProgressDesc(a, b);
          return flotaListSortDir === 'desc' ? base : -base;
        }

        if (flotaListSortCol === 'utilaj') {
          const vDiff = natCmp(a.vehiculNumarIntern || a.vehiculInmatriculare, b.vehiculNumarIntern || b.vehiculInmatriculare);
          if (vDiff !== 0) return vDiff * dir;
          const cDiff = natCmp(a.vehiculCategorie, b.vehiculCategorie);
          if (cDiff !== 0) return cDiff * dir;
          return natCmp(tipLichidLabels[a.tipLichid] || a.tipLichid, tipLichidLabels[b.tipLichid] || b.tipLichid);
        }

        if (flotaListSortCol === 'tip') {
          const tDiff = natCmp(tipLichidLabels[a.tipLichid] || a.tipLichid, tipLichidLabels[b.tipLichid] || b.tipLichid);
          if (tDiff !== 0) return tDiff * dir;
          return compareByProgressDesc(a, b);
        }

        if (flotaListSortCol === 'ultimulSchimb') {
          // Normele estimate (fără schimb real anterior) rămân grupate curat la final
          const aEst = Boolean(a.ultimulSchimbEstimat);
          const bEst = Boolean(b.ultimulSchimbEstimat);
          if (aEst !== bEst) return aEst ? 1 : -1;
          if (!aEst) {
            const aTime = a.ultimulSchimbData ? new Date(a.ultimulSchimbData).getTime() : 0;
            const bTime = b.ultimulSchimbData ? new Date(b.ultimulSchimbData).getTime() : 0;
            if (aTime !== bTime) return (aTime - bTime) * dir;
            const cDiff = Number(a.ultimulSchimbContor || 0) - Number(b.ultimulSchimbContor || 0);
            if (cDiff !== 0) return cDiff * dir;
          } else {
            const curDiff = Number(a.currentContor ?? a.valoareContorCurent ?? 0) - Number(b.currentContor ?? b.valoareContorCurent ?? 0);
            if (curDiff !== 0) return curDiff * dir;
          }
          return natCmp(a.vehiculNumarIntern || a.vehiculInmatriculare, b.vehiculNumarIntern || b.vehiculInmatriculare);
        }

        return compareByProgressDesc(a, b);
      });
  }, [
    flotaFluide,
    searchFlota,
    filterFlotaStatus,
    filterFlotaTip,
    filterFlotaCategorie,
    filterFlotaUnit,
    tipLichidLabels,
    flotaListSortCol,
    flotaListSortDir,
  ]);

  const flotaMatrixVehicleCount = useMemo(() => {
    const byVeh = new Map<string, any[]>();
    flotaFluide.forEach((f) => {
      if (!byVeh.has(f.vehiculId)) byVeh.set(f.vehiculId, []);
      byVeh.get(f.vehiculId)!.push(f);
    });
    const q = searchFlota.trim().toLowerCase();
    let count = 0;
    byVeh.forEach((norms) => {
      const sample = norms[0];
      if (!sample) return;
      if (filterFlotaCategorie !== 'TOATE' && sample.vehiculCategorie !== filterFlotaCategorie) return;
      const visible = norms.filter(
        (n) => (filterFlotaTip === 'TOATE' || n.tipLichid === filterFlotaTip) && matchesFlotaUnitFilter(n, filterFlotaUnit),
      );
      if (visible.length === 0) return;
      if (q) {
        const haystack = [
          sample.vehiculNumarIntern,
          sample.vehiculInmatriculare,
          sample.vehiculMarca,
          sample.vehiculModel,
          sample.vehiculCategorie,
          ...visible.map((n) => tipLichidLabels[n.tipLichid] || n.tipLichid),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return;
      }
      const hasOver = visible.some((n) => n.esteDepasit);
      const hasWarn = visible.some((n) => !n.esteDepasit && n.esteInPragAvertizare);
      if (filterFlotaStatus === 'DEPASIT' && !hasOver) return;
      if (filterFlotaStatus === 'AVERTIZARE' && !hasWarn) return;
      if (filterFlotaStatus === 'PROBLEME' && !hasOver && !hasWarn) return;
      if (filterFlotaStatus === 'OPTIM' && (hasOver || hasWarn)) return;
      count++;
    });
    return count;
  }, [flotaFluide, searchFlota, filterFlotaStatus, filterFlotaTip, filterFlotaCategorie, filterFlotaUnit, tipLichidLabels]);

  const hasActiveFlotaFilters = Boolean(
    searchFlota.trim() ||
    filterFlotaStatus !== 'TOATE' ||
    filterFlotaTip !== 'TOATE' ||
    filterFlotaCategorie !== 'TOATE' ||
    filterFlotaUnit !== 'TOATE',
  );

  const resetFlotaFilters = () => {
    setSearchFlota('');
    setFilterFlotaStatus('TOATE');
    setFilterFlotaTip('TOATE');
    setFilterFlotaCategorie('TOATE');
    setFilterFlotaUnit('TOATE');
  };

  // Opțiuni dinamice filtre Istoric Intervenții Fluide
  const istoricVehiculeOptiuni = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of istoricCompletari) {
      if (c.vehicul?.id) {
        map.set(c.vehicul.id, c.vehicul.numarIntern || c.vehicul.numarInmatriculare || 'Vehicul');
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ro', { numeric: true }));
  }, [istoricCompletari]);

  const istoricMecaniciOptiuni = useMemo(() => {
    const set = new Set<string>();
    for (const c of istoricCompletari) {
      if (c.mecanic) set.add(c.mecanic);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ro'));
  }, [istoricCompletari]);

  // Filtrare Istoric Intervenții Fluide
  const istoricCompletariFiltrat = useMemo(() => {
    const q = searchIstoric.trim().toLowerCase();
    return istoricCompletari.filter((c) => {
      if (filterIstoricTip !== 'TOATE' && c.tipLichid !== filterIstoricTip) return false;
      if (filterIstoricVehicul !== 'TOATE' && c.vehicul?.id !== filterIstoricVehicul) return false;
      if (filterIstoricMecanic !== 'TOATE' && c.mecanic !== filterIstoricMecanic) return false;
      const isSchimb = String(c.tipOperatiune || '').toUpperCase().includes('SCHIMB');
      if (filterIstoricOperatiune === 'SCHIMB' && !isSchimb) return false;
      if (filterIstoricOperatiune === 'COMPLETARE' && isSchimb) return false;
      if (filterIstoricDateFrom || filterIstoricDateTo) {
        const dtStr = c.dataCompletare ? new Date(c.dataCompletare).toISOString().slice(0, 10) : '';
        if (filterIstoricDateFrom && dtStr < filterIstoricDateFrom) return false;
        if (filterIstoricDateTo && dtStr > filterIstoricDateTo) return false;
      }
      if (q) {
        const match =
          (c.vehicul?.numarIntern || '').toLowerCase().includes(q) ||
          (c.vehicul?.numarInmatriculare || '').toLowerCase().includes(q) ||
          (c.marcaUlei || '').toLowerCase().includes(q) ||
          (c.articolStoc?.denumire || '').toLowerCase().includes(q) ||
          (c.mecanic || '').toLowerCase().includes(q) ||
          (c.observatii || '').toLowerCase().includes(q) ||
          (c.comandaNumar || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    istoricCompletari,
    searchIstoric,
    filterIstoricTip,
    filterIstoricOperatiune,
    filterIstoricVehicul,
    filterIstoricMecanic,
    filterIstoricDateFrom,
    filterIstoricDateTo,
  ]);

  const istoricTotalPages = Math.max(1, Math.ceil(istoricCompletariFiltrat.length / istoricPageSize));
  const istoricSafePage = Math.min(istoricPage, istoricTotalPages);
  const istoricPaginat = useMemo(() => {
    const start = (istoricSafePage - 1) * istoricPageSize;
    return istoricCompletariFiltrat.slice(start, start + istoricPageSize);
  }, [istoricCompletariFiltrat, istoricSafePage, istoricPageSize]);

  const istoricKpi = useMemo(() => {
    let schimburi = 0;
    let completari = 0;
    let volumTotal = 0;
    let pieseBuc = 0;
    for (const c of istoricCompletariFiltrat) {
      const isSchimb = String(c.tipOperatiune || '').toUpperCase().includes('SCHIMB');
      const isPiece = isConsumablePieceNorm(c.tipLichid) || c.tipOperatiune === 'SCHIMB_FILTRU';
      if (isSchimb) schimburi++;
      else completari++;
      if (isPiece) {
        pieseBuc += Number(c.cantitateLitri || 0);
      } else {
        volumTotal += Number(c.cantitateLitri || 0);
      }
    }
    return { schimburi, completari, volumTotal, pieseBuc };
  }, [istoricCompletariFiltrat]);

  const hasIstoricFilters =
    searchIstoric.trim() !== '' ||
    filterIstoricTip !== 'TOATE' ||
    filterIstoricOperatiune !== 'TOATE' ||
    filterIstoricVehicul !== 'TOATE' ||
    filterIstoricMecanic !== 'TOATE' ||
    filterIstoricDateFrom !== '' ||
    filterIstoricDateTo !== '';

  const resetIstoricFilters = () => {
    setSearchIstoric('');
    setFilterIstoricTip('TOATE');
    setFilterIstoricOperatiune('TOATE');
    setFilterIstoricVehicul('TOATE');
    setFilterIstoricMecanic('TOATE');
    setFilterIstoricDateFrom('');
    setFilterIstoricDateTo('');
    setIstoricPage(1);
  };

  const stocUleiuriFiltrate = useMemo(() => {
    const filtered = stocUleiuri.filter((s) => {
      // Filtru căutare text
      if (searchStoc.trim()) {
        const q = searchStoc.toLowerCase();
        const den = (s.denumire || '').toLowerCase();
        const cod = (s.codArticol || '').toLowerCase();
        const marca = (s.marcaUlei || '').toLowerCase();
        const sub = (s.subcategorie || '').toLowerCase();
        const cat = (s.categorie || '').toLowerCase();
        if (!den.includes(q) && !cod.includes(q) && !marca.includes(q) && !sub.includes(q) && !cat.includes(q)) {
          return false;
        }
      }
      // Filtru depozit
      if (selectedDepozitStoc && s.depozitId !== selectedDepozitStoc) {
        return false;
      }
      // Filtru categorie fluid
      if (selectedCategorieStoc && s.categorie !== selectedCategorieStoc) {
        return false;
      }
      // Filtru Tip Lubrifiant / Normă
      if (selectedTipFluidStoc) {
        const resolved = resolveEffectiveTipLichid(s, subcatTipMap);
        if (resolved.cod !== selectedTipFluidStoc) return false;
      }
      // Filtru stare
      const min = Number(s.stocMinim) || 0;
      const cur = Number(s.stocCurent) || 0;
      if (selectedStatusStoc === 'CRITIC') {
        if (min <= 0 || cur >= min) return false;
      } else if (selectedStatusStoc === 'OPTIM') {
        if (min > 0 && cur < min) return false;
      }
      return true;
    });

    const natCmp = (a: string, b: string) =>
      a.localeCompare(b, 'ro', { numeric: true, sensitivity: 'base' });

    const getStareRank = (item: any) => {
      const cur = Number(item.stocCurent) || 0;
      const min = Number(item.stocMinim) || 0;
      if (min > 0 && cur <= 0) return 0; // EPUIZAT
      if (min > 0 && cur < min) return 1; // SUB MINIM
      return 2; // OPTIM
    };

    const dir = stocSortDir === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (stocSortCol === 'denumire') {
        cmp = natCmp(a.denumire || '', b.denumire || '');
      } else if (stocSortCol === 'categorie') {
        cmp =
          natCmp(a.categorie || '', b.categorie || '') ||
          natCmp(a.subcategorie || '', b.subcategorie || '');
      } else if (stocSortCol === 'depozit') {
        cmp = natCmp(a.depozit?.nume || 'Depozit Central', b.depozit?.nume || 'Depozit Central');
      } else if (stocSortCol === 'stocCurent') {
        cmp = (Number(a.stocCurent) || 0) - (Number(b.stocCurent) || 0);
      } else if (stocSortCol === 'stocMinim') {
        cmp = (Number(a.stocMinim) || 0) - (Number(b.stocMinim) || 0);
      } else if (stocSortCol === 'stare') {
        cmp = getStareRank(a) - getStareRank(b);
      }
      if (cmp !== 0) return cmp * dir;
      return natCmp(a.denumire || '', b.denumire || '');
    });
  }, [
    stocUleiuri,
    searchStoc,
    selectedDepozitStoc,
    selectedCategorieStoc,
    selectedTipFluidStoc,
    selectedStatusStoc,
    subcatTipMap,
    stocSortCol,
    stocSortDir,
  ]);

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
            <span>Uleiuri, Fluide &amp; Filtre</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/comenzi-lucru"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold transition border border-morning-300"
          >
            <FileText className="w-4 h-4 text-sapphire-600" />
            <span>Devize de Lucru (Revizii)</span>
          </a>

          <button
            type="button"
            onClick={() => handleOpenCompletare()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Înregistrează Intervenție</span>
          </button>
        </div>
      </div>

      {/* BANNER ALERTE ACTIVE SCHIMB ULEI & FLUIDE */}
      {alerte.length > 0 && (
        <div className="p-4 rounded-2xl bg-roseash-100 border-2 border-roseash-300 space-y-3 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-terracotta-700 font-extrabold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-terracotta-600 animate-bounce" />
              <span>Alerte Active Norme — Uleiuri, Fluide &amp; Filtre ({alerte.length} active):</span>
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="px-2.5 py-0.5 rounded-lg bg-sapphire-100 border border-sapphire-200 text-sapphire-900 font-black text-[11px] font-mono shrink-0">
                           {a.vehiculNumar || 'Utilaj'}
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs leading-snug break-words">
                          {a.titlu}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 whitespace-nowrap ${
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
                      onClick={() =>
                        handleOpenCompletare({
                          vehiculId: a.vehiculId,
                          tipLichid: a.tipLichid,
                          tipOperatiune:
                            isConsumablePieceNorm(a.tipLichid)
                              ? 'SCHIMB_FILTRU'
                              : a.categorieAlert === 'SCHIMB_ULEI'
                              ? 'SCHIMB_ULEI'
                              : 'COMPLETARE_ULEI',
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold shadow-xs transition flex items-center space-x-1"
                    >
                      <Droplets className="w-3 h-3" />
                      <span>{a.categorieAlert === 'SCHIMB_ULEI' ? 'Înregistrează Schimb' : 'Înregistrează Intervenție'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MENIU TABS PROFESIONAL (FĂRĂ NUMERE) */}
      <div className="flex flex-wrap gap-2 border-b border-morning-300 pb-2">
        <button
          onClick={() => setActiveTab('flota')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'flota'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>Status Flotă &amp; Schimburi</span>
          {flotaDepasiteCount + flotaAvertCount > 0 ? (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'flota' ? 'bg-black/25 text-white' : 'bg-roseash-100 text-terracotta-700 border border-roseash-300'
            }`}>
              {flotaDepasiteCount + flotaAvertCount} atenție
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'flota' ? 'bg-black/25 text-white' : 'bg-morning-200 text-slate-700'
            }`}>
              {flotaFluide.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('stocuri')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'stocuri'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Stocuri &amp; Categorii Fluide</span>
          {fluideCriticeCount > 0 ? (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'stocuri' ? 'bg-black/25 text-white' : 'bg-roseash-100 text-terracotta-700 border border-roseash-300'
            }`}>
              {fluideCriticeCount} alertă
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'stocuri' ? 'bg-black/25 text-white' : 'bg-morning-200 text-slate-700'
            }`}>
              {stocUleiuri.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('istoric')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'istoric'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Istoric Intervenții</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'istoric' ? 'bg-black/25 text-white' : 'bg-morning-200 text-slate-700'
          }`}>
            {istoricCompletari.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'config'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Norme &amp; Configurare Intervale</span>
        </button>

        <button
          onClick={() => setActiveTab('anomalii')}
          className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'anomalii'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Alerte &amp; Scurgeri</span>
          {alerte.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-terracotta-600 text-white">
              {alerte.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: STATUS FLOTĂ & PROXIMĂ REVIZIE FLUIDE */}
      {/* ========================================================================= */}
      {activeTab === 'flota' && (
        <div className="space-y-4">
          {/* KPI INTERACTIVE STATUS FLOTĂ FLUIDE (UNIFICAT CU DOCUMENTE) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setFilterFlotaStatus('TOATE')}
              className={`pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-sapphire-500 text-left transition hover:shadow-md cursor-pointer ${
                filterFlotaStatus === 'TOATE' ? 'ring-1 ring-sapphire-400/50' : ''
              }`}
            >
              <div>
                <p className="text-[10px] uppercase font-black text-sapphire-700 tracking-wider">Norme Monitorizate</p>
                <p className="text-3xl font-black text-sapphire-900 font-mono tabular-nums mt-0.5">{flotaFluide.length}</p>
                <p className="text-[11px] text-sage-600 font-semibold">{flotaTotalVehiclesCount} utilaje active</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center text-sapphire-600 shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilterFlotaStatus(filterFlotaStatus === 'DEPASIT' ? 'TOATE' : 'DEPASIT')}
              className={`pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-terracotta-500 text-left transition hover:shadow-md cursor-pointer ${
                filterFlotaStatus === 'DEPASIT' ? 'ring-2 ring-terracotta-500' : ''
              }`}
            >
              <div>
                <p className="text-[10px] uppercase font-black text-terracotta-600 tracking-wider">Schimburi Depășite</p>
                <p className="text-3xl font-black text-terracotta-600 font-mono tabular-nums mt-0.5">{flotaDepasiteCount}</p>
                <p className="text-[11px] text-sage-600 font-semibold">necesită schimb imediat</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-roseash-100 border border-roseash-300 flex items-center justify-center text-terracotta-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilterFlotaStatus(filterFlotaStatus === 'AVERTIZARE' ? 'TOATE' : 'AVERTIZARE')}
              className={`pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-400 text-left transition hover:shadow-md cursor-pointer ${
                filterFlotaStatus === 'AVERTIZARE' ? 'ring-2 ring-amber-500' : ''
              }`}
            >
              <div>
                <p className="text-[10px] uppercase font-black text-amber-700 tracking-wider">Aproape de Limită</p>
                <p className="text-3xl font-black text-amber-700 font-mono tabular-nums mt-0.5">{flotaAvertCount}</p>
                <p className="text-[11px] text-sage-600 font-semibold">în prag de avertizare</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFilterFlotaStatus(filterFlotaStatus === 'OPTIM' ? 'TOATE' : 'OPTIM')}
              className={`pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500 text-left transition hover:shadow-md cursor-pointer ${
                filterFlotaStatus === 'OPTIM' ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              <div>
                <p className="text-[10px] uppercase font-black text-emerald-700 tracking-wider">În Parametri Optimi</p>
                <p className="text-3xl font-black text-emerald-800 font-mono tabular-nums mt-0.5">{flotaOptimeCount}</p>
                <p className="text-[11px] text-sage-600 font-semibold">
                  {flotaFluide.length > 0 ? `${Math.round((flotaOptimeCount / flotaFluide.length) * 100)}% din norme` : '0%'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </button>
          </div>

          {/* COMUTATOR VIZUALIZARE & PANOU FILTRE UNIFICAT (MATRICE ⟷ LISTĂ DETALIATĂ) */}
          <div className="pleasant-card rounded-2xl p-4 bg-white border border-morning-200 space-y-3.5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Switcher Tabel Matrice vs Listă Detaliată */}
              <div className="flex items-center flex-wrap gap-1.5 p-1 bg-morning-100 rounded-xl border border-morning-200 self-start">
                <button
                  type="button"
                  onClick={() => handleChangeFlotaViewMode('matrice')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    flotaViewMode === 'matrice'
                      ? 'bg-sapphire-500 text-white shadow-xs'
                      : 'text-sage-700 hover:text-sapphire-900 hover:bg-morning-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Tabel Matrice ({flotaMatrixVehicleCount} utilaje)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeFlotaViewMode('lista')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    flotaViewMode === 'lista'
                      ? 'bg-sapphire-500 text-white shadow-xs'
                      : 'text-sage-700 hover:text-sapphire-900 hover:bg-morning-200'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>Listă Detaliată ({flotaFluideFiltrate.length} norme)</span>
                </button>
              </div>

              {/* Acțiuni & Mod Coloane Matrice */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-sage-600">
                {flotaViewMode === 'matrice' && filterFlotaCategorie === 'TOATE' && filterFlotaTip === 'TOATE' && (
                  <div
                    className="inline-flex items-center p-0.5 bg-morning-100 rounded-lg border border-morning-200"
                    title="Comută între 5 coloane funcționale compacte sau toate tipurile exacte de ulei"
                  >
                    <button
                      type="button"
                      onClick={() => setFlotaMatrixColMode('GROUPED')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition cursor-pointer ${
                        flotaMatrixColMode === 'GROUPED'
                          ? 'bg-white text-sapphire-900 shadow-2xs'
                          : 'text-sage-600 hover:text-sapphire-900'
                      }`}
                    >
                      Coloane Grupate
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlotaMatrixColMode('EXACT')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition cursor-pointer ${
                        flotaMatrixColMode === 'EXACT'
                          ? 'bg-white text-sapphire-900 shadow-2xs'
                          : 'text-sage-600 hover:text-sapphire-900'
                      }`}
                    >
                      Toate Normele
                    </button>
                  </div>
                )}

                {hasActiveFlotaFilters && (
                  <button
                    type="button"
                    onClick={resetFlotaFilters}
                    className="text-xs font-bold text-terracotta-600 hover:underline flex items-center space-x-1 px-2 py-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resetează Filtrele</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('config')}
                  className="px-3 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-200 text-sapphire-900 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-sapphire-600" />
                  <span>Norme Categorii</span>
                </button>
              </div>
            </div>

            {/* Rând Căutare + Selector Normă & Contor */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2 border-t border-morning-200 items-center text-xs">
              <div className="md:col-span-2 relative">
                <Search className="w-3.5 h-3.5 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFlota}
                  onChange={(e) => setSearchFlota(e.target.value)}
                  placeholder="Caută utilaj, înmatriculare, marcă, categorie, ulei sau filtru..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-7 py-2 text-xs text-sapphire-900 font-bold focus:bg-white transition"
                />
                {searchFlota && (
                  <button
                    type="button"
                    onClick={() => setSearchFlota('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-sage-400 hover:text-sapphire-900 font-bold cursor-pointer"
                    aria-label="Șterge căutarea"
                  >
                    ✕
                  </button>
                )}
              </div>

              <FilterableSelect
                value={filterFlotaTip}
                onChange={(e) => setFilterFlotaTip(e.target.value)}
                searchPlaceholder="Caută normă (ulei, filtru)..."
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-xs font-bold text-sapphire-900 cursor-pointer"
              >
                <option value="TOATE">Normă: Toate Tipurile ({tipuriFluide.length})</option>
                {tipuriFluide.map((tf) => (
                  <option key={tf.cod} value={tf.cod}>{tf.nume}</option>
                ))}
              </FilterableSelect>

              <select
                value={filterFlotaUnit}
                onChange={(e) => setFilterFlotaUnit(e.target.value as any)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-xs font-bold text-sapphire-900 cursor-pointer"
              >
                <option value="TOATE">Contor: KM, mTH &amp; Luni</option>
                <option value="MTH">Doar Ore (mTH)</option>
                <option value="KM">Doar Kilometri (KM)</option>
                <option value="LUNI">Doar Calendaristic (Luni)</option>
              </select>
            </div>

            {/* Pilule Categorii Flotă (Click = filtrează instant + afișează coloanele exacte ale categoriei) */}
            {flotaCategorySummary.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-sage-500 uppercase tracking-wider">
                  Categorie Flotă
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterFlotaCategorie('TOATE')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none cursor-pointer ${
                      filterFlotaCategorie === 'TOATE'
                        ? 'bg-sapphire-600 text-white border-sapphire-600 shadow-xs'
                        : 'bg-white text-slate-600 border-morning-200 hover:border-morning-300 hover:bg-morning-50'
                    }`}
                  >
                    <span>Toate</span>
                    <span
                      className={`px-1.5 rounded-full text-[10px] font-black leading-4 ${
                        filterFlotaCategorie === 'TOATE'
                          ? 'bg-white/25 text-white'
                          : 'bg-morning-100 text-slate-500'
                      }`}
                    >
                      {flotaTotalVehiclesCount}
                    </span>
                  </button>

                  {flotaCategorySummary.map((item) => {
                    const catColor = getCategoryColor(item.cat);
                    const isActive = filterFlotaCategorie === item.cat;
                    return (
                      <button
                        key={item.cat}
                        type="button"
                        onClick={() =>
                          setFilterFlotaCategorie(isActive ? 'TOATE' : item.cat)
                        }
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none cursor-pointer ${
                          isActive ? catColor.chipActive : catColor.chipInactive
                        }`}
                      >
                        {item.overdue > 0 ? (
                          <span
                            className="w-2 h-2 rounded-full bg-terracotta-500 shrink-0"
                            title={`${item.overdue} depășite`}
                          />
                        ) : item.warn > 0 ? (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                            title={`${item.warn} în avertizare`}
                          />
                        ) : null}
                        <span>{item.cat.replace(/_/g, ' ')}</span>
                        <span
                          className={`px-1.5 rounded-full text-[10px] font-black leading-4 ${
                            isActive ? catColor.countActive : catColor.countInactive
                          }`}
                        >
                          {item.vehicleCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pilule Stare Schimburi */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-sage-500 uppercase tracking-wider">Stare Schimb</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'TOATE', label: 'Toate Stările', count: flotaFluide.length, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
                  { id: 'PROBLEME', label: 'Necesită Atenție', count: flotaDepasiteCount + flotaAvertCount, bg: 'bg-roseash-100', text: 'text-terracotta-800', border: 'border-roseash-300' },
                  { id: 'DEPASIT', label: 'Depășite', count: flotaDepasiteCount, bg: 'bg-roseash-100', text: 'text-terracotta-800', border: 'border-roseash-300' },
                  { id: 'AVERTIZARE', label: 'Aproape de Limită', count: flotaAvertCount, bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
                  { id: 'OPTIM', label: 'În Parametri Optimi', count: flotaOptimeCount, bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
                ].map((st) => {
                  const isActive = filterFlotaStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFilterFlotaStatus(st.id as any)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none cursor-pointer ${
                        isActive
                          ? `${st.bg} ${st.text} ${st.border} shadow-xs ring-1 ring-current`
                          : 'bg-white text-slate-600 border-morning-200 hover:border-morning-300 hover:bg-morning-50'
                      }`}
                    >
                      <span>{st.label}</span>
                      {st.count > 0 && (
                        <span className={`px-1.5 rounded-full text-[10px] font-black leading-4 ${isActive ? 'bg-white/50' : 'bg-morning-100 text-slate-500'}`}>
                          {st.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CONȚINUT PRINCIPAL TAB FLOTĂ */}
          {flotaFluide.length === 0 ? (
            <div className="pleasant-card p-10 text-center rounded-2xl border border-morning-200 space-y-2">
              <Sliders className="w-8 h-8 text-sapphire-500 mx-auto" />
              <p className="font-extrabold text-sapphire-900 text-sm">Nu există norme de schimb fluid configurate încă</p>
              <p className="text-xs text-sage-600">
                Accesați tab-ul <strong>Norme &amp; Configurare Intervale</strong> pentru a defini intervalele per categorie de utilaje (ex: 15.000 KM sau 500 mTH).
              </p>
            </div>
          ) : flotaViewMode === 'matrice' ? (
            /* ================================================================= */
            /* VIZUALIZARE 1: TABEL MATRICE FLOTĂ (STIL DOCUMENTE)               */
            /* ================================================================= */
            <FluidStatusMatrix
              flotaFluide={flotaFluide}
              tipuriFluide={tipuriFluide}
              tipLichidLabels={tipLichidLabels}
              searchQuery={searchFlota}
              filterStatus={filterFlotaStatus}
              filterTip={filterFlotaTip}
              filterCategorie={filterFlotaCategorie}
              filterUnit={filterFlotaUnit}
              columnMode={flotaMatrixColMode}
              onOpenCompletare={(opts) => handleOpenCompletare(opts)}
              onOpenBaseline={(row) => handleOpenVehicleBaseline(row)}
            />
          ) : (
            /* ================================================================= */
            /* VIZUALIZARE 2: LISTĂ DETALIATĂ NORME (PĂSTRATĂ + ANTET FIX)       */
            /* ================================================================= */
            <div className="pleasant-card rounded-2xl border border-morning-200 overflow-hidden shadow-xs">
              <div className="overflow-auto max-h-[calc(100vh-140px)] relative">
                <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[960px]">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-morning-100 text-sage-700 font-extrabold uppercase tracking-wider text-[10px]">
                      {([
                        { key: 'utilaj', label: 'Utilaj / Categorie', extraClass: '' },
                        { key: 'tip', label: 'Fluid / Consumabil', extraClass: '' },
                        { key: 'ultimulSchimb', label: 'Ultimul Schimb & Contor', extraClass: '' },
                        { key: 'progres', label: 'Progres Interval & Rămas', extraClass: 'min-w-[230px]' },
                      ] as const).map((col) => {
                        const isActive = flotaListSortCol === col.key;
                        return (
                          <th
                            key={col.key}
                            onClick={() => handleFlotaListSort(col.key)}
                            aria-sort={isActive ? (flotaListSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                            className={`p-3.5 sticky top-0 z-20 border-b cursor-pointer select-none transition group ${col.extraClass} ${
                              isActive
                                ? 'bg-sapphire-100 text-sapphire-950 border-b-2 border-b-sapphire-500 font-black'
                                : 'bg-morning-100 border-morning-200 hover:bg-morning-200 hover:text-sapphire-900'
                            }`}
                            title={`Sortează după ${col.label}`}
                          >
                            <div className="inline-flex items-center space-x-1.5">
                              <span>{col.label}</span>
                              {isActive ? (
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-sapphire-600 text-white shrink-0">
                                  {flotaListSortDir === 'asc' ? (
                                    <ArrowUp className="w-3 h-3" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3" />
                                  )}
                                </span>
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-sage-400 opacity-50 group-hover:opacity-100 transition shrink-0" />
                              )}
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 text-center">Status</th>
                      <th className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 text-right">Acțiuni Rapide</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200 text-slate-700">
                    {flotaFluideFiltrate.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-sage-600 italic">
                          Nicio înregistrare conform filtrelor selectate.
                        </td>
                      </tr>
                    ) : (
                      flotaFluideFiltrate.map((f: any) => {
                        const pct = Math.min(100, Math.max(0, Number(f.procentConsum || 0)));
                        const unit = f.unitateMasura || 'KM';
                        const isOver = Boolean(f.esteDepasit);
                        const isWarn = !isOver && Boolean(f.esteInPragAvertizare);
                        const isPieceNorm = Boolean(f.isConsumablePiece) || isConsumablePieceNorm(f.tipLichid);
                        const tipLabel = tipLichidLabels[f.tipLichid] || f.tipLichid?.replace(/_/g, ' ');
                        const opDefault = isPieceNorm
                          ? 'SCHIMB_FILTRU'
                          : String(f.tipLichid || '').includes('ANTIGEL')
                          ? 'SCHIMB_ANTIGEL'
                          : 'SCHIMB_ULEI';
                        const opTopUp = String(f.tipLichid || '').includes('ANTIGEL') ? 'COMPLETARE_ANTIGEL' : 'COMPLETARE_ULEI';
                        const catColor = getCategoryColor(f.vehiculCategorie);
                        const showPlate =
                          f.vehiculInmatriculare &&
                          String(f.vehiculInmatriculare).trim().toUpperCase() !==
                            String(f.vehiculNumarIntern || '').trim().toUpperCase();

                        return (
                          <tr
                            key={`${f.vehiculId}-${f.tipLichid}`}
                            className={`transition ${
                              isOver
                                ? 'bg-roseash-50/70 hover:bg-roseash-100/50'
                                : isWarn
                                ? 'bg-amber-50/60 hover:bg-amber-50'
                                : 'hover:bg-morning-50'
                            }`}
                          >
                            <td className="p-3 border-b border-morning-200">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-extrabold text-sapphire-900">
                                  {f.vehiculNumarIntern || f.vehiculInmatriculare}
                                </span>
                                {showPlate && (
                                  <span className="font-mono text-[11px] text-sage-600">
                                    ({f.vehiculInmatriculare})
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {f.vehiculCategorie && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${catColor.badge}`}>
                                    {f.vehiculCategorie}
                                  </span>
                                )}
                                {f.areContorDualMth && (
                                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold">
                                    Dual: {Number(f.valoareContorCurent || 0).toLocaleString('ro-RO')} KM · {Number(f.oreFunctionareCurent || 0).toLocaleString('ro-RO')} mTH
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3 border-b border-morning-200">
                              <span className="px-2.5 py-1 rounded-lg bg-sapphire-50 border border-sapphire-200 text-sapphire-800 font-bold text-[11px] inline-block">
                                {tipLabel}
                              </span>
                            </td>

                            <td className="p-3 border-b border-morning-200 font-mono text-[11px]">
                              {f.ultimulSchimbEstimat ? (
                                <>
                                  <div className="font-bold text-periwinkle-900">
                                    Estimat (50% din normă)
                                  </div>
                                  <div className="text-sage-600">
                                    {f.trackingMode === 'LUNI'
                                      ? `Fără schimb anterior · normă ${f.intervalLuni} luni`
                                      : `Contor curent: ${Number(f.currentContor ?? f.valoareContorCurent ?? 0).toLocaleString('ro-RO')} ${unit} · fără istoric`}
                                  </div>
                                </>
                              ) : (
                                <>
                                  {f.trackingMode === 'LUNI' ? (
                                    <div className="font-bold text-sapphire-900">
                                      Schimb: {new Date(f.ultimulSchimbData).toLocaleDateString('ro-RO')} ({f.intervalLuni} luni)
                                    </div>
                                  ) : (
                                    <div className="font-bold text-sapphire-900">
                                      {Number(f.ultimulSchimbContor || 0).toLocaleString('ro-RO')} → {Number(f.currentContor ?? f.valoareContorCurent ?? 0).toLocaleString('ro-RO')} {unit}
                                    </div>
                                  )}
                                  <div className="text-sage-600">
                                    Data: {new Date(f.ultimulSchimbData).toLocaleDateString('ro-RO')} ({f.luniTrecute} luni)
                                    {f.totalLitriCompletati > 0 ? ` · +${f.totalLitriCompletati}L completări` : ''}
                                  </div>
                                </>
                              )}
                            </td>

                            <td className="p-3 border-b border-morning-200 space-y-1">
                              <div className="flex items-center justify-between font-mono text-[11px]">
                                <span className="font-bold text-sapphire-900">
                                  {f.trackingMode === 'LUNI'
                                    ? `${f.luniTrecute} / ${f.intervalLuni || '—'} luni`
                                    : `${Number(f.rulajEfectiv || 0).toLocaleString('ro-RO')}${f.intervalPrincipal ? ` / ${Number(f.intervalPrincipal).toLocaleString('ro-RO')} ${unit}` : ` ${unit}`}`}
                                </span>
                                <span className={`font-extrabold ${isOver ? 'text-terracotta-700' : isWarn ? 'text-amber-700' : f.ultimulSchimbEstimat ? 'text-periwinkle-800' : 'text-emerald-700'}`}>
                                  {f.rulajRamas !== null
                                    ? f.rulajRamas <= 0
                                      ? `Depășit +${Math.abs(f.rulajRamas).toLocaleString('ro-RO')} ${unit}`
                                      : `Rămas ${Number(f.rulajRamas).toLocaleString('ro-RO')} ${unit}`
                                    : f.luniRamase !== null
                                    ? f.luniRamase <= 0
                                      ? `Depășit (${f.luniTrecute} luni)`
                                      : `Rămas ${Math.max(0, f.luniRamase).toFixed(1)} luni`
                                    : 'Monitorizat'}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-morning-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isOver ? 'bg-terracotta-600' : isWarn ? 'bg-amber-500' : f.ultimulSchimbEstimat ? 'bg-periwinkle-600' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.max(4, pct)}%` }}
                                />
                              </div>
                            </td>

                            <td className="p-3 border-b border-morning-200 text-center whitespace-nowrap">
                              <div className="inline-flex flex-col items-center gap-1">
                                {isOver ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-terracotta-600 text-white inline-flex items-center space-x-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>DEPĂȘIT</span>
                                  </span>
                                ) : isWarn ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>AVERTIZARE</span>
                                  </span>
                                ) : f.ultimulSchimbEstimat ? (
                                  <span
                                    className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-periwinkle-50 text-periwinkle-900 border border-dashed border-periwinkle-300 inline-flex items-center space-x-1"
                                    title="Fără dată de schimb în evidența anterioară — setat la 50% din interval până la primul schimb real"
                                  >
                                    <span>ESTIMAT 50%</span>
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>OPTIM</span>
                                  </span>
                                )}
                                {f.ultimulSchimbEstimat && (isOver || isWarn) && (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-periwinkle-50 text-periwinkle-900 border border-dashed border-periwinkle-300"
                                    title="Fără dată de schimb în evidența anterioară — rămâne activ până la primul schimb real"
                                  >
                                    FĂRĂ ISTORIC (EST.)
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3 border-b border-morning-200 text-right whitespace-nowrap">
                              <div className="inline-flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenVehicleBaseline(f)}
                                  title={f.areContorDualMth ? 'Actualizează orele mTH și/sau ultimul schimb' : 'Editează ultimul schimb (bază de pornire)'}
                                  className="px-2 py-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-800 font-bold text-[11px] transition inline-flex items-center space-x-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  {f.areContorDualMth && <span>mTH</span>}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenCompletare({
                                      vehiculId: f.vehiculId,
                                      tipLichid: f.tipLichid,
                                      tipOperatiune: opDefault,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-[11px] transition cursor-pointer"
                                >
                                  Schimb
                                </button>
                                {!isPieceNorm && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenCompletare({
                                        vehiculId: f.vehiculId,
                                        tipLichid: f.tipLichid,
                                        tipOperatiune: opTopUp,
                                      })
                                    }
                                    className="px-2.5 py-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 font-bold text-[11px] transition cursor-pointer"
                                  >
                                    + Completare
                                  </button>
                                )}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB ISTORIC: ISTORIC INTERVENȚII & COMPLETĂRI FLUIDE */}
      {/* ========================================================================= */}
      {activeTab === 'istoric' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm border border-morning-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-morning-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-sapphire-600" />
                <span>Jurnal Intervenții — Fluide &amp; Filtre ({istoricCompletariFiltrat.length} / {istoricCompletari.length})</span>
              </h3>
              <p className="text-xs text-sage-600 font-medium mt-0.5">
                Evidența cronologică a schimburilor de ulei/filtre și completărilor (inclusiv intervențiile sincronizate automat din Comenzi de Lucru).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCompletare()}
              className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold flex items-center space-x-1.5 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Înregistrează Intervenție</span>
            </button>
          </div>

          {/* KPI rezumat filtrat */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => { setFilterIstoricOperatiune('TOATE'); setIstoricPage(1); }}
              className={`p-3 rounded-xl border text-left transition ${
                filterIstoricOperatiune === 'TOATE'
                  ? 'bg-sapphire-50 border-sapphire-300 ring-1 ring-sapphire-400'
                  : 'bg-morning-50 border-morning-200 hover:bg-morning-100'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-sage-600">Total Intervenții</div>
              <div className="text-lg font-black text-sapphire-900 font-mono mt-0.5">{istoricCompletariFiltrat.length}</div>
            </button>
            <button
              type="button"
              onClick={() => { setFilterIstoricOperatiune('SCHIMB'); setIstoricPage(1); }}
              className={`p-3 rounded-xl border text-left transition ${
                filterIstoricOperatiune === 'SCHIMB'
                  ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                  : 'bg-morning-50 border-morning-200 hover:bg-morning-100'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Schimburi Complete</div>
              <div className="text-lg font-black text-emerald-800 font-mono mt-0.5">{istoricKpi.schimburi}</div>
            </button>
            <button
              type="button"
              onClick={() => { setFilterIstoricOperatiune('COMPLETARE'); setIstoricPage(1); }}
              className={`p-3 rounded-xl border text-left transition ${
                filterIstoricOperatiune === 'COMPLETARE'
                  ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400'
                  : 'bg-morning-50 border-morning-200 hover:bg-morning-100'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Completări (Top-up)</div>
              <div className="text-lg font-black text-amber-800 font-mono mt-0.5">{istoricKpi.completari}</div>
            </button>
            <div className="p-3 rounded-xl border bg-morning-50 border-morning-200 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sage-600">Volum Fluide / Piese</div>
              <div className="text-lg font-black text-sapphire-900 font-mono mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span>{istoricKpi.volumTotal.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} L</span>
                {istoricKpi.pieseBuc > 0 && (
                  <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                    · {istoricKpi.pieseBuc.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} buc
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bară căutare și filtre avansate */}
          <div className="p-3.5 bg-morning-100 rounded-2xl border border-morning-200 text-xs space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={searchIstoric}
                  onChange={(e) => { setSearchIstoric(e.target.value); setIstoricPage(1); }}
                  placeholder="Caută vehicul, ulei, filtru, observații, mecanic, CL-XXXXX..."
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-morning-300 text-sapphire-900 font-medium focus:outline-none focus:border-sapphire-500"
                />
              </div>

              <FilterableSelect
                value={filterIstoricVehicul}
                onChange={(e) => { setFilterIstoricVehicul(e.target.value); setIstoricPage(1); }}
                searchPlaceholder="Caută utilaj / vehicul..."
                className="px-3 py-2 bg-white rounded-xl border border-morning-300 font-bold text-sapphire-900"
              >
                <option value="TOATE">Utilaj: Toate ({istoricVehiculeOptiuni.length})</option>
                {istoricVehiculeOptiuni.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </FilterableSelect>

              <FilterableSelect
                value={filterIstoricTip}
                onChange={(e) => { setFilterIstoricTip(e.target.value); setIstoricPage(1); }}
                searchPlaceholder="Caută normă..."
                className="px-3 py-2 bg-white rounded-xl border border-morning-300 font-bold text-sapphire-900"
              >
                <option value="TOATE">Normă: Toate Tipurile</option>
                {tipuriFluide.map((tf) => (
                  <option key={tf.cod} value={tf.cod}>{tf.nume}</option>
                ))}
              </FilterableSelect>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center">
              <select
                value={filterIstoricOperatiune}
                onChange={(e) => { setFilterIstoricOperatiune(e.target.value as any); setIstoricPage(1); }}
                className="px-3 py-2 bg-white rounded-xl border border-morning-300 font-bold text-sapphire-900"
              >
                <option value="TOATE">Operațiune: Toate</option>
                <option value="SCHIMB">Doar Schimburi (Revizie)</option>
                <option value="COMPLETARE">Doar Completări (Top-up)</option>
              </select>

              <FilterableSelect
                value={filterIstoricMecanic}
                onChange={(e) => { setFilterIstoricMecanic(e.target.value); setIstoricPage(1); }}
                searchPlaceholder="Caută mecanic / sursă..."
                className="px-3 py-2 bg-white rounded-xl border border-morning-300 font-bold text-sapphire-900"
              >
                <option value="TOATE">Mecanic / Sursă: Toți</option>
                {istoricMecaniciOptiuni.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </FilterableSelect>

              <input
                type="date"
                value={filterIstoricDateFrom}
                onChange={(e) => { setFilterIstoricDateFrom(e.target.value); setIstoricPage(1); }}
                title="De la data"
                className="px-3 py-2 bg-white rounded-xl border border-morning-300 font-mono text-sapphire-900"
              />

              <input
                type="date"
                value={filterIstoricDateTo}
                onChange={(e) => { setFilterIstoricDateTo(e.target.value); setIstoricPage(1); }}
                title="Până la data"
                className="px-3 py-2 bg-white rounded-xl border border-morning-300 font-mono text-sapphire-900"
              />

              {hasIstoricFilters ? (
                <button
                  type="button"
                  onClick={resetIstoricFilters}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-roseash-100 border border-morning-300 text-terracotta-700 font-bold transition"
                >
                  Resetează filtrele
                </button>
              ) : (
                <div className="text-[11px] text-sage-600 font-semibold text-right px-1">
                  Toate înregistrările încărcate
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-morning-200">
            <table className="w-full text-left border-collapse text-xs min-w-[1120px]">
              <thead>
                <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Dată</th>
                  <th className="p-3">Utilaj</th>
                  <th className="p-3">Operațiune &amp; Normă</th>
                  <th className="p-3">Articol / Sortiment</th>
                  <th className="p-3">Observații</th>
                  <th className="p-3 text-right">Cantitate</th>
                  <th className="p-3 text-right">Cost FIFO</th>
                  <th className="p-3 text-right">Contor</th>
                  <th className="p-3">Mecanic &amp; Sursă</th>
                  <th className="p-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200 text-slate-700">
                {istoricPaginat.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-sage-600 italic">
                      Nu există intervenții înregistrate conform filtrelor.
                    </td>
                  </tr>
                ) : (
                  istoricPaginat.map((c: any) => {
                    const isPieceRow = isConsumablePieceNorm(c.tipLichid) || c.tipOperatiune === 'SCHIMB_FILTRU';
                    const isSchimb = isPieceRow || String(c.tipOperatiune || '').toUpperCase().includes('SCHIMB');
                    const qtyUm = getNormUnitMeasure(c.tipLichid, c.articolStoc?.unitateMasura);
                    const unit = c.unitateContor || c.vehicul?.tipMasurare || 'KM';
                    return (
                      <tr key={c.id} className="hover:bg-morning-50 transition">
                        <td className="p-3 font-mono whitespace-nowrap">
                          {new Date(c.dataCompletare).toLocaleDateString('ro-RO')}
                        </td>
                        <td className="p-3">
                          <div className="font-extrabold text-sapphire-900">{c.vehicul?.numarIntern || '—'}</div>
                          <div className="text-[10px] text-sage-600">{c.vehicul?.numarInmatriculare}</div>
                        </td>
                        <td className="p-3 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPieceRow
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700'
                                : isSchimb
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}>
                              {isPieceRow ? 'SCHIMB FILTRU' : isSchimb ? 'SCHIMB COMPLET' : 'COMPLETARE'}
                            </span>
                            {c.alertaScurgereGenerata && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-roseash-100 text-terracotta-700 border border-roseash-300">
                                Scurgere
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-bold text-sapphire-800">
                            {tipLichidLabels[c.tipLichid] || c.tipLichid?.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-sapphire-900">{c.articolStoc?.denumire || c.marcaUlei || '—'}</div>
                        </td>
                        <td className="p-3 max-w-[260px]">
                          {c.observatii ? (
                            <div className="text-[11px] text-slate-700 leading-snug break-words">{c.observatii}</div>
                          ) : (
                            <span className="text-[11px] text-sage-500 italic">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sapphire-900 whitespace-nowrap">
                          {Number(c.cantitateLitri || 0).toLocaleString('ro-RO', { maximumFractionDigits: 2 })} {qtyUm}
                        </td>
                        <td className="p-3 text-right font-mono whitespace-nowrap">
                          <div className="font-extrabold text-sapphire-900">
                            {Number(c.costTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                          </div>
                          <div className="text-[10px] text-sage-600">
                            {Number(c.pretPerLitru || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON/{qtyUm}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono whitespace-nowrap">
                          {Number(c.valoareContor || 0) > 0 ? `${Number(c.valoareContor).toLocaleString('ro-RO')} ${unit}` : '—'}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-sapphire-900">{c.mecanic}</div>
                          {c.comandaNumar ? (
                            <a
                              href="/comenzi-lucru"
                              className="inline-flex items-center space-x-1 text-[10px] font-bold text-sapphire-700 bg-sapphire-50 border border-sapphire-200 px-1.5 py-0.5 rounded mt-0.5 hover:underline"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              <span>{c.comandaNumar}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-sage-600">Înregistrare Directă</span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {!c.comandaLucruId ? (
                            <button
                              type="button"
                              onClick={() => handleStergeCompletare(c)}
                              title="Anulează și restituie volumul în stoc"
                              className="p-1.5 rounded-lg bg-morning-100 hover:bg-roseash-100 text-sage-600 hover:text-terracotta-700 border border-morning-200 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-sage-500 italic">Din Comandă</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginare */}
          {istoricCompletariFiltrat.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center space-x-2 text-sage-700 font-semibold">
                <span>
                  Afișate{' '}
                  <strong className="text-sapphire-900 font-mono">
                    {(istoricSafePage - 1) * istoricPageSize + 1}–{Math.min(istoricSafePage * istoricPageSize, istoricCompletariFiltrat.length)}
                  </strong>{' '}
                  din <strong className="text-sapphire-900 font-mono">{istoricCompletariFiltrat.length}</strong>
                </span>
                <select
                  value={istoricPageSize}
                  onChange={(e) => { setIstoricPageSize(Number(e.target.value)); setIstoricPage(1); }}
                  className="px-2 py-1 bg-white rounded-lg border border-morning-300 font-bold text-sapphire-900"
                >
                  <option value={25}>25 / pagină</option>
                  <option value={50}>50 / pagină</option>
                  <option value={100}>100 / pagină</option>
                  <option value={200}>200 / pagină</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  disabled={istoricSafePage <= 1}
                  onClick={() => setIstoricPage(1)}
                  className="px-2.5 py-1.5 rounded-lg border border-morning-300 bg-white text-sapphire-900 font-bold disabled:opacity-40 hover:bg-morning-100 transition"
                >
                  « Prima
                </button>
                <button
                  type="button"
                  disabled={istoricSafePage <= 1}
                  onClick={() => setIstoricPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-morning-300 bg-white text-sapphire-900 font-bold disabled:opacity-40 hover:bg-morning-100 transition"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 rounded-lg bg-morning-100 border border-morning-200 font-mono font-extrabold text-sapphire-900">
                  {istoricSafePage} / {istoricTotalPages}
                </span>
                <button
                  type="button"
                  disabled={istoricSafePage >= istoricTotalPages}
                  onClick={() => setIstoricPage((p) => Math.min(istoricTotalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-morning-300 bg-white text-sapphire-900 font-bold disabled:opacity-40 hover:bg-morning-100 transition"
                >
                  Următor
                </button>
                <button
                  type="button"
                  disabled={istoricSafePage >= istoricTotalPages}
                  onClick={() => setIstoricPage(istoricTotalPages)}
                  className="px-2.5 py-1.5 rounded-lg border border-morning-300 bg-white text-sapphire-900 font-bold disabled:opacity-40 hover:bg-morning-100 transition"
                >
                  Ultima »
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: STOCURI & CATEGORII FLUIDE */}
      {/* ========================================================================= */}
      {activeTab === 'stocuri' && (
        <div className="space-y-6">
          {/* 1. STATISTICI RAPIDE KPI STOC FLUIDE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Volum */}
            <div className="pleasant-card p-5 rounded-2xl border border-morning-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sage-600 uppercase tracking-wider">Total Volum Fluide</span>
                <div className="p-2.5 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <Droplets className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-sapphire-900 font-mono">
                  {totalVolumFluide.toLocaleString('ro-RO', { maximumFractionDigits: 1 })}
                </span>
                <span className="text-xs font-bold text-sage-600 uppercase">Litri / Unități</span>
              </div>
              <p className="text-[11px] text-sage-500 font-medium">Stoc fizic cumulat în toate depozitele flotei</p>
            </div>

            {/* Card 2: Valoare Totală Inventar */}
            <div className="pleasant-card p-5 rounded-2xl border border-morning-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sage-600 uppercase tracking-wider">Valoare Inventar Fluide</span>
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-800 font-mono">
                  {totalValoareFluide.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-emerald-700 uppercase font-mono">RON</span>
              </div>
              <p className="text-[11px] text-sage-500 font-medium">Valoare de achiziție calculată FIFO</p>
            </div>

            {/* Card 3: Alerte Sub Stoc Minim */}
            <div className={`pleasant-card p-5 rounded-2xl border shadow-2xs space-y-2 ${
              fluideCriticeCount > 0 ? 'bg-roseash-50/70 border-roseash-300 ring-1 ring-terracotta-300' : 'border-morning-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  fluideCriticeCount > 0 ? 'text-terracotta-700 font-extrabold' : 'text-sage-600'
                }`}>
                  Alerte Sub Limita Minimă
                </span>
                <div className={`p-2.5 rounded-xl ${
                  fluideCriticeCount > 0 ? 'bg-roseash-200 text-terracotta-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {fluideCriticeCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className={`text-2xl font-black font-mono ${
                  fluideCriticeCount > 0 ? 'text-terracotta-700' : 'text-emerald-700'
                }`}>
                  {fluideCriticeCount}
                </span>
                <span className="text-xs font-bold uppercase text-sage-600">Articole sub prag</span>
              </div>
              <p className={`text-[11px] font-medium ${
                fluideCriticeCount > 0 ? 'text-terracotta-700 font-bold' : 'text-sage-500'
              }`}>
                {fluideCriticeCount > 0 ? 'Aprovizionare urgentă recomandată!' : 'Toate stocurile de fluide sunt optime'}
              </p>
            </div>

            {/* Card 4: Categorii & Subtipuri Active */}
            <div className="pleasant-card p-5 rounded-2xl border border-morning-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sage-600 uppercase tracking-wider">Categorii & Subtipuri</span>
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-purple-900 font-mono">
                  {categoriiFluide.length}
                </span>
                <span className="text-xs font-bold text-sage-600 uppercase">
                  categorii / {totalSubcategoriiFluide} subtipuri
                </span>
              </div>
              <p className="text-[11px] text-sage-500 font-medium">Clasificare tehnică dedicată doar fluidelor</p>
            </div>
          </div>

          {/* 2. TABEL CENTRALIZAT STOCURI FLUIDE & NOTIFICARE STOC MINIM */}
          <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm border border-morning-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-morning-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                  <Droplets className="w-5 h-5 text-sapphire-600" />
                  <span>Stocuri Curente de Fluide & Praguri Minime de Notificare</span>
                </h3>
                <p className="text-xs text-sage-600 font-medium mt-0.5">
                  Evidență clară a cantităților din depozit și ajustarea valorii minime sub care sistemul emite alertă
                </p>
              </div>

              <button
                onClick={() => handleOpenCompletare()}
                className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1.5 shrink-0 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Înregistrează Ieșire / Completare</span>
              </button>
            </div>

            {/* BARA DE FILTRARE & CĂUTARE */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-morning-100 rounded-2xl border border-morning-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  placeholder="Caută fluid după denumire, marcă (Mobil, Castrol), cod articol, subcategorie..."
                  value={searchStoc}
                  onChange={(e) => setSearchStoc(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-medium text-sapphire-900 focus:outline-none focus:border-sapphire-500 shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filtru Depozit */}
                <FilterableSelect
                  value={selectedDepozitStoc}
                  onChange={(e) => setSelectedDepozitStoc(e.target.value)}
                  searchPlaceholder="Caută depozit..."
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="">Toate Depozitele</option>
                  {depoziteList.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </FilterableSelect>

                {/* Filtru Categorie Fluid */}
                <FilterableSelect
                  value={selectedCategorieStoc}
                  onChange={(e) => setSelectedCategorieStoc(e.target.value)}
                  searchPlaceholder="Caută categorie..."
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="">Toate Categoriile de Fluide</option>
                  {categoriiFluide.map((c: any) => (
                    <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                  ))}
                </FilterableSelect>

                {/* Filtru Tip Lubrifiant / Normă */}
                <FilterableSelect
                  value={selectedTipFluidStoc}
                  onChange={(e) => setSelectedTipFluidStoc(e.target.value)}
                  searchPlaceholder="Caută normă..."
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="">Toate Tipurile (Norme)</option>
                  {tipuriFluide.map((tf) => (
                    <option key={tf.cod} value={tf.cod}>{tf.nume}</option>
                  ))}
                </FilterableSelect>

                {/* Filtru Stare Alertă */}
                <select
                  value={selectedStatusStoc}
                  onChange={(e) => setSelectedStatusStoc(e.target.value as any)}
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="TOATE">Toate Stările</option>
                  <option value="CRITIC">Doar Alerte (Sub Stoc Minim)</option>
                  <option value="OPTIM">Doar Stoc Optim</option>
                </select>
              </div>
            </div>

            {/* TABEL STOCURI FLUIDE */}
            <div className="overflow-x-auto rounded-2xl border border-morning-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider text-[10px]">
                    {([
                      { key: 'denumire', label: 'Articol Fluid & Marcă', align: 'left' },
                      { key: 'categorie', label: 'Categorie & Subtip', align: 'left' },
                      { key: 'depozit', label: 'Depozit Gestiune', align: 'left' },
                      { key: 'stocCurent', label: 'Stoc Curent', align: 'right' },
                      { key: 'stocMinim', label: 'Prag Alertă (Minim)', align: 'right' },
                      { key: 'stare', label: 'Stare Stoc', align: 'center' },
                    ] as const).map((col) => {
                      const isActive = stocSortCol === col.key;
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                            ? 'text-center'
                            : 'text-left';
                      return (
                        <th
                          key={col.key}
                          onClick={() => handleStocSort(col.key)}
                          aria-sort={isActive ? (stocSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          title={`Sortează după ${col.label}`}
                          className={`p-3 cursor-pointer select-none transition group ${alignClass} ${
                            isActive
                              ? 'bg-sapphire-100 text-sapphire-950 border-b-2 border-b-sapphire-500 font-black'
                              : 'hover:bg-morning-200 hover:text-sapphire-900'
                          }`}
                        >
                          <div className="inline-flex items-center space-x-1.5">
                            <span>{col.label}</span>
                            {isActive ? (
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-sapphire-600 text-white shrink-0">
                                {stocSortDir === 'asc' ? (
                                  <ArrowUp className="w-3 h-3" />
                                ) : (
                                  <ArrowDown className="w-3 h-3" />
                                )}
                              </span>
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-sage-400 opacity-60 group-hover:opacity-100 group-hover:text-sapphire-600 transition shrink-0" />
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="p-3 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                  {stocUleiuriFiltrate.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-sage-500 italic">
                        Niciun articol de fluid sau lubrifiant găsit conform filtrelor aplicate.
                      </td>
                    </tr>
                  ) : (
                    stocUleiuriFiltrate.map((s: any) => {
                      const stocNum = Number(s.stocCurent) || 0;
                      const minimNum = Number(s.stocMinim) || 0;
                      const esteCritic = minimNum > 0 && stocNum < minimNum;
                      const esteEpuizat = minimNum > 0 && stocNum <= 0;
                      const lipsa = Math.max(0, minimNum - stocNum);
                      const unitate = s.unitateMasura || 'L';

                      return (
                        <tr
                          key={s.id}
                          className={`transition ${
                            esteCritic
                              ? 'bg-roseash-50/50 hover:bg-roseash-50 dark:!bg-rose-950/20'
                              : 'hover:bg-morning-50'
                          }`}
                        >
                          {/* 1. Articol & Cod */}
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-sapphire-900 text-xs">{s.denumire}</span>
                                {s.marcaUlei && (
                                  <span className="px-2 py-0.2 rounded-md bg-morning-200 text-sapphire-800 text-[10px] font-bold">
                                    {s.marcaUlei}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-sage-500 font-mono">Cod: {s.codArticol}</p>
                            </div>
                          </td>

                          {/* 2. Categorie & Subcategorie + Normă Asociată */}
                          <td className="p-3">
                            {(() => {
                              const effTip = resolveEffectiveTipLichid(s, subcatTipMap);
                              const tipLabel = effTip.cod ? getTipFluidLabel(effTip.cod, tipuriFluide) : null;
                              return (
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStockTip(s)}
                                    title="Click pentru a edita categoria, subcategoria sau a scoate articolul din Fluide"
                                    className="flex flex-wrap items-center gap-1 text-left group cursor-pointer"
                                  >
                                    <span className="px-2 py-0.5 rounded-lg bg-sapphire-100 text-sapphire-900 font-bold text-[10px] group-hover:bg-sapphire-200 transition">
                                      {s.categorie}
                                    </span>
                                    {s.subcategorie && (
                                      <span className="text-[11px] text-sage-600 font-medium group-hover:text-sapphire-800 transition">
                                        ▸ {s.subcategorie}
                                      </span>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditStockTip(s)}
                                    title="Click pentru a asocia normă, schimba categoria sau scoate articolul din Fluide"
                                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer border ${
                                      effTip.source === 'ARTICOL'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                        : effTip.source === 'SUBCATEGORIE'
                                        ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                        : 'bg-morning-100 text-sage-700 border-dashed border-morning-300 hover:border-sapphire-400'
                                    }`}
                                  >
                                    <Link2 className="w-2.5 h-2.5 shrink-0" />
                                    <span>
                                      {tipLabel
                                        ? `${tipLabel}${effTip.source === 'AUTO' ? ' (Auto)' : ''}`
                                        : 'Asociază normă'}
                                    </span>
                                    <Edit3 className="w-2.5 h-2.5 opacity-60" />
                                  </button>
                                </div>
                              );
                            })()}
                          </td>

                          {/* 3. Depozit */}
                          <td className="p-3 font-semibold text-slate-800">
                            {s.depozit?.nume || 'Depozit Central'}
                          </td>

                          {/* 4. Stoc Curent */}
                          <td className="p-3 text-right">
                            <div className="space-y-1 inline-block text-right">
                              <span
                                className={`font-mono font-black text-sm ${
                                  esteEpuizat
                                    ? 'text-terracotta-700'
                                    : esteCritic
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {stocNum.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} {unitate}
                              </span>
                              <div className="w-24 h-1.5 bg-morning-200 rounded-full overflow-hidden ml-auto">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    esteEpuizat ? 'bg-terracotta-600' : esteCritic ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(10, (stocNum / Math.max(1, minimNum * 2)) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 5. Prag Alertă Stoc Minim */}
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAlert(s)}
                              title="Click pentru a modifica valoarea minimă de alertă"
                              className="group inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-morning-200/80 transition cursor-pointer"
                            >
                              <span className="font-mono font-bold text-sapphire-900 text-xs group-hover:text-sapphire-700">
                                {minimNum.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} {unitate}
                              </span>
                              <Edit3 className="w-3.5 h-3.5 text-sage-400 group-hover:text-sapphire-600 transition" />
                            </button>
                          </td>

                          {/* 6. Stare Alertă */}
                          <td className="p-3 text-center">
                            {esteEpuizat ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-terracotta-600 text-white">
                                <AlertTriangle className="w-3 h-3 mr-0.5" />
                                <span>EPUIZAT (0 {unitate})</span>
                              </span>
                            ) : esteCritic ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-roseash-200 text-terracotta-800 border border-roseash-300">
                                <AlertTriangle className="w-3 h-3 mr-0.5 text-terracotta-600" />
                                <span>SUB MINIM (+{lipsa} {unitate})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-600" />
                                <span>OPTIM</span>
                              </span>
                            )}
                          </td>

                          {/* 7. Acțiuni */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleOpenFifoLoturi(s)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition flex items-center space-x-1 border border-emerald-200 cursor-pointer"
                                title="Vizualizează loturile FIFO de achiziție"
                              >
                                <Layers className="w-3 h-3 text-emerald-600" />
                                <span>Loturi FIFO</span>
                              </button>

                              <button
                                onClick={() => handleOpenCompletare({ articol: s })}
                                className="px-2.5 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-[11px] shadow-xs transition flex items-center space-x-1 cursor-pointer"
                                title="Înregistrează ieșire / consum fluid din acest articol"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Ieșire</span>
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

          {/* 3. GESTIUNE CATEGORII PRINCIPALE & SUBTIPURI SPECIFICE DE FLUIDE */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-morning-200 shadow-xs">
              <div>
                <h3 className="font-extrabold text-sapphire-900 text-base flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-periwinkle-700" />
                  <span>Categorii Principale & Subtipuri Specifice de Fluide</span>
                </h3>
                <p className="text-xs text-sage-600 font-medium mt-0.5">
                  Definiți categoriile și subtipurile dedicate gestiunii lubrifianților, uleiurilor și fluidelor tehnice
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={openAddCat}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Categorie Fluid Nouă</span>
                </button>

                <button
                  onClick={() => openAddSubcat()}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-morning-200 hover:bg-morning-300 text-sapphire-900 text-xs font-bold shadow-xs transition"
                >
                  <Layers className="w-4 h-4 text-periwinkle-700" />
                  <span>+ Subtip / Subcategorie</span>
                </button>
              </div>
            </div>

            {/* GRID CARDURI CATEGORII FLUIDE (STILUL EXACT DIN SCREENSHOT-UL UTILIZATORULUI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoriiFluide.map((c: any) => (
                <div
                  key={c.id || c.nume}
                  className="pleasant-card p-5 rounded-2xl border border-morning-200 space-y-3 shadow-2xs hover:shadow-xs transition bg-white"
                >
                  <div className="flex items-center justify-between border-b border-morning-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-sapphire-50 text-sapphire-700 rounded-lg">
                        <Layers className="w-5 h-5 text-periwinkle-700" />
                      </div>
                      <h4 className="font-extrabold text-sapphire-900 text-base">{c.nume}</h4>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => openEditCat(c)}
                        title="Editare Categorie Fluid"
                        className="p-1.5 text-sage-600 hover:text-sapphire-600 hover:bg-sapphire-50 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFluidCategorie(c.id, c.nume)}
                        title="Ștergere Categorie Fluid"
                        className="p-1.5 text-terracotta-600 hover:text-terracotta-700 hover:bg-roseash-100 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-sage-700">{c.descriere || 'Fără descriere adițională.'}</p>

                  <div className="pt-2 border-t border-morning-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-extrabold text-sage-700 uppercase tracking-wider">
                        SUBCATEGORII INCLUSE ({c.subcategorii?.length || 0}):
                      </p>
                      <button
                        onClick={() => openAddSubcat(c.nume)}
                        className="text-[11px] font-extrabold text-sapphire-600 hover:text-sapphire-800 hover:bg-sapphire-50 px-2.5 py-1 rounded-lg border border-sapphire-200 transition flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adaugă Subcategorie</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {c.subcategorii && c.subcategorii.length > 0 ? (
                        c.subcategorii.map((sc: any) => (
                          <div
                            key={sc.id || sc.nume}
                            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-morning-100 border border-morning-200 text-[11px] font-bold text-sapphire-900 shadow-2xs group hover:border-sapphire-300 transition"
                            title={sc.descriere || sc.nume}
                          >
                            <span>{sc.nume}</span>
                            {sc.tipLichid && (
                              <span className="px-1.5 py-0.2 rounded bg-sapphire-100 text-sapphire-800 border border-sapphire-200 text-[9px] font-extrabold">
                                → {getTipFluidLabel(sc.tipLichid, tipuriFluide)}
                              </span>
                            )}
                            <button
                              onClick={() => openEditSubcat(sc, c.nume)}
                              title="Editare Subcategorie"
                              className="p-0.5 text-sage-400 hover:text-sapphire-600 hover:bg-white rounded transition"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteFluidSubcategorie(sc.id, sc.nume)}
                              title="Ștergere Subcategorie"
                              className="p-0.5 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 rounded transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-sage-500 italic">Niciun subtip definit</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NORME & CONFIGURARE INTERVALE PE CATEGORII (UI/UX REDESIGN) */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* HEADER PRINCIPAL CU STATISTICI RAPIDE */}
          <div className="pleasant-card rounded-2xl p-6 border border-morning-200 bg-white space-y-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="p-2.5 rounded-xl bg-sapphire-100 text-sapphire-700">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-sapphire-900 tracking-tight">
                      Configurare Norme & Intervale pe Categorii de Utilaje
                    </h2>
                    <p className="text-xs text-sage-600 font-medium">
                      Normele definite aici se propagă automat pe toate utilajele din categoria respectivă, adaptând contorul (KM pentru rutier, mTH pentru utilaje).
                    </p>
                  </div>
                </div>
              </div>

              {/* BUTOANE ACȚIUNE HEADER */}
              <div className="flex items-center flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={openAddTipFluid}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tip Normă Nouă</span>
                </button>

                <button
                  type="button"
                  onClick={() => setArataToateNormeleCategoriilor(!arataToateNormeleCategoriilor)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 border cursor-pointer ${
                    arataToateNormeleCategoriilor
                      ? 'bg-sapphire-600 text-white border-sapphire-700 shadow-sm'
                      : 'bg-morning-100 hover:bg-morning-200 text-sapphire-900 border-morning-300'
                  }`}
                >
                  <Layers className="w-4 h-4 text-periwinkle-700" />
                  <span>{arataToateNormeleCategoriilor ? 'Focalizare pe Categoria Selectată' : 'Centralizator Toată Flota'}</span>
                </button>

                {selectedCatObj && !arataToateNormeleCategoriilor && (
                  <button
                    type="button"
                    onClick={() => handleOpenModalNorma(selectedCatObj.nume, tipuriFluide[0]?.cod || 'ULEI_MOTOR_15W40')}
                    className="px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Configurează Normă Nouă</span>
                  </button>
                )}
              </div>
            </div>

            {/* FILTRE GRUPURI & NAVIGATOR CATEGORII FLOTĂ */}
            <div className="pt-3 border-t border-morning-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold">
                  <span className="text-sage-500 uppercase tracking-wider text-[11px] mr-1">Filtru Grup:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupFilter('TOATE')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      selectedGroupFilter === 'TOATE'
                        ? 'bg-sapphire-900 text-white shadow-2xs font-extrabold'
                        : 'bg-morning-100 text-slate-700 hover:bg-morning-200 font-semibold'
                    }`}
                  >
                    Toate Active ({categoriiNormeList.filter((c: any) => c.totalVehicule > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupFilter('MTH')}
                    className={`px-3 py-1 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                      selectedGroupFilter === 'MTH'
                        ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                        : 'bg-morning-100 text-slate-700 hover:bg-morning-200 font-semibold'
                    }`}
                  >
                    <Tractor className="w-3.5 h-3.5" />
                    <span>Utilaje Șantier (mTH)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupFilter('KM')}
                    className={`px-3 py-1 rounded-lg transition flex items-center space-x-1.5 cursor-pointer ${
                      selectedGroupFilter === 'KM'
                        ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                        : 'bg-morning-100 text-slate-700 hover:bg-morning-200 font-semibold'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Transport Rutier (KM)</span>
                  </button>
                </div>

                <span className="text-[11px] text-sage-500 font-medium">
                  Faceți click pe o categorie pentru a vizualiza și edita normele
                </span>
              </div>

              {/* GRID CARDURI CATEGORII SELECTABILE */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {categoriiNormeList
                  .filter((cat: any) => {
                    const isKm = (cat.tipMasurareImplicit || 'KM').toUpperCase() === 'KM';
                    if (selectedGroupFilter === 'MTH' && isKm) return false;
                    if (selectedGroupFilter === 'KM' && !isKm) return false;
                    // Afișăm doar categoriile active sau dacă este selectată
                    return cat.totalVehicule > 0 || cat.nume === selectedCatEnum;
                  })
                  .map((cat: any) => {
                    const isSelected = selectedCatObj?.nume === cat.nume;
                    const isKm = (cat.tipMasurareImplicit || 'KM').toUpperCase() === 'KM';
                    const numarNorme = (cat.norme || []).length;

                    return (
                      <button
                        key={cat.id || cat.nume}
                        type="button"
                        onClick={() => {
                          setSelectedCatEnum(cat.nume);
                          if (arataToateNormeleCategoriilor) setArataToateNormeleCategoriilor(false);
                        }}
                        className={`p-3 rounded-2xl text-left transition flex flex-col justify-between border cursor-pointer ${
                          isSelected
                            ? 'bg-sapphire-900 text-white border-sapphire-900 shadow-md ring-2 ring-sapphire-400/50 scale-[1.02]'
                            : 'bg-morning-50/70 hover:bg-white text-slate-800 border-morning-200 hover:border-sapphire-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`p-1.5 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/10 text-white' : 'bg-morning-200/80 text-sapphire-800'}`}>
                            <CategoryIcon catName={cat.nume} className="w-4 h-4" />
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                              cat.areContorDualMth
                                ? isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                                : isSelected
                                ? isKm ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                                : isKm ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {cat.areContorDualMth ? 'KM+mTH' : isKm ? 'KM' : 'mTH'}
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <p className={`font-black text-xs truncate ${isSelected ? 'text-white' : 'text-sapphire-900'}`}>
                            {cat.nume.replace(/_/g, ' ')}
                          </p>
                          <div className="flex items-center justify-between text-[11px] mt-1">
                            <span className={isSelected ? 'text-sapphire-200' : 'text-sage-600'}>
                              {cat.totalVehicule} utilaje
                            </span>
                            <span
                              className={`font-bold ${
                                numarNorme > 0
                                  ? isSelected ? 'text-emerald-300' : 'text-emerald-700'
                                  : isSelected ? 'text-slate-300' : 'text-slate-400'
                              }`}
                            >
                              {numarNorme > 0 ? `${numarNorme} active` : 'Fără norme (0)'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* VEDERE 1: MATRICE TOATĂ FLOTA */}
          {arataToateNormeleCategoriilor ? (
            <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm bg-white border border-morning-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-morning-200 gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                    <Database className="w-5 h-5 text-sapphire-600" />
                    <span>Centralizator Matrice Norme Flotă (Toate Categoriile)</span>
                  </h3>
                  <p className="text-xs text-sage-600 font-medium">
                    Toate intervalele normate configurate manual pe categorii de vehicule și utilaje
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-sage-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Caută categorie sau fluid..."
                      value={searchNorme}
                      onChange={(e) => setSearchNorme(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-morning-100 border border-morning-200 rounded-xl text-xs text-sapphire-900 font-medium focus:outline-none focus:border-sapphire-500 w-56"
                    />
                  </div>
                </div>
              </div>

              {/* Tabel complet */}
              <div className="overflow-x-auto">
                {(() => {
                  const allNorms = categoriiNormeList.flatMap((c: any) =>
                    (c.norme || []).map((n: any) => ({
                      ...n,
                      categorieNume: c.nume,
                      categorieTipMasurare: c.tipMasurareImplicit,
                      totalVehicule: c.totalVehicule,
                    }))
                  ).filter((n: any) => {
                    if (!searchNorme.trim()) return true;
                    const query = searchNorme.toLowerCase();
                    const cat = (n.categorieNume || '').toLowerCase();
                    const fluid = (tipLichidLabels[n.tipLichid] || n.tipLichid || '').toLowerCase();
                    return cat.includes(query) || fluid.includes(query);
                  });

                  if (allNorms.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-3 bg-morning-50/50 rounded-2xl border border-dashed border-morning-200">
                        <Sliders className="w-8 h-8 text-sage-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">
                          {searchNorme ? 'Nicio normă nu corespunde căutării.' : 'Nu există încă nicio normă configurată pe categorii.'}
                        </p>
                        <p className="text-[11px] text-sage-500 max-w-sm mx-auto">
                          Alegeți o categorie din panoul de sus și configurați primul interval de schimb.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                        <tr>
                          <th className="p-3">Categorie Utilaj</th>
                          <th className="p-3">Contor</th>
                          <th className="p-3">Fluid / Filtru (Normă)</th>
                          <th className="p-3 font-mono">Interval Normat</th>
                          <th className="p-3 font-mono">Marjă Avertizare</th>
                          <th className="p-3">Utilaje Afectate</th>
                          <th className="p-3 text-right">Acțiuni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-200">
                        {allNorms.map((norma: any) => {
                          const mode = getNormTrackingMode(norma, norma.categorieTipMasurare);
                          const fluidLabel = tipLichidLabels[norma.tipLichid] || norma.tipLichid?.replace(/_/g, ' ');

                          return (
                            <tr key={norma.id} className="hover:bg-morning-50 transition">
                              <td className="p-3 font-bold text-sapphire-900">
                                <div className="flex items-center space-x-2">
                                  <span className="p-1 rounded-md bg-morning-100 text-sapphire-700 flex items-center justify-center">
                                    <CategoryIcon catName={norma.categorieNume} className="w-3.5 h-3.5" />
                                  </span>
                                  <span>{norma.categorieNume?.replace(/_/g, ' ')}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    mode === 'KM'
                                      ? 'bg-blue-100 text-blue-800'
                                      : mode === 'MTH'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {mode === 'KM' ? 'KM' : mode === 'MTH' ? 'mTH' : 'LUNI'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-extrabold text-sapphire-900 block">
                                  {fluidLabel}
                                </span>
                                <span className="text-[10px] font-mono text-sage-500">
                                  {norma.tipLichid}
                                </span>
                              </td>
                              <td className="p-3 font-mono font-bold text-sapphire-800">
                                <div>
                                  {mode === 'KM'
                                    ? `${norma.intervalKm ? Number(norma.intervalKm).toLocaleString('ro-RO') : '—'} KM`
                                    : mode === 'MTH'
                                    ? `${norma.intervalMth ? Number(norma.intervalMth).toLocaleString('ro-RO') : '—'} mTH`
                                    : `${norma.intervalLuni ? Number(norma.intervalLuni) : '—'} luni`}
                                </div>
                                {mode !== 'LUNI' && norma.intervalLuni && (
                                  <div className="text-[10px] font-medium text-sage-600">
                                    sau maxim {norma.intervalLuni} luni
                                  </div>
                                )}
                              </td>
                              <td className="p-3 font-mono font-semibold text-terracotta-700">
                                <div>
                                  {mode === 'KM'
                                    ? `${norma.pragAvertizareKm ? Number(norma.pragAvertizareKm).toLocaleString('ro-RO') : '1.000'} KM`
                                    : mode === 'MTH'
                                    ? `${norma.pragAvertizareMth ? Number(norma.pragAvertizareMth).toLocaleString('ro-RO') : '50'} mTH`
                                    : `${norma.pragAvertizareLuni || 1} luni`}
                                </div>
                                {mode !== 'LUNI' && norma.pragAvertizareLuni && (
                                  <div className="text-[10px] font-medium text-sage-600">
                                    cu {norma.pragAvertizareLuni} lună înainte
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                                  {norma.totalVehicule || 0} utilaje
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenModalNorma(norma.categorieNume, norma.tipLichid)}
                                    title="Modifică norma"
                                    className="p-1.5 rounded-lg text-sage-600 hover:text-sapphire-600 hover:bg-white border border-transparent hover:border-morning-200 transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStergeConfigCategorie(norma.id, norma.tipLichid)}
                                    title="Șterge această normă"
                                    className="p-1.5 rounded-lg text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
          ) : (
            /* VEDERE 2: WORKSPACE PENTRU CATEGORIA SELECTATĂ (GRID CARDURI DE FLUIDE) */
            selectedCatObj && (
              <div className="space-y-4">
                {/* BANNER SPOTLIGHT CATEGORIE */}
                <div className="p-4 rounded-2xl bg-white border border-morning-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="p-3 rounded-xl bg-sapphire-50 border border-sapphire-100 text-sapphire-700 flex items-center justify-center shadow-2xs">
                      <CategoryIcon catName={selectedCatObj.nume} className="w-6 h-6" />
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-sapphire-900 tracking-tight">
                          {selectedCatObj.nume.replace(/_/g, ' ')}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${
                            selectedCatObj.areContorDualMth
                              ? 'bg-emerald-100 text-emerald-800'
                              : isCatKm
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {selectedCatObj.areContorDualMth
                            ? 'Contor Dual: KM (Pompă) + mTH (Manual)'
                            : `Contor: ${isCatKm ? 'Kilometri (KM)' : 'Ore Funcționare (mTH)'}`}
                        </span>
                      </div>
                      <p className="text-xs text-sage-600 font-medium mt-0.5">
                        {selectedCatObj.totalVehicule} utilaje active în flotă • {selectedCatObj.descriere || 'Gestiune norme și mentenanță preventivă'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center bg-morning-100 p-0.5 rounded-xl border border-morning-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setFiltreazaDoarNormeActive(false)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                          !filtreazaDoarNormeActive
                            ? 'bg-white text-sapphire-900 shadow-2xs'
                            : 'text-sage-600 hover:text-sapphire-900'
                        }`}
                      >
                        Toate ({tipuriFluide.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFiltreazaDoarNormeActive(true)}
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center space-x-1 ${
                          filtreazaDoarNormeActive
                            ? 'bg-white text-sapphire-900 shadow-2xs'
                            : 'text-sage-600 hover:text-sapphire-900'
                        }`}
                      >
                        <span>Doar Active</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold font-mono">
                          {selectedCatObj.norme?.length || 0}
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenModalNorma(selectedCatObj.nume, tipuriFluide[0]?.cod || 'ULEI_MOTOR_15W40')}
                      className="px-3.5 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Configurează Normă</span>
                    </button>
                  </div>
                </div>

                {/* GRID CARDURI INTERACTIVE PENTRU TOATE FLUIDELE DIN CATEGORIE */}
                {(() => {
                  const fluidsToDisplay = tipuriFluide.filter((fluid) => {
                    if (!filtreazaDoarNormeActive) return true;
                    return (selectedCatObj.norme || []).some((n: any) => n.tipLichid === fluid.cod);
                  });

                  if (fluidsToDisplay.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-3.5 bg-morning-50/70 rounded-2xl border-2 border-dashed border-morning-200 p-8">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-morning-200 flex items-center justify-center mx-auto text-sage-400 shadow-2xs">
                          <Droplets className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-sapphire-900">
                            Nicio normă activă pe categoria &quot;{selectedCatObj.nume.replace(/_/g, ' ')}&quot;
                          </h4>
                          <p className="text-xs text-sage-600 max-w-md mx-auto leading-relaxed">
                            Utilajele din această categorie (ex. stații concasoare electrice, benzi de agregate sau semiremorci fără motor) nu necesită schimburi de ulei și nu vor genera alerte sau depășiri în matricea flotei.
                          </p>
                        </div>
                        <div className="pt-2 flex items-center justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setFiltreazaDoarNormeActive(false)}
                            className="px-4 py-2 rounded-xl bg-white hover:bg-morning-100 text-sapphire-900 font-bold text-xs border border-morning-200 shadow-2xs transition cursor-pointer"
                          >
                            Afișează toate cele {tipuriFluide.length} tipuri
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenModalNorma(selectedCatObj.nume, tipuriFluide[0]?.cod || 'ULEI_MOTOR')}
                            className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adaugă o normă</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {fluidsToDisplay.map((fluid) => {
                        const existingNorm = (selectedCatObj.norme || []).find((n: any) => n.tipLichid === fluid.cod);
                        const isCustom = !!existingNorm;
                        const accentCls = getAccentClasses(fluid.accentColor);

                        return (
                          <div
                            key={fluid.cod}
                            className={`pleasant-card rounded-2xl p-5 border transition flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-sm ${
                              isCustom
                                ? 'bg-white border-sapphire-300 ring-1 ring-sapphire-100'
                                : 'bg-morning-50/50 border-morning-200 hover:border-morning-300 opacity-90 hover:opacity-100'
                            }`}
                          >
                            {/* ANTET CARD FLUID */}
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div
                                    className={`p-2 rounded-xl shrink-0 ${
                                      isCustom ? accentCls.iconBg : 'bg-morning-200 text-sage-500'
                                    }`}
                                  >
                                    {isConsumablePieceNorm(fluid.cod) ? (
                                      <Wind className="w-4 h-4" />
                                    ) : (
                                      <Droplets className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className={`font-extrabold text-sm truncate ${isCustom ? 'text-sapphire-900' : 'text-sage-700'}`}>
                                      {fluid.nume}
                                    </h4>
                                    <span className="text-[10px] font-mono text-sage-500 uppercase block truncate">{fluid.cod}</span>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openEditTipFluid(fluid)}
                                    title="Editează definiția tipului de lubrifiant (nume, descriere, presetări)"
                                    className="p-1 rounded-lg text-sage-400 hover:text-sapphire-700 hover:bg-morning-200 transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {!fluid.esteStandard && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTipFluid(fluid)}
                                      title="Șterge acest tip personalizat de lubrifiant"
                                      className="p-1 rounded-lg text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                      isCustom
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-morning-200 text-sage-600 border border-morning-300'
                                    }`}
                                  >
                                    {isCustom ? 'Normă Activă' : 'Fără Normă'}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-sage-600 line-clamp-2 leading-relaxed">
                                {fluid.descriere || 'Tip de lubrifiant disponibil și la recepția în stoc.'}
                              </p>
                            </div>

                            {/* METRICI CARD */}
                            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                              isCustom ? 'bg-morning-50/70 border-morning-200' : 'bg-white border-morning-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-sage-600">Interval Schimb:</span>
                                <div className="text-right">
                                  {isCustom ? (() => {
                                    const mode = getNormTrackingMode(existingNorm, selectedCatObj.tipMasurareImplicit);
                                    return (
                                      <>
                                        <span className="font-mono font-black text-sm text-sapphire-900 block">
                                          {mode === 'KM'
                                            ? `${Number(existingNorm.intervalKm).toLocaleString('ro-RO')} KM`
                                            : mode === 'MTH'
                                            ? `${Number(existingNorm.intervalMth).toLocaleString('ro-RO')} mTH`
                                            : `${Number(existingNorm.intervalLuni)} luni (Calendar)`}
                                        </span>
                                        <span className="text-[10px] font-medium text-sage-500">
                                          {mode !== 'LUNI'
                                            ? (existingNorm.intervalLuni ? `sau maxim ${existingNorm.intervalLuni} luni` : 'fără limită timp')
                                            : 'monitorizare periodică calendaristică'}
                                        </span>
                                      </>
                                    );
                                  })() : (
                                    <>
                                      <span className="font-mono font-bold text-xs text-sage-400 block">
                                        Fără schimb programat
                                      </span>
                                      <span className="text-[10px] text-sage-400">
                                        Nu se aplică pe această categorie
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 border-t border-morning-200/80 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-sage-600">Prag Avertizare:</span>
                                <span className={`font-mono text-xs ${isCustom ? 'font-bold text-terracotta-700' : 'text-sage-400'}`}>
                                  {isCustom ? (() => {
                                    const mode = getNormTrackingMode(existingNorm, selectedCatObj.tipMasurareImplicit);
                                    return mode === 'KM'
                                      ? `cu ${Number(existingNorm.pragAvertizareKm || 1000).toLocaleString('ro-RO')} KM înainte`
                                      : mode === 'MTH'
                                      ? `cu ${Number(existingNorm.pragAvertizareMth || 50).toLocaleString('ro-RO')} mTH înainte`
                                      : `cu ${Number(existingNorm.pragAvertizareLuni || 1)} lună înainte`;
                                  })() : (
                                    'Dezactivat (Fără alerte)'
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* ACȚIUNI CARD */}
                            <div className="pt-2 border-t border-morning-200 flex items-center justify-between">
                              <span className="text-[11px] text-sage-500 font-semibold">
                                {selectedCatObj.totalVehicule} utilaje
                              </span>

                                <div className="flex items-center space-x-1.5">
                                  {isCustom ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleStergeConfigCategorie(existingNorm.id, fluid.cod, selectedCatObj.nume)}
                                        title="Șterge / Dezactivează această normă (nu se va mai cere schimbul)"
                                        className="p-1.5 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 rounded-lg transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenModalNorma(selectedCatObj.nume, fluid.cod)}
                                        className="px-3 py-1.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 font-bold text-xs border border-sapphire-200 transition flex items-center space-x-1 cursor-pointer"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Editează</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenModalNorma(selectedCatObj.nume, fluid.cod)}
                                      className="px-3 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Activează Normă</span>
                                    </button>
                                  )}
                                </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 3: DETECȚIE ANOMALII & SCURGERI */}
      {activeTab === 'anomalii' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-morning-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-terracotta-500" />
                <span>Centralizator Alerte Norme (Fluide &amp; Filtre) &amp; Scurgeri</span>
              </h2>
              <p className="text-xs text-sage-600 font-medium">
                Algoritmul monitorizează depășirile de intervale pentru uleiuri, fluide, filtre și completările anormale pe termen scurt
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
                        {a.categorieText || ' Alertă Activă'}
                      </span>
                      <span className="font-extrabold text-sapphire-900 text-sm"> {a.vehiculNumar || 'Utilaj'}</span>
                      <span className="text-xs text-slate-700 font-bold">• {a.titlu}</span>
                    </div>
                    <p className="text-xs text-terracotta-700 font-bold">{a.mesaj}</p>
                    <p className="text-[11px] text-sage-600 font-mono">
                      {a.modCalcul || (a.dataReferinta ? `Data referință: ${new Date(a.dataReferinta).toLocaleDateString('ro-RO')}` : '')}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleOpenCompletare({
                          vehiculId: a.vehiculId,
                          tipLichid: a.tipLichid,
                          tipOperatiune:
                            isConsumablePieceNorm(a.tipLichid)
                              ? 'SCHIMB_FILTRU'
                              : a.categorieAlert === 'SCHIMB_ULEI'
                              ? 'SCHIMB_ULEI'
                              : 'COMPLETARE_ULEI',
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1"
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>{a.categorieAlert === 'SCHIMB_ULEI' ? 'Înregistrează Schimb' : 'Înregistrează Intervenție'}</span>
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
                  {isIesirePiece ? <Wind className="w-5 h-5" /> : <Droplets className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">
                    {isIesirePiece ? 'Înregistrare Schimb Filtru / Consumabil' : 'Înregistrare Intervenție Fluid'}
                  </h3>
                  <p className="text-[11px] text-sage-600 font-medium">
                    {isIesirePiece
                      ? 'Înlocuire piesă din stoc (buc) & resetare automată normă'
                      : 'Completare nivel sau schimb complet — scădere automată din stoc'}
                  </p>
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
              {(() => {
                const activeNormForModal = statusSchimburi.find((s: any) => s.tipLichid === iesireTipLichid);
                if (!activeNormForModal) return null;
                const unitLabel = activeNormForModal.unitateMasura || 'KM';
                return (
                  <div
                    className={`p-3 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-2 ${
                      activeNormForModal.esteDepasit
                        ? 'bg-roseash-100 border-roseash-300 text-terracotta-700'
                        : activeNormForModal.esteInPragAvertizare
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-morning-100 border-morning-200 text-sapphire-900'
                    }`}
                  >
                    <div>
                      <span className="font-extrabold">Normă {tipLichidLabels[iesireTipLichid] || iesireTipLichid}:</span>{' '}
                      {activeNormForModal.ultimulSchimbEstimat ? (
                        <span className="font-semibold text-periwinkle-900">
                          Estimat la 50% (fără istoric real — se va confirma automat la salvarea acestui schimb)
                        </span>
                      ) : (
                        <span>
                          Ultimul schimb la{' '}
                          <strong className="font-mono">
                            {Number(activeNormForModal.ultimulSchimbContor || 0).toLocaleString('ro-RO')} {unitLabel}
                          </strong>{' '}
                          ({new Date(activeNormForModal.ultimulSchimbData).toLocaleDateString('ro-RO')})
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-black">
                      Rulaj curent: {Number(activeNormForModal.rulajEfectiv || 0).toLocaleString('ro-RO')}
                      {activeNormForModal.intervalPrincipal
                        ? ` / ${Number(activeNormForModal.intervalPrincipal).toLocaleString('ro-RO')} ${unitLabel}`
                        : ` ${unitLabel}`}
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. DATA INTERVENȚIEI — PRIMA ÎN FORMULAR */}
                <div>
                  <label className="text-sage-700 block mb-1 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sapphire-600" />
                    Data Intervenției: *
                  </label>
                  <input
                    type="date"
                    required
                    value={iesireData}
                    onChange={(e) => setIesireData(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>

                {/* 2. UTILAJ DESTINAȚIE — CU FILTRU ACTIV (SEARCHABLE COMBOBOX) */}
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Utilaj Destinație: *</label>
                  <SearchableCombobox
                    required
                    value={selectedVehiculId}
                    onChange={(val) => setSelectedVehiculId(val)}
                    placeholder="Caută nr. intern / înmatriculare (ex: SYI, WBT, LIB004)..."
                    emptyText="Niciun utilaj găsit."
                    options={vehicule
                      .slice()
                      .sort((a, b) =>
                        String(a.numarIntern || '').localeCompare(String(b.numarIntern || ''), 'ro', { numeric: true })
                      )
                      .map((v): ComboboxOption => ({
                        value: v.id,
                        label: v.numarIntern || v.numarInmatriculare,
                        sublabel: [
                          v.numarInmatriculare && v.numarInmatriculare !== v.numarIntern ? v.numarInmatriculare : '',
                          v.marca,
                          v.model,
                        ]
                          .filter(Boolean)
                          .join(' • '),
                        badge: v.categorieEnum || undefined,
                        badgeTone: 'sapphire',
                        keywords: `${v.numarIntern || ''} ${v.numarInmatriculare || ''} ${v.marca || ''} ${v.model || ''} ${v.categorieEnum || ''}`,
                      }))}
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Operațiune:</label>
                  <select
                    value={isIesirePiece ? 'SCHIMB_FILTRU' : iesireOperatiune}
                    onChange={(e) => setIesireOperatiune(e.target.value)}
                    disabled={isIesirePiece}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold disabled:opacity-80"
                  >
                    {isIesirePiece ? (
                      <option value="SCHIMB_FILTRU">Înlocuire / Schimb Complet (&amp; Resetare Contor)</option>
                    ) : (
                      <>
                        <option value="COMPLETARE_ULEI">Completare Nivel (Top-up)</option>
                        <option value="SCHIMB_ULEI">Schimb Complet (Înlocuire &amp; Resetare Contor)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Normă (Fluid / Filtru):</label>
                  <FilterableSelect
                    value={iesireTipLichid}
                    onChange={(e) => {
                      const nextTip = e.target.value;
                      const nextIsPiece = isConsumablePieceNorm(nextTip);
                      setIesireTipLichid(nextTip);
                      setArataToateFluidele(false);
                      if (nextIsPiece) {
                        setIesireOperatiune('SCHIMB_FILTRU');
                        setIesireCantitate(1);
                      } else if (iesireOperatiune === 'SCHIMB_FILTRU') {
                        setIesireOperatiune('SCHIMB_ULEI');
                        setIesireCantitate(5);
                      }
                    }}
                    searchPlaceholder="Caută normă (ulei, filtru)..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {tipuriFluide.map((tf) => (
                      <option key={tf.cod} value={tf.cod}>{tf.nume}</option>
                    ))}
                  </FilterableSelect>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sage-700 font-bold">
                      {isIesirePiece ? 'Articol Filtru / Piesă din Stoc:' : 'Articol Fluid / Ulei din Stoc:'}
                    </label>
                    {articoleStocFiltrate.length > 0 && !arataToateFluidele && !faraDeducereStoc && (
                      <span className="text-[10px] text-sapphire-700 font-bold bg-sapphire-100 px-1.5 py-0.5 rounded">
                        {articoleStocFiltrate.length} {articoleStocFiltrate.length === 1 ? 'articol' : 'articole'}
                      </span>
                    )}
                  </div>
                  <FilterableSelect
                    disabled={faraDeducereStoc}
                    value={selectedArticolStocId}
                    onChange={(e) => {
                      setSelectedArticolStocId(e.target.value);
                      const item = stocSursaModal.find((s: any) => s.id === e.target.value);
                      if (item) setIesireMarca(item.marcaUlei || item.denumire);
                    }}
                    searchPlaceholder="Caută articol din stoc..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold disabled:opacity-45"
                  >
                    {articoleStocFiltrate.length === 0 ? (
                      <option value="">
                        Niciun articol disponibil în stoc pentru această normă
                      </option>
                    ) : (
                      articoleStocFiltrate.map((s: any) => {
                        const rowUm = s.unitateMasura || (isIesirePiece ? 'buc' : 'L');
                        return (
                          <option key={s.id} value={s.id}>
                            {s.denumire} {s.depozit?.nume ? `[${s.depozit.nume}]` : ''} • Stoc: {s.stocCurent} {rowUm} • {s.pretUnitar} RON/{rowUm}
                          </option>
                        );
                      })
                    )}
                  </FilterableSelect>

                  {articoleStocFiltrate.length === 0 && !faraDeducereStoc && (
                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between gap-2">
                      <span>Nu există în stoc articole asociate pentru <strong>{tipLichidLabels[iesireTipLichid] || iesireTipLichid}</strong>.</span>
                      <button
                        type="button"
                        onClick={() => setArataToateFluidele(true)}
                        className="text-sapphire-700 underline font-bold whitespace-nowrap hover:text-sapphire-900"
                      >
                        Afișează toate
                      </button>
                    </div>
                  )}

                  {arataToateFluidele && !faraDeducereStoc && (
                    <div className="mt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setArataToateFluidele(false)}
                        className="text-[11px] text-sapphire-600 underline hover:text-sapphire-800"
                      >
                        ← Filtrează strict după {tipLichidLabels[iesireTipLichid] || 'norma selectată'}
                      </button>
                    </div>
                  )}

                  <label className="mt-1.5 inline-flex items-center space-x-1.5 text-[11px] text-sage-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={faraDeducereStoc}
                      onChange={(e) => setFaraDeducereStoc(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-sapphire-600"
                    />
                    <span>Fără deducere din depozit (ex: achiziție externă)</span>
                  </label>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">
                    {isIesirePiece ? 'Cantitate (buc): *' : 'Cantitate (Litri): *'}
                  </label>
                  <input
                    type="number"
                    min={isIesirePiece ? '1' : '0.5'}
                    step={isIesirePiece ? '1' : '0.5'}
                    required
                    value={iesireCantitate}
                    onChange={(e) => setIesireCantitate(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(isIesirePiece ? [1, 2, 3, 4] : [1, 2, 5, 10, 20, 30]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setIesireCantitate(v)}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold transition ${
                          Number(iesireCantitate) === v
                            ? 'bg-sapphire-600 text-white border-sapphire-700'
                            : 'bg-morning-100 hover:bg-morning-200 text-sapphire-900 border-morning-300'
                        }`}
                      >
                        {v} {isIesirePiece ? 'buc' : 'L'}
                      </button>
                    ))}
                  </div>
                </div>

                {!faraDeducereStoc && (
                  <div className="md:col-span-2 p-2.5 bg-sapphire-50 border border-sapphire-200 rounded-xl text-[11px] text-sapphire-900 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-sapphire-600 shrink-0" />
                    <span>
                      <b>Consum Automat FIFO:</b> Cantitatea va fi dedusă automat din cele mai vechi loturi din depozit, cu validare strictă de stoc disponibil.
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sage-700 font-bold">Index Contor Utilaj (opțional):</label>
                    {currentVehicul?.areContorDualMth ? (
                      <div className="inline-flex rounded-lg border border-morning-300 overflow-hidden text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setIesireUnitateContor('MTH');
                            setIesireContor(Number(currentVehicul.oreFunctionareCurent || 0));
                          }}
                          className={`px-2 py-0.5 ${iesireUnitateContor === 'MTH' ? 'bg-amber-500 text-white' : 'bg-morning-100 text-sage-700'}`}
                        >
                          mTH
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIesireUnitateContor('KM');
                            setIesireContor(Number(currentVehicul.valoareContorCurent || 0));
                          }}
                          className={`px-2 py-0.5 ${iesireUnitateContor === 'KM' ? 'bg-blue-600 text-white' : 'bg-morning-100 text-sage-700'}`}
                        >
                          KM
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sapphire-100 text-sapphire-700 font-mono">
                        {iesireUnitateContor}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={iesireContor}
                    onChange={(e) => setIesireContor(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Mecanic / Responsabil: *</label>
                  <FilterableSelect
                    value={iesireMecanic}
                    onChange={(e) => setIesireMecanic(e.target.value)}
                    searchPlaceholder="Caută mecanic..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {mecaniciList.map((m: any) => (
                      <option key={m.id} value={m.nume}>
                         {m.nume} ({m.functie || 'Mecanic'})
                      </option>
                    ))}
                  </FilterableSelect>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Notițe Atelier:</label>
                <input
                  value={iesireObservatii}
                  onChange={(e) => setIesireObservatii(e.target.value)}
                  placeholder="ex: Schimb complet ulei motor + verificare etanșeitate"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  disabled={isSubmittingIesire}
                  onClick={() => setShowCompletareModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIesire}
                  className="px-6 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 disabled:opacity-50 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  {isSubmittingIesire
                    ? 'Se salvează...'
                    : faraDeducereStoc
                    ? 'Salvează Intervenția'
                    : 'Salvează & Scade din Stoc (FIFO)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL 1: AJUSTARE PRAG ALERTĂ STOC MINIM */}
      {/* ========================================================================= */}
      {editingAlertArticol && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl border border-morning-200">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-sapphire-900">Configurare Prag Alertă Stoc Minim</h3>
                  <p className="text-xs text-sage-600 font-medium">Notificare automată la scădere stoc</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAlertArticol(null)}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePragAlert} className="space-y-4 text-xs">
              <div className="p-3 bg-morning-100/70 border border-morning-200 rounded-xl space-y-1">
                <p className="font-extrabold text-sapphire-900 text-xs">{editingAlertArticol.denumire}</p>
                <div className="flex items-center justify-between text-[11px] text-sage-600">
                  <span>Cod: <strong className="font-mono text-sapphire-800">{editingAlertArticol.codArticol}</strong></span>
                  <span>Stoc Curent: <strong className="font-mono text-emerald-700">{editingAlertArticol.stocCurent} {editingAlertArticol.unitateMasura || 'L'}</strong></span>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">
                  Prag Minim de Alertă ({editingAlertArticol.unitateMasura || 'L'}): *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={newPragAlert}
                  onChange={(e) => setNewPragAlert(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="ex: 50"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold text-sm focus:outline-none focus:border-sapphire-500"
                />
                <p className="text-[11px] text-sage-500 mt-1">
                  Când cantitatea disponibilă în depozit scade sub acest nivel, sistemul va marca automat articolul ca <strong>Stoc Critic</strong> și va genera alertă în dashboard.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setEditingAlertArticol(null)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSavingAlert}
                  className="px-5 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20 disabled:opacity-50"
                >
                  {isSavingAlert ? 'Se salvează...' : 'Salvează Pragul de Alertă'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREARE / EDITARE CATEGORIE FLUID */}
      {/* ========================================================================= */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl border border-morning-200">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <Droplets className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-sapphire-900">
                  {editingCat ? `Editare Categorie (${editingCat.nume})` : 'Creează Categorie Nouă de Fluid'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAddCatModal(false); setEditingCat(null); }}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFluidCategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Categorie Fluid: *</label>
                <input
                  required
                  value={catNume}
                  onChange={(e) => setCatNume(e.target.value)}
                  placeholder="ex: Ulei Motor, Ulei Hidraulic, Antigel, AdBlue"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>


              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Categorie Fluid:</label>
                <input
                  value={catDescriere}
                  onChange={(e) => setCatDescriere(e.target.value)}
                  placeholder="ex: Ulei motor mineral și sintetic pentru camioane grele"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => { setShowAddCatModal(false); setEditingCat(null); }}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  {editingCat ? 'Salvează Modificările' : 'Creează Categorie Fluid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREARE / EDITARE SUBCATEGORIE FLUID */}
      {/* ========================================================================= */}
      {showAddSubcatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-periwinkle-100 text-periwinkle-700">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-sapphire-900">
                  {editingSubcat ? `Editare Subtip (${editingSubcat.nume})` : 'Adaugă Subtip / Subcategorie Fluid'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAddSubcatModal(false); setEditingSubcat(null); }}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFluidSubcategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Categoria de Fluid: *</label>
                <FilterableSelect
                  value={targetCatForSubcat}
                  onChange={(e) => setTargetCatForSubcat(e.target.value)}
                  searchPlaceholder="Caută categorie..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {categoriiFluide.map((c) => (
                    <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                  ))}
                </FilterableSelect>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Subtip Fluid: *</label>
                <input
                  required
                  value={subcatNume}
                  onChange={(e) => setSubcatNume(e.target.value)}
                  placeholder="ex: 10W-40 Low-SAPS, HLP 46, G12+ Roz, Vaselină EP2"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere / Specificație (opțional):</label>
                <input
                  value={subcatDescriere}
                  onChange={(e) => setSubcatDescriere(e.target.value)}
                  placeholder="ex: Recomandat pentru camioane Euro 6"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">
                  Tip Lubrifiant / Normă Asociată (legătură directă cu reviziile):
                </label>
                <FilterableSelect
                  value={subcatTipLichid}
                  onChange={(e) => setSubcatTipLichid(e.target.value)}
                  searchPlaceholder="Caută normă..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="">-- Fără asociere implicită (detecție automată) --</option>
                  {tipuriFluide.map((tf) => (
                    <option key={tf.cod} value={tf.cod}>
                      {tf.nume} ({tf.cod})
                    </option>
                  ))}
                </FilterableSelect>
                <p className="text-[11px] text-sage-500 mt-1">
                  Orice articol importat din e-Factura în acest subtip va moșteni automat norma selectată.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => { setShowAddSubcatModal(false); setEditingSubcat(null); }}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  {editingSubcat ? 'Salvează Modificările' : 'Salvează Subtip Fluid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TRASABILITATE LOTURI FIFO */}
      {/* ========================================================================= */}
      {viewingFifoArticol && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-4xl space-y-4 shadow-2xl max-h-[90vh] flex flex-col bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-morning-200">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Layers className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">
                    Trasabilitate Loturi de Intrare (FIFO) — {viewingFifoArticol.denumire}
                  </h3>
                  <p className="text-xs text-sage-600 font-medium mt-0.5">
                    Depozit: <strong>{viewingFifoArticol.depozit?.nume || 'Depozit Central'}</strong> | Categorie: <strong>{viewingFifoArticol.categorie}</strong> {viewingFifoArticol.subcategorie && <span>▸ <strong>{viewingFifoArticol.subcategorie}</strong></span>} | Stoc Total: <strong className="text-emerald-700 font-mono">{viewingFifoArticol.stocCurent} {viewingFifoArticol.unitateMasura || 'L'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingFifoArticol(null)}
                className="p-1.5 rounded-lg text-sage-500 hover:text-sapphire-900 hover:bg-morning-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner explicativ FIFO */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Regula FIFO (First-In, First-Out) Activă:</p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Consumul la completări de fluide sau revizii descarcă automat cel mai vechi lot recepționat cu cantitate disponibilă. După epuizarea unui lot, sistemul trece la următorul lot, calculând prețul real de achiziție.
                </p>
              </div>
            </div>

            {/* Corp modal: tabel loturi */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loadingFifoLoturi ? (
                <div className="py-12 text-center text-xs font-bold text-slate-500 animate-pulse">
                  Se încarcă istoricul loturilor FIFO...
                </div>
              ) : fifoLoturiList.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Layers className="w-8 h-8 text-sage-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Nu există loturi de recepție pe factură înregistrate pentru acest articol.</p>
                  <p className="text-[11px] text-sage-500">Stocul curent ({viewingFifoArticol.stocCurent} {viewingFifoArticol.unitateMasura || 'L'}) provine din inițializarea stocului sau recepție fără factură detaliată.</p>
                </div>
              ) : (
                (() => {
                  const firstActiveIdx = fifoLoturiList.findIndex(
                    (l) => (l.cantitateRamasa ?? l.cantitateIntrata) > 0
                  );
                  const totalRamas = fifoLoturiList.reduce(
                    (acc, l) => acc + (l.cantitateRamasa ?? l.cantitateIntrata),
                    0
                  );

                  return (
                    <div className="space-y-3">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200 sticky top-0">
                          <tr>
                            <th className="p-2.5">Ordine FIFO</th>
                            <th className="p-2.5">Dată Factură</th>
                            <th className="p-2.5">Nr. Factură & Furnizor</th>
                            <th className="p-2.5 font-mono">Cantitate Intrată</th>
                            <th className="p-2.5 font-mono">Cantitate Rămasă</th>
                            <th className="p-2.5 font-mono">Preț Unitar Achiziție</th>
                            <th className="p-2.5 font-mono">Valoare Rămasă</th>
                            <th className="p-2.5 text-center">Stare Lot</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-200">
                          {fifoLoturiList.map((lot, idx) => {
                            const cantRamas = lot.cantitateRamasa ?? lot.cantitateIntrata;
                            const isExhausted = cantRamas <= 0;
                            const isPriority = idx === firstActiveIdx;

                            return (
                              <tr
                                key={lot.id}
                                className={`transition ${
                                  isPriority
                                    ? 'bg-emerald-50/70 font-semibold text-emerald-950 border-l-4 border-l-emerald-500'
                                    : isExhausted
                                    ? 'bg-morning-50/50 text-slate-400'
                                    : 'hover:bg-morning-50'
                                }`}
                              >
                                <td className="p-2.5 font-mono font-bold">
                                  #{idx + 1}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  {lot.dataFactura ? new Date(lot.dataFactura).toLocaleDateString('ro-RO') : 'Nespecificat'}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-bold text-sapphire-900">{lot.numarFactura || 'Fără Număr'}</div>
                                  <div className="text-[10px] text-sage-600">{lot.furnizor || 'Furnizor Nespecificat'}</div>
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  {lot.cantitateIntrata} {viewingFifoArticol.unitateMasura || 'L'}
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  <span className={isExhausted ? 'text-slate-400 line-through' : 'text-emerald-700'}>
                                    {cantRamas} {viewingFifoArticol.unitateMasura || 'L'}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  {Number(lot.pretUnitar || 0).toFixed(2)} RON
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  {(cantRamas * Number(lot.pretUnitar || 0)).toFixed(2)} RON
                                </td>
                                <td className="p-2.5 text-center">
                                  {isPriority ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                                      Prioritar La Consum
                                    </span>
                                  ) : isExhausted ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-morning-200 text-slate-500">
                                      Epuizat
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                                      În Așteptare
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => setViewingFifoArticol(null)}
                className="px-5 py-2 rounded-xl bg-morning-200 text-slate-700 font-bold text-xs hover:bg-morning-300 transition"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CONFIGURARE / EDITARE NORMĂ PE CATEGORIE DE UTILAJE */}
      {/* ========================================================================= */}
      {modalNormaOpen && (() => {
        const cat = categoriiNormeList.find((c: any) => c.nume === modalNormaCategorie);
        const fluidConfig = tipuriFluide.find((f) => f.cod === modalNormaTipLichid);
        const fluidLabel = tipLichidLabels[modalNormaTipLichid] || modalNormaTipLichid?.replace(/_/g, ' ');

        const isModeKm = modalNormaTrackingMode === 'KM';
        const isModeMth = modalNormaTrackingMode === 'MTH';
        const isModeLuni = modalNormaTrackingMode === 'LUNI';

        // Calcule pentru bara vizuală interactivă (Timeline Gauge)
        const intervalVal = isModeKm
          ? Number(modalNormaIntervalKm || 0)
          : isModeMth
          ? Number(modalNormaIntervalMth || 0)
          : Number(modalNormaIntervalLuni || 24);
        const pragVal = isModeKm
          ? Number(modalNormaPragKm || 0)
          : isModeMth
          ? Number(modalNormaPragMth || 0)
          : Number(modalNormaPragLuni || 1);
        const warnStartVal = Math.max(0, intervalVal - pragVal);
        const unitate = isModeKm ? 'KM' : isModeMth ? 'mTH' : 'luni';

        const warnPercent = intervalVal > 0 ? Math.min(100, Math.max(10, Math.round((pragVal / intervalVal) * 100))) : 20;
        const okPercent = 100 - warnPercent;

        const presets = isModeKm
          ? (fluidConfig?.presetKm && fluidConfig.presetKm.length > 0 ? fluidConfig.presetKm : [15000, 30000, 50000, 100000])
          : isModeMth
          ? (fluidConfig?.presetMth && fluidConfig.presetMth.length > 0 ? fluidConfig.presetMth : [500, 1000, 1250, 2000, 3000, 4000, 5000])
          : [6, 12, 18, 24, 36];

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-2xl space-y-5 shadow-2xl border border-morning-200 max-h-[92vh] flex flex-col">
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-3 border-b border-morning-200 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-sapphire-100 text-sapphire-700">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-extrabold text-sapphire-900">
                        Configurare Normă Intervale
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                          isModeKm ? 'bg-blue-100 text-blue-800' : isModeMth ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isModeKm ? 'KM' : isModeMth ? 'mTH (Ore)' : 'Calendar (Luni)'}
                      </span>
                    </div>
                    <p className="text-xs text-sage-600 font-medium mt-0.5 flex items-center flex-wrap gap-1.5">
                      <span className="inline-flex items-center space-x-1">
                        <CategoryIcon catName={modalNormaCategorie} className="w-3.5 h-3.5 text-sapphire-600" />
                        <span>Categorie: <strong className="text-sapphire-900">{modalNormaCategorie?.replace(/_/g, ' ')}</strong></span>
                      </span>
                      <span>•</span>
                      <span>({cat?.totalVehicule || 0} utilaje)</span>
                      <span>•</span>
                      <span>Normă: <strong className="text-sapphire-900">{fluidLabel}</strong></span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNormaOpen(false)}
                  className="p-1.5 rounded-lg text-sage-500 hover:text-sapphire-900 hover:bg-morning-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corp Formular Scrollabil */}
              <form onSubmit={handleSaveModalNorma} className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* Selector Tip Normă */}
                <div>
                  <label className="text-xs font-bold text-sapphire-900 block mb-1.5">
                    Selectează Tipul de Fluid / Filtru / Consumabil:
                  </label>
                  <FilterableSelect
                    value={modalNormaTipLichid}
                    onChange={(e) => {
                      const newTip = e.target.value;
                      setModalNormaTipLichid(newTip);
                      const existing = (cat?.norme || []).find((n: any) => n.tipLichid === newTip);
                      if (existing) {
                        setModalNormaTrackingMode(getNormTrackingMode(existing, cat?.tipMasurareImplicit));
                        setModalNormaIntervalKm(existing.intervalKm || 15000);
                        setModalNormaPragKm(existing.pragAvertizareKm || 1000);
                        setModalNormaIntervalMth(existing.intervalMth || 500);
                        setModalNormaPragMth(existing.pragAvertizareMth || 50);
                        setModalNormaIntervalLuni(existing.intervalLuni || '');
                        setModalNormaPragLuni(existing.pragAvertizareLuni || 1);
                      } else {
                        const isCatKmLocal = (cat?.tipMasurareImplicit || 'KM').toUpperCase() === 'KM';
                        setModalNormaTrackingMode(cat?.areContorDualMth ? 'MTH' : (isCatKmLocal ? 'KM' : 'MTH'));
                      }
                    }}
                    searchPlaceholder="Caută tip fluid / filtru..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                  >
                    {tipuriFluide.map((f) => (
                      <option key={f.cod} value={f.cod}>
                        {f.nume} ({f.cod})
                      </option>
                    ))}
                  </FilterableSelect>
                  {fluidConfig?.descriere && (
                    <p className="text-[11px] text-sage-500 mt-1 italic">
                      {fluidConfig.descriere}
                    </p>
                  )}
                </div>

                {/* Selector Unitate Monitorizare Normă */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-morning-100 rounded-xl border border-morning-200">
                  <span className="text-[11px] font-bold text-sapphire-900">Bază calcul normă:</span>
                  <div className="flex items-center gap-1.5">
                    {([
                      { id: 'MTH', label: 'Ore Funcționare (mTH)' },
                      { id: 'KM', label: 'Kilometri (KM)' },
                      { id: 'LUNI', label: 'Doar Calendaristic (Luni)' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setModalNormaTrackingMode(opt.id);
                          if (opt.id === 'LUNI' && !modalNormaIntervalLuni) {
                            setModalNormaIntervalLuni(24);
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          modalNormaTrackingMode === opt.id
                            ? 'bg-sapphire-900 text-white shadow-xs'
                            : 'bg-white text-sage-700 hover:bg-morning-200 border border-morning-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Butoane Preset 1-Click */}
                <div className="p-3 bg-morning-50/80 rounded-xl border border-morning-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-sage-700 uppercase tracking-wider flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Presetări Rapide Standard ({unitate}):</span>
                    </span>
                    <span className="text-[10px] text-sage-500 font-medium">
                      Alegeți un interval comun dintr-un click
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {presets.map((val) => {
                      const isCurrent = isModeKm
                        ? modalNormaIntervalKm === val
                        : isModeMth
                        ? modalNormaIntervalMth === val
                        : Number(modalNormaIntervalLuni) === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            if (isModeKm) {
                              setModalNormaIntervalKm(val);
                              const suggestedPrag = Math.max(500, Math.round((val * 0.08) / 500) * 500);
                              setModalNormaPragKm(suggestedPrag);
                            } else if (isModeMth) {
                              setModalNormaIntervalMth(val);
                              const suggestedPrag = Math.max(25, Math.round((val * 0.08) / 25) * 25);
                              setModalNormaPragMth(suggestedPrag);
                            } else {
                              setModalNormaIntervalLuni(val);
                              setModalNormaPragLuni(1);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                            isCurrent
                              ? 'bg-sapphire-900 text-white shadow-xs'
                              : 'bg-white hover:bg-morning-200 text-sapphire-900 border border-morning-200'
                          }`}
                        >
                          {val.toLocaleString('ro-RO')} {unitate}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Câmpuri de Intrare: KM vs MTH */}
                {!isModeLuni && (
                  <div className="p-4 bg-white rounded-xl border border-morning-200 space-y-3">
                    <h4 className="text-xs font-bold text-sapphire-900 flex items-center space-x-1.5">
                      <Gauge className="w-4 h-4 text-sapphire-600" />
                      <span>Configurare Contor Principal ({isModeKm ? 'Kilometri — KM' : 'Ore Funcționare — mTH'})</span>
                    </h4>

                    {isModeKm ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-sage-700 block mb-1">
                            Interval Schimb Normat (KM): *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1000"
                              step="500"
                              required
                              value={modalNormaIntervalKm}
                              onChange={(e) => setModalNormaIntervalKm(Number(e.target.value))}
                              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500 pr-12"
                              placeholder="ex: 15000"
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500 font-mono">
                              KM
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-sage-700 block mb-1">
                            Marjă Avertizare Anticipată (KM): *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="100"
                              step="100"
                              required
                              value={modalNormaPragKm}
                              onChange={(e) => setModalNormaPragKm(Number(e.target.value))}
                              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500 pr-12"
                              placeholder="ex: 1500"
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500 font-mono">
                              KM
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-sage-700 block mb-1">
                            Interval Schimb Normat (mTH): *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="20"
                              step="10"
                              required
                              value={modalNormaIntervalMth}
                              onChange={(e) => setModalNormaIntervalMth(Number(e.target.value))}
                              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500 pr-14"
                              placeholder="ex: 500"
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500 font-mono">
                              mTH
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-sage-700 block mb-1">
                            Marjă Avertizare Anticipată (mTH): *
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="5"
                              step="5"
                              required
                              value={modalNormaPragMth}
                              onChange={(e) => setModalNormaPragMth(Number(e.target.value))}
                              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500 pr-14"
                              placeholder="ex: 50"
                            />
                            <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500 font-mono">
                              mTH
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Limită Calendaristică (Luni) */}
                <div className="p-4 bg-white rounded-xl border border-morning-200 space-y-3">
                  <h4 className="text-xs font-bold text-sapphire-900 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-sapphire-600" />
                    <span>{isModeLuni ? 'Interval Calendaristic Principal (Luni)' : 'Interval Calendaristic Opțional (Limită Timp)'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-sage-700 block mb-1">
                        Interval Calendaristic (Luni){isModeLuni ? ': *' : ' (opțional):'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="120"
                          required={isModeLuni}
                          value={modalNormaIntervalLuni}
                          onChange={(e) => setModalNormaIntervalLuni(e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500 pr-12"
                          placeholder="lăsați gol dacă nu se aplică"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500">
                          luni
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-sage-700 block mb-1">
                        Marjă Avertizare Timp (Luni):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="12"
                          value={modalNormaPragLuni}
                          onChange={(e) => setModalNormaPragLuni(Number(e.target.value))}
                          className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500 pr-12"
                          placeholder="ex: 1"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500">
                          luni
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Previziune Vizuală (Timeline Gauge) */}
                <div className="p-3.5 bg-gradient-to-r from-morning-50 to-morning-100 rounded-xl border border-morning-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-sapphire-900 flex items-center space-x-1">
                      <Activity className="w-3.5 h-3.5 text-sapphire-600" />
                      <span>Schema Pragurilor de Alertă:</span>
                    </span>
                    <span className="font-mono text-sage-600">
                      Total: {intervalVal.toLocaleString('ro-RO')} {unitate}
                    </span>
                  </div>

                  {/* Segmented Timeline Bar */}
                  <div className="h-4 rounded-full overflow-hidden flex bg-morning-200 p-0.5 border border-morning-300">
                    <div
                      style={{ width: `${okPercent}%` }}
                      className="h-full bg-emerald-500 rounded-l-full flex items-center justify-center text-[9px] text-white font-extrabold"
                      title="Zona Verde: Funcționare optimă"
                    >
                      OK
                    </div>
                    <div
                      style={{ width: `${warnPercent}%` }}
                      className="h-full bg-amber-400 flex items-center justify-center text-[9px] text-amber-950 font-extrabold"
                      title="Zona Galbenă: Avertizare revizie"
                    >
                      Avertizare
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-sage-600 font-mono">
                    <span>0 {unitate}</span>
                    <span className="text-amber-700 font-bold">
                      Avertizare la: {warnStartVal.toLocaleString('ro-RO')} {unitate}
                    </span>
                    <span className="text-terracotta-700 font-bold">
                      Depășit: ≥ {intervalVal.toLocaleString('ro-RO')} {unitate}
                    </span>
                  </div>
                </div>

                {/* Notă Informativă privind Propagarea */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    Salvarea acestei norme va actualiza automat starea de mentenanță preventivă pentru toate cele <strong>{cat?.totalVehicule || 0} utilaje/vehicule</strong> din categoria <strong>{modalNormaCategorie?.replace(/_/g, ' ')}</strong>.
                  </p>
                </div>

                {/* Butoane Acțiune Modal */}
                {(() => {
                  const existingInModal = (cat?.norme || []).find((n: any) => n.tipLichid === modalNormaTipLichid);

                  return (
                    <div className="flex items-center justify-between pt-3 border-t border-morning-200 shrink-0">
                      <div>
                        {existingInModal && (
                          <button
                            type="button"
                            onClick={() => handleStergeConfigCategorie(existingInModal.id, modalNormaTipLichid, modalNormaCategorie)}
                            className="px-3.5 py-2 rounded-xl bg-roseash-50 hover:bg-roseash-100 text-terracotta-700 font-bold text-xs border border-roseash-200 transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-terracotta-600" />
                            <span>Șterge / Dezactivează această normă</span>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={() => setModalNormaOpen(false)}
                          className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-bold text-xs hover:bg-morning-300 transition cursor-pointer"
                        >
                          Anulează
                        </button>
                        <button
                          type="submit"
                          disabled={isModalSaving}
                          className="px-5 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-xs shadow-md shadow-sapphire-600/20 disabled:opacity-50 transition flex items-center space-x-1.5 cursor-pointer"
                        >
                          {isModalSaving ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Se salvează norma...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>{existingInModal ? 'Actualizează Norma' : 'Activează Norma'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </form>
            </div>
          </div>
        );
      })()}
      {/* ========================================================================= */}
      {/* MODAL 7: CLASIFICARE ARTICOL & ASOCIERE NORMĂ PE ARTICOL DIN STOC */}
      {/* ========================================================================= */}
      {editingStockTipArticol && (() => {
        const allCatOptions = (toateCategoriileStoc.length > 0 ? toateCategoriileStoc : categoriiFluide).filter(
          (c: any) => !/anvelop/i.test(c?.nume || ''),
        );
        const selectedCatObjModal = allCatOptions.find((c: any) => c.nume === stockCategorieValue);
        const subcatOptionsModal = selectedCatObjModal?.subcategorii || [];

        return (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl border border-morning-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-sapphire-900">Clasificare Articol &amp; Normă</h3>
                  <p className="text-[11px] text-sage-600 font-medium truncate max-w-xs">
                    {editingStockTipArticol.denumire} · <span className="font-mono">{editingStockTipArticol.codArticol}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStockTipArticol(null)}
                className="text-sage-500 hover:text-sapphire-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockTip} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie Stoc:</label>
                  <FilterableSelect
                    value={stockCategorieValue}
                    onChange={(e) => {
                      const nextCat = e.target.value;
                      setStockCategorieValue(nextCat);
                      const nextCatObj = allCatOptions.find((c: any) => c.nume === nextCat);
                      const firstSub = nextCatObj?.subcategorii?.[0]?.nume || '';
                      setStockSubcategorieValue(firstSub);
                      const isFluidOrFilter =
                        nextCatObj?.esteFluid === true ||
                        /lubrifian|ulei|fluid|antigel|adblue|racire|lichid|filtr/i.test(nextCat);
                      if (!isFluidOrFilter) {
                        setStockTipValue('');
                      }
                    }}
                    searchPlaceholder="Caută categorie..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {!allCatOptions.some((c: any) => c.nume === stockCategorieValue) && stockCategorieValue && (
                      <option value={stockCategorieValue}>{stockCategorieValue}</option>
                    )}
                    {allCatOptions.map((c: any) => (
                      <option key={c.id || c.nume} value={c.nume}>
                        {c.nume}
                      </option>
                    ))}
                  </FilterableSelect>
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Subcategorie:</label>
                  <FilterableSelect
                    value={stockSubcategorieValue}
                    onChange={(e) => {
                      const nextSub = e.target.value;
                      setStockSubcategorieValue(nextSub);
                      const subObj = subcatOptionsModal.find((sc: any) => sc.nume === nextSub);
                      if (subObj?.tipLichid) setStockTipValue(subObj.tipLichid);
                    }}
                    searchPlaceholder="Caută subcategorie..."
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  >
                    <option value="">-- Fără subcategorie --</option>
                    {stockSubcategorieValue &&
                      !subcatOptionsModal.some((sc: any) => sc.nume === stockSubcategorieValue) && (
                        <option value={stockSubcategorieValue}>{stockSubcategorieValue}</option>
                      )}
                    {subcatOptionsModal.map((sc: any) => (
                      <option key={sc.id || sc.nume} value={sc.nume}>
                        {sc.nume}
                      </option>
                    ))}
                  </FilterableSelect>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">
                  Normă Întreținere (Fluid / Filtru):
                </label>
                <FilterableSelect
                  value={stockTipValue}
                  onChange={(e) => setStockTipValue(e.target.value)}
                  searchPlaceholder="Caută normă..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="">-- Fără asociere normă --</option>
                  {tipuriFluide.map((tf) => (
                    <option key={tf.cod} value={tf.cod}>
                      {tf.nume} ({tf.cod})
                    </option>
                  ))}
                </FilterableSelect>
                <p className="text-[11px] text-sage-500 mt-1">
                  La eliberarea din depozit sau pe Comandă de Lucru, acest articol va contoriza automat pentru norma aleasă.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Marcă / Brand (opțional):</label>
                  <input
                    value={stockMarcaValue}
                    onChange={(e) => setStockMarcaValue(e.target.value)}
                    placeholder="ex: Mobil Delvac, Castrol, Liebherr"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Unitate de Măsură:</label>
                  <select
                    value={stockUmValue}
                    onChange={(e) => setStockUmValue(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="L">L (Litri)</option>
                    <option value="buc">buc (Bucăți)</option>
                    <option value="kg">kg (Kilograme)</option>
                    <option value="set">set (Set)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  disabled={isSavingStockTip}
                  onClick={handleRemoveArticolFromFluids}
                  className="px-3 py-2 rounded-xl bg-roseash-50 hover:bg-roseash-100 text-terracotta-700 font-bold text-xs border border-roseash-200 transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  title="Mută articolul în categoria Alte ▸ Alte piese și îl scoate din Gestiunea Fluidelor"
                >
                  <Trash2 className="w-3.5 h-3.5 text-terracotta-600" />
                  <span>Scoate din Fluide</span>
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingStockTipArticol(null)}
                    className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold cursor-pointer"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStockTip}
                    className="px-5 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingStockTip ? 'Se salvează...' : 'Salvează'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 8: CREARE / EDITARE TIP LUBRIFIANT (NOMENCLATOR MASTER) */}
      {/* ========================================================================= */}
      {showTipFluidModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl border border-morning-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-sapphire-900">
                    {editingTipFluid ? `Editare Tip Normă (${editingTipFluid.cod})` : 'Tip Fluid / Filtru / Consumabil Nou'}
                  </h3>
                  <p className="text-[11px] text-sage-600 font-medium">
                    Disponibil imediat la configurarea normelor pe utilaje, la recepția în stoc și sincronizat automat din Devizele de Lucru.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowTipFluidModal(false); setEditingTipFluid(null); }}
                className="text-sage-500 hover:text-sapphire-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTipFluid} className="space-y-3.5 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Fluid / Filtru / Consumabil: *</label>
                <input
                  required
                  value={tipFluidForm.nume}
                  onChange={(e) => setTipFluidForm({ ...tipFluidForm, nume: e.target.value })}
                  placeholder="ex: Filtru Aer, Filtru Combustibil, Ulei Reductor Liebherr, Vaselină"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              {!editingTipFluid && (
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod Sistem (opțional — generat automat):</label>
                  <input
                    value={tipFluidForm.cod}
                    onChange={(e) => setTipFluidForm({ ...tipFluidForm, cod: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
                    placeholder="ex: FILTRU_AER, ULEI_REDUCTOR_LIEBHERR"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              )}

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Tehnică:</label>
                <input
                  value={tipFluidForm.descriere}
                  onChange={(e) => setTipFluidForm({ ...tipFluidForm, descriere: e.target.value })}
                  placeholder="ex: Filtru aer motor / Ulei sintetic 75W-90 pentru reductoare finale"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Presetări Rapide KM (separate prin virgulă):</label>
                  <input
                    value={tipFluidForm.presetKmText}
                    onChange={(e) => setTipFluidForm({ ...tipFluidForm, presetKmText: e.target.value })}
                    placeholder="ex: 15000, 30000, 60000"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Presetări Rapide mTH (separate prin virgulă):</label>
                  <input
                    value={tipFluidForm.presetMthText}
                    onChange={(e) => setTipFluidForm({ ...tipFluidForm, presetMthText: e.target.value })}
                    placeholder="ex: 250, 500, 1000"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => { setShowTipFluidModal(false); setEditingTipFluid(null); }}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSavingTipFluid}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingTipFluid ? 'Se salvează...' : (editingTipFluid ? 'Salvează Tipul' : 'Creează Tip Normă')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL 8: ACTUALIZARE RAPIDĂ ORE MTH & BAZĂ ULTIMUL SCHIMB */}
      {/* ========================================================================= */}
      {editingBaselineRow && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl border border-morning-200">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span>{editingBaselineRow.vehiculNumarIntern} — Reglaj Contor &amp; Bază</span>
                </h3>
                <p className="text-[11px] text-sage-600 mt-0.5">
                  {tipLichidLabels[editingBaselineRow.tipLichid] || editingBaselineRow.tipLichid}
                </p>
              </div>
              <button type="button" onClick={() => setEditingBaselineRow(null)} className="text-sage-400 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicleBaseline} className="space-y-4 text-xs">
              {editingBaselineRow.areContorDualMth && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-amber-900">Ore Funcționare Curente (mTH Manual):</label>
                    <span className="text-[10px] font-mono text-amber-700 font-bold">
                      KM pompă: {Number(editingBaselineRow.valoareContorCurent || 0).toLocaleString('ro-RO')} km
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={baselineMthValue}
                    onChange={(e) => setBaselineMthValue(Number(e.target.value))}
                    className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-sm font-mono font-black text-sapphire-900"
                  />
                  <p className="text-[10px] text-amber-800">
                    Modificarea orelor mTH nu afectează kilometrajul importat de la pompă.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-sage-700 block mb-1">
                    Contor la Ultimul Schimb ({editingBaselineRow.unitateMasura || 'KM'}):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={baselineSchimbContor}
                    onChange={(e) => setBaselineSchimbContor(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-mono font-bold text-sapphire-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-sage-700 block mb-1">Dată Ultimul Schimb:</label>
                  <input
                    type="date"
                    value={baselineSchimbData}
                    onChange={(e) => setBaselineSchimbData(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-mono font-bold text-sapphire-900"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setEditingBaselineRow(null)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSavingVehicleBaseline}
                  className="px-5 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {isSavingVehicleBaseline ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
