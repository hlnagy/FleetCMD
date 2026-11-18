"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import {
  Wrench, Plus, CheckCircle2, DollarSign, Filter, Search, FileText, X, Trash2,
  ShieldAlert, UserPlus, Users, Check, Clock, PackageCheck, Printer, Eye, Edit3,
  Unlock, RotateCcw, Calendar, Truck, Loader2, Package, Minus, AlertCircle, Info,
  ShoppingCart, RefreshCw, GripHorizontal, Maximize2, Minimize2, Building2, ChevronDown, ChevronUp, GitMerge
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';
import DraggableModal from '@/components/DraggableModal';
import { useTabWorkspace } from '@/lib/TabWorkspaceContext';

// Module-level persistent cache across tab switching
interface ComenziLucruCache {
  comenzi?: any[];
  vehicule?: any[];
  stocuri?: any[];
  mecaniciList?: any[];
  searchQuery?: string;
  stareFilter?: string;
  vehiculFilter?: string;
  mecanicFilter?: string;
  lastFetchTime?: number;
}

const comenziCache: ComenziLucruCache = {};

const PILON_COST_CONFIG: Record<
  'PIESA_STOC' | 'PIESA_DEZMEMBRATA' | 'PIESA_DIRECTA' | 'MANOPERA_INTERNA' | 'PRESTATIE_EXTERNA',
  {
    label: string;
    shortLabel: string;
    inputLabel: string;
    placeholder: string;
    activeClass: string;
    badgeClass: string;
    accentDot: string;
    icon: any;
  }
> = {
  PIESA_STOC: {
    label: 'Stoc Magazie (FIFO)',
    shortLabel: 'Stoc Intern',
    inputLabel: 'Caută Piesă în Magazie',
    placeholder: 'Tastează cod, denumire, categorie sau depozit (ex: LF16015, ulei, plăcuțe)...',
    activeClass: 'bg-sapphire-600 text-white shadow-xs',
    badgeClass: 'bg-sapphire-50 text-sapphire-700 border-sapphire-200',
    accentDot: 'bg-sapphire-500',
    icon: Package,
  },
  PIESA_DEZMEMBRATA: {
    label: 'Dezmembrări (0 RON)',
    shortLabel: 'Dezmembrări (0 RON)',
    inputLabel: 'Denumire Piesă din Dezmembrări',
    placeholder: 'ex: Pompă servo recuperată din parc',
    activeClass: 'bg-emerald-600 text-white shadow-xs',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    accentDot: 'bg-emerald-500',
    icon: RefreshCw,
  },
  PIESA_DIRECTA: {
    label: 'Achiziție Directă',
    shortLabel: 'Achiziție Directă',
    inputLabel: 'Denumire Piesă Achiziționată Direct',
    placeholder: 'ex: Set garnituri chiulasă (factură Bardi)',
    activeClass: 'bg-amber-600 text-white shadow-xs',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    accentDot: 'bg-amber-500',
    icon: ShoppingCart,
  },
  MANOPERA_INTERNA: {
    label: 'Manoperă Atelier',
    shortLabel: 'Manoperă Atelier',
    inputLabel: 'Denumire Operațiune / Lucrare',
    placeholder: 'ex: Înlocuire garnituri + aerisire sistem',
    activeClass: 'bg-indigo-600 text-white shadow-xs',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    accentDot: 'bg-indigo-500',
    icon: Wrench,
  },
  PRESTATIE_EXTERNA: {
    label: 'Service Extern',
    shortLabel: 'Service Extern',
    inputLabel: 'Denumire Serviciu Extern',
    placeholder: 'ex: Rectificare chiulasă atelier extern',
    activeClass: 'bg-slate-700 text-white shadow-xs',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    accentDot: 'bg-slate-500',
    icon: Truck,
  },
};

const getWarehouseName = (item: any): string => item?.depozit?.nume || 'Magazie Centrală';

