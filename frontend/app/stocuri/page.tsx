"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PackageCheck, ShieldAlert, FileText, Wrench, AlertTriangle, CheckCircle, Plus,
  Filter, Edit3, X, ShoppingCart, History, Trash2, Search, Building2, Layers, AlertCircle,
  ArrowRight, ShieldCheck, ArrowLeftRight, CircleDot, Tag, Truck, RotateCcw, CheckCircle2, Check
} from 'lucide-react';
import { showConfirm, showToast } from '@/lib/swal';
import { useTabWorkspace } from '@/lib/TabWorkspaceContext';
import {
  FALLBACK_TIPURI_FLUIDE,
  TipFluidDef,
  getTipFluidLabel,
  isFluidCategoryOrItem,
  normalizeTipuriFluideList,
} from '@/lib/fluids';
import { isTireCategoryName, isTireItem } from '@/lib/tires';

const getComponentaStatusMeta = (stareRaw?: string | null) => {
  const stare = String(stareRaw || 'IN_STOC').toUpperCase();
  switch (stare) {
    case 'MONTAT':
    case 'MONTATA':
      return {
        code: 'MONTAT',
        label: 'Montat pe Utilaj',
        badgeClass: 'bg-sapphire-50 border-sapphire-200 text-sapphire-700',
      };
    case 'DEFECT':
      return {
        code: 'DEFECT',
        label: 'Defect / Revendicare Garanție',
        badgeClass: 'bg-amber-50 border-amber-300 text-amber-800',
      };
    case 'CASAT':
    case 'CASATA':
      return {
        code: 'CASAT',
        label: 'Casat / Retras din Uz',
        badgeClass: 'bg-rose-50 border-rose-300 text-rose-700',
      };
    case 'IN_STOC':
      return {
        code: 'IN_STOC',
        label: 'În Stoc Magazie',
        badgeClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      };
    default:
      return {
        code: stare,
        label: stare,
        badgeClass: 'bg-morning-100 border-morning-300 text-slate-700',
      };
  }
};

/** Matches an existing option name case-insensitively so HTML <select> reflects stored DB values. */
const resolveCanonicalOption = (options: Array<{ nume?: string }>, raw?: string | null): string => {
  const clean = String(raw || '').trim();
  if (!clean) return '';
  const match = options.find((o) => String(o.nume || '').trim().toLowerCase() === clean.toLowerCase());
  return match?.nume || clean;
};

/** Flags serialized tire entries that appear to be non-tire items imported by mistake (e.g. paint). */
const looksLikeNonTireEntry = (anv: any): boolean => {
  const mrc = String(anv?.marca || '');
  const mdl = String(anv?.model || '');
  const hasExplicitDim = /\b\d{2,3}(?:\/\d{2,3})?\s*R\s*\d{2}(?:\.\d+)?C?\b/i.test(`${mrc} ${mdl}`);
  if (hasExplicitDim) return false;
  return (
    /generic|nespecificat/i.test(mrc) ||
    /\b(?:vopsea|t\*vop|kober|diluant|grund|email|spray|ulei|antigel|vaselina|surub|piulita|tabla|teava|tevi|profil|electrod)\b/i.test(
      `${mrc} ${mdl}`,
    )
  );
};

/** Normalizes text for case- and diacritic-insensitive search matching. */
const normalizeSearchText = (value?: string | null): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Returns true when every whitespace-separated search token appears across the given fields. */
const matchesSearchTokens = (fields: Array<string | null | undefined>, query?: string): boolean => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = fields.map((f) => normalizeSearchText(f)).join(' ');
  return tokens.every((token) => haystack.includes(token));
};

