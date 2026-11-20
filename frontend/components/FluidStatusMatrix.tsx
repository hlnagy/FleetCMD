"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  Edit3,
  Gauge,
  Info,
  Layers,
  Plus,
  Wrench,
  X,
} from 'lucide-react';
import { getCategoryColor } from '@/lib/categoryColors';
import { TipFluidDef } from '@/lib/fluids';

export interface FlotaFluidRow {
  vehiculId: string;
  vehiculNumarIntern?: string | null;
  vehiculInmatriculare?: string | null;
  vehiculCategorie?: string | null;
  vehiculMarca?: string | null;
  vehiculModel?: string | null;
  valoareContorCurent?: number | null;
  areContorDualMth?: boolean;
  oreFunctionareCurent?: number | null;
  tipMasurare?: string | null;
  tipLichid: string;
  trackingMode?: 'MTH' | 'KM' | 'LUNI' | string;
  unitateMasura?: 'mTH' | 'KM' | string;
  currentContor?: number | null;
  ultimulSchimbContor?: number | null;
  ultimulSchimbData?: string | null;
  ultimulSchimbEstimat?: boolean;
  intervalPrincipal?: number | null;
  intervalKm?: number | null;
  intervalMth?: number | null;
  intervalLuni?: number | null;
  pragPrincipal?: number | null;
  pragAvertizareKm?: number | null;
  pragAvertizareMth?: number | null;
  pragAvertizareLuni?: number | null;
  rulajEfectiv?: number | null;
  rulajRamas?: number | null;
  procentConsum?: number | null;
  luniTrecute?: number | null;
  luniRamase?: number | null;
  esteDepasit?: boolean;
  esteInPragAvertizare?: boolean;
  motivAvertisment?: string | null;
  totalLitriCompletati?: number | null;
}

export interface FluidMatrixActionOpts {
  vehiculId: string;
  tipLichid?: string;
  tipOperatiune?: string;
}

interface FluidStatusMatrixProps {
  flotaFluide: FlotaFluidRow[];
  tipuriFluide: TipFluidDef[];
  tipLichidLabels: Record<string, string>;
  searchQuery: string;
  filterStatus: 'TOATE' | 'PROBLEME' | 'DEPASIT' | 'AVERTIZARE' | 'OPTIM';
  filterTip: string;
  filterCategorie: string;
  filterUnit: 'TOATE' | 'KM' | 'MTH' | 'LUNI';
  columnMode: 'GROUPED' | 'EXACT';
  onOpenCompletare: (opts: FluidMatrixActionOpts) => void;
  onOpenBaseline: (row: FlotaFluidRow) => void;
}

interface MatrixColumnDef {
  key: string;
  title: string;
  subtitle: string;
  isGrouped: boolean;
}

interface VehicleMatrixRow {
  vehiculId: string;
  numarIntern: string;
  numarInmatriculare: string;
  categorie: string;
  marca: string;
  model: string;
  valoareContorCurent: number;
  areContorDualMth: boolean;
  oreFunctionareCurent: number;
  tipMasurare: string;
  allNorms: FlotaFluidRow[];
  visibleNorms: FlotaFluidRow[];
  cells: Record<string, FlotaFluidRow[]>;
  overdueCount: number;
  warnCount: number;
  unsetMthCount: number;
  maxProcent: number;
  worstRank: number; // 0 = depasit, 1 = avertizare, 2 = optim
}

const FUNCTIONAL_SLOTS: { key: string; title: string; subtitle: string }[] = [
  { key: 'SLOT_MOTOR', title: 'Ulei Motor', subtitle: '15W40 / Turisme' },
  { key: 'SLOT_HIDRAULIC', title: 'Ulei Hidraulic', subtitle: 'Sisteme hidraulice' },
  { key: 'SLOT_CUTIE', title: 'Cutie / Transmisie', subtitle: 'Cutii viteze & powershift' },
  { key: 'SLOT_AXE_DIF', title: 'Axe / Dif. / Grupuri', subtitle: 'Diferențiale, punți, grupuri' },
  { key: 'SLOT_ROTIRE_UNGERE', title: 'Rotire / Ungere', subtitle: 'Reductoare rotire & concasor' },
  { key: 'SLOT_ALTELE', title: 'Alte Fluide', subtitle: 'Antigel / AdBlue / Extra' },
];

const SHORT_OIL_TAGS: Record<string, string> = {
  ULEI_MOTOR_15W40: '15W40',
  ULEI_MOTOR_TURISME: 'TURISME',
  ULEI_HIDRAULIC: 'HIDRAULIC',
  ULEI_HIDRAULIC_CONCASOR: 'HIDR. CONC.',
  ULEI_CUTIE_VITEZA: 'CUTIE VITEZE',
  ULEI_CUTIE_DIF_80W90_GL5: '80W90 GL5',
  ULEI_DIFERENTIAL: 'DIFERENȚIAL',
  ULEI_AXE_10W_KOM: 'AXE 10W KOM',
  ULEI_CUTIE_KOM: 'CUTIE KOM',
  ULEI_AXE_LIEB: 'AXE LIEB',
  ULEI_CUTIE_LIEB: 'CUTIE LIEB',
  ULEI_ROTIRE_KOM: 'ROTIRE KOM',
  ULEI_GRUPURI_KOM: 'GRUPURI KOM',
  ULEI_ROTIRE_LIEB: 'ROTIRE LIEB',
  ULEI_GRUPURI_LIEB: 'GRUPURI LIEB',
  ULEI_DE_UNGERE_CONCASOR: 'UNGERE CONC.',
  ANTIGEL_G12: 'ANTIGEL G12+',
  ANTIGEL_G11: 'ANTIGEL G11',
  ADBLUE: 'ADBLUE',
};

