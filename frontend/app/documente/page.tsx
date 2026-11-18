"use client";

import { API_BASE_URL } from '@/lib/api';
import { getCategoryColor } from '@/lib/categoryColors';
import { showConfirm, showError, showSuccess, showToast } from '@/lib/swal';
import { useAuth } from '@/lib/AuthContext';
import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileCheck, FileText, AlertTriangle, CheckCircle2, Clock, X,
  Search, RotateCcw, Plus, Download, Eye, Upload, Trash2, Edit3,
  RefreshCw, Paperclip, Check, ArrowUp, ArrowDown, ArrowUpDown,
  Image as ImageIcon, LayoutGrid, LayoutList, Layers, Zap, ExternalLink,
  UploadCloud
} from 'lucide-react';

interface DocTypeItem {
  cod: string;
  label: string;
  zileAvertizare?: number;
  esteStandard?: boolean;
  culoare?: string;
  descriere?: string;
  categorii?: string[];
}

type DocViewMode = 'matrice' | 'lista' | 'tipuri';
type StatusFilter = 'TOATE' | 'EXPIRATE' | 'AVERTIZARE' | 'OPTIM' | 'LIPSA';
type ListSortField = 'vehicul' | 'tip' | 'serie' | 'expirare' | 'zile' | 'act';

const VIEW_STORAGE_KEY = 'fleetcmd_documente_view_mode';

const OFF_ROAD_CATEGORIES = new Set([
  'EXCAVATOR',
  'INCARCATOR_FRONTAL',
  'BULLDOZER',
  'AUTOVALT',
  'UTILAJ_SPECIAL',
  'STATIE_MARE',
  'BAZINE_COMBUSTIBIL',
  'BAZINE_APA',
  'PARC_FOTOVOLTAIC',
  'ATELIER_1',
  'ATELIER_2',
]);
const TRUCK_CATEGORIES = new Set(['CAP_TRACTOR', 'CAMION_8X4', 'BASCULANTA']);
const LIGHT_ROAD_CATEGORIES = new Set(['AUTOTURISM', 'AUTOUTILITARA']);

const isTipApplicableToCategory = (tip: { categorii?: string[] }, categorieEnum?: string | null): boolean => {
  if (!Array.isArray(tip.categorii)) return true;
  if (tip.categorii.includes('TOATE')) return true;
  const vCat = String(categorieEnum || '').trim().toUpperCase();
  if (!vCat) return false;
  return tip.categorii.some((c) => String(c || '').trim().toUpperCase() === vCat);
};

const DEFAULT_DOC_TYPES: DocTypeItem[] = [
  { cod: 'ITP', label: 'Inspecție Tehnică Periodică (ITP)', zileAvertizare: 30, esteStandard: true, culoare: 'blue', categorii: ['TOATE'] },
  { cod: 'RCA', label: 'Asigurare Obligatorie (RCA)', zileAvertizare: 30, esteStandard: true, culoare: 'emerald', categorii: ['TOATE'] },
  { cod: 'ROVINIETA', label: 'Rovinietă (Taxă Drum)', zileAvertizare: 30, esteStandard: true, culoare: 'amber', categorii: ['CAP_TRACTOR', 'CAMION_8X4', 'BASCULANTA', 'AUTOUTILITARA', 'AUTOTURISM'] },
  { cod: 'COPIE_CONFORMA', label: 'Copie Conformă Transport', zileAvertizare: 30, esteStandard: true, culoare: 'purple', categorii: ['CAP_TRACTOR', 'CAMION_8X4', 'BASCULANTA', 'AUTOUTILITARA'] },
  { cod: 'VERIFICARE_TAHOGRAF', label: 'Verificare Tahograf', zileAvertizare: 30, esteStandard: true, culoare: 'cyan', categorii: ['CAP_TRACTOR', 'CAMION_8X4', 'BASCULANTA'] },
  { cod: 'CASCO', label: 'Asigurare Facultativă (CASCO)', zileAvertizare: 30, esteStandard: true, culoare: 'indigo', categorii: ['TOATE'] },
];

const DOC_BADGE_STYLES: Record<string, { shortLabel: string; bg: string; text: string; border: string }> = {
  TOATE:                { shortLabel: 'Toate Actele',   bg: 'bg-slate-100',    text: 'text-slate-700',    border: 'border-slate-300' },
  ITP:                  { shortLabel: 'I.T.P.',         bg: 'bg-blue-100',     text: 'text-blue-800',     border: 'border-blue-300' },
  RCA:                  { shortLabel: 'Asigurare RCA',  bg: 'bg-emerald-100',  text: 'text-emerald-800',  border: 'border-emerald-300' },
  ROVINIETA:            { shortLabel: 'Rovinietă',      bg: 'bg-amber-100',    text: 'text-amber-800',    border: 'border-amber-300' },
  COPIE_CONFORMA:       { shortLabel: 'Copie Conformă', bg: 'bg-purple-100',   text: 'text-purple-800',   border: 'border-purple-300' },
  VERIFICARE_TAHOGRAF:  { shortLabel: 'Tahograf',       bg: 'bg-cyan-100',     text: 'text-cyan-800',     border: 'border-cyan-300' },
  CASCO:                { shortLabel: 'Poliță CASCO',   bg: 'bg-indigo-100',   text: 'text-indigo-800',   border: 'border-indigo-300' },
  ALTELE:               { shortLabel: 'Alte Documente', bg: 'bg-morning-200',  text: 'text-sapphire-800', border: 'border-morning-300' },
};

const getTipBadgeConfig = (cod: string, fallbackLabel?: string) => {
  const known = DOC_BADGE_STYLES[cod];
  if (known) return known;
  return {
    shortLabel: fallbackLabel || cod.replace(/_/g, ' '),
    bg: 'bg-periwinkle-100',
    text: 'text-periwinkle-800',
    border: 'border-periwinkle-300',
  };
};

const naturalCompare = (a?: string | null, b?: string | null) =>
  String(a || '').localeCompare(String(b || ''), 'ro', { numeric: true, sensitivity: 'base' });

const getDocStatusMeta = (doc: any, nowMs: number) => {
  const rawDiff =
    typeof doc?.zileRamase === 'number'
      ? doc.zileRamase
      : doc?.dataExpirare
      ? Math.ceil((new Date(doc.dataExpirare).getTime() - nowMs) / (1000 * 60 * 60 * 24))
      : 0;
  const prag = Number(doc?.zileAvertizareInainte ?? 30);
  const isExpired = Boolean(doc?.esteExpirat) || rawDiff < 0;
  const isUrgent = !isExpired && (doc?.statusCalculat === 'CRITIC' || rawDiff <= 7);
  const isWarning = !isExpired && (Boolean(doc?.esteInAvertizare) || rawDiff <= prag);
  const status: 'EXPIRAT' | 'AVERTIZARE' | 'VALID' = isExpired
    ? 'EXPIRAT'
    : isWarning
    ? 'AVERTIZARE'
    : 'VALID';

  return {
    diffDays: rawDiff,
    isExpired,
    isUrgent,
    isWarning,
    isValid: status === 'VALID',
    status,
  };
};