function StocuriGarantiiContent() {
  const { openTab } = useTabWorkspace();
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const depozitIdParam = searchParams?.get('depozitId');
  const serieParam = searchParams?.get('serie');

  const handleOpenFacturaInEfactura = (numarFactura?: string) => {
    if (!numarFactura || numarFactura === 'Fără Număr' || numarFactura === '-') return;
    openTab({
      id: '/efactura?tab=efactura',
      title: `Factură: ${numarFactura}`,
      href: `/efactura?tab=efactura&search=${encodeURIComponent(numarFactura)}`,
      iconName: 'FileText',
    });
  };

  const [stocuri, setStocuri] = useState<any[]>([]);
  const [componente, setComponente] = useState<any[]>([]);
  const [intrariHistory, setIntrariHistory] = useState<any[]>([]);
  const [categorii, setCategorii] = useState<any[]>([]);
  const [depozite, setDepozite] = useState<any[]>([]);
  const [stocuriCritice, setStocuriCritice] = useState<any[]>([]);
  const [transferuriHistory, setTransferuriHistory] = useState<any[]>([]);
  const [mecanici, setMecanici] = useState<any[]>([]);

  // Stare Vizualizare Loturi FIFO & Trasabilitate Facturi
  const [viewingFifoArticol, setViewingFifoArticol] = useState<any>(null);
  const [fifoLoturiList, setFifoLoturiList] = useState<any[]>([]);
  const [loadingFifoLoturi, setLoadingFifoLoturi] = useState(false);

  // Stoc Anvelope Serializate pe Bucată (Magazie Anvelope)
  const [anvelopeStocList, setAnvelopeStocList] = useState<any[]>([]);
  const [anvelopeStocSearch, setAnvelopeStocSearch] = useState('');
  const [anvelopeStocFilterState, setAnvelopeStocFilterState] = useState<'ALL' | 'NOUA' | 'RULATA'>('ALL');
  const [anvelopeStocDepozitFilter, setAnvelopeStocDepozitFilter] = useState('');
  const [editingAnvelopaStoc, setEditingAnvelopaStoc] = useState<any>(null);
  const [showAddAnvelopeStocModal, setShowAddAnvelopeStocModal] = useState(false);
  const [newBatchAnv, setNewBatchAnv] = useState<any>({
    marca: 'BENCHMARK',
    model: 'KMD406 TRACTION',
    dimensiune: '315/80 R22.5',
    codDot: '2625',
    adancimeMm: 16,
    pretAchizitie: 1286.59,
    depozitId: '',
    cantitate: 4,
    serii: ['', '', '', ''],
  });

  // Filtre Multi-Criteriu Stoc Piese
  const [hideZeroStock, setHideZeroStock] = useState(true);
  const [selectedCategorieFilter, setSelectedCategorieFilter] = useState('');
  const [selectedSubcategorieFilter, setSelectedSubcategorieFilter] = useState('');
  const [selectedDepozitFilter, setSelectedDepozitFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TOATE'); // TOATE, CRITIC, IN_STOC
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'depozite' | 'stoc' | 'anvelope_stoc' | 'componente'>('depozite');
  const [highlightedTireSerie, setHighlightedTireSerie] = useState<string | null>(null);

  // Ascultăm schimbarea tab-ului și a filtrelor de depozit / serie din URL
  useEffect(() => {
    if (tabParam && ['stoc', 'anvelope_stoc', 'depozite', 'componente'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
    if (tabParam === 'anvelope_stoc') {
      setAnvelopeStocDepozitFilter(depozitIdParam || '');
      if (depozitIdParam !== null || serieParam !== null) {
        setAnvelopeStocFilterState('ALL');
        setAnvelopeStocSearch('');
      }
      if (serieParam) {
        setHighlightedTireSerie(serieParam);
      }
    } else if (depozitIdParam) {
      setSelectedDepozitFilter(depozitIdParam);
    }
  }, [tabParam, depozitIdParam, serieParam]);

  useEffect(() => {
    if (!highlightedTireSerie || activeTab !== 'anvelope_stoc' || anvelopeStocList.length === 0) return;
    const match = anvelopeStocList.find(
      (a) => String(a.serieAnvelopa || '').trim().toLowerCase() === highlightedTireSerie.trim().toLowerCase(),
    );
    if (!match) return;
    const el = document.getElementById(`tire-stock-card-${match.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const timer = setTimeout(() => setHighlightedTireSerie(null), 5000);
    return () => clearTimeout(timer);
  }, [highlightedTireSerie, activeTab, anvelopeStocList]);

  // Modale
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showAddSubcatModal, setShowAddSubcatModal] = useState(false);
  const [showAddDepozitModal, setShowAddDepozitModal] = useState(false);
  const [editingDepozit, setEditingDepozit] = useState<any>(null);

  // Modál Transfer Parțial
  const [transferArticol, setTransferArticol] = useState<any>(null);
  const [transferDepozitDestinatieId, setTransferDepozitDestinatieId] = useState('');
  const [transferCantitate, setTransferCantitate] = useState(1);
  const [transferOperator, setTransferOperator] = useState('Brașoveanu Virgil (Șef Atelier)');
  const [transferObservatii, setTransferObservatii] = useState('');

  // Stare Creare Articol Simplu
  const [codArticol, setCodArticol] = useState('');
  const [denumire, setDenumire] = useState('');
  const [categorie, setCategorie] = useState('PIESE_AUTO');
  const [subcategorie, setSubcategorie] = useState('');
  const [articolTipLichid, setArticolTipLichid] = useState('');
  const [depozitId, setDepozitId] = useState('');
  const [stocCurent, setStocCurent] = useState(10);
  const [stocMinim, setStocMinim] = useState(5);
  const [pretUnitar, setPretUnitar] = useState(100);
  const [unitateMasura, setUnitateMasura] = useState('buc');

  // Tipuri Lubrifianți (Master Registry)
  const [tipuriFluide, setTipuriFluide] = useState<TipFluidDef[]>(FALLBACK_TIPURI_FLUIDE);

  // Stare Creare Categorie / Subcategorie Nouă
  const [numeCategorieNoua, setNumeCategorieNoua] = useState('');
  const [descriereCatNoua, setDescriereCatNoua] = useState('');
  const [stocMinimImplicitCat, setStocMinimImplicitCat] = useState(5);
  const [numeSubcatNoua, setNumeSubcatNoua] = useState('');
  const [subcatTipLichidNou, setSubcatTipLichidNou] = useState('');
  const [targetCatForSubcat, setTargetCatForSubcat] = useState('PIESE_AUTO');

  // Stare Creare / Editare Depozit Nou
  const [numeDepozitNou, setNumeDepozitNou] = useState('');
  const [adresaDepozitNou, setAdresaDepozitNou] = useState('');
  const [responsabilDepozitNou, setResponsabilDepozitNou] = useState('');

  // Stare Formular Recepție Marfă pe Factură
  const [bevCodArticol, setBevCodArticol] = useState('');
  const [bevDenumire, setBevDenumire] = useState('');
  const [bevCategorie, setBevCategorie] = useState('PIESE_AUTO');
  const [bevSubcategorie, setBevSubcategorie] = useState('');
  const [bevDepozitId, setBevDepozitId] = useState('');
  const [bevTipLichid, setBevTipLichid] = useState('NICIUNUL');
  const [bevMarcaUlei, setBevMarcaUlei] = useState('');
  const [bevFurnizor, setBevFurnizor] = useState('');
  const [bevNumarFactura, setBevNumarFactura] = useState('');
  const [bevDataFactura, setBevDataFactura] = useState(new Date().toISOString().split('T')[0]);
  const [bevCantitate, setBevCantitate] = useState(10);
  const [bevPretTotal, setBevPretTotal] = useState(1500);
  const [bevUM, setBevUM] = useState('buc');
  const [bevObservatii, setBevObservatii] = useState('');

  // Garanție la Recepție
  const [bevAreGarantie, setBevAreGarantie] = useState(false);
  const [bevSerieUnica, setBevSerieUnica] = useState('');
  const [bevDurataGarantieLuni, setBevDurataGarantieLuni] = useState(24);
  const [bevDurataGarantieRulaj, setBevDurataGarantieRulaj] = useState(2000);

  // Editare & Demontare Modale + Schimbare Categorie/Subcategorie Inline
  const [editingArticol, setEditingArticol] = useState<any>(null);
  const [inlineCatEdit, setInlineCatEdit] = useState<{
    id: string;
    categorie: string;
    subcategorie: string;
    addingCat?: boolean;
    newCat?: string;
    addingSubcat?: boolean;
    newSubcat?: string;
    saving?: boolean;
  } | null>(null);
  const [quickCatTarget, setQuickCatTarget] = useState<'EDIT_MODAL' | 'RECLASSIFY' | null>(null);
  const [quickCatDraft, setQuickCatDraft] = useState('');
  const [quickSubcatTarget, setQuickSubcatTarget] = useState<'EDIT_MODAL' | 'RECLASSIFY' | null>(null);
  const [quickSubcatDraft, setQuickSubcatDraft] = useState('');
  const [savingQuickTaxonomy, setSavingQuickTaxonomy] = useState(false);

  // Reclasificare Articol din Magazie Anvelope -> Gestiune Piese
  const [reclassifyMode, setReclassifyMode] = useState(false);
  const [reclassifyData, setReclassifyData] = useState({
    denumire: '',
    categorie: 'Alte',
    subcategorie: 'Alte piese',
    depozitId: '',
  });
  const [reclassifying, setReclassifying] = useState(false);

  const [selectedComp, setSelectedComp] = useState<any>(null);
  const [motivDemontare, setMotivDemontare] = useState('');
  const [popupGarantie, setPopupGarantie] = useState<any>(null);

  const stocRequestSeqRef = useRef(0);

  const fetchMetadata = async () => {
    try {
      const fetchJsonSafe = async (url: string) => {
        const res = await fetch(url);
        return res.ok ? res.json() : null;
      };

      const fetchCategoriiWithRetry = async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const resCat = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`);
            if (resCat.ok) {
              const catData = await resCat.json();
              const allCats = [
                ...(Array.isArray(catData.categoriiImplicite) ? catData.categoriiImplicite : []),
                ...(Array.isArray(catData.categoriiCustom) ? catData.categoriiCustom : []),
              ];
              if (allCats.length > 0) return allCats;
            }
          } catch (err) {
            console.warn(`Tentativă ${attempt + 1} la încărcare categorii stoc:`, err);
          }
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        return null;
      };

      const [depRes, catRes, critRes, intrariRes, transRes, compRes, mecaniciRes, anvStocRes, tipuriRes] =
        await Promise.allSettled([
          fetchJsonSafe(`${API_BASE_URL}/stocuri-garantii/depozite`),
          fetchCategoriiWithRetry(),
          fetchJsonSafe(`${API_BASE_URL}/stocuri-garantii/stocuri-critice`),
          fetchJsonSafe(`${API_BASE_URL}/stocuri-garantii/intrare-stoc`),
          fetchJsonSafe(`${API_BASE_URL}/stocuri-garantii/istoric-transferuri`),
          fetchJsonSafe(`${API_BASE_URL}/stocuri-garantii/componente-serializate`),
          fetchJsonSafe(`${API_BASE_URL}/mentenanta/mecanici`),
          fetchJsonSafe(`${API_BASE_URL}/anvelope/depozit-stoc`),
          fetchJsonSafe(`${API_BASE_URL}/anomalii/tipuri-fluide`),
        ]);

      if (depRes.status === 'fulfilled' && Array.isArray(depRes.value)) {
        const depData = depRes.value;
        setDepozite(depData);
        if (depData.length > 0) {
          setDepozitId((prev) => prev || depData[0].id);
          setBevDepozitId((prev) => prev || depData[0].id);
        }
        if (depData.length > 1) {
          setTransferDepozitDestinatieId((prev) => prev || depData[1].id);
        }
      }

      if (catRes.status === 'fulfilled' && catRes.value) {
        setCategorii(catRes.value);
        const firstNonTire = catRes.value.find((c: any) => !isTireCategoryName(c.nume))?.nume;
        if (firstNonTire) {
          setCategorie((prev) => (!prev || prev === 'PIESE_AUTO' || isTireCategoryName(prev) ? firstNonTire : prev));
          setTargetCatForSubcat((prev) => (!prev || prev === 'PIESE_AUTO' || isTireCategoryName(prev) ? firstNonTire : prev));
          setBevCategorie((prev) => (!prev || prev === 'PIESE_AUTO' || isTireCategoryName(prev) ? firstNonTire : prev));
        }
      }

      if (critRes.status === 'fulfilled' && critRes.value) {
        setStocuriCritice(critRes.value.articoleCritice || []);
      }

      if (intrariRes.status === 'fulfilled' && intrariRes.value) {
        setIntrariHistory(intrariRes.value);
      }

      if (transRes.status === 'fulfilled' && transRes.value) {
        setTransferuriHistory(transRes.value);
      }

      if (compRes.status === 'fulfilled' && compRes.value) {
        setComponente(compRes.value);
      }

      if (mecaniciRes.status === 'fulfilled' && mecaniciRes.value) {
        setMecanici(mecaniciRes.value);
      }

      if (anvStocRes.status === 'fulfilled' && anvStocRes.value) {
        setAnvelopeStocList(anvStocRes.value);
      }

      if (tipuriRes.status === 'fulfilled' && Array.isArray(tipuriRes.value)) {
        setTipuriFluide(normalizeTipuriFluideList(tipuriRes.value));
      }
    } catch (e) {
      console.log('Error fetching stock data', e);
    }
  };

  const fetchStocuri = async (signal?: AbortSignal) => {
    const seq = ++stocRequestSeqRef.current;
    try {
      const queryParams = new URLSearchParams();
      if (selectedCategorieFilter) queryParams.append('categorie', selectedCategorieFilter);
      if (selectedSubcategorieFilter) queryParams.append('subcategorie', selectedSubcategorieFilter);
      if (selectedDepozitFilter) queryParams.append('depozitId', selectedDepozitFilter);
      if (selectedStatusFilter !== 'TOATE') queryParams.append('statusStoc', selectedStatusFilter);

      const queryString = queryParams.toString();
      const resStoc = await fetch(
        `${API_BASE_URL}/stocuri-garantii/stocuri${queryString ? `?${queryString}` : ''}`,
        { signal },
      );
      if (resStoc.ok && seq === stocRequestSeqRef.current) {
        setStocuri(await resStoc.json());
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.log('Error fetching stock list', e);
      }
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchMetadata(), fetchStocuri()]);
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStocuri(controller.signal);
    return () => controller.abort();
  }, [selectedCategorieFilter, selectedSubcategorieFilter, selectedDepozitFilter, selectedStatusFilter]);

  const categoriiPiese = categorii.filter((c: any) => !isTireCategoryName(c.nume));

  const getSubcategoriiPentruCategorie = (catNume: string) => {
    const foundCat = categorii.find((c: any) => c.nume?.toLowerCase() === catNume?.toLowerCase());
    return foundCat?.subcategorii || [];
  };

  const handleCreateSubcategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeSubcatNoua || !targetCatForSubcat) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/subcategorii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorieNume: targetCatForSubcat,
          nume: numeSubcatNoua,
          tipLichid: subcatTipLichidNou.trim() || null,
        }),
      });
      if (res.ok) {
        alert('Subcategoria a fost adăugată cu succes!');
        setShowAddSubcatModal(false);
        setNumeSubcatNoua('');
        setSubcatTipLichidNou('');
        fetchData();
      }
    } catch (e) {
      alert('Eroare la adăugarea subcategoriei.');
    }
  };

  const handleOpenDepozitStoc = (depId: string) => {
    setSelectedDepozitFilter(depId);
    setActiveTab('stoc');
  };

  const handleOpenDepozitAnvelope = (depId: string) => {
    setAnvelopeStocDepozitFilter(depId);
    setAnvelopeStocFilterState('ALL');
    setAnvelopeStocSearch('');
    setActiveTab('anvelope_stoc');
  };

  const handleOpenFifoLoturi = async (articol: any) => {
    setViewingFifoArticol(articol);
    setLoadingFifoLoturi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${articol.id}/loturi`);
      if (res.ok) {
        setFifoLoturiList(await res.json());
      }
    } catch (e) {
      console.error('Eroare la încărcare loturi FIFO:', e);
    } finally {
      setLoadingFifoLoturi(false);
    }
  };

  // Handler Execuție Transfer Parțial Între Depozite (Requested by User)
  const handleExecutaTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferArticol) return;

    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/transfer-stoc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articolStocId: transferArticol.id,
          depozitDestinatieId: transferDepozitDestinatieId,
          cantitate: Number(transferCantitate),
          operator: transferOperator,
          observatii: transferObservatii,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj);
        setTransferArticol(null);
        setTransferObservatii('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare transfer: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la executarea transferului parțial.');
    }
  };

  // Creare Categorie Nouă cu Stoc Minim Implicit
  const handleCreateCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stocMinimImplicitCat < 0) {
      alert('Pragul de alertă stoc minim nu poate fi negativ!');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeCategorieNoua,
          descriere: descriereCatNoua,
          stocMinimImplicit: Math.max(0, Number(stocMinimImplicitCat) || 0),
        }),
      });

      if (res.ok) {
        setShowAddCatModal(false);
        setNumeCategorieNoua('');
        setDescriereCatNoua('');
        fetchData();
        alert(`Categorie nouă "${numeCategorieNoua}" creată cu stoc minim implicit de ${stocMinimImplicitCat}!`);
      }
    } catch (e) {
      alert('Eroare la crearea categoriei.');
    }
  };

  // Creare Depozit Nou
  const handleCreateDepozit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/depozite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeDepozitNou,
          adresa: adresaDepozitNou,
          responsabil: responsabilDepozitNou,
        }),
      });

      if (res.ok) {
        setShowAddDepozitModal(false);
        setNumeDepozitNou('');
        setAdresaDepozitNou('');
        setResponsabilDepozitNou('');
        fetchData();
        alert(`Depozit nou "${numeDepozitNou}" creat cu succes!`);
      }
    } catch (e) {
      alert('Eroare la crearea depozitului.');
    }
  };

  // Editare Depozit
  const handleUpdateDepozit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepozit) return;

    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/depozite/${editingDepozit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDepozit),
      });

      if (res.ok) {
        setEditingDepozit(null);
        fetchData();
        alert('Datele depozitului au fost actualizate!');
      }
    } catch (e) {
      alert('Eroare la actualizarea depozitului.');
    }
  };

  // Ștergere Depozit
  const handleDeleteDepozit = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Depozit',
      'Sigur doriți să ștergeți acest depozit?',
      'Da, șterge depozitul',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/depozite/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEditingDepozit(null);
        fetchData();
        alert('Depozit șters.');
      }
    } catch (e) {
      alert('Eroare la ștergerea depozitului.');
    }
  };

  // Salvare Articol Simplu
  const handleCreateArticol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTireItem({ categorie, subcategorie, denumire, codArticol })) {
      showToast(
        'Anvelopele se înregistrează exclusiv în Magazie Anvelope (tab-ul Magazie Anvelope sau meniul Anvelope), nu ca piese de atelier.',
        'warning',
        5000,
      );
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codArticol,
          denumire,
          categorie,
          subcategorie,
          tipLichid: articolTipLichid.trim() || null,
          depozitId,
          stocCurent: Number(stocCurent),
          stocMinim: Math.max(0, Number(stocMinim) || 0),
          pretUnitar: Number(pretUnitar),
          unitateMasura,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setCodArticol('');
        setDenumire('');
        setSubcategorie('');
        setArticolTipLichid('');
        fetchData();
        showToast('Articol adăugat în stoc cu succes!', 'success', 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.message || 'Nu s-a putut adăuga articolul în stoc.', 'error', 4500);
      }
    } catch (e) {
      showToast('Eroare de conexiune la adăugarea articolului.', 'error', 4000);
    }
  };

  // Salvare Recepție Marfă pe Factură
  const handleBevetelez = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/intrare-stoc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codArticol: bevCodArticol,
          denumire: bevDenumire,
          categorie: bevCategorie,
          subcategorie: bevSubcategorie,
          depozitId: bevDepozitId,
          tipLichid: bevTipLichid !== 'NICIUNUL' ? bevTipLichid : undefined,
          marcaUlei: bevMarcaUlei || undefined,
          furnizor: bevFurnizor,
          numarFactura: bevNumarFactura,
          dataFactura: bevDataFactura,
          cantitate: Number(bevCantitate),
          pretTotal: Number(bevPretTotal),
          unitateMasura: bevUM,
          observatii: bevObservatii,

          areGarantie: bevAreGarantie,
          serieUnica: bevSerieUnica || undefined,
          durataGarantieLuni: Number(bevDurataGarantieLuni),
          durataGarantieRulaj: Number(bevDurataGarantieRulaj),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data?.mesaj || 'Recepție înregistrată cu succes!', 'success', 3500);
        fetchData();
        setActiveTab(data?.tip === 'ANVELOPE_STOC' ? 'anvelope_stoc' : bevAreGarantie ? 'componente' : 'stoc');
        setBevCodArticol('');
        setBevDenumire('');
        setBevFurnizor('');
        setBevNumarFactura('');
        setBevSerieUnica('');
        setBevAreGarantie(false);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.message || 'Eroare la recepția mărfii.', 'error', 4500);
      }
    } catch (e) {
      showToast('Eroare de conexiune la recepția mărfii.', 'error', 4000);
    }
  };

  const quickCreateCategoryAndSelect = async (rawName: string, onSelect: (canonicalCat: string) => void) => {
    const cleanName = rawName.trim();
    if (!cleanName) return;
    setSavingQuickTaxonomy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nume: cleanName }),
      });
      if (res.ok) {
        const created = await res.json();
        const canonicalName = created.nume || cleanName;
        setCategorii((prev) => {
          const exists = prev.some((c: any) => String(c.nume || '').trim().toLowerCase() === canonicalName.toLowerCase());
          if (exists) return prev;
          return [...prev, { ...created, nume: canonicalName, subcategorii: created.subcategorii || [] }].sort((a, b) =>
            String(a.nume || '').localeCompare(String(b.nume || '')),
          );
        });
        onSelect(canonicalName);
        showToast(`Categoria „${canonicalName}” a fost creată!`, 'success', 2500);
        void fetchMetadata();
      } else {
        showToast('Nu s-a putut crea categoria.', 'error', 3500);
      }
    } catch {
      showToast('Eroare de conexiune la crearea categoriei.', 'error', 3500);
    } finally {
      setSavingQuickTaxonomy(false);
    }
  };

  const quickCreateSubcategoryAndSelect = async (
    catName: string,
    rawSubName: string,
    onSelect: (canonicalSub: string) => void,
  ) => {
    const cleanCat = catName.trim();
    const cleanSub = rawSubName.trim();
    if (!cleanCat || !cleanSub) return;
    setSavingQuickTaxonomy(true);
    try {
      const parentObj = categorii.find((c: any) => String(c.nume || '').trim().toLowerCase() === cleanCat.toLowerCase());
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/subcategorii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorieStocId: parentObj?.id,
          categorieNume: parentObj?.nume || cleanCat,
          nume: cleanSub,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const canonicalSub = created.nume || cleanSub;
        setCategorii((prev) => {
          const hasParent = prev.some((c: any) => String(c.nume || '').trim().toLowerCase() === cleanCat.toLowerCase());
          if (!hasParent) {
            return [...prev, { nume: cleanCat, subcategorii: [{ ...created, nume: canonicalSub }] }];
          }
          return prev.map((c: any) => {
            if (String(c.nume || '').trim().toLowerCase() !== cleanCat.toLowerCase()) return c;
            const subs = Array.isArray(c.subcategorii) ? c.subcategorii : [];
            const existsSub = subs.some((sub: any) => String(sub.nume || '').trim().toLowerCase() === canonicalSub.toLowerCase());
            if (existsSub) return c;
            return { ...c, subcategorii: [...subs, { ...created, nume: canonicalSub }] };
          });
        });
        onSelect(canonicalSub);
        showToast(`Subcategoria „${canonicalSub}” a fost creată!`, 'success', 2500);
        void fetchMetadata();
      } else {
        showToast('Nu s-a putut crea subcategoria.', 'error', 3500);
      }
    } catch {
      showToast('Eroare de conexiune la crearea subcategoriei.', 'error', 3500);
    } finally {
      setSavingQuickTaxonomy(false);
    }
  };

  const openEditArticolModal = (s: any) => {
    const canonCat = resolveCanonicalOption(categorii, s.categorie);
    const canonSub = resolveCanonicalOption(getSubcategoriiPentruCategorie(canonCat), s.subcategorie);
    setQuickCatTarget(null);
    setQuickSubcatTarget(null);
    setEditingArticol({
      ...s,
      categorie: canonCat,
      subcategorie: canonSub,
      tipLichid: s.tipLichid || '',
      marcaUlei: s.marcaUlei || '',
      pretUnitar: Number(Number(s.pretUnitar || 0).toFixed(2)),
      stocCurent: Number(Number(s.stocCurent || 0).toFixed(2)),
      stocMinim: Number(Number(s.stocMinim || 0).toFixed(2)),
    });
  };

  const openInlineCatEdit = (s: any) => {
    const canonCat = resolveCanonicalOption(categorii, s.categorie);
    const canonSub = resolveCanonicalOption(getSubcategoriiPentruCategorie(canonCat), s.subcategorie);
    setInlineCatEdit({
      id: s.id,
      categorie: canonCat,
      subcategorie: canonSub,
    });
  };

  const handleSaveInlineCategory = async () => {
    if (!inlineCatEdit || !inlineCatEdit.categorie.trim()) return;
    setInlineCatEdit((prev) => (prev ? { ...prev, saving: true } : prev));
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${inlineCatEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorie: inlineCatEdit.categorie.trim(),
          subcategorie: inlineCatEdit.subcategorie.trim() || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStocuri((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setInlineCatEdit(null);
        showToast(
          `Categorie actualizată: ${updated.categorie}${updated.subcategorie ? ` › ${updated.subcategorie}` : ''}`,
          'success',
          2500,
        );
        void fetchStocuri();
        void fetchMetadata();
      } else {
        setInlineCatEdit((prev) => (prev ? { ...prev, saving: false } : prev));
        showToast('Nu s-a putut actualiza categoria articolului.', 'error', 3500);
      }
    } catch {
      setInlineCatEdit((prev) => (prev ? { ...prev, saving: false } : prev));
      showToast('Eroare de conexiune la salvarea categoriei.', 'error', 3500);
    }
  };

  const handleUpdateArticol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticol) return;
    try {
      const payload = {
        ...editingArticol,
        categorie: editingArticol.categorie?.trim(),
        subcategorie: editingArticol.subcategorie?.trim() || null,
        tipLichid: editingArticol.tipLichid?.trim() || null,
        marcaUlei: editingArticol.marcaUlei?.trim() || null,
        observatiiIntern: editingArticol.observatiiIntern?.trim() || null,
        pretUnitar: Number(Number(editingArticol.pretUnitar || 0).toFixed(2)),
        stocCurent: Number(Number(editingArticol.stocCurent || 0).toFixed(2)),
        stocMinim: Math.max(0, Number(Number(editingArticol.stocMinim || 0).toFixed(2))),
      };
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${editingArticol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setStocuri((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setEditingArticol(null);
        setQuickCatTarget(null);
        setQuickSubcatTarget(null);
        showToast('Datele articolului au fost actualizate!', 'success', 2500);
        void fetchStocuri();
        void fetchMetadata();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.message || 'Eroare la salvarea modificărilor.', 'error', 4500);
      }
    } catch (e) {
      showToast('Eroare la salvarea modificărilor.', 'error', 3500);
    }
  };

  const openAnvelopaEditModal = (a: any, startReclassify = false) => {
    const cleanModel = String(a.model || '').trim();
    const cleanMarca = /generic|nespecificat/i.test(String(a.marca || '')) ? '' : String(a.marca || '').trim();
    const cleanName = [cleanMarca, cleanModel].filter(Boolean).join(' ').trim() || a.serieAnvelopa || '';
    const defaultCat = resolveCanonicalOption(categoriiPiese, 'Alte') || categoriiPiese[0]?.nume || 'Alte';
    const defaultSub =
      defaultCat.toLowerCase() === 'alte'
        ? resolveCanonicalOption(getSubcategoriiPentruCategorie(defaultCat), 'Alte piese') || 'Alte piese'
        : '';

    setQuickCatTarget(null);
    setQuickSubcatTarget(null);
    setReclassifyMode(startReclassify || looksLikeNonTireEntry(a));
    setReclassifyData({
      denumire: cleanName,
      categorie: defaultCat,
      subcategorie: defaultSub,
      depozitId: a.depozitId || depozite[0]?.id || '',
    });
    setEditingAnvelopaStoc({
      ...a,
      pretAchizitie: Number(Number(a.pretAchizitie || 0).toFixed(2)),
    });
  };

  const handleReclassifyAnvelopaToStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnvelopaStoc || !reclassifyData.categorie.trim()) return;
    setReclassifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/anvelope/${editingAnvelopaStoc.id}/reclasifica-stoc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denumire: reclassifyData.denumire.trim(),
          categorie: reclassifyData.categorie.trim(),
          subcategorie: reclassifyData.subcategorie.trim() || null,
          depozitId: reclassifyData.depozitId || editingAnvelopaStoc.depozitId,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setEditingAnvelopaStoc(null);
        setReclassifyMode(false);
        showToast(result.mesaj || 'Articolul a fost mutat în Gestiune Piese!', 'success', 4000);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.message || 'Nu s-a putut reclasifica articolul.', 'error', 4000);
      }
    } catch {
      showToast('Eroare de conexiune la reclasificare.', 'error', 4000);
    } finally {
      setReclassifying(false);
    }
  };

  const renderCategorySubcategoryPicker = (opts: {
    scope: 'EDIT_MODAL' | 'RECLASSIFY';
    categorieVal: string;
    subcategorieVal: string;
    onChangeCat: (newCat: string) => void;
    onChangeSubcat: (newSub: string) => void;
  }) => {
    const { scope, categorieVal, subcategorieVal, onChangeCat, onChangeSubcat } = opts;
    const canonCat = resolveCanonicalOption(categoriiPiese, categorieVal);
    const availableSubcats = getSubcategoriiPentruCategorie(canonCat);
    const canonSub = resolveCanonicalOption(availableSubcats, subcategorieVal);
    const hasCustomCat = Boolean(canonCat) && !isTireCategoryName(canonCat) && !categoriiPiese.some((c: any) => c.nume === canonCat);
    const hasCustomSub = Boolean(canonSub) && !availableSubcats.some((s: any) => s.nume === canonSub);

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1 gap-2">
            <label className="text-sage-700 font-bold">Categorie Stoc: *</label>
            {quickCatTarget !== scope && (
              <button
                type="button"
                onClick={() => {
                  setQuickCatTarget(scope);
                  setQuickSubcatTarget(null);
                  setQuickCatDraft('');
                }}
                className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] flex items-center space-x-0.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Categorie Nouă</span>
              </button>
            )}
          </div>

          {quickCatTarget === scope ? (
            <div className="p-2.5 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2">
              <input
                type="text"
                autoFocus
                value={quickCatDraft}
                onChange={(e) => setQuickCatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    quickCreateCategoryAndSelect(quickCatDraft, (newCatName) => {
                      onChangeCat(newCatName);
                      onChangeSubcat('');
                      setQuickCatTarget(null);
                    });
                  } else if (e.key === 'Escape') {
                    setQuickCatTarget(null);
                  }
                }}
                placeholder="ex: Vopsele & Chimicale..."
                className="w-full bg-white border border-emerald-300 rounded-lg p-1.5 text-sapphire-900 font-bold text-xs"
              />
              <div className="flex justify-end space-x-1.5">
                <button
                  type="button"
                  onClick={() => setQuickCatTarget(null)}
                  className="px-2 py-1 rounded-lg bg-white border border-morning-200 text-slate-700 text-[11px] font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  disabled={savingQuickTaxonomy || !quickCatDraft.trim()}
                  onClick={() =>
                    quickCreateCategoryAndSelect(quickCatDraft, (newCatName) => {
                      onChangeCat(newCatName);
                      onChangeSubcat('');
                      setQuickCatTarget(null);
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] disabled:opacity-50"
                >
                  {savingQuickTaxonomy ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </div>
          ) : (
            <select
              required
              value={canonCat}
              onChange={(e) => {
                onChangeCat(e.target.value);
                onChangeSubcat('');
              }}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
            >
              <option value="">-- Alege Categorie --</option>
              {hasCustomCat && <option value={canonCat}>{canonCat}</option>}
              {categoriiPiese.map((c, idx) => (
                <option key={c.id || c.nume || idx} value={c.nume}>
                  {c.nume}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1 gap-2">
            <label className="text-sage-700 font-bold">Subcategorie Stoc:</label>
            {canonCat && quickSubcatTarget !== scope && (
              <button
                type="button"
                onClick={() => {
                  setQuickSubcatTarget(scope);
                  setQuickCatTarget(null);
                  setQuickSubcatDraft('');
                }}
                className="text-sapphire-700 hover:text-sapphire-800 font-bold text-[11px] flex items-center space-x-0.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Subcategorie Nouă</span>
              </button>
            )}
          </div>

          {quickSubcatTarget === scope ? (
            <div className="p-2.5 bg-sapphire-50/80 border border-sapphire-300 rounded-xl space-y-2">
              <input
                type="text"
                autoFocus
                value={quickSubcatDraft}
                onChange={(e) => setQuickSubcatDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    quickCreateSubcategoryAndSelect(canonCat, quickSubcatDraft, (newSub) => {
                      onChangeSubcat(newSub);
                      setQuickSubcatTarget(null);
                    });
                  } else if (e.key === 'Escape') {
                    setQuickSubcatTarget(null);
                  }
                }}
                placeholder={`Subcategorie în ${canonCat}...`}
                className="w-full bg-white border border-sapphire-300 rounded-lg p-1.5 text-sapphire-900 font-bold text-xs"
              />
              <div className="flex justify-end space-x-1.5">
                <button
                  type="button"
                  onClick={() => setQuickSubcatTarget(null)}
                  className="px-2 py-1 rounded-lg bg-white border border-morning-200 text-slate-700 text-[11px] font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  disabled={savingQuickTaxonomy || !quickSubcatDraft.trim()}
                  onClick={() =>
                    quickCreateSubcategoryAndSelect(canonCat, quickSubcatDraft, (newSub) => {
                      onChangeSubcat(newSub);
                      setQuickSubcatTarget(null);
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-[11px] disabled:opacity-50"
                >
                  {savingQuickTaxonomy ? 'Se salvează...' : 'Salvează'}
                </button>
              </div>
            </div>
          ) : (
            <select
              value={canonSub}
              onChange={(e) => onChangeSubcat(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
            >
              <option value="">-- Fără Subcategorie --</option>
              {hasCustomSub && <option value={canonSub}>{canonSub}</option>}
              {availableSubcats.map((sub: any, idx: number) => (
                <option key={sub.id || sub.nume || idx} value={sub.nume}>
                  {sub.nume}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    );
  };

  const handleDeleteArticol = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Articol din Stoc',
      'Sigur doriți să ștergeți acest articol din stoc?',
      'Da, șterge articolul',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEditingArticol(null);
        fetchData();
        alert('Articol șters din stoc.');
      }
    } catch (e) {
      alert('Eroare la ștergerea articolului.');
    }
  };

  // Actualizare Anvelopă Serializată
  const handleUpdateAnvelopaStoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnvelopaStoc) return;
    try {
      const payload = {
        serieAnvelopa: editingAnvelopaStoc.serieAnvelopa,
        codDot: editingAnvelopaStoc.codDot,
        marca: editingAnvelopaStoc.marca,
        model: editingAnvelopaStoc.model,
        dimensiune: editingAnvelopaStoc.dimensiune,
        rulajTotalKm: Number(editingAnvelopaStoc.rulajTotalKm || 0),
        pretAchizitie: Number(Number(editingAnvelopaStoc.pretAchizitie || 0).toFixed(2)),
        depozitId: editingAnvelopaStoc.depozitId,
      };
      const res = await fetch(`${API_BASE_URL}/anvelope/${editingAnvelopaStoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingAnvelopaStoc(null);
        fetchData();
        alert('Datele anvelopei au fost actualizate!');
      }
    } catch (e) {
      alert('Eroare la salvarea anvelopei.');
    }
  };

  // Eliminare / Casare Anvelopă din Magazie
  const handleDeleteAnvelopaStoc = async (id: string, serie: string) => {
    const confirmed = await showConfirm(
      'Eliminare Anvelopă din Magazie',
      `Sigur doriți să eliminați definitiv anvelopa ${serie} din stoc?`,
      'Da, elimină',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/anvelope/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEditingAnvelopaStoc(null);
        fetchData();
        alert('Anvelopa a fost eliminată din magazie.');
      }
    } catch (e) {
      alert('Eroare la eliminarea anvelopei.');
    }
  };

  // Adăugare Lot Anvelope Serializate în Magazie
  const handleAddAnvelopeBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchAnv.depozitId && depozite.length > 0) {
      newBatchAnv.depozitId = depozite[0].id;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/anvelope/adauga-stoc-serializat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBatchAnv,
          pretAchizitie: Number(Number(newBatchAnv.pretAchizitie || 0).toFixed(2)),
          adancimeMm: Number(newBatchAnv.adancimeMm || 16),
          cantitate: Number(newBatchAnv.cantitate || 1),
        }),
      });
      if (res.ok) {
        setShowAddAnvelopeStocModal(false);
        fetchData();
        alert('Anvelopele au fost înregistrate individual cu succes!');
      }
    } catch (e) {
      alert('Eroare la adăugarea anvelopelor.');
    }
  };

  const handleConfirmDemonteaza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/demonteaza-componenta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentaId: selectedComp.id,
          serieUnica: selectedComp.serieUnica,
          motivDemontare,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setSelectedComp(null);
        setMotivDemontare('');
        fetchData();
        showToast(data?.mesaj || 'Componenta a fost demontată și garanția verificată!', 'success', 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err?.message || 'Nu s-a putut demonta componenta.', 'error', 4500);
      }
    } catch (e) {
      showToast('Eroare de conexiune la demontarea componentei.', 'error', 4000);
    }
  };

  const pretUnitarKiszamolva = (bevPretTotal / Math.max(1, bevCantitate)).toFixed(2);

  // Exclude orice articol de tip anvelopă (anvelopele trăiesc exclusiv în Magazie Anvelope)
  const stocuriPiese = stocuri.filter((s) => !isTireItem(s));

  // Filtrare activă client-side (case & diacritic-insensitive, multi-cuvânt) + stoc 0
  const stocuriCautate = stocuriPiese.filter((s) =>
    matchesSearchTokens(
      [
        s.codArticol,
        s.denumire,
        s.marcaUlei,
        s.categorie,
        s.subcategorie,
        s.observatiiIntern,
        s.depozit?.nume,
        ...(Array.isArray(s.intrariStoc)
          ? s.intrariStoc.flatMap((i: any) => [i.furnizor, i.numarFactura, i.observatii, i.marcaUlei, i.tipLichid])
          : []),
      ],
      searchQuery,
    ),
  );
  const countZeroStock = stocuriCautate.filter((s) => (s.stocCurent || 0) <= 0).length;
  const stocuriAfisate = stocuriCautate.filter((s) => {
    if (hideZeroStock && (s.stocCurent || 0) <= 0) return false;
    return true;
  });

  // Componente serializate ne-anvelope (garanții piese atelier)
  const componenteAfisate = componente.filter((c) => !isTireItem(c.articolStoc));

  // Filtrare anvelope serializate din magazie
  const anvelopeStocFiltrate = anvelopeStocList.filter((a) => {
    const isNoua = (a.adancimeCurentaMm || 16) >= 15;
    if (anvelopeStocFilterState === 'NOUA' && !isNoua) return false;
    if (anvelopeStocFilterState === 'RULATA' && isNoua) return false;
    if (anvelopeStocDepozitFilter) {
      const mainDepId = depozite[0]?.id;
      const matchesDep =
        a.depozitId === anvelopeStocDepozitFilter ||
        (!a.depozitId && mainDepId && anvelopeStocDepozitFilter === mainDepId);
      if (!matchesDep) return false;
    }
    return matchesSearchTokens(
      [a.serieAnvelopa, a.marca, a.model, a.dimensiune, a.codDot, a.depozit?.nume, a.furnizor, a.numarFactura],
      anvelopeStocSearch,
    );
  });

  const totalValoareAnvelopeStoc = anvelopeStocList.reduce((acc, a) => acc + (a.pretAchizitie || 0), 0);
  const countAnvelopeNoi = anvelopeStocList.filter((a) => (a.adancimeCurentaMm || 16) >= 15).length;
  const countAnvelopeRulate = anvelopeStocList.length - countAnvelopeNoi;

  return (
    <div className="space-y-6">
      {/* Antet Titlu & Acțiuni - 100% PURE ROMANIAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <PackageCheck className="w-6 h-6 text-sapphire-500" />
            <span>Depozite, Stocuri & Transferuri</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Depozite flotă, stocuri piese, anvelope serializate, transferuri parțiale și garanții</p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <Link
            href="/efactura?tab=manual"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Recepție Marfă pe Factură</span>
          </Link>
        </div>
      </div>

      {/* SELECTOR TABURI PRINCIPALE (CU CONTOR LIVE) */}
      <div className="flex items-center space-x-2 border-b border-morning-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('depozite')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'depozite'
              ? 'bg-sapphire-500 text-white shadow-xs'
              : 'bg-morning-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-morning-200 dark:hover:bg-slate-700 hover:text-sapphire-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Depozite</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'depozite' ? 'bg-white/20 text-white' : 'bg-morning-200 dark:bg-slate-700 text-sage-700 dark:text-slate-200'}`}>
            {depozite.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stoc')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'stoc'
              ? 'bg-sapphire-500 text-white shadow-xs'
              : 'bg-morning-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-morning-200 dark:hover:bg-slate-700 hover:text-sapphire-900 dark:hover:text-white'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>Piese</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'stoc' ? 'bg-white/20 text-white' : 'bg-morning-200 dark:bg-slate-700 text-sage-700 dark:text-slate-200'}`}>
            {stocuriAfisate.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('anvelope_stoc')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'anvelope_stoc'
              ? 'bg-sapphire-500 text-white shadow-xs'
              : 'bg-morning-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-morning-200 dark:hover:bg-slate-700 hover:text-sapphire-900 dark:hover:text-white'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Magazie Anvelope</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${activeTab === 'anvelope_stoc' ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'}`}>
            {anvelopeStocList.length} buc
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('componente')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'componente'
              ? 'bg-sapphire-500 text-white shadow-xs'
              : 'bg-morning-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-morning-200 dark:hover:bg-slate-700 hover:text-sapphire-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Garanții Componente</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'componente' ? 'bg-white/20 text-white' : 'bg-morning-200 dark:bg-slate-700 text-sage-700 dark:text-slate-200'}`}>
            {componenteAfisate.length}
          </span>
        </button>
      </div>

      {/* TAB 1: GESTIUNE PIESE, FLUIDE & CONSUMABILE */}
      {activeTab === 'stoc' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          {/* Panou Filtre & Căutare Rapidă */}
          <div className="p-4 rounded-2xl bg-morning-100 border border-morning-200 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Căutare rapidă după denumire, cod articol, furnizor, factură, marcă..."
                  className="w-full bg-white border border-morning-200 rounded-xl pl-9 pr-9 py-2 text-xs text-sapphire-900 font-bold focus:border-sapphire-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-sage-500 hover:text-sapphire-900 hover:bg-morning-100 transition"
                    title="Șterge căutarea"
                    aria-label="Șterge căutarea"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 text-xs flex-wrap">
                {/* Filtru Categorie */}
                <select
                  value={selectedCategorieFilter}
                  onChange={(e) => {
                    setSelectedCategorieFilter(e.target.value);
                    setSelectedSubcategorieFilter('');
                  }}
                  className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">Toate Categoriile</option>
                  {categoriiPiese.map((c, idx) => (
                    <option key={idx} value={c.nume}>{c.nume}</option>
                  ))}
                </select>

                {/* Filtru Subcategorie */}
                {selectedCategorieFilter && (
                  <select
                    value={selectedSubcategorieFilter}
                    onChange={(e) => setSelectedSubcategorieFilter(e.target.value)}
                    className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="">Toate Subcategoriile ({selectedCategorieFilter})</option>
                    {getSubcategoriiPentruCategorie(selectedCategorieFilter).map((sub: any, idx: number) => (
                      <option key={idx} value={sub.nume}>{sub.nume}</option>
                    ))}
                  </select>
                )}

                {/* Filtru Depozit */}
                <select
                  value={selectedDepozitFilter}
                  onChange={(e) => setSelectedDepozitFilter(e.target.value)}
                  className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">Toate Depozitele</option>
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </select>

                {/* Filtru Stare Stoc */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="TOATE">Toate Stările</option>
                  <option value="CRITIC"> Doar Stoc Critic (Sub Minim)</option>
                  <option value="IN_STOC">Doar Stoc Optim (În Grafic)</option>
                </select>

                {/* Comutator Filtrare Stoc Zero (0) */}
                <button
                  type="button"
                  onClick={() => setHideZeroStock(!hideZeroStock)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 ${
                    hideZeroStock
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-morning-200 border-morning-300 text-slate-700'
                  }`}
                  title="Comută afișarea articolelor cu stoc 0"
                >
                  <span>{hideZeroStock ? ' Doar Stoc Disponibil (>0)' : ' Include Stoc Zero (0)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddCatModal(true)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-morning-200 text-sapphire-900 border border-morning-200 font-bold text-xs transition flex items-center space-x-1"
                  title="Gestionează categoriile și subcategoriile din stoc"
                >
                  <Tag className="w-3.5 h-3.5 text-sapphire-600" />
                  <span>Categorii</span>
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-xs transition"
                >
                  + Adaugă Articol
                </button>
              </div>
            </div>

            {selectedDepozitFilter && (
              <div className="flex items-center space-x-2 pt-1 border-t border-morning-200 text-xs text-sapphire-600 font-bold">
                <span>Filtru activ Depozit: {depozite.find(d => d.id === selectedDepozitFilter)?.nume}</span>
                <button onClick={() => setSelectedDepozitFilter('')} className="underline text-terracotta-600 hover:text-terracotta-700 ml-2">Șterge Filtru Depozit</button>
              </div>
            )}
          </div>

          {/* Banner Notificare Articole cu Stoc Zero ascunse */}
          {hideZeroStock && countZeroStock > 0 && (
            <div className="p-3 bg-sapphire-50/70 border border-sapphire-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-sapphire-900 font-medium">
                <AlertCircle className="w-4 h-4 text-sapphire-500 shrink-0" />
                <span>Sunt ascunse <strong>{countZeroStock} articole</strong> cu stoc zero (epuizate) pentru a păstra tabelul curat.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHideZeroStock(false)}
                className="text-xs font-bold text-sapphire-700 hover:text-sapphire-900 hover:underline px-2 py-0.5"
              >
                Afișează-le în tabel
              </button>
            </div>
          )}

          {/* Tabel Stocuri */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[1000px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Cod Articol</th>
                  <th className="p-3">Denumire Articol / Ulei</th>
                  <th className="p-3">Categorie & Subcategorie</th>
                  <th className="p-3">Depozit Curent</th>
                  <th className="p-3">Stoc Curent / Minim</th>
                  <th className="p-3 font-mono">Preț Unitar</th>
                  <th className="p-3 text-right whitespace-nowrap min-w-[220px]">Acțiuni Stoc & Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {stocuriAfisate.map((s) => {
                  const esteCritic = (Number(s.stocMinim) || 0) > 0 && Number(s.stocCurent) < Number(s.stocMinim);
                  const stocRezervat = Number(s.stocRezervat || 0);
                  const stocDisponibil =
                    s.stocDisponibil !== undefined && s.stocDisponibil !== null
                      ? Number(s.stocDisponibil)
                      : Math.max(0, Number(s.stocCurent || 0) - stocRezervat);
                  return (
                    <tr key={s.id} className={`hover:bg-morning-50 transition ${esteCritic ? 'bg-roseash-50' : ''}`}>
                      <td className="p-3 font-mono text-sapphire-600 font-bold flex items-center space-x-1">
                        {esteCritic && <AlertCircle className="w-3.5 h-3.5 text-terracotta-500" />}
                        <span>{s.codArticol}</span>
                      </td>
                      <td className="p-3 font-bold text-sapphire-900">
                        {s.denumire}
                        {s.marcaUlei && <span className="text-[10px] text-sage-600 font-medium block">Marcă: {s.marcaUlei}</span>}
                        {s.observatiiIntern && (
                          <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 font-medium inline-block mt-1">
                            Notă: {s.observatiiIntern}
                          </span>
                        )}
                        {s.intrariStoc && s.intrariStoc.length > 0 && (
                          <div className="mt-1 flex items-center space-x-1.5 flex-wrap gap-1 text-[11px] font-normal">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-900 font-medium">
                              <Building2 className="w-3 h-3 text-sapphire-600" />
                              <span>Furnizor: <strong className="font-semibold">{s.intrariStoc[0].furnizor || 'N/A'}</strong></span>
                            </span>
                            <span
                              onClick={() => s.intrariStoc[0].numarFactura && handleOpenFacturaInEfactura(s.intrariStoc[0].numarFactura)}
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-morning-100 border border-morning-300 text-slate-700 font-medium ${s.intrariStoc[0].numarFactura ? 'cursor-pointer hover:bg-sapphire-100 hover:text-sapphire-800' : ''}`}
                              title={s.intrariStoc[0].numarFactura ? 'Click pentru a deschide factura în ANAF e-Factura' : ''}
                            >
                              <FileText className="w-3 h-3 text-slate-500" />
                              <span>Factura: <strong className="font-semibold underline decoration-dotted">{s.intrariStoc[0].numarFactura || 'N/A'}</strong></span>
                              {s.intrariStoc[0].dataFactura && (
                                <span className="text-slate-500 text-[10px]">({new Date(s.intrariStoc[0].dataFactura).toLocaleDateString('ro-RO')})</span>
                              )}
                            </span>
                            {s.intrariStoc.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleOpenFifoLoturi(s)}
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                                title={`Vezi toate cele ${s.intrariStoc.length} loturi / facturi de achiziție`}
                              >
                                +{s.intrariStoc.length - 1} loturi anterioare
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 min-w-[210px]">
                        {inlineCatEdit?.id === s.id ? (
                          <div className="space-y-1.5 p-2 rounded-xl bg-sapphire-50/80 border border-sapphire-300 shadow-2xs">
                            {inlineCatEdit.addingCat ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={inlineCatEdit.newCat || ''}
                                  onChange={(e) =>
                                    setInlineCatEdit((prev) => (prev ? { ...prev, newCat: e.target.value } : prev))
                                  }
                                  placeholder="Categorie nouă..."
                                  className="flex-1 min-w-0 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-[11px] font-bold text-sapphire-900"
                                />
                                <button
                                  type="button"
                                  disabled={savingQuickTaxonomy || !(inlineCatEdit.newCat || '').trim()}
                                  onClick={() =>
                                    quickCreateCategoryAndSelect(inlineCatEdit.newCat || '', (canonCat) => {
                                      setInlineCatEdit((prev) =>
                                        prev
                                          ? { ...prev, categorie: canonCat, subcategorie: '', addingCat: false, newCat: '' }
                                          : prev,
                                      );
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInlineCatEdit((prev) => (prev ? { ...prev, addingCat: false, newCat: '' } : prev))
                                  }
                                  className="p-1 rounded-lg bg-white border border-morning-200 text-slate-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <select
                                  value={inlineCatEdit.categorie}
                                  onChange={(e) =>
                                    setInlineCatEdit((prev) =>
                                      prev ? { ...prev, categorie: e.target.value, subcategorie: '' } : prev,
                                    )
                                  }
                                  className="flex-1 min-w-0 bg-white border border-morning-300 rounded-lg px-2 py-1 text-[11px] font-bold text-sapphire-900"
                                >
                                  <option value="">-- Categorie --</option>
                                  {inlineCatEdit.categorie &&
                                    !isTireCategoryName(inlineCatEdit.categorie) &&
                                    !categoriiPiese.some((c: any) => c.nume === inlineCatEdit.categorie) && (
                                      <option value={inlineCatEdit.categorie}>{inlineCatEdit.categorie}</option>
                                    )}
                                  {categoriiPiese.map((c, idx) => (
                                    <option key={c.id || c.nume || idx} value={c.nume}>
                                      {c.nume}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInlineCatEdit((prev) => (prev ? { ...prev, addingCat: true, newCat: '' } : prev))
                                  }
                                  className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0"
                                  title="Categorie nouă"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {inlineCatEdit.addingSubcat ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={inlineCatEdit.newSubcat || ''}
                                  onChange={(e) =>
                                    setInlineCatEdit((prev) => (prev ? { ...prev, newSubcat: e.target.value } : prev))
                                  }
                                  placeholder="Subcategorie nouă..."
                                  className="flex-1 min-w-0 bg-white border border-sapphire-300 rounded-lg px-2 py-1 text-[11px] font-bold text-sapphire-900"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    savingQuickTaxonomy ||
                                    !inlineCatEdit.categorie ||
                                    !(inlineCatEdit.newSubcat || '').trim()
                                  }
                                  onClick={() =>
                                    quickCreateSubcategoryAndSelect(
                                      inlineCatEdit.categorie,
                                      inlineCatEdit.newSubcat || '',
                                      (canonSub) => {
                                        setInlineCatEdit((prev) =>
                                          prev ? { ...prev, subcategorie: canonSub, addingSubcat: false, newSubcat: '' } : prev,
                                        );
                                      },
                                    )
                                  }
                                  className="px-2 py-1 rounded-lg bg-sapphire-600 text-white text-[10px] font-bold"
                                >
                                  OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setInlineCatEdit((prev) =>
                                      prev ? { ...prev, addingSubcat: false, newSubcat: '' } : prev,
                                    )
                                  }
                                  className="p-1 rounded-lg bg-white border border-morning-200 text-slate-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <select
                                  value={inlineCatEdit.subcategorie}
                                  onChange={(e) =>
                                    setInlineCatEdit((prev) =>
                                      prev ? { ...prev, subcategorie: e.target.value } : prev,
                                    )
                                  }
                                  className="flex-1 min-w-0 bg-white border border-morning-300 rounded-lg px-2 py-1 text-[11px] font-bold text-sapphire-900"
                                >
                                  <option value="">-- Fără subcategorie --</option>
                                  {inlineCatEdit.subcategorie &&
                                    !getSubcategoriiPentruCategorie(inlineCatEdit.categorie).some(
                                      (sub: any) => sub.nume === inlineCatEdit.subcategorie,
                                    ) && <option value={inlineCatEdit.subcategorie}>{inlineCatEdit.subcategorie}</option>}
                                  {getSubcategoriiPentruCategorie(inlineCatEdit.categorie).map((sub: any, idx: number) => (
                                    <option key={sub.id || sub.nume || idx} value={sub.nume}>
                                      {sub.nume}
                                    </option>
                                  ))}
                                </select>
                                {inlineCatEdit.categorie && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInlineCatEdit((prev) =>
                                        prev ? { ...prev, addingSubcat: true, newSubcat: '' } : prev,
                                      )
                                    }
                                    className="p-1 rounded-lg bg-sapphire-100 hover:bg-sapphire-200 text-sapphire-700 border border-sapphire-200 shrink-0"
                                    title="Subcategorie nouă"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-end space-x-1 pt-0.5">
                              <button
                                type="button"
                                disabled={inlineCatEdit.saving || !inlineCatEdit.categorie}
                                onClick={handleSaveInlineCategory}
                                className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold inline-flex items-center space-x-1 disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                <span>{inlineCatEdit.saving ? 'Salvez...' : 'Salvează'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setInlineCatEdit(null)}
                                className="px-2 py-0.5 rounded-md bg-white border border-morning-200 text-slate-600 hover:text-slate-900 text-[10px] font-semibold"
                              >
                                Anulează
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 flex-wrap gap-1 group">
                            <span
                              onClick={() => openInlineCatEdit(s)}
                              className="px-2.5 py-0.5 rounded bg-morning-200 text-slate-700 text-[10px] font-semibold cursor-pointer hover:bg-sapphire-100 hover:text-sapphire-900 transition"
                              title="Click pentru a schimba categoria și subcategoria"
                            >
                              {s.categorie}
                            </span>
                            {s.subcategorie && (
                              <span
                                onClick={() => openInlineCatEdit(s)}
                                className="px-2.5 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-700 text-[10px] font-bold cursor-pointer hover:bg-sapphire-100 transition"
                                title="Click pentru a schimba categoria și subcategoria"
                              >
                                ▸ {s.subcategorie}
                              </span>
                            )}
                            {s.tipLichid && (
                              <span
                                className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold"
                                title={`Normă asociată: ${s.tipLichid}`}
                              >
                                Normă: {getTipFluidLabel(s.tipLichid, tipuriFluide)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openInlineCatEdit(s)}
                              className="p-1 rounded-md text-sage-500 hover:text-sapphire-700 hover:bg-sapphire-50 transition"
                              title="Schimbă categoria și subcategoria"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        <button
                          onClick={() => handleOpenDepozitStoc(s.depozitId || '')}
                          className="flex items-center space-x-1 hover:text-sapphire-600 hover:underline text-left cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5 text-sapphire-500" />
                          <span>{s.depozit?.nume || 'Depozit Central'}</span>
                        </button>
                      </td>
                      <td className="p-3 font-bold font-mono">
                        <div>
                          <span className={esteCritic ? 'text-terracotta-600 font-extrabold text-sm' : 'text-sage-700'}>
                            {s.stocCurent} {s.unitateMasura}
                          </span>
                          <span className="text-sage-500 font-normal text-[10px] ml-1">(min {s.stocMinim})</span>
                        </div>
                        {stocRezervat > 0 && (
                          <div
                            className="mt-1 flex items-center flex-wrap gap-1 font-sans"
                            title="Cantitate rezervată în Comenzi de Lucru deschise (ÎN LUCRU / DEVALIDAT)"
                          >
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold font-mono">
                              Rezervat: {stocRezervat}
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono ${
                                stocDisponibil > 0
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              Disponibil: {stocDisponibil}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-sapphire-900">
                        {Number(s.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON / {s.unitateMasura}
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap min-w-[280px]">
                        <button
                          onClick={() => handleOpenFifoLoturi(s)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300 transition shadow-2xs"
                          title="Vezi trasabilitatea loturilor de intrare pe facturi (FIFO)"
                        >
                          <span className="flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Trasabilitate Facturi (FIFO)</span>
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setTransferArticol(s);
                            setTransferCantitate(1);
                            const altDep = depozite.find(d => d.id !== s.depozitId);
                            if (altDep) setTransferDepozitDestinatieId(altDep.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-periwinkle-100 hover:bg-periwinkle-300 text-periwinkle-700 text-[11px] font-bold border border-periwinkle-300 transition"
                          title="Transferă parțial în alt depozit"
                        >
                          <span className="flex items-center space-x-1">
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Transfer Parțial</span>
                          </span>
                        </button>

                        <button
                          onClick={() => openEditArticolModal(s)}
                          className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-[11px] font-semibold border border-morning-200 transition"
                        >
                          Editează
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {stocuriAfisate.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="max-w-md mx-auto space-y-2">
                        <Search className="w-8 h-8 text-sage-300 mx-auto" />
                        <p className="text-sm font-bold text-sapphire-900">
                          {searchQuery.trim()
                            ? `Niciun articol găsit pentru „${searchQuery.trim()}”`
                            : 'Niciun articol nu corespunde filtrelor selectate'}
                        </p>
                        {hideZeroStock && countZeroStock > 0 && (
                          <p className="text-xs text-amber-700 font-medium">
                            Există {countZeroStock} {countZeroStock === 1 ? 'articol potrivit cu stoc zero' : 'articole potrivite cu stoc zero'} ascunse momentan.
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="px-3 py-1.5 rounded-lg bg-morning-200 hover:bg-morning-300 text-sapphire-900 font-bold text-xs transition"
                            >
                              Șterge căutarea
                            </button>
                          )}
                          {hideZeroStock && countZeroStock > 0 && (
                            <button
                              type="button"
                              onClick={() => setHideZeroStock(false)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition"
                            >
                              Afișează și articolele cu stoc 0 ({countZeroStock})
                            </button>
                          )}
                          {(selectedCategorieFilter || selectedSubcategorieFilter || selectedDepozitFilter || selectedStatusFilter !== 'TOATE') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategorieFilter('');
                                setSelectedSubcategorieFilter('');
                                setSelectedDepozitFilter('');
                                setSelectedStatusFilter('TOATE');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 border border-sapphire-200 font-bold text-xs transition"
                            >
                              Resetează filtrele
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* TAB 2: MAGAZIE CENTRALĂ ANVELOPE (SERIALIZAT & BUCATĂ CU BUCATĂ) */}
      {activeTab === 'anvelope_stoc' && (
        <div className="space-y-4">
          {/* Carduri KPI Statistica Magazie Anvelope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                <CircleDot className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">Total Anvelope în Stoc</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">{anvelopeStocList.length} buc</p>
                <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Disponibile pentru montaj</p>
              </div>
            </div>

            <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-sapphire-100 text-sapphire-800 rounded-xl">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">Anvelope Noi (Profil 16mm)</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">{countAnvelopeNoi} buc</p>
                <p className="text-[10px] text-sapphire-600 font-semibold mt-0.5">Nerulate / Achiziții noi</p>
              </div>
            </div>

            <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-amber-100 text-amber-900 rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">Rulate / Rezervă</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">{countAnvelopeRulate} buc</p>
                <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Demontate & refolosibile</p>
              </div>
            </div>

            <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-periwinkle-100 text-periwinkle-800 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">Valoare Totală Stoc</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">
                  {Number(totalValoareAnvelopeStoc).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                </p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Inventar magazie</p>
              </div>
            </div>
          </div>

          {/* Panou Filtre & Căutare Magazie Anvelope */}
          <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={anvelopeStocSearch}
                  onChange={(e) => setAnvelopeStocSearch(e.target.value)}
                  placeholder="Caută anvelopă după Serie (SN), Marcă, Model, Dimensiune, DOT, Depozit..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-9 py-2.5 text-xs text-sapphire-900 font-bold focus:bg-white focus:border-sapphire-500 focus:outline-none"
                />
                {anvelopeStocSearch && (
                  <button
                    type="button"
                    onClick={() => setAnvelopeStocSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-sage-500 hover:text-sapphire-900 hover:bg-morning-200 transition"
                    title="Șterge căutarea"
                    aria-label="Șterge căutarea"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 text-xs flex-wrap">
                {/* Filtru Stare Anvelopă */}
                <div className="flex items-center space-x-1 bg-morning-100 p-1 rounded-xl border border-morning-200">
                  <button
                    type="button"
                    onClick={() => setAnvelopeStocFilterState('ALL')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      anvelopeStocFilterState === 'ALL' ? 'bg-white text-sapphire-900 shadow-xs' : 'text-sage-600 hover:text-sapphire-900'
                    }`}
                  >
                    Toate ({anvelopeStocList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnvelopeStocFilterState('NOUA')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      anvelopeStocFilterState === 'NOUA' ? 'bg-emerald-500 text-white shadow-xs' : 'text-sage-600 hover:text-emerald-800'
                    }`}
                  >
                    Noi ({countAnvelopeNoi})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnvelopeStocFilterState('RULATA')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      anvelopeStocFilterState === 'RULATA' ? 'bg-amber-500 text-white shadow-xs' : 'text-sage-600 hover:text-amber-800'
                    }`}
                  >
                    Rulate ({countAnvelopeRulate})
                  </button>
                </div>

                {/* Filtru Depozit */}
                <select
                  value={anvelopeStocDepozitFilter}
                  onChange={(e) => setAnvelopeStocDepozitFilter(e.target.value)}
                  className="bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold text-xs focus:bg-white cursor-pointer"
                >
                  <option value="">Toate Depozitele ({depozite.length})</option>
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddAnvelopeStocModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă Anvelope Noi</span>
                </button>
              </div>
            </div>

            {anvelopeStocDepozitFilter && (
              <div className="flex items-center space-x-2 pt-2 border-t border-morning-200 text-xs text-sapphire-600 font-bold">
                <span>
                  Filtru activ Depozit: {depozite.find((d) => d.id === anvelopeStocDepozitFilter)?.nume || 'Depozit'}
                </span>
                <button
                  type="button"
                  onClick={() => setAnvelopeStocDepozitFilter('')}
                  className="underline text-terracotta-600 hover:text-terracotta-700 ml-2 cursor-pointer"
                >
                  Arată Toate Depozitele
                </button>
              </div>
            )}
          </div>

          {/* Grid Carduri Anvelope Serializate */}
          {anvelopeStocFiltrate.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {anvelopeStocFiltrate.map((a: any) => {
                const isNoua = (a.adancimeCurentaMm || 16) >= 15;
                const procentProfil = Math.min(100, Math.round(((a.adancimeCurentaMm || 16) / 16) * 100));
                const isHighlighted = !!(
                  highlightedTireSerie &&
                  String(a.serieAnvelopa || '').trim().toLowerCase() === highlightedTireSerie.trim().toLowerCase()
                );

                return (
                  <div
                    key={a.id}
                    id={`tire-stock-card-${a.id}`}
                    className={`pleasant-card bg-white p-4 rounded-2xl border transition space-y-3 text-xs ${
                      isHighlighted
                        ? 'border-emerald-500 ring-4 ring-emerald-400/50 shadow-lg'
                        : 'border-morning-200 hover:border-sapphire-300 hover:shadow-md'
                    }`}
                  >
                    {/* Header Card */}
                    <div className="flex items-center justify-between border-b border-morning-100 pb-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-black text-xs tracking-wide shadow-xs">
                           {a.serieAnvelopa}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isNoua
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {isNoua ? 'NOUĂ' : 'RULATĂ'}
                        </span>
                      </div>

                      <span className="font-mono font-black text-sapphire-900 text-xs bg-sapphire-50 px-2 py-1 rounded-lg border border-sapphire-100">
                        {Number(a.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </span>
                    </div>

                    {/* Detalii Anvelopă */}
                    <div className="space-y-1.5">
                      <p className="font-extrabold text-sapphire-900 text-sm">{a.marca} {a.model}</p>
                      <div className="flex items-center justify-between text-slate-700 font-semibold">
                        <span className="bg-morning-100 px-2 py-0.5 rounded-md font-mono text-[11px] text-sapphire-800">
                          {a.dimensiune}
                        </span>
                        <span className="text-[11px] font-mono text-sage-600">
                          DOT: <strong className="text-sapphire-900">{a.codDot || '2625'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Rulaj, Depozit & Proveniență Factură */}
                    <div className="p-2.5 bg-morning-50 rounded-xl border border-morning-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-sage-600 font-medium">Rulaj Acumulat:</span>
                        <span className="font-mono font-extrabold text-sapphire-900">
                          {Math.round(a.rulajTotalKm || 0).toLocaleString('ro-RO')} KM
                        </span>
                      </div>
                      <p className="text-[10px] text-sage-600 font-medium flex items-center space-x-1 pt-0.5">
                        <Building2 className="w-3 h-3 text-sapphire-500 shrink-0" />
                        <span>Locație: <strong>{a.depozit?.nume || 'Depozit Central'}</strong></span>
                      </p>
                      {(a.furnizor || a.numarFactura) && (
                        <div className="pt-1 border-t border-morning-200 flex items-center flex-wrap gap-1.5 text-[10px]">
                          {a.furnizor && (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-900 font-semibold truncate max-w-full">
                              <span>{a.furnizor}</span>
                            </span>
                          )}
                          {a.numarFactura && (
                            <button
                              type="button"
                              onClick={() => handleOpenFacturaInEfactura(a.numarFactura)}
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-morning-100 hover:bg-sapphire-100 border border-morning-300 text-slate-700 hover:text-sapphire-800 font-mono font-semibold transition cursor-pointer"
                              title="Click pentru a deschide factura în ANAF e-Factura"
                            >
                              <FileText className="w-3 h-3 text-sapphire-600 shrink-0" />
                              <span className="underline decoration-dotted">{a.numarFactura}</span>
                              {a.dataFactura && (
                                <span className="text-sage-600 font-normal">
                                  ({new Date(a.dataFactura).toLocaleDateString('ro-RO')})
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {looksLikeNonTireEntry(a) && (
                      <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-amber-900 font-bold">Nu pare anvelopă / marcă necunoscută</span>
                        <button
                          type="button"
                          onClick={() => openAnvelopaEditModal(a, true)}
                          className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 transition"
                        >
                          Mută în Piese &amp; Categorie
                        </button>
                      </div>
                    )}

                    {/* Butoane Acțiuni Rapide */}
                    <div className="flex items-center justify-between pt-1 border-t border-morning-100 gap-1.5">
                      <button
                        type="button"
                        onClick={() => openAnvelopaEditModal(a, false)}
                        className="flex-1 py-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 text-sapphire-900 font-bold text-[11px] border border-morning-200 transition text-center"
                      >
                         Editează
                      </button>

                      <Link
                        href="/anvelope"
                        className="flex-1 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-[11px] shadow-xs transition text-center flex items-center justify-center space-x-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Montează</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteAnvelopaStoc(a.id, a.serieAnvelopa)}
                        className="p-1.5 rounded-lg bg-roseash-100 hover:bg-roseash-200 text-terracotta-600 border border-roseash-300 transition"
                        title="Elimină din stoc"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pleasant-card bg-white p-8 rounded-2xl border border-morning-200 text-center space-y-2">
              <CircleDot className="w-10 h-10 text-sage-300 mx-auto" />
              <h3 className="font-bold text-sapphire-900 text-sm">Nicio anvelopă nu corespunde filtrelor selectate</h3>
              <p className="text-xs text-sage-500">
                Puteți reseta căutarea sau înregistra anvelope noi folosind butonul de mai sus.
              </p>
              {anvelopeStocSearch && (
                <button
                  type="button"
                  onClick={() => setAnvelopeStocSearch('')}
                  className="px-3 py-1.5 rounded-lg bg-morning-200 text-sapphire-900 font-bold text-xs hover:bg-morning-300"
                >
                  Resetează căutarea
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEPOZITE FLOTĂ */}
      {activeTab === 'depozite' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-sapphire-500" />
                <span>Gestiune Depozite (Faceți clic pe un depozit pentru a vedea stocul conținut)</span>
              </h2>
              <p className="text-xs text-sage-700 font-medium">Faceți clic pe orice depozit pentru a deschide automat stocul conținut!</p>
            </div>

            <button onClick={() => setShowAddDepozitModal(true)} className="px-3.5 py-2 rounded-xl bg-sapphire-500 text-white font-bold text-xs shadow-xs">
              + Depozit Nou
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {depozite.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-white border border-morning-200 hover:border-sapphire-500 space-y-3 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleOpenDepozitStoc(d.id)}>
                    <Building2 className="w-5 h-5 text-sapphire-500 group-hover:scale-110 transition-transform" />
                    <h3 className="font-extrabold text-sapphire-900 text-sm group-hover:text-sapphire-600 transition">{d.nume}</h3>
                  </div>

                  <button
                    onClick={() => setEditingDepozit(d)}
                    className="p-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 text-slate-600 text-xs font-semibold"
                    title="Editează Depozit"
                  >
                    <Edit3 className="w-4 h-4 text-sapphire-600" />
                  </button>
                </div>

                <p className="text-xs text-sage-700 font-medium">Adresă: <span className="font-semibold text-slate-800">{d.adresa || 'N/A'}</span></p>
                <p className="text-xs text-sage-700 font-medium">Responsabil: <span className="font-semibold text-slate-800">{d.responsabil || 'N/A'}</span></p>

                <div className="pt-2 border-t border-morning-200 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenDepozitStoc(d.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 border border-sapphire-200 font-extrabold text-[10px] transition cursor-pointer"
                      title={`Vezi cele ${d._count?.articoleStoc || 0} piese active din ${d.nume}`}
                    >
                      <PackageCheck className="w-3 h-3" />
                      <span>{d._count?.articoleStoc || 0} piese active</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDepozitAnvelope(d.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[10px] transition cursor-pointer"
                      title={`Deschide Magazie Anvelope filtrată pe ${d.nume}`}
                    >
                      <CircleDot className="w-3 h-3" />
                      <span>{d._count?.anvelope || 0} anvelope în stoc</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDepozitStoc(d.id)}
                    className="flex items-center space-x-1 text-xs font-bold text-sapphire-600 hover:text-sapphire-800 cursor-pointer"
                  >
                    <span>Vezi Stoc Piese</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COMPONENTE SERIALIZATE & GARANȚII ACTIVE */}
      {activeTab === 'componente' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-sapphire-500" />
                <span>Garanții Componente Serializate ({componenteAfisate.length})</span>
              </h2>
              <p className="text-xs text-sage-700 font-medium">Lista centralizată a pieselor serializate cu garanție de producător și starea reală din atelier.</p>
            </div>

            <span className="px-3 py-1 rounded-full bg-sapphire-50 border border-sapphire-200 text-sapphire-700 font-extrabold text-xs">
              {componenteAfisate.length} Componente în Registru
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Componentă / Serie Unică (SN)</th>
                  <th className="p-3">Furnizor & Factură</th>
                  <th className="p-3">Utilaj Montat / Locație</th>
                  <th className="p-3">Durată Garanție (Luni / Rulaj)</th>
                  <th className="p-3">Stare Componentă</th>
                  <th className="p-3 text-right whitespace-nowrap min-w-[160px]">Acțiune Atelier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {componenteAfisate.map((c) => {
                  const statusMeta = getComponentaStatusMeta(c.stare);
                  const isRetired = statusMeta.code === 'DEFECT' || statusMeta.code === 'CASAT';
                  const furnizorLabel = c.articolStoc?.intrariStoc?.[0]?.furnizor || c.furnizor || 'Nespecificat';
                  const facturaNr = c.articolStoc?.intrariStoc?.[0]?.numarFactura || c.numarFactura || '';
                  return (
                    <tr key={c.id} className="hover:bg-morning-50 transition">
                      <td className="p-3 font-bold text-sapphire-900">
                        {c.articolStoc?.denumire || 'Componentă'}
                        <div className="text-[10px] text-sapphire-600 font-mono font-bold">Serie: {c.serieUnica}</div>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">
                        <div>{furnizorLabel}</div>
                        {facturaNr ? (
                          <button
                            type="button"
                            onClick={() => handleOpenFacturaInEfactura(facturaNr)}
                            className="text-[10px] text-sapphire-700 hover:underline font-mono font-semibold cursor-pointer"
                            title="Deschide factura în ANAF e-Factura"
                          >
                            Factură: {facturaNr}
                          </button>
                        ) : (
                          <div className="text-[10px] text-sage-600 font-mono">Fără factură asociată</div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-sage-700">
                        {c.vehicul?.numarIntern ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-extrabold text-sapphire-900">
                              {c.vehicul.numarIntern}
                            </span>
                            {c.vehicul.numarInmatriculare && (
                              <span className="text-[11px] font-medium text-sage-600 ml-1">
                                ({c.vehicul.numarInmatriculare})
                              </span>
                            )}
                            {c.pozitieMontaj && (
                              <div className="text-[10px] text-sage-600 font-medium">Poziție: {c.pozitieMontaj}</div>
                            )}
                          </div>
                        ) : statusMeta.code === 'IN_STOC' ? (
                          <span>În Stoc ({c.articolStoc?.depozit?.nume || 'Depozit Central'})</span>
                        ) : statusMeta.code === 'DEFECT' ? (
                          <span className="text-amber-800">Demontat / Defect</span>
                        ) : statusMeta.code === 'CASAT' ? (
                          <span className="text-rose-700">Casat / Retras din uz</span>
                        ) : (
                          <span>{c.articolStoc?.depozit?.nume || 'Depozit Central'}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-800">
                        {c.luniGarantie || c.garantieProducatorLuni || 24} Luni / {c.kilometriGarantie || c.garantieProducatorKm || 2000} km/mTH
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                        {c.motivDemontare && (
                          <div className="text-[10px] text-sage-600 mt-1 max-w-[220px] truncate" title={c.motivDemontare}>
                            Motiv: {c.motivDemontare}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isRetired ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-morning-100 border border-morning-200 text-sage-600 text-[11px] font-semibold">
                            Închisă ({statusMeta.code})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedComp(c)}
                            className="px-3 py-1.5 rounded-lg bg-roseash-100 hover:bg-roseash-200 text-terracotta-700 border border-roseash-300 text-[11px] font-bold transition cursor-pointer"
                          >
                            Demontează Piesă (Verifică Garanție)
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {componenteAfisate.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-sage-600 font-medium">
                      Nu există componente serializate cu garanție înregistrate în atelier.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODÁL TRANSFER PARȚIAL ÎNTRE DEPOZITE (USER REQUESTED FEATURE) */}
      {transferArticol && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900 flex items-center space-x-2">
                <ArrowLeftRight className="w-5 h-5 text-periwinkle-700" />
                <span>Transfer Parțial Între Depozite</span>
              </h3>
              <button onClick={() => setTransferArticol(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutaTransfer} className="space-y-3 text-xs">
              {(() => {
                const reservedQty = Number(transferArticol.stocRezervat || 0);
                const maxTransfer =
                  transferArticol.stocDisponibil !== undefined && transferArticol.stocDisponibil !== null
                    ? Number(transferArticol.stocDisponibil)
                    : Math.max(0, Number(transferArticol.stocCurent || 0) - reservedQty);
                return (
                  <>
                    <div className="p-3 bg-morning-100 rounded-xl border border-morning-200 space-y-1">
                      <p className="font-extrabold text-sapphire-900">{transferArticol.denumire} ({transferArticol.codArticol})</p>
                      <p className="text-sage-700 font-medium">
                        Depozit Sursă: <span className="font-bold text-slate-800">{transferArticol.depozit?.nume || 'Depozit Central'}</span>
                      </p>
                      <p className="text-sage-700 font-medium">
                        Stoc Disponibil Transfer:{' '}
                        <span className="font-mono font-extrabold text-sapphire-600">
                          {maxTransfer} {transferArticol.unitateMasura}
                        </span>
                        {reservedQty > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold text-amber-800">
                            (din {transferArticol.stocCurent} fizic · {reservedQty} rezervat în comenzi deschise)
                          </span>
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Selectează Depozit Destinație:</label>
                      <select
                        required
                        value={transferDepozitDestinatieId}
                        onChange={(e) => setTransferDepozitDestinatieId(e.target.value)}
                        className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                      >
                        {depozite
                          .filter((d) => d.id !== transferArticol.depozitId)
                          .map((d) => (
                            <option key={d.id} value={d.id}>{d.nume}</option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Cantitate de Transferat ({transferArticol.unitateMasura}):</label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        max={maxTransfer}
                        required
                        value={transferCantitate}
                        onChange={(e) => setTransferCantitate(Number(e.target.value))}
                        className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-extrabold text-sm"
                      />
                      <p className="text-[10px] text-sage-500 mt-1">
                        Maxim transferabil: {maxTransfer} {transferArticol.unitateMasura}
                      </p>
                    </div>
                  </>
                );
              })()}

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Operator / Mecanic:</label>
                <input
                  value={transferOperator}
                  onChange={(e) => setTransferOperator(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-semibold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații & Notițe Transfer:</label>
                <input
                  value={transferObservatii}
                  onChange={(e) => setTransferObservatii(e.target.value)}
                  placeholder="ex: Transfer 2 buc filtre ulei la șantier A3"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setTransferArticol(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Execută Transfer Parțial</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL EDITARE DEPOZIT */}
      {editingDepozit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Editare Date Depozit ({editingDepozit.nume})</h3>
              <button onClick={() => setEditingDepozit(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDepozit} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Depozit:</label>
                <input required value={editingDepozit.nume} onChange={(e) => setEditingDepozit({ ...editingDepozit, nume: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Adresă / Locație:</label>
                <input value={editingDepozit.adresa || ''} onChange={(e) => setEditingDepozit({ ...editingDepozit, adresa: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Responsabil Depozit (din Mecanici / Personal):</label>
                {mecanici.length > 0 ? (
                  <select
                    value={editingDepozit.responsabil || ''}
                    onChange={(e) => setEditingDepozit({ ...editingDepozit, responsabil: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Fără Responsabil Desemnat --</option>
                    {mecanici.map((m) => (
                      <option key={m.id} value={m.nume}>
                         {m.nume} {m.functie ? `(${m.functie})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={editingDepozit.responsabil || ''}
                    onChange={(e) => setEditingDepozit({ ...editingDepozit, responsabil: e.target.value })}
                    placeholder="ex: Brașoveanu Virgil (Șef Atelier)"
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold"
                  />
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => handleDeleteDepozit(editingDepozit.id)}
                  className="px-3 py-1.5 rounded-lg bg-roseash-100 text-terracotta-600 hover:bg-terracotta-100 border border-roseash-300 text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Șterge Depozit</span>
                </button>

                <div className="flex space-x-2">
                  <button type="button" onClick={() => setEditingDepozit(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Modificările</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL GESTIONARE CATEGORII & SUBCATEGORII */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-sapphire-900">Gestiune Categorii & Subcategorii Stoc</h3>
                <p className="text-xs text-sage-600 font-medium">Configurați structura de categorii  subcategorii a flotei</p>
              </div>
              <button onClick={() => setShowAddCatModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* BANNER FLUIDE */}
            <div className="p-2.5 rounded-xl bg-sapphire-50 border border-sapphire-200 text-xs text-sapphire-900 flex items-center justify-between">
              <span className="text-[11px] font-medium">Uleiurile, fluidele și lubrifianții se gestionează dedicat:</span>
              <a href="/fluide?tab=stocuri" className="font-bold text-[11px] text-sapphire-700 underline hover:text-sapphire-900">
                Gestiune Fluide &rarr;
              </a>
            </div>

            {/* LISTĂ CATEGORII EXISTENTE CU SUBCATEGORII */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-sapphire-900 uppercase tracking-wider">
                Categorii Piese ({categoriiPiese.filter((c: any) => !c.esteFluid && !/lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(c.nume || '')).length}):
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-morning-100/50 rounded-xl border border-morning-200">
                {categoriiPiese.filter((c: any) => !c.esteFluid && !/lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(c.nume || '')).map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white border border-morning-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sapphire-900">{c.nume}</span>
                      <button
                        onClick={() => {
                          setTargetCatForSubcat(c.nume);
                          setShowAddSubcatModal(true);
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-700 hover:bg-sapphire-100 transition"
                      >
                        + Adaugă Subcategorie
                      </button>
                    </div>
                    {c.descriere && <p className="text-[11px] text-sage-600">{c.descriere}</p>}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(c.subcategorii || []).length > 0 ? (
                        c.subcategorii.map((sub: any, sIdx: number) => (
                          <span key={sIdx} className="px-2 py-0.5 rounded-md bg-morning-200 text-sapphire-900 font-bold text-[10px]">
                            • {sub.nume}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-sage-400 italic">Fără subcategorii definite</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FORMULAR ADĂUGARE CATEGORIE NOUĂ */}
            <form onSubmit={handleCreateCategorie} className="space-y-3 text-xs border-t border-morning-200 pt-3">
              <h4 className="text-xs font-extrabold text-sapphire-900 uppercase tracking-wider">+ Creează Categorie Nouă:</h4>
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Categorie:</label>
                <input required value={numeCategorieNoua} onChange={(e) => setNumeCategorieNoua(e.target.value)} placeholder="ex: Componente Hidraulice" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Categorie:</label>
                <input value={descriereCatNoua} onChange={(e) => setDescriereCatNoua(e.target.value)} placeholder="ex: Pompe, distribuitoare, furtunuri" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Stoc Minim Implicit per Categorie:</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={stocMinimImplicitCat}
                  onChange={(e) => setStocMinimImplicitCat(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-extrabold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowAddCatModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Închide</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Categorie</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL CREARE DEPOZIT NOU */}
      {showAddDepozitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Creare Depozit Nou</h3>
              <button onClick={() => setShowAddDepozitModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepozit} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Depozit (ex: Depozit Șantier A3):</label>
                <input required value={numeDepozitNou} onChange={(e) => setNumeDepozitNou(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Adresă / Locație:</label>
                <input value={adresaDepozitNou} onChange={(e) => setAdresaDepozitNou(e.target.value)} placeholder="ex: Șantier Autostradă KM 45" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Responsabil Depozit (din Mecanici Înregistrați): *</label>
                {mecanici.length > 0 ? (
                  <select
                    required
                    value={responsabilDepozitNou}
                    onChange={(e) => setResponsabilDepozitNou(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Selectează Responsabil Depozit --</option>
                    {mecanici.map((m) => (
                      <option key={m.id} value={m.nume}>
                         {m.nume} {m.functie ? `(${m.functie})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={responsabilDepozitNou}
                    onChange={(e) => setResponsabilDepozitNou(e.target.value)}
                    placeholder="ex: Brașoveanu Virgil (Șef Atelier)"
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold"
                  />
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddDepozitModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Depozit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL ADĂUGARE ARTICOL SIMPLU */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Adăugare Articol Nou în Stoc</h3>
              <button onClick={() => setShowAddModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-1.5">
                <CircleDot className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Anvelopele se gestionează separat în <strong>Magazie Anvelope</strong>.
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setActiveTab('anvelope_stoc');
                    setShowAddAnvelopeStocModal(true);
                  }}
                  className="font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                >
                  Adaugă în Magazie Anvelope
                </button>
                <span className="text-emerald-600">·</span>
                <Link href="/anvelope" className="font-bold text-sapphire-700 underline hover:text-sapphire-900">
                  Harta Axe &rarr;
                </Link>
              </div>
            </div>

            <form onSubmit={handleCreateArticol} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod Articol</label>
                  <input required value={codArticol} onChange={(e) => setCodArticol(e.target.value)} placeholder="ex: FLT-009" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Depozit</label>
                  <select value={depozitId} onChange={(e) => setDepozitId(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold">
                    {depozite.map((d) => (
                      <option key={d.id} value={d.id}>{d.nume}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Articol</label>
                <input required value={denumire} onChange={(e) => setDenumire(e.target.value)} placeholder="ex: Filtru ulei motor, Plăcuțe frână..." className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold" />
                {isTireItem({ denumire, codArticol, categorie }) && (
                  <p className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold">
                    Articolul pare să fie o anvelopă. Folosiți butonul „Adaugă în Magazie Anvelope” de mai sus pentru trasabilitate pe serii și axe.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie Principală</label>
                  <select
                    value={categorie}
                    onChange={(e) => {
                      setCategorie(e.target.value);
                      setSubcategorie('');
                      const catObj = categoriiPiese.find((c: any) => c.nume === e.target.value);
                      if (!isFluidCategoryOrItem(e.target.value, catObj?.esteFluid)) {
                        setArticolTipLichid('');
                      }
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold"
                  >
                    {categoriiPiese.map((c, idx) => (
                      <option key={idx} value={c.nume}>{c.nume}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sage-700 font-bold">Subcategorie</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetCatForSubcat(categorie);
                        setShowAddSubcatModal(true);
                      }}
                      className="text-[10px] font-bold text-sapphire-600 hover:underline"
                    >
                      + Subcategorie
                    </button>
                  </div>
                  <select
                    value={subcategorie}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSubcategorie(val);
                      const subObj = getSubcategoriiPentruCategorie(categorie).find((s: any) => s.nume === val);
                      if (subObj?.tipLichid) {
                        setArticolTipLichid(subObj.tipLichid);
                      }
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Fără Subcategorie --</option>
                    {getSubcategoriiPentruCategorie(categorie).map((sub: any, idx: number) => (
                      <option key={idx} value={sub.nume}>{sub.nume}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isFluidCategoryOrItem(
                categorie,
                categorii.find((c: any) => c.nume === categorie)?.esteFluid,
                articolTipLichid,
                unitateMasura,
                denumire,
              ) && (
                <div className="p-2.5 bg-sapphire-50/70 border border-sapphire-200 rounded-xl">
                  <label className="text-sapphire-900 block mb-1 font-bold">
                    Tip Lubrifiant / Normă Întreținere:
                  </label>
                  <select
                    value={articolTipLichid}
                    onChange={(e) => setArticolTipLichid(e.target.value)}
                    className="w-full bg-white border border-sapphire-200 rounded-lg p-2 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Fără asociere normă (detectare automată) --</option>
                    {tipuriFluide.map((tf) => (
                      <option key={tf.cod} value={tf.cod}>
                        {tf.nume} ({tf.cod})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Inițial</label>
                  <input type="number" value={stocCurent} onChange={(e) => setStocCurent(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Minim</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stocMinim}
                    onChange={(e) => setStocMinim(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar</label>
                  <input type="number" value={pretUnitar} onChange={(e) => setPretUnitar(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Articol</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL CREARE SUBCATEGORIE NOUĂ */}
      {showAddSubcatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-lg font-bold text-sapphire-900">Adăugare Subcategorie Nouă</h3>
              <button onClick={() => setShowAddSubcatModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubcategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Categorie Părinte:</label>
                <select
                  value={targetCatForSubcat}
                  onChange={(e) => setTargetCatForSubcat(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold"
                >
                  {categoriiPiese.map((c, idx) => (
                    <option key={idx} value={c.nume}>{c.nume}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Subcategorie (ex: filtre aer, injectoare):</label>
                <input
                  required
                  value={numeSubcatNoua}
                  onChange={(e) => setNumeSubcatNoua(e.target.value)}
                  placeholder="ex: filtre aer, injectoare, garnituri..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              {isFluidCategoryOrItem(
                targetCatForSubcat,
                categorii.find((c: any) => c.nume === targetCatForSubcat)?.esteFluid,
              ) && (
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">
                    Tip Lubrifiant / Normă Asociată (opțional):
                  </label>
                  <select
                    value={subcatTipLichidNou}
                    onChange={(e) => setSubcatTipLichidNou(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Fără asociere implicită --</option>
                    {tipuriFluide.map((tf) => (
                      <option key={tf.cod} value={tf.cod}>
                        {tf.nume} ({tf.cod})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddSubcatModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Subcategorie</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITARE ARTICOL */}
      {editingArticol && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl border border-morning-200 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900">Editare Articol Stoc ({editingArticol.codArticol})</h3>
              <button onClick={() => setEditingArticol(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateArticol} className="space-y-3.5 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Articol: *</label>
                <input
                  required
                  value={editingArticol.denumire || ''}
                  onChange={(e) => setEditingArticol({ ...editingArticol, denumire: e.target.value })}
                  placeholder="ex: Filtru ulei, Plăcuțe frână, Senzor presiune..."
                  className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold text-xs focus:ring-2 focus:ring-sapphire-500/20"
                />
              </div>

              {renderCategorySubcategoryPicker({
                scope: 'EDIT_MODAL',
                categorieVal: editingArticol.categorie || '',
                subcategorieVal: editingArticol.subcategorie || '',
                onChangeCat: (newCat) =>
                  setEditingArticol((prev: any) => (prev ? { ...prev, categorie: newCat, subcategorie: '' } : prev)),
                onChangeSubcat: (newSub) =>
                  setEditingArticol((prev: any) => {
                    if (!prev) return prev;
                    const subObj = getSubcategoriiPentruCategorie(prev.categorie).find((x: any) => x.nume === newSub);
                    return {
                      ...prev,
                      subcategorie: newSub,
                      tipLichid: subObj?.tipLichid || prev.tipLichid || '',
                    };
                  }),
              })}

              {isFluidCategoryOrItem(
                editingArticol.categorie,
                categorii.find((c: any) => c.nume === editingArticol.categorie)?.esteFluid,
                editingArticol.tipLichid,
                editingArticol.unitateMasura,
                editingArticol.denumire,
              ) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-sapphire-50/70 border border-sapphire-200 rounded-xl">
                  <div>
                    <label className="text-sapphire-900 block mb-1 font-bold">
                      Tip Lubrifiant / Normă Întreținere:
                    </label>
                    <select
                      value={editingArticol.tipLichid || ''}
                      onChange={(e) => setEditingArticol({ ...editingArticol, tipLichid: e.target.value })}
                      className="w-full bg-white border border-sapphire-200 rounded-xl p-2 text-sapphire-900 font-bold text-xs"
                    >
                      <option value="">-- Fără asociere normă (auto) --</option>
                      {tipuriFluide.map((tf) => (
                        <option key={tf.cod} value={tf.cod}>
                          {tf.nume} ({tf.cod})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sapphire-900 block mb-1 font-bold">Marcă Lubrifiant (Opțional):</label>
                    <input
                      value={editingArticol.marcaUlei || ''}
                      onChange={(e) => setEditingArticol({ ...editingArticol, marcaUlei: e.target.value })}
                      placeholder="ex: Mobil, Castrol, Liebherr"
                      className="w-full bg-white border border-sapphire-200 rounded-xl p-2 text-sapphire-900 font-semibold text-xs"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Notă Internă / Observații (Opțional):</label>
                <input
                  value={editingArticol.observatiiIntern || ''}
                  onChange={(e) => setEditingArticol({ ...editingArticol, observatiiIntern: e.target.value })}
                  placeholder="ex: Vopsea gri antracit atelier, filtru aer secundar..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium text-xs focus:bg-white"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Depozit Stoc: *</label>
                <select
                  required
                  value={editingArticol.depozitId || ''}
                  onChange={(e) => setEditingArticol({ ...editingArticol, depozitId: e.target.value })}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume} ({d.adresa || 'Atelier'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Curent</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingArticol.stocCurent}
                    onChange={(e) => setEditingArticol({ ...editingArticol, stocCurent: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Minim</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingArticol.stocMinim}
                    onChange={(e) => setEditingArticol({ ...editingArticol, stocMinim: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-extrabold text-terracotta-600"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar (RON)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingArticol.pretUnitar}
                    onChange={(e) => setEditingArticol({ ...editingArticol, pretUnitar: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => handleDeleteArticol(editingArticol.id)}
                  className="px-3 py-1.5 rounded-lg bg-roseash-100 text-terracotta-600 hover:bg-terracotta-100 border border-roseash-300 text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Șterge Articol</span>
                </button>

                <div className="flex space-x-2">
                  <button type="button" onClick={() => setEditingArticol(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Modificările</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITARE ANVELOPĂ SERIALIZATĂ DIN MAGAZIE (CU RECLASIFICARE ÎN GESTIUNE PIESE) */}
      {editingAnvelopaStoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl border border-morning-200 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <CircleDot className="w-5 h-5 text-sapphire-500" />
                <h3 className="text-base font-bold text-sapphire-900">
                  {reclassifyMode
                    ? `Mutare în Gestiune Piese (${editingAnvelopaStoc.serieAnvelopa})`
                    : `Editare Anvelopă Serializată (${editingAnvelopaStoc.serieAnvelopa})`}
                </h3>
              </div>
              <button onClick={() => setEditingAnvelopaStoc(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2 bg-morning-100 p-1 rounded-xl border border-morning-200 text-xs">
              <button
                type="button"
                onClick={() => setReclassifyMode(false)}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  !reclassifyMode ? 'bg-sapphire-600 text-white shadow-xs' : 'text-sage-700 hover:text-sapphire-900'
                }`}
              >
                Editare Date Anvelopă
              </button>
              <button
                type="button"
                onClick={() => setReclassifyMode(true)}
                className={`flex-1 py-1.5 rounded-lg font-bold transition ${
                  reclassifyMode ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                Mută în Piese &amp; Categorie
              </button>
            </div>

            {reclassifyMode ? (
              <form onSubmit={handleReclassifyAnvelopaToStock} className="space-y-3.5 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-1">
                  <p className="font-extrabold">Reclasificare din Magazie Anvelope → Gestiune Piese &amp; Consumabile</p>
                  <p className="text-[11px] text-amber-800">
                    Folosiți această opțiune pentru articole importate greșit ca anvelopă (ex: vopsea Kober, piese, consumabile). Articolul va fi mutat în stocul de piese cu categoria și subcategoria aleasă.
                  </p>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Denumire Articol în Stoc: *</label>
                  <input
                    required
                    value={reclassifyData.denumire}
                    onChange={(e) => setReclassifyData({ ...reclassifyData, denumire: e.target.value })}
                    className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold text-xs"
                  />
                </div>

                {renderCategorySubcategoryPicker({
                  scope: 'RECLASSIFY',
                  categorieVal: reclassifyData.categorie,
                  subcategorieVal: reclassifyData.subcategorie,
                  onChangeCat: (newCat) => setReclassifyData((prev) => ({ ...prev, categorie: newCat, subcategorie: '' })),
                  onChangeSubcat: (newSub) => setReclassifyData((prev) => ({ ...prev, subcategorie: newSub })),
                })}

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Depozit Stoc Target: *</label>
                  <select
                    required
                    value={reclassifyData.depozitId}
                    onChange={(e) => setReclassifyData({ ...reclassifyData, depozitId: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {depozite.map((d) => (
                      <option key={d.id} value={d.id}>{d.nume} ({d.adresa || 'Atelier'})</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-morning-200">
                  <button
                    type="button"
                    onClick={() => setEditingAnvelopaStoc(null)}
                    className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={reclassifying || !reclassifyData.categorie.trim()}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md disabled:opacity-50"
                  >
                    {reclassifying ? 'Se mută...' : 'Mută în Gestiune Piese'}
                  </button>
                </div>
              </form>
            ) : (
            <form onSubmit={handleUpdateAnvelopaStoc} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Serie Unică (SN): *</label>
                  <input
                    required
                    value={editingAnvelopaStoc.serieAnvelopa || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, serieAnvelopa: e.target.value })}
                    className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-black text-xs focus:ring-2 focus:ring-sapphire-500/20"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod DOT / Fabricație:</label>
                  <input
                    value={editingAnvelopaStoc.codDot || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, codDot: e.target.value })}
                    placeholder="ex: 2625"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Marcă: *</label>
                  <input
                    required
                    value={editingAnvelopaStoc.marca || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, marca: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Model:</label>
                  <input
                    value={editingAnvelopaStoc.model || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, model: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Dimensiune: *</label>
                  <input
                    required
                    value={editingAnvelopaStoc.dimensiune || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, dimensiune: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Rulaj Total Acumulat (KM):</label>
                  <input
                    type="number"
                    value={editingAnvelopaStoc.rulajTotalKm || 0}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, rulajTotalKm: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Achiziție (RON):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingAnvelopaStoc.pretAchizitie || 0}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, pretAchizitie: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Depozit / Locație Depozitare: *</label>
                <select
                  value={editingAnvelopaStoc.depozitId || ''}
                  onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, depozitId: e.target.value })}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume} ({d.adresa || 'Atelier'})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => handleDeleteAnvelopaStoc(editingAnvelopaStoc.id, editingAnvelopaStoc.serieAnvelopa)}
                  className="px-3 py-1.5 rounded-lg bg-roseash-100 text-terracotta-600 hover:bg-terracotta-100 border border-roseash-300 text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Elimină din Magazie</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingAnvelopaStoc(null)}
                    className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20"
                  >
                    Salvează Modificările
                  </button>
                </div>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL ÎNREGISTRARE LOT NOU ANVELOPE SERIALIZATE */}
      {showAddAnvelopeStocModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-2xl border border-morning-200 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-sapphire-500" />
                <h3 className="text-base font-bold text-sapphire-900">
                  Adăugare Anvelope Noi pe Serii în Magazie
                </h3>
              </div>
              <button onClick={() => setShowAddAnvelopeStocModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAnvelopeBatchSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Marcă: *</label>
                  <input
                    required
                    value={newBatchAnv.marca}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, marca: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Model:</label>
                  <input
                    value={newBatchAnv.model}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, model: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Dimensiune: *</label>
                  <input
                    required
                    value={newBatchAnv.dimensiune}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, dimensiune: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cantitate (Buc): *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={newBatchAnv.cantitate}
                    onChange={(e) => {
                      const count = Math.max(1, Number(e.target.value));
                      const newSerii = Array(count).fill('').map((_, i) => newBatchAnv.serii[i] || '');
                      setNewBatchAnv({ ...newBatchAnv, cantitate: count, serii: newSerii });
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod DOT:</label>
                  <input
                    value={newBatchAnv.codDot}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, codDot: e.target.value })}
                    placeholder="2625"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar (RON):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newBatchAnv.pretAchizitie}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, pretAchizitie: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Depozit Destinație: *</label>
                <select
                  value={newBatchAnv.depozitId || ''}
                  onChange={(e) => setNewBatchAnv({ ...newBatchAnv, depozitId: e.target.value })}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume} ({d.adresa || 'Atelier'})</option>
                  ))}
                </select>
              </div>

              {/* Serii Individuale per Bucată */}
              <div className="p-3 bg-morning-50 rounded-xl border border-morning-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sapphire-900 text-xs">
                    Serii Individuale per Bucată ({newBatchAnv.cantitate} buc):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = (newBatchAnv.marca.slice(0, 3) || 'ANV').toUpperCase();
                      const genSerii = Array(newBatchAnv.cantitate).fill('').map((_, i) => `${prefix}-${Date.now().toString().slice(-4)}${i + 1}`);
                      setNewBatchAnv({ ...newBatchAnv, serii: genSerii });
                    }}
                    className="text-[10px] text-sapphire-600 hover:underline font-bold"
                  >
                    Generează Serii Automate
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {Array.from({ length: newBatchAnv.cantitate }).map((_, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-sage-500 font-mono w-5">#{idx + 1}</span>
                      <input
                        value={newBatchAnv.serii[idx] || ''}
                        onChange={(e) => {
                          const sCopy = [...newBatchAnv.serii];
                          sCopy[idx] = e.target.value;
                          setNewBatchAnv({ ...newBatchAnv, serii: sCopy });
                        }}
                        placeholder={`Serie bucata ${idx + 1}`}
                        className="w-full bg-white border border-morning-200 rounded-lg p-1.5 font-mono font-bold text-sapphire-900 text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowAddAnvelopeStocModal(false)}
                  className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  Înregistrează {newBatchAnv.cantitate} Anvelope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL TRASABILITATE LOTURI FIFO */}
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
                    Depozit: <strong>{viewingFifoArticol.depozit?.nume || 'Depozit Central'}</strong> | Categorie: <strong>{viewingFifoArticol.categorie}</strong> {viewingFifoArticol.subcategorie && <span>▸ <strong>{viewingFifoArticol.subcategorie}</strong></span>} | Stoc Total: <strong className="text-emerald-700 font-mono">{viewingFifoArticol.stocCurent} {viewingFifoArticol.unitateMasura}</strong>
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
                  Consumul la completări de fluide, revizii sau comenzi de lucru debitează automat lotul cel mai vechi cu cantitate rămasă. După epuizarea unui lot, sistemul trece instant la următorul lot recepționat, calculând prețul de cost ponderat corect și păstrând trasabilitatea completă a facturilor furnizorilor.
                </p>
              </div>
            </div>

            {/* Corp modal: tabel loturi sau stare gol */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loadingFifoLoturi ? (
                <div className="py-12 text-center text-xs font-bold text-slate-500 animate-pulse">
                  Se încarcă istoricul loturilor FIFO...
                </div>
              ) : fifoLoturiList.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Layers className="w-8 h-8 text-sage-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Nu există loturi de recepție pe factură înregistrate pentru acest articol.</p>
                  <p className="text-[11px] text-sage-500">Stocul curent ({viewingFifoArticol.stocCurent} {viewingFifoArticol.unitateMasura}) provine din inițializarea stocului sau adăugare fără factură detaliată.</p>
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
                            <th className="p-2.5 font-mono">Preț Achiziție & Total</th>
                            <th className="p-2.5 text-center">Stare Consum</th>
                            <th className="p-2.5 text-center">Factură Fiscală</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-200">
                          {fifoLoturiList.map((lot, idx) => {
                            const cantRamasa = lot.cantitateRamasa ?? lot.cantitateIntrata;
                            const esteEpuizat = cantRamasa <= 0.001;
                            const estePrioritar = idx === firstActiveIdx && !esteEpuizat;
                            const lotCostTotal = lot.pretTotal || (lot.cantitateIntrata * (lot.pretUnitar || 0));

                            return (
                              <tr
                                key={lot.id}
                                className={`transition ${
                                  estePrioritar
                                    ? 'bg-emerald-50/80 font-semibold'
                                    : esteEpuizat
                                    ? 'bg-slate-50/60 opacity-60'
                                    : 'hover:bg-morning-50'
                                }`}
                              >
                                <td className="p-2.5 font-mono font-bold text-sapphire-900 flex items-center space-x-1.5">
                                  <span>#{idx + 1}</span>
                                  {estePrioritar && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-600 text-white uppercase tracking-wider">
                                      Activ
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-700 font-medium">
                                  {lot.dataFactura
                                    ? new Date(lot.dataFactura).toLocaleDateString('ro-RO')
                                    : new Date(lot.createdAt).toLocaleDateString('ro-RO')}
                                </td>
                                <td className="p-2.5">
                                  <span className="font-bold text-sapphire-900 block">{lot.numarFactura || 'Fără Număr'}</span>
                                  <span className="text-[10px] text-sage-600">{lot.furnizor || 'Furnizor Nespecificat'}</span>
                                </td>
                                <td className="p-2.5 font-mono font-bold text-slate-700">
                                  {lot.cantitateIntrata} {viewingFifoArticol.unitateMasura}
                                </td>
                                <td className="p-2.5 font-mono">
                                  <span
                                    className={`px-2 py-0.5 rounded font-extrabold text-xs ${
                                      esteEpuizat
                                        ? 'bg-slate-200 text-slate-600'
                                        : estePrioritar
                                        ? 'bg-emerald-200 text-emerald-950 border border-emerald-400'
                                        : 'bg-morning-200 text-sapphire-900'
                                    }`}
                                  >
                                    {cantRamasa.toFixed(2)} {viewingFifoArticol.unitateMasura}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono">
                                  <span className="font-bold text-sapphire-900 block">
                                    {Number(lot.pretUnitar || 0).toLocaleString('ro-RO', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{' '}
                                    RON / {viewingFifoArticol.unitateMasura}
                                  </span>
                                  <span className="text-[10px] text-sage-600 font-medium">
                                    Total: {Number(lotCostTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                                  </span>
                                </td>
                                <td className="p-2.5 text-center">
                                  {esteEpuizat ? (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                      <span>Consumat integral</span>
                                    </span>
                                  ) : estePrioritar ? (
                                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping mr-1" />
                                      <span>Următorul la consum</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sapphire-50 text-sapphire-700 border border-sapphire-200">
                                      <span>În așteptare FIFO</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  {lot.numarFactura && lot.numarFactura !== 'Fără Număr' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFacturaInEfactura(lot.numarFactura)}
                                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-800 text-[11px] font-bold border border-sapphire-200 transition shadow-2xs"
                                      title="Deschide și filtrează această factură în ANAF e-Factura"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-sapphire-600" />
                                      <span>Vezi Factură</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Fără document</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div className="flex items-center justify-between p-3 bg-morning-100 rounded-xl text-xs">
                        <span className="text-sage-700 font-medium">
                          Total cantitate disponibilă în loturi contorizate FIFO:
                        </span>
                        <span className="font-mono font-extrabold text-sapphire-900">
                          {totalRamas.toFixed(2)} {viewingFifoArticol.unitateMasura} (Stoc total înregistrat: {viewingFifoArticol.stocCurent} {viewingFifoArticol.unitateMasura})
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => setViewingFifoArticol(null)}
                className="px-5 py-2 rounded-xl bg-morning-200 hover:bg-morning-300 text-slate-800 font-bold text-xs transition"
              >
                Închide Fereastra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODÁL DEMONTARE COMPONENTĂ */}
      {selectedComp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Demontare Componentă ({selectedComp.serieUnica})</h3>
              <button onClick={() => setSelectedComp(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDemonteaza} className="space-y-3 text-xs">
              <div className="p-3 bg-morning-100 rounded-xl border border-morning-200 space-y-1">
                <p className="font-bold text-sapphire-600">{selectedComp.articolStoc?.denumire || 'Componentă serializată'}</p>
                <p className="text-sage-700 font-medium">
                  Furnizor: {selectedComp.articolStoc?.intrariStoc?.[0]?.furnizor || selectedComp.furnizor || 'Nespecificat'}
                  {(selectedComp.articolStoc?.intrariStoc?.[0]?.numarFactura || selectedComp.numarFactura)
                    ? ` (Factură: ${selectedComp.articolStoc?.intrariStoc?.[0]?.numarFactura || selectedComp.numarFactura})`
                    : ''}
                </p>
                {selectedComp.vehicul?.numarIntern && (
                  <p className="text-sapphire-900 font-semibold">
                    Utilaj montat: {selectedComp.vehicul.numarIntern}
                    {selectedComp.vehicul.numarInmatriculare ? ` (${selectedComp.vehicul.numarInmatriculare})` : ''}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Motiv Demontare / Defecțiune Constatată:</label>
                <textarea
                  required
                  rows={3}
                  value={motivDemontare}
                  onChange={(e) => setMotivDemontare(e.target.value)}
                  placeholder="ex: Pierderi de presiune, joc excesiv în bucșă/ax"
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setSelectedComp(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold shadow-md shadow-terracotta-500/20">Demontează & Verifică Garanție</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StocuriGarantiiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Se încarcă modulul Stocuri & Garanții...</div>}>
      <StocuriGarantiiContent />
    </Suspense>
  );
}