const naturalCompare = (a?: string | null, b?: string | null) =>
  String(a || '').localeCompare(String(b || ''), 'ro', { numeric: true, sensitivity: 'base' });

export function getShortOilTag(tipLichid: string, tipLichidLabels: Record<string, string>): string {
  const known = SHORT_OIL_TAGS[tipLichid];
  if (known) return known;
  const full = tipLichidLabels[tipLichid] || tipLichid.replace(/_/g, ' ');
  return full.replace(/^ULEI\s+/i, '').trim() || full;
}

function resolveFunctionalSlotKey(tipLichid: string, vehicleNormCodes: Set<string>): string {
  const code = String(tipLichid || '').toUpperCase();
  if (code.includes('MOTOR')) return 'SLOT_MOTOR';
  if (code.includes('HIDRAULIC')) return 'SLOT_HIDRAULIC';
  if (code === 'ULEI_CUTIE_DIF_80W90_GL5') {
    // Pe CAP_TRACTOR există ULEI_CUTIE_VITEZA dedicat -> 80W90 GL5 merge pe slotul Diferențial.
    // Pe CAMION_8X4 există ULEI_DIFERENTIAL dedicat -> 80W90 GL5 merge pe slotul Cutie / Transmisie.
    return vehicleNormCodes.has('ULEI_CUTIE_VITEZA') ? 'SLOT_AXE_DIF' : 'SLOT_CUTIE';
  }
  if (code.includes('CUTIE') || code.includes('TRANSMISIE')) return 'SLOT_CUTIE';
  if (code.includes('AXE') || code.includes('PUNTE') || code.includes('DIF') || code.includes('GRUPURI')) {
    return 'SLOT_AXE_DIF';
  }
  if (code.includes('ROTIRE') || code.includes('UNGERE')) return 'SLOT_ROTIRE_UNGERE';
  return 'SLOT_ALTELE';
}

function isUnsetDualMth(row: FlotaFluidRow): boolean {
  return (
    Boolean(row.areContorDualMth) &&
    row.trackingMode === 'MTH' &&
    Number(row.currentContor ?? row.oreFunctionareCurent ?? 0) === 0 &&
    Number(row.ultimulSchimbContor ?? 0) === 0 &&
    !row.esteDepasit
  );
}

function addMonthsToDate(isoDate?: string | null, months?: number | null): Date | null {
  if (!isoDate || !months || months <= 0) return null;
  const base = new Date(isoDate);
  if (Number.isNaN(base.getTime())) return null;
  const due = new Date(base.getTime());
  due.setMonth(due.getMonth() + Number(months));
  return due;
}

function formatRoDate(value?: string | Date | null): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ro-RO');
}