function DocumenteFlotaContent() {
  const { authFetch } = useAuth();
  const safeFetch = authFetch || fetch;
  const searchParams = useSearchParams();

  // View Switcher (persistat în localStorage + opțional query ?view=)
  const [viewMode, setViewMode] = useState<DocViewMode>('matrice');
  useEffect(() => {
    const viewParam = searchParams?.get('view');
    if (viewParam === 'matrice' || viewParam === 'lista' || viewParam === 'tipuri') {
      setViewMode(viewParam);
      return;
    }
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === 'matrice' || saved === 'lista' || saved === 'tipuri') {
        setViewMode(saved);
      }
    } catch {
      // ignore storage access issues
    }
  }, [searchParams]);

  const handleChangeViewMode = (mode: DocViewMode) => {
    setViewMode(mode);
    if (mode !== 'tipuri') {
      try {
        localStorage.setItem(VIEW_STORAGE_KEY, mode);
      } catch {
        // ignore
      }
    }
  };

  // Data States
  const [documente, setDocumente] = useState<any[]>([]);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [categoriiVehicul, setCategoriiVehicul] = useState<any[]>([]);
  const [tipuriDocumente, setTipuriDocumente] = useState<DocTypeItem[]>(DEFAULT_DOC_TYPES);
  const [loading, setLoading] = useState(true);
  const [initializareRapidaLoading, setInitializareRapidaLoading] = useState(false);

  // Unified Filters
  const [selectedTip, setSelectedTip] = useState('TOATE');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('TOATE');
  const [filterCategorie, setFilterCategorie] = useState('TOATE');
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [ascundeFaraActe, setAscundeFaraActe] = useState(true);

  // List Sort State
  const [listSortField, setListSortField] = useState<ListSortField>('zile');
  const [listSortOrder, setListSortOrder] = useState<'asc' | 'desc'>('asc');

  // Matrix Sort State
  const [matrixSortCol, setMatrixSortCol] = useState<string>('vehicul');
  const [matrixVehSortMode, setMatrixVehSortMode] = useState<'abc' | 'categorie'>('abc');
  const [matrixSortDir, setMatrixSortDir] = useState<'asc' | 'desc'>('asc');

  // Modal Add/Edit Document
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [canChangeVehicul, setCanChangeVehicul] = useState(false);
  const [formVehiculId, setFormVehiculId] = useState('');
  const [formTip, setFormTip] = useState('ITP');
  const [formTipCustom, setFormTipCustom] = useState('');
  const [formSerie, setFormSerie] = useState('');
  const [formEmitent, setFormEmitent] = useState('');
  const [formDataEmitere, setFormDataEmitere] = useState('');
  const [formDataExpirare, setFormDataExpirare] = useState('');
  const [formZileAvertizare, setFormZileAvertizare] = useState(30);
  const [formCost, setFormCost] = useState<number | ''>('');
  const [formObservatii, setFormObservatii] = useState('');
  const [formFisierUrl, setFormFisierUrl] = useState('');
  const [formFisierNume, setFormFisierNume] = useState('');
  const [formFisierMarime, setFormFisierMarime] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Add / Edit Document Type & Categories
  const [showTipModal, setShowTipModal] = useState(false);
  const [editingTipCod, setEditingTipCod] = useState<string | null>(null);
  const [tipFormCod, setTipFormCod] = useState('');
  const [tipFormLabel, setTipFormLabel] = useState('');
  const [tipFormZile, setTipFormZile] = useState(30);
  const [tipFormDescriere, setTipFormDescriere] = useState('');
  const [tipFormCategorii, setTipFormCategorii] = useState<string[]>(['TOATE']);

  // Modal Preview Scanned File (disponibil în ambele vizualizări)
  const [previewFisier, setPreviewFisier] = useState<{
    docId?: string;
    url: string;
    nume: string;
    vehiculNumar?: string;
    tipDocument?: string;
  } | null>(null);
  const [isDeletingFisier, setIsDeletingFisier] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resDocs, resVeh, resCatVeh, resTipuri] = await Promise.all([
        safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule`),
        safeFetch(`${API_BASE_URL}/vehicule`),
        safeFetch(`${API_BASE_URL}/vehicule/categorii`).catch(() => null),
        safeFetch(`${API_BASE_URL}/anomalii/tipuri-documente`).catch(() => null),
      ]);

      if (resDocs.ok) {
        const docs = await resDocs.json();
        setDocumente(Array.isArray(docs) ? docs : []);
      }

      if (resVeh.ok) {
        const vData = await resVeh.json();
        const vArr = Array.isArray(vData) ? vData : vData?.data || vData?.items || [];
        setVehicule(Array.isArray(vArr) ? vArr : []);
      }

      if (resCatVeh && resCatVeh.ok) {
        const cData = await resCatVeh.json();
        const merged = [
          ...(Array.isArray(cData.categoriiEnum) ? cData.categoriiEnum : []),
          ...(Array.isArray(cData.categoriiPersonalizate) ? cData.categoriiPersonalizate : []),
        ];
        setCategoriiVehicul(merged);
      }

      if (resTipuri && resTipuri.ok) {
        const tipList = await resTipuri.json();
        if (Array.isArray(tipList) && tipList.length > 0) {
          setTipuriDocumente(tipList);
        }
      }
    } catch (e) {
      console.error('Eroare la încărcarea documentelor:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // KPI unify status rules
  const nowMs = Date.now();
  const docKPIs = useMemo(() => {
    let expirate = 0;
    let avertizare = 0;
    let valide = 0;
    let cuFisier = 0;
    documente.forEach((d) => {
      const meta = getDocStatusMeta(d, nowMs);
      if (meta.isExpired) expirate++;
      else if (meta.isWarning) avertizare++;
      else valide++;
      if (d.fisierUrl) cuFisier++;
    });
    return { total: documente.length, expirate, avertizare, valide, cuFisier };
  }, [documente]);

  // Sorted vehicle options for dropdown
  const vehiculeSortate = useMemo(
    () =>
      [...vehicule].sort((a, b) =>
        naturalCompare(a.numarIntern || a.numarInmatriculare, b.numarIntern || b.numarInmatriculare),
      ),
    [vehicule],
  );

  // Complete list of fleet vehicle categories (backend config + existing vehicles) with counts
  const allCategoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    categoriiVehicul.forEach((c: any) => {
      const code = String(c?.cod || c?.nume || c || '').trim().toUpperCase();
      if (code && !counts.has(code)) counts.set(code, 0);
    });
    vehicule.forEach((v) => {
      const code = String(v?.categorieEnum || '').trim().toUpperCase();
      if (code) counts.set(code, (counts.get(code) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([cod, count]) => ({ cod, count }))
      .sort((a, b) => naturalCompare(a.cod, b.cod));
  }, [categoriiVehicul, vehicule]);

  // Known doc type codes
  const standardAndConfiguredCodes = useMemo(
    () => new Set(tipuriDocumente.map((t) => t.cod)),
    [tipuriDocumente],
  );

  // Columns shown in Matrix view (respects Tip Document AND Category applicability)
  const displayedMatrixTipuri = useMemo(() => {
    let base: DocTypeItem[];
    if (selectedTip === 'ALTELE') {
      const customCodes = Array.from(
        new Set(
          documente
            .map((d) => d.tipDocument)
            .filter((cod) => cod && !standardAndConfiguredCodes.has(cod)),
        ),
      );
      base = customCodes.map((cod) => ({ cod, label: cod.replace(/_/g, ' '), categorii: ['TOATE'] }));
    } else if (selectedTip !== 'TOATE') {
      base = tipuriDocumente.filter((t) => t.cod === selectedTip);
    } else {
      base = tipuriDocumente;
    }

    if (selectedTip !== 'TOATE') return base;

    if (filterCategorie !== 'TOATE') {
      const docsInCat = new Set(
        documente
          .filter((d) => {
            const vCat = d.vehicul?.categorieEnum || vehicule.find((v) => v.id === d.vehiculId)?.categorieEnum;
            return vCat === filterCategorie;
          })
          .map((d) => d.tipDocument),
      );
      return base.filter((t) => isTipApplicableToCategory(t, filterCategorie) || docsInCat.has(t.cod));
    }

    return base.filter(
      (t) =>
        isTipApplicableToCategory(t, undefined) ||
        (Array.isArray(t.categorii) && t.categorii.length > 0) ||
        documente.some((d) => d.tipDocument === t.cod),
    );
  }, [tipuriDocumente, selectedTip, filterCategorie, documente, vehicule, standardAndConfiguredCodes]);

  // Matrix rows: ALL matching vehicles rendered without pagination
  const vehiculeMatrice = useMemo(() => {
    const docMap = new Map<string, Record<string, any>>();
    documente.forEach((d) => {
      if (!docMap.has(d.vehiculId)) {
        docMap.set(d.vehiculId, {});
      }
      const bucket = docMap.get(d.vehiculId)!;
      const existing = bucket[d.tipDocument];
      // Keep the record with the latest expiry date when duplicates exist
      if (!existing || new Date(d.dataExpirare).getTime() >= new Date(existing.dataExpirare).getTime()) {
        bucket[d.tipDocument] = d;
      }
    });

    const filtered = vehicule
      .map((v) => {
        const vDocs = docMap.get(v.id) || {};
        const docsList = Object.values(vDocs);
        let hasExpired = false;
        let hasWarning = false;
        let hasMissing = false;

        displayedMatrixTipuri.forEach((t) => {
          const doc = vDocs[t.cod];
          if (!doc) {
            if (isTipApplicableToCategory(t, v.categorieEnum)) {
              hasMissing = true;
            }
          } else {
            const meta = getDocStatusMeta(doc, nowMs);
            if (meta.isExpired) hasExpired = true;
            else if (meta.isWarning) hasWarning = true;
          }
        });

        return {
          ...v,
          docs: vDocs,
          totalDocs: docsList.length,
          hasExpired,
          hasWarning,
          hasMissing,
        };
      })
      .filter((v) => {
        if (selectedVehiculId && v.id !== selectedVehiculId) return false;
        if (filterCategorie !== 'TOATE' && v.categorieEnum !== filterCategorie) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const haystack = [v.numarIntern, v.numarInmatriculare, v.marca, v.model, v.categorieEnum]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (selectedStatus === 'EXPIRATE' && !v.hasExpired) return false;
        if (selectedStatus === 'AVERTIZARE' && !v.hasWarning) return false;
        if (selectedStatus === 'LIPSA' && !v.hasMissing) return false;
        if (selectedStatus === 'OPTIM' && (v.hasExpired || v.hasWarning || v.totalDocs === 0)) return false;
        if (ascundeFaraActe && v.totalDocs === 0) return false;
        return true;
      });

    return [...filtered].sort((a, b) => {
      if (matrixSortCol === 'vehicul') {
        if (matrixVehSortMode === 'categorie') {
          const catCmp = naturalCompare(a.categorieEnum, b.categorieEnum);
          if (catCmp !== 0) return catCmp;
        }
        return naturalCompare(a.numarIntern || a.numarInmatriculare, b.numarIntern || b.numarInmatriculare);
      }

      const docA = a.docs[matrixSortCol];
      const docB = b.docs[matrixSortCol];
      if (!docA && !docB) {
        return naturalCompare(a.numarIntern || a.numarInmatriculare, b.numarIntern || b.numarInmatriculare);
      }
      if (!docA) return 1;
      if (!docB) return -1;

      const timeA = new Date(docA.dataExpirare).getTime();
      const timeB = new Date(docB.dataExpirare).getTime();
      if (timeA !== timeB) {
        return matrixSortDir === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return naturalCompare(a.numarIntern || a.numarInmatriculare, b.numarIntern || b.numarInmatriculare);
    });
  }, [
    vehicule,
    documente,
    displayedMatrixTipuri,
    selectedVehiculId,
    filterCategorie,
    searchQuery,
    selectedStatus,
    ascundeFaraActe,
    matrixSortCol,
    matrixVehSortMode,
    matrixSortDir,
  ]);

  // List rows: ALL matching documents rendered without pagination
  const documenteFiltrate = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return documente.filter((d) => {
      if (selectedTip === 'ALTELE') {
        if (standardAndConfiguredCodes.has(d.tipDocument)) return false;
      } else if (selectedTip !== 'TOATE' && d.tipDocument !== selectedTip) {
        return false;
      }

      if (selectedVehiculId && d.vehiculId !== selectedVehiculId) return false;

      if (filterCategorie !== 'TOATE') {
        const vCat = d.vehicul?.categorieEnum || vehicule.find((v) => v.id === d.vehiculId)?.categorieEnum;
        if (vCat !== filterCategorie) return false;
      }

      if (selectedStatus !== 'TOATE' && selectedStatus !== 'LIPSA') {
        const meta = getDocStatusMeta(d, nowMs);
        if (selectedStatus === 'EXPIRATE' && !meta.isExpired) return false;
        if (selectedStatus === 'AVERTIZARE' && !meta.isWarning) return false;
        if (selectedStatus === 'OPTIM' && !meta.isValid) return false;
      }

      if (q) {
        const haystack = [
          d.vehicul?.numarIntern,
          d.vehicul?.numarInmatriculare,
          d.vehicul?.marca,
          d.vehicul?.model,
          d.tipDocument,
          d.serieDocument,
          d.emitent,
          d.observatii,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    documente,
    vehicule,
    standardAndConfiguredCodes,
    selectedTip,
    selectedVehiculId,
    filterCategorie,
    selectedStatus,
    searchQuery,
  ]);

  const documenteSortate = useMemo(() => {
    return [...documenteFiltrate].sort((a, b) => {
      let comparison = 0;
      if (listSortField === 'vehicul') {
        comparison = naturalCompare(
          a.vehicul?.numarInmatriculare || a.vehicul?.numarIntern,
          b.vehicul?.numarInmatriculare || b.vehicul?.numarIntern,
        );
      } else if (listSortField === 'tip') {
        comparison = naturalCompare(a.tipDocument, b.tipDocument);
      } else if (listSortField === 'serie') {
        comparison = naturalCompare(a.serieDocument || a.emitent, b.serieDocument || b.emitent);
      } else if (listSortField === 'expirare') {
        comparison = new Date(a.dataExpirare).getTime() - new Date(b.dataExpirare).getTime();
      } else if (listSortField === 'zile') {
        const mA = getDocStatusMeta(a, nowMs).diffDays;
        const mB = getDocStatusMeta(b, nowMs).diffDays;
        comparison = mA - mB;
      } else if (listSortField === 'act') {
        comparison = (b.fisierUrl ? 1 : 0) - (a.fisierUrl ? 1 : 0);
      }
      return listSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [documenteFiltrate, listSortField, listSortOrder]);

  // Handlers
  const handleListSort = (field: ListSortField) => {
    if (listSortField === field) {
      setListSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setListSortField(field);
      setListSortOrder('asc');
    }
  };

  const renderListSortIcon = (field: ListSortField) => {
    if (listSortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 opacity-40 group-hover:opacity-100 transition shrink-0" />;
    }
    return listSortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-sapphire-600 shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sapphire-600 shrink-0" />
    );
  };

  const handleOpenAddModal = (vehiculIdParam?: string, tipParam?: string) => {
    const targetVehId = vehiculIdParam || selectedVehiculId || vehiculeSortate[0]?.id || '';
    const targetVeh = vehicule.find((v) => v.id === targetVehId);
    const firstApplicableTip = targetVeh
      ? tipuriDocumente.find((t) => isTipApplicableToCategory(t, targetVeh.categorieEnum))?.cod
      : undefined;
    const initialTip =
      tipParam ||
      (selectedTip !== 'TOATE' && selectedTip !== 'ALTELE' ? selectedTip : firstApplicableTip || 'ITP');
    const tipObj = tipuriDocumente.find((t) => t.cod === initialTip);

    setEditingDoc(null);
    setCanChangeVehicul(true);
    setFormVehiculId(targetVehId);
    setFormTip(initialTip);
    setFormTipCustom('');
    setFormSerie('');
    setFormEmitent('');
    setFormDataEmitere('');
    setFormDataExpirare('');
    setFormZileAvertizare(tipObj?.zileAvertizare || 30);
    setFormCost('');
    setFormObservatii('');
    setFormFisierUrl('');
    setFormFisierNume('');
    setFormFisierMarime(null);
    setShowDocModal(true);
  };

  const handleOpenEditModal = (doc: any) => {
    setEditingDoc(doc);
    setCanChangeVehicul(false);
    setFormVehiculId(doc.vehiculId || doc.vehicul?.id || '');
    const isConfigured = tipuriDocumente.some((t) => t.cod === doc.tipDocument) || DOC_BADGE_STYLES[doc.tipDocument];
    if (isConfigured) {
      setFormTip(doc.tipDocument);
      setFormTipCustom('');
    } else {
      setFormTip('ALTELE');
      setFormTipCustom(doc.tipDocument || '');
    }
    setFormSerie(doc.serieDocument || '');
    setFormEmitent(doc.emitent || '');
    setFormDataEmitere(doc.dataEmitere ? String(doc.dataEmitere).split('T')[0] : '');
    setFormDataExpirare(doc.dataExpirare ? String(doc.dataExpirare).split('T')[0] : '');
    setFormZileAvertizare(doc.zileAvertizareInainte ?? 30);
    setFormCost(doc.cost !== null && doc.cost !== undefined ? doc.cost : '');
    setFormObservatii(doc.observatii || '');
    setFormFisierUrl(doc.fisierUrl || '');
    setFormFisierNume(doc.fisierNume || '');
    setFormFisierMarime(doc.fisierMarime || null);
    setShowDocModal(true);
  };

  const setQuickExpiryMonths = (months: number) => {
    const base = new Date();
    base.setMonth(base.getMonth() + months);
    setFormDataExpirare(base.toISOString().split('T')[0]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      await showError('Fișier prea mare', 'Limita maximă este de 25 MB.');
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormFisierUrl(data.fisierUrl);
        setFormFisierNume(data.fisierNume);
        setFormFisierMarime(data.fisierMarime);
      } else {
        await showError('Eroare Upload', 'Nu s-a putut încărca fișierul selectat.');
      }
    } catch {
      await showError('Eroare Rețea', 'Eroare de rețea la încărcarea fișierului.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehiculId || !formDataExpirare) {
      await showError('Date incomplete', 'Vă rugăm să selectați vehiculul și data expirării.');
      return;
    }

    const tipFinal = formTip === 'ALTELE' ? formTipCustom.trim().toUpperCase().replace(/\s+/g, '_') || 'DOCUMENT' : formTip;

    try {
      const payload = {
        vehiculId: formVehiculId,
        tipDocument: tipFinal,
        dataExpirare: formDataExpirare,
        dataEmitere: formDataEmitere || null,
        zileAvertizareInainte: Number(formZileAvertizare),
        serieDocument: formSerie.trim() || null,
        emitent: formEmitent.trim() || null,
        cost: formCost !== '' ? Number(formCost) : null,
        observatii: formObservatii.trim() || null,
        fisierUrl: formFisierUrl || null,
        fisierNume: formFisierNume || null,
        fisierMarime: formFisierMarime || null,
      };

      const url = editingDoc
        ? `${API_BASE_URL}/anomalii/documente-vehicule/${editingDoc.id}`
        : `${API_BASE_URL}/anomalii/documente-vehicule`;
      const method = editingDoc ? 'PATCH' : 'POST';

      const res = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await showToast(`Documentul a fost ${editingDoc ? 'actualizat' : 'înregistrat'} cu succes.`);
        setShowDocModal(false);
        setEditingDoc(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        await showError('Eroare', err.message || 'Verificați datele introduse.');
      }
    } catch {
      await showError('Eroare', 'Eroare la salvarea documentului.');
    }
  };

  const handleDeleteDoc = async (id: string, denumire: string) => {
    const confirmed = await showConfirm(
      'Ștergere Document',
      `Sigur doriți să ștergeți documentul "${denumire}"?`,
      'Da, șterge',
      'Anulează',
    );
    if (!confirmed) return;

    try {
      const res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (previewFisier?.docId === id) setPreviewFisier(null);
        setShowDocModal(false);
        setEditingDoc(null);
        await showToast(`Documentul "${denumire}" a fost șters.`);
        fetchData();
      } else {
        await showError('Eroare', 'Eroare la ștergerea documentului de pe server.');
      }
    } catch {
      await showError('Eroare Conexiune', 'Eroare de conexiune la server.');
    }
  };

  const handleDeleteFisier = async (docId: string, numeFisier: string) => {
    const confirmed = await showConfirm(
      'Ștergere Fișier Atașat',
      `Sigur doriți să ștergeți fișierul atașat "${numeFisier}"? Fișierul va fi șters definitiv de pe server.`,
      'Da, șterge fișierul',
      'Anulează',
    );
    if (!confirmed) return;

    try {
      setIsDeletingFisier(true);
      const res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule/${docId}/fisier`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (previewFisier?.docId === docId) setPreviewFisier(null);
        setFormFisierUrl('');
        setFormFisierNume('');
        setFormFisierMarime(null);
        await showToast('Fișierul atașat a fost șters.');
        fetchData();
      } else {
        await showError('Eroare', 'Nu s-a putut șterge fișierul de pe server.');
      }
    } catch {
      await showError('Eroare Conexiune', 'A apărut o problemă la comunicarea cu serverul.');
    } finally {
      setIsDeletingFisier(false);
    }
  };

  const openAddTipModal = () => {
    setEditingTipCod(null);
    setTipFormCod('');
    setTipFormLabel('');
    setTipFormZile(30);
    setTipFormDescriere('');
    setTipFormCategorii(['TOATE']);
    setShowTipModal(true);
  };

  const openEditTipModal = (tip: DocTypeItem) => {
    setEditingTipCod(tip.cod);
    setTipFormCod(tip.cod);
    setTipFormLabel(tip.label || tip.cod);
    setTipFormZile(tip.zileAvertizare || 30);
    setTipFormDescriere(tip.descriere || '');
    setTipFormCategorii(Array.isArray(tip.categorii) ? [...tip.categorii] : ['TOATE']);
    setShowTipModal(true);
  };

  const toggleTipCategory = (catCode: string) => {
    const allCodes = allCategoryOptions.map((c) => c.cod);
    setTipFormCategorii((prev) => {
      if (catCode === 'TOATE') return ['TOATE'];
      const base = prev.includes('TOATE') ? allCodes : prev;
      const next = base.includes(catCode) ? base.filter((c) => c !== catCode) : [...base, catCode];
      if (allCodes.length > 0 && next.length === allCodes.length) {
        return ['TOATE'];
      }
      return next;
    });
  };

  const handleSaveTipDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTipCod && !tipFormCod.trim()) {
      await showError('Date incomplete', 'Introduceți codul tipului de document.');
      return;
    }
    if (!tipFormLabel.trim()) {
      await showError('Date incomplete', 'Introduceți denumirea tipului de document.');
      return;
    }

    try {
      const isEdit = Boolean(editingTipCod);
      const url = isEdit
        ? `${API_BASE_URL}/anomalii/tipuri-documente/${encodeURIComponent(editingTipCod!)}`
        : `${API_BASE_URL}/anomalii/tipuri-documente`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? {} : { cod: tipFormCod.trim() }),
          label: tipFormLabel.trim(),
          zileAvertizare: Number(tipFormZile) || 30,
          descriere: tipFormDescriere.trim(),
          categorii: tipFormCategorii,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (Array.isArray(updated)) setTipuriDocumente(updated);
        setShowTipModal(false);
        setEditingTipCod(null);
        await showToast(isEdit ? 'Tipul de document a fost actualizat.' : 'Tipul de document a fost adăugat.');
      } else {
        const err = await res.json().catch(() => ({}));
        await showError('Eroare', err.message || 'Nu s-a putut salva tipul de document.');
      }
    } catch {
      await showError('Eroare Rețea', 'Eroare la salvarea tipului de document.');
    }
  };

  const handleDeleteTipDocument = async (cod: string) => {
    const confirmed = await showConfirm(
      'Ștergere Tip Document',
      `Sigur doriți să ștergeți tipul de document "${cod}"?`,
      'Da, șterge',
      'Anulează',
    );
    if (!confirmed) return;

    try {
      const res = await safeFetch(`${API_BASE_URL}/anomalii/tipuri-documente/${cod}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = await res.json();
        if (Array.isArray(updated)) setTipuriDocumente(updated);
        if (selectedTip === cod) setSelectedTip('TOATE');
        await showToast(`Tipul "${cod}" a fost șters.`);
      } else {
        const err = await res.json().catch(() => ({}));
        await showError('Eroare', err.message || 'Nu s-a putut șterge tipul de document.');
      }
    } catch {
      await showError('Eroare Rețea', 'Eroare la ștergerea tipului de document.');
    }
  };

  const handleInitializareRapidaFlota = async () => {
    const confirmed = await showConfirm(
      'Inițializare Automată Acte Flotă',
      'Doriți să generați automat sloturile de documente lipsă pentru vehiculele din flotă conform categoriei lor (ITP, RCA, Rovinietă, Tahograf)?',
      'Da, inițializează',
      'Anulează',
    );
    if (!confirmed) return;

    try {
      setInitializareRapidaLoading(true);
      const res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule/initializare-rapida`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        await showSuccess('Inițializare Finalizată', data.message || 'Documentele au fost inițializate cu succes!');
        fetchData();
      } else {
        await showError('Eroare', 'Eroare la inițializarea automată a documentelor.');
      }
    } catch {
      await showError('Eroare Rețea', 'Eroare de conexiune la server.');
    } finally {
      setInitializareRapidaLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedTip('TOATE');
    setSelectedStatus('TOATE');
    setFilterCategorie('TOATE');
    setSelectedVehiculId('');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedTip !== 'TOATE' ||
    selectedStatus !== 'TOATE' ||
    filterCategorie !== 'TOATE' ||
    Boolean(selectedVehiculId) ||
    Boolean(searchQuery);

  return (
    <div className="space-y-5">
      {/* ANTET PAGINĂ & ACȚIUNI */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-sapphire-900 tracking-tight flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
              <FileCheck className="w-6 h-6" />
            </div>
            <span>Documente Flotă & Valabilitate Acte</span>
          </h1>
          <p className="text-xs text-sage-600 font-medium mt-1">
            Matrice flotă pe vehicul și listă detaliată unificată: ITP, RCA, Rovinietă, Copie Conformă, Tahograf &amp; CASCO cu acte scanate
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={handleInitializareRapidaFlota}
            disabled={initializareRapidaLoading}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition shadow-xs disabled:opacity-50"
            title="Generează automat sloturile de documente lipsă conform categoriei fiecărui vehicul"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-600 ${initializareRapidaLoading ? 'animate-spin' : ''}`} />
            <span>{initializareRapidaLoading ? 'Se inițializează...' : 'Inițializare Rapidă'}</span>
          </button>

          <button
            type="button"
            onClick={openAddTipModal}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-periwinkle-50 hover:bg-periwinkle-100 border border-periwinkle-300 text-periwinkle-900 text-xs font-bold transition shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-periwinkle-700" />
            <span>+ Tip Nou</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Document Nou</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS UNIFICATE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setSelectedStatus('TOATE')}
          className={`pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-sapphire-500 text-left transition hover:shadow-md ${
            selectedStatus === 'TOATE' ? 'ring-1 ring-sapphire-400/50' : ''
          }`}
        >
          <div>
            <p className="text-[10px] uppercase font-black text-sapphire-700 tracking-wider">Total Documente</p>
            <p className="text-3xl font-black text-sapphire-900 font-mono mt-0.5">{docKPIs.total}</p>
            <p className="text-[11px] text-sage-600 font-semibold">{docKPIs.valide} valabile în termen</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center text-sapphire-600">
            <FileText className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'EXPIRATE' ? 'TOATE' : 'EXPIRATE')}
          className={`pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-terracotta-500 text-left transition hover:shadow-md ${
            selectedStatus === 'EXPIRATE' ? 'ring-2 ring-terracotta-500' : ''
          }`}
        >
          <div>
            <p className="text-[10px] uppercase font-black text-terracotta-600 tracking-wider">Acte Expirate</p>
            <p className="text-3xl font-black text-terracotta-600 font-mono mt-0.5">{docKPIs.expirate}</p>
            <p className="text-[11px] text-sage-600 font-semibold">acțiune imediată</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-roseash-100 border border-roseash-300 flex items-center justify-center text-terracotta-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus(selectedStatus === 'AVERTIZARE' ? 'TOATE' : 'AVERTIZARE')}
          className={`pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-400 text-left transition hover:shadow-md ${
            selectedStatus === 'AVERTIZARE' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div>
            <p className="text-[10px] uppercase font-black text-amber-700 tracking-wider">În Scadență</p>
            <p className="text-3xl font-black text-amber-700 font-mono mt-0.5">{docKPIs.avertizare}</p>
            <p className="text-[11px] text-sage-600 font-semibold">în prag de avertizare</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </button>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-[10px] uppercase font-black text-emerald-700 tracking-wider">Acte Scanate Atașate</p>
            <p className="text-3xl font-black text-emerald-800 font-mono mt-0.5">{docKPIs.cuFisier}</p>
            <p className="text-[11px] text-sage-600 font-semibold">
              {docKPIs.total > 0 ? `${Math.round((docKPIs.cuFisier / docKPIs.total) * 100)}% din total` : '0%'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Paperclip className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* COMUTATOR VIZUALIZARE & PANOU FILTRE UNIFICAT */}
      <div className="pleasant-card rounded-2xl p-4 bg-white border border-morning-200 space-y-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Switcher Listă vs Tabel/Matrice vs Tipuri Acte */}
          <div className="flex items-center flex-wrap gap-1.5 p-1 bg-morning-100 rounded-xl border border-morning-200 self-start">
            <button
              type="button"
              onClick={() => handleChangeViewMode('matrice')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                viewMode === 'matrice'
                  ? 'bg-sapphire-500 text-white shadow-xs'
                  : 'text-sage-700 hover:text-sapphire-900 hover:bg-morning-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tabel Matrice ({vehiculeMatrice.length} vehicule)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedStatus === 'LIPSA') setSelectedStatus('TOATE');
                handleChangeViewMode('lista');
              }}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                viewMode === 'lista'
                  ? 'bg-sapphire-500 text-white shadow-xs'
                  : 'text-sage-700 hover:text-sapphire-900 hover:bg-morning-200'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Listă ({documenteSortate.length} acte)</span>
            </button>

            <button
              type="button"
              onClick={() => handleChangeViewMode('tipuri')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                viewMode === 'tipuri'
                  ? 'bg-sapphire-500 text-white shadow-xs'
                  : 'text-sage-700 hover:text-sapphire-900 hover:bg-morning-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tipuri Acte ({tipuriDocumente.length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-bold text-sage-600">
            {viewMode !== 'tipuri' && (
              <span className="px-2.5 py-1 rounded-full bg-morning-100 border border-morning-200">
                {viewMode === 'matrice'
                  ? `${vehiculeMatrice.length} utilaje încărcate complet (fără paginare)`
                  : `${documenteSortate.length} documente din ${documente.length}`}
              </span>
            )}
            {hasActiveFilters && viewMode !== 'tipuri' && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-bold text-terracotta-600 hover:underline flex items-center space-x-1 px-2 py-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetează Filtrele</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtre Comune (Matrice & Listă) */}
        {viewMode !== 'tipuri' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-morning-200 items-center">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Caută utilaj, înmatriculare, serie, emitent..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-7 py-2 text-xs text-sapphire-900 font-bold focus:bg-white transition"
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

              <div>
                <select
                  value={filterCategorie}
                  onChange={(e) => setFilterCategorie(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-xs font-bold text-sapphire-900 cursor-pointer"
                >
                  <option value="TOATE">Toate Categoriile Flotă</option>
                  {categoriiVehicul.map((c: any) => {
                    const code = c.cod || c.nume || c;
                    return (
                      <option key={code} value={code}>
                        {c.label || c.nume || code}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <select
                  value={selectedVehiculId}
                  onChange={(e) => setSelectedVehiculId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-xs font-bold text-sapphire-900 cursor-pointer"
                >
                  <option value="">Toate Utilajele ({vehicule.length})</option>
                  {vehiculeSortate.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern || v.numarInmatriculare}
                      {v.numarInmatriculare && v.numarInmatriculare !== v.numarIntern ? ` (${v.numarInmatriculare})` : ''} — {v.categorieEnum || 'Utilaj'}
                    </option>
                  ))}
                </select>
              </div>

              {viewMode === 'matrice' ? (
                <label className="flex items-center space-x-2 text-xs font-bold text-sapphire-900 cursor-pointer select-none bg-morning-100 hover:bg-morning-200 border border-morning-200 px-3 py-2 rounded-xl transition">
                  <input
                    type="checkbox"
                    checked={ascundeFaraActe}
                    onChange={(e) => setAscundeFaraActe(e.target.checked)}
                    className="w-4 h-4 rounded text-sapphire-600 focus:ring-sapphire-500 border-morning-300 cursor-pointer"
                  />
                  <span className="truncate">Ascunde vehiculele fără acte</span>
                </label>
              ) : (
                <div className="text-right text-[11px] font-bold text-sage-500 px-2">
                  Clic pe antetul coloanelor pentru sortare
                </div>
              )}
            </div>

            {/* Pilule Tip Document */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-sage-500 uppercase tracking-wider">Tip Document</p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const pillItems = [
                    { cod: 'TOATE', label: 'Toate Actele', count: documente.length },
                    ...tipuriDocumente.map((t) => ({
                      cod: t.cod,
                      label: getTipBadgeConfig(t.cod, t.label).shortLabel,
                      count: documente.filter((d) => d.tipDocument === t.cod).length,
                    })),
                  ];
                  const customCount = documente.filter((d) => !standardAndConfiguredCodes.has(d.tipDocument)).length;
                  if (customCount > 0) {
                    pillItems.push({ cod: 'ALTELE', label: 'Alte Documente', count: customCount });
                  }

                  return pillItems.map((item) => {
                    const cfg = getTipBadgeConfig(item.cod, item.label);
                    const isActive = selectedTip === item.cod;
                    return (
                      <button
                        key={item.cod}
                        type="button"
                        onClick={() => setSelectedTip(item.cod)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none cursor-pointer ${
                          isActive
                            ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm ring-2 ring-offset-1 ring-current`
                            : 'bg-white text-slate-600 border-morning-200 hover:border-morning-300 hover:bg-morning-50'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.count > 0 && (
                          <span className={`px-1.5 rounded-full text-[10px] font-black leading-5 ${isActive ? 'bg-white/50' : 'bg-morning-100 text-slate-500'}`}>
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Pilule Stare Valabilitate */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-sage-500 uppercase tracking-wider">Stare Valabilitate</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'TOATE', label: 'Toate Stările', count: docKPIs.total, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
                  { id: 'EXPIRATE', label: 'Expirate', count: docKPIs.expirate, bg: 'bg-roseash-100', text: 'text-terracotta-800', border: 'border-roseash-300' },
                  { id: 'AVERTIZARE', label: 'Expiră Curând', count: docKPIs.avertizare, bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
                  { id: 'OPTIM', label: 'În Termen / Valabile', count: docKPIs.valide, bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
                  ...(viewMode === 'matrice'
                    ? [{ id: 'LIPSA', label: 'Cu Acte Lipsă', count: null as number | null, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' }]
                    : []),
                ].map((st) => {
                  const isActive = selectedStatus === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStatus(st.id as StatusFilter)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none cursor-pointer ${
                        isActive
                          ? `${st.bg} ${st.text} ${st.border} shadow-sm ring-2 ring-offset-1 ring-current`
                          : 'bg-white text-slate-600 border-morning-200 hover:border-morning-300 hover:bg-morning-50'
                      }`}
                    >
                      <span>{st.label}</span>
                      {st.count !== null && st.count > 0 && (
                        <span className={`px-1.5 rounded-full text-[10px] font-black leading-5 ${isActive ? 'bg-white/50' : 'bg-morning-100 text-slate-500'}`}>
                          {st.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* VIZUALIZARE 1: TABEL MATRICE FLOTĂ (FĂRĂ PAGINARE - TOATĂ FLOTA)     */}
      {/* ===================================================================== */}
      {viewMode === 'matrice' && (
        <div className="pleasant-card rounded-2xl border border-morning-200 overflow-auto max-h-[calc(100vh-140px)] shadow-xs relative">
          {loading ? (
            <div className="p-12 text-center text-sage-500 font-bold text-xs animate-pulse">
              Se încarcă matricea documentelor flotă...
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[920px]">
              <thead className="sticky top-0 z-20">
                <tr className="bg-morning-100 text-sage-700 font-extrabold uppercase tracking-wider text-[11px]">
                  <th
                    onClick={() => {
                      if (matrixSortCol !== 'vehicul') {
                        setMatrixSortCol('vehicul');
                        setMatrixVehSortMode('abc');
                      } else {
                        setMatrixVehSortMode((prev) => (prev === 'abc' ? 'categorie' : 'abc'));
                      }
                    }}
                    className={`p-3 sticky left-0 top-0 z-30 min-w-[230px] border-b border-r border-morning-200 shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.06)] cursor-pointer select-none transition group ${
                      matrixSortCol === 'vehicul'
                        ? 'bg-morning-200 text-sapphire-950 font-black'
                        : 'bg-morning-100 hover:bg-morning-200'
                    }`}
                    title="Apasă pentru a schimba sortarea: Alfabetic (A-Z) ⟷ Categorie Flotă"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate">Vehicul &amp; Categorie</span>
                      <span className="inline-flex items-center space-x-1 text-[10px] font-black tracking-normal px-2 py-0.5 rounded-md bg-white border border-morning-300 text-sapphire-800 shadow-xs shrink-0">
                        {matrixSortCol === 'vehicul' && matrixVehSortMode === 'abc' && (
                          <>
                            <ArrowUp className="w-3 h-3 text-sapphire-600" />
                            <span>A-Z</span>
                          </>
                        )}
                        {matrixSortCol === 'vehicul' && matrixVehSortMode === 'categorie' && (
                          <>
                            <Layers className="w-3 h-3 text-sapphire-600" />
                            <span>Categorie</span>
                          </>
                        )}
                        {matrixSortCol !== 'vehicul' && (
                          <span className="text-sage-500 font-normal group-hover:text-sapphire-800 flex items-center space-x-1">
                            <ArrowUpDown className="w-3 h-3" />
                            <span>Sortează</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </th>

                  {displayedMatrixTipuri.map((t) => {
                    const isSorted = matrixSortCol === t.cod;
                    return (
                      <th
                        key={t.cod}
                        onClick={() => {
                          if (matrixSortCol !== t.cod) {
                            setMatrixSortCol(t.cod);
                            setMatrixSortDir('asc');
                          } else {
                            setMatrixSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                          }
                        }}
                        className={`p-3 text-center min-w-[145px] sticky top-0 z-20 border-b border-morning-200 cursor-pointer select-none transition group ${
                          isSorted
                            ? 'bg-sapphire-100 border-b-2 border-b-sapphire-500 text-sapphire-950 font-black'
                            : 'bg-morning-100 hover:bg-morning-200'
                        }`}
                        title={`Sortează după expirare ${t.cod}`}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span className="font-extrabold text-sapphire-900 group-hover:text-sapphire-600 transition">
                            {t.cod}
                          </span>
                          {isSorted ? (
                            <span className="inline-flex items-center text-[9px] font-black bg-sapphire-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                              {matrixSortDir === 'asc' ? <ArrowUp className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDown className="w-2.5 h-2.5 mr-0.5" />}
                              Exp.
                            </span>
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-sage-400 opacity-0 group-hover:opacity-100 transition" />
                          )}
                        </div>
                        <div className="text-[10px] font-normal text-sage-500 truncate max-w-[130px] mx-auto mt-0.5" title={t.label}>
                          {t.label?.replace(/\([^)]*\)/g, '').trim()}
                        </div>
                      </th>
                    );
                  })}

                  <th className="p-3 text-right min-w-[85px] sticky top-0 z-20 bg-morning-100 border-b border-morning-200">Acțiuni</th>
                </tr>
              </thead>

              <tbody className="font-medium text-slate-700">
                {vehiculeMatrice.length === 0 ? (
                  <tr>
                    <td
                      colSpan={displayedMatrixTipuri.length + 2}
                      className="p-10 text-center text-xs text-sage-500 font-bold border-b border-morning-200"
                    >
                      Nu a fost găsit niciun vehicul conform criteriilor selectate.
                    </td>
                  </tr>
                ) : (
                  vehiculeMatrice.map((v) => {
                    const catColor = getCategoryColor(v.categorieEnum);
                    return (
                      <tr key={v.id} className="hover:bg-morning-50 transition group">
                        {/* Coloană Vehicul (Sticky Left) */}
                        <td className="p-3 sticky left-0 bg-white group-hover:bg-morning-50 z-10 border-r border-b border-morning-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-sapphire-900 text-xs">
                              {v.numarIntern || 'FĂRĂ COD'}
                            </span>
                            <span className="font-mono font-bold text-slate-600 text-[11px]">
                              ({v.numarInmatriculare || '-'})
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 mt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${catColor.badge}`}>
                              {v.categorieEnum || 'UTILAJ'}
                            </span>
                            {v.marca && (
                              <span className="text-[10px] text-sage-500 truncate max-w-[100px]">
                                {v.marca} {v.model || ''}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Celule Tipuri Documente */}
                        {displayedMatrixTipuri.map((t) => {
                          const isSortedCol = matrixSortCol === t.cod;
                          const doc = v.docs[t.cod];
                          if (!doc) {
                            const applies = isTipApplicableToCategory(t, v.categorieEnum);
                            if (!applies) {
                              return (
                                <td
                                  key={t.cod}
                                  className={`p-2 text-center border-b border-morning-200 ${isSortedCol ? 'bg-sapphire-50/30' : ''}`}
                                  title={`Nu se aplică categoriei ${v.categorieEnum || 'selectate'}`}
                                >
                                  <span className="inline-block py-1 px-2.5 rounded-md text-[10px] font-bold text-slate-400/80 select-none">
                                    —
                                  </span>
                                </td>
                              );
                            }
                            return (
                              <td
                                key={t.cod}
                                className={`p-2 text-center border-b border-morning-200 ${isSortedCol ? 'bg-sapphire-50/30' : ''}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddModal(v.id, t.cod)}
                                  className="w-full py-1.5 px-2 border border-dashed border-morning-300 hover:border-sapphire-400 hover:bg-sapphire-50 text-sage-400 hover:text-sapphire-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                                  title={`Adaugă ${t.cod} pentru ${v.numarIntern || v.numarInmatriculare}`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Lipsă</span>
                                </button>
                              </td>
                            );
                          }

                          const meta = getDocStatusMeta(doc, nowMs);
                          const exp = new Date(doc.dataExpirare);
                          const badgeClasses = meta.isExpired
                            ? 'bg-roseash-50 text-terracotta-700 border-terracotta-300 hover:bg-roseash-100'
                            : meta.isWarning
                            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';

                          return (
                            <td
                              key={t.cod}
                              className={`p-2 text-center border-b border-morning-200 ${isSortedCol ? 'bg-sapphire-50/30' : ''}`}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(doc)}
                                className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-mono font-bold transition flex flex-col items-center justify-center cursor-pointer ${badgeClasses}`}
                                title={`Click pentru editare ${t.cod}${doc.serieDocument ? ` (${doc.serieDocument})` : ''}`}
                              >
                                <div className="flex items-center justify-center space-x-1">
                                  {meta.isExpired && <AlertTriangle className="w-3 h-3 text-terracotta-600 shrink-0" />}
                                  {meta.isWarning && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
                                  {meta.isValid && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                                  <span>{exp.toLocaleDateString('ro-RO')}</span>
                                  {doc.fisierUrl && (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewFisier({
                                          docId: doc.id,
                                          url: `${API_BASE_URL}${doc.fisierUrl}`,
                                          nume: doc.fisierNume || `${t.cod} Scanat`,
                                          vehiculNumar: v.numarInmatriculare || v.numarIntern,
                                          tipDocument: t.cod,
                                        });
                                      }}
                                      title={`Previzualizează act scanat: ${doc.fisierNume || 'Document'}`}
                                      className="ml-1 p-0.5 rounded bg-sapphire-100/90 hover:bg-sapphire-200 text-sapphire-900 shadow-2xs transition inline-flex items-center cursor-pointer"
                                    >
                                      <Paperclip className="w-2.5 h-2.5" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] font-normal opacity-85">
                                  {meta.isExpired ? (
                                    <span className="font-bold text-terracotta-700">Expirat ({Math.abs(meta.diffDays)}z)</span>
                                  ) : meta.isWarning ? (
                                    <span className="font-bold text-amber-700">În {meta.diffDays} zile</span>
                                  ) : (
                                    <span>Valabil ({meta.diffDays}z)</span>
                                  )}
                                </div>
                              </button>
                            </td>
                          );
                        })}

                        {/* Acțiuni */}
                        <td className="p-3 text-right border-b border-morning-200">
                          <button
                            type="button"
                            onClick={() => handleOpenAddModal(v.id)}
                            className="p-1.5 text-sapphire-600 hover:bg-morning-100 rounded-lg text-xs font-bold inline-flex items-center space-x-1 cursor-pointer"
                            title={`Adaugă alt document pentru ${v.numarIntern || v.numarInmatriculare}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Act</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIZUALIZARE 2: LISTĂ DETALIATĂ DOCUMENTE                              */}
      {/* ===================================================================== */}
      {viewMode === 'lista' && (
        <div className="pleasant-card rounded-2xl border border-morning-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-sage-500 font-bold text-xs animate-pulse">
              Se încarcă documentele de flotă...
            </div>
          ) : documenteSortate.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-sage-400 mx-auto" />
              <h3 className="font-extrabold text-sapphire-900 text-sm">Niciun document găsit pentru filtrele selectate</h3>
              <p className="text-xs text-sage-600 max-w-md mx-auto">
                Resetați filtrele sau adăugați manual un document nou.
              </p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-140px)] relative">
              <table className="w-full text-left text-xs border-separate border-spacing-0">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-black uppercase text-[10px] tracking-wider select-none">
                    <th
                      className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 cursor-pointer hover:bg-morning-200 transition group"
                      onClick={() => handleListSort('vehicul')}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Vehicul / Nr. Înmatriculare</span>
                        {renderListSortIcon('vehicul')}
                      </div>
                    </th>
                    <th
                      className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 cursor-pointer hover:bg-morning-200 transition group"
                      onClick={() => handleListSort('tip')}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Tip Document</span>
                        {renderListSortIcon('tip')}
                      </div>
                    </th>
                    <th
                      className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 cursor-pointer hover:bg-morning-200 transition group"
                      onClick={() => handleListSort('serie')}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Serie &amp; Emitent</span>
                        {renderListSortIcon('serie')}
                      </div>
                    </th>
                    <th
                      className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 cursor-pointer hover:bg-morning-200 transition group"
                      onClick={() => handleListSort('expirare')}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Data Expirării</span>
                        {renderListSortIcon('expirare')}
                      </div>
                    </th>
                    <th
                      className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 cursor-pointer hover:bg-morning-200 transition group text-center"
                      onClick={() => handleListSort('zile')}
                    >
                      <div className="flex items-center justify-center space-x-1.5">
                        <span>Valabilitate / Expirare</span>
                        {renderListSortIcon('zile')}
                      </div>
                    </th>
                    <th
                      className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 cursor-pointer hover:bg-morning-200 transition group text-center"
                      onClick={() => handleListSort('act')}
                    >
                      <div className="flex items-center justify-center space-x-1.5">
                        <span>Act Scanat</span>
                        {renderListSortIcon('act')}
                      </div>
                    </th>
                    <th className="p-3.5 sticky top-0 z-20 bg-morning-100 border-b border-morning-200 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                  {documenteSortate.map((doc) => {
                    const dataExp = new Date(doc.dataExpirare);
                    const meta = getDocStatusMeta(doc, nowMs);
                    const docCfg = getTipBadgeConfig(doc.tipDocument);
                    const catColor = getCategoryColor(doc.vehicul?.categorieEnum);

                    return (
                      <tr
                        key={doc.id}
                        className={`transition ${
                          meta.isExpired
                            ? 'bg-roseash-50/40 hover:bg-roseash-50/70'
                            : meta.isUrgent
                            ? 'bg-roseash-50/20 hover:bg-roseash-50/50'
                            : meta.isWarning
                            ? 'bg-amber-50/30 hover:bg-amber-50/60'
                            : 'hover:bg-morning-50'
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-xs font-black text-sapphire-900 bg-white px-2 py-0.5 rounded border border-morning-200">
                                {doc.vehicul?.numarInmatriculare || doc.vehicul?.numarIntern || '—'}
                              </span>
                              {doc.vehicul?.numarIntern && doc.vehicul.numarIntern !== doc.vehicul.numarInmatriculare && (
                                <span className="text-[11px] font-bold text-slate-600">
                                  {doc.vehicul.numarIntern}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5">
                              {doc.vehicul?.categorieEnum && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${catColor.badge}`}>
                                  {doc.vehicul.categorieEnum}
                                </span>
                              )}
                              {doc.vehicul?.model && (
                                <span className="text-[10px] text-sage-500 font-semibold">{doc.vehicul.model}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${docCfg.bg} ${docCfg.text} ${docCfg.border}`}>
                            {docCfg.shortLabel}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <p className="font-bold text-sapphire-900 text-xs font-mono">
                              {doc.serieDocument || '—'}
                            </p>
                            {doc.emitent && (
                              <p className="text-[10px] text-sage-600 font-semibold">Emitent: {doc.emitent}</p>
                            )}
                            {doc.observatii && (
                              <p className="text-[10px] text-slate-500 italic max-w-xs truncate">{doc.observatii}</p>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 font-mono font-bold text-sapphire-900 text-xs">
                          {dataExp.toLocaleDateString('ro-RO')}
                          {doc.dataEmitere && (
                            <p className="text-[10px] font-normal text-sage-500">
                              Emis: {new Date(doc.dataEmitere).toLocaleDateString('ro-RO')}
                            </p>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {meta.isExpired ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-terracotta-600 text-white">
                              <AlertTriangle className="w-3 h-3 mr-0.5" />
                              <span>EXPIRAT ({Math.abs(meta.diffDays)} ZILE)</span>
                            </span>
                          ) : meta.isUrgent ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-terracotta-500 text-white animate-pulse">
                              <Clock className="w-3 h-3 mr-0.5" />
                              <span>URGENT ({meta.diffDays} ZILE)</span>
                            </span>
                          ) : meta.isWarning ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 text-white">
                              <Clock className="w-3 h-3 mr-0.5" />
                              <span>EXPIRĂ ÎN {meta.diffDays} ZILE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 mr-0.5 text-emerald-600" />
                              <span>VALABIL ({meta.diffDays} ZILE)</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {doc.fisierUrl ? (
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewFisier({
                                    docId: doc.id,
                                    url: `${API_BASE_URL}${doc.fisierUrl}`,
                                    nume: doc.fisierNume || 'Document Scanat',
                                    vehiculNumar: doc.vehicul?.numarInmatriculare || doc.vehicul?.numarIntern,
                                    tipDocument: doc.tipDocument,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition flex items-center space-x-1 cursor-pointer"
                                title="Previzualizează documentul scanat (PDF sau Imagine)"
                              >
                                <Eye className="w-3 h-3 text-emerald-600" />
                                <span className="max-w-[95px] truncate">{doc.fisierNume || 'Vezi Act'}</span>
                              </button>
                              <a
                                href={`${API_BASE_URL}${doc.fisierUrl}`}
                                download={doc.fisierNume || 'document'}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-sage-400 hover:text-sapphire-600 hover:bg-sapphire-50 rounded transition"
                                title="Deschide în filă nouă / Descarcă"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteFisier(doc.id, doc.fisierNume || 'Document Scanat')}
                                className="p-1 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-50 rounded transition cursor-pointer"
                                title="Șterge fișierul atașat"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-terracotta-500" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(doc)}
                              className="px-2 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 text-slate-500 font-bold text-[10px] border border-dashed border-morning-300 transition flex items-center space-x-1 mx-auto cursor-pointer"
                              title="Atașează o copie scanată sau o fotografie"
                            >
                              <Upload className="w-3 h-3 text-sage-400" />
                              <span>+ Atașează</span>
                            </button>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(doc)}
                              className="p-1.5 rounded-lg text-sage-500 hover:text-sapphire-600 hover:bg-sapphire-50 transition cursor-pointer"
                              title="Editează date document"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id, `${doc.tipDocument} - ${doc.vehicul?.numarInmatriculare || doc.vehicul?.numarIntern || ''}`)}
                              className="p-1.5 rounded-lg text-sage-400 hover:text-terracotta-600 hover:bg-roseash-50 transition cursor-pointer"
                              title="Șterge document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIZUALIZARE 3: NOMENCLATOR TIPURI DE ACTE                              */}
      {/* ===================================================================== */}
      {viewMode === 'tipuri' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-between text-sapphire-900 text-xs">
            <div>
              <p className="font-extrabold text-sapphire-950">Nomenclator Tipuri Documente &amp; Categorii Aplicabile</p>
              <p className="text-sage-700 text-[11px]">
                Configurați categoriile de vehicule pentru care apare fiecare tip de act în Tabelul Matrice și la Inițializarea Rapidă.
              </p>
            </div>
            <button
              type="button"
              onClick={openAddTipModal}
              className="px-3.5 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold transition shrink-0 flex items-center space-x-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tip Nou</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {tipuriDocumente.map((t) => {
              const countInFleet = documente.filter((d) => d.tipDocument === t.cod).length;
              const cats = Array.isArray(t.categorii) ? t.categorii : ['TOATE'];
              const isAllCats = cats.includes('TOATE');
              const isDisabledAll = !isAllCats && cats.length === 0;

              return (
                <div
                  key={t.cod}
                  className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="font-mono font-black text-sm text-sapphire-900 bg-morning-100 px-2.5 py-0.5 rounded-lg border border-morning-200">
                        {t.cod}
                      </span>
                      {t.esteStandard ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          Standard Sistem
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-periwinkle-100 text-periwinkle-800">
                          Personalizat
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-slate-800 text-xs line-clamp-2" title={t.label}>
                      {t.label || t.cod}
                    </h4>

                    {t.descriere && (
                      <p className="text-[11px] text-sage-600 line-clamp-2">{t.descriere}</p>
                    )}

                    {/* Categorii Aplicabile */}
                    <div className="pt-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-sage-500">
                        <span>Categorii aplicabile</span>
                        <button
                          type="button"
                          onClick={() => openEditTipModal(t)}
                          className="text-sapphire-600 hover:underline font-bold normal-case tracking-normal cursor-pointer"
                        >
                          Configurează
                        </button>
                      </div>
                      <div
                        onClick={() => openEditTipModal(t)}
                        className="flex flex-wrap gap-1 cursor-pointer"
                        title="Click pentru a selecta categoriile de vehicule"
                      >
                        {isAllCats ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sapphire-50 text-sapphire-800 border border-sapphire-200">
                            Toate categoriile flotă
                          </span>
                        ) : isDisabledAll ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-morning-100 text-slate-500 border border-morning-300">
                            Nicio categorie selectată (Dezactivat)
                          </span>
                        ) : (
                          cats.map((c) => (
                            <span
                              key={c}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getCategoryColor(c).badge}`}
                            >
                              {c}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-morning-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-sage-600">Preaviz alertă:</span>
                      <span className="font-mono font-bold text-terracotta-700">
                        {t.zileAvertizare || 30} zile în avans
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-sage-600">Acte înregistrate:</span>
                      <span className="font-mono font-bold text-sapphire-900">
                        {countInFleet} vehicule
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openEditTipModal(t)}
                        className="flex-1 py-1.5 px-2 bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-800 border border-sapphire-200 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Categorii &amp; Editare</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(undefined, t.cod)}
                        className="py-1.5 px-2.5 bg-morning-100 hover:bg-sapphire-50 hover:text-sapphire-700 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                        title="Înregistrează un act de acest tip"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Act</span>
                      </button>
                      {!t.esteStandard && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTipDocument(t.cod)}
                          className="p-1.5 text-terracotta-600 hover:bg-roseash-100 rounded-lg transition cursor-pointer"
                          title="Șterge acest tip personalizat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL ADĂUGARE / EDITARE DOCUMENT UNIFICAT                            */}
      {/* ===================================================================== */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-xl space-y-4 shadow-2xl border border-morning-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">
                    {editingDoc ? 'Editare Document Vehicul' : 'Înregistrare Document Vehicul'}
                  </h3>
                  <p className="text-xs text-sage-600 font-medium">
                    Evidență ITP, RCA, Rovinietă, Tahograf, CASCO &amp; autorizații
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDocModal(false);
                  setEditingDoc(null);
                }}
                className="text-sage-400 hover:text-sapphire-900 p-1 rounded-lg hover:bg-morning-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-3.5 text-xs">
              {/* Selector Vehicul cu Recunoaștere Automată la Editare */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sage-700 font-bold block text-xs">
                    {editingDoc ? 'Vehicul / Nr. Înmatriculare:' : 'Selectează Vehicul / Utilaj: *'}
                  </label>
                  {editingDoc && (
                    <button
                      type="button"
                      onClick={() => setCanChangeVehicul(!canChangeVehicul)}
                      className="text-[11px] font-bold text-sapphire-600 hover:underline cursor-pointer"
                    >
                      {canChangeVehicul ? 'Păstrează vehiculul curent' : 'Schimbă alt vehicul'}
                    </button>
                  )}
                </div>

                {editingDoc && !canChangeVehicul ? (
                  (() => {
                    const currentVehicul = editingDoc.vehicul || vehicule.find((v) => v.id === formVehiculId);
                    const plate = currentVehicul?.numarInmatriculare || currentVehicul?.numarIntern || '—';
                    const intern = currentVehicul?.numarIntern;
                    const descriere = [currentVehicul?.marca, currentVehicul?.model].filter(Boolean).join(' ');

                    return (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-morning-100 border border-morning-300 shadow-2xs">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center bg-white rounded-md border-2 border-slate-700 shadow-xs overflow-hidden">
                            <div className="bg-blue-700 text-white font-black text-[9px] px-1.5 py-1.5 flex items-center justify-center leading-none">
                              <span>RO</span>
                            </div>
                            <span className="font-mono font-black text-sm text-slate-900 px-3 py-1 tracking-wider uppercase">
                              {plate}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-black text-sapphire-900">
                              {intern && intern !== plate ? `${intern} ` : ''}
                              {descriere ? `(${descriere})` : ''}
                            </p>
                            <p className="text-[11px] text-sage-600 font-semibold">
                              Categorie: <span className="font-bold text-slate-700">{currentVehicul?.categorieEnum || 'Utilaj'}</span>
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-700 mr-0.5" />
                          <span>Recunoscut</span>
                        </span>
                      </div>
                    );
                  })()
                ) : (
                  <select
                    required
                    value={formVehiculId}
                    onChange={(e) => setFormVehiculId(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold cursor-pointer"
                  >
                    <option value="">Alege vehiculul...</option>
                    {vehiculeSortate.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.numarIntern || v.numarInmatriculare}
                        {v.numarInmatriculare && v.numarInmatriculare !== v.numarIntern ? ` (${v.numarInmatriculare})` : ''} — {v.categorieEnum || 'Utilaj'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tip Document + Serie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sage-700 font-bold">Tip Document: *</label>
                    <button
                      type="button"
                      onClick={openAddTipModal}
                      className="text-[11px] font-bold text-sapphire-600 hover:underline flex items-center space-x-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tip Nou</span>
                    </button>
                  </div>
                  {(() => {
                    const selVehCat =
                      editingDoc?.vehicul?.categorieEnum ||
                      vehicule.find((v) => v.id === formVehiculId)?.categorieEnum;
                    const applicableTips = tipuriDocumente.filter((t) => isTipApplicableToCategory(t, selVehCat));
                    const otherTips = tipuriDocumente.filter((t) => !isTipApplicableToCategory(t, selVehCat));

                    return (
                      <select
                        value={formTip}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormTip(val);
                          const tipObj = tipuriDocumente.find((t) => t.cod === val);
                          if (!editingDoc && tipObj?.zileAvertizare) {
                            setFormZileAvertizare(tipObj.zileAvertizare);
                          }
                        }}
                        className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                      >
                        {selVehCat && otherTips.length > 0 ? (
                          <>
                            {applicableTips.length > 0 && (
                              <optgroup label={`Aplicabile categoriei ${selVehCat}`}>
                                {applicableTips.map((t) => (
                                  <option key={t.cod} value={t.cod}>
                                    {t.cod} — {t.label || t.cod}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Alte tipuri (opțional)">
                              {otherTips.map((t) => (
                                <option key={t.cod} value={t.cod}>
                                  {t.cod} — {t.label || t.cod}
                                </option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          tipuriDocumente.map((t) => (
                            <option key={t.cod} value={t.cod}>
                              {t.cod} — {t.label || t.cod}
                            </option>
                          ))
                        )}
                        <option value="ALTELE">Alt Document Specific</option>
                      </select>
                    );
                  })()}
                </div>

                {formTip === 'ALTELE' ? (
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Denumire Document Specific: *</label>
                    <input
                      type="text"
                      required
                      value={formTipCustom}
                      onChange={(e) => setFormTipCustom(e.target.value)}
                      placeholder="ex: Autorizație ISCIR, Certificat ADR"
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Serie / Număr Document:</label>
                    <input
                      type="text"
                      value={formSerie}
                      onChange={(e) => setFormSerie(e.target.value)}
                      placeholder="ex: RO12345678, Poliță nr. 987654"
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                    />
                  </div>
                )}
              </div>

              {formTip === 'ALTELE' && (
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Serie / Număr Document:</label>
                  <input
                    type="text"
                    value={formSerie}
                    onChange={(e) => setFormSerie(e.target.value)}
                    placeholder="ex: RO12345678, Poliță nr. 987654"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>
              )}

              {/* Emitent & Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Emitent / Companie:</label>
                  <input
                    type="text"
                    value={formEmitent}
                    onChange={(e) => setFormEmitent(e.target.value)}
                    placeholder="ex: Omniasig, RAR, CNAIR, Groupama"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cost (RON):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="ex: 450.00"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Date + Presets */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-sage-600">Preset expirare rapid:</span>
                  <div className="flex items-center space-x-1.5">
                    {[
                      { label: '+6 Luni', months: 6 },
                      { label: '+1 An', months: 12 },
                      { label: '+2 Ani', months: 24 },
                    ].map((preset) => (
                      <button
                        key={preset.months}
                        type="button"
                        onClick={() => setQuickExpiryMonths(preset.months)}
                        className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 border border-morning-200 font-bold text-sapphire-900 text-[11px] transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Data Emiterii:</label>
                    <input
                      type="date"
                      value={formDataEmitere}
                      onChange={(e) => setFormDataEmitere(e.target.value)}
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Data Expirării: *</label>
                    <input
                      type="date"
                      required
                      value={formDataExpirare}
                      onChange={(e) => setFormDataExpirare(e.target.value)}
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Preaviz (Zile):</label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={formZileAvertizare}
                      onChange={(e) => setFormZileAvertizare(Number(e.target.value))}
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-terracotta-700 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Fișier Scanat */}
              <div className="p-3 bg-morning-50 border border-morning-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sage-700 font-bold flex items-center space-x-1">
                    <Paperclip className="w-3.5 h-3.5 text-sapphire-600" />
                    <span>Copie Scanată / PDF Document:</span>
                  </label>
                  <span className="text-[10px] text-sage-500 font-mono">Max 25 MB • PDF, JPG, PNG</span>
                </div>

                {formFisierUrl ? (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-sapphire-900 truncate max-w-[240px]">
                          {formFisierNume || 'Fișier atașat'}
                        </p>
                        {formFisierMarime && (
                          <p className="text-[10px] text-sage-600 font-mono">
                            {(formFisierMarime / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <a
                        href={`${API_BASE_URL}${formFisierUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-sapphire-50 text-sapphire-700 border border-sapphire-200 font-bold text-[11px] flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Deschide</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          if (editingDoc?.id) {
                            handleDeleteFisier(editingDoc.id, formFisierNume || 'Fișier atașat');
                          } else {
                            setFormFisierUrl('');
                            setFormFisierNume('');
                            setFormFisierMarime(null);
                          }
                        }}
                        className="p-1.5 text-terracotta-600 hover:bg-roseash-100 rounded-lg transition cursor-pointer"
                        title="Elimină atașamentul"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="px-3.5 py-2 rounded-xl bg-white border border-morning-300 hover:bg-morning-100 text-sapphire-900 font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-sapphire-600" />
                      <span>{uploadingFile ? 'Se încarcă...' : 'Încarcă Fișier (PDF / Imagine)'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Observații */}
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații:</label>
                <textarea
                  rows={2}
                  value={formObservatii}
                  onChange={(e) => setFormObservatii(e.target.value)}
                  placeholder="ex: Plata în 2 rate, exemplar în cabina șoferului"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-morning-200">
                {editingDoc ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteDoc(
                        editingDoc.id,
                        `${editingDoc.tipDocument} - ${editingDoc.vehicul?.numarInmatriculare || editingDoc.vehicul?.numarIntern || ''}`,
                      )
                    }
                    className="px-3.5 py-2 rounded-xl bg-roseash-100 hover:bg-roseash-200 text-terracotta-700 font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Șterge Document</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDocModal(false);
                      setEditingDoc(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                  >
                    {editingDoc ? 'Salvează Modificările' : 'Înregistrează Document'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL ADĂUGARE / EDITARE TIP DOCUMENT & CATEGORII VEHICULE            */}
      {/* ===================================================================== */}
      {showTipModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-sapphire-500" />
                <span>{editingTipCod ? `Configurare Tip Act: ${editingTipCod}` : '+ Tip Nou de Document'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTipModal(false);
                  setEditingTipCod(null);
                }}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTipDocument} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">
                    Cod Unic Document: *
                  </label>
                  <input
                    required
                    disabled={Boolean(editingTipCod)}
                    value={tipFormCod}
                    onChange={(e) => setTipFormCod(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                    placeholder="ex: AGREERE_ADR"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold uppercase disabled:opacity-65"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preaviz Alertă Scadență (Zile):</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={tipFormZile}
                    onChange={(e) => setTipFormZile(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-terracotta-700 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Completă: *</label>
                <input
                  required
                  value={tipFormLabel}
                  onChange={(e) => setTipFormLabel(e.target.value)}
                  placeholder="ex: Certificat Agreere ADR Transport"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere (Opțional):</label>
                <textarea
                  rows={2}
                  value={tipFormDescriere}
                  onChange={(e) => setTipFormDescriere(e.target.value)}
                  placeholder="ex: Necesar pentru transporturi speciale"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-medium"
                />
              </div>

              {/* MULTI-SELECT CATEGORII VEHICULE */}
              <div className="p-3.5 rounded-2xl bg-morning-50 border border-morning-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-sapphire-900 text-xs">
                      Categorii de Vehicule unde se aplică acest act
                    </p>
                    <p className="text-[11px] text-sage-600">
                      Categoriile nebifate nu vor afișa „+ Lipsă” în Matrice și nu vor genera sloturi la Inițializare Rapidă (ex: excavatoare fără ITP/RCA, camioane fără Rovinietă).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-sapphire-100 text-sapphire-800 shrink-0 self-start">
                    {tipFormCategorii.includes('TOATE')
                      ? `Toate (${allCategoryOptions.length})`
                      : `${tipFormCategorii.length} / ${allCategoryOptions.length}`}
                  </span>
                </div>

                {/* Preseturi Rapide */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTipFormCategorii(['TOATE'])}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      tipFormCategorii.includes('TOATE')
                        ? 'bg-sapphire-500 text-white border-sapphire-500'
                        : 'bg-white text-slate-700 border-morning-300 hover:bg-morning-100'
                    }`}
                  >
                    Toate categoriile
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTipFormCategorii(
                        allCategoryOptions.map((c) => c.cod).filter((c) => !OFF_ROAD_CATEGORIES.has(c)),
                      )
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-white text-slate-700 border-morning-300 hover:bg-sapphire-50 transition cursor-pointer"
                  >
                    Doar Rutiere (fără șantier)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTipFormCategorii(
                        allCategoryOptions.map((c) => c.cod).filter((c) => LIGHT_ROAD_CATEGORIES.has(c)),
                      )
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-white text-slate-700 border-morning-300 hover:bg-amber-50 transition cursor-pointer"
                  >
                    Auto &amp; Autoutilitare (Toll-Ro / Rovinietă)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTipFormCategorii(
                        allCategoryOptions.map((c) => c.cod).filter((c) => TRUCK_CATEGORIES.has(c)),
                      )
                    }
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-white text-slate-700 border-morning-300 hover:bg-emerald-50 transition cursor-pointer"
                  >
                    Doar Camioane &amp; Cap Tractor
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipFormCategorii([])}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-white text-terracotta-700 border-roseash-300 hover:bg-roseash-50 transition cursor-pointer"
                  >
                    Deselectează tot
                  </button>
                </div>

                {/* Grilă Categorii Selectabile */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
                  {allCategoryOptions.map((cat) => {
                    const isChecked =
                      tipFormCategorii.includes('TOATE') || tipFormCategorii.includes(cat.cod);
                    return (
                      <button
                        key={cat.cod}
                        type="button"
                        onClick={() => toggleTipCategory(cat.cod)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-left transition cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-extrabold shadow-2xs'
                            : 'bg-white border-morning-200 text-slate-500 font-semibold hover:bg-morning-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span
                            className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-morning-300'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </span>
                          <span className="truncate text-[11px]">{cat.cod}</span>
                        </div>
                        <span className="text-[10px] font-mono opacity-70 ml-1 shrink-0">{cat.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowTipModal(false);
                    setEditingTipCod(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  {editingTipCod ? 'Salvează Categoriile & Datele' : 'Salvează Tip Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL PREVIZUALIZARE FIȘIER SCANAT (PDF & IMAGINE)                     */}
      {/* ===================================================================== */}
      {previewFisier && (() => {
        const isPdf =
          previewFisier.url.toLowerCase().split('?')[0].endsWith('.pdf') ||
          previewFisier.nume.toLowerCase().endsWith('.pdf');
        const isImage =
          /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFisier.url.split('?')[0]) ||
          /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFisier.nume);

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6"
            onClick={() => setPreviewFisier(null)}
          >
            <div
              className="bg-white rounded-2xl p-4 w-full max-w-5xl h-[88vh] flex flex-col space-y-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-morning-200 pb-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${isPdf ? 'bg-rose-50 text-rose-600' : isImage ? 'bg-indigo-50 text-indigo-600' : 'bg-morning-100 text-slate-700'}`}>
                    {isPdf ? <FileText className="w-5 h-5" /> : isImage ? <ImageIcon className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                  </div>
                  <div className="truncate">
                    <h3 className="font-black text-sapphire-900 text-sm md:text-base truncate">
                      {previewFisier.nume}
                    </h3>
                    {(previewFisier.vehiculNumar || previewFisier.tipDocument) && (
                      <p className="text-[11px] font-bold text-sage-500 uppercase tracking-wider">
                        {previewFisier.vehiculNumar && <span>{previewFisier.vehiculNumar}</span>}
                        {previewFisier.vehiculNumar && previewFisier.tipDocument && <span> • </span>}
                        {previewFisier.tipDocument && <span>{previewFisier.tipDocument}</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 md:space-x-2 shrink-0">
                  <a
                    href={previewFisier.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold transition flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Deschide separat</span>
                  </a>

                  <a
                    href={previewFisier.url}
                    download={previewFisier.nume}
                    className="px-3 py-1.5 rounded-xl bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 text-xs font-bold transition flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Descarcă</span>
                  </a>

                  {previewFisier.docId && (
                    <button
                      type="button"
                      disabled={isDeletingFisier}
                      onClick={() => previewFisier.docId && handleDeleteFisier(previewFisier.docId, previewFisier.nume)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-terracotta-700 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-terracotta-600" />
                      <span className="hidden sm:inline">Șterge Fișier</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPreviewFisier(null)}
                    className="p-1.5 text-sage-400 hover:text-sapphire-900 rounded-lg hover:bg-morning-100 transition ml-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-morning-200 p-1 relative">
                {isPdf ? (
                  <iframe
                    src={`${previewFisier.url}#toolbar=1&navpanes=0`}
                    className="w-full h-full rounded-lg border-0 bg-white"
                    title={previewFisier.nume}
                  />
                ) : isImage ? (
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-2 bg-slate-900/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewFisier.url}
                      alt={previewFisier.nume}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="text-center p-6 max-w-md">
                    <FileText className="w-12 h-12 text-sapphire-400 mx-auto mb-3" />
                    <h4 className="font-bold text-sapphire-900 mb-1">{previewFisier.nume}</h4>
                    <p className="text-xs text-sage-600 mb-4">
                      Previzualizarea directă nu este suportată pentru acest format de fișier.
                    </p>
                    <a
                      href={previewFisier.url}
                      download={previewFisier.nume}
                      className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descarcă fișierul</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default function DocumenteVehiculePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Se încarcă Documente Flotă...</div>}>
      <DocumenteFlotaContent />
    </Suspense>
  );
}
