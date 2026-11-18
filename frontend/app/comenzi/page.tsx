"use client";

import { API_BASE_URL } from '@/lib/api';
import { getCategoryColor } from '@/lib/categoryColors';
import { showConfirm, showError, showToast } from '@/lib/swal';
import { useAuth } from '@/lib/AuthContext';
import { useTabWorkspace } from '@/lib/TabWorkspaceContext';
import { useState, useEffect, useMemo, Suspense } from 'react';
import {
  ClipboardList, Plus, Search, RotateCcw, Trash2, Edit3, Pin, PinOff,
  Clock, CheckCircle2, AlertTriangle, Package, Wrench, Truck, User,
  Calendar, Check, X, LayoutList, LayoutGrid, Printer, ArrowRight,
  Flame, Sparkles, ChevronRight, ShoppingBag, ExternalLink, FileText
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  cantitate?: string;
}

type NotaStatus = 'DE_REZOLVAT' | 'TERMEN_LIMITA' | 'IN_ASTEPTARE_PIESE' | 'IN_PROGRES' | 'REZOLVAT';
type NotaCategorie = 'PROBLEMA' | 'REPARATIE' | 'PIESE_COMANDAT' | 'REVIZIE' | 'GENERAL';
type NotaPrioritate = 'CRITIC' | 'URGENT' | 'NORMAL' | 'SCAZUT';