function formatNumberRo(val: number | null | undefined, maxDecimals = 1): string {
  const num = Number(val ?? 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('ro-RO', { maximumFractionDigits: maxDecimals });
}

function getNormUrgencyScore(row: FlotaFluidRow): number {
  // Valoare mai mică = mai urgentă (apare prima la sortare ascendentă)
  if (row.esteDepasit) {
    const pct = Number(row.procentConsum ?? 100);
    return -1000 - Math.max(0, pct);
  }
  if (row.esteInPragAvertizare) {
    const pct = Number(row.procentConsum ?? 90);
    return -500 - Math.max(0, pct);
  }
  if (isUnsetDualMth(row)) {
    return 500; // Grupat curat după normele active normale
  }
  const pct = Number(row.procentConsum ?? 0);
  return 100 - pct;
}

function formatColumnNormInterval(rows: FlotaFluidRow[]): string {
  const intervals = new Set<string>();
  rows.forEach((r) => {
    if (r.trackingMode === 'LUNI' && r.intervalLuni) {
      intervals.add(`${r.intervalLuni} luni`);
    } else if (r.intervalPrincipal) {
      intervals.add(`${formatNumberRo(r.intervalPrincipal, 0)} ${r.unitateMasura || 'KM'}`);
    }
  });
  if (intervals.size === 1) {
    return `Normă: ${Array.from(intervals)[0]}`;
  }
  return `${rows.length} utilaje`;
}

export default function FluidStatusMatrix({
  flotaFluide,
  tipuriFluide,
  tipLichidLabels,
  searchQuery,
  filterStatus,
  filterTip,
  filterCategorie,
  filterUnit,
  columnMode,
  onOpenCompletare,
  onOpenBaseline,
}: FluidStatusMatrixProps) {
  const [sortCol, setSortCol] = useState<string>('vehicul');
  const [vehSortMode, setVehSortMode] = useState<'urgenta' | 'abc' | 'categorie'>('urgenta');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [inspectedRow, setInspectedRow] = useState<FlotaFluidRow | null>(null);

  // Închide modalul de detalii celulă cu tasta Escape
  useEffect(() => {
    if (!inspectedRow) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectedRow(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspectedRow]);

  // Ordinea canonică a tipurilor de fluid (pentru coloane consistente)
  const tipOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    tipuriFluide.forEach((tf, idx) => {
      map.set(tf.cod, tf.ordine ?? idx + 1);
    });
    return map;
  }, [tipuriFluide]);

  // Dacă este filtrată o categorie sau un tip anume, afișăm direct coloanele exacte de ulei
  const useExactColumns =
    columnMode === 'EXACT' || filterCategorie !== 'TOATE' || filterTip !== 'TOATE';

  // Filtrare norme la nivel de unitate & tip (păstrăm contextul celorlalte norme de pe același vehicul când filtrăm doar după stare!)
  const matchesFluidAndUnit = (f: FlotaFluidRow): boolean => {
    if (filterTip !== 'TOATE' && f.tipLichid !== filterTip) return false;
    if (filterUnit === 'MTH') {
      return f.trackingMode === 'MTH' || ((f.unitateMasura || '').toUpperCase() === 'MTH' && f.trackingMode !== 'LUNI');
    }
    if (filterUnit === 'KM') {
      return f.trackingMode === 'KM' || ((f.unitateMasura || '').toUpperCase() === 'KM' && f.trackingMode !== 'LUNI');
    }
    if (filterUnit === 'LUNI') {
      return f.trackingMode === 'LUNI';
    }
    return true;
  };

  // 1. Grupăm normele pe vehicul și filtrăm vehiculele
  const { columns, vehicleRows } = useMemo(() => {
    const byVehicle = new Map<string, FlotaFluidRow[]>();
    flotaFluide.forEach((row) => {
      if (!byVehicle.has(row.vehiculId)) byVehicle.set(row.vehiculId, []);
      byVehicle.get(row.vehiculId)!.push(row);
    });

    const q = searchQuery.trim().toLowerCase();

    // Construim lista inițială de vehicule eligibile
    const rawVehicles: Omit<VehicleMatrixRow, 'cells'>[] = [];
    byVehicle.forEach((norms, vehiculId) => {
      const sample = norms[0];
      if (!sample) return;

      const categorie = sample.vehiculCategorie || '';
      if (filterCategorie !== 'TOATE' && categorie !== filterCategorie) return;

      const visibleNorms = norms.filter(matchesFluidAndUnit);
      if (visibleNorms.length === 0) return;

      if (q) {
        const haystack = [
          sample.vehiculNumarIntern,
          sample.vehiculInmatriculare,
          sample.vehiculMarca,
          sample.vehiculModel,
          categorie,
          ...visibleNorms.map((n) => tipLichidLabels[n.tipLichid] || n.tipLichid),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return;
      }

      let overdueCount = 0;
      let warnCount = 0;
      let unsetMthCount = 0;
      let maxProcent = 0;

      visibleNorms.forEach((n) => {
        if (n.esteDepasit) overdueCount++;
        else if (n.esteInPragAvertizare) warnCount++;
        if (isUnsetDualMth(n)) unsetMthCount++;
        const pct = Number(n.procentConsum ?? 0);
        if (pct > maxProcent) maxProcent = pct;
      });

      if (filterStatus === 'DEPASIT' && overdueCount === 0) return;
      if (filterStatus === 'AVERTIZARE' && warnCount === 0) return;
      if (filterStatus === 'PROBLEME' && overdueCount === 0 && warnCount === 0) return;
      if (filterStatus === 'OPTIM' && (overdueCount > 0 || warnCount > 0)) return;

      const worstRank = overdueCount > 0 ? 0 : warnCount > 0 ? 1 : 2;

      rawVehicles.push({
        vehiculId,
        numarIntern: sample.vehiculNumarIntern || sample.vehiculInmatriculare || 'FĂRĂ COD',
        numarInmatriculare: sample.vehiculInmatriculare || '',
        categorie,
        marca: sample.vehiculMarca || '',
        model: sample.vehiculModel || '',
        valoareContorCurent: Number(sample.valoareContorCurent || 0),
        areContorDualMth: Boolean(sample.areContorDualMth),
        oreFunctionareCurent: Number(sample.oreFunctionareCurent || 0),
        tipMasurare: sample.tipMasurare || 'KM',
        allNorms: norms,
        visibleNorms,
        overdueCount,
        warnCount,
        unsetMthCount,
        maxProcent,
        worstRank,
      });
    });

    // 2. Construim coloanele matricei (dinamic în funcție de modul exact sau grupat)
    let cols: MatrixColumnDef[] = [];

    if (useExactColumns) {
      const tipRowsMap = new Map<string, FlotaFluidRow[]>();
      rawVehicles.forEach((v) => {
        v.visibleNorms.forEach((n) => {
          if (!tipRowsMap.has(n.tipLichid)) tipRowsMap.set(n.tipLichid, []);
          tipRowsMap.get(n.tipLichid)!.push(n);
        });
      });

      const sortedTips = Array.from(tipRowsMap.keys()).sort((a, b) => {
        const oa = tipOrderMap.get(a) ?? 999;
        const ob = tipOrderMap.get(b) ?? 999;
        if (oa !== ob) return oa - ob;
        return naturalCompare(tipLichidLabels[a] || a, tipLichidLabels[b] || b);
      });

      cols = sortedTips.map((cod) => {
        const rowsForTip = tipRowsMap.get(cod) || [];
        return {
          key: cod,
          title: tipLichidLabels[cod] || cod.replace(/_/g, ' '),
          subtitle: formatColumnNormInterval(rowsForTip),
          isGrouped: false,
        };
      });
    } else {
      const slotCounts = new Map<string, number>();
      rawVehicles.forEach((v) => {
        const normCodes = new Set(v.allNorms.map((n) => n.tipLichid));
        const seenSlots = new Set<string>();
        v.visibleNorms.forEach((n) => {
          const slotKey = resolveFunctionalSlotKey(n.tipLichid, normCodes);
          if (!seenSlots.has(slotKey)) {
            seenSlots.add(slotKey);
            slotCounts.set(slotKey, (slotCounts.get(slotKey) || 0) + 1);
          }
        });
      });

      cols = FUNCTIONAL_SLOTS.filter((slot) => (slotCounts.get(slot.key) || 0) > 0).map((slot) => ({
        key: slot.key,
        title: slot.title,
        subtitle: `${slotCounts.get(slot.key) || 0} utilaje`,
        isGrouped: true,
      }));
    }

    // 3. Populăm celulele fiecărui vehicul
    const builtRows: VehicleMatrixRow[] = rawVehicles.map((v) => {
      const cells: Record<string, FlotaFluidRow[]> = {};
      const normCodes = new Set(v.allNorms.map((n) => n.tipLichid));
      v.visibleNorms.forEach((n) => {
        const colKey = useExactColumns ? n.tipLichid : resolveFunctionalSlotKey(n.tipLichid, normCodes);
        if (!cells[colKey]) cells[colKey] = [];
        cells[colKey].push(n);
      });
      // Ordonăm în interiorul celulei după urgență dacă vreodată sunt mai multe norme în același slot
      Object.keys(cells).forEach((k) => {
        if (cells[k].length > 1) {
          cells[k].sort((a, b) => getNormUrgencyScore(a) - getNormUrgencyScore(b));
        }
      });
      return { ...v, cells };
    });

    // 4. Sortare matrice
    const activeSortCol = sortCol !== 'vehicul' && !cols.some((c) => c.key === sortCol) ? 'vehicul' : sortCol;

    const sortedRows = [...builtRows].sort((a, b) => {
      if (activeSortCol === 'vehicul') {
        if (vehSortMode === 'urgenta') {
          if (a.worstRank !== b.worstRank) return a.worstRank - b.worstRank;
          if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
          if (a.warnCount !== b.warnCount) return b.warnCount - a.warnCount;
          if (a.maxProcent !== b.maxProcent) return b.maxProcent - a.maxProcent;
          return naturalCompare(a.numarIntern, b.numarIntern);
        }
        if (vehSortMode === 'categorie') {
          const catCmp = naturalCompare(a.categorie, b.categorie);
          if (catCmp !== 0) return catCmp;
          return naturalCompare(a.numarIntern, b.numarIntern);
        }
        return naturalCompare(a.numarIntern, b.numarIntern);
      }

      const cellA = a.cells[activeSortCol]?.[0];
      const cellB = b.cells[activeSortCol]?.[0];
      if (!cellA && !cellB) return naturalCompare(a.numarIntern, b.numarIntern);
      if (!cellA) return 1;
      if (!cellB) return -1;

      const scoreA = getNormUrgencyScore(cellA);
      const scoreB = getNormUrgencyScore(cellB);
      if (scoreA !== scoreB) {
        return sortDir === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      }
      return naturalCompare(a.numarIntern, b.numarIntern);
    });

    return { columns: cols, vehicleRows: sortedRows };
  }, [
    flotaFluide,
    searchQuery,
    filterCategorie,
    filterTip,
    filterUnit,
    filterStatus,
    useExactColumns,
    tipOrderMap,
    tipLichidLabels,
    sortCol,
    vehSortMode,
    sortDir,
  ]);

  const handleCycleVehicleSort = () => {
    if (sortCol !== 'vehicul') {
      setSortCol('vehicul');
      setVehSortMode('urgenta');
      return;
    }
    setVehSortMode((prev) => (prev === 'urgenta' ? 'abc' : prev === 'abc' ? 'categorie' : 'urgenta'));
  };

  const handleSortFluidColumn = (colKey: string) => {
    if (sortCol !== colKey) {
      setSortCol(colKey);
      setSortDir('asc');
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    }
  };

  const renderCellPill = (row: FlotaFluidRow, isGroupedCol: boolean) => {
    const isOver = Boolean(row.esteDepasit);
    const isWarn = !isOver && Boolean(row.esteInPragAvertizare);
    const isUnsetMth = isUnsetDualMth(row);
    const isEstimated = Boolean(row.ultimulSchimbEstimat) && !isUnsetMth;
    const isCalendar = row.trackingMode === 'LUNI';
    const unit = row.unitateMasura || 'KM';
    const pct = Math.min(100, Math.max(0, Number(row.procentConsum ?? 0)));
    const rawPct = Math.max(0, Number(row.procentConsum ?? 0));
    const oilFullLabel = tipLichidLabels[row.tipLichid] || row.tipLichid.replace(/_/g, ' ');
    const oilShort = getShortOilTag(row.tipLichid, tipLichidLabels);
    const dueDate = isCalendar ? addMonthsToDate(row.ultimulSchimbData, row.intervalLuni) : null;

    // Linie principală (bold monospace, scanabilă instant)
    let headline = 'Monitorizat';
    let secondary = '';

    if (isUnsetMth) {
      headline = 'Setează mTH';
      secondary = `${isGroupedCol ? `${oilShort} · ` : ''}Normă ${formatNumberRo(row.intervalPrincipal, 0)} mTH`;
    } else if (isCalendar) {
      if (isOver) {
        headline = `Depășit (${formatNumberRo(row.luniTrecute, 0)} L)`;
        secondary = isGroupedCol
          ? `${oilShort} · max ${row.intervalLuni} L`
          : `Expirat: ${formatRoDate(dueDate)}`;
      } else if (isWarn) {
        headline = `În ${formatNumberRo(Math.max(0, Number(row.luniRamase ?? 0)), 1)} luni`;
        secondary = isGroupedCol
          ? `${oilShort} · ${formatRoDate(dueDate)}`
          : `Scadent: ${formatRoDate(dueDate)}`;
      } else {
        headline = dueDate ? formatRoDate(dueDate) : `${formatNumberRo(row.luniRamase, 1)} luni`;
        secondary = isGroupedCol
          ? `${oilShort} · ${formatNumberRo(Math.max(0, Number(row.luniRamase ?? 0)), 1)} L răm.`
          : `Rămas ${formatNumberRo(Math.max(0, Number(row.luniRamase ?? 0)), 1)} luni`;
      }
    } else if (row.rulajRamas !== null && row.rulajRamas !== undefined) {
      if (isOver) {
        headline = `Depășit +${formatNumberRo(Math.abs(row.rulajRamas), 0)} ${unit}`;
        secondary = isGroupedCol
          ? `${oilShort} · ${formatNumberRo(row.rulajEfectiv, 0)}/${formatNumberRo(row.intervalPrincipal, 0)}`
          : `${formatNumberRo(row.rulajEfectiv, 0)} / ${formatNumberRo(row.intervalPrincipal, 0)} ${unit}`;
      } else {
        headline = `Rămas ${formatNumberRo(row.rulajRamas, 0)} ${unit}`;
        secondary = isGroupedCol
          ? `${oilShort} · ${formatNumberRo(row.rulajEfectiv, 0)}/${formatNumberRo(row.intervalPrincipal, 0)}`
          : `${formatNumberRo(row.rulajEfectiv, 0)} / ${formatNumberRo(row.intervalPrincipal, 0)} ${unit}`;
      }
    } else {
      headline = `${formatNumberRo(row.rulajEfectiv, 0)} ${unit}`;
      secondary = oilShort;
    }

    const badgeClasses = isOver
      ? `bg-roseash-50 text-terracotta-700 border-terracotta-300 hover:bg-roseash-100${isEstimated ? ' border-dashed' : ''}`
      : isWarn
      ? `bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100${isEstimated ? ' border-dashed' : ''}`
      : isUnsetMth
      ? 'bg-morning-50 text-sage-700 border-dashed border-morning-300 hover:border-sapphire-400 hover:bg-sapphire-50 hover:text-sapphire-800'
      : isEstimated
      ? 'bg-periwinkle-50 text-periwinkle-900 border-dashed border-periwinkle-300 hover:bg-periwinkle-100'
      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';

    const barColor = isOver
      ? 'bg-terracotta-600'
      : isWarn
      ? 'bg-amber-500'
      : isEstimated
      ? 'bg-periwinkle-600'
      : 'bg-emerald-500';

    const tooltipLines = [
      `${oilFullLabel}`,
      isEstimated
        ? 'ESTIMAT (50% din normă) — fără schimb anterior în evidență; indicatorul rămâne activ până la primul schimb real'
        : '',
      isCalendar
        ? `Interval: ${row.intervalLuni || '—'} luni${isEstimated ? '' : ` · Ultimul schimb: ${formatRoDate(row.ultimulSchimbData)}`}`
        : `Interval: ${formatNumberRo(row.intervalPrincipal, 0)} ${unit} · Rulaj: ${formatNumberRo(row.rulajEfectiv, 0)} ${unit} · Curent: ${formatNumberRo(row.currentContor, 0)} ${unit}`,
      Number(row.totalLitriCompletati || 0) > 0 ? `Completări: +${row.totalLitriCompletati} L` : '',
      'Click pentru detalii, înregistrare schimb sau actualizare mTH',
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <button
        key={`${row.vehiculId}-${row.tipLichid}`}
        type="button"
        onClick={() => setInspectedRow(row)}
        title={tooltipLines}
        className={`w-full rounded-xl border px-2.5 py-2 transition flex flex-col items-stretch text-left cursor-pointer group/cell ${badgeClasses}`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center space-x-1 min-w-0">
            {isOver && <AlertTriangle className="w-3.5 h-3.5 text-terracotta-600 shrink-0" />}
            {isWarn && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
            {!isOver && !isWarn && isUnsetMth && <Gauge className="w-3.5 h-3.5 text-sage-500 group-hover/cell:text-sapphire-600 shrink-0" />}
            {!isOver && !isWarn && !isUnsetMth && isEstimated && (
              <Info className="w-3 h-3 text-periwinkle-700 shrink-0" />
            )}
            {!isOver && !isWarn && !isUnsetMth && !isEstimated && (
              isCalendar ? (
                <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              )
            )}
            <span className="font-mono font-extrabold text-[11px] tabular-nums truncate">
              {headline}
            </span>
          </div>

          {!isUnsetMth && (
            <span className="font-mono text-[9px] font-black tabular-nums opacity-85 shrink-0">
              {isEstimated ? `Est. ${rawPct}%` : `${rawPct}%`}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 mt-0.5 text-[10px] opacity-85">
          <span className="truncate font-medium">{secondary}</span>
          {Number(row.totalLitriCompletati || 0) > 0 && (
            <span className="font-mono text-[9px] font-bold shrink-0 opacity-90">
              +{row.totalLitriCompletati}L
            </span>
          )}
        </div>

        {!isUnsetMth && (
          <div className="w-full h-1 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      <div className="rounded-2xl border border-morning-200 overflow-auto max-h-[calc(100vh-140px)] shadow-xs relative bg-white">
        <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[880px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-morning-100 text-sage-700 font-extrabold uppercase tracking-wider text-[11px]">
              {/* Antet Sticky Top-Left: Vehicul & Categorie */}
              <th
                onClick={handleCycleVehicleSort}
                className={`p-3 sticky left-0 top-0 z-30 min-w-[235px] border-b border-r border-morning-200 shadow-[2px_2px_6px_-2px_rgba(0,0,0,0.08)] cursor-pointer select-none transition group ${
                  sortCol === 'vehicul'
                    ? 'bg-morning-200 text-sapphire-950 font-black'
                    : 'bg-morning-100 hover:bg-morning-200'
                }`}
                title="Apasă pentru a schimba sortarea: Urgență ⟷ Alfabetic (A-Z) ⟷ Categorie Flotă"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate">Vehicul &amp; Contor</span>
                  <span className="inline-flex items-center space-x-1 text-[10px] font-black tracking-normal px-2 py-0.5 rounded-md bg-white border border-morning-300 text-sapphire-800 shadow-2xs shrink-0">
                    {sortCol === 'vehicul' && vehSortMode === 'urgenta' && (
                      <>
                        <AlertTriangle className="w-3 h-3 text-terracotta-600" />
                        <span>Urgență</span>
                      </>
                    )}
                    {sortCol === 'vehicul' && vehSortMode === 'abc' && (
                      <>
                        <ArrowUp className="w-3 h-3 text-sapphire-600" />
                        <span>A-Z</span>
                      </>
                    )}
                    {sortCol === 'vehicul' && vehSortMode === 'categorie' && (
                      <>
                        <Layers className="w-3 h-3 text-sapphire-600" />
                        <span>Categorie</span>
                      </>
                    )}
                    {sortCol !== 'vehicul' && (
                      <span className="text-sage-500 font-semibold group-hover:text-sapphire-800 flex items-center space-x-1">
                        <ArrowUpDown className="w-3 h-3" />
                        <span>Sortează</span>
                      </span>
                    )}
                  </span>
                </div>
              </th>

              {/* Antete Coloane Fluide (Sticky Top) */}
              {columns.map((col) => {
                const isSorted = sortCol === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSortFluidColumn(col.key)}
                    className={`p-3 text-center min-w-[180px] sticky top-0 z-20 border-b border-morning-200 cursor-pointer select-none transition group ${
                      isSorted
                        ? 'bg-sapphire-100 border-b-2 border-b-sapphire-500 text-sapphire-950 font-black'
                        : 'bg-morning-100 hover:bg-morning-200'
                    }`}
                    title={`Sortează utilajele după starea "${col.title}"`}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span className="font-extrabold text-sapphire-900 group-hover:text-sapphire-600 transition leading-tight">
                        {col.title}
                      </span>
                      {isSorted ? (
                        <span className="inline-flex items-center text-[9px] font-black bg-sapphire-600 text-white px-1.5 py-0.5 rounded shadow-2xs shrink-0">
                          {sortDir === 'asc' ? (
                            <ArrowUp className="w-2.5 h-2.5 mr-0.5" />
                          ) : (
                            <ArrowDown className="w-2.5 h-2.5 mr-0.5" />
                          )}
                          Stare
                        </span>
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-sage-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                    <div
                      className="text-[10px] font-medium normal-case tracking-normal text-sage-500 truncate max-w-[165px] mx-auto mt-0.5"
                      title={col.subtitle}
                    >
                      {col.subtitle}
                    </div>
                  </th>
                );
              })}

              {/* Antet Acțiuni */}
              <th className="p-3 text-right min-w-[95px] sticky top-0 z-20 bg-morning-100 border-b border-morning-200">
                Acțiuni
              </th>
            </tr>
          </thead>

          <tbody className="font-medium text-slate-700">
            {vehicleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="p-10 text-center text-xs text-sage-500 font-bold border-b border-morning-200"
                >
                  Nu a fost găsit niciun vehicul conform criteriilor selectate.
                </td>
              </tr>
            ) : (
              vehicleRows.map((v) => {
                const catColor = getCategoryColor(v.categorie);
                const showPlate =
                  v.numarInmatriculare &&
                  v.numarInmatriculare.trim().toUpperCase() !== v.numarIntern.trim().toUpperCase();
                const isVehMth = (v.tipMasurare || '').toUpperCase().includes('MTH');
                const primaryNormForBaseline =
                  v.visibleNorms.find((n) => n.trackingMode === 'MTH') || v.visibleNorms[0];

                return (
                  <tr key={v.vehiculId} className="hover:bg-morning-50 transition group">
                    {/* Coloană Sticky Left: Vehicul, Categorie, Telemetrie */}
                    <td className="p-3 sticky left-0 bg-white group-hover:bg-morning-50 z-10 border-r border-b border-morning-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              v.overdueCount > 0
                                ? 'bg-terracotta-500'
                                : v.warnCount > 0
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            title={
                              v.overdueCount > 0
                                ? `${v.overdueCount} depășite`
                                : v.warnCount > 0
                                ? `${v.warnCount} în prag avertizare`
                                : 'Toate normele în parametri optimi'
                            }
                          />
                          <span className="font-mono font-black text-sapphire-900 text-xs truncate">
                            {v.numarIntern}
                          </span>
                          {showPlate && (
                            <span className="font-mono font-bold text-slate-500 text-[10px] truncate">
                              ({v.numarInmatriculare})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${catColor.badge}`}>
                          {v.categorie || 'UTILAJ'}
                        </span>
                        {v.areContorDualMth ? (
                          <span className="text-[10px] font-mono tabular-nums font-bold text-amber-700 dark:text-amber-300">
                            {formatNumberRo(v.oreFunctionareCurent, 0)} mTH · {formatNumberRo(v.valoareContorCurent, 0)} km
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono tabular-nums font-semibold text-sage-600">
                            {formatNumberRo(v.valoareContorCurent, 0)} {isVehMth ? 'mTH' : 'KM'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Celule Fluide */}
                    {columns.map((col) => {
                      const isSortedCol = sortCol === col.key;
                      const cellNorms = v.cells[col.key] || [];
                      if (cellNorms.length === 0) {
                        return (
                          <td
                            key={col.key}
                            className={`p-2 text-center border-b border-morning-200 ${
                              isSortedCol ? 'bg-sapphire-50/30' : ''
                            }`}
                            title={`Nu se aplică categoriei ${v.categorie || 'selectate'}`}
                          >
                            <span className="inline-block py-1 px-2.5 text-[11px] font-bold text-slate-400/70 select-none">
                              —
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={col.key}
                          className={`p-2 align-middle border-b border-morning-200 ${
                            isSortedCol ? 'bg-sapphire-50/30' : ''
                          }`}
                        >
                          <div className="space-y-1.5">
                            {cellNorms.map((norm) => renderCellPill(norm, col.isGrouped))}
                          </div>
                        </td>
                      );
                    })}

                    {/* Coloană Acțiuni Rapide */}
                    <td className="p-2.5 text-right border-b border-morning-200 whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1">
                        {v.areContorDualMth && primaryNormForBaseline && (
                          <button
                            type="button"
                            onClick={() => onOpenBaseline(primaryNormForBaseline)}
                            className="p-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 border border-morning-200 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold transition inline-flex items-center space-x-0.5 cursor-pointer"
                            title={`Actualizează orele mTH pentru ${v.numarIntern}`}
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>mTH</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onOpenCompletare({
                              vehiculId: v.vehiculId,
                              tipLichid: primaryNormForBaseline?.tipLichid,
                              tipOperatiune: 'SCHIMB_ULEI',
                            })
                          }
                          className="px-2 py-1.5 text-sapphire-600 hover:bg-morning-100 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                          title={`Înregistrează schimb sau completare pentru ${v.numarIntern}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Schimb</span>
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

      {/* LEGENDĂ COMPACTĂ MATRICE */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-sage-600 font-semibold">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500" />
            <span>Depășit (schimb urgent)</span>
          </span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Aproape de limită</span>
          </span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>În parametri optimi</span>
          </span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-periwinkle-500 border border-dashed border-periwinkle-700" />
            <span>Estimat 50% (fără istoric — până la primul schimb)</span>
          </span>
          <span className="inline-flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-sage-400" />
            <span>mTH neinițializat</span>
          </span>
        </div>
        <span className="text-[10px] text-sage-500">
          Click pe orice celulă pentru detalii, înregistrare schimb sau actualizare mTH
        </span>
      </div>

      {/* MODAL DETALII & ACȚIUNI RAPIDE LA CLICK PE CELULĂ */}
      {inspectedRow && (() => {
        const isOver = Boolean(inspectedRow.esteDepasit);
        const isWarn = !isOver && Boolean(inspectedRow.esteInPragAvertizare);
        const isUnsetMth = isUnsetDualMth(inspectedRow);
        const isEstimated = Boolean(inspectedRow.ultimulSchimbEstimat) && !isUnsetMth;
        const isCalendar = inspectedRow.trackingMode === 'LUNI';
        const unit = inspectedRow.unitateMasura || 'KM';
        const pct = Math.min(100, Math.max(0, Number(inspectedRow.procentConsum ?? 0)));
        const rawPct = Math.max(0, Number(inspectedRow.procentConsum ?? 0));
        const oilLabel = tipLichidLabels[inspectedRow.tipLichid] || inspectedRow.tipLichid.replace(/_/g, ' ');
        const catColor = getCategoryColor(inspectedRow.vehiculCategorie);
        const dueDate = isCalendar ? addMonthsToDate(inspectedRow.ultimulSchimbData, inspectedRow.intervalLuni) : null;
        const nextDueCounter =
          !isCalendar && inspectedRow.intervalPrincipal
            ? Number(inspectedRow.ultimulSchimbContor || 0) + Number(inspectedRow.intervalPrincipal)
            : null;
        const opDefault = String(inspectedRow.tipLichid || '').includes('ANTIGEL') ? 'SCHIMB_ANTIGEL' : 'SCHIMB_ULEI';
        const opTopUp = String(inspectedRow.tipLichid || '').includes('ANTIGEL') ? 'COMPLETARE_ANTIGEL' : 'COMPLETARE_ULEI';

        return (
          <div
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectedRow(null)}
          >
            <div
              className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-5 shadow-2xl border border-morning-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-morning-200 pb-3.5">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-base text-sapphire-900">
                      {inspectedRow.vehiculNumarIntern || inspectedRow.vehiculInmatriculare}
                    </span>
                    {inspectedRow.vehiculInmatriculare &&
                      inspectedRow.vehiculInmatriculare !== inspectedRow.vehiculNumarIntern && (
                        <span className="font-mono text-xs font-bold text-sage-600">
                          ({inspectedRow.vehiculInmatriculare})
                        </span>
                      )}
                    {inspectedRow.vehiculCategorie && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catColor.badge}`}>
                        {inspectedRow.vehiculCategorie}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Droplets className="w-4 h-4 text-sapphire-600 shrink-0" />
                    <span className="text-sm font-extrabold text-sapphire-900 truncate">{oilLabel}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {isEstimated && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-periwinkle-50 text-periwinkle-900 border border-dashed border-periwinkle-300 inline-flex items-center space-x-1">
                      <Info className="w-3 h-3" />
                      <span>ESTIMAT</span>
                    </span>
                  )}
                  {isOver ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-terracotta-600 text-white inline-flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>DEPĂȘIT</span>
                    </span>
                  ) : isWarn ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>AVERTIZARE</span>
                    </span>
                  ) : isUnsetMth ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-morning-100 text-sage-700 border border-morning-300">
                      mTH NESETAT
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>OPTIM</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setInspectedRow(null)}
                    className="p-1 text-sage-500 hover:text-sapphire-900 rounded-lg cursor-pointer"
                    aria-label="Închide fereastra"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Progres Vizual Principal */}
              <div
                className={`p-4 rounded-xl border space-y-2.5 ${
                  isOver
                    ? 'bg-roseash-50 border-terracotta-300'
                    : isWarn
                    ? 'bg-amber-50 border-amber-300'
                    : isUnsetMth
                    ? 'bg-morning-100 border-morning-300'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-mono text-lg font-black tabular-nums ${
                      isOver
                        ? 'text-terracotta-700'
                        : isWarn
                        ? 'text-amber-800'
                        : isUnsetMth
                        ? 'text-sapphire-900'
                        : 'text-emerald-800'
                    }`}
                  >
                    {isUnsetMth
                      ? 'Introduceți orele mTH curente'
                      : isCalendar
                      ? Number(inspectedRow.luniRamase ?? 0) <= 0
                        ? `Depășit (${formatNumberRo(inspectedRow.luniTrecute, 1)} / ${inspectedRow.intervalLuni} luni)`
                        : `Rămas ${formatNumberRo(Math.max(0, Number(inspectedRow.luniRamase ?? 0)), 1)} luni`
                      : inspectedRow.rulajRamas !== null && inspectedRow.rulajRamas !== undefined
                      ? inspectedRow.rulajRamas <= 0
                        ? `Depășit cu +${formatNumberRo(Math.abs(inspectedRow.rulajRamas), 0)} ${unit}`
                        : `Rămas ${formatNumberRo(inspectedRow.rulajRamas, 0)} ${unit}`
                      : 'Monitorizat'}
                  </span>
                  {!isUnsetMth && (
                    <span className="font-mono text-xs font-black text-sapphire-900 tabular-nums">
                      {rawPct}% consumat
                    </span>
                  )}
                </div>

                {!isUnsetMth && (
                  <div className="w-full h-2.5 rounded-full bg-black/10 dark:bg-white/15 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? 'bg-terracotta-600' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                )}

                {inspectedRow.motivAvertisment && (
                  <p className="text-[11px] font-bold text-sapphire-900 opacity-90">
                    {inspectedRow.motivAvertisment}
                  </p>
                )}
              </div>

              {isEstimated && (
                <div className="p-3 rounded-xl bg-periwinkle-50 border border-dashed border-periwinkle-300 text-periwinkle-900 text-xs flex items-start space-x-2.5">
                  <Info className="w-4 h-4 text-periwinkle-700 shrink-0 mt-0.5" />
                  <p className="leading-snug font-semibold">
                    Nu a existat o dată de schimb în evidența anterioară — norma a fost inițializată estimativ la{' '}
                    <span className="font-black">50% din interval</span>. Această notificare rămâne activă până la
                    înregistrarea primului schimb real.
                  </p>
                </div>
              )}

              {/* Grid Telemetrie 2x2 */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sage-600">
                    Contor Curent
                  </span>
                  <p className="font-mono font-black text-sapphire-900 text-sm tabular-nums">
                    {isCalendar
                      ? inspectedRow.areContorDualMth
                        ? `${formatNumberRo(inspectedRow.valoareContorCurent, 0)} KM`
                        : `${formatNumberRo(inspectedRow.valoareContorCurent, 0)} ${unit}`
                      : `${formatNumberRo(inspectedRow.currentContor ?? inspectedRow.valoareContorCurent, 0)} ${unit}`}
                  </p>
                  {inspectedRow.areContorDualMth && (
                    <p className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold">
                      Dual: {formatNumberRo(inspectedRow.oreFunctionareCurent, 0)} mTH ·{' '}
                      {formatNumberRo(inspectedRow.valoareContorCurent, 0)} KM
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sage-600">
                    Ultimul Schimb
                  </span>
                  <p className="font-mono font-black text-sapphire-900 text-sm tabular-nums">
                    {isEstimated
                      ? 'Estimat (50% normă)'
                      : isCalendar
                      ? formatRoDate(inspectedRow.ultimulSchimbData)
                      : `${formatNumberRo(inspectedRow.ultimulSchimbContor, 0)} ${unit}`}
                  </p>
                  <p className="text-[10px] text-sage-600 font-mono">
                    {isEstimated
                      ? 'Fără schimb înregistrat anterior'
                      : isCalendar
                      ? `${formatNumberRo(inspectedRow.luniTrecute, 1)} luni scurse`
                      : `Dată: ${formatRoDate(inspectedRow.ultimulSchimbData)}`}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sage-600">
                    Următorul Schimb
                  </span>
                  <p className="font-mono font-black text-sapphire-900 text-sm tabular-nums">
                    {isCalendar
                      ? formatRoDate(dueDate)
                      : nextDueCounter !== null
                      ? `${formatNumberRo(nextDueCounter, 0)} ${unit}`
                      : '—'}
                  </p>
                  <p className="text-[10px] text-sage-600 font-mono">
                    {isCalendar
                      ? `Normă: ${inspectedRow.intervalLuni} luni`
                      : `Normă: ${formatNumberRo(inspectedRow.intervalPrincipal, 0)} ${unit}`}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sage-600">
                    Completări (Top-up)
                  </span>
                  <p className="font-mono font-black text-sapphire-900 text-sm tabular-nums">
                    {Number(inspectedRow.totalLitriCompletati || 0) > 0
                      ? `+${inspectedRow.totalLitriCompletati} L`
                      : '0 L'}
                  </p>
                  <p className="text-[10px] text-sage-600">
                    {Number(inspectedRow.totalLitriCompletati || 0) > 0
                      ? 'Adăugați de la ultimul schimb'
                      : 'Fără completări intermediare'}
                  </p>
                </div>
              </div>

              {/* Acțiuni Rapide */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => {
                    const target = inspectedRow;
                    setInspectedRow(null);
                    onOpenBaseline(target);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold inline-flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>{inspectedRow.areContorDualMth ? 'Editează mTH / Bază' : 'Editează Bază Schimb'}</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectedRow;
                      setInspectedRow(null);
                      onOpenCompletare({
                        vehiculId: target.vehiculId,
                        tipLichid: target.tipLichid,
                        tipOperatiune: opTopUp,
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold inline-flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-sapphire-600" />
                    <span>Completare</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectedRow;
                      setInspectedRow(null);
                      onOpenCompletare({
                        vehiculId: target.vehiculId,
                        tipLichid: target.tipLichid,
                        tipOperatiune: opDefault,
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-bold shadow-sm inline-flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Înregistrează Schimb</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
