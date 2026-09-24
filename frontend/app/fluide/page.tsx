"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect, useMemo } from 'react';
import {
  Droplets, Plus, ShieldAlert, AlertTriangle, RefreshCw, ShoppingCart, Clock, Calendar,
  CheckCircle2, X, Filter, Sliders, ArrowUpRight, Search, Layers, Database, Truck, ChevronDown, ChevronUp, Check, Wrench, ShieldCheck, Activity, FileText,
  Edit3, Trash2, DollarSign, TrendingDown, Gauge, Car, Info, Sparkles
} from 'lucide-react';
import VehicleSelector from '@/components/VehicleSelector';
import { showConfirm } from '@/lib/swal';

const TIP_LICHID_LABELS: Record<string, string> = {
  ULEI_MOTOR: 'Ulei Motor',
  ULEI_HIDRAULIC: 'Ulei Hidraulic',
  ULEI_TRANSMISIE: 'Ulei Transmisie & Diferențial',
  ANTIGEL_G12: 'Antigel G12+ (Lichid Răcire Roz)',
  ANTIGEL_G11: 'Antigel G11 (Lichid Răcire Albastru)',
  ADBLUE: 'AdBlue (Uree 32.5%)',
  ULEI_LIEBHERR_PUNTE: 'Ulei Punte Liebherr',
  ULEI_LIEBHERR_CUTIE: 'Ulei Cutie Liebherr',
  ULEI_CUTIE_MANUALA: 'Ulei Cutie Manuală',
  ULEI_CUTIE_AUTOMATA: 'Ulei Cutie Automată',
};

const FLUIDE_CATEGORII_CONFIG = [
  {
    key: 'ULEI_MOTOR',
    nume: 'Ulei Motor',
    descriere: 'Lubrifiere motor termic, protecție împotriva uzurii și depunerilor la temperaturi înalte.',
    iconType: 'Droplets',
    accentColor: 'amber',
    presetKm: [10000, 15000, 20000, 30000, 40000],
    presetMth: [150, 250, 500],
    recomandat: 'Esențial pentru toate utilajele și autovehiculele',
  },
  {
    key: 'ULEI_HIDRAULIC',
    nume: 'Ulei Hidraulic',
    descriere: 'Transmisie putere hidraulică, operare braț, cilindri și pompe de presiune.',
    iconType: 'Activity',
    accentColor: 'blue',
    presetKm: [30000, 60000, 100000],
    presetMth: [500, 1000, 1500, 2000],
    recomandat: 'Critic pentru Excavatoare, Încărcătoare, Basculante',
  },
  {
    key: 'ULEI_TRANSMISIE',
    nume: 'Ulei Transmisie & Diferențial',
    descriere: 'Protecție cutie viteze mecanică/automată, grupuri conice și diferențiale axe.',
    iconType: 'Sliders',
    accentColor: 'indigo',
    presetKm: [30000, 60000, 90000, 120000],
    presetMth: [500, 1000, 1500],
    recomandat: 'Capete Tractor, Camioane 8x4, Basculante, Autoutilitare',
  },
  {
    key: 'ANTIGEL_G12',
    nume: 'Antigel G12+ (Lichid Răcire Roz)',
    descriere: 'Răcire motor, protecție anti-îngheț și anticoroziune aluminiu/aliaj.',
    iconType: 'ShieldCheck',
    accentColor: 'rose',
    presetKm: [40000, 60000, 100000],
    presetMth: [1000, 2000],
    recomandat: 'Flotă modernă (Euro 5, Euro 6, Stage IV / V)',
  },
  {
    key: 'ADBLUE',
    nume: 'AdBlue (Soluție Uree 32.5%)',
    descriere: 'Tratare gaze eșapament SCR, reducere emisii NOx conform normelor antipoluare.',
    iconType: 'Sparkles',
    accentColor: 'emerald',
    presetKm: [10000, 15000, 25000],
    presetMth: [250, 500],
    recomandat: 'Vehicule echipate cu catalizator SCR (Euro 6 / Stage V)',
  },
  {
    key: 'ANTIGEL_G11',
    nume: 'Antigel G11 (Lichid Răcire Albastru)',
    descriere: 'Răcire motor pe bază de silicați pentru utilaje din generații clasice.',
    iconType: 'ShieldCheck',
    accentColor: 'cyan',
    presetKm: [30000, 50000],
    presetMth: [1000],
    recomandat: 'Generații clasice de utilaje',
  },
  {
    key: 'ULEI_LIEBHERR_PUNTE',
    nume: 'Ulei Punte Liebherr',
    descriere: 'Ulei specific de înaltă presiune pentru punți și reductoare de roată Liebherr.',
    iconType: 'Gauge',
    accentColor: 'purple',
    presetKm: [30000, 50000],
    presetMth: [500, 1000],
    recomandat: 'Utilaje grele Liebherr (Excavatoare, Vole)',
  },
  {
    key: 'ULEI_LIEBHERR_CUTIE',
    nume: 'Ulei Cutie Liebherr',
    descriere: 'Ulei transmisie hidrostatică sau powershift pentru utilaje terasiere Liebherr.',
    iconType: 'Gauge',
    accentColor: 'purple',
    presetKm: [30000, 50000],
    presetMth: [500, 1000],
    recomandat: 'Transmisii utilaje Liebherr',
  },
  {
    key: 'ULEI_CUTIE_MANUALA',
    nume: 'Ulei Cutie Manuală',
    descriere: 'Transmisii manuale sinteză 75W-80 sau 80W-90.',
    iconType: 'Sliders',
    accentColor: 'slate',
    presetKm: [40000, 80000],
    presetMth: [500, 1000],
    recomandat: 'Camioane și autoutilitare cu cutie manuală',
  },
  {
    key: 'ULEI_CUTIE_AUTOMATA',
    nume: 'Ulei Cutie Automată (ATF)',
    descriere: 'Fluide de transmisie automată ATF Dexron / ZF Ecolife / TraXon.',
    iconType: 'Sliders',
    accentColor: 'violet',
    presetKm: [60000, 120000],
    presetMth: [1000, 1500],
    recomandat: 'Capete tractor automate și autoturisme',
  },
];