interface NotaAtelier {
  id: string;
  titlu: string;
  descriere?: string | null;
  categorie: NotaCategorie | string;
  status: NotaStatus | string;
  prioritate: NotaPrioritate | string;
  pinuit: boolean;
  vehiculId?: string | null;
  vehicul?: {
    id: string;
    numarIntern: string;
    numarInmatriculare: string;
    marca?: string;
    model?: string;
    categorieEnum?: string;
    tipMasurare?: string;
    valoareContorCurent?: number;
  } | null;
  mecanicAsignat?: string | null;
  creatDe?: string | null;
  checklistJson?: string | null;
  termenLimita?: string | null;
  dataFinalizare?: string | null;
  comandaLucruId?: string | null;
  comandaLucruNumar?: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_META: Record<NotaStatus, {
  label: string;
  shortLabel: string;
  badge: string;
  dot: string;
  borderAccent: string;
}> = {
  DE_REZOLVAT: {
    label: 'De Rezolvat',
    shortLabel: 'De Rezolvat',
    badge: 'bg-roseash-100 text-terracotta-800 border-roseash-300',
    dot: 'bg-terracotta-500',
    borderAccent: 'border-l-terracotta-500',
  },
  TERMEN_LIMITA: {
    label: 'Cu Termen',
    shortLabel: 'Cu Termen',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    dot: 'bg-amber-500',
    borderAccent: 'border-l-amber-500',
  },
  IN_ASTEPTARE_PIESE: {
    label: 'Așteaptă Piese',
    shortLabel: 'Piese',
    badge: 'bg-periwinkle-100 text-periwinkle-800 border-periwinkle-300',
    dot: 'bg-periwinkle-500',
    borderAccent: 'border-l-periwinkle-500',
  },
  IN_PROGRES: {
    label: 'În Lucru',
    shortLabel: 'În Lucru',
    badge: 'bg-sapphire-100 text-sapphire-900 border-sapphire-300',
    dot: 'bg-sapphire-500',
    borderAccent: 'border-l-sapphire-500',
  },
  REZOLVAT: {
    label: 'Rezolvat',
    shortLabel: 'Rezolvat',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    borderAccent: 'border-l-emerald-500',
  },
};

const CATEGORY_META: Record<NotaCategorie, { label: string; badge: string }> = {
  PROBLEMA: { label: 'Problemă', badge: 'bg-roseash-50 text-terracotta-700 border-roseash-300' },
  REPARATIE: { label: 'Reparație', badge: 'bg-sapphire-50 text-sapphire-800 border-sapphire-200' },
  PIESE_COMANDAT: { label: 'Piese de Comandat', badge: 'bg-periwinkle-50 text-periwinkle-800 border-periwinkle-200' },
  REVIZIE: { label: 'Revizie / Verificare', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  GENERAL: { label: 'Notă Generală', badge: 'bg-morning-100 text-slate-700 border-morning-300' },
};

const PRIORITY_META: Record<NotaPrioritate, { label: string; rank: number; badge: string }> = {
  CRITIC: { label: 'Critic', rank: 4, badge: 'bg-terracotta-600 text-white border-terracotta-700' },
  URGENT: { label: 'Urgent', rank: 3, badge: 'bg-amber-500 text-white border-amber-600' },
  NORMAL: { label: 'Normal', rank: 2, badge: 'bg-morning-200 text-slate-700 border-morning-300' },
  SCAZUT: { label: 'Scăzut', rank: 1, badge: 'bg-morning-100 text-sage-600 border-morning-200' },
};

const STATUS_LIST: NotaStatus[] = ['DE_REZOLVAT', 'TERMEN_LIMITA', 'IN_ASTEPTARE_PIESE', 'IN_PROGRES', 'REZOLVAT'];
const VIEW_STORAGE_KEY = 'fleetcmd_comenzi_note_view';

const parseChecklist = (json?: string | null): ChecklistItem[] => {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const formatRelativeTime = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'chiar acum';
  if (mins < 60) return `acum ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `acum ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ieri';
  if (days < 30) return `acum ${days} zile`;
  return new Date(isoDate).toLocaleDateString('ro-RO');
};

const getDeadlineMeta = (termenIso?: string | null, status?: string) => {
  if (!termenIso) return null;
  const target = new Date(termenIso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.round((startTarget - startToday) / (1000 * 60 * 60 * 24));

  const isDone = status === 'REZOLVAT';
  if (isDone) {
    return {
      diffDays,
      isOverdue: false,
      isTodayOrSoon: false,
      label: target.toLocaleDateString('ro-RO'),
      badge: 'bg-morning-100 text-sage-600 border-morning-200',
    };
  }
  if (diffDays < 0) {
    return {
      diffDays,
      isOverdue: true,
      isTodayOrSoon: true,
      label: `Întârziat ${Math.abs(diffDays)}z (${target.toLocaleDateString('ro-RO')})`,
      badge: 'bg-terracotta-600 text-white border-terracotta-700',
    };
  }
  if (diffDays === 0) {
    return {
      diffDays,
      isOverdue: false,
      isTodayOrSoon: true,
      label: `Scadent ASTĂZI (${target.toLocaleDateString('ro-RO')})`,
      badge: 'bg-amber-500 text-white border-amber-600',
    };
  }
  if (diffDays <= 2) {
    return {
      diffDays,
      isOverdue: false,
      isTodayOrSoon: true,
      label: `${diffDays === 1 ? 'Mâine' : 'În 2 zile'} (${target.toLocaleDateString('ro-RO')})`,
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
    };
  }
  return {
    diffDays,
    isOverdue: false,
    isTodayOrSoon: false,
    label: `Până la ${target.toLocaleDateString('ro-RO')}`,
    badge: 'bg-sapphire-50 text-sapphire-800 border-sapphire-200',
  };
};

const addDaysIsoDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

function ComenziAtelierContent() {
  const { user: authUser, authFetch } = useAuth();
  const safeFetch = authFetch || fetch;
  const { openTab } = useTabWorkspace();

  const [notes, setNotes] = useState<NotaAtelier[]>([]);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [mecanici, setMecanici] = useState<any[]>([]);
  const [stocuri, setStocuri] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);

  // View & Procurement Drawer State
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showProcurementPanel, setShowProcurementPanel] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'list' || saved === 'kanban') setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const handleSetViewMode = (m: 'list' | 'kanban') => {
    setViewMode(m);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, m);
    } catch {
      // ignore
    }
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE'); // ACTIVE | TOATE | SCADENTE | DE_REZOLVAT | TERMEN_LIMITA | IN_ASTEPTARE_PIESE | IN_PROGRES | REZOLVAT
  const [categorieFilter, setCategorieFilter] = useState<string>('TOATE');
  const [vehiculFilter, setVehiculFilter] = useState<string>('');
  const [mecanicFilter, setMecanicFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'prioritate' | 'nou' | 'termen' | 'actualizat'>('prioritate');

  // Quick Capture Bar State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategorie, setQuickCategorie] = useState<NotaCategorie>('PROBLEMA');
  const [quickPrioritate, setQuickPrioritate] = useState<NotaPrioritate>('NORMAL');
  const [quickVehiculId, setQuickVehiculId] = useState('');
  const [quickTermen, setQuickTermen] = useState('');
  const [savingQuick, setSavingQuick] = useState(false);

  // Full Create / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingNota, setEditingNota] = useState<NotaAtelier | null>(null);
  const [formTitlu, setFormTitlu] = useState('');
  const [formDescriere, setFormDescriere] = useState('');
  const [formCategorie, setFormCategorie] = useState<NotaCategorie>('PROBLEMA');
  const [formStatus, setFormStatus] = useState<NotaStatus>('DE_REZOLVAT');
  const [formPrioritate, setFormPrioritate] = useState<NotaPrioritate>('NORMAL');
  const [formPinuit, setFormPinuit] = useState(false);
  const [formVehiculId, setFormVehiculId] = useState('');
  const [formMecanic, setFormMecanic] = useState('');
  const [formTermen, setFormTermen] = useState('');
  const [formChecklist, setFormChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItemText, setNewCheckItemText] = useState('');
  const [newCheckItemQty, setNewCheckItemQty] = useState('');

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [resNotes, resVeh, resMec, resStoc] = await Promise.all([
        safeFetch(`${API_BASE_URL}/mentenanta/note-atelier`),
        safeFetch(`${API_BASE_URL}/vehicule`),
        safeFetch(`${API_BASE_URL}/mentenanta/mecanici`).catch(() => null),
        safeFetch(`${API_BASE_URL}/stocuri-garantii/articole`).catch(() => null),
      ]);

      if (resNotes.ok) {
        const data = await resNotes.json();
        setNotes(Array.isArray(data) ? data : []);
      }
      if (resVeh.ok) {
        const vData = await resVeh.json();
        const arr = Array.isArray(vData) ? vData : vData?.data || vData?.items || [];
        setVehicule(Array.isArray(arr) ? arr : []);
      }
      if (resMec && resMec.ok) {
        const mData = await resMec.json();
        setMecanici(Array.isArray(mData) ? mData : []);
      }
      if (resStoc && resStoc.ok) {
        const sData = await resStoc.json();
        setStocuri(Array.isArray(sData) ? sData.filter((s: any) => Number(s.stocCurent || 0) > 0) : []);
      }
    } catch (e) {
      console.error('Eroare încărcare jurnal comenzi atelier:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const vehiculeSortate = useMemo(
    () =>
      [...vehicule].sort((a, b) =>
        String(a.numarIntern || a.numarInmatriculare || '').localeCompare(
          String(b.numarIntern || b.numarInmatriculare || ''),
          'ro',
          { numeric: true, sensitivity: 'base' },
        ),
      ),
    [vehicule],
  );

  // Smart auto-detection of vehicle while typing in quick-capture bar
  const detectedQuickVehicul = useMemo(() => {
    if (quickVehiculId || !quickTitle.trim() || quickTitle.trim().length < 3) return null;
    const norm = quickTitle.toLowerCase().replace(/\s+/g, ' ');
    return (
      vehiculeSortate.find((v) => {
        const intern = String(v.numarIntern || '').toLowerCase().trim();
        const plate = String(v.numarInmatriculare || '').toLowerCase().trim();
        return (intern.length >= 3 && norm.includes(intern)) || (plate.length >= 4 && norm.includes(plate));
      }) || null
    );
  }, [quickTitle, quickVehiculId, vehiculeSortate]);

  // Match a checklist part string against active warehouse inventory
  const findStockMatch = (partText: string) => {
    const clean = partText.trim().toLowerCase();
    if (clean.length < 4 || stocuri.length === 0) return null;
    const tokens = clean.split(/[\s,/\-]+/).filter((t) => t.length >= 3);
    if (tokens.length === 0) return null;
    return (
      stocuri.find((s) => {
        const hay = `${s.denumire || ''} ${s.codArticol || ''}`.toLowerCase();
        return tokens.every((tk) => hay.includes(tk));
      }) || null
    );
  };

  // KPI Counters & Procurement Rollup
  const stats = useMemo(() => {
    let active = 0;
    let deRezolvat = 0;
    let cuTermen = 0;
    let scadenteOrOverdue = 0;
    let asteaptaPiese = 0;
    let inLucru = 0;
    let rezolvate = 0;
    const pieseDeComandat: Array<{ nota: NotaAtelier; item: ChecklistItem; stocMatch: any }> = [];

    notes.forEach((n) => {
      if (n.status === 'REZOLVAT') {
        rezolvate++;
        return;
      }
      active++;
      if (n.status === 'DE_REZOLVAT') deRezolvat++;
      if (n.status === 'TERMEN_LIMITA') cuTermen++;
      if (n.status === 'IN_ASTEPTARE_PIESE') asteaptaPiese++;
      if (n.status === 'IN_PROGRES') inLucru++;

      const dl = getDeadlineMeta(n.termenLimita, n.status);
      if (dl && (dl.isOverdue || dl.isTodayOrSoon)) scadenteOrOverdue++;

      const list = parseChecklist(n.checklistJson);
      list.forEach((item) => {
        if (!item.done && (n.categorie === 'PIESE_COMANDAT' || n.status === 'IN_ASTEPTARE_PIESE')) {
          pieseDeComandat.push({ nota: n, item, stocMatch: findStockMatch(item.text) });
        }
      });
    });

    return { active, deRezolvat, cuTermen, scadenteOrOverdue, asteaptaPiese, inLucru, rezolvate, pieseDeComandat };
  }, [notes, stocuri]);

  // Filtered & Sorted Notes
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = notes.filter((n) => {
      if (statusFilter === 'ACTIVE') {
        if (n.status === 'REZOLVAT') return false;
      } else if (statusFilter === 'SCADENTE') {
        if (n.status === 'REZOLVAT') return false;
        const dl = getDeadlineMeta(n.termenLimita, n.status);
        if (n.status !== 'TERMEN_LIMITA' && !(dl && (dl.isOverdue || dl.isTodayOrSoon))) return false;
      } else if (statusFilter !== 'TOATE') {
        if (n.status !== statusFilter) return false;
      }

      if (categorieFilter !== 'TOATE' && n.categorie !== categorieFilter) return false;

      if (vehiculFilter === 'FARA_VEHICUL') {
        if (n.vehiculId) return false;
      } else if (vehiculFilter && n.vehiculId !== vehiculFilter) {
        return false;
      }

      if (mecanicFilter && n.mecanicAsignat !== mecanicFilter) return false;

      if (q) {
        const hay = [
          n.titlu,
          n.descriere,
          n.checklistJson,
          n.mecanicAsignat,
          n.creatDe,
          n.comandaLucruNumar,
          n.vehicul?.numarIntern,
          n.vehicul?.numarInmatriculare,
          n.vehicul?.marca,
          n.vehicul?.model,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (a.pinuit !== b.pinuit) return a.pinuit ? -1 : 1;

      if (sortBy === 'prioritate') {
        const aDone = a.status === 'REZOLVAT' ? 1 : 0;
        const bDone = b.status === 'REZOLVAT' ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;

        const rA = PRIORITY_META[a.prioritate as NotaPrioritate]?.rank || 2;
        const rB = PRIORITY_META[b.prioritate as NotaPrioritate]?.rank || 2;
        if (rA !== rB) return rB - rA;
      } else if (sortBy === 'termen') {
        const tA = a.termenLimita ? new Date(a.termenLimita).getTime() : Number.MAX_SAFE_INTEGER;
        const tB = b.termenLimita ? new Date(b.termenLimita).getTime() : Number.MAX_SAFE_INTEGER;
        if (tA !== tB) return tA - tB;
      } else if (sortBy === 'actualizat') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notes, searchQuery, statusFilter, categorieFilter, vehiculFilter, mecanicFilter, sortBy]);

  // Quick-capture submission
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      setSavingQuick(true);
      const effectiveVehId = quickVehiculId || detectedQuickVehicul?.id || null;
      const autoStatus: NotaStatus = quickTermen
        ? 'TERMEN_LIMITA'
        : quickCategorie === 'PIESE_COMANDAT'
        ? 'IN_ASTEPTARE_PIESE'
        : 'DE_REZOLVAT';

      const res = await safeFetch(`${API_BASE_URL}/mentenanta/note-atelier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titlu: quickTitle.trim(),
          categorie: quickCategorie,
          prioritate: quickPrioritate,
          status: autoStatus,
          vehiculId: effectiveVehId,
          termenLimita: quickTermen || null,
          creatDe: authUser?.nume || authUser?.username || 'Șef Atelier',
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setNotes((prev) => [created, ...prev]);
        setQuickTitle('');
        setQuickVehiculId('');
        setQuickTermen('');
        setQuickPrioritate('NORMAL');
        await showToast('Notă adăugată în jurnal.');
      } else {
        const err = await res.json().catch(() => ({}));
        await showError('Eroare', err.message || 'Nu s-a putut salva nota.');
      }
    } catch {
      await showError('Eroare Conexiune', 'Nu s-a putut comunica cu serverul.');
    } finally {
      setSavingQuick(false);
    }
  };

  // Modal Open Helpers
  const openCreateModal = (prefillStatus?: NotaStatus) => {
    setEditingNota(null);
    setFormTitlu(quickTitle.trim());
    setFormDescriere('');
    setFormCategorie(quickCategorie);
    setFormStatus(prefillStatus || 'DE_REZOLVAT');
    setFormPrioritate(quickPrioritate);
    setFormPinuit(false);
    setFormVehiculId(quickVehiculId || vehiculFilter || '');
    setFormMecanic('');
    setFormTermen(quickTermen || '');
    setFormChecklist([]);
    setNewCheckItemText('');
    setNewCheckItemQty('');
    setShowModal(true);
  };

  const openEditModal = (nota: NotaAtelier) => {
    setEditingNota(nota);
    setFormTitlu(nota.titlu);
    setFormDescriere(nota.descriere || '');
    setFormCategorie((nota.categorie as NotaCategorie) || 'PROBLEMA');
    setFormStatus((nota.status as NotaStatus) || 'DE_REZOLVAT');
    setFormPrioritate((nota.prioritate as NotaPrioritate) || 'NORMAL');
    setFormPinuit(Boolean(nota.pinuit));
    setFormVehiculId(nota.vehiculId || '');
    setFormMecanic(nota.mecanicAsignat || '');
    setFormTermen(nota.termenLimita ? String(nota.termenLimita).split('T')[0] : '');
    setFormChecklist(parseChecklist(nota.checklistJson));
    setNewCheckItemText('');
    setNewCheckItemQty('');
    setShowModal(true);
  };

  const handleAddChecklistItem = () => {
    const cleanText = newCheckItemText.trim();
    if (!cleanText) return;
    setFormChecklist((prev) => [
      ...prev,
      {
        id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: cleanText,
        cantitate: newCheckItemQty.trim() || undefined,
        done: false,
      },
    ]);
    setNewCheckItemText('');
    setNewCheckItemQty('');
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitlu.trim()) return;

    try {
      const payload = {
        titlu: formTitlu.trim(),
        descriere: formDescriere.trim() || null,
        categorie: formCategorie,
        status: formStatus,
        prioritate: formPrioritate,
        pinuit: formPinuit,
        vehiculId: formVehiculId || null,
        mecanicAsignat: formMecanic || null,
        termenLimita: formTermen || null,
        checklist: formChecklist,
        creatDe: editingNota?.creatDe || authUser?.nume || authUser?.username || 'Șef Atelier',
      };

      const url = editingNota
        ? `${API_BASE_URL}/mentenanta/note-atelier/${editingNota.id}`
        : `${API_BASE_URL}/mentenanta/note-atelier`;
      const method = editingNota ? 'PATCH' : 'POST';

      const res = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        setNotes((prev) =>
          editingNota ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev],
        );
        setShowModal(false);
        setEditingNota(null);
        await showToast(editingNota ? 'Notă actualizată.' : 'Notă adăugată.');
      } else {
        const err = await res.json().catch(() => ({}));
        await showError('Eroare', err.message || 'Nu s-a putut salva nota.');
      }
    } catch {
      await showError('Eroare Conexiune', 'Eroare la salvarea notei.');
    }
  };

  // Fast inline mutations (status, pin, checklist toggle)
  const patchNota = async (id: string, patch: any) => {
    try {
      const res = await safeFetch(`${API_BASE_URL}/mentenanta/note-atelier/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      }
    } catch {
      await showError('Eroare', 'Nu s-a putut actualiza nota.');
    }
  };

  const handleToggleChecklistRow = async (nota: NotaAtelier, itemId: string) => {
    const items = parseChecklist(nota.checklistJson).map((it) =>
      it.id === itemId ? { ...it, done: !it.done } : it,
    );
    setNotes((prev) =>
      prev.map((n) => (n.id === nota.id ? { ...n, checklistJson: JSON.stringify(items) } : n)),
    );
    await patchNota(nota.id, { checklist: items });
  };

  const handleDeleteNota = async (nota: NotaAtelier) => {
    const confirmed = await showConfirm(
      'Ștergere Notă Atelier',
      `Sigur doriți să ștergeți nota "${nota.titlu}"?`,
      'Da, șterge',
      'Anulează',
    );
    if (!confirmed) return;

    try {
      const res = await safeFetch(`${API_BASE_URL}/mentenanta/note-atelier/${nota.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== nota.id));
        if (editingNota?.id === nota.id) setShowModal(false);
        await showToast('Notă ștearsă.');
      }
    } catch {
      await showError('Eroare', 'Nu s-a putut șterge nota.');
    }
  };

  // 1-Click Escalation to official Deviz de Lucru
  const handleCreeazaDeviz = async (nota: NotaAtelier) => {
    if (!nota.vehiculId) {
      await showError(
        'Lipsește vehiculul',
        'Asociați mai întâi un vehicul acestei note (clic pe Editează) pentru a deschide un Deviz de Lucru.',
      );
      return;
    }

    if (nota.comandaLucruId) {
      openTab({ href: '/comenzi-lucru', title: 'Deviz de Lucru', iconName: 'Wrench' });
      return;
    }

    const confirmed = await showConfirm(
      'Deschidere Deviz de Lucru',
      `Doriți să deschideți un Deviz de Lucru oficial pentru <b>${nota.vehicul?.numarIntern || nota.vehicul?.numarInmatriculare}</b> din această notă?`,
      'Deschide Deviz',
      'Anulează',
    );
    if (!confirmed) return;

    try {
      setEscalatingId(nota.id);
      const res = await safeFetch(`${API_BASE_URL}/mentenanta/note-atelier/${nota.id}/creeaza-deviz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mecanicResponsabil: nota.mecanicAsignat || 'Atelier Intern' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.nota) {
          setNotes((prev) => prev.map((n) => (n.id === data.nota.id ? data.nota : n)));
        }
        await showToast(`Deviz creat: ${data.comanda?.numarComanda || 'CL'}`);
      } else {
        const err = await res.json().catch(() => ({}));
        await showError('Eroare', err.message || 'Nu s-a putut genera devizul.');
      }
    } catch {
      await showError('Eroare Rețea', 'Eroare la crearea devizului.');
    } finally {
      setEscalatingId(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ACTIVE');
    setCategorieFilter('TOATE');
    setVehiculFilter('');
    setMecanicFilter('');
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    statusFilter !== 'ACTIVE' ||
    categorieFilter !== 'TOATE' ||
    Boolean(vehiculFilter) ||
    Boolean(mecanicFilter);

  const renderNoteCard = (nota: NotaAtelier, compactKanban = false) => {
    const statusCfg = STATUS_META[nota.status as NotaStatus] || STATUS_META.DE_REZOLVAT;
    const catCfg = CATEGORY_META[nota.categorie as NotaCategorie] || CATEGORY_META.GENERAL;
    const prioCfg = PRIORITY_META[nota.prioritate as NotaPrioritate] || PRIORITY_META.NORMAL;
    const checklist = parseChecklist(nota.checklistJson);
    const doneCount = checklist.filter((i) => i.done).length;
    const deadlineMeta = getDeadlineMeta(nota.termenLimita, nota.status);
    const isResolved = nota.status === 'REZOLVAT';

    return (
      <div
        key={nota.id}
        className={`pleasant-card bg-white rounded-2xl border border-morning-200 border-l-4 ${statusCfg.borderAccent} p-4 shadow-xs transition flex flex-col justify-between space-y-3 ${
          isResolved ? 'opacity-75' : 'hover:shadow-md'
        }`}
      >
        <div className="space-y-2.5">
          {/* Top Metadata Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center flex-wrap gap-1.5">
              {nota.pinuit && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black">
                  <Pin className="w-3 h-3 mr-0.5" />
                  Fixat
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${prioCfg.badge}`}>
                {prioCfg.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catCfg.badge}`}>
                {catCfg.label}
              </span>
              {nota.comandaLucruNumar && (
                <button
                  type="button"
                  onClick={() => openTab({ href: '/comenzi-lucru', title: 'Deviz de Lucru', iconName: 'Wrench' })}
                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-black transition cursor-pointer print:hidden"
                  title="Deschide Devizul de Lucru asociat"
                >
                  <Wrench className="w-2.5 h-2.5" />
                  <span>{nota.comandaLucruNumar}</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1 shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => patchNota(nota.id, { pinuit: !nota.pinuit })}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  nota.pinuit
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                    : 'text-sage-400 hover:text-sapphire-700 hover:bg-morning-100'
                }`}
                title={nota.pinuit ? 'Anulează fixarea în vârf' : 'Fixează în vârf'}
              >
                {nota.pinuit ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => openEditModal(nota)}
                className="p-1.5 rounded-lg text-sage-500 hover:text-sapphire-700 hover:bg-morning-100 transition cursor-pointer"
                title="Editează nota / detalii"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteNota(nota)}
                className="p-1.5 rounded-lg text-sage-400 hover:text-terracotta-600 hover:bg-roseash-50 transition cursor-pointer"
                title="Șterge nota"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <h3
              className={`font-extrabold text-sm text-sapphire-900 leading-snug ${
                isResolved ? 'line-through opacity-80' : ''
              }`}
            >
              {nota.titlu}
            </h3>
            {nota.descriere && (
              <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                {nota.descriere}
              </p>
            )}
          </div>

          {/* Vehicle & Mechanic Chips */}
          {(nota.vehicul || nota.mecanicAsignat || deadlineMeta) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {nota.vehicul && (
                <button
                  type="button"
                  onClick={() =>
                    openTab({
                      href: `/fisa-tehnica?id=${nota.vehicul!.id}`,
                      title: `${nota.vehicul!.numarIntern} (${nota.vehicul!.numarInmatriculare})`,
                      iconName: 'Truck',
                    })
                  }
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-sapphire-50 border border-morning-300 text-xs font-bold text-sapphire-900 transition cursor-pointer"
                  title="Deschide Fișa Tehnică a vehiculului"
                >
                  <Truck className="w-3.5 h-3.5 text-sapphire-600" />
                  <span className="font-mono font-black">{nota.vehicul.numarIntern}</span>
                  {nota.vehicul.numarInmatriculare &&
                    nota.vehicul.numarInmatriculare !== nota.vehicul.numarIntern && (
                      <span className="text-[11px] text-slate-600 font-mono">
                        ({nota.vehicul.numarInmatriculare})
                      </span>
                    )}
                  {nota.vehicul.categorieEnum && (
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${getCategoryColor(nota.vehicul.categorieEnum).badge}`}>
                      {nota.vehicul.categorieEnum}
                    </span>
                  )}
                </button>
              )}

              {nota.mecanicAsignat && (
                <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-morning-100 border border-morning-200 text-[11px] font-bold text-slate-700">
                  <User className="w-3 h-3 text-sage-500" />
                  <span>{nota.mecanicAsignat}</span>
                </span>
              )}

              {deadlineMeta && (
                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-lg border text-[11px] font-extrabold ${deadlineMeta.badge}`}>
                  <Calendar className="w-3 h-3" />
                  <span>{deadlineMeta.label}</span>
                </span>
              )}
            </div>
          )}

          {/* Interactive Parts / Steps Checklist */}
          {checklist.length > 0 && (
            <div className="p-2.5 rounded-xl bg-morning-50 border border-morning-200 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-sage-600">
                <span>Piese / Pași de rezolvare</span>
                <span className="font-mono">
                  {doneCount}/{checklist.length}
                </span>
              </div>
              <div className="w-full h-1.5 bg-morning-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.round((doneCount / checklist.length) * 100)}%` }}
                />
              </div>
              <div className="space-y-1 pt-0.5">
                {checklist.map((item) => {
                  const stockMatch = !item.done ? findStockMatch(item.text) : null;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleChecklistRow(nota, item.id)}
                      className="w-full flex items-center justify-between gap-2 text-left text-xs py-1 px-1.5 rounded-lg hover:bg-morning-100 transition cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition ${
                            item.done
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-morning-300'
                          }`}
                        >
                          {item.done && <Check className="w-3 h-3" />}
                        </span>
                        <span
                          className={`truncate ${
                            item.done ? 'line-through text-sage-500' : 'text-sapphire-900 font-semibold'
                          }`}
                        >
                          {item.cantitate && (
                            <span className="font-mono font-black text-sapphire-700 mr-1">
                              {item.cantitate}x
                            </span>
                          )}
                          {item.text}
                        </span>
                      </div>
                      {stockMatch && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold shrink-0"
                          title={`În stoc: ${stockMatch.denumire} (${stockMatch.stocCurent} ${stockMatch.unitateMasura || 'buc'})`}
                        >
                          Stoc: {stockMatch.stocCurent} {stockMatch.unitateMasura || 'buc'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Timestamps + Quick Status Actions */}
        <div className="pt-2.5 border-t border-morning-200 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-semibold text-sage-500">
            <span className="flex items-center space-x-1" title={new Date(nota.createdAt).toLocaleString('ro-RO')}>
              <Clock className="w-3 h-3" />
              <span>
                {new Date(nota.createdAt).toLocaleString('ro-RO', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ({formatRelativeTime(nota.createdAt)})
              </span>
            </span>
            {nota.dataFinalizare && isResolved && (
              <span className="text-emerald-700 font-bold">
                Rezolvat: {new Date(nota.dataFinalizare).toLocaleDateString('ro-RO')}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 print:hidden">
            <select
              value={nota.status}
              onChange={(e) => patchNota(nota.id, { status: e.target.value })}
              className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border cursor-pointer ${statusCfg.badge}`}
            >
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {STATUS_META[st].label}
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-1.5">
              {!compactKanban && nota.vehiculId && !nota.comandaLucruId && !isResolved && (
                <button
                  type="button"
                  disabled={escalatingId === nota.id}
                  onClick={() => handleCreeazaDeviz(nota)}
                  className="px-2.5 py-1 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-800 border border-sapphire-200 text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                  title="Transformă această notă într-un Deviz de Lucru oficial (/comenzi-lucru)"
                >
                  <Wrench className="w-3 h-3" />
                  <span>{escalatingId === nota.id ? 'Se creează...' : 'Deviz'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => patchNota(nota.id, { status: isResolved ? 'DE_REZOLVAT' : 'REZOLVAT' })}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition flex items-center space-x-1 cursor-pointer border ${
                  isResolved
                    ? 'bg-morning-100 hover:bg-morning-200 text-slate-700 border-morning-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>{isResolved ? 'Redeschide' : 'Rezolvat'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* PRINT-ONLY WORKSHOP HEADER */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4">
        <h1 className="text-xl font-black text-slate-900">
          FleetCMD — Lista Zilnică Comenzi &amp; Reparații Atelier ({new Date().toLocaleDateString('ro-RO')})
        </h1>
        <p className="text-xs text-slate-600">
          Sarcini afișate: {filteredNotes.length} • Active totale: {stats.active} • De comandat piese: {stats.pieseDeComandat.length}
        </p>
      </div>

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-black text-sapphire-900 tracking-tight flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
              <ClipboardList className="w-6 h-6" />
            </div>
            <span>Comenzi &amp; Jurnal Atelier</span>
          </h1>
          <p className="text-xs text-sage-600 font-medium mt-1">
            Blocnotes inteligent pentru șeful de atelier: defecțiuni, piese de comandat, termene limită și legătură directă cu Devizele de Lucru
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start lg:self-auto">
          <div className="flex items-center space-x-1 p-1 bg-morning-100 rounded-xl border border-morning-200">
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                viewMode === 'list' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Jurnal</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('kanban')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                viewMode === 'kanban' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Panou Status</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowProcurementPanel((prev) => !prev)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showProcurementPanel
                ? 'bg-periwinkle-500 text-white border-periwinkle-600 shadow-xs'
                : 'bg-periwinkle-50 hover:bg-periwinkle-100 text-periwinkle-900 border-periwinkle-300'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Piese de Comandat ({stats.pieseDeComandat.length})</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-morning-100 border border-morning-300 text-sapphire-900 text-xs font-bold transition cursor-pointer"
            title="Listează sarcinile curente pentru ședința de atelier"
          >
            <Printer className="w-3.5 h-3.5 text-sapphire-600" />
            <span className="hidden sm:inline">Printează Lista</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Notă Nouă</span>
          </button>
        </div>
      </div>

      {/* KPI STATUS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:hidden">
        {[
          { key: 'ACTIVE', label: 'Active Total', count: stats.active, accent: 'border-l-sapphire-500', text: 'text-sapphire-900' },
          { key: 'DE_REZOLVAT', label: 'De Rezolvat', count: stats.deRezolvat, accent: 'border-l-terracotta-500', text: 'text-terracotta-700' },
          {
            key: 'SCADENTE',
            label: 'Cu Termen / Scadente',
            count: stats.cuTermen,
            sub: stats.scadenteOrOverdue > 0 ? `${stats.scadenteOrOverdue} urgente/întârziate` : 'în termen',
            accent: 'border-l-amber-500',
            text: 'text-amber-700',
          },
          { key: 'IN_ASTEPTARE_PIESE', label: 'Așteaptă Piese', count: stats.asteaptaPiese, accent: 'border-l-periwinkle-500', text: 'text-periwinkle-700' },
          { key: 'REZOLVAT', label: 'Rezolvate', count: stats.rezolvate, accent: 'border-l-emerald-500', text: 'text-emerald-700' },
        ].map((kpi) => {
          const isActive = statusFilter === kpi.key;
          return (
            <button
              key={kpi.key}
              type="button"
              onClick={() => setStatusFilter(kpi.key)}
              className={`pleasant-card p-3.5 rounded-2xl border-l-4 ${kpi.accent} text-left transition cursor-pointer hover:shadow-md ${
                isActive ? 'ring-2 ring-sapphire-400/70' : ''
              }`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-sage-600 truncate">{kpi.label}</p>
              <p className={`text-2xl font-black font-mono mt-0.5 ${kpi.text}`}>{kpi.count}</p>
              {kpi.sub && <p className="text-[10px] font-bold text-sage-500 mt-0.5">{kpi.sub}</p>}
            </button>
          );
        })}
      </div>

      {/* SMART QUICK-CAPTURE BAR */}
      <form
        onSubmit={handleQuickCreate}
        className="pleasant-card rounded-2xl p-3.5 bg-white border border-morning-200 shadow-xs space-y-2.5 print:hidden"
      >
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="flex-1 relative">
            <Sparkles className="w-4 h-4 text-sapphire-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Notare rapidă (ex: CV 04 USK pierde aer supapă frână — comandat garnitură + 2 șuruburi)..."
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-sapphire-900 placeholder:text-sage-500 focus:bg-white focus:border-sapphire-500 focus:outline-none transition"
            />
          </div>

          <select
            value={quickVehiculId}
            onChange={(e) => setQuickVehiculId(e.target.value)}
            className="md:w-52 bg-morning-100 border border-morning-200 rounded-xl px-2.5 py-2 text-xs font-bold text-sapphire-900 cursor-pointer"
          >
            <option value="">General Atelier (Fără vehicul)</option>
            {vehiculeSortate.map((v) => (
              <option key={v.id} value={v.id}>
                {v.numarIntern} {v.numarInmatriculare && v.numarInmatriculare !== v.numarIntern ? `(${v.numarInmatriculare})` : ''}
              </option>
            ))}
          </select>

          <select
            value={quickCategorie}
            onChange={(e) => setQuickCategorie(e.target.value as NotaCategorie)}
            className="md:w-40 bg-morning-100 border border-morning-200 rounded-xl px-2.5 py-2 text-xs font-bold text-sapphire-900 cursor-pointer"
          >
            {Object.entries(CATEGORY_META).map(([cod, cfg]) => (
              <option key={cod} value={cod}>
                {cfg.label}
              </option>
            ))}
          </select>

          <select
            value={quickPrioritate}
            onChange={(e) => setQuickPrioritate(e.target.value as NotaPrioritate)}
            className="md:w-28 bg-morning-100 border border-morning-200 rounded-xl px-2.5 py-2 text-xs font-bold text-sapphire-900 cursor-pointer"
          >
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
            <option value="CRITIC">Critic</option>
            <option value="SCAZUT">Scăzut</option>
          </select>

          <input
            type="date"
            value={quickTermen}
            onChange={(e) => setQuickTermen(e.target.value)}
            title="Termen limită opțional (până când)"
            className="md:w-36 bg-morning-100 border border-morning-200 rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-sapphire-900"
          />

          <button
            type="submit"
            disabled={savingQuick || !quickTitle.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white font-extrabold text-xs shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{savingQuick ? 'Salvare...' : 'Notează'}</span>
          </button>
        </div>

        {/* Auto-detected vehicle pill or quick deadline shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            {detectedQuickVehicul && (
              <button
                type="button"
                onClick={() => setQuickVehiculId(detectedQuickVehicul.id)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold transition cursor-pointer"
              >
                <Truck className="w-3 h-3" />
                <span>
                  Detectat vehicul: <b>{detectedQuickVehicul.numarIntern}</b> — Clic pentru asociere
                </span>
              </button>
            )}
            <span className="text-sage-500 font-semibold">Termen rapid:</span>
            {[
              { label: 'Astăzi', val: addDaysIsoDate(0) },
              { label: 'Mâine', val: addDaysIsoDate(1) },
              { label: '+3 Zile', val: addDaysIsoDate(3) },
              { label: '+7 Zile', val: addDaysIsoDate(7) },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setQuickTermen(quickTermen === p.val ? '' : p.val)}
                className={`px-2 py-0.5 rounded-md font-bold border transition cursor-pointer ${
                  quickTermen === p.val
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-morning-100 hover:bg-morning-200 text-slate-700 border-morning-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="text-sapphire-600 hover:underline font-bold flex items-center space-x-1 cursor-pointer"
          >
            <span>+ Adaugă cu listă piese &amp; detalii</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </form>

      {/* CENTRALIZATOR PIESE DE COMANDAT (DRAWER COLAPSABIL) */}
      {showProcurementPanel && (
        <div className="pleasant-card rounded-2xl p-4 bg-white border border-periwinkle-300 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-periwinkle-600" />
              <h2 className="text-sm font-black text-sapphire-900">
                Centralizator Piese de Comandat ({stats.pieseDeComandat.length} repere active)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowProcurementPanel(false)}
              className="text-sage-500 hover:text-sapphire-900 text-xs font-bold print:hidden"
            >
              Ascunde
            </button>
          </div>

          {stats.pieseDeComandat.length === 0 ? (
            <p className="text-xs text-sage-600 font-medium py-2">
              Nu există piese necomandate în listele notelor active. Adăugați articole în lista de verificare a unei note de tip „Piese de Comandat”.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {stats.pieseDeComandat.map(({ nota, item, stocMatch }) => (
                <div
                  key={`${nota.id}-${item.id}`}
                  className="p-2.5 rounded-xl bg-morning-50 border border-morning-200 flex items-center justify-between gap-2 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleChecklistRow(nota, item.id)}
                    className="flex items-center space-x-2 text-left min-w-0 cursor-pointer"
                  >
                    <span className="w-4 h-4 rounded border border-morning-300 bg-white flex items-center justify-center shrink-0 hover:border-emerald-500" />
                    <div className="min-w-0">
                      <p className="font-bold text-sapphire-900 truncate">
                        {item.cantitate ? `${item.cantitate}x ` : ''}{item.text}
                      </p>
                      <p className="text-[10px] text-sage-600 truncate">
                        {nota.vehicul ? `${nota.vehicul.numarIntern} (${nota.vehicul.numarInmatriculare})` : 'General Atelier'} • {nota.titlu}
                      </p>
                    </div>
                  </button>
                  {stocMatch && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black shrink-0">
                      Stoc: {stocMatch.stocCurent}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="pleasant-card rounded-2xl p-4 bg-white border border-morning-200 space-y-3 shadow-xs print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center">
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută problemă, piesă, vehicul, mecanic, CL-..."
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-7 py-2 text-xs font-bold text-sapphire-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-sage-400 hover:text-sapphire-900 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={vehiculFilter}
            onChange={(e) => setVehiculFilter(e.target.value)}
            className="bg-morning-100 border border-morning-200 rounded-xl p-2 text-xs font-bold text-sapphire-900 cursor-pointer"
          >
            <option value="">Toate Vehiculele</option>
            <option value="FARA_VEHICUL">Doar General Atelier (Fără vehicul)</option>
            {vehiculeSortate.map((v) => (
              <option key={v.id} value={v.id}>
                {v.numarIntern} {v.numarInmatriculare && v.numarInmatriculare !== v.numarIntern ? `(${v.numarInmatriculare})` : ''}
              </option>
            ))}
          </select>

          <select
            value={mecanicFilter}
            onChange={(e) => setMecanicFilter(e.target.value)}
            className="bg-morning-100 border border-morning-200 rounded-xl p-2 text-xs font-bold text-sapphire-900 cursor-pointer"
          >
            <option value="">Toți Mecanicii</option>
            {mecanici.map((m) => (
              <option key={m.id} value={m.nume}>
                {m.nume}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-morning-100 border border-morning-200 rounded-xl p-2 text-xs font-bold text-sapphire-900 cursor-pointer"
          >
            <option value="prioritate">Sortare: Fixate &amp; Prioritate</option>
            <option value="termen">Sortare: Termen Limită</option>
            <option value="nou">Sortare: Cele mai noi</option>
            <option value="actualizat">Sortare: Modificate recent</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-morning-200">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategorieFilter('TOATE')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                categorieFilter === 'TOATE'
                  ? 'bg-sapphire-500 text-white border-sapphire-500'
                  : 'bg-morning-100 text-slate-700 border-morning-200 hover:bg-morning-200'
              }`}
            >
              Toate Categoriile
            </button>
            {Object.entries(CATEGORY_META).map(([cod, cfg]) => (
              <button
                key={cod}
                type="button"
                onClick={() => setCategorieFilter(categorieFilter === cod ? 'TOATE' : cod)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                  categorieFilter === cod
                    ? `${cfg.badge} ring-2 ring-offset-1 ring-current`
                    : 'bg-white text-slate-600 border-morning-200 hover:bg-morning-100'
                }`}
              >
                {cfg.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'TOATE' ? 'ACTIVE' : 'TOATE')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ml-1 ${
                statusFilter === 'TOATE'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-600 border-morning-200 hover:bg-morning-100'
              }`}
            >
              {statusFilter === 'TOATE' ? 'Toate (incl. Rezolvate)' : 'Arată și Rezolvate'}
            </button>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-bold text-sage-600">
            <span>Afișare: {filteredNotes.length} note</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-terracotta-600 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resetează</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT: LIST VIEW vs KANBAN VIEW */}
      {loading ? (
        <div className="pleasant-card rounded-2xl p-12 text-center text-sage-500 font-bold text-xs animate-pulse">
          Se încarcă jurnalul atelierului...
        </div>
      ) : viewMode === 'list' ? (
        filteredNotes.length === 0 ? (
          <div className="pleasant-card rounded-2xl p-12 text-center space-y-3 border border-morning-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="font-extrabold text-sapphire-900 text-sm">Nicio notă pentru filtrele selectate</h3>
            <p className="text-xs text-sage-600 max-w-md mx-auto">
              Folosiți bara rapidă de mai sus pentru a nota o problemă, o piesă de comandat sau o reparație cu termen limită.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {filteredNotes.map((n) => renderNoteCard(n, false))}
          </div>
        )
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-start">
          {STATUS_LIST.map((colStatus) => {
            const cfg = STATUS_META[colStatus];
            const colNotes = notes.filter((n) => {
              if (n.status !== colStatus) return false;
              if (categorieFilter !== 'TOATE' && n.categorie !== categorieFilter) return false;
              if (vehiculFilter === 'FARA_VEHICUL' && n.vehiculId) return false;
              if (vehiculFilter && vehiculFilter !== 'FARA_VEHICUL' && n.vehiculId !== vehiculFilter) return false;
              if (mecanicFilter && n.mecanicAsignat !== mecanicFilter) return false;
              if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const hay = [n.titlu, n.descriere, n.checklistJson, n.vehicul?.numarIntern, n.vehicul?.numarInmatriculare]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase();
                if (!hay.includes(q)) return false;
              }
              return true;
            });

            return (
              <div
                key={colStatus}
                className="pleasant-card rounded-2xl p-3 bg-morning-50 border border-morning-200 space-y-3 min-h-[260px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-morning-200">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span className="font-black text-xs text-sapphire-900">{cfg.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-morning-200 text-sage-700 font-mono text-[10px] font-black">
                      {colNotes.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreateModal(colStatus)}
                    className="p-1 rounded-lg hover:bg-morning-200 text-sapphire-700 transition cursor-pointer"
                    title={`Adaugă notă direct în "${cfg.label}"`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {colNotes.length === 0 ? (
                    <p className="text-[11px] text-sage-500 text-center py-6 font-medium">Nicio notă</p>
                  ) : (
                    colNotes.map((n) => renderNoteCard(n, true))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREARE / EDITARE COMPLETĂ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                <ClipboardList className="w-5 h-5 text-sapphire-500" />
                <span>{editingNota ? 'Editare Notă Atelier' : 'Notă Nouă Atelier / Comandă'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingNota(null);
                }}
                className="text-sage-400 hover:text-sapphire-900 p-1 rounded-lg hover:bg-morning-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3.5 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Titlu / Rezumat Problemă sau Comandă: *</label>
                <input
                  required
                  value={formTitlu}
                  onChange={(e) => setFormTitlu(e.target.value)}
                  placeholder="ex: Înlocuire pernă aer puntea spate + comandat 2 amortizoare"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie:</label>
                  <select
                    value={formCategorie}
                    onChange={(e) => setFormCategorie(e.target.value as NotaCategorie)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {Object.entries(CATEGORY_META).map(([cod, cfg]) => (
                      <option key={cod} value={cod}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as NotaStatus)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {STATUS_META[st].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Prioritate:</label>
                  <select
                    value={formPrioritate}
                    onChange={(e) => setFormPrioritate(e.target.value as NotaPrioritate)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                    <option value="CRITIC">Critic (Imobilizat)</option>
                    <option value="SCAZUT">Scăzut</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Vehicul Asociat (Opțional):</label>
                  <select
                    value={formVehiculId}
                    onChange={(e) => setFormVehiculId(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">General Atelier (Fără vehicul)</option>
                    {vehiculeSortate.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.numarIntern} {v.numarInmatriculare && v.numarInmatriculare !== v.numarIntern ? `(${v.numarInmatriculare})` : ''} — {v.categorieEnum}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Mecanic Responsabil:</label>
                  <select
                    value={formMecanic}
                    onChange={(e) => setFormMecanic(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">Neatribuit</option>
                    {mecanici.map((m) => (
                      <option key={m.id} value={m.nume}>
                        {m.nume}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Termen Limită (Până la):</label>
                  <input
                    type="date"
                    value={formTermen}
                    onChange={(e) => setFormTermen(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Detalii / Constatare / Observații:</label>
                <textarea
                  rows={3}
                  value={formDescriere}
                  onChange={(e) => setFormDescriere(e.target.value)}
                  placeholder="Descrie manifestarea problemei, coduri OEM, furnizor sugerat sau instrucțiuni pentru mecanic..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              {/* Checklist / Lista piese de comandat */}
              <div className="p-3.5 rounded-2xl bg-morning-50 border border-morning-200 space-y-2.5">
                <p className="font-extrabold text-sapphire-900 text-xs">
                  Listă Piese de Comandat / Pași de Verificare ({formChecklist.length})
                </p>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCheckItemQty}
                    onChange={(e) => setNewCheckItemQty(e.target.value)}
                    placeholder="Cant."
                    className="w-16 bg-white border border-morning-300 rounded-xl p-2 text-xs font-mono font-bold text-sapphire-900 text-center"
                  />
                  <input
                    type="text"
                    value={newCheckItemText}
                    onChange={(e) => setNewCheckItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="ex: Supapă Wabco 9753034730 sau Verificat joc pivot dreapta..."
                    className="flex-1 bg-white border border-morning-300 rounded-xl p-2 text-xs font-bold text-sapphire-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs cursor-pointer"
                  >
                    + Adaugă
                  </button>
                </div>

                {formChecklist.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {formChecklist.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-morning-200 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setFormChecklist((prev) =>
                              prev.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)),
                            )
                          }
                          className="flex items-center space-x-2 text-left min-w-0 cursor-pointer"
                        >
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              it.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-morning-300'
                            }`}
                          >
                            {it.done && <Check className="w-3 h-3" />}
                          </span>
                          <span className={`truncate ${it.done ? 'line-through text-sage-500' : 'text-sapphire-900 font-bold'}`}>
                            {it.cantitate ? `${it.cantitate}x ` : ''}{it.text}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormChecklist((prev) => prev.filter((x) => x.id !== it.id))}
                          className="text-sage-400 hover:text-terracotta-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center space-x-2 text-xs font-bold text-sapphire-900 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formPinuit}
                  onChange={(e) => setFormPinuit(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 border-morning-300"
                />
                <span>Fixează această notă în vârful listei (Important)</span>
              </label>

              <div className="flex items-center justify-between pt-3 border-t border-morning-200">
                {editingNota ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteNota(editingNota)}
                    className="px-3.5 py-2 rounded-xl bg-roseash-100 hover:bg-roseash-200 text-terracotta-700 font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Șterge</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingNota(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                  >
                    {editingNota ? 'Salvează Modificările' : 'Salvează Nota'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComenziAtelierPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Se încarcă Jurnalul Atelierului...</div>}>
      <ComenziAtelierContent />
    </Suspense>
  );
}