export default function ComenziLucruPage() {
  const { openTab } = useTabWorkspace();

  const handleOpenFacturaInEfactura = (numarFactura?: string) => {
    if (!numarFactura || numarFactura === 'Fără Număr' || numarFactura === '-') return;
    openTab({
      id: '/efactura?tab=efactura',
      title: `Factură: ${numarFactura}`,
      href: `/efactura?tab=efactura&search=${encodeURIComponent(numarFactura)}`,
      iconName: 'FileText',
    });
  };

  const [comenzi, setComenzi] = useState<any[]>(() => comenziCache.comenzi || []);
  const [vehicule, setVehicule] = useState<any[]>(() => comenziCache.vehicule || []);
  const [stocuri, setStocuri] = useState<any[]>(() => comenziCache.stocuri || []);
  const [mecaniciList, setMecaniciList] = useState<any[]>(() => comenziCache.mecaniciList || []);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);
  const COLLAPSE_ELEMENTS_THRESHOLD = 3;
  const COLLAPSED_PREVIEW_COUNT = 2;

  const toggleOrderElementsExpanded = (orderId: string) => {
    setExpandedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Filtre
  const [searchQuery, setSearchQuery] = useState(() => comenziCache.searchQuery || '');
  const [stareFilter, setStareFilter] = useState(() => comenziCache.stareFilter || 'TOATE');
  const [vehiculFilter, setVehiculFilter] = useState(() => comenziCache.vehiculFilter || 'TOATE');
  const [mecanicFilter, setMecanicFilter] = useState(() => comenziCache.mecanicFilter || 'TOATE');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');

  // Sync cache with filters
  useEffect(() => {
    comenziCache.searchQuery = searchQuery;
    comenziCache.stareFilter = stareFilter;
    comenziCache.vehiculFilter = vehiculFilter;
    comenziCache.mecanicFilter = mecanicFilter;
  }, [searchQuery, stareFilter, vehiculFilter, mecanicFilter]);

  // Modale
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMecanicModal, setShowAddMecanicModal] = useState(false);
  const [showAddElementModal, setShowAddElementModal] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState<any>(null);

  // Form State Comandă Lucru Nouă
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [valoareContorExecutie, setValoareContorExecutie] = useState<string>('0');
  const [selectedMecanici, setSelectedMecanici] = useState<string[]>([]);
  const [observatii, setObservatii] = useState('');
  const [autoFinalize, setAutoFinalize] = useState(false);

  // Stare Căutare & Filtrare Vehicule (Vehicle Selection)
  const [vehiculSearchQuery, setVehiculSearchQuery] = useState('');
  const [vehiculCategoryFilter, setVehiculCategoryFilter] = useState('TOATE');
  const [isVehiculSearchOpen, setIsVehiculSearchOpen] = useState(false);

  // Single initial element state (Implicit false - deviz curat)
  const [hasInitialPart, setHasInitialPart] = useState(false);
  const [pilonCost, setPilonCost] = useState('PIESA_STOC');
  const [descrierePiesa, setDescrierePiesa] = useState('');
  const [selectedArticolStocId, setSelectedArticolStocId] = useState('');
  const [cantitate, setCantitate] = useState(1);
  const [pretUnitar, setPretUnitar] = useState<number>(0);
  const [provenienta, setProvenienta] = useState('Stoc Intern');

  // Form State Adăugare Element Suplimentar pe Comandă Deschisă
  const [elemPilonCost, setElemPilonCost] = useState('PIESA_STOC');
  const [elemDescriere, setElemDescriere] = useState('');
  const [elemArticolStocId, setElemArticolStocId] = useState('');
  const [elemCantitate, setElemCantitate] = useState(1);
  const [elemPretUnitar, setElemPretUnitar] = useState<number>(0);

  // Form State Creare Mecanic Nou
  const [numeMecanicNou, setNumeMecanicNou] = useState('');
  const [functieMecanicNou, setFunctieMecanicNou] = useState('Mecanic Atelier');
  const [telefonMecanicNou, setTelefonMecanicNou] = useState('');

  // Form State Editare Comandă Lucru
  const [editMecanici, setEditMecanici] = useState<string[]>([]);
  const [editObservatii, setEditObservatii] = useState('');
  const [editElemente, setEditElemente] = useState<any[]>([]);

  // Quick-Add Bar State pentru Editor Comandă & Căutare Piese
  const [quickPilonCost, setQuickPilonCost] = useState<'PIESA_STOC' | 'PIESA_DEZMEMBRATA' | 'PIESA_DIRECTA' | 'MANOPERA_INTERNA' | 'PRESTATIE_EXTERNA'>('PIESA_STOC');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSelectedWarehouse, setQuickSelectedWarehouse] = useState('TOATE');
  const [quickSelectedCategory, setQuickSelectedCategory] = useState('TOATE');
  const [quickSelectedArticol, setQuickSelectedArticol] = useState<any | null>(null);
  const [quickDescriere, setQuickDescriere] = useState('');
  const [quickCantitate, setQuickCantitate] = useState<number>(1);
  const [quickPretUnitar, setQuickPretUnitar] = useState<number>(0);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isSavingAndFinalizing, setIsSavingAndFinalizing] = useState(false);

  // Merge (Unire / Comasare Comenzi de Lucru pe același vehicul)
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeModalVehiculId, setMergeModalVehiculId] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [mergeObservatii, setMergeObservatii] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch Vehicule & Comenzi
      const resVeh = await fetch(`${API_BASE_URL}/vehicule`);
      if (resVeh.ok) {
        const data = await resVeh.json();
        setVehicule(data);
        if (data.length > 0 && !selectedVehiculId) {
          setSelectedVehiculId(data[0].id);
        }

        const allCL = data.flatMap((v: any) =>
          (v.comenziLucru || []).map((cl: any) => ({
            ...cl,
            vehiculNumarIntern: v.numarIntern,
            vehiculInmatriculare: v.numarInmatriculare,
            vehiculMarca: v.marca,
            vehiculModel: v.model,
            vehiculSerieSasiu: v.serieSasiu || v.vin || 'N/A',
            vehiculValoareContor: v.valoareContorCurent || 0,
            vehiculTipMasurare: v.tipMasurare || 'KM',
          }))
        );

        // Întotdeauna cele mai noi comenzi în capul listei
        allCL.sort((a: any, b: any) => {
          const timeA = new Date(a.createdAt || a.dataDeschidere).getTime();
          const timeB = new Date(b.createdAt || b.dataDeschidere).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return (b.numarComanda || '').localeCompare(a.numarComanda || '', undefined, { numeric: true });
        });

        setComenzi(allCL);
        comenziCache.comenzi = allCL;
        comenziCache.vehicule = data;
        comenziCache.lastFetchTime = Date.now();
      }

      // Fetch Stocuri
      const resStoc = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri`);
      if (resStoc.ok) {
        const stData = await resStoc.json();
        setStocuri(stData);
        comenziCache.stocuri = stData;
      }

      // Fetch Mecanici
      const resMec = await fetch(`${API_BASE_URL}/mentenanta/mecanici`);
      if (resMec.ok) {
        const mecData = await resMec.json();
        setMecaniciList(mecData);
        comenziCache.mecaniciList = mecData;
        if (mecData.length > 0 && selectedMecanici.length === 0) {
          setSelectedMecanici([mecData[0].nume]);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    const now = Date.now();
    const hasCache = comenziCache.comenzi && comenziCache.comenzi.length > 0;
    const isFresh = hasCache && (now - (comenziCache.lastFetchTime || 0) < 60000);

    if (!isFresh) {
      fetchData();
    }
  }, []);

  const formatContorDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getVehiculContorDate = (v: any) => {
    if (!v) return null;
    const rawDate = v.istoricContor?.[0]?.dataInregistrare || v.dataInregistrareContor || v.updatedAt;
    return formatContorDate(rawDate);
  };

  const getCategoryLabel = (catEnum: string) => {
    const c = (catEnum || '').toUpperCase();
    if (c.includes('CAP_TRACTOR') || c.includes('TRACTOR')) return 'Cap Tractor';
    if (c.includes('SEMIREMORCA') || c.includes('REMORCA')) return 'Semiremorcă';
    if (c.includes('BASCULANT') || c.includes('BASCULA')) return 'Basculantă';
    if (c.includes('EXCAVATOR')) return 'Excavator';
    if (c.includes('INCARCATOR')) return 'Încărcător';
    if (c.includes('BULLDOZER')) return 'Bulldozer';
    if (c.includes('AUTOVALT') || c.includes('COMPACTOR')) return 'Compactor';
    if (c.includes('AUTOUTILITARA') || c.includes('VAN')) return 'Autoutilitară';
    if (c.includes('TURISM') || c.includes('AUTO')) return 'Turism';
    return catEnum || 'Utilaj';
  };

  const getCategoryIcon = (catEnum: string) => {
    const c = (catEnum || '').toUpperCase();
    if (c.includes('CAP_TRACTOR') || c.includes('TRACTOR')) return '🚛';
    if (c.includes('SEMIREMORCA') || c.includes('REMORCA')) return '🏁';
    if (c.includes('BASCULANT') || c.includes('BASCULA')) return '🚚';
    if (c.includes('EXCAVATOR') || c.includes('INCARCATOR') || c.includes('BULLDOZER')) return '🚜';
    if (c.includes('AUTOUTILITARA') || c.includes('TURISM') || c.includes('AUTO')) return '🚗';
    return '⚙️';
  };

  const getProvenientaSuffix = (el: any) => {
    if (!el) return null;
    const isStock =
      el.pilonCost === 'PIESA_STOC' ||
      (!el.pilonCost && (!el.provenienta || el.provenienta === 'Stoc Intern' || el.provenienta === 'Magazie'));
    if (isStock) return null;

    let prov = '';
    if (el.provenienta && el.provenienta !== 'Stoc Intern' && el.provenienta !== 'Magazie') {
      prov = el.provenienta;
    } else if (el.pilonCost === 'PIESA_DEZMEMBRATA') {
      prov = 'Dezmembrări';
    } else if (el.pilonCost === 'PIESA_DIRECTA') {
      prov = 'Achiziție Directă';
    } else if (el.pilonCost === 'MANOPERA_INTERNA') {
      prov = 'Manoperă Atelier';
    } else if (el.pilonCost === 'PRESTATIE_EXTERNA') {
      prov = 'Prestație Externă';
    }

    if (prov && el.descriere && el.descriere.toLowerCase().includes(prov.toLowerCase())) {
      return null;
    }

    return prov || null;
  };

  const handleSelectVehicul = (vId: string) => {
    setSelectedVehiculId(vId);
    setValoareContorExecutie('0');
  };

  const handleSelectArticolStoc = (articolId: string) => {
    setSelectedArticolStocId(articolId);
    const item = stocuri.find((s) => s.id === articolId);
    if (item) {
      setPretUnitar(item.pretUnitar || 0);
      setDescrierePiesa(item.denumire);
    }
  };

  const isTireCategory = (catName: string) => {
    if (!catName) return false;
    const c = String(catName).toLowerCase();
    return c.includes('anvelop') || c.includes('cauciuc') || c.includes('pneu');
  };

  const isTireItem = (item: any) => {
    if (!item) return false;
    const cat = String(item.categorie || '').toLowerCase();
    const sub = String(item.subcategorie || '').toLowerCase();
    const cod = String(item.codArticol || '').toUpperCase();
    const den = String(item.denumire || '').toLowerCase();
    return (
      isTireCategory(cat) ||
      isTireCategory(sub) ||
      cod.startsWith('ANV') ||
      /anvelop|cauciuc|r22\.5|r17\.5|r20|r24|315\/80|385\/65/i.test(den)
    );
  };

  const handleSelectElemArticolStoc = (articolId: string) => {
    setElemArticolStocId(articolId);
    const item = stocuri.find((s) => s.id === articolId);
    if (item) {
      setElemPretUnitar(item.pretUnitar || 0);
      setElemDescriere(item.denumire);
    }
  };

  const toggleMecanicSelection = (nume: string) => {
    if (selectedMecanici.includes(nume)) {
      if (selectedMecanici.length > 1) {
        setSelectedMecanici(selectedMecanici.filter((m) => m !== nume));
      }
    } else {
      setSelectedMecanici([...selectedMecanici, nume]);
    }
  };

  const toggleEditMecanicSelection = (nume: string) => {
    if (editMecanici.includes(nume)) {
      if (editMecanici.length > 1) {
        setEditMecanici(editMecanici.filter((m) => m !== nume));
      }
    } else {
      setEditMecanici([...editMecanici, nume]);
    }
  };

  const handleCreateMecanic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/mecanici`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeMecanicNou,
          functie: functieMecanicNou,
          telefon: telefonMecanicNou,
        }),
      });

      if (res.ok) {
        const nou = await res.json();
        setShowAddMecanicModal(false);
        setNumeMecanicNou('');
        setSelectedMecanici((prev) => [...prev, nou.nume]);
        fetchData();
        alert(`Mecanic nou "${nou.nume}" adăugat cu succes în registru!`);
      }
    } catch (e) {
      alert('Eroare la adăugarea mecanicui.');
    }
  };

  const handleCreateComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    const selV = vehicule.find((v) => v.id === selectedVehiculId);
    const isTrailer = selV?.categorieEnum === 'REMORCA' || selV?.categorieEnum === 'SEMIREMORCA' || selV?.categorieEnum?.includes('REMORCA');
    const contorNum = Math.max(0, Number(valoareContorExecutie || 0) || 0);

    if (selV && !isTrailer && contorNum > 0 && contorNum < selV.valoareContorCurent) {
      const confirmed = await showConfirm(
        'Atenție Index Contor',
        `Valoarea introdusă (${contorNum} ${selV.tipMasurare}) este MAI MICĂ decât ultimul contor înregistrat pe vehicul (${selV.valoareContorCurent} ${selV.tipMasurare}).\n\nSunteți sigur că este o corecție manuală / schimbare de bord?`,
        'Da, confirmă valoarea',
        'Anulează'
      );
      if (!confirmed) {
        return;
      }
    }

    const mecanicFinal = selectedMecanici.join(', ');
    const elemente: any[] = [];

    // Notă: Comanda nouă pornește cu deviz curat (elemente: []).
    // Piesele și manopera se adaugă direct în editorul comenzi-lucru prin bara Quick-Add.

    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedVehiculId,
          mecanicResponsabil: mecanicFinal,
          valoareContorLaExecutie: contorNum,
          observatii,
          elemente,
        }),
      });

      if (res.ok) {
        const com = await res.json();
        const selV = vehicule.find((v) => v.id === selectedVehiculId);
        const enrichedCom = {
          ...com,
          vehiculNumarIntern: com.vehicul?.numarIntern || selV?.numarIntern,
          vehiculInmatriculare: com.vehicul?.numarInmatriculare || selV?.numarInmatriculare,
          vehiculMarca: com.vehicul?.marca || selV?.marca,
          vehiculModel: com.vehicul?.model || selV?.model,
          vehiculSerieSasiu: com.vehicul?.serieSasiu || com.vehicul?.vin || selV?.serieSasiu || 'N/A',
          vehiculValoareContor: com.vehicul?.valoareContorCurent || selV?.valoareContorCurent || 0,
          vehiculTipMasurare: com.vehicul?.tipMasurare || selV?.tipMasurare || 'KM',
        };

        setShowAddModal(false);
        await fetchData();

        if (autoFinalize) {
          await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${com.id}/finalizeaza`, { method: 'PATCH' });
          await fetchData();
          setShowViewModal(enrichedCom);
        } else {
          // Deschide imediat comanda de lucru nou creată în modalul de editare/completare
          openEditModal(enrichedCom);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Eroare la crearea comenzii de lucru: ${errData.message || res.statusText || 'Verificați datele introduse.'}`);
      }
    } catch (e: any) {
      alert(`Eroare la crearea comenzii de lucru: ${e.message || e}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddElementToOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddElementModal) return;

    if (elemPilonCost === 'PIESA_STOC' && elemArticolStocId) {
      const itemStoc = stocuri.find((s) => s.id === elemArticolStocId);
      if (itemStoc && isTireItem(itemStoc)) {
        alert(
          '🚫 Montarea anvelopelor NU este permisă din Comanda de Lucru!\n\n' +
          'Anvelopele se gestionează și se montează pe vehicul exclusiv din meniul: "Anvelope & Siguranță" (Harta Axe).'
        );
        return;
      }
      if (itemStoc && Number(elemCantitate) > itemStoc.stocCurent) {
        alert(` Stoc Insuficient!\n\nNu puteți adăuga ${elemCantitate} bucăți din articolul "${itemStoc.denumire}".\nStocul maxim disponibil în magazie este: ${itemStoc.stocCurent} ${itemStoc.unitateMasura || 'buc'}.`);
        return;
      }
    } else if ((elemPilonCost === 'PIESA_DIRECTA' || elemPilonCost === 'PIESA_DEZMEMBRATA') && /anvelop|cauciuc|pneu\b|pneuri/i.test(elemDescriere)) {
      alert(
        '🚫 Montarea anvelopelor NU este permisă din Comanda de Lucru!\n\n' +
        'Anvelopele se gestionează și se montează pe vehicul exclusiv din meniul: "Anvelope & Siguranță" (Harta Axe).'
      );
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${showAddElementModal.id}/adauga-element`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilonCost: elemPilonCost,
          descriere: elemDescriere || 'Piesă / Serviciu adăugat în atelier',
          cantitate: Number(elemCantitate),
          pretUnitar: Number(elemPretUnitar),
          provenienta: elemPilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : 'Stoc Intern',
          articolStocId: elemPilonCost === 'PIESA_STOC' ? elemArticolStocId : null,
        }),
      });

      if (res.ok) {
        setShowAddElementModal(null);
        fetchData();
        alert('Element / piesă adăugată pe comanda de lucru!');
      }
    } catch (e) {
      alert('Eroare la adăugarea piesei pe comandă.');
    }
  };

  const handleFinalizeazaComanda = async (id: string, numarComanda: string) => {
    const confirmed = await showConfirm(
      'Finalizare Comandă de Lucru',
      `Doriți să finalizați Comanda de Lucru ${numarComanda}? Aceasta va scădea stocul pieselor și va înregistra data finalizării!`,
      'Da, finalizează comanda',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${id}/finalizeaza`, { method: 'PATCH' });
      if (res.ok) {
        fetchData();
        alert(`Comanda ${numarComanda} a fost FINALIZATĂ! Data finalizării a fost înregistrată, iar stocul a fost actualizat.`);
      } else {
        const err = await res.json();
        alert(`Eroare finalizare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la finalizarea comandei.');
    }
  };

  const handleAnuleazaComanda = async (cl: any) => {
    const pieseStoc = (cl.elementeComanda || []).filter(
      (el: any) => el.pilonCost === 'PIESA_STOC' && el.articolStocId
    );

    let pieseMsg = '';
    if (pieseStoc.length > 0) {
      const lista = pieseStoc.map((el: any) => `• ${el.cantitate} buc — ${el.descriere}`).join('\n');
      pieseMsg = `\n\nUrmătoarele piese din stoc înregistrate pe comandă vor fi returnate în depozit / eliberate din stoc:\n${lista}\n\nArticolele redevin imediat disponibile în stocul magazinului!`;
    } else {
      pieseMsg = '\n\nComanda nu conține piese scăzute din stoc.';
    }

    const confirmed = await showConfirm(
      `Anulare Comandă de Lucru ${cl.numarComanda}`,
      `Sigur doriți să ANULAȚI comanda de lucru ${cl.numarComanda}?${pieseMsg}`,
      'Da, anulează comanda',
      'Renunță'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${cl.id}/anuleaza`, { method: 'PATCH' });
      if (res.ok) {
        await fetchData();
        alert(`Comanda ${cl.numarComanda} a fost ANULATĂ cu succes!\n\nPiesele consumate au fost returnate în gestiunea de stoc.`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare la anularea comandei: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare la anularea comandei: ${e.message || e}`);
    }
  };

  // Re-deschide comanda anulată (reactivare în stare IN_LUCRU)
  const handleRedeschideComanda = async (id: string, numarComanda: string) => {
    const confirmed = await showConfirm(
      'Re-deschidere Comandă de Lucru',
      `Doriți să reactivați comanda de lucru ${numarComanda} în starea ÎN LUCRU?`,
      'Da, reactivează comanda',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${id}/redeschide`, { method: 'PATCH' });
      if (res.ok) {
        const comUpdated = await res.json();
        await fetchData();
        const v = vehicule.find((vh) => vh.id === comUpdated.vehiculId);
        const enriched = {
          ...comUpdated,
          vehiculNumarIntern: comUpdated.vehicul?.numarIntern || v?.numarIntern,
          vehiculInmatriculare: comUpdated.vehicul?.numarInmatriculare || v?.numarInmatriculare,
          vehiculMarca: comUpdated.vehicul?.marca || v?.marca,
          vehiculModel: comUpdated.vehicul?.model || v?.model,
          vehiculSerieSasiu: comUpdated.vehicul?.serieSasiu || v?.serieSasiu || 'N/A',
          vehiculValoareContor: comUpdated.vehicul?.valoareContorCurent || v?.valoareContorCurent || 0,
          vehiculTipMasurare: comUpdated.vehicul?.tipMasurare || v?.tipMasurare || 'KM',
        };
        openEditModal(enriched);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare la reactivarea comenzii: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare la reactivarea comenzii de lucru: ${e.message || e}`);
    }
  };

  // Ștergere comandă de lucru
  const handleDeleteComanda = async (cl: any) => {
    const pieseStoc = (cl.elementeComanda || []).filter(
      (el: any) => el.pilonCost === 'PIESA_STOC' && el.articolStocId
    );

    let pieseMsg = '';
    if (pieseStoc.length > 0) {
      const lista = pieseStoc.map((el: any) => `• ${el.cantitate} buc — ${el.descriere}`).join('\n');
      pieseMsg = `\n\nATENȚIE: Piesele înregistrate din stoc vor fi returnate în magazie:\n${lista}`;
    }

    const confirmed = await showConfirm(
      `Ștergere Definitivă ${cl.numarComanda}`,
      `Sigur doriți să ȘTERGEȚI DEFINITIV comanda de lucru ${cl.numarComanda} din baza de date?${pieseMsg}\n\nAceastă acțiune este ireversibilă, comanda va fi ștearsă complet din istoricul utilajului!`,
      'Da, șterge definitiv',
      'Renunță'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${cl.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        alert(`Comanda ${cl.numarComanda} a fost ștearsă definitiv din baza de date.`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare la ștergere: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare la ștergerea comenzii: ${e.message || e}`);
    }
  };

  //  DEVALIDARE COMANDĂ DE LUCRU (Re-opens work order, restores stock & reveals EDIT / ANULARE buttons)
  const handleDevalideazaComanda = async (id: string, numarComanda: string) => {
    const confirmed = await showConfirm(
      'Devalidare Comandă de Lucru',
      `Doriți să DEVALIDAȚI Comanda de Lucru ${numarComanda}?\n\nAcțiunea va debloca comanda, va stabili starea DEVALIDAT și va permite editarea sau anularea acesteia!`,
      'Da, devalidează',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${id}/devalideaza`, { method: 'PATCH' });
      if (res.ok) {
        fetchData();
        alert(`Comanda ${numarComanda} a fost DEVALIDATĂ cu succes!\n\nAcum sunt disponibile opțiunile "Editare" și "Anulare".`);
      } else {
        alert('Eroare la devalidarea comandei.');
      }
    } catch (e) {
      alert('Eroare la devalidarea comandei.');
    }
  };

  // ─── LOGICĂ UNIRE / COMASARE COMENZI DE LUCRU (ACELAȘI VEHICUL) ───
  const comenziById = new Map(comenzi.map((c: any) => [c.id, c]));
  const activeSelectedMergeIds = selectedMergeIds.filter((id) => {
    const c = comenziById.get(id);
    return c && c.stare !== 'ANULAT';
  });
  const activeMergeVehiculId =
    activeSelectedMergeIds.length > 0
      ? comenziById.get(activeSelectedMergeIds[0])?.vehiculId || ''
      : '';

  const mergeableVehicleGroups = (() => {
    const groups = new Map<
      string,
      { vehiculId: string; code: string; plate: string; orders: any[] }
    >();
    for (const c of comenzi) {
      if (!c?.vehiculId || c.stare === 'ANULAT') continue;
      if (!groups.has(c.vehiculId)) {
        groups.set(c.vehiculId, {
          vehiculId: c.vehiculId,
          code: c.vehiculNumarIntern || c.vehiculInmatriculare || 'Utilaj',
          plate: c.vehiculInmatriculare || '',
          orders: [],
        });
      }
      groups.get(c.vehiculId)!.orders.push(c);
    }
    return Array.from(groups.values())
      .filter((g) => g.orders.length >= 2)
      .sort((a, b) => {
        if (b.orders.length !== a.orders.length) return b.orders.length - a.orders.length;
        return a.code.localeCompare(b.code, undefined, { numeric: true });
      });
  })();

  const getEligibleMergeTargets = (ordersList: any[]) => {
    const hasFinalized = ordersList.some((o) => o.stare === 'FINALIZAT');
    return hasFinalized ? ordersList.filter((o) => o.stare === 'FINALIZAT') : ordersList;
  };

  const resolveDefaultMergeTargetId = (ordersList: any[], preferredId?: string) => {
    const eligible = getEligibleMergeTargets(ordersList);
    if (eligible.length === 0) return '';
    if (preferredId && eligible.some((o) => o.id === preferredId)) return preferredId;
    const sorted = [...eligible].sort((a, b) => {
      const lenDiff = (b.elementeComanda?.length || 0) - (a.elementeComanda?.length || 0);
      if (lenDiff !== 0) return lenDiff;
      return String(a.numarComanda || '').localeCompare(String(b.numarComanda || ''), undefined, { numeric: true });
    });
    return sorted[0]?.id || '';
  };

  const buildDefaultMergeObservatii = (ordersList: any[], targetId: string) => {
    const target = ordersList.find((o) => o.id === targetId);
    const sources = ordersList
      .filter((o) => o.id !== targetId)
      .sort((a, b) => String(a.numarComanda || '').localeCompare(String(b.numarComanda || ''), undefined, { numeric: true }));
    if (!target || sources.length === 0) return '';
    const ordered = [target, ...sources];
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const o of ordered) {
      const txt = String(o.observatii || '').trim();
      if (txt && !seen.has(txt.toLowerCase())) {
        seen.add(txt.toLowerCase());
        parts.push(txt);
      }
    }
    const tag = `[Comenzi unite în ${target.numarComanda}: ${sources.map((s) => s.numarComanda).join(', ')}]`;
    if (!parts.some((p) => p.includes(tag))) parts.push(tag);
    return parts.join(' | ');
  };

  const toggleMergeRowSelection = (cl: any) => {
    if (!cl || cl.stare === 'ANULAT') return;
    if (activeMergeVehiculId && cl.vehiculId !== activeMergeVehiculId) return;
    setSelectedMergeIds((prev) => {
      const validPrev = prev.filter((id) => {
        const item = comenziById.get(id);
        return item && item.stare !== 'ANULAT' && item.vehiculId === cl.vehiculId;
      });
      if (validPrev.includes(cl.id)) {
        return validPrev.filter((id) => id !== cl.id);
      }
      return [...validPrev, cl.id];
    });
  };

  const selectGroupForMergeModal = (vehId: string, preselectedIds?: string[]) => {
    const vehOrders = comenzi
      .filter((c: any) => c.vehiculId === vehId && c.stare !== 'ANULAT')
      .sort((a: any, b: any) => String(a.numarComanda || '').localeCompare(String(b.numarComanda || ''), undefined, { numeric: true }));
    const nextIds =
      preselectedIds && preselectedIds.length > 0
        ? vehOrders.filter((o: any) => preselectedIds.includes(o.id)).map((o: any) => o.id)
        : vehOrders.map((o: any) => o.id);
    const selectedObjs = vehOrders.filter((o: any) => nextIds.includes(o.id));
    const nextTarget = resolveDefaultMergeTargetId(selectedObjs);
    setMergeModalVehiculId(vehId);
    setSelectedMergeIds(nextIds);
    setMergeTargetId(nextTarget);
    setMergeObservatii(buildDefaultMergeObservatii(selectedObjs, nextTarget));
  };

  const openMergeModal = () => {
    if (activeSelectedMergeIds.length >= 2 && activeMergeVehiculId) {
      selectGroupForMergeModal(activeMergeVehiculId, activeSelectedMergeIds);
      setShowMergeModal(true);
      return;
    }
    if (activeSelectedMergeIds.length === 1 && activeMergeVehiculId) {
      selectGroupForMergeModal(activeMergeVehiculId, activeSelectedMergeIds);
      setShowMergeModal(true);
      return;
    }
    const candidateVehId =
      vehiculFilter !== 'TOATE' && mergeableVehicleGroups.some((g) => g.vehiculId === vehiculFilter)
        ? vehiculFilter
        : mergeableVehicleGroups[0]?.vehiculId || '';
    if (candidateVehId) {
      selectGroupForMergeModal(candidateVehId);
    } else {
      setMergeModalVehiculId('');
      setMergeTargetId('');
      setMergeObservatii('');
    }
    setShowMergeModal(true);
  };

  const handleConfirmMergeComenzi = async () => {
    const vehOrders = activeSelectedMergeIds
      .map((id) => comenziById.get(id))
      .filter((c: any) => Boolean(c) && c.stare !== 'ANULAT');
    if (vehOrders.length < 2) {
      alert('Selectați cel puțin 2 comenzi de lucru ale aceluiași vehicul pentru unire.');
      return;
    }
    const baseVehId = vehOrders[0].vehiculId;
    if (vehOrders.some((o: any) => o.vehiculId !== baseVehId)) {
      alert('Eroare: Toate comenzile selectate trebuie să aparțină aceluiași vehicul!');
      return;
    }

    const effectiveTargetId = resolveDefaultMergeTargetId(vehOrders, mergeTargetId);
    const targetOrder = vehOrders.find((o: any) => o.id === effectiveTargetId);
    const sourceOrders = vehOrders.filter((o: any) => o.id !== effectiveTargetId);
    if (!targetOrder || sourceOrders.length === 0) return;

    const hasMixedOpenAndFinalized =
      targetOrder.stare === 'FINALIZAT' && sourceOrders.some((o: any) => o.stare !== 'FINALIZAT');
    const sourceNums = sourceOrders.map((o: any) => o.numarComanda).join(', ');
    const vehLabel = targetOrder.vehiculNumarIntern || targetOrder.vehiculInmatriculare || 'Vehicul';

    const confirmed = await showConfirm(
      `Unire ${vehOrders.length} Comenzi de Lucru (${vehLabel})`,
      `Se vor comasa comenzile ${sourceNums} în comanda principală ${targetOrder.numarComanda}.\n\n` +
        `• Toate pozițiile, piesele, facturile e-Factura asociate și mecanicii vor fi mutați pe ${targetOrder.numarComanda}.\n` +
        `• Comenzile absorbite (${sourceNums}) vor fi eliminate ca duplicat.\n` +
        (hasMixedOpenAndFinalized
          ? `• ATENȚIE FIFO: Comenzile deschise/devalidate vor fi finalizate FIFO automat înainte de comasare.\n`
          : '') +
        `\nContinuați unirea?`,
      `Da, unește în ${targetOrder.numarComanda}`,
      'Anulează'
    );
    if (!confirmed) return;

    setIsMerging(true);
    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: effectiveTargetId,
          sourceIds: sourceOrders.map((o: any) => o.id),
          observatii: mergeObservatii.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowMergeModal(false);
        setSelectedMergeIds([]);
        setMergeModalVehiculId('');
        setMergeTargetId('');
        setMergeObservatii('');
        await fetchData();
        alert(data.mesaj || `Comenzile au fost unite cu succes în ${targetOrder.numarComanda}!`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Nu s-a putut efectua unirea: ${err.message || 'Verificați datele.'}`);
      }
    } catch (e: any) {
      alert(`Eroare la unirea comenzilor: ${e.message || e}`);
    } finally {
      setIsMerging(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (cl: any) => {
    setShowEditModal(cl);
    const mecArr = cl.mecanicResponsabil ? cl.mecanicResponsabil.split(',').map((s: string) => s.trim()) : [];
    setEditMecanici(mecArr);
    setEditObservatii(cl.observatii || '');
    setEditElemente((cl.elementeComanda || []).map((el: any) => ({ ...el })));
    // Reset quick-add state
    setQuickPilonCost('PIESA_STOC');
    setQuickSearchQuery('');
    setQuickSelectedWarehouse('TOATE');
    setQuickSelectedCategory('TOATE');
    setQuickSelectedArticol(null);
    setQuickDescriere('');
    setQuickCantitate(1);
    setQuickPretUnitar(0);
    setIsSearchDropdownOpen(false);
  };

  // Save Edit Work Order
  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!showEditModal) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${showEditModal.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mecanicResponsabil: editMecanici.join(', '),
          observatii: editObservatii,
          elementeComanda: editElemente.map((el) => ({
            pilonCost: el.pilonCost || 'PIESA_STOC',
            descriere: el.descriere || 'Piesă / Serviciu',
            cantitate: Number(el.cantitate || 1),
            pretUnitar: Number(el.pretUnitar || 0),
            articolStocId: el.articolStocId || null,
          })),
        }),
      });

      if (res.ok) {
        setShowEditModal(null);
        await fetchData();
        alert('Modificările pe comanda de lucru au fost salvate cu succes!');
      } else {
        alert('Eroare la salvarea modificărilor.');
      }
    } catch (e) {
      alert('Eroare la salvarea modificărilor.');
    }
  };

  // Helper: cantitate deja alocată pe ciorna curentă a comenzii (nescăzută încă din DB)
  const getDraftStockAllocation = (excludeIdx?: number): Map<string, number> => {
    const map = new Map<string, number>();
    editElemente.forEach((el, idx) => {
      if (excludeIdx !== undefined && idx === excludeIdx) return;
      if (el.pilonCost === 'PIESA_STOC' && el.articolStocId) {
        map.set(el.articolStocId, (map.get(el.articolStocId) || 0) + (Number(el.cantitate) || 0));
      }
    });
    return map;
  };

  const getRemainingStockForItem = (
    item: any,
    allocationMap: Map<string, number> = getDraftStockAllocation()
  ): number => {
    if (!item) return 0;
    const allocated = allocationMap.get(item.id) || 0;
    return Math.max(0, Number(item.stocCurent || 0) - allocated);
  };

  const selectQuickStockItem = (st: any) => {
    const remaining = getRemainingStockForItem(st);
    setQuickSelectedArticol(st);
    setQuickDescriere(st.denumire);
    setQuickPretUnitar(st.pretUnitar || 0);
    setQuickSearchQuery(`${st.codArticol} — ${st.denumire}`);
    setQuickCantitate(remaining > 0 ? remaining : 1);
    setIsSearchDropdownOpen(false);
  };

  const clearQuickStockSelection = (keepSearchText = false) => {
    setQuickSelectedArticol(null);
    setQuickCantitate(1);
    setQuickPretUnitar(0);
    if (!keepSearchText) {
      setQuickSearchQuery('');
    }
  };

  const getMinQuickQty = (): number => {
    if (quickPilonCost === 'PIESA_STOC' && quickSelectedArticol) {
      const rem = getRemainingStockForItem(quickSelectedArticol, draftStockAllocation);
      if (rem > 0 && rem < 1) return rem;
    }
    return 1;
  };

  const resetStockFilterSelection = () => {
    if (quickSelectedArticol) {
      clearQuickStockSelection(false);
    }
  };

  const handleWarehouseFilterChange = (warehouse: string) => {
    setQuickSelectedWarehouse(warehouse);
    resetStockFilterSelection();
    setIsSearchDropdownOpen(true);
  };

  const handleCategoryFilterChange = (category: string) => {
    setQuickSelectedCategory(category);
    resetStockFilterSelection();
    setIsSearchDropdownOpen(true);
  };

  // Add Quick Element in Edit Modal
  const handleAddQuickElement = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quickPilonCost === 'PIESA_STOC') {
      if (!quickSelectedArticol) {
        alert('Vă rugăm să alegeți un articol din stoc din lista de căutare!');
        return;
      }
      if (isTireItem(quickSelectedArticol)) {
        alert(
          '🚫 MONTAREA ANVELOPELOR NU ESTE PERMISĂ DIN COMANDA DE LUCRU!\n\n' +
          'Anvelopele se gestionează și se montează pe vehicul exclusiv din meniul: "Anvelope & Siguranță" (Harta Axe)!\n\n' +
          'Montarea dedicată din Harta Axe asigură:\n' +
          '• Poziționarea corectă pe axe (ex: Ax 1 Direcție, Ax 2 Tracțiune)\n' +
          '• Înregistrarea contorului KM/mTH la montare\n' +
          '• Măsurarea adâncimii profilului și calculul uzurii\n' +
          '• Istoricul complet de permutări și trasabilitate.'
        );
        return;
      }
      if (Number(quickCantitate) <= 0) {
        alert('Cantitatea trebuie să fie de minim 1!');
        return;
      }
      const remainingAvailable = getRemainingStockForItem(quickSelectedArticol);
      if (Number(quickCantitate) > remainingAvailable) {
        const allocatedInDraft = Number(quickSelectedArticol.stocCurent || 0) - remainingAvailable;
        alert(
          `Stoc Insuficient!\n\nArticolul "${quickSelectedArticol.denumire}" mai are doar ${remainingAvailable} ${quickSelectedArticol.unitateMasura || 'buc'} disponibile (${allocatedInDraft > 0 ? `stoc total ${quickSelectedArticol.stocCurent}, deja pe comandă ${allocatedInDraft}` : `stoc disponibil ${quickSelectedArticol.stocCurent}`}).`
        );
        return;
      }
      setEditElemente([
        ...editElemente,
        {
          pilonCost: 'PIESA_STOC',
          descriere: quickSelectedArticol.denumire,
          cantitate: Number(quickCantitate),
          pretUnitar: Number(quickPretUnitar !== undefined && quickPretUnitar !== null ? quickPretUnitar : (quickSelectedArticol.pretUnitar || 0)),
          articolStocId: quickSelectedArticol.id,
          codArticol: quickSelectedArticol.codArticol,
          unitateMasura: quickSelectedArticol.unitateMasura || 'buc',
          provenienta: quickSelectedArticol.depozit?.nume || 'Magazie Centrală',
        },
      ]);
    } else if (quickPilonCost === 'PIESA_DEZMEMBRATA') {
      if (!quickDescriere.trim()) {
        alert('Vă rugăm să introduceți denumirea piesei din dezmembrări!');
        return;
      }
      if (/anvelop|cauciuc|pneu\b|pneuri|r22\.5|r17\.5|315\/80|385\/65/i.test(quickDescriere)) {
        alert(
          '🚫 MONTAREA ANVELOPELOR NU ESTE PERMISĂ DIN COMANDA DE LUCRU!\n\n' +
          'Anvelopele se gestionează și se montează pe vehicul exclusiv din meniul: "Anvelope & Siguranță" (Harta Axe)!'
        );
        return;
      }
      setEditElemente([
        ...editElemente,
        {
          pilonCost: 'PIESA_DEZMEMBRATA',
          descriere: quickDescriere.trim(),
          cantitate: Number(quickCantitate) || 1,
          pretUnitar: 0,
          articolStocId: null,
          unitateMasura: 'buc',
          provenienta: 'Dezmembrări Parcul Propriu',
        },
      ]);
    } else {
      if (!quickDescriere.trim()) {
        alert('Vă rugăm să introduceți denumirea piesei sau a operațiunii de manoperă!');
        return;
      }
      if (quickPilonCost === 'PIESA_DIRECTA' && /anvelop|cauciuc|pneu\b|pneuri|r22\.5|r17\.5|315\/80|385\/65/i.test(quickDescriere)) {
        alert(
          '🚫 MONTAREA ANVELOPELOR NU ESTE PERMISĂ DIN COMANDA DE LUCRU!\n\n' +
          'Anvelopele se gestionează și se montează pe vehicul exclusiv din meniul: "Anvelope & Siguranță" (Harta Axe)!'
        );
        return;
      }
      setEditElemente([
        ...editElemente,
        {
          pilonCost: quickPilonCost,
          descriere: quickDescriere.trim(),
          cantitate: Number(quickCantitate) || 1,
          pretUnitar: Number(quickPretUnitar) || 0,
          articolStocId: null,
          unitateMasura: quickPilonCost === 'MANOPERA_INTERNA' ? 'ore' : 'buc',
          provenienta:
            quickPilonCost === 'PIESA_DIRECTA'
              ? 'Achiziție Directă'
              : quickPilonCost === 'MANOPERA_INTERNA'
              ? 'Manoperă Atelier'
              : 'Prestație Externă',
        },
      ]);
    }

    // Reset quick add form smoothly
    setQuickSearchQuery('');
    setQuickSelectedArticol(null);
    setQuickDescriere('');
    setQuickCantitate(1);
    setQuickPretUnitar(0);
    setIsSearchDropdownOpen(false);
  };

  // Inline table updates
  const setEditElementQty = (idx: number, nextQty: number, alertOnExceed = true) => {
    const updated = [...editElemente];
    const row = updated[idx];
    if (!row) return;
    const current = Number(row.cantitate) || 0;
    const next = Math.max(1, nextQty);
    if (row.pilonCost === 'PIESA_STOC' && row.articolStocId && next > current) {
      const item = stocuri.find((s) => s.id === row.articolStocId);
      if (item) {
        const maxForRow = getRemainingStockForItem(item, getDraftStockAllocation(idx));
        if (next > maxForRow) {
          if (alertOnExceed) {
            alert(
              `Atenție: Stocul maxim disponibil pentru "${item.denumire}" este ${item.stocCurent} ${item.unitateMasura || 'buc'} (disponibil pentru acest rând: ${maxForRow}).`
            );
            return;
          }
          updated[idx].cantitate = maxForRow > 0 ? maxForRow : current;
          setEditElemente(updated);
          return;
        }
      }
    }
    updated[idx].cantitate = next;
    setEditElemente(updated);
  };

  const handleUpdateEditElementQty = (idx: number, delta: number) => {
    const current = Number(editElemente[idx]?.cantitate) || 1;
    setEditElementQty(idx, current + delta, true);
  };

  const handleUpdateEditElementPrice = (idx: number, price: number) => {
    const updated = [...editElemente];
    updated[idx].pretUnitar = Math.max(0, price);
    setEditElemente(updated);
  };

  const handleUpdateEditElementDesc = (idx: number, desc: string) => {
    const updated = [...editElemente];
    updated[idx].descriere = desc;
    setEditElemente(updated);
  };

  // Remove Element in Edit Modal
  const handleRemoveEditElement = (index: number) => {
    setEditElemente(editElemente.filter((_, i) => i !== index));
  };

  // Save and Finalize in 1-Click
  const handleSaveAndFinalize = async () => {
    if (!showEditModal) return;

    const draftAllocation = getDraftStockAllocation();
    for (const [articolId, totalSolicitat] of Array.from(draftAllocation.entries())) {
      const item = stocuri.find((s) => s.id === articolId);
      if (item && totalSolicitat > Number(item.stocCurent || 0)) {
        alert(
          `Nu se poate finaliza comanda!\n\nPiesa "${item.denumire}" depășește stocul disponibil: solicitat cumulat ${totalSolicitat}, disponibil în magazie ${item.stocCurent} ${item.unitateMasura || 'buc'}.`
        );
        return;
      }
    }

    const confirmed = await showConfirm(
      'Salvare & Finalizare Imediată',
      `Doriți să salvați toate modificările și să FINALIZEZI imediat Comanda de Lucru ${showEditModal.numarComanda}?\n\n• Se vor scădea automat piesele din stoc conform metodei FIFO.\n• Comanda va primi starea FINALIZAT.\n• Se vor actualiza costurile de mentenanță.`,
      'Da, salvează și finalizează',
      'Anulează'
    );
    if (!confirmed) return;

    setIsSavingAndFinalizing(true);
    try {
      // 1. Update command
      const resUpdate = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${showEditModal.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mecanicResponsabil: editMecanici.join(', '),
          observatii: editObservatii,
          elementeComanda: editElemente.map((el) => ({
            pilonCost: el.pilonCost || 'PIESA_STOC',
            descriere: el.descriere || 'Piesă / Serviciu',
            cantitate: Number(el.cantitate || 1),
            pretUnitar: Number(el.pretUnitar || 0),
            articolStocId: el.articolStocId || null,
          })),
        }),
      });

      if (!resUpdate.ok) {
        alert('Eroare la salvarea modificărilor comenzii.');
        setIsSavingAndFinalizing(false);
        return;
      }

      // 2. Finalize
      const resFinalize = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${showEditModal.id}/finalizeaza`, {
        method: 'PATCH',
      });

      if (resFinalize.ok) {
        setShowEditModal(null);
        await fetchData();
        alert(`Comanda de Lucru ${showEditModal.numarComanda} a fost salvată și FINALIZATĂ cu succes!\n\nPiesele au fost scăzute din stoc FIFO.`);
      } else {
        const err = await resFinalize.json().catch(() => ({}));
        alert(`Comanda a fost salvată, dar finalizarea a eșuat: ${err.message || 'Verificați datele.'}`);
        await fetchData();
      }
    } catch (e: any) {
      alert(`Eroare la procesare: ${e.message || e}`);
    } finally {
      setIsSavingAndFinalizing(false);
    }
  };

  // Print A4 Document
  const handlePrintDocument = () => {
    window.print();
  };

  // Filtering Logic
  const filteredComenzi = comenzi.filter((cl) => {
    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = cl.numarComanda?.toLowerCase().includes(q);
      const matchVeh = cl.vehiculNumarIntern?.toLowerCase().includes(q) || cl.vehiculInmatriculare?.toLowerCase().includes(q);
      const matchMec = cl.mecanicResponsabil?.toLowerCase().includes(q);
      const matchObs = cl.observatii?.toLowerCase().includes(q);
      const matchElem = cl.elementeComanda?.some((el: any) => el.descriere?.toLowerCase().includes(q));
      if (!matchNum && !matchVeh && !matchMec && !matchObs && !matchElem) return false;
    }

    // Stare Filter
    if (stareFilter !== 'TOATE') {
      if (cl.stare !== stareFilter) return false;
    }

    // Vehicul Filter
    if (vehiculFilter !== 'TOATE') {
      if (cl.vehiculId !== vehiculFilter) return false;
    }

    // Mecanic Filter
    if (mecanicFilter !== 'TOATE') {
      if (!cl.mecanicResponsabil?.includes(mecanicFilter)) return false;
    }

    // Date Range Filter
    if (dateStartFilter) {
      const clDate = new Date(cl.dataDeschidere).getTime();
      const sDate = new Date(dateStartFilter).getTime();
      if (clDate < sDate) return false;
    }

    if (dateEndFilter) {
      const clDate = new Date(cl.dataDeschidere).getTime();
      const eDate = new Date(dateEndFilter).getTime() + 86400000; // end of day
      if (clDate > eDate) return false;
    }

    return true;
  });

  const comenziInLucruCount = comenzi.filter((c) => c.stare === 'IN_LUCRU' || c.stare === 'DEVALIDAT').length;
  const comenziFinalizateCount = comenzi.filter((c) => c.stare === 'FINALIZAT').length;

  // Calcul Depozite, Categorii Magazie & Listă Piese Filtrate pentru Editor (FĂRĂ ANVELOPE și scăzând piesele deja adăugate pe ciornă)
  const draftStockAllocation = getDraftStockAllocation();

  const availableStockItems = stocuri.filter(
    (s: any) => getRemainingStockForItem(s, draftStockAllocation) > 0 && !isTireItem(s)
  );

  const warehouseCounts = new Map<string, number>();
  availableStockItems.forEach((s: any) => {
    const wh = getWarehouseName(s);
    warehouseCounts.set(wh, (warehouseCounts.get(wh) || 0) + 1);
  });

  const availableStockWarehouses = [
    'TOATE',
    ...Array.from(warehouseCounts.keys()).sort((a, b) => a.localeCompare(b, 'ro-RO')),
  ];

  const effectiveStockWarehouse = availableStockWarehouses.includes(quickSelectedWarehouse)
    ? quickSelectedWarehouse
    : 'TOATE';

  const warehouseScopedStock = availableStockItems.filter(
    (s: any) => effectiveStockWarehouse === 'TOATE' || getWarehouseName(s) === effectiveStockWarehouse
  );

  const categoryCounts = new Map<string, number>();
  warehouseScopedStock.forEach((s: any) => {
    if (s.categorie && !isTireCategory(s.categorie)) {
      categoryCounts.set(s.categorie, (categoryCounts.get(s.categorie) || 0) + 1);
    }
  });

  const availableStockCategories = [
    'TOATE',
    ...Array.from(categoryCounts.keys()).sort((a, b) => a.localeCompare(b, 'ro-RO')),
  ];

  const effectiveStockCategory = availableStockCategories.includes(quickSelectedCategory)
    ? quickSelectedCategory
    : 'TOATE';

  const filteredStockList = warehouseScopedStock
    .filter((item: any) => {
      if (effectiveStockCategory !== 'TOATE') {
        if ((item.categorie || '').toLowerCase() !== effectiveStockCategory.toLowerCase()) {
          return false;
        }
      }
      const activeSearchQuery = quickSelectedArticol ? '' : quickSearchQuery.trim();
      if (activeSearchQuery) {
        const q = activeSearchQuery.toLowerCase();
        const mCod = (item.codArticol || '').toLowerCase().includes(q);
        const mDen = (item.denumire || '').toLowerCase().includes(q);
        const mCat = (item.categorie || '').toLowerCase().includes(q);
        const mSub = (item.subcategorie || '').toLowerCase().includes(q);
        const mDep = getWarehouseName(item).toLowerCase().includes(q);
        if (!mCod && !mDen && !mCat && !mSub && !mDep) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      return (a.denumire || '').localeCompare(b.denumire || '');
    });

  // Calcul Deviz în Timp Real pentru Editor Comandă
  const totalDevizPieseStoc = editElemente
    .filter((el) => el.pilonCost === 'PIESA_STOC')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0), 0);

  const bucatiDevizStoc = editElemente
    .filter((el) => el.pilonCost === 'PIESA_STOC')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0), 0);

  const bucatiDevizDezmembrari = editElemente
    .filter((el) => el.pilonCost === 'PIESA_DEZMEMBRATA')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0), 0);

  const totalDevizDirecte = editElemente
    .filter((el) => el.pilonCost === 'PIESA_DIRECTA')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0), 0);

  const totalDevizManopera = editElemente
    .filter((el) => el.pilonCost === 'MANOPERA_INTERNA' || el.pilonCost === 'PRESTATIE_EXTERNA')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0), 0);

  const totalGeneralDeviz = editElemente.reduce(
    (acc, el) => acc + (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0),
    0
  );

  // Calcul Categorii Vehicule & Listă Utilaje Filtrate pentru Deschidere Comandă Nouă
  const availableVehiculeCategories = [
    'TOATE',
    ...Array.from(new Set(vehicule.map((v) => v.categorieEnum).filter(Boolean))),
  ];

  const filteredVehiculeList = vehicule.filter((v: any) => {
    if (vehiculCategoryFilter !== 'TOATE') {
      if ((v.categorieEnum || '').toUpperCase() !== vehiculCategoryFilter.toUpperCase()) {
        return false;
      }
    }
    if (vehiculSearchQuery.trim()) {
      const q = vehiculSearchQuery.toLowerCase().trim();
      const mPlate = (v.numarInmatriculare || '').toLowerCase().includes(q);
      const mIntern = (v.numarIntern || '').toLowerCase().includes(q);
      const mMarca = (v.marca || '').toLowerCase().includes(q);
      const mModel = (v.model || '').toLowerCase().includes(q);
      const mCat = (v.categorieEnum || '').toLowerCase().includes(q);
      const mCatLabel = getCategoryLabel(v.categorieEnum).toLowerCase().includes(q);
      if (!mPlate && !mIntern && !mMarca && !mModel && !mCat && !mCatLabel) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ─── PRINT ONLY STYLES ─── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-a4-area, #printable-a4-area * {
            visibility: visible;
          }
          #printable-a4-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-sapphire-500" />
            <span>Registru Devize de Lucru (Atelier)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">
            Ciclu complet: ÎN LUCRU → FINALIZAT → DEVALIDARE (Editare & Anulare) → Vizualizare / Print A4 PDF
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => openMergeModal()}
            title="Unește mai multe comenzi de lucru ale aceluiași vehicul într-o singură comandă"
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-morning-100 border border-morning-300 text-sapphire-900 text-xs font-bold shadow-xs transition"
          >
            <GitMerge className="w-4 h-4 text-sapphire-600" />
            <span>
              {activeSelectedMergeIds.length >= 2
                ? `Unește Selectate (${activeSelectedMergeIds.length})`
                : 'Unește Comenzi'}
            </span>
            {activeSelectedMergeIds.length === 0 && mergeableVehicleGroups.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-sapphire-100 text-sapphire-700 text-[10px] font-extrabold font-mono">
                {mergeableVehicleGroups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setValoareContorExecutie('0');
              setShowAddModal(true);
              setVehiculSearchQuery('');
              setVehiculCategoryFilter('TOATE');
              setIsVehiculSearchOpen(false);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Deschide Comandă de Lucru Nouă</span>
          </button>
        </div>
      </div>

      {/* KPI STATUS COMENZI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-periwinkle-100 border border-periwinkle-300 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-periwinkle-700 tracking-wider">Comenzi Deschise / Devalidate</p>
            <p className="text-2xl font-extrabold text-periwinkle-700 font-mono mt-0.5">{comenziInLucruCount}</p>
            <p className="text-[10px] text-sage-600 font-medium">În Desfășurare sau Devalidate pentru Ediție</p>
          </div>
          <Wrench className="w-8 h-8 text-periwinkle-600 animate-pulse" />
        </div>

        <div className="p-4 rounded-2xl bg-sapphire-50 border border-sapphire-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sapphire-600 tracking-wider">Comenzi Finalizate & Închise</p>
            <p className="text-2xl font-extrabold text-sapphire-900 font-mono mt-0.5">{comenziFinalizateCount}</p>
            <p className="text-[10px] text-sage-600 font-medium">stoc scos & contoare actualizate</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-sapphire-500" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-morning-200 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sage-700 tracking-wider">Total Înregistrate</p>
            <p className="text-2xl font-extrabold text-sapphire-900 font-mono mt-0.5">{comenzi.length}</p>
            <p className="text-[10px] text-sage-600 font-medium">istoric complet atelier</p>
          </div>
          <FileText className="w-8 h-8 text-sage-500" />
        </div>
      </div>

      {/* ─── PANOU ADVANCED FILTERS ─── */}
      <div className="pleasant-card rounded-2xl p-4 bg-white border border-morning-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sapphire-900 font-extrabold text-xs">
            <Filter className="w-4 h-4 text-sapphire-500" />
            <span>Filtrare Avansată Registru Comenzi ({filteredComenzi.length} / {comenzi.length} Afișate)</span>
          </div>

          {(searchQuery || stareFilter !== 'TOATE' || vehiculFilter !== 'TOATE' || mecanicFilter !== 'TOATE' || dateStartFilter || dateEndFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStareFilter('TOATE');
                setVehiculFilter('TOATE');
                setMecanicFilter('TOATE');
                setDateStartFilter('');
                setDateEndFilter('');
              }}
              className="text-[11px] font-bold text-terracotta-600 hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Resetează Filtrele</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-sage-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nr. Comandă, utilaj, mecanic, piesă..."
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-sapphire-900 font-medium focus:bg-white transition"
            />
          </div>

          {/* Stare Filter */}
          <div>
            <select
              value={stareFilter}
              onChange={(e) => setStareFilter(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
            >
              <option value="TOATE">Stare: Toate Stările</option>
              <option value="IN_LUCRU">ÎN LUCRU</option>
              <option value="FINALIZAT">FINALIZAT</option>
              <option value="DEVALIDAT">DEVALIDAT</option>
              <option value="ANULAT">ANULAT</option>
            </select>
          </div>

          {/* Vehicul Filter */}
          <div>
            <select
              value={vehiculFilter}
              onChange={(e) => setVehiculFilter(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
            >
              <option value="TOATE">Utilaj: Toate Flota</option>
              {vehicule.map((v) => {
                const hasDiff = v.numarIntern && v.numarIntern !== v.numarInmatriculare;
                const plateStr = hasDiff ? `${v.numarIntern} (${v.numarInmatriculare})` : (v.numarInmatriculare || v.numarIntern);
                return (
                  <option key={v.id} value={v.id}>
                    {getCategoryIcon(v.categorieEnum)} {plateStr} {v.marca ? `— ${v.marca}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Mecanic Filter */}
          <div>
            <select
              value={mecanicFilter}
              onChange={(e) => setMecanicFilter(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
            >
              <option value="TOATE">Mecanic: Toți Mecanicii</option>
              {mecaniciList.map((m) => (
                <option key={m.id} value={m.nume}>
                   {m.nume}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex space-x-1.5">
            <input
              type="date"
              value={dateStartFilter}
              onChange={(e) => setDateStartFilter(e.target.value)}
              title="Dată Deschidere De la"
              className="w-1/2 bg-morning-100 border border-morning-200 rounded-xl p-1.5 text-[11px] text-sapphire-900 font-bold"
            />
            <input
              type="date"
              value={dateEndFilter}
              onChange={(e) => setDateEndFilter(e.target.value)}
              title="Dată Deschidere Până la"
              className="w-1/2 bg-morning-100 border border-morning-200 rounded-xl p-1.5 text-[11px] text-sapphire-900 font-bold"
            />
          </div>
        </div>
      </div>

      {/* TABEL COMENZI DE LUCRU */}
      <div className="pleasant-card rounded-2xl p-6 space-y-4">
        {(() => {
          const expandableOrderIds = filteredComenzi
            .filter((c) => (c.elementeComanda?.length || 0) > COLLAPSE_ELEMENTS_THRESHOLD)
            .map((c) => c.id);
          const areAllExpanded =
            expandableOrderIds.length > 0 &&
            expandableOrderIds.every((id) => expandedOrderIds.includes(id));

          return (
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h2 className="text-base font-bold text-sapphire-900">Registrul Devizelor de Lucru &amp; Atelier</h2>
              <div className="flex items-center space-x-3">
                {expandableOrderIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (areAllExpanded) {
                        setExpandedOrderIds((prev) => prev.filter((id) => !expandableOrderIds.includes(id)));
                      } else {
                        setExpandedOrderIds((prev) => Array.from(new Set([...prev, ...expandableOrderIds])));
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-700 text-[11px] font-bold flex items-center space-x-1 transition"
                  >
                    {areAllExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Restrânge toate ({expandableOrderIds.length})</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Extinde toate ({expandableOrderIds.length})</span>
                      </>
                    )}
                  </button>
                )}
                <span className="text-xs font-semibold text-sage-700">{filteredComenzi.length} Comenzi Afișate</span>
              </div>
            </div>
          );
        })()}

        {(() => {
          const headerTargetVehId =
            activeMergeVehiculId || (vehiculFilter !== 'TOATE' ? vehiculFilter : '');
          const headerCandidateOrders = headerTargetVehId
            ? filteredComenzi.filter(
                (cl: any) => cl.vehiculId === headerTargetVehId && cl.stare !== 'ANULAT'
              )
            : [];
          const areAllHeaderSelected =
            headerCandidateOrders.length > 0 &&
            headerCandidateOrders.every((cl: any) => activeSelectedMergeIds.includes(cl.id));

          const activeVehOrdersAll = activeMergeVehiculId
            ? comenzi.filter((c: any) => c.vehiculId === activeMergeVehiculId && c.stare !== 'ANULAT')
            : [];
          const activeVehObj = activeSelectedMergeIds.length > 0 ? comenziById.get(activeSelectedMergeIds[0]) : null;
          const activeVehDisplay = activeVehObj
            ? activeVehObj.vehiculNumarIntern || activeVehObj.vehiculInmatriculare || 'Vehicul'
            : '';
          const selectedNumsLabel = activeSelectedMergeIds
            .map((id) => comenziById.get(id)?.numarComanda)
            .filter(Boolean)
            .join(', ');

          return (
            <>
              {activeSelectedMergeIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-sapphire-50 border border-sapphire-200 text-xs">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-sapphire-600 text-white font-bold">
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>{activeSelectedMergeIds.length} selectate</span>
                    </span>
                    <span className="font-bold text-sapphire-900">
                      Utilaj: {activeVehDisplay}
                    </span>
                    <span className="text-sage-700 font-mono text-[11px] truncate max-w-md" title={selectedNumsLabel}>
                      ({selectedNumsLabel})
                    </span>
                    {activeVehOrdersAll.length > activeSelectedMergeIds.length && (
                      <button
                        type="button"
                        onClick={() => selectGroupForMergeModal(activeMergeVehiculId)}
                        className="px-2 py-0.5 rounded-lg bg-white hover:bg-morning-100 border border-sapphire-200 text-sapphire-700 text-[11px] font-bold transition"
                      >
                        + Selectează toate pentru {activeVehDisplay} ({activeVehOrdersAll.length})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={activeSelectedMergeIds.length < 2}
                      onClick={() => openMergeModal()}
                      className="px-3.5 py-1.5 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-bold flex items-center space-x-1.5 shadow-xs transition"
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      <span>
                        {activeSelectedMergeIds.length >= 2
                          ? `Unește (${activeSelectedMergeIds.length})`
                          : 'Bifați minim 2'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMergeIds([])}
                      className="px-2.5 py-1.5 rounded-xl bg-morning-200 hover:bg-morning-300 text-slate-700 font-semibold flex items-center space-x-1 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Anulează</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[1140px]">
                  <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                    <tr>
                      <th className="p-3 w-10 text-center" title={headerTargetVehId ? 'Selectează toate comenzile acestui utilaj din tabel' : 'Bifați prima comandă sau filtrați un utilaj'}>
                        <input
                          type="checkbox"
                          checked={areAllHeaderSelected}
                          disabled={headerCandidateOrders.length === 0}
                          onChange={() => {
                            if (headerCandidateOrders.length === 0) return;
                            if (areAllHeaderSelected) {
                              const idsToRemove = new Set(headerCandidateOrders.map((c: any) => c.id));
                              setSelectedMergeIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
                            } else {
                              setSelectedMergeIds(headerCandidateOrders.map((c: any) => c.id));
                            }
                          }}
                          className="w-4 h-4 rounded accent-sapphire-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </th>
                      <th className="p-3">Număr Comandă</th>
                      <th className="p-3">Utilaj Greu</th>
                      <th className="p-3">Mecanici Responsabili</th>
                      <th className="p-3">Dată Deschidere / Finalizare</th>
                      <th className="p-3">Elemente & Piese Consumate</th>
                      <th className="p-3">Stare Comandă</th>
                      <th className="p-3 font-mono text-right">Valoare Totală</th>
                      <th className="p-3 text-right whitespace-nowrap min-w-[280px]">Acțiuni Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200">
                    {filteredComenzi.map((cl) => {
                      const isMergeCanceled = cl.stare === 'ANULAT';
                      const isMergeLockedOtherVehicle = Boolean(
                        activeMergeVehiculId && cl.vehiculId !== activeMergeVehiculId
                      );
                      const isMergeSelected = activeSelectedMergeIds.includes(cl.id);
                      const mergeCheckboxDisabled = isMergeCanceled || isMergeLockedOtherVehicle;
                      const mergeTooltip = isMergeCanceled
                        ? 'Comenzile anulate nu pot fi unite'
                        : isMergeLockedOtherVehicle
                        ? 'Puteți uni doar comenzi ale aceluiași vehicul'
                        : 'Selectează pentru unirea comenzilor aceluiași vehicul';
                      const totalCost = cl.elementeComanda?.reduce((sum: number, el: any) => sum + (el.costTotal || 0), 0) || 0;
                      const esteInLucru = cl.stare === 'IN_LUCRU' || cl.stare === 'DEVALIDAT';
                      const esteFinalizat = cl.stare === 'FINALIZAT';
                      const vehiculMarcaModel = [cl.vehiculMarca, cl.vehiculModel]
                        .filter((v) => v && !/^[-–—\s]+$/.test(String(v).trim()) && String(v).trim().toUpperCase() !== 'N/A')
                        .join(' ');

                      const elements: any[] = cl.elementeComanda || [];
                      const canCollapse = elements.length > COLLAPSE_ELEMENTS_THRESHOLD;
                      const isExpanded = !canCollapse || expandedOrderIds.includes(cl.id);

                      const activeSearch = searchQuery.trim().toLowerCase();
                      let visibleElements = elements;
                      let searchMatchesInHidden = 0;

                      if (canCollapse && !isExpanded) {
                        if (activeSearch) {
                          const matched = elements.filter((el: any) => {
                            const furn = el.furnizor || el.articolStoc?.intrariStoc?.[0]?.furnizor || '';
                            const fact = el.numarFactura || el.articolStoc?.intrariStoc?.[0]?.numarFactura || '';
                            return (
                              (el.descriere || '').toLowerCase().includes(activeSearch) ||
                              furn.toLowerCase().includes(activeSearch) ||
                              fact.toLowerCase().includes(activeSearch)
                            );
                          });
                          if (matched.length > 0) {
                            const nonMatched = elements.filter((el: any) => !matched.includes(el));
                            visibleElements = [...matched, ...nonMatched].slice(0, COLLAPSED_PREVIEW_COUNT);
                            searchMatchesInHidden = Math.max(0, matched.length - COLLAPSED_PREVIEW_COUNT);
                          } else {
                            visibleElements = elements.slice(0, COLLAPSED_PREVIEW_COUNT);
                          }
                        } else {
                          visibleElements = elements.slice(0, COLLAPSED_PREVIEW_COUNT);
                        }
                      }

                      const hiddenCount = elements.length - visibleElements.length;

                      return (
                        <tr
                          key={cl.id}
                          className={`[&>td]:align-top hover:bg-morning-50 transition ${
                            isMergeSelected
                              ? 'bg-sapphire-50'
                              : cl.stare === 'DEVALIDAT'
                              ? 'bg-roseash-50/40'
                              : esteInLucru
                              ? 'bg-periwinkle-50/50'
                              : ''
                          }`}
                        >
                          <td className="p-3 text-center pt-3.5" title={mergeTooltip}>
                            <input
                              type="checkbox"
                              checked={isMergeSelected}
                              disabled={mergeCheckboxDisabled}
                              onChange={() => toggleMergeRowSelection(cl)}
                              className="w-4 h-4 rounded accent-sapphire-600 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-3 font-extrabold text-sapphire-900 font-mono">
                            {cl.numarComanda}
                            {cl.observatii && <div className="text-[10px] text-sage-600 font-normal truncate max-w-xs mt-0.5">{cl.observatii}</div>}
                          </td>

                    <td className="p-3 font-bold text-sapphire-700">
                      {cl.vehiculNumarIntern}
                      {(cl.vehiculInmatriculare || vehiculMarcaModel) && (
                        <div className="text-[10px] text-sage-500 font-normal mt-0.5">
                          {cl.vehiculInmatriculare}
                          {vehiculMarcaModel ? ` (${vehiculMarcaModel})` : ''}
                        </div>
                      )}
                    </td>

                    <td className="p-3 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-morning-200 text-sapphire-900 font-bold text-[11px] inline-block">
                        {cl.mecanicResponsabil}
                      </span>
                    </td>

                    <td className="p-3 text-sage-700 text-[11px] whitespace-nowrap">
                      <div><strong>Deschidere:</strong> {new Date(cl.dataDeschidere).toLocaleDateString('ro-RO')}</div>
                      {cl.dataFinalizare ? (
                        <div className="text-sapphire-600 font-semibold mt-0.5"><strong>Finalizat:</strong> {new Date(cl.dataFinalizare).toLocaleDateString('ro-RO')}</div>
                      ) : cl.stare === 'DEVALIDAT' ? (
                        <div className="text-terracotta-600 font-bold mt-0.5">DEVALIDAT (În Ediție)</div>
                      ) : (
                        <div className="text-periwinkle-700 font-bold mt-0.5">În Desfășurare</div>
                      )}
                    </td>

                    <td className="p-3 min-w-[340px]">
                      <div className="space-y-1.5">
                        {canCollapse && (
                          <div className="flex items-center justify-between gap-2 pb-1 border-b border-morning-200">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-sapphire-50 text-sapphire-800 border border-sapphire-200 text-[10px] font-extrabold font-mono">
                              <Package className="w-3 h-3 text-sapphire-600" />
                              <span>{elements.length} poziții în deviz</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleOrderElementsExpanded(cl.id)}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-700 text-[10px] font-bold transition"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  <span>Restrânge</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  <span>Extinde toate ({elements.length})</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {elements.length > 0 ? (
                          visibleElements.map((el: any) => {
                            const prov = getProvenientaSuffix(el);
                            const furnizor = el.furnizor || el.articolStoc?.intrariStoc?.[0]?.furnizor;
                            const factura = el.numarFactura || el.articolStoc?.intrariStoc?.[0]?.numarFactura;
                            const dataFactura = el.articolStoc?.intrariStoc?.[0]?.dataFactura;
                            const pretUnit = Number(el.pretUnitar || el.articolStoc?.intrariStoc?.[0]?.pretUnitar || 0);
                            const unitMeasure = el.unitateMasura || el.articolStoc?.unitateMasura || 'buc';

                            return (
                              <div key={el.id} className="text-[11px] font-medium text-slate-800 space-y-0.5 border-b border-morning-200 last:border-0 pb-1 last:pb-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span>
                                    • {el.descriere}
                                    {prov && <span className="text-slate-500 font-normal ml-1">({prov})</span>}
                                    {' '}({el.cantitate} {unitMeasure})
                                  </span>
                                  <span className="font-mono text-sage-700 font-bold ml-2 whitespace-nowrap">
                                    {Number(el.costTotal || (Number(el.cantitate || 1) * pretUnit)).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                                  </span>
                                </div>
                                {(furnizor || factura || pretUnit > 0) && (
                                  <div className="flex items-center space-x-1.5 flex-wrap gap-1 text-[10px] text-sage-600 pl-2">
                                    {furnizor && (
                                      <span className="inline-flex items-center space-x-0.5 text-sapphire-800 bg-sapphire-50 px-1.5 py-0.2 rounded border border-sapphire-200">
                                        <Building2 className="w-2.5 h-2.5 text-sapphire-600" />
                                        <span>{furnizor}</span>
                                      </span>
                                    )}
                                    {factura && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenFacturaInEfactura(factura)}
                                        className="inline-flex items-center space-x-0.5 text-slate-700 bg-morning-100 px-1.5 py-0.2 rounded border border-morning-300 hover:bg-sapphire-100 hover:text-sapphire-900 transition"
                                        title="Click pentru a deschide factura în ANAF e-Factura"
                                      >
                                        <FileText className="w-2.5 h-2.5 text-slate-500" />
                                        <span>Factura: <strong className="underline decoration-dotted">{factura}</strong></span>
                                        {dataFactura && <span className="text-[9px] text-slate-600">({new Date(dataFactura).toLocaleDateString('ro-RO')})</span>}
                                      </button>
                                    )}
                                    {pretUnit > 0 && (
                                      <span className="font-mono text-slate-600 font-semibold">
                                        {pretUnit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON/{unitMeasure}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Fără piese (Doar descriere intervenție)</span>
                        )}

                        {canCollapse && !isExpanded && hiddenCount > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleOrderElementsExpanded(cl.id)}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 border border-sapphire-200 text-sapphire-700 text-[11px] font-bold flex items-center justify-center space-x-1.5 transition"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>
                              Vezi încă {hiddenCount} {hiddenCount === 1 ? 'poziție' : 'poziții'} (Total {elements.length})
                              {searchMatchesInHidden > 0 ? ` · +${searchMatchesInHidden} potriviri căutare` : ''}
                            </span>
                          </button>
                        )}

                        {canCollapse && isExpanded && (
                          <button
                            type="button"
                            onClick={() => toggleOrderElementsExpanded(cl.id)}
                            className="w-full py-1 px-2.5 rounded-lg bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sage-700 text-[10px] font-bold flex items-center justify-center space-x-1 transition"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Restrânge lista ({elements.length} poziții)</span>
                          </button>
                        )}

                        {esteInLucru && (
                          <button
                            onClick={() => openEditModal(cl)}
                            className="text-[10px] font-bold text-sapphire-600 hover:underline flex items-center space-x-1 pt-1"
                          >
                            <Plus className="w-3 h-3 text-sapphire-500" />
                            <span>Adaugă piesă / deviz</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                        cl.stare === 'FINALIZAT' ? 'bg-sapphire-50 text-sapphire-600 border border-sapphire-100' :
                        cl.stare === 'DEVALIDAT' ? 'bg-roseash-100 text-terracotta-700 border border-roseash-300 font-extrabold' :
                        cl.stare === 'ANULAT' ? 'bg-slate-100 text-slate-500 border border-slate-300' :
                        'bg-periwinkle-100 text-periwinkle-700 border border-periwinkle-300 animate-pulse'
                      }`}>
                        {cl.stare === 'IN_LUCRU' ? 'ÎN LUCRU' : cl.stare === 'DEVALIDAT' ? 'DEVALIDAT' : cl.stare}
                      </span>
                    </td>

                    <td className="p-3 text-right font-extrabold text-sapphire-900 font-mono text-sm whitespace-nowrap">
                      {Number(totalCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                    </td>

                    {/* ─── ACȚIUNI MANAGEMENT (USER STRICT LOGIC) ─── */}
                    <td className="p-3 text-right min-w-[280px]">
                      <div className="flex items-center justify-end space-x-1 whitespace-nowrap">
                      {/* VIZUALIZARE (A4 Printable PDF Modal) */}
                      <button
                        onClick={() => setShowViewModal(cl)}
                        title="Vizualizare Fișă A4 & Export PDF"
                        className="px-2 py-1 rounded-lg bg-morning-200 hover:bg-morning-300 text-sapphire-900 text-[11px] font-bold flex items-center space-x-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-sapphire-600" />
                        <span>Vizualizare</span>
                      </button>

                      {/* CAN ONLY DEVALIDATE WHEN FINALIZAT */}
                      {esteFinalizat && (
                        <button
                          onClick={() => handleDevalideazaComanda(cl.id, cl.numarComanda)}
                          title="Devalidează comanda pentru a permite editarea sau anularea"
                          className="px-2.5 py-1 rounded-lg bg-terracotta-500 hover:bg-terracotta-600 text-white text-[11px] font-bold shadow-xs flex items-center space-x-1 transition"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Devalidare</span>
                        </button>
                      )}

                      {/* EDITARE & ANULARE ONLY APPEAR WHEN OPEN OR DEVALIDATED! */}
                      {esteInLucru && (
                        <>
                          <button
                            onClick={() => openEditModal(cl)}
                            title="Editare Comandă de Lucru"
                            className="px-2.5 py-1 rounded-lg bg-periwinkle-100 hover:bg-periwinkle-200 text-periwinkle-700 text-[11px] font-bold border border-periwinkle-300 flex items-center space-x-1 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editare</span>
                          </button>

                          <button
                            onClick={() => handleAnuleazaComanda(cl)}
                            title="Anulare Comandă & Restaurează Stoc"
                            className="px-2.5 py-1 rounded-lg bg-roseash-100 hover:bg-roseash-200 text-terracotta-600 text-[11px] font-bold border border-roseash-300 transition"
                          >
                            Anulare
                          </button>

                          <button
                            onClick={() => handleFinalizeazaComanda(cl.id, cl.numarComanda)}
                            title="Finalizează & Închide Comanda"
                            className="px-2.5 py-1 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold shadow-xs transition"
                          >
                             Finalizează
                          </button>
                        </>
                      )}

                      {/* ACȚIUNI PENTRU COMENZI ANULATE */}
                      {cl.stare === 'ANULAT' && (
                        <>
                          <button
                            onClick={() => handleRedeschideComanda(cl.id, cl.numarComanda)}
                            title="Re-deschide și reactivează această comandă de lucru în starea ÎN LUCRU"
                            className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold border border-emerald-300 flex items-center space-x-1 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Re-deschide</span>
                          </button>

                          <button
                            onClick={() => handleDeleteComanda(cl)}
                            title="Șterge definitiv această comandă anulată din registru"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-roseash-100 text-slate-600 hover:text-terracotta-700 text-[11px] font-bold border border-slate-300 flex items-center space-x-1 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Șterge</span>
                          </button>
                        </>
                      )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
            </>
          );
        })()}
      </div>

      {/* ─── MODAL EDITARE COMANDĂ DE LUCRU (MODERN WORKSHOP DEVIZ EDITOR) ─── */}
      {showEditModal && (
        <DraggableModal
          isOpen={!!showEditModal}
          onClose={() => setShowEditModal(null)}
          defaultWidth={1150}
          defaultHeight={820}
          minWidth={550}
          minHeight={420}
          customHeader={({ isMaximized, toggleMaximize, onClose }) => (
            <div className="flex flex-col md:flex-row md:items-center justify-between px-5 py-3.5 border-b border-morning-200 gap-3 bg-white select-none">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2.5 flex-wrap">
                  <div className="p-1 text-slate-400 hover:text-sapphire-600 transition flex items-center" title="Trage pentru a muta fereastra (Dublu-click pentru mărire)">
                    <GripHorizontal className="w-4 h-4" />
                  </div>
                  <div className="p-1.5 rounded-xl bg-sapphire-50 text-sapphire-600 border border-sapphire-100">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-black text-sapphire-900 tracking-tight truncate">
                    Comandă de Lucru {showEditModal.numarComanda}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    showEditModal.stare === 'FINALIZAT' ? 'bg-sapphire-50 text-sapphire-700 border border-sapphire-200' :
                    showEditModal.stare === 'DEVALIDAT' ? 'bg-roseash-100 text-terracotta-700 border border-roseash-300' :
                    'bg-periwinkle-100 text-periwinkle-700 border border-periwinkle-300'
                  }`}>
                    {showEditModal.stare === 'IN_LUCRU' ? '● ÎN LUCRU' : showEditModal.stare}
                  </span>
                </div>

                {/* VEHICLE QUICK META STRIP */}
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 flex-wrap pl-7">
                  <span className="px-2 py-0.5 rounded-md bg-morning-100 text-sapphire-900 font-extrabold border border-morning-200">
                    {showEditModal.vehiculNumarIntern || showEditModal.vehiculInmatriculare || 'Utilaj'}
                  </span>
                  {showEditModal.vehiculInmatriculare && showEditModal.vehiculNumarIntern && showEditModal.vehiculInmatriculare !== showEditModal.vehiculNumarIntern && (
                    <span className="text-slate-500 font-mono">{showEditModal.vehiculInmatriculare}</span>
                  )}
                  {(() => {
                    const marcaModel = [showEditModal.vehiculMarca, showEditModal.vehiculModel]
                      .filter((v) => v && !/^[-–—\s]+$/.test(String(v).trim()) && String(v).trim().toUpperCase() !== 'N/A')
                      .join(' ');
                    return marcaModel ? (
                      <span className="text-slate-700 font-semibold">{marcaModel}</span>
                    ) : null;
                  })()}
                  {showEditModal.valoareContorLaExecutie > 0 && (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono font-bold border border-emerald-200">
                      Contor: {showEditModal.valoareContorLaExecutie.toLocaleString('ro-RO')} {showEditModal.vehiculTipMasurare || 'KM'}
                    </span>
                  )}
                </div>
              </div>

              {/* QUICK HEADER ACTIONS */}
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal({
                      ...showEditModal,
                      mecanicResponsabil: editMecanici.join(', '),
                      observatii: editObservatii,
                      elementeComanda: editElemente,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-morning-50 hover:bg-morning-200 text-sapphire-900 text-xs font-bold border border-morning-300 flex items-center space-x-1.5 transition"
                  title="Previzualizează fișa de atelier A4"
                >
                  <Printer className="w-3.5 h-3.5 text-sapphire-600" />
                  <span className="hidden sm:inline">Previzualizare A4</span>
                </button>

                <button
                  type="button"
                  onClick={toggleMaximize}
                  className="p-1.5 rounded-xl text-sage-500 hover:text-slate-800 hover:bg-morning-200 transition"
                  title={isMaximized ? 'Restaurează dimensiunea inițială' : 'Maximizează pe tot ecranul'}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-sage-500 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Închide fereastra"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          bodyClassName="p-4 sm:p-5 space-y-4 bg-morning-50/40"
        >

            {/* 1. DETALII INTERVENȚIE: MECANICI & OBSERVAȚII */}
            <div className="bg-white border border-morning-200 rounded-2xl p-3.5 shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-0 lg:divide-x lg:divide-morning-200">
              {/* MECANICI */}
              <div className="lg:col-span-5 lg:pr-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-sapphire-500" />
                    <span className="text-sapphire-900 font-black text-xs">Mecanici Responsabili</span>
                    {editMecanici.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-sapphire-50 text-sapphire-700 border border-sapphire-200 text-[10px] font-bold">
                        {editMecanici.length} {editMecanici.length === 1 ? 'selectat' : 'selectați'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddMecanicModal(true)}
                    className="text-[11px] text-sapphire-600 hover:underline font-bold flex items-center space-x-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Mecanic nou</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {mecaniciList.map((m) => {
                    const isSelected = editMecanici.includes(m.nume);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleEditMecanicSelection(m.nume)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center space-x-1 transition border ${
                          isSelected
                            ? 'bg-sapphire-600 text-white border-sapphire-600 shadow-2xs'
                            : 'bg-morning-50 text-slate-700 border-morning-200 hover:bg-morning-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{m.nume}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OBSERVAȚII */}
              <div className="lg:col-span-7 lg:pl-4 space-y-1.5">
                <label className="text-sapphire-900 font-black text-xs block">
                  Descriere Lucrare / Observații Intervenție
                </label>
                <textarea
                  rows={2}
                  value={editObservatii}
                  onChange={(e) => setEditObservatii(e.target.value)}
                  placeholder="ex: Schimb filtre și ulei, verificare frâne, constatare joc articulație dreapta..."
                  className="w-full bg-morning-50/50 focus:bg-white border border-morning-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sapphire-400/40 focus:border-sapphire-400 placeholder:text-sage-400 transition resize-none"
                />
              </div>
            </div>

            {/* 2. BARA RAPIDĂ DE ADĂUGARE PE DEVIZ */}
            <div className="bg-white border border-sapphire-200/80 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                {/* SEGMENTED CONTROL SURSĂ ELEMENT */}
                <div className="bg-morning-100 p-1 rounded-xl border border-morning-200 flex flex-wrap gap-1">
                  {(Object.keys(PILON_COST_CONFIG) as Array<keyof typeof PILON_COST_CONFIG>).map((key) => {
                    const cfg = PILON_COST_CONFIG[key];
                    const IconComp = cfg.icon;
                    const isActive = quickPilonCost === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setQuickPilonCost(key);
                          if (key === 'PIESA_STOC') {
                            setQuickPretUnitar(quickSelectedArticol?.pretUnitar || 0);
                          } else {
                            setQuickSelectedArticol(null);
                            if (key === 'PIESA_DEZMEMBRATA') setQuickPretUnitar(0);
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition ${
                          isActive
                            ? cfg.activeClass
                            : 'text-slate-600 hover:text-sapphire-900 hover:bg-white/70'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>

                <span className="text-[11px] text-sage-600 font-medium hidden xl:inline">
                  Selectați sursa, completați elementul și apăsați Enter sau Adaugă
                </span>
              </div>

              {/* FILTRE MAGAZIE (DEPOZIT + CATEGORIE) CÂND SE ADAUGĂ PIESE DIN STOC */}
              {quickPilonCost === 'PIESA_STOC' && (
                <div className="bg-morning-50 border border-morning-200/90 rounded-xl px-3 py-2 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                  {/* FILTRU DEPOZIT */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1 mr-0.5">
                      <Building2 className="w-3.5 h-3.5 text-sapphire-600" />
                      <span>Depozit:</span>
                    </span>
                    {availableStockWarehouses.length <= 5 ? (
                      availableStockWarehouses.map((wh) => {
                        const count = wh === 'TOATE' ? availableStockItems.length : (warehouseCounts.get(wh) || 0);
                        const isActive = effectiveStockWarehouse === wh;
                        return (
                          <button
                            key={wh}
                            type="button"
                            onClick={() => handleWarehouseFilterChange(wh)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center space-x-1 border ${
                              isActive
                                ? 'bg-sapphire-600 text-white border-sapphire-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-morning-200 hover:bg-morning-200/70'
                            }`}
                          >
                            <span>{wh === 'TOATE' ? 'Toate' : wh}</span>
                            <span className={`text-[10px] font-mono ${isActive ? 'text-sapphire-100' : 'text-sage-500'}`}>
                              ({count})
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <select
                        value={effectiveStockWarehouse}
                        onChange={(e) => handleWarehouseFilterChange(e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white border border-morning-300 text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400"
                      >
                        {availableStockWarehouses.map((wh) => {
                          const count = wh === 'TOATE' ? availableStockItems.length : (warehouseCounts.get(wh) || 0);
                          return (
                            <option key={wh} value={wh}>
                              {wh === 'TOATE' ? `Toate depozitele (${count})` : `${wh} (${count})`}
                            </option>
                          );
                        })}
                      </select>
                    )}
                  </div>

                  {/* FILTRU CATEGORIE + COUNTER + RESET */}
                  <div className="flex items-center gap-2 flex-wrap justify-between lg:justify-end">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                        <Filter className="w-3 h-3 text-sapphire-600" />
                        <span>Categorie:</span>
                      </span>
                      <select
                        value={effectiveStockCategory}
                        onChange={(e) => handleCategoryFilterChange(e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-morning-300 text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 max-w-[220px]"
                      >
                        {availableStockCategories.map((cat) => {
                          const count = cat === 'TOATE' ? warehouseScopedStock.length : (categoryCounts.get(cat) || 0);
                          return (
                            <option key={cat} value={cat}>
                              {cat === 'TOATE' ? `Toate categoriile (${count})` : `${cat} (${count})`}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <span className="px-2 py-0.5 rounded-md bg-white border border-morning-200 text-[11px] font-mono font-bold text-slate-600">
                      {filteredStockList.length} {filteredStockList.length === 1 ? 'reper' : 'repere'}
                    </span>

                    {(effectiveStockWarehouse !== 'TOATE' || effectiveStockCategory !== 'TOATE' || quickSearchQuery.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickSelectedWarehouse('TOATE');
                          setQuickSelectedCategory('TOATE');
                          clearQuickStockSelection(false);
                        }}
                        className="text-[11px] font-bold text-terracotta-600 hover:underline flex items-center space-x-1"
                        title="Resetează filtrele de stoc"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resetează</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* INPUT BAR ROW */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                {/* MAIN INPUT / SEARCH COMBOBOX */}
                <div className="md:col-span-6 relative">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="text-[11px] font-bold text-sapphire-900">
                      {PILON_COST_CONFIG[quickPilonCost].inputLabel}:
                    </label>
                    {quickPilonCost === 'PIESA_STOC' && quickSelectedArticol && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md truncate max-w-[60%]">
                        {getWarehouseName(quickSelectedArticol)} · Disponibil: {getRemainingStockForItem(quickSelectedArticol, draftStockAllocation)} {quickSelectedArticol.unitateMasura || 'buc'}
                      </span>
                    )}
                  </div>

                  {quickPilonCost === 'PIESA_STOC' ? (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 pointer-events-none" />
                        <input
                          type="text"
                          value={quickSearchQuery}
                          onChange={(e) => {
                            setQuickSearchQuery(e.target.value);
                            if (quickSelectedArticol) {
                              clearQuickStockSelection(true);
                            }
                            setIsSearchDropdownOpen(true);
                          }}
                          onFocus={() => setIsSearchDropdownOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (filteredStockList.length > 0) {
                                selectQuickStockItem(filteredStockList[0]);
                              }
                            }
                          }}
                          placeholder={PILON_COST_CONFIG.PIESA_STOC.placeholder}
                          className="w-full pl-9 pr-8 py-2 bg-morning-50/40 focus:bg-white border border-morning-300 rounded-xl text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 placeholder:text-sage-400 transition"
                        />
                        {quickSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              clearQuickStockSelection(false);
                              setIsSearchDropdownOpen(true);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-slate-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* FLOATING SMART AUTOCOMPLETE DROPDOWN */}
                      {isSearchDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsSearchDropdownOpen(false)}
                          />
                          <div className="absolute left-0 top-full mt-1.5 z-50 w-full lg:w-[680px] max-w-[90vw] bg-white border border-morning-300 rounded-2xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-morning-100">
                            <div className="sticky top-0 z-10 bg-morning-50/95 backdrop-blur-xs px-3 py-1.5 border-b border-morning-200 flex items-center justify-between text-[10px] font-bold text-sage-600">
                              <span>
                                {filteredStockList.length} {filteredStockList.length === 1 ? 'piesă disponibilă' : 'piese disponibile'}
                                {effectiveStockWarehouse !== 'TOATE' ? ` · ${effectiveStockWarehouse}` : ''}
                                {effectiveStockCategory !== 'TOATE' ? ` · ${effectiveStockCategory}` : ''}
                              </span>
                              <span>
                                {filteredStockList.length > 30 ? 'Afișate primele 30 · Enter selectează primul' : 'Enter selectează primul rezultat'}
                              </span>
                            </div>

                            {filteredStockList.length > 0 ? (
                              filteredStockList.slice(0, 30).map((st) => {
                                const remainingStock = getRemainingStockForItem(st, draftStockAllocation);
                                const isSelected = quickSelectedArticol?.id === st.id;
                                return (
                                  <div
                                    key={st.id}
                                    onClick={() => selectQuickStockItem(st)}
                                    className={`px-3 py-2.5 cursor-pointer transition flex items-center justify-between hover:bg-sapphire-50/70 ${
                                      isSelected ? 'bg-sapphire-50 border-l-4 border-sapphire-500' : ''
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1 mr-3 space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px] border border-slate-200 flex-shrink-0">
                                          {st.codArticol}
                                        </span>
                                        <span className="font-bold text-sapphire-900 text-xs truncate">
                                          {st.denumire}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-[10px] text-sage-600 flex-wrap gap-y-0.5">
                                        <span className="bg-morning-100 px-1.5 py-0.5 rounded font-medium border border-morning-200">
                                          {st.categorie}{st.subcategorie ? ` ▸ ${st.subcategorie}` : ''}
                                        </span>
                                        <span className="inline-flex items-center space-x-1 font-semibold text-slate-600">
                                          <Building2 className="w-3 h-3 text-sapphire-500" />
                                          <span>{getWarehouseName(st)}</span>
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right flex-shrink-0 space-y-0.5">
                                      <div>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                                          {remainingStock} {st.unitateMasura || 'buc'}
                                        </span>
                                      </div>
                                      <div className="text-[11px] font-mono font-bold text-slate-700">
                                        {Number(st.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-5 text-center text-xs text-sage-500 font-medium">
                                Nu s-au găsit piese disponibile pentru filtrele selectate.
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={quickDescriere}
                      onChange={(e) => setQuickDescriere(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuickElement();
                        }
                      }}
                      placeholder={PILON_COST_CONFIG[quickPilonCost].placeholder}
                      className="w-full px-3 py-2 bg-morning-50/40 focus:bg-white border border-morning-300 rounded-xl text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 placeholder:text-sage-400 transition"
                    />
                  )}
                </div>

                {/* CANTITATE STEPPER */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-sapphire-900">
                      Cantitate:
                    </label>
                    {quickPilonCost === 'PIESA_STOC' && quickSelectedArticol && (
                      <span className="text-[10px] font-mono font-bold text-sage-600">
                        max {getRemainingStockForItem(quickSelectedArticol, draftStockAllocation)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center bg-white border border-morning-300 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuickCantitate((prev) => Math.max(getMinQuickQty(), prev - 1))}
                      className="px-2 py-2 text-slate-500 hover:bg-morning-200 hover:text-slate-800 transition"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="any"
                      min={getMinQuickQty()}
                      value={quickCantitate}
                      onChange={(e) => setQuickCantitate(Math.max(getMinQuickQty(), Number(e.target.value)))}
                      className="w-full text-center py-1.5 font-mono font-extrabold text-xs text-sapphire-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (quickPilonCost === 'PIESA_STOC' && quickSelectedArticol) {
                          const remainingAvailable = getRemainingStockForItem(quickSelectedArticol);
                          if (quickCantitate >= remainingAvailable) {
                            alert(`Stoc maxim disponibil atins: ${remainingAvailable} ${quickSelectedArticol.unitateMasura || 'buc'}`);
                            return;
                          }
                        }
                        setQuickCantitate((prev) => prev + 1);
                      }}
                      className="px-2 py-2 text-slate-500 hover:bg-morning-200 hover:text-slate-800 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* PREȚ UNITAR */}
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-sapphire-900 block mb-1">
                    Preț Unitar:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      disabled={quickPilonCost === 'PIESA_DEZMEMBRATA'}
                      value={quickPilonCost === 'PIESA_DEZMEMBRATA' ? 0 : quickPretUnitar}
                      onChange={(e) => setQuickPretUnitar(Number(e.target.value))}
                      className="w-full py-2 pl-2.5 pr-9 bg-white border border-morning-300 rounded-xl text-xs font-mono font-extrabold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-sage-500 pointer-events-none">
                      RON
                    </span>
                  </div>
                </div>

                {/* SUBMIT QUICK ADD BUTTON */}
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuickElement()}
                    className="w-full py-2 px-3 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-black text-xs shadow-sm shadow-sapphire-600/20 flex items-center justify-center space-x-1.5 transition active:scale-98"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adaugă</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. TABEL DEVIZ / ELEMENTE DE LUCRU */}
            <div className="bg-white border border-morning-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-morning-50/80 border-b border-morning-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-sapphire-600" />
                  <h3 className="text-xs font-black text-sapphire-900 uppercase tracking-wider">
                    Deviz Comandă & Elemente
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-sapphire-100 text-sapphire-800 text-[10px] font-mono font-extrabold">
                    {editElemente.length}
                  </span>
                </div>
                <span className="text-[11px] text-sage-600 font-medium">
                  Toate pozițiile pot fi editate inline (cantitate, preț sau denumire)
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-morning-100/70 sticky top-0 z-10 border-b border-morning-200 text-slate-600 font-extrabold text-[11px]">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 w-40">Tip / Proveniență</th>
                      <th className="p-2.5">Descriere Piesă & Operațiune</th>
                      <th className="p-2.5 w-32 text-center">Cantitate</th>
                      <th className="p-2.5 w-28 text-right">Preț Unitar</th>
                      <th className="p-2.5 w-32 text-right">Total Rând</th>
                      <th className="p-2.5 w-12 text-center">Șterge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-100">
                    {editElemente.length > 0 ? (
                      editElemente.map((el, idx) => {
                        const stockItem = el.articolStocId ? stocuri.find((s) => s.id === el.articolStocId) : null;
                        const totalDraftForStock = stockItem ? (draftStockAllocation.get(stockItem.id) || 0) : 0;
                        const isExceeded = el.pilonCost === 'PIESA_STOC' && stockItem && totalDraftForStock > Number(stockItem.stocCurent || 0);
                        const remainingAfterDraft = stockItem ? Math.max(0, Number(stockItem.stocCurent || 0) - totalDraftForStock) : 0;
                        const rowTotal = (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0);
                        const pilonCfg = PILON_COST_CONFIG[el.pilonCost as keyof typeof PILON_COST_CONFIG] || PILON_COST_CONFIG.PIESA_DIRECTA;

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-morning-50/70 transition ${
                              isExceeded ? 'bg-rose-50/70' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center font-mono font-bold text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>

                            {/* PILON COST BADGE */}
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border inline-flex items-center space-x-1.5 ${pilonCfg.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${pilonCfg.accentDot}`} />
                                <span>{pilonCfg.shortLabel}</span>
                              </span>
                            </td>

                            {/* DESCRIERE */}
                            <td className="p-2.5">
                              <div className="space-y-0.5">
                                <input
                                  type="text"
                                  value={el.descriere}
                                  onChange={(e) => handleUpdateEditElementDesc(idx, e.target.value)}
                                  className="w-full font-bold text-sapphire-900 bg-transparent border-b border-transparent hover:border-morning-300 focus:border-sapphire-400 focus:outline-none text-xs"
                                />
                                {stockItem && (
                                  <div className="flex items-center gap-2 text-[10px] text-sage-600 flex-wrap">
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                      {stockItem.codArticol}
                                    </span>
                                    <span className="inline-flex items-center space-x-1">
                                      <Building2 className="w-3 h-3 text-sapphire-500" />
                                      <span>{getWarehouseName(stockItem)}</span>
                                    </span>
                                    <span className={remainingAfterDraft > 0 ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                                      · Stoc: {stockItem.stocCurent} {stockItem.unitateMasura || 'buc'} (rămas: {remainingAfterDraft})
                                    </span>
                                  </div>
                                )}
                                {isExceeded && (
                                  <p className="text-[10px] text-rose-600 font-extrabold">
                                    Atenție: Cantitatea totală solicitată ({totalDraftForStock}) depășește stocul disponibil ({stockItem?.stocCurent})!
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* CANTITATE STEPPER INLINE */}
                            <td className="p-2.5 text-center">
                              <div className="inline-flex items-center bg-white border border-morning-300 rounded-lg overflow-hidden shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEditElementQty(idx, -1)}
                                  className="px-1.5 py-1 text-slate-500 hover:bg-morning-200 transition"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={el.cantitate}
                                  onChange={(e) => setEditElementQty(idx, Number(e.target.value), false)}
                                  className="w-12 text-center py-1 font-mono font-bold text-xs text-sapphire-900 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEditElementQty(idx, 1)}
                                  className="px-1.5 py-1 text-slate-500 hover:bg-morning-200 transition"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* PREȚ UNITAR */}
                            <td className="p-2.5 text-right">
                              {el.pilonCost === 'PIESA_DEZMEMBRATA' ? (
                                <span className="text-[11px] font-mono text-slate-400 font-bold">0,00 RON</span>
                              ) : (
                                <div className="inline-flex items-center space-x-1 justify-end">
                                  <input
                                    type="number"
                                    value={el.pretUnitar}
                                    onChange={(e) => handleUpdateEditElementPrice(idx, Number(e.target.value))}
                                    className="w-20 text-right py-1 px-1.5 bg-white border border-morning-200 rounded-lg text-xs font-mono font-bold text-sapphire-900 focus:outline-none focus:ring-1 focus:ring-sapphire-400"
                                  />
                                  <span className="text-[10px] text-sage-500 font-bold">RON</span>
                                </div>
                              )}
                            </td>

                            {/* TOTAL RÂND */}
                            <td className="p-2.5 text-right font-mono font-black text-sapphire-900 text-xs whitespace-nowrap">
                              {rowTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                            </td>

                            {/* TRASH BUTTON */}
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveEditElement(idx)}
                                className="p-1.5 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 rounded-lg transition"
                                title="Șterge poziția din deviz"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-sage-500 space-y-1.5">
                          <Package className="w-7 h-7 text-sage-300 mx-auto" />
                          <p className="font-bold text-xs text-slate-600">Nicio piesă sau manoperă adăugată pe această comandă.</p>
                          <p className="text-[11px] text-sage-500">
                            Selectați sursa de mai sus și adăugați piese din stoc, dezmembrări sau manoperă.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. SUMAR TOTAL DEVIZ ÎN TIMP REAL */}
            <div className="bg-white border border-morning-200 rounded-2xl p-3 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
                <div className="bg-morning-50/70 px-3 py-2 rounded-xl border border-morning-200 border-l-4 border-l-sapphire-500">
                  <span className="text-[10px] text-sage-600 font-bold block uppercase tracking-wider">Piese Stoc ({bucatiDevizStoc} buc)</span>
                  <span className="font-mono font-black text-sapphire-900 text-xs">
                    {totalDevizPieseStoc.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                  </span>
                </div>

                <div className="bg-morning-50/70 px-3 py-2 rounded-xl border border-morning-200 border-l-4 border-l-emerald-500">
                  <span className="text-[10px] text-sage-600 font-bold block uppercase tracking-wider">Dezmembrări ({bucatiDevizDezmembrari} buc)</span>
                  <span className="font-mono font-black text-emerald-700 text-xs">
                    0,00 RON <span className="text-[10px] font-semibold text-emerald-600">· Recuperat</span>
                  </span>
                </div>

                <div className="bg-morning-50/70 px-3 py-2 rounded-xl border border-morning-200 border-l-4 border-l-amber-500">
                  <span className="text-[10px] text-sage-600 font-bold block uppercase tracking-wider">Achiziții Directe</span>
                  <span className="font-mono font-black text-amber-800 text-xs">
                    {totalDevizDirecte.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                  </span>
                </div>

                <div className="bg-morning-50/70 px-3 py-2 rounded-xl border border-morning-200 border-l-4 border-l-indigo-500">
                  <span className="text-[10px] text-sage-600 font-bold block uppercase tracking-wider">Manoperă & Extern</span>
                  <span className="font-mono font-black text-indigo-900 text-xs">
                    {totalDevizManopera.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                  </span>
                </div>
              </div>

              {/* CASETA TOTAL GENERAL */}
              <div className="bg-sapphire-900 text-white px-5 py-2.5 rounded-xl shadow-sm text-right flex-shrink-0 flex lg:flex-col items-center lg:items-end justify-between gap-2 lg:gap-0">
                <span className="text-[10px] text-sapphire-200 font-extrabold uppercase tracking-widest block">
                  Total General Comandă
                </span>
                <span className="text-xl font-black font-mono tracking-tight text-white">
                  {totalGeneralDeviz.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                </span>
              </div>
            </div>

            {/* 5. ACȚIUNI SUBSOL DEVIZ (FOOTER ACTIONS) */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-morning-200 gap-3">
              <div className="text-[11px] text-sage-600 font-medium">
                Salvarea ca ciornă păstrează stocul nescăzut; finalizarea scade stocul FIFO.
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end flex-wrap gap-y-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-morning-300 hover:bg-morning-100 text-slate-700 font-bold text-xs transition"
                >
                  Anulează
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-white border border-sapphire-500 text-sapphire-700 hover:bg-sapphire-50 font-black text-xs shadow-2xs flex items-center space-x-1.5 transition"
                >
                  <span>Salvează Ciornă</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingAndFinalizing}
                  onClick={handleSaveAndFinalize}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-sm shadow-emerald-600/20 flex items-center space-x-1.5 transition active:scale-98"
                >
                  {isSavingAndFinalizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Se finalizează...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvează & Finalizează (FIFO)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
        </DraggableModal>
      )}

      {/* ─── MODAL VIZUALIZARE & NYOMTATÁS A4 (PDF PRINT TEMPLATE) ─── */}
      {showViewModal && (
        <DraggableModal
          isOpen={!!showViewModal}
          onClose={() => setShowViewModal(null)}
          defaultWidth={960}
          defaultHeight={820}
          minWidth={550}
          minHeight={400}
          title={`Previzualizare Fișă A4 (Comandă ${showViewModal.numarComanda})`}
          icon={<FileText className="w-5 h-5 text-sapphire-500" />}
          headerActions={
            <button
              type="button"
              onClick={handlePrintDocument}
              className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 flex items-center space-x-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Printează / Salvează PDF</span>
            </button>
          }
          bodyClassName="p-4 sm:p-6 bg-slate-100/60"
        >
          {/*  PRINTABLE A4 SHEET VIEW  */}
          <div id="printable-a4-area" className="p-8 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-800 font-sans shadow-xs">
            {/* Document Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-2xl font-extrabold tracking-wider text-slate-900 uppercase">FleetCMD CMMS Enterprise</h2>
                <p className="text-xs font-semibold text-slate-600">Sistem de Gestiune Flotă, Mentenanță & Atelier Intern</p>
                <p className="text-[11px] text-slate-500 mt-1">Departament Tehnic | Șantier Central</p>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-slate-900 font-mono font-extrabold text-lg">
                  {showViewModal.numarComanda}
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  Stare: <span className="uppercase">{showViewModal.stare}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Dată Emitere: {new Date(showViewModal.dataDeschidere).toLocaleDateString('ro-RO')}
                </p>
              </div>
            </div>

            <div className="text-center my-2">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-1 inline-block">
                FIȘĂ COMANDĂ DE LUCRU & DEVIZ SERVIZ
              </h3>
            </div>

            {/* Section I: Date Utilaj */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">I. Date Utilaj / Vehicul</p>
                <p><strong>Număr Intern:</strong> {showViewModal.vehiculNumarIntern}</p>
                <p><strong>Număr Înmatriculare:</strong> {showViewModal.vehiculInmatriculare}</p>
                <p><strong>Marcă & Model:</strong> {showViewModal.vehiculMarca} {showViewModal.vehiculModel}</p>
              </div>

              <div>
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">Date Tehnice Execuție</p>
                <p><strong>Serie Șasiu / VIN:</strong> {showViewModal.vehiculSerieSasiu}</p>
                <p>
                  <strong>Contor la Execuție:</strong>{' '}
                  {Number(showViewModal.valoareContorLaExecutie || 0) > 0
                    ? `${Number(showViewModal.valoareContorLaExecutie).toLocaleString('ro-RO')} ${showViewModal.vehiculTipMasurare}`
                    : 'Nespecificat (neînregistrat)'}
                </p>
                <p><strong>Dată Finalizare:</strong> {showViewModal.dataFinalizare ? new Date(showViewModal.dataFinalizare).toLocaleDateString('ro-RO') : 'În Desfășurare'}</p>
              </div>
            </div>

            {/* Section II: Echipa Atelier */}
            <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">II. Informații Atelier & Mecanici Responsabili</p>
              <p><strong>Mecanic(i) Responsabil(i):</strong> {showViewModal.mecanicResponsabil || 'Atelier Intern'}</p>
              {showViewModal.observatii && <p className="mt-1"><strong>Observații / Motiv Intervenție:</strong> {showViewModal.observatii}</p>}
            </div>

            {/* Section III: Tabel Elemente & Piese Consumate */}
            <div className="space-y-2">
              <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">III. Desfășurător Elemente, Piese Schimb & Manoperă</p>

              <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-10 text-center">#</th>
                    <th className="p-2 border-r border-slate-300">Descriere Operațiune / Piesă</th>
                    <th className="p-2 border-r border-slate-300">Proveniență & Factură Achiziție</th>
                    <th className="p-2 border-r border-slate-300 w-20 text-center">Cant.</th>
                    <th className="p-2 border-r border-slate-300 w-28 text-right">Preț Unitar</th>
                    <th className="p-2 w-28 text-right">Total (RON)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(showViewModal.elementeComanda || []).map((el: any, idx: number) => {
                    const prov = getProvenientaSuffix(el);
                    const unitPrice = Number(el.pretUnitar || 0);
                    const lineTotal = Number(el.costTotal != null ? el.costTotal : (Number(el.cantitate || 1) * unitPrice));
                    const furnizor = el.furnizor || el.articolStoc?.intrariStoc?.[0]?.furnizor;
                    const factura = el.numarFactura || el.articolStoc?.intrariStoc?.[0]?.numarFactura;
                    const dataFactura = el.articolStoc?.intrariStoc?.[0]?.dataFactura;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-mono text-center">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200">
                          <span className="font-semibold text-slate-900">{el.descriere}</span>
                          {prov && (
                            <span className="text-slate-500 font-normal ml-1.5">({prov})</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          {furnizor || factura ? (
                            <div className="space-y-0.5 text-[11px]">
                              {furnizor && (
                                <div className="font-bold text-slate-800 flex items-center space-x-1">
                                  <span>🏢 {furnizor}</span>
                                </div>
                              )}
                              {factura && (
                                <div className="text-slate-600 flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFacturaInEfactura(factura)}
                                    className="hover:underline hover:text-sapphire-700 font-medium inline-flex items-center space-x-0.5"
                                    title="Deschide în e-Factura"
                                  >
                                    <span>📄 Factura: <strong>{factura}</strong></span>
                                    {dataFactura && <span className="text-slate-500 text-[10px]">({new Date(dataFactura).toLocaleDateString('ro-RO')})</span>}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Stoc Intern / Nespecificat</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-mono text-center font-bold">{el.cantitate}</td>
                        <td className="p-2 border-r border-slate-200 font-mono text-right">{unitPrice.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                        <td className="p-2 font-mono font-bold text-right text-slate-900">{lineTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Section IV: Total Deviz */}
            <div className="flex justify-end pt-2">
              <div className="w-64 bg-slate-100 p-3 rounded-lg border border-slate-300 text-xs space-y-1 text-right">
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">Subtotal Piese & Servicii:</span>
                  <span className="font-mono font-bold">
                    {showViewModal.elementeComanda?.reduce((sum: number, el: any) => sum + (el.costTotal || 0), 0) || 0} RON
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px]">
                  <span>TVA (0% scurtcircuit intern):</span>
                  <span>0 RON</span>
                </div>
                <div className="flex justify-between border-t border-slate-400 pt-1 text-sm font-extrabold text-slate-900">
                  <span>TOTAL GENERAL DEVIZ:</span>
                  <span className="font-mono text-sapphire-900">
                    {Number(showViewModal.elementeComanda?.reduce((sum: number, el: any) => sum + (el.costTotal || 0), 0) || 0)
                      .toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                  </span>
                </div>
              </div>
            </div>

            {/* Section V: Semnături */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs text-center">
              <div className="space-y-8">
                <p className="font-bold text-slate-800">Semnătură Executant / Mecanic Responsabil</p>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                <p className="text-[10px] text-slate-500">Data: ____ / ____ / ________</p>
              </div>

              <div className="space-y-8">
                <p className="font-bold text-slate-800">Semnătură Receptionat / Șef Flotă & Atelier</p>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                <p className="text-[10px] text-slate-500">Data: ____ / ____ / ________</p>
              </div>
            </div>
          </div>
        </DraggableModal>
      )}

      {/* MODAL ADĂUGARE PIESĂ SUPLIMENTARĂ */}
      {showAddElementModal && (
        <DraggableModal
          isOpen={!!showAddElementModal}
          onClose={() => setShowAddElementModal(null)}
          defaultWidth={520}
          defaultHeight={540}
          minWidth={380}
          minHeight={320}
          title={`Adăugare Piesă pe Comanda ${showAddElementModal.numarComanda}`}
          icon={<Package className="w-5 h-5 text-sapphire-600" />}
          bodyClassName="p-5"
        >
          <form onSubmit={handleAddElementToOrder} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Tip Pilon Cost / Proveniență:</label>
                <select
                  value={elemPilonCost}
                  onChange={(e) => setElemPilonCost(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="PIESA_STOC">1. PIESĂ STOC INTERN (Scade din stoc FIFO)</option>
                  <option value="PIESA_DEZMEMBRATA">1b. PIESĂ DEZMEMBRĂRI / PARC PROPRIU (0 RON / 0 stoc scăzut)</option>
                  <option value="PIESA_DIRECTA">2. ACHIZIȚIE DIRECTĂ PIESĂ</option>
                  <option value="MANOPERA_INTERNA">3. MANOPERĂ INTERNĂ ATELIER</option>
                </select>
              </div>

              {elemPilonCost === 'PIESA_STOC' && (
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Selectează Articol din Stoc:</label>
                  <select
                    value={elemArticolStocId}
                    onChange={(e) => handleSelectElemArticolStoc(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  >
                    {stocuri.filter((st) => !isTireItem(st) && Number(st.stocCurent || 0) > 0).map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.denumire} (Stoc: {st.stocCurent} {st.unitateMasura} - {st.pretUnitar} RON)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Piesă / Operațiune:</label>
                <input
                  required
                  value={elemDescriere}
                  onChange={(e) => setElemDescriere(e.target.value)}
                  placeholder="ex: Ulei Hidraulic 15L sau Filtru Aer"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  {(() => {
                    const currentElemStockItem = stocuri.find((st) => st.id === elemArticolStocId);
                    const isElemExceeded = elemPilonCost === 'PIESA_STOC' && currentElemStockItem && elemCantitate > currentElemStockItem.stocCurent;
                    return (
                      <>
                        <label className="text-sage-700 block mb-1 font-bold">Cantitate:</label>
                        <input
                          type="number"
                          min="1"
                          max={elemPilonCost === 'PIESA_STOC' && currentElemStockItem ? currentElemStockItem.stocCurent : undefined}
                          value={elemCantitate}
                          onChange={(e) => setElemCantitate(Number(e.target.value))}
                          className={`w-full border rounded-xl p-2.5 text-sapphire-900 font-mono font-bold ${
                            isElemExceeded ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-morning-100 border-morning-200'
                          }`}
                        />
                        {isElemExceeded && (
                          <p className="text-[11px] font-extrabold text-rose-600 mt-1 flex items-center space-x-1">
                            <span>Stoc insuficient! Disponibil: {currentElemStockItem.stocCurent} {currentElemStockItem.unitateMasura || 'buc'}</span>
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar (RON):</label>
                  <input
                    type="number"
                    value={elemPretUnitar}
                    onChange={(e) => setElemPretUnitar(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddElementModal(null)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Piesă pe Comandă</button>
              </div>
            </form>
        </DraggableModal>
      )}

      {/* Modal Adaugă Comandă de Lucru Nouă */}
      {showAddModal && (
        <DraggableModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          defaultWidth={720}
          defaultHeight={780}
          minWidth={440}
          minHeight={380}
          title="Deschidere Comandă de Lucru Nouă"
          icon={<Truck className="w-5 h-5 text-sapphire-600" />}
          bodyClassName="p-5 sm:p-6"
        >
          <form onSubmit={handleCreateComanda} className="space-y-3 text-xs">
              {/* ─── SELECTOR INTELIGENT UTILAJ (SMART VEHICLE SELECTOR) ─── */}
              {(() => {
                const selectedVehicul = vehicule.find((v) => v.id === selectedVehiculId);
                return (
                  <div className="p-3.5 bg-morning-100/90 border border-morning-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sapphire-900 font-extrabold flex items-center space-x-1.5 text-xs">
                        <Truck className="w-4 h-4 text-sapphire-500" />
                        <span>Selectează Utilaj din Flotă:</span>
                      </label>
                      {selectedVehicul && (
                        <button
                          type="button"
                          onClick={() => setIsVehiculSearchOpen(!isVehiculSearchOpen)}
                          className="text-[11px] font-bold text-sapphire-600 hover:text-sapphire-800 hover:underline flex items-center space-x-1"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>{isVehiculSearchOpen ? 'Închide căutarea' : 'Schimbă utilajul'}</span>
                        </button>
                      )}
                    </div>

                    {/* CARD: VEHICUL SELECTAT (când căutarea este închisă) */}
                    {selectedVehicul && !isVehiculSearchOpen ? (
                      <div
                        onClick={() => setIsVehiculSearchOpen(true)}
                        className="p-3 bg-white border border-morning-300 hover:border-sapphire-400 rounded-xl flex items-center justify-between shadow-2xs cursor-pointer transition group"
                        title="Faceți clic pentru a schimba utilajul"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-sapphire-50 group-hover:bg-sapphire-100 text-sapphire-600 border border-sapphire-200 flex items-center justify-center text-xl flex-shrink-0 transition">
                            {getCategoryIcon(selectedVehicul.categorieEnum)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-black text-sapphire-900 text-sm">
                                {selectedVehicul.numarInmatriculare || selectedVehicul.numarIntern}
                              </span>
                              {selectedVehicul.numarIntern && selectedVehicul.numarIntern !== selectedVehicul.numarInmatriculare && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono font-bold">
                                  Nr. {selectedVehicul.numarIntern}
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-morning-200 text-slate-700">
                                {getCategoryLabel(selectedVehicul.categorieEnum)}
                              </span>
                            </div>
                            <p className="text-xs text-sage-600 font-medium truncate">
                              {selectedVehicul.marca} {selectedVehicul.model} {selectedVehicul.anFabricatie ? `(${selectedVehicul.anFabricatie})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-3 space-y-0.5">
                          <div className="text-xs font-mono font-black text-sapphire-900">
                            {Number(selectedVehicul.valoareContorCurent || 0).toLocaleString('ro-RO')} {selectedVehicul.tipMasurare || 'KM'}
                          </div>
                          {getVehiculContorDate(selectedVehicul) && (
                            <div className="text-[10px] text-sage-600 font-bold">
                              (înregistrat: {getVehiculContorDate(selectedVehicul)})
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* CASETA CĂUTARE ȘI SELECTARE CATEGORIE */
                      <div className="space-y-2.5 pt-1">
                        {/* Butoane filtrare rapidă categorie */}
                        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                          <span className="text-sage-600 font-bold flex-shrink-0 mr-1">Categorie:</span>
                          {availableVehiculeCategories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setVehiculCategoryFilter(cat)}
                              className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition ${
                                vehiculCategoryFilter === cat
                                  ? 'bg-sapphire-600 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 border border-morning-200 hover:bg-morning-200'
                              }`}
                            >
                              {cat === 'TOATE' ? 'Toate Flota' : `${getCategoryIcon(cat)} ${getCategoryLabel(cat)}`}
                            </button>
                          ))}
                        </div>

                        {/* Câmp căutare în timp real */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 pointer-events-none" />
                          <input
                            type="text"
                            value={vehiculSearchQuery}
                            onChange={(e) => setVehiculSearchQuery(e.target.value)}
                            placeholder="Caută după număr înmatriculare, număr intern sau marcă (ex: CV 06 BNW, MAN, Fabia)..."
                            autoFocus
                            className="w-full pl-9 pr-8 py-2 bg-white border border-morning-300 rounded-xl text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 placeholder:text-sage-400 shadow-2xs"
                          />
                          {vehiculSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setVehiculSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-slate-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Találati lista */}
                        <div className="max-h-52 overflow-y-auto divide-y divide-morning-100 bg-white border border-morning-200 rounded-xl shadow-inner">
                          {filteredVehiculeList.length > 0 ? (
                            filteredVehiculeList.map((v) => {
                              const isSelected = v.id === selectedVehiculId;
                              const vDate = getVehiculContorDate(v);
                              return (
                                <div
                                  key={v.id}
                                  onClick={() => {
                                    handleSelectVehicul(v.id);
                                    setIsVehiculSearchOpen(false);
                                  }}
                                  className={`p-2.5 cursor-pointer transition flex items-center justify-between hover:bg-sapphire-50/70 ${
                                    isSelected ? 'bg-sapphire-50 border-l-4 border-sapphire-500 font-bold' : ''
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0 mr-2">
                                    <span className="text-lg flex-shrink-0">{getCategoryIcon(v.categorieEnum)}</span>
                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-black text-sapphire-900 text-xs">
                                          {v.numarInmatriculare || v.numarIntern}
                                        </span>
                                        {v.numarIntern && v.numarIntern !== v.numarInmatriculare && (
                                          <span className="text-[10px] px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono font-bold">
                                            Nr. {v.numarIntern}
                                          </span>
                                        )}
                                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-morning-200 text-slate-700">
                                          {getCategoryLabel(v.categorieEnum)}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-sage-600 font-medium truncate">
                                        {v.marca} {v.model}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right flex-shrink-0 space-y-0.5">
                                    <div className="font-mono font-extrabold text-sapphire-900 text-xs">
                                      {Number(v.valoareContorCurent || 0).toLocaleString('ro-RO')} {v.tipMasurare || 'KM'}
                                    </div>
                                    {vDate && (
                                      <div className="text-[10px] text-sage-500 font-medium">
                                        ({vDate})
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center text-xs text-sage-500 font-medium">
                              Nu s-a găsit niciun utilaj conform căutării.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* INDEX KM / ORE FUNCȚIONARE (OPȚIONAL — 0 NU ÎNREGISTREAZĂ KM) */}
              {(() => {
                const selV = vehicule.find((v) => v.id === selectedVehiculId);
                const isTrailer = selV?.categorieEnum === 'REMORCA' || selV?.categorieEnum === 'SEMIREMORCA' || selV?.categorieEnum?.includes('REMORCA');
                const coupledTractor = selV?.cuplariSemiremorca?.[0]?.capTractor;
                const currentContor = selV?.valoareContorCurent || 0;
                const selVDate = getVehiculContorDate(selV);
                const parsedContorVal = Number(valoareContorExecutie || 0) || 0;
                const isLower = selV && !isTrailer && parsedContorVal > 0 && parsedContorVal < currentContor;

                return (
                  <div className="space-y-2">
                    {isTrailer && (
                      <div className="p-3 rounded-2xl border bg-amber-50/90 border-amber-300 space-y-2 text-xs">
                        <div className="flex items-center space-x-2 text-amber-900 font-extrabold">
                          <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Semiremorcă / Remorcă (Fără odometru propriu pe șasiu)</span>
                        </div>

                        {coupledTractor ? (
                          <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between shadow-xs">
                            <div>
                              <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider"> Cuplat Activ la Cap Tractor:</p>
                              <p className="font-extrabold text-sapphire-900">
                                {coupledTractor.numarInmatriculare || coupledTractor.numarIntern} {coupledTractor.numarIntern && coupledTractor.numarIntern !== coupledTractor.numarInmatriculare ? `(Nr. ${coupledTractor.numarIntern})` : ''} — {coupledTractor.marca} {coupledTractor.model}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setValoareContorExecutie(String(coupledTractor.valoareContorCurent || 0))}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold shadow-xs transition flex items-center space-x-1"
                            >
                              <span>Preia KM: {Number(coupledTractor.valoareContorCurent || 0).toLocaleString('ro-RO')} KM</span>
                              {getVehiculContorDate(coupledTractor) && (
                                <span className="opacity-90 font-normal">({getVehiculContorDate(coupledTractor)})</span>
                              )}
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-800 font-medium">
                            Semiremorca nu este cuplată momentan. Opțional, puteți selecta un cap tractor pentru preluarea kilometrajului:
                          </p>
                        )}

                        <div>
                          <label className="text-[10px] text-sage-700 font-bold block mb-1">
                            Alege Cap Tractor din flotă (opțional):
                          </label>
                          <select
                            onChange={(e) => {
                              const tr = vehicule.find((v) => v.id === e.target.value);
                              if (tr) setValoareContorExecutie(String(tr.valoareContorCurent || 0));
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl p-2 font-bold text-sapphire-900 text-xs"
                          >
                            <option value="">-- Selectează Cap Tractor --</option>
                            {vehicule
                              .filter((v) => v.categorieEnum === 'CAP_TRACTOR')
                              .map((tr) => {
                                const trDate = getVehiculContorDate(tr);
                                const trPlate = tr.numarIntern && tr.numarIntern !== tr.numarInmatriculare
                                  ? `${tr.numarInmatriculare} (Nr. ${tr.numarIntern})`
                                  : (tr.numarInmatriculare || tr.numarIntern);
                                return (
                                  <option key={tr.id} value={tr.id}>
                                    {trPlate} — {tr.marca} {tr.model} • Contor: {Number(tr.valoareContorCurent || 0).toLocaleString('ro-RO')} KM {trDate ? `(${trDate})` : ''}
                                  </option>
                                );
                              })}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-morning-100 border border-morning-200 rounded-2xl space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sapphire-900 font-extrabold block text-xs">
                          {isTrailer ? 'Index KM Cap Tractor la Execuție (Opțional):' : 'Index Contor (KM / mTH) la Execuție (Opțional):'}
                        </label>
                        {!isTrailer && currentContor > 0 && (
                          <button
                            type="button"
                            onClick={() => setValoareContorExecutie(String(currentContor))}
                            className="px-2 py-0.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 border border-sapphire-200 text-[10px] font-bold text-sapphire-700 transition cursor-pointer"
                          >
                            Preia contor ({Number(currentContor).toLocaleString('ro-RO')})
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={valoareContorExecutie}
                        onChange={(e) => setValoareContorExecutie(e.target.value)}
                        placeholder="0 (lăsați 0 sau gol pentru a nu înregistra KM)"
                        className={`w-full border rounded-xl p-2.5 text-sapphire-900 font-mono font-extrabold text-sm ${
                          isLower ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-morning-200'
                        }`}
                      />
                      <p className="text-[10px] text-sage-600 font-medium">
                        {isTrailer
                          ? '• Opțional: dacă lăsați 0, comanda se deschide fără înregistrare de kilometraj.'
                          : '• Dacă lăsați 0 (sau gol), nu se înregistrează index KM. Ultimul contor înregistrat: '}
                        {!isTrailer && (
                          <span className="font-extrabold text-sapphire-700">
                            {Number(currentContor || 0).toLocaleString('ro-RO')} {selV?.tipMasurare || 'KM/mTH'}
                            {selVDate && <span className="text-slate-600 font-bold ml-1 font-sans">(înregistrat la: {selVDate})</span>}
                          </span>
                        )}
                      </p>
                      {isLower && (
                        <div className="mt-1.5 p-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold flex items-center space-x-1.5 animate-pulse">
                          <span>ATENȚIE: Valoarea introdusă ({parsedContorVal} {selV?.tipMasurare}) este MAI MICĂ decât ultimul contor înregistrat ({currentContor} {selV?.tipMasurare})! Se va salva ca o corecție manuală.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* SELECȚIE MULTIPLĂ MECANICI */}
              <div className="p-3 bg-morning-100 border border-morning-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sapphire-900 font-extrabold flex items-center space-x-1">
                    <Users className="w-4 h-4 text-sapphire-500" />
                    <span>Mecanici Responsabili:</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAddMecanicModal(true)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-morning-200 text-[11px] font-bold text-sapphire-600"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Mecanic Nou</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {mecaniciList.map((m) => {
                    const isSelected = selectedMecanici.includes(m.nume);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMecanicSelection(m.nume)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition ${
                          isSelected ? 'bg-sapphire-500 text-white' : 'bg-white text-slate-700 border border-morning-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{m.nume}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Descriere Intervenție:</label>
                <textarea
                  value={observatii}
                  onChange={(e) => setObservatii(e.target.value)}
                  rows={2}
                  placeholder="ex: Schimb ulei hidraulic, reparare cilindru și înlocuire garnituri"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900"
                />
              </div>


              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 disabled:opacity-50 text-white font-bold shadow-md shadow-sapphire-500/20 flex items-center space-x-2 transition"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Se deschide comanda...</span>
                    </>
                  ) : (
                    <span>Deschide comanda de lucru</span>
                  )}
                </button>
              </div>
            </form>
        </DraggableModal>
      )}

      {/* Modal Adaugă Mecanic Nou */}
      {showAddMecanicModal && (
        <DraggableModal
          isOpen={showAddMecanicModal}
          onClose={() => setShowAddMecanicModal(false)}
          defaultWidth={460}
          defaultHeight={360}
          minWidth={360}
          minHeight={280}
          title="Adăugare Mecanic Nou"
          icon={<UserPlus className="w-5 h-5 text-sapphire-600" />}
          bodyClassName="p-5"
        >
          <form onSubmit={handleCreateMecanic} className="space-y-3 text-xs">
            <div>
              <label className="text-sage-700 block mb-1 font-bold">Nume & Prenume Mecanic:</label>
              <input
                required
                value={numeMecanicNou}
                onChange={(e) => setNumeMecanicNou(e.target.value)}
                placeholder="ex: Ion Popescu (Atelier)"
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
              />
            </div>

            <div>
              <label className="text-sage-700 block mb-1 font-bold">Funcție / Specializare:</label>
              <input
                value={functieMecanicNou}
                onChange={(e) => setFunctieMecanicNou(e.target.value)}
                placeholder="ex: Mecanică Grea / Electrician Auto"
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button type="button" onClick={() => setShowAddMecanicModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Mecanic</button>
            </div>
          </form>
        </DraggableModal>
      )}

      {/* ─── MODAL UNIRE / COMASARE COMENZI DE LUCRU ─── */}
      {showMergeModal && (
        <DraggableModal
          isOpen={showMergeModal}
          onClose={() => {
            if (!isMerging) setShowMergeModal(false);
          }}
          defaultWidth={900}
          defaultHeight={720}
          minWidth={520}
          minHeight={420}
          title="Unire (Comasare) Comenzi de Lucru"
          icon={<GitMerge className="w-5 h-5 text-sapphire-600" />}
          bodyClassName="p-5 overflow-y-auto"
        >
          {(() => {
            const modalVehOrders = mergeModalVehiculId
              ? comenzi
                  .filter((c: any) => c.vehiculId === mergeModalVehiculId && c.stare !== 'ANULAT')
                  .sort((a: any, b: any) =>
                    String(a.numarComanda || '').localeCompare(String(b.numarComanda || ''), undefined, {
                      numeric: true,
                    })
                  )
              : [];

            const modalSelectedOrders = modalVehOrders.filter((o: any) =>
              activeSelectedMergeIds.includes(o.id)
            );
            const effectiveTargetId = resolveDefaultMergeTargetId(modalSelectedOrders, mergeTargetId);
            const effectiveTargetObj = modalSelectedOrders.find((o: any) => o.id === effectiveTargetId);
            const hasFinalizedInSelection = modalSelectedOrders.some((o: any) => o.stare === 'FINALIZAT');
            const hasOpenInSelection = modalSelectedOrders.some((o: any) => o.stare !== 'FINALIZAT');
            const isMixedSelection = hasFinalizedInSelection && hasOpenInSelection;

            const mergedItemsCount = modalSelectedOrders.reduce(
              (acc: number, o: any) => acc + (o.elementeComanda?.length || 0),
              0
            );
            const mergedTotalValue = modalSelectedOrders.reduce(
              (acc: number, o: any) =>
                acc +
                (o.elementeComanda?.reduce((s: number, el: any) => s + Number(el.costTotal || 0), 0) || 0),
              0
            );
            const mergedMecSet = new Map<string, string>();
            modalSelectedOrders.forEach((o: any) => {
              String(o.mecanicResponsabil || '')
                .split(/[,;]+/)
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((m) => {
                  if (!mergedMecSet.has(m.toLowerCase())) mergedMecSet.set(m.toLowerCase(), m);
                });
            });
            const mergedMechanicsText = Array.from(mergedMecSet.values()).join(', ') || '—';

            const activeGroupVehInfo = modalVehOrders[0];
            const activeVehTitle = activeGroupVehInfo
              ? `${activeGroupVehInfo.vehiculNumarIntern || activeGroupVehInfo.vehiculInmatriculare}${
                  activeGroupVehInfo.vehiculInmatriculare &&
                  activeGroupVehInfo.vehiculNumarIntern !== activeGroupVehInfo.vehiculInmatriculare
                    ? ` (${activeGroupVehInfo.vehiculInmatriculare})`
                    : ''
                }`
              : '';

            const toggleModalOrderCheck = (orderId: string) => {
              const nextIds = activeSelectedMergeIds.includes(orderId)
                ? activeSelectedMergeIds.filter((id) => id !== orderId)
                : [...activeSelectedMergeIds.filter((id) => modalVehOrders.some((vo: any) => vo.id === id)), orderId];
              const nextObjs = modalVehOrders.filter((o: any) => nextIds.includes(o.id));
              const nextTarget = resolveDefaultMergeTargetId(nextObjs, mergeTargetId);
              setSelectedMergeIds(nextIds);
              setMergeTargetId(nextTarget);
              setMergeObservatii(buildDefaultMergeObservatii(nextObjs, nextTarget));
            };

            return (
              <div className="space-y-4 text-xs">
                {/* REGULĂ DOMENIU */}
                <div className="rounded-xl bg-morning-100 border border-morning-200 p-3 flex items-start space-x-2.5 text-slate-700">
                  <Info className="w-4 h-4 text-sapphire-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-sapphire-900">
                      Comasare comenzi multiple pentru același vehicul
                    </p>
                    <p className="text-[11px] text-sage-700">
                      Se pot uni doar comenzi aparținând <strong>aceluiași vehicul / utilaj</strong> (neanulate). Toate piesele, manopera, facturile e-Factura și mecanicii se mută pe comanda principală aleasă.
                    </p>
                  </div>
                </div>

                {/* SELECTOR RAPID VEHICULE CU COMENZI MULTIPLE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase tracking-wider font-extrabold text-sage-700">
                      Vehicule cu comenzi multiple ({mergeableVehicleGroups.length})
                    </label>
                    {modalVehOrders.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => selectGroupForMergeModal(mergeModalVehiculId)}
                        className="text-[11px] font-bold text-sapphire-600 hover:underline"
                      >
                        Selectează toate ({modalVehOrders.length}) pentru {activeVehTitle}
                      </button>
                    )}
                  </div>

                  {mergeableVehicleGroups.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                      {mergeableVehicleGroups.map((g) => {
                        const isActiveGroup = g.vehiculId === mergeModalVehiculId;
                        return (
                          <button
                            key={g.vehiculId}
                            type="button"
                            onClick={() => selectGroupForMergeModal(g.vehiculId)}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center space-x-1.5 transition ${
                              isActiveGroup
                                ? 'bg-sapphire-600 text-white border-sapphire-700 shadow-xs'
                                : 'bg-white hover:bg-morning-100 text-sapphire-900 border-morning-300'
                            }`}
                          >
                            <Truck className="w-3.5 h-3.5 opacity-80" />
                            <span>{g.code}</span>
                            {g.plate && g.plate !== g.code && (
                              <span className="opacity-75 font-normal">({g.plate})</span>
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                                isActiveGroup
                                  ? 'bg-black/25 text-white'
                                  : 'bg-sapphire-100 text-sapphire-700'
                              }`}
                            >
                              {g.orders.length}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-morning-200 bg-morning-50 p-4 text-center text-sage-700">
                      Nu există niciun vehicul cu cel puțin 2 comenzi de lucru active/finalizate disponibile pentru unire.
                    </div>
                  )}
                </div>

                {/* AVERTIZARE STARE MIXTĂ (FIFO) */}
                {isMixedSelection && (
                  <div className="rounded-xl bg-periwinkle-100 border border-periwinkle-300 p-3 flex items-start space-x-2 text-periwinkle-700 text-[11px]">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold">Selecție mixtă (Finalizate + Deschise):</span> Comenzile deschise vor fi finalizate automat (scădere stoc FIFO) înainte de absorbția în comanda <strong>FINALIZATĂ</strong> aleasă ca destinație. Comenzile nefinalizate nu pot absorbi comenzi deja finalizate.
                    </div>
                  </div>
                )}

                {mergeModalVehiculId && modalVehOrders.length < 2 && (
                  <div className="rounded-xl border border-morning-200 bg-morning-50 p-4 text-center text-sage-700">
                    Vehiculul <strong>{activeVehTitle || 'selectat'}</strong> are o singură comandă activă/finalizată. Alegeți un vehicul cu cel puțin 2 comenzi din lista de mai sus.
                  </div>
                )}

                {/* LISTA COMENZI DE UNIT + ALEGERE DESTINAȚIE PRINCIPALĂ */}
                {modalVehOrders.length >= 2 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider font-extrabold text-sage-700">
                        Comenzi pentru {activeVehTitle} — bifați comenzile de unit și alegeți comanda principală
                      </span>
                      <span className="text-[11px] font-bold text-sapphire-700">
                        {modalSelectedOrders.length} / {modalVehOrders.length} incluse
                      </span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {modalVehOrders.map((o: any) => {
                        const isChecked = activeSelectedMergeIds.includes(o.id);
                        const isTarget = isChecked && effectiveTargetId === o.id;
                        const targetEligible =
                          isChecked && (!hasFinalizedInSelection || o.stare === 'FINALIZAT');
                        const orderTotal =
                          o.elementeComanda?.reduce((s: number, el: any) => s + Number(el.costTotal || 0), 0) || 0;
                        const elemPreview = (o.elementeComanda || [])
                          .slice(0, 3)
                          .map((el: any) => el.descriere)
                          .filter(Boolean)
                          .join(', ');
                        const extraElems = Math.max(0, (o.elementeComanda?.length || 0) - 3);

                        return (
                          <div
                            key={o.id}
                            className={`rounded-xl border p-3 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isTarget
                                ? 'bg-sapphire-50 border-sapphire-400 ring-1 ring-sapphire-300'
                                : isChecked
                                ? 'bg-white border-morning-300'
                                : 'bg-morning-50/70 border-morning-200 opacity-65'
                            }`}
                          >
                            <div className="flex items-start space-x-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleModalOrderCheck(o.id)}
                                className="w-4 h-4 mt-0.5 rounded accent-sapphire-600 cursor-pointer shrink-0"
                              />
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono font-black text-sapphire-900">
                                    {o.numarComanda}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      o.stare === 'FINALIZAT'
                                        ? 'bg-sapphire-50 text-sapphire-700 border-sapphire-200'
                                        : o.stare === 'DEVALIDAT'
                                        ? 'bg-roseash-100 text-terracotta-700 border-roseash-300'
                                        : 'bg-periwinkle-100 text-periwinkle-700 border-periwinkle-300'
                                    }`}
                                  >
                                    {o.stare === 'IN_LUCRU' ? 'ÎN LUCRU' : o.stare}
                                  </span>
                                  <span className="text-[11px] text-sage-600">
                                    {new Date(o.dataDeschidere).toLocaleDateString('ro-RO')}
                                  </span>
                                  <span className="text-[11px] font-semibold text-slate-700">
                                    • {o.mecanicResponsabil || '—'}
                                  </span>
                                  <span className="text-[11px] font-mono font-bold text-sapphire-900">
                                    • {o.elementeComanda?.length || 0} poz. ·{' '}
                                    {orderTotal.toLocaleString('ro-RO', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{' '}
                                    RON
                                  </span>
                                </div>
                                <div className="text-[11px] text-sage-700 truncate max-w-xl">
                                  {elemPreview || o.observatii || 'Fără poziții în deviz'}
                                  {extraElems > 0 ? ` (+${extraElems} altele)` : ''}
                                </div>
                              </div>
                            </div>

                            <label
                              className={`shrink-0 inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition ${
                                !isChecked
                                  ? 'opacity-40 border-morning-200 text-sage-500 cursor-not-allowed'
                                  : !targetEligible
                                  ? 'opacity-50 border-morning-300 bg-morning-100 text-sage-600 cursor-not-allowed'
                                  : isTarget
                                  ? 'bg-sapphire-600 text-white border-sapphire-700 cursor-pointer'
                                  : 'bg-morning-100 hover:bg-morning-200 text-sapphire-900 border-morning-300 cursor-pointer'
                              }`}
                              title={
                                !isChecked
                                  ? 'Bifați mai întâi comanda'
                                  : !targetEligible
                                  ? 'O comandă deschisă nu poate absorbi comenzi finalizate'
                                  : 'Păstrează acest număr CL ca destinație principală'
                              }
                            >
                              <input
                                type="radio"
                                name="mergeTargetOrder"
                                checked={isTarget}
                                disabled={!targetEligible}
                                onChange={() => {
                                  setMergeTargetId(o.id);
                                  setMergeObservatii(buildDefaultMergeObservatii(modalSelectedOrders, o.id));
                                }}
                                className="accent-white cursor-pointer disabled:cursor-not-allowed"
                              />
                              <span>{isTarget ? 'Destinație (se păstrează)' : 'Principală'}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PREVIEW REZULTAT COMASARE */}
                {modalSelectedOrders.length >= 2 && effectiveTargetObj && (
                  <div className="rounded-xl bg-sapphire-50 border border-sapphire-200 p-3.5 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-sage-600">Comandă Păstrată</p>
                        <p className="font-mono font-black text-sapphire-900 text-sm">
                          {effectiveTargetObj.numarComanda}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-sage-600">Poziții Deviz Unite</p>
                        <p className="font-mono font-black text-sapphire-900 text-sm">
                          {mergedItemsCount} elemente
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-sage-600">Mecanici Reuniți</p>
                        <p className="font-bold text-sapphire-900 text-xs truncate" title={mergedMechanicsText}>
                          {mergedMechanicsText}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-sage-600">Valoare Totală</p>
                        <p className="font-mono font-black text-sapphire-900 text-sm">
                          {mergedTotalValue.toLocaleString('ro-RO', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          RON
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-sapphire-900">
                          Descriere / Observații Comasate:
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setMergeObservatii(
                              buildDefaultMergeObservatii(modalSelectedOrders, effectiveTargetObj.id)
                            )
                          }
                          className="text-[10px] font-bold text-sapphire-700 hover:underline"
                        >
                          Regenerează automat
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={mergeObservatii}
                        onChange={(e) => setMergeObservatii(e.target.value)}
                        placeholder="Observații pentru comanda rezultată..."
                        className="w-full bg-white border border-morning-300 rounded-xl p-2 text-xs text-sapphire-900"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end items-center space-x-3 pt-2 border-t border-morning-200">
                  <button
                    type="button"
                    disabled={isMerging}
                    onClick={() => setShowMergeModal(false)}
                    className="px-4 py-2 rounded-xl bg-morning-200 hover:bg-morning-300 text-slate-700 font-semibold transition"
                  >
                    Anulează
                  </button>
                  <button
                    type="button"
                    disabled={isMerging || modalSelectedOrders.length < 2 || !effectiveTargetObj}
                    onClick={handleConfirmMergeComenzi}
                    className="px-5 py-2.5 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-bold shadow-md shadow-sapphire-600/20 flex items-center space-x-2 transition"
                  >
                    {isMerging ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Se unesc comenzile...</span>
                      </>
                    ) : (
                      <>
                        <GitMerge className="w-4 h-4" />
                        <span>
                          {modalSelectedOrders.length >= 2 && effectiveTargetObj
                            ? `Unește ${modalSelectedOrders.length} Comenzi în ${effectiveTargetObj.numarComanda}`
                            : 'Selectați minim 2 comenzi'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}
        </DraggableModal>
      )}
    </div>
  );
}