const getCategoryIcon = (catName: string) => {
  const c = (catName || '').toUpperCase();
  if (c.includes('EXCAVATOR') || c.includes('INCARCATOR') || c.includes('BULLDOZER') || c.includes('AUTOVALT') || c.includes('UTILAJ')) {
    return '🚜';
  }
  if (c.includes('TRACTOR') || c.includes('BASCULANTA') || c.includes('CAMION')) {
    return '🚛';
  }
  if (c.includes('SEMIREMORCA') || c.includes('REMORCA')) {
    return '🛞';
  }
  if (c.includes('AUTOUTILITARA')) {
    return '🚐';
  }
  if (c.includes('AUTOTURISM')) {
    return '🚗';
  }
  if (c.includes('ATV')) {
    return '🏍️';
  }
  return '⚙️';
};

const isArticolMatchingTipLichid = (item: any, tipLichid: string): boolean => {
  if (!item) return false;
  const sub = (item.subcategorie || '').toLowerCase();
  const den = (item.denumire || '').toLowerCase();
  const cat = (item.categorie || '').toLowerCase();
  const marca = (item.marcaUlei || '').toLowerCase();
  const combined = `${sub} ${den} ${cat} ${marca}`;

  if (/spuma|curatitor|spray|degresant/i.test(combined)) {
    return false;
  }

  switch (tipLichid) {
    case 'ULEI_MOTOR':
      return (
        (sub.includes('motor') || den.includes('motor') || /15w40|10w40|5w30|5w40|0w30|0w20|delvac|castrol/i.test(combined)) &&
        !/hidraulic|hlp|dte|tellus|hvlp|transmisie|diferential|gear|punte|cutie|80w90|75w90|atf|antigel|adblue/i.test(combined)
      );

    case 'ULEI_HIDRAULIC':
      return (
        /hidraulic|hlp|dte|tellus|hvlp|hvi/i.test(combined) &&
        !/delvac|castrol.*10w40|antigel|adblue/i.test(combined)
      );

    case 'ULEI_TRANSMISIE':
      return (
        /transmisie|diferential|gear|punte|cutie|80w90|75w90|75w80|85w140|atf|utto/i.test(combined) &&
        !/hidraulic|antigel|adblue/i.test(combined)
      );

    case 'ULEI_LIEBHERR_PUNTE':
      return (
        /punte/i.test(combined) ||
        (combined.includes('liebherr') && /gear|80w90|punte/i.test(combined)) ||
        /80w90|gear\s*oil|punte/i.test(combined)
      );

    case 'ULEI_LIEBHERR_CUTIE':
      return (
        (combined.includes('liebherr') && /cutie|transmisie/i.test(combined)) ||
        /cutie/i.test(combined) ||
        /transmisie|atf/i.test(combined)
      );

    case 'ULEI_CUTIE_MANUALA':
      return (
        /cutie.*manual|manual.*cutie/i.test(combined) ||
        /75w80|75w90|80w90|transmisie|cutie/i.test(combined)
      );

    case 'ULEI_CUTIE_AUTOMATA':
      return /automat|atf|dexron/i.test(combined);

    case 'ANTIGEL_G12':
      return /g12|antigel.*roz|coolant.*pink|antigel/i.test(combined);

    case 'ANTIGEL_G11':
      return /g11|antigel.*albastru|coolant.*blue|antigel/i.test(combined);

    case 'ADBLUE':
      return /adblue|uree/i.test(combined);

    default:
      return true;
  }
};

export default function FluidePage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [activeTab, setActiveTab] = useState<'stocuri' | 'config' | 'anomalii' | 'istoric'>('stocuri');
  const [stocUleiuri, setStocUleiuri] = useState<any[]>([]);
  const [flotaFluide, setFlotaFluide] = useState<any[]>([]);
  const [statusSchimburi, setStatusSchimburi] = useState<any[]>([]);
  const [alerte, setAlerte] = useState<any[]>([]);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);
  const [isAlerteCollapsed, setIsAlerteCollapsed] = useState<boolean>(false);

  // Istoric Completări & Schimburi Fluide
  const [istoricCompletari, setIstoricCompletari] = useState<any[]>([]);
  const [loadingIstoric, setLoadingIstoric] = useState<boolean>(false);
  const [searchIstoric, setSearchIstoric] = useState<string>('');
  const [filterIstoricTip, setFilterIstoricTip] = useState<string>('TOATE');

  // Categorii & Depozite Fluide
  const [categoriiFluide, setCategoriiFluide] = useState<any[]>([]);
  const [depoziteList, setDepoziteList] = useState<any[]>([]);

  // Filtre Tab Stocuri Fluide
  const [searchStoc, setSearchStoc] = useState('');
  const [selectedDepozitStoc, setSelectedDepozitStoc] = useState('');
  const [selectedCategorieStoc, setSelectedCategorieStoc] = useState('');
  const [selectedStatusStoc, setSelectedStatusStoc] = useState<'TOATE' | 'CRITIC' | 'OPTIM'>('TOATE');

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
  const [iesireTipLichid, setIesireTipLichid] = useState('ULEI_MOTOR');
  const [iesireOperatiune, setIesireOperatiune] = useState('COMPLETARE_ULEI');
  const [selectedArticolStocId, setSelectedArticolStocId] = useState('');
  const [iesireMarca, setIesireMarca] = useState('Mobil1');
  const [iesireCantitate, setIesireCantitate] = useState(5);
  const [iesireContor, setIesireContor] = useState(0);
  const [iesireData, setIesireData] = useState(new Date().toISOString().split('T')[0]);
  const [iesireMecanic, setIesireMecanic] = useState('Brașoveanu Virgil (Șef Atelier)');
  const [iesireObservatii, setIesireObservatii] = useState('');
  const [arataToateFluidele, setArataToateFluidele] = useState<boolean>(false);

  // Filtrare automată a articolelor din stoc după Tip Fluid / Lubrifiant selectat
  const articoleStocFiltrate = useMemo(() => {
    if (arataToateFluidele) return stocUleiuri;
    return stocUleiuri.filter((art) => isArticolMatchingTipLichid(art, iesireTipLichid));
  }, [stocUleiuri, iesireTipLichid, arataToateFluidele]);

  // Actualizare automată a selecției când se schimbă categoria sau lista filtrată
  useEffect(() => {
    if (showCompletareModal) {
      if (articoleStocFiltrate.length > 0) {
        const exists = articoleStocFiltrate.some((a) => a.id === selectedArticolStocId);
        if (!exists) {
          setSelectedArticolStocId(articoleStocFiltrate[0].id);
          setIesireMarca(articoleStocFiltrate[0].marcaUlei || articoleStocFiltrate[0].denumire);
        }
      } else {
        setSelectedArticolStocId('');
        setIesireMarca('');
      }
    }
  }, [iesireTipLichid, articoleStocFiltrate, showCompletareModal]);

  // Stare Formular Configurare Intervale pe Categorii (Reguli mTH, KM, Luni)
  const [categoriiNormeList, setCategoriiNormeList] = useState<any[]>([]);
  const [selectedCatEnum, setSelectedCatEnum] = useState<string>('');
  const [arataToateNormeleCategoriilor, setArataToateNormeleCategoriilor] = useState<boolean>(false);
  const [isSavingConfigCat, setIsSavingConfigCat] = useState<boolean>(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'TOATE' | 'MTH' | 'KM'>('TOATE');
  const [searchNorme, setSearchNorme] = useState<string>('');
  const [configViewMode, setConfigViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modal Editare / Configurare Normă Fluid pe Categorie
  const [modalNormaOpen, setModalNormaOpen] = useState<boolean>(false);
  const [modalNormaCategorie, setModalNormaCategorie] = useState<string>('');
  const [modalNormaTipLichid, setModalNormaTipLichid] = useState<string>('ULEI_MOTOR');
  const [modalNormaIntervalKm, setModalNormaIntervalKm] = useState<number>(15000);
  const [modalNormaPragKm, setModalNormaPragKm] = useState<number>(1000);
  const [modalNormaIntervalMth, setModalNormaIntervalMth] = useState<number>(250);
  const [modalNormaPragMth, setModalNormaPragMth] = useState<number>(50);
  const [modalNormaIntervalLuni, setModalNormaIntervalLuni] = useState<number>(12);
  const [modalNormaPragLuni, setModalNormaPragLuni] = useState<number>(1);
  const [isModalSaving, setIsModalSaving] = useState<boolean>(false);

  const [cfgTipLichid, setCfgTipLichid] = useState('ULEI_MOTOR');
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
        const lubeStoc = dataStoc.filter((s: any) => {
          const cat = (s.categorie || '').toLowerCase();
          const den = (s.denumire || '').toLowerCase();
          const sub = (s.subcategorie || '').toLowerCase();
          const isFilter = cat.includes('filtr') || den.includes('filtr') || cat === 'filtre';
          const isNonFluid = /spuma|curatitor|spray|degresant/i.test(`${cat} ${den} ${sub}`);
          if (isFilter || isNonFluid) return false;

          const isFluid =
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
          const titlu = (a.titlu || '').toLowerCase();
          const mesaj = (a.mesaj || '').toLowerCase();
          // Exclude filter-related alerts — they belong in the Filtre section, not Fluide
          const isFilterAlert = titlu.includes('filtru') || titlu.includes('filter');
          if (isFilterAlert) return false;
          return (
            a.categorieAlert === 'SCURGERI_ULEI' ||
            titlu.includes('ulei') ||
            titlu.includes('fluid') ||
            titlu.includes('lichid') ||
            mesaj.includes('ulei')
          );
        });
        setAlerte(lubeAlerts);
      }

      // Fetch Categorii Fluide
      const resCat = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`);
      if (resCat.ok) {
        const catData = await resCat.json();
        const allCats = [
          ...(Array.isArray(catData.categoriiImplicite) ? catData.categoriiImplicite : []),
          ...(Array.isArray(catData.categoriiCustom) ? catData.categoriiCustom : []),
        ];
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

      // Fetch Norme pe Categorii
      await fetchCategoriiNorme();

      // Fetch Istoric Completări Flotă
      const resIstoric = await fetch(`${API_BASE_URL}/anomalii/istoric-completari?limit=150`);
      if (resIstoric.ok) setIstoricCompletari(await resIstoric.json());
    } catch (e) {
      console.log('Error fetching initial data for fluids', e);
    }
  };

  const fetchIstoricCompletari = async () => {
    setLoadingIstoric(true);
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/istoric-completari?limit=150`);
      if (res.ok) setIstoricCompletari(await res.json());
    } catch (e) {
      console.error('Error fetching completions history', e);
    } finally {
      setLoadingIstoric(false);
    }
  };

  // Ascultăm schimbarea tab-ului din URL (?tab=stocuri)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t === 'stocuri' || t === 'config' || t === 'anomalii') {
          setActiveTab(t as any);
        }
      }
    } catch (e) {}
  }, []);

  // Handlers Modificare Prag Alertă per Articol
  const handleOpenEditAlert = (art: any) => {
    setEditingAlertArticol(art);
    setNewPragAlert(art.stocMinim || 0);
  };

  const handleSavePragAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlertArticol) return;
    setIsSavingAlert(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${editingAlertArticol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocMinim: Number(newPragAlert) }),
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
          stocMinimImplicit: Number(catStocMinim),
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
    setShowAddSubcatModal(true);
  };

  const openEditSubcat = (sc: any, catNumeParam: string) => {
    setEditingSubcat(sc);
    setTargetCatForSubcat(catNumeParam);
    setSubcatNume(sc.nume || '');
    setSubcatDescriere(sc.descriere || '');
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
        }),
      });

      if (res.ok) {
        alert(`Subcategoria de fluid "${subcatNume.trim()}" a fost ${editingSubcat ? 'actualizată' : 'salvată'} cu succes!`);
        setShowAddSubcatModal(false);
        setEditingSubcat(null);
        setSubcatNume('');
        setSubcatDescriere('');
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea subcategoriei.');
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

  useEffect(() => {
    if (selectedVehiculId) {
      fetchStatusSchimburi(selectedVehiculId);
      const v = vehicule.find(item => item.id === selectedVehiculId);
      if (v) setIesireContor(v.valoareContorCurent || 0);
    }
  }, [selectedVehiculId]);

  const handleOpenCompletare = (vehiculId?: string, tipLichid?: string) => {
    if (vehiculId) {
      setSelectedVehiculId(vehiculId);
      const v = vehicule.find(item => item.id === vehiculId);
      if (v) setIesireContor(v.valoareContorCurent || 0);
    }
    if (tipLichid) {
      setIesireTipLichid(tipLichid);
    }
    setIesireOperatiune('COMPLETARE_ULEI');
    setIesireData(new Date().toISOString().split('T')[0]);
    setArataToateFluidele(false);
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

  const handleStergeConfigCategorie = async (normaId: string, tipFluid: string) => {
    const fluidLabel = TIP_LICHID_LABELS[tipFluid] || tipFluid;
    const confirmed = await showConfirm(
      'Ștergere Normă Categorie',
      `Sigur doriți să ștergeți norma pentru ${fluidLabel}?`,
      'Da, șterge',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei/categorie/${normaId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('Norma a fost ștearsă cu succes.');
        await fetchCategoriiNorme();
        await fetchInitialData();
      } else {
        const err = await res.json();
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
      setModalNormaIntervalKm(existing.intervalKm || 15000);
      setModalNormaPragKm(existing.pragAvertizareKm || 1000);
      setModalNormaIntervalMth(existing.intervalMth || 250);
      setModalNormaPragMth(existing.pragAvertizareMth || 50);
      setModalNormaIntervalLuni(existing.intervalLuni || 12);
      setModalNormaPragLuni(existing.pragAvertizareLuni || 1);
    } else {
      if (isKm) {
        setModalNormaIntervalKm(tipLichid === 'ULEI_MOTOR' ? 15000 : 30000);
        setModalNormaPragKm(1000);
        setModalNormaIntervalMth(250);
        setModalNormaPragMth(50);
      } else {
        setModalNormaIntervalMth(tipLichid === 'ULEI_MOTOR' ? 250 : 500);
        setModalNormaPragMth(50);
        setModalNormaIntervalKm(15000);
        setModalNormaPragKm(1000);
      }
      setModalNormaIntervalLuni(12);
      setModalNormaPragLuni(1);
    }
    setModalNormaOpen(true);
  };

  const handleSaveModalNorma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNormaCategorie || !modalNormaTipLichid) return;

    const cat = categoriiNormeList.find((c) => c.nume === modalNormaCategorie);
    const isKm = (cat?.tipMasurareImplicit || 'KM').toUpperCase() === 'KM';

    setIsModalSaving(true);
    try {
      const payload: any = {
        categorieEnum: modalNormaCategorie,
        tipLichid: modalNormaTipLichid,
        intervalLuni: modalNormaIntervalLuni ? Number(modalNormaIntervalLuni) : null,
        pragAvertizareLuni: modalNormaPragLuni ? Number(modalNormaPragLuni) : 1,
      };

      if (isKm) {
        payload.intervalKm = Number(modalNormaIntervalKm);
        payload.pragAvertizareKm = Number(modalNormaPragKm);
        payload.intervalMth = null;
        payload.pragAvertizareMth = null;
      } else {
        payload.intervalMth = Number(modalNormaIntervalMth);
        payload.pragAvertizareMth = Number(modalNormaPragMth);
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



  // Calcule & Filtrare Stocuri Fluide
  const totalVolumFluide = stocUleiuri.reduce((acc, s) => acc + (Number(s.stocCurent) || 0), 0);
  const totalValoareFluide = stocUleiuri.reduce((acc, s) => acc + ((Number(s.stocCurent) || 0) * (Number(s.pretUnitar) || 0)), 0);
  const fluideCriticeCount = stocUleiuri.filter((s) => (Number(s.stocCurent) || 0) <= (Number(s.stocMinim) || 0)).length;
  const totalSubcategoriiFluide = categoriiFluide.reduce((acc, c) => acc + (c.subcategorii?.length || 0), 0);

  const stocUleiuriFiltrate = stocUleiuri.filter((s) => {
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
    // Filtru stare
    if (selectedStatusStoc === 'CRITIC') {
      if ((Number(s.stocCurent) || 0) > (Number(s.stocMinim) || 0)) return false;
    } else if (selectedStatusStoc === 'OPTIM') {
      if ((Number(s.stocCurent) || 0) <= (Number(s.stocMinim) || 0)) return false;
    }
    return true;
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
            <span>+ Înregistrează Intervenție</span>
          </button>
        </div>
      </div>

      {/* BANNER ALERTE ACTIVE SCHIMB ULEI & FLUIDE */}
      {alerte.length > 0 && (
        <div className="p-4 rounded-2xl bg-roseash-100 border-2 border-roseash-300 space-y-3 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-terracotta-700 font-extrabold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-terracotta-600 animate-bounce" />
              <span>Alerte Active Schimb Ulei & Fluide ({alerte.length} active):</span>
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
                      onClick={() => handleOpenCompletare(a.vehiculId, a.tipLichid)}
                      className="px-2.5 py-1 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold shadow-xs transition flex items-center space-x-1"
                    >
                      <Droplets className="w-3 h-3" />
                      <span>Înregistrează Intervenție</span>
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
          onClick={() => setActiveTab('stocuri')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'stocuri'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Stocuri & Categorii Fluide</span>
          {fluideCriticeCount > 0 ? (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'stocuri' ? 'bg-roseash-200 text-terracotta-800' : 'bg-roseash-100 text-terracotta-700 border border-roseash-300'
            }`}>
              {fluideCriticeCount} alertă
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'stocuri' ? 'bg-white/20 text-white' : 'bg-morning-200 text-slate-700'
            }`}>
              {stocUleiuri.length}
            </span>
          )}
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
                <select
                  value={selectedDepozitStoc}
                  onChange={(e) => setSelectedDepozitStoc(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="">Toate Depozitele</option>
                  {depoziteList.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </select>

                {/* Filtru Categorie Fluid */}
                <select
                  value={selectedCategorieStoc}
                  onChange={(e) => setSelectedCategorieStoc(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="">Toate Categoriile de Fluide</option>
                  {categoriiFluide.map((c: any) => (
                    <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                  ))}
                </select>

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
                  <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider">
                    <th className="p-3">Articol Fluid & Marcă</th>
                    <th className="p-3">Categorie & Subtip</th>
                    <th className="p-3">Depozit Gestiune</th>
                    <th className="p-3 text-right">Stoc Curent</th>
                    <th className="p-3 text-right">Prag Alertă (Minim)</th>
                    <th className="p-3 text-center">Stare Stoc</th>
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
                      const esteCritic = stocNum <= minimNum;
                      const esteEpuizat = stocNum <= 0;
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

                          {/* 2. Categorie & Subcategorie */}
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded-lg bg-sapphire-100 text-sapphire-900 font-bold text-[10px]">
                                {s.categorie}
                              </span>
                              {s.subcategorie && (
                                <p className="text-[11px] text-sage-600 font-medium">
                                  ▸ {s.subcategorie}
                                </p>
                              )}
                            </div>
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
                                onClick={() => {
                                  setSelectedArticolStocId(s.id);
                                  setIesireMarca(s.marcaUlei || s.denumire);
                                  handleOpenCompletare();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-[11px] shadow-xs transition flex items-center space-x-1 cursor-pointer"
                                title="Înregistrează completare ulei pe utilaj"
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
                    onClick={() => handleOpenModalNorma(selectedCatObj.nume, 'ULEI_MOTOR')}
                    className="px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Configurează Normă Nouă</span>
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
                    className={`px-3 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer ${
                      selectedGroupFilter === 'MTH'
                        ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                        : 'bg-morning-100 text-slate-700 hover:bg-morning-200 font-semibold'
                    }`}
                  >
                    <span>🚜 Utilaje Șantier (mTH)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupFilter('KM')}
                    className={`px-3 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer ${
                      selectedGroupFilter === 'KM'
                        ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                        : 'bg-morning-100 text-slate-700 hover:bg-morning-200 font-semibold'
                    }`}
                  >
                    <span>🚚 Transport Rutier (KM)</span>
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
                    const icon = getCategoryIcon(cat.nume);
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
                          <span className="text-xl" role="img" aria-label={cat.nume}>
                            {icon}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                              isSelected
                                ? isKm ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                                : isKm ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isKm ? 'KM' : 'mTH'}
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
                              {numarNorme > 0 ? `${numarNorme} norme` : 'Implicite'}
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
                    const fluid = (TIP_LICHID_LABELS[n.tipLichid] || n.tipLichid || '').toLowerCase();
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
                          <th className="p-3">Tip Lubrifiant / Fluid</th>
                          <th className="p-3 font-mono">Interval Normat</th>
                          <th className="p-3 font-mono">Marjă Avertizare</th>
                          <th className="p-3">Utilaje Afectate</th>
                          <th className="p-3 text-right">Acțiuni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-200">
                        {allNorms.map((norma: any) => {
                          const isKm = (norma.categorieTipMasurare || 'KM').toUpperCase() === 'KM';
                          const fluidLabel = TIP_LICHID_LABELS[norma.tipLichid] || norma.tipLichid?.replace(/_/g, ' ');

                          return (
                            <tr key={norma.id} className="hover:bg-morning-50 transition">
                              <td className="p-3 font-bold text-sapphire-900">
                                <div className="flex items-center space-x-2">
                                  <span>{getCategoryIcon(norma.categorieNume)}</span>
                                  <span>{norma.categorieNume?.replace(/_/g, ' ')}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    isKm ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isKm ? 'KM' : 'mTH'}
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
                                  {isKm
                                    ? `${norma.intervalKm ? Number(norma.intervalKm).toLocaleString('ro-RO') : '—'} KM`
                                    : `${norma.intervalMth ? Number(norma.intervalMth).toLocaleString('ro-RO') : '—'} mTH`}
                                </div>
                                {norma.intervalLuni && (
                                  <div className="text-[10px] font-medium text-sage-600">
                                    sau maxim {norma.intervalLuni} luni
                                  </div>
                                )}
                              </td>
                              <td className="p-3 font-mono font-semibold text-terracotta-700">
                                <div>
                                  {isKm
                                    ? `${norma.pragAvertizareKm ? Number(norma.pragAvertizareKm).toLocaleString('ro-RO') : '1.000'} KM`
                                    : `${norma.pragAvertizareMth ? Number(norma.pragAvertizareMth).toLocaleString('ro-RO') : '50'} mTH`}
                                </div>
                                {norma.pragAvertizareLuni && (
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
                    <span className="text-3xl p-2 rounded-xl bg-morning-100">
                      {getCategoryIcon(selectedCatObj.nume)}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-sapphire-900 tracking-tight">
                          {selectedCatObj.nume.replace(/_/g, ' ')}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase ${
                            isCatKm ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Contor: {isCatKm ? 'Kilometri (KM)' : 'Ore Funcționare (mTH)'}
                        </span>
                      </div>
                      <p className="text-xs text-sage-600 font-medium mt-0.5">
                        {selectedCatObj.totalVehicule} utilaje active în flotă • {selectedCatObj.descriere || 'Gestiune norme și mentenanță preventivă'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs font-bold text-slate-700 bg-morning-100 px-3 py-1.5 rounded-xl border border-morning-200">
                      {selectedCatObj.norme?.length || 0} din {FLUIDE_CATEGORII_CONFIG.length} fluide configurate
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenModalNorma(selectedCatObj.nume, 'ULEI_MOTOR')}
                      className="px-3.5 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adaugă Normă</span>
                    </button>
                  </div>
                </div>

                {/* GRID CARDURI INTERACTIVE PENTRU TOATE FLUIDELE DIN CATEGORIE */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FLUIDE_CATEGORII_CONFIG.map((fluid) => {
                    const existingNorm = (selectedCatObj.norme || []).find((n: any) => n.tipLichid === fluid.key);
                    const isCustom = !!existingNorm;

                    // Valori afișate (personalizate sau standard de referință)
                    const displayInterval = isCustom
                      ? isCatKm
                        ? `${Number(existingNorm.intervalKm).toLocaleString('ro-RO')} KM`
                        : `${Number(existingNorm.intervalMth).toLocaleString('ro-RO')} mTH`
                      : isCatKm
                      ? `${fluid.key === 'ULEI_MOTOR' ? '15.000' : '30.000'} KM (Standard)`
                      : `${fluid.key === 'ULEI_MOTOR' ? '250' : '500'} mTH (Standard)`;

                    const displayTimp = isCustom && existingNorm.intervalLuni
                      ? `sau maxim ${existingNorm.intervalLuni} luni`
                      : 'sau 12 luni';

                    const displayAvertizare = isCustom
                      ? isCatKm
                        ? `cu ${Number(existingNorm.pragAvertizareKm || 1000).toLocaleString('ro-RO')} KM înainte`
                        : `cu ${Number(existingNorm.pragAvertizareMth || 50).toLocaleString('ro-RO')} mTH înainte`
                      : isCatKm
                      ? 'cu 1.000 KM înainte'
                      : 'cu 50 mTH înainte';

                    return (
                      <div
                        key={fluid.key}
                        className={`pleasant-card rounded-2xl p-5 border transition flex flex-col justify-between space-y-4 bg-white shadow-2xs hover:shadow-sm ${
                          isCustom
                            ? 'border-sapphire-300 ring-1 ring-sapphire-100'
                            : 'border-morning-200 hover:border-morning-300'
                        }`}
                      >
                        {/* ANTET CARD FLUID */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`p-2 rounded-xl ${
                                  fluid.accentColor === 'amber'
                                    ? 'bg-amber-100 text-amber-800'
                                    : fluid.accentColor === 'blue'
                                    ? 'bg-blue-100 text-blue-800'
                                    : fluid.accentColor === 'indigo'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : fluid.accentColor === 'emerald'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : fluid.accentColor === 'rose'
                                    ? 'bg-roseash-100 text-terracotta-700'
                                    : 'bg-morning-200 text-sapphire-900'
                                }`}
                              >
                                <Droplets className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-extrabold text-sm text-sapphire-900">{fluid.nume}</h4>
                                <span className="text-[10px] font-mono text-sage-500 uppercase">{fluid.key}</span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                isCustom
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-morning-100 text-slate-500 border border-morning-200'
                              }`}
                            >
                              {isCustom ? 'Normă Activă' : 'Implicit'}
                            </span>
                          </div>

                          <p className="text-[11px] text-sage-600 line-clamp-2 leading-relaxed">
                            {fluid.descriere}
                          </p>
                        </div>

                        {/* METRICI CARD */}
                        <div className="p-3.5 bg-morning-50/70 rounded-xl border border-morning-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-sage-600">Interval Schimb:</span>
                            <div className="text-right">
                              <span className="font-mono font-black text-sm text-sapphire-900 block">
                                {displayInterval}
                              </span>
                              <span className="text-[10px] font-medium text-sage-500">
                                {displayTimp}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-morning-200/80 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-sage-600">Prag Avertizare:</span>
                            <span className="font-mono font-bold text-xs text-terracotta-700">
                              {displayAvertizare}
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
                                  onClick={() => handleStergeConfigCategorie(existingNorm.id, fluid.key)}
                                  title="Resetează la valoarea implicită"
                                  className="p-1.5 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 rounded-lg transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenModalNorma(selectedCatObj.nume, fluid.key)}
                                  className="px-3 py-1.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 font-bold text-xs border border-sapphire-200 transition flex items-center space-x-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Editează</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenModalNorma(selectedCatObj.nume, fluid.key)}
                                className="px-3 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-2xs transition flex items-center space-x-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Configurează</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                      onClick={() => handleOpenCompletare(a.vehiculId, a.tipLichid)}
                      className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1"
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>Înregistrează Intervenție</span>
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
                  <h3 className="text-base font-extrabold text-sapphire-900">Înregistrare Intervenție Fluid</h3>
                  <p className="text-[11px] text-sage-600 font-medium">Completare nivel sau schimb complet — scădere automată din stoc</p>
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
                         {v.numarIntern} ({v.numarInmatriculare}) - {v.marca}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Operațiune:</label>
                  <select
                    value={iesireOperatiune}
                    onChange={(e) => setIesireOperatiune(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="COMPLETARE_ULEI">Completare Nivel (Top-up)</option>
                    <option value="SCHIMB_ULEI">Schimb Complet (Înlocuire & Resetare Contor)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Fluid / Lubrifiant:</label>
                  <select
                    value={iesireTipLichid}
                    onChange={(e) => {
                      setIesireTipLichid(e.target.value);
                      setArataToateFluidele(false);
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="ULEI_MOTOR">Ulei Motor</option>
                    <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                    <option value="ULEI_TRANSMISIE">Ulei Transmisie & Diferențial</option>
                    <option value="ANTIGEL_G12">Antigel G12+ (Lichid Răcire Roz)</option>
                    <option value="ANTIGEL_G11">Antigel G11 (Lichid Răcire Albastru)</option>
                    <option value="ADBLUE">AdBlue (Uree 32.5%)</option>
                    <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                    <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                    <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                    <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sage-700 font-bold">Articol Fluid / Ulei din Stoc:</label>
                    {articoleStocFiltrate.length > 0 && !arataToateFluidele && (
                      <span className="text-[10px] text-sapphire-700 font-bold bg-sapphire-100 px-1.5 py-0.5 rounded">
                        {articoleStocFiltrate.length} {articoleStocFiltrate.length === 1 ? 'articol' : 'articole'}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedArticolStocId}
                    onChange={(e) => {
                      setSelectedArticolStocId(e.target.value);
                      const item = stocUleiuri.find((s: any) => s.id === e.target.value);
                      if (item) setIesireMarca(item.marcaUlei || item.denumire);
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  >
                    {articoleStocFiltrate.length === 0 ? (
                      <option value="">
                        {`⚠️ Niciun articol disponibil în stoc pentru această categorie`}
                      </option>
                    ) : (
                      articoleStocFiltrate.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.denumire} {s.subcategorie ? `(${s.subcategorie})` : ''} • Stoc: {s.stocCurent} {s.unitateMasura || 'L'} • {s.pretUnitar} RON/L
                        </option>
                      ))
                    )}
                  </select>

                  {articoleStocFiltrate.length === 0 && (
                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between gap-2">
                      <span>Nu există în stoc fluide pentru <strong>{TIP_LICHID_LABELS[iesireTipLichid] || iesireTipLichid}</strong>.</span>
                      <button
                        type="button"
                        onClick={() => setArataToateFluidele(true)}
                        className="text-sapphire-700 underline font-bold whitespace-nowrap hover:text-sapphire-900"
                      >
                        Afișează toate
                      </button>
                    </div>
                  )}

                  {arataToateFluidele && (
                    <div className="mt-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setArataToateFluidele(false)}
                        className="text-[11px] text-sapphire-600 underline hover:text-sapphire-800"
                      >
                        ← Filtrează strict după {TIP_LICHID_LABELS[iesireTipLichid] || 'categoria selectată'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 p-2.5 bg-sapphire-50 border border-sapphire-200 rounded-xl text-[11px] text-sapphire-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-sapphire-600 shrink-0" />
                  <span>
                    <b>Consum Automat FIFO:</b> Cantitatea consumată va fi dedusă automat din cele mai vechi loturi de intrare din depozit, la costul real ponderat de achiziție.
                  </span>
                </div>

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
                  <span className="text-[10px] text-sage-500 mt-0.5 block">
                    Data efectuării completării (permite înregistrare retroactivă, ex: ieri).
                  </span>
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
                  <label className="text-sage-700 block mb-1 font-bold flex items-center justify-between">
                    <span>Index Contor Utilaj la Completare:</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sapphire-100 text-sapphire-700 font-mono">
                      {currentVehicul?.tipMasurare || 'KM'}
                    </span>
                  </label>
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
                         {m.nume} ({m.functie || 'Mecanic'})
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
                  onChange={(e) => setNewPragAlert(Number(e.target.value))}
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
                <select
                  value={targetCatForSubcat}
                  onChange={(e) => setTargetCatForSubcat(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {categoriiFluide.map((c) => (
                    <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                  ))}
                </select>
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
        const isKm = (cat?.tipMasurareImplicit || 'KM').toUpperCase() === 'KM';
        const fluidConfig = FLUIDE_CATEGORII_CONFIG.find((f) => f.key === modalNormaTipLichid);
        const fluidLabel = TIP_LICHID_LABELS[modalNormaTipLichid] || modalNormaTipLichid?.replace(/_/g, ' ');

        // Calcule pentru bara vizuală interactivă (Timeline Gauge)
        const intervalVal = isKm ? Number(modalNormaIntervalKm || 0) : Number(modalNormaIntervalMth || 0);
        const pragVal = isKm ? Number(modalNormaPragKm || 0) : Number(modalNormaPragMth || 0);
        const warnStartVal = Math.max(0, intervalVal - pragVal);
        const unitate = isKm ? 'KM' : 'mTH';

        const warnPercent = intervalVal > 0 ? Math.min(100, Math.max(10, Math.round((pragVal / intervalVal) * 100))) : 20;
        const okPercent = 100 - warnPercent;

        const presets = isKm
          ? [10000, 15000, 20000, 30000, 50000, 100000]
          : [100, 250, 500, 1000, 1500, 2000];

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
                          isKm ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isKm ? 'Rutier • KM' : 'Utilaj Șantier • mTH'}
                      </span>
                    </div>
                    <p className="text-xs text-sage-600 font-medium mt-0.5">
                      {getCategoryIcon(modalNormaCategorie)} Categorie: <strong className="text-sapphire-900">{modalNormaCategorie?.replace(/_/g, ' ')}</strong> ({cat?.totalVehicule || 0} utilaje) • Fluid: <strong className="text-sapphire-900">{fluidLabel}</strong>
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
                {/* Selector Tip Fluid */}
                <div>
                  <label className="text-xs font-bold text-sapphire-900 block mb-1.5">
                    Selectează Tipul de Lubrifiant / Fluid:
                  </label>
                  <select
                    value={modalNormaTipLichid}
                    onChange={(e) => {
                      const newTip = e.target.value;
                      setModalNormaTipLichid(newTip);
                      const existing = (cat?.norme || []).find((n: any) => n.tipLichid === newTip);
                      if (existing) {
                        setModalNormaIntervalKm(existing.intervalKm || 15000);
                        setModalNormaPragKm(existing.pragAvertizareKm || 1000);
                        setModalNormaIntervalMth(existing.intervalMth || 250);
                        setModalNormaPragMth(existing.pragAvertizareMth || 50);
                        setModalNormaIntervalLuni(existing.intervalLuni || 12);
                        setModalNormaPragLuni(existing.pragAvertizareLuni || 1);
                      } else {
                        if (isKm) {
                          setModalNormaIntervalKm(newTip === 'ULEI_MOTOR' ? 15000 : 30000);
                          setModalNormaPragKm(1000);
                        } else {
                          setModalNormaIntervalMth(newTip === 'ULEI_MOTOR' ? 250 : 500);
                          setModalNormaPragMth(50);
                        }
                      }
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                  >
                    {FLUIDE_CATEGORII_CONFIG.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.nume} ({f.key})
                      </option>
                    ))}
                  </select>
                  {fluidConfig?.descriere && (
                    <p className="text-[11px] text-sage-500 mt-1 italic">
                      {fluidConfig.descriere}
                    </p>
                  )}
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
                      const isCurrent = isKm ? modalNormaIntervalKm === val : modalNormaIntervalMth === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            if (isKm) {
                              setModalNormaIntervalKm(val);
                              // Auto ajustare prag sugerat (8-10% din interval)
                              const suggestedPrag = Math.max(500, Math.round((val * 0.08) / 500) * 500);
                              setModalNormaPragKm(suggestedPrag);
                            } else {
                              setModalNormaIntervalMth(val);
                              const suggestedPrag = Math.max(25, Math.round((val * 0.1) / 10) * 10);
                              setModalNormaPragMth(suggestedPrag);
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

                {/* Câmpuri de Intrare: KM vs MTH (Strict separate) */}
                <div className="p-4 bg-white rounded-xl border border-morning-200 space-y-3">
                  <h4 className="text-xs font-bold text-sapphire-900 flex items-center space-x-1.5">
                    <Gauge className="w-4 h-4 text-sapphire-600" />
                    <span>Configurare Contor Principal ({isKm ? 'Kilometri — KM' : 'Ore Funcționare — mTH'})</span>
                  </h4>

                  {isKm ? (
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
                        <p className="text-[10px] text-sage-500 mt-1">
                          La atingerea acestui rulaj, pachetul de schimb devine <strong>Depășit</strong>.
                        </p>
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
                            placeholder="ex: 1000"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500 font-mono">
                            KM
                          </span>
                        </div>
                        <p className="text-[10px] text-sage-500 mt-1">
                          Alertă galbenă înainte de termen (ex: {modalNormaPragKm} KM înainte).
                        </p>
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
                            placeholder="ex: 250"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500 font-mono">
                            mTH
                          </span>
                        </div>
                        <p className="text-[10px] text-sage-500 mt-1">
                          La atingerea acestor ore de funcționare, norma devine <strong>Depășită</strong>.
                        </p>
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
                        <p className="text-[10px] text-sage-500 mt-1">
                          Alertă galbenă înainte de termen (ex: cu {modalNormaPragMth} mTH înainte).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Câmpuri Opționale: Limită Calendaristică (Luni) */}
                <div className="p-4 bg-white rounded-xl border border-morning-200 space-y-3">
                  <h4 className="text-xs font-bold text-sapphire-900 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-sapphire-600" />
                    <span>Interval Calendaristic Alternativ (Timp de Îmbătrânire Ulei)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-sage-700 block mb-1">
                        Interval Maxim Calendaristic (Luni):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={modalNormaIntervalLuni}
                          onChange={(e) => setModalNormaIntervalLuni(Number(e.target.value))}
                          className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500 pr-12"
                          placeholder="ex: 12"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500">
                          luni
                        </span>
                      </div>
                      <p className="text-[10px] text-sage-500 mt-1">
                        Schimb chiar dacă rulajul nu a fost atins (ex: 12 luni).
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-sage-700 block mb-1">
                        Marjă Avertizare Timp (Luni):
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="6"
                          value={modalNormaPragLuni}
                          onChange={(e) => setModalNormaPragLuni(Number(e.target.value))}
                          className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-mono font-bold focus:outline-none focus:border-sapphire-500 pr-12"
                          placeholder="ex: 1"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-sage-500">
                          luni
                        </span>
                      </div>
                      <p className="text-[10px] text-sage-500 mt-1">
                        Alertă galbenă cu X luni înainte de termenul calendaristic.
                      </p>
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
                <div className="flex justify-end space-x-2.5 pt-3 border-t border-morning-200 shrink-0">
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
                        <span>Salvează Norma de Categorie</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
