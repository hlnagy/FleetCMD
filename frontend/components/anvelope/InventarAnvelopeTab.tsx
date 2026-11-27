"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import FilterableSelect from '@/components/FilterableSelect';
import {
  Search,
  X,
  CircleDot,
  AlertTriangle,
  ExternalLink,
  Building2,
  FileText,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Table2,
  Truck,
  RotateCcw,
  Layers,
  PackageCheck,
  Trash2,
  Gauge,
} from 'lucide-react';
import { getLabelPozitie } from '@/lib/tirePositions';

export interface InventarAnvelopeTabProps {
  flotaAnvelope: any[];
  duplicateTireIdSet: Set<string>;
  onJumpToVehicleAxle: (anvelopa: any) => void;
  onOpenFactura: (numarFactura?: string) => void;
  onOpenHistory: (anvelopaId: string) => void;
}

type StareFilter = 'TOATE' | 'MONTATA' | 'IN_STOC' | 'CASATA' | 'RESAPATA';
type ViewMode = 'table' | 'grouped';
type SortField = 'serie' | 'marca' | 'dimensiune' | 'stare' | 'rulaj' | 'pret';
type SortDir = 'asc' | 'desc';

const PAGE_SIZES = [25, 50, 100, 200] as const;

const naturalCollator = new Intl.Collator('ro', {
  numeric: true,
  sensitivity: 'base',
});

function naturalCompare(a?: string | null, b?: string | null): number {
  return naturalCollator.compare((a || '').trim(), (b || '').trim());
}

function computeTotalKm(a: any): number {
  const contorCurent = Number(a?.vehicul?.valoareContorCurent || 0);
  const kmMontare = Number(a?.kilometrajMontare || 0);
  const kmCurenti =
    a?.stare === 'MONTATA' && a?.vehicul && contorCurent > kmMontare
      ? contorCurent - kmMontare
      : 0;
  return Math.round(Number(a?.rulajTotalKm || 0) + kmCurenti);
}

function formatDateRo(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ro-RO');
}

function getStareSortWeight(stare?: string): number {
  switch (stare) {
    case 'MONTATA':
      return 0;
    case 'IN_STOC':
      return 1;
    case 'RESAPATA':
      return 2;
    case 'CASATA':
      return 3;
    default:
      return 4;
  }
}

function getStareBadgeMeta(a: any): {
  label: string;
  className: string;
} {
  if (a.stare === 'MONTATA') {
    const vehCode = a.vehicul?.numarIntern || '';
    const posTitlu = a.pozitieAx ? getLabelPozitie(a.pozitieAx).titlu : '';
    const suffix = [vehCode, posTitlu].filter(Boolean).join(' • ');
    return {
      label: suffix ? `MONTATĂ (${suffix})` : 'MONTATĂ',
      className: 'bg-sapphire-50 text-sapphire-700 border border-sapphire-200',
    };
  }
  if (a.stare === 'CASATA') {
    return {
      label: 'CASATĂ / DEȘEU',
      className: 'bg-roseash-100 text-terracotta-700 border border-roseash-300',
    };
  }
  if (a.stare === 'RESAPATA') {
    return {
      label: 'ÎN REȘAPARE',
      className: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }
  const depozit = a.depozit?.nume || a.depozitNume || 'Depozit Central';
  return {
    label: `ÎN STOC (${depozit})`,
    className: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  };
}

interface EnrichedTire {
  raw: any;
  totalKm: number;
  pret: number;
  posLabel: string;
  vehCode: string;
  vehPlate: string;
  depozitNume: string;
  isDuplicate: boolean;
  searchHaystack: string;
}

interface VehicleGroup {
  key: string;
  vehiculId: string | null;
  numarIntern: string;
  numarInmatriculare: string;
  items: EnrichedTire[];
  montateCount: number;
  casateCount: number;
  inStocCount: number;
  resapateCount: number;
  duplicateCount: number;
  totalKm: number;
  firstMountedTire: any | null;
}

export function InventarAnvelopeTab({
  flotaAnvelope,
  duplicateTireIdSet,
  onJumpToVehicleAxle,
  onOpenFactura,
  onOpenHistory,
}: InventarAnvelopeTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stareFilter, setStareFilter] = useState<StareFilter>('MONTATA');
  const [onlyDuplicates, setOnlyDuplicates] = useState(false);
  const [vehiculFilter, setVehiculFilter] = useState('');
  const [marcaFilter, setMarcaFilter] = useState('');
  const [dimensiuneFilter, setDimensiuneFilter] = useState('');
  const [furnizorFilter, setFurnizorFilter] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('stare');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Pre-compute derived fields once per dataset update for instant search/sort over 1,300+ rows
  const enrichedTires = useMemo<EnrichedTire[]>(() => {
    return (flotaAnvelope || []).map((a) => {
      const totalKm = computeTotalKm(a);
      const pret = Number(a?.pretAchizitie || 0);
      const posLabel = a?.pozitieAx ? getLabelPozitie(a.pozitieAx).titlu : '';
      const vehCode = (a?.vehicul?.numarIntern || '').trim();
      const vehPlate = (a?.vehicul?.numarInmatriculare || '').trim();
      const depozitNume = (a?.depozit?.nume || a?.depozitNume || '').trim();
      const isDuplicate = duplicateTireIdSet.has(a?.id);

      const searchHaystack = [
        a?.serieAnvelopa,
        a?.marca,
        a?.model,
        a?.dimensiune,
        vehCode,
        vehPlate,
        a?.pozitieAx?.codPozitie,
        posLabel,
        a?.furnizor,
        a?.numarFactura,
        depozitNume,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return {
        raw: a,
        totalKm,
        pret,
        posLabel,
        vehCode,
        vehPlate,
        depozitNume,
        isDuplicate,
        searchHaystack,
      };
    });
  }, [flotaAnvelope, duplicateTireIdSet]);

  // Global KPI stats across the entire fleet inventory
  const kpiStats = useMemo(() => {
    let montate = 0;
    let inStoc = 0;
    let casate = 0;
    let resapate = 0;
    let duplicate = 0;
    let rulajTotalFlota = 0;

    for (const item of enrichedTires) {
      const st = item.raw?.stare;
      if (st === 'MONTATA') montate++;
      else if (st === 'IN_STOC') inStoc++;
      else if (st === 'CASATA') casate++;
      else if (st === 'RESAPATA') resapate++;

      if (item.isDuplicate) duplicate++;
      rulajTotalFlota += item.totalKm;
    }

    return {
      total: enrichedTires.length,
      montate,
      inStoc,
      casate,
      resapate,
      duplicate,
      rulajTotalFlota,
    };
  }, [enrichedTires]);

  // Unique dropdown filter options (natural sorted)
  const filterOptions = useMemo(() => {
    const vehMap = new Map<string, { code: string; plate: string }>();
    const marciSet = new Set<string>();
    const dimSet = new Set<string>();
    const furnizoriSet = new Set<string>();

    for (const item of enrichedTires) {
      if (item.vehCode && !vehMap.has(item.vehCode)) {
        vehMap.set(item.vehCode, { code: item.vehCode, plate: item.vehPlate });
      }
      const marca = (item.raw?.marca || '').trim();
      if (marca) marciSet.add(marca);

      const dim = (item.raw?.dimensiune || '').trim();
      if (dim) dimSet.add(dim);

      const furn = (item.raw?.furnizor || '').trim();
      if (furn) furnizoriSet.add(furn);
    }

    const vehicule = Array.from(vehMap.values()).sort((a, b) =>
      naturalCompare(a.code, b.code)
    );
    const marci = Array.from(marciSet).sort(naturalCompare);
    const dimensiuni = Array.from(dimSet).sort(naturalCompare);
    const furnizori = Array.from(furnizoriSet).sort(naturalCompare);

    return { vehicule, marci, dimensiuni, furnizori };
  }, [enrichedTires]);

  // Multi-criteria filtering
  const filteredTires = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

    return enrichedTires.filter((item) => {
      if (stareFilter !== 'TOATE' && item.raw?.stare !== stareFilter) {
        return false;
      }
      if (onlyDuplicates && !item.isDuplicate) {
        return false;
      }
      if (vehiculFilter) {
        if (vehiculFilter === '__FARA_VEHICUL__') {
          if (item.vehCode) return false;
        } else if (item.vehCode !== vehiculFilter) {
          return false;
        }
      }
      if (marcaFilter && (item.raw?.marca || '').trim() !== marcaFilter) {
        return false;
      }
      if (dimensiuneFilter && (item.raw?.dimensiune || '').trim() !== dimensiuneFilter) {
        return false;
      }
      if (furnizorFilter && (item.raw?.furnizor || '').trim() !== furnizorFilter) {
        return false;
      }
      if (tokens.length > 0) {
        for (const token of tokens) {
          if (!item.searchHaystack.includes(token)) return false;
        }
      }
      return true;
    });
  }, [
    enrichedTires,
    searchQuery,
    stareFilter,
    onlyDuplicates,
    vehiculFilter,
    marcaFilter,
    dimensiuneFilter,
    furnizorFilter,
  ]);

  // Sorting for table view
  const sortedTires = useMemo(() => {
    const list = [...filteredTires];
    const dirMult = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'serie':
          cmp = naturalCompare(a.raw?.serieAnvelopa, b.raw?.serieAnvelopa);
          break;
        case 'marca': {
          const ma = `${a.raw?.marca || ''} ${a.raw?.model || ''}`;
          const mb = `${b.raw?.marca || ''} ${b.raw?.model || ''}`;
          cmp = naturalCompare(ma, mb);
          if (cmp === 0) cmp = naturalCompare(a.raw?.furnizor, b.raw?.furnizor);
          break;
        }
        case 'dimensiune':
          cmp = naturalCompare(a.raw?.dimensiune, b.raw?.dimensiune);
          break;
        case 'stare': {
          cmp = getStareSortWeight(a.raw?.stare) - getStareSortWeight(b.raw?.stare);
          if (cmp === 0) cmp = naturalCompare(a.vehCode, b.vehCode);
          if (cmp === 0) cmp = naturalCompare(a.posLabel, b.posLabel);
          if (cmp === 0) cmp = naturalCompare(a.depozitNume, b.depozitNume);
          break;
        }
        case 'rulaj':
          cmp = a.totalKm - b.totalKm;
          break;
        case 'pret':
          cmp = a.pret - b.pret;
          break;
      }
      if (cmp === 0) {
        cmp = naturalCompare(a.raw?.serieAnvelopa, b.raw?.serieAnvelopa);
      }
      return cmp * dirMult;
    });

    return list;
  }, [filteredTires, sortField, sortDir]);

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(sortedTires.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedTires = useMemo(
    () => sortedTires.slice(startIdx, startIdx + pageSize),
    [sortedTires, startIdx, pageSize]
  );

  // Reset to page 1 when filters/search/pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    stareFilter,
    onlyDuplicates,
    vehiculFilter,
    marcaFilter,
    dimensiuneFilter,
    furnizorFilter,
    pageSize,
  ]);

  // Grouped-by-vehicle view computation
  const vehicleGroups = useMemo<VehicleGroup[]>(() => {
    const map = new Map<string, VehicleGroup>();

    for (const item of filteredTires) {
      const hasVeh = Boolean(item.vehCode);
      const key = hasVeh ? item.vehCode : '__FARA_VEHICUL__';

      let grp = map.get(key);
      if (!grp) {
        grp = {
          key,
          vehiculId: item.raw?.vehiculId || item.raw?.vehicul?.id || null,
          numarIntern: hasVeh ? item.vehCode : 'Fără Vehicul (Stoc / Nealocate)',
          numarInmatriculare: item.vehPlate,
          items: [],
          montateCount: 0,
          casateCount: 0,
          inStocCount: 0,
          resapateCount: 0,
          duplicateCount: 0,
          totalKm: 0,
          firstMountedTire: null,
        };
        map.set(key, grp);
      }

      grp.items.push(item);
      grp.totalKm += item.totalKm;
      if (item.isDuplicate) grp.duplicateCount++;

      const st = item.raw?.stare;
      if (st === 'MONTATA') {
        grp.montateCount++;
        if (!grp.firstMountedTire && item.raw?.vehiculId) {
          grp.firstMountedTire = item.raw;
        }
      } else if (st === 'CASATA') {
        grp.casateCount++;
      } else if (st === 'IN_STOC') {
        grp.inStocCount++;
      } else if (st === 'RESAPATA') {
        grp.resapateCount++;
      }
    }

    const groups = Array.from(map.values()).sort((a, b) => {
      if (a.key === '__FARA_VEHICUL__') return 1;
      if (b.key === '__FARA_VEHICUL__') return -1;
      return naturalCompare(a.numarIntern, b.numarIntern);
    });

    for (const grp of groups) {
      grp.items.sort((a, b) => {
        const stCmp = getStareSortWeight(a.raw?.stare) - getStareSortWeight(b.raw?.stare);
        if (stCmp !== 0) return stCmp;
        const posCmp = naturalCompare(a.posLabel, b.posLabel);
        if (posCmp !== 0) return posCmp;
        return naturalCompare(a.raw?.serieAnvelopa, b.raw?.serieAnvelopa);
      });
    }

    return groups;
  }, [filteredTires]);

  // Auto-expand first 3 vehicle groups when switching to grouped view if none explicitly toggled
  useEffect(() => {
    if (viewMode === 'grouped' && vehicleGroups.length > 0) {
      setExpandedGroups((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: Record<string, boolean> = {};
        vehicleGroups.slice(0, 3).forEach((g) => {
          initial[g.key] = true;
        });
        return initial;
      });
    }
  }, [viewMode, vehicleGroups]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      stareFilter !== 'MONTATA' ||
      onlyDuplicates ||
      vehiculFilter ||
      marcaFilter ||
      dimensiuneFilter ||
      furnizorFilter
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setStareFilter('MONTATA');
    setOnlyDuplicates(false);
    setVehiculFilter('');
    setMarcaFilter('');
    setDimensiuneFilter('');
    setFurnizorFilter('');
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'rulaj' || field === 'pret' ? 'desc' : 'asc');
    }
  };

  const handleKpiClick = (target: 'TOATE' | 'MONTATA' | 'IN_STOC' | 'CASATA' | 'DUPLICATE' | 'RULAJ') => {
    if (target === 'DUPLICATE') {
      if (kpiStats.duplicate === 0) return;
      setOnlyDuplicates((prev) => {
        const next = !prev;
        if (next) setStareFilter('TOATE');
        return next;
      });
      return;
    }
    if (target === 'RULAJ') {
      setViewMode('table');
      setSortField('rulaj');
      setSortDir('desc');
      return;
    }
    setOnlyDuplicates(false);
    setStareFilter(target);
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllGroups = () => {
    const next: Record<string, boolean> = {};
    vehicleGroups.forEach((g) => {
      next[g.key] = true;
    });
    setExpandedGroups(next);
  };

  const collapseAllGroups = () => {
    const next: Record<string, boolean> = {};
    vehicleGroups.forEach((g) => {
      next[g.key] = false;
    });
    setExpandedGroups(next);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-50 shrink-0" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sapphire-600 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sapphire-600 shrink-0" />
    );
  };

  const renderTireRow = (item: EnrichedTire, compact: boolean = false) => {
    const a = item.raw;
    const badge = getStareBadgeMeta(a);
    const facturaDate = formatDateRo(a.dataFactura);
    const padClass = compact ? 'px-3 py-2' : 'p-3';

    return (
      <tr key={a.id} className="hover:bg-morning-50 transition">
        <td className={`${padClass} font-extrabold text-sapphire-900 font-mono whitespace-nowrap`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>{a.serieAnvelopa || 'Fără serie'}</span>
            {item.isDuplicate && (
              <span
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-extrabold"
                title="Serie duplicată pe anvelope active — necesită verificare!"
              >
                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                <span>DUPLICAT</span>
              </span>
            )}
          </div>
        </td>

        <td className={`${padClass} font-bold text-slate-800`}>
          <div>{[a.marca, a.model].filter(Boolean).join(' ') || 'Specificație nespecificată'}</div>
          {(a.furnizor || a.numarFactura) && (
            <div className="mt-1 flex items-center flex-wrap gap-1.5 text-[10px] font-normal">
              {a.furnizor && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-900 font-semibold">
                  {a.furnizor}
                </span>
              )}
              {a.numarFactura && (
                <button
                  type="button"
                  onClick={() => onOpenFactura(a.numarFactura)}
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-morning-100 hover:bg-sapphire-100 border border-morning-300 text-slate-700 hover:text-sapphire-800 font-mono font-semibold transition cursor-pointer"
                  title="Click pentru a deschide factura în ANAF e-Factura"
                >
                  <FileText className="w-3 h-3 text-sapphire-600 shrink-0" />
                  <span className="underline decoration-dotted">{a.numarFactura}</span>
                  {facturaDate && (
                    <span className="text-sage-600 font-normal">({facturaDate})</span>
                  )}
                </button>
              )}
            </div>
          )}
        </td>

        <td className={`${padClass} font-mono text-sage-700 font-semibold whitespace-nowrap`}>
          {a.dimensiune || 'Nespecificată'}
        </td>

        <td className={padClass}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.className}`}>
              {badge.label}
            </span>

            {a.stare === 'CASATA' && item.vehCode && !compact && (
              <span className="text-[10px] font-semibold text-sage-600">
                Ultim utilaj: {item.vehCode}
              </span>
            )}

            {a.stare === 'MONTATA' && a.vehiculId && (
              <button
                type="button"
                onClick={() => onJumpToVehicleAxle(a)}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 hover:text-sapphire-900 border border-sapphire-200 text-[11px] font-bold hover:underline transition cursor-pointer"
                title={`Deschide Șasiu & Axe Vizuale pentru ${item.vehCode || 'vehicul'}`}
              >
                <CircleDot className="w-3 h-3 text-sapphire-600 shrink-0" />
                <span>Șasiu & Axe</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
            )}

            {a.stare === 'IN_STOC' && (
              <Link
                href={
                  a.serieAnvelopa
                    ? `/stocuri?tab=anvelope_stoc&serie=${encodeURIComponent(a.serieAnvelopa)}`
                    : '/stocuri?tab=anvelope_stoc'
                }
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-950 border border-emerald-200 text-[11px] font-bold hover:underline transition"
                title={`Deschide în Magazie Anvelope (${item.depozitNume || 'Depozit Central'})`}
              >
                <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{item.depozitNume || 'Depozit Central'}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </Link>
            )}
          </div>
        </td>

        <td className={`${padClass} font-mono font-extrabold text-sapphire-900 whitespace-nowrap`}>
          {item.totalKm.toLocaleString('ro-RO')} km
        </td>

        <td className={`${padClass} text-right font-mono font-bold text-slate-800 whitespace-nowrap`}>
          {item.pret.toLocaleString('ro-RO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{' '}
          RON
        </td>

        <td className={`${padClass} text-center whitespace-nowrap`}>
          <button
            type="button"
            onClick={() => onOpenHistory(a.id)}
            className="px-2.5 py-1 bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-800 border border-sapphire-200 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-sapphire-600 shrink-0" />
            <span>Istoric Rulaj</span>
          </button>
        </td>
      </tr>
    );
  };

  const stareChips: Array<{ id: StareFilter; label: string; count: number }> = [
    { id: 'TOATE', label: 'Toate', count: kpiStats.total },
    { id: 'MONTATA', label: 'Montate', count: kpiStats.montate },
    { id: 'IN_STOC', label: 'În Stoc', count: kpiStats.inStoc },
    { id: 'CASATA', label: 'Casate', count: kpiStats.casate },
    { id: 'RESAPATA', label: 'Reșapate', count: kpiStats.resapate },
  ];

  const rangeStart = sortedTires.length === 0 ? 0 : startIdx + 1;
  const rangeEnd = Math.min(startIdx + pageSize, sortedTires.length);

  return (
    <div className="pleasant-card rounded-2xl p-5 md:p-6 space-y-5">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sapphire-500 shrink-0" />
            <span>Registrul Centralizat al Anvelopelor din Flotă</span>
          </h2>
          <p className="text-xs text-sage-600 font-medium mt-0.5">
            Se afișează <span className="font-bold text-sapphire-900">{filteredTires.length.toLocaleString('ro-RO')}</span> din{' '}
            <span className="font-bold text-sapphire-900">{kpiStats.total.toLocaleString('ro-RO')}</span> anvelope înregistrate
          </p>
        </div>

        <div className="inline-flex items-center bg-morning-100 p-1 rounded-xl border border-morning-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-sapphire-500 text-white shadow-xs'
                : 'text-sage-700 hover:text-sapphire-900'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Tabel Paginat</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grouped')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'grouped'
                ? 'bg-sapphire-500 text-white shadow-xs'
                : 'text-sage-700 hover:text-sapphire-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Grupat pe Vehicul</span>
          </button>
        </div>
      </div>

      {/* Compact Clickable KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <button
          type="button"
          onClick={() => handleKpiClick('TOATE')}
          className={`text-left px-3.5 py-2.5 rounded-xl border transition cursor-pointer ${
            stareFilter === 'TOATE' && !onlyDuplicates
              ? 'bg-sapphire-50 border-sapphire-400 ring-1 ring-sapphire-400'
              : 'bg-morning-50 border-morning-200 hover:border-sapphire-300'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-sage-600">
            <span>Total Flotă</span>
            <Layers className="w-3.5 h-3.5 text-sapphire-500" />
          </div>
          <div className="mt-1 text-lg font-extrabold font-mono text-sapphire-900">
            {kpiStats.total.toLocaleString('ro-RO')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleKpiClick('MONTATA')}
          className={`text-left px-3.5 py-2.5 rounded-xl border transition cursor-pointer ${
            stareFilter === 'MONTATA' && !onlyDuplicates
              ? 'bg-sapphire-50 border-sapphire-400 ring-1 ring-sapphire-400'
              : 'bg-morning-50 border-morning-200 hover:border-sapphire-300'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-sage-600">
            <span>Montate</span>
            <CircleDot className="w-3.5 h-3.5 text-sapphire-500" />
          </div>
          <div className="mt-1 text-lg font-extrabold font-mono text-sapphire-900">
            {kpiStats.montate.toLocaleString('ro-RO')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleKpiClick('IN_STOC')}
          className={`text-left px-3.5 py-2.5 rounded-xl border transition cursor-pointer ${
            stareFilter === 'IN_STOC' && !onlyDuplicates
              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
              : 'bg-morning-50 border-morning-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-sage-600">
            <span>În Stoc</span>
            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-lg font-extrabold font-mono text-emerald-700">
            {kpiStats.inStoc.toLocaleString('ro-RO')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleKpiClick('CASATA')}
          className={`text-left px-3.5 py-2.5 rounded-xl border transition cursor-pointer ${
            stareFilter === 'CASATA' && !onlyDuplicates
              ? 'bg-roseash-100 border-terracotta-400 ring-1 ring-terracotta-400'
              : 'bg-morning-50 border-morning-200 hover:border-roseash-300'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-sage-600">
            <span>Casate</span>
            <Trash2 className="w-3.5 h-3.5 text-terracotta-600" />
          </div>
          <div className="mt-1 text-lg font-extrabold font-mono text-terracotta-700">
            {kpiStats.casate.toLocaleString('ro-RO')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleKpiClick('DUPLICATE')}
          disabled={kpiStats.duplicate === 0}
          className={`text-left px-3.5 py-2.5 rounded-xl border transition ${
            kpiStats.duplicate > 0
              ? onlyDuplicates
                ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-500 cursor-pointer'
                : 'bg-amber-50 border-amber-400 hover:border-rose-400 cursor-pointer'
              : 'bg-morning-50 border-morning-200 opacity-70 cursor-default'
          }`}
          title={
            kpiStats.duplicate > 0
              ? 'Click pentru a filtra anvelopele cu serii duplicate'
              : 'Nu există serii duplicate active'
          }
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-sage-700">
            <span>Duplicate</span>
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                kpiStats.duplicate > 0 ? 'text-rose-600' : 'text-sage-400'
              }`}
            />
          </div>
          <div
            className={`mt-1 text-lg font-extrabold font-mono ${
              kpiStats.duplicate > 0 ? 'text-rose-700' : 'text-sapphire-900'
            }`}
          >
            {kpiStats.duplicate.toLocaleString('ro-RO')}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleKpiClick('RULAJ')}
          className="text-left px-3.5 py-2.5 rounded-xl border bg-morning-50 border-morning-200 hover:border-sapphire-300 transition cursor-pointer"
          title="Click pentru a sorta tabelul după rulajul cel mai mare"
        >
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-sage-600">
            <span>Rulaj Total Flotă</span>
            <Gauge className="w-3.5 h-3.5 text-sapphire-500" />
          </div>
          <div className="mt-1 text-base font-extrabold font-mono text-sapphire-900 truncate">
            {kpiStats.rulajTotalFlota.toLocaleString('ro-RO')} km
          </div>
        </button>
      </div>

      {/* Search + Stare Quick Chips + Dropdown Filters */}
      <div className="space-y-3 pt-1">
        {/* Stare Quick Chips */}
        <div className="flex items-center flex-wrap gap-1.5">
          {stareChips.map((chip) => {
            const isActive = stareFilter === chip.id && !onlyDuplicates;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setStareFilter(chip.id);
                  setOnlyDuplicates(false);
                }}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  isActive
                    ? 'bg-sapphire-500 text-white border-sapphire-600 shadow-xs'
                    : 'bg-morning-100 text-sage-700 border-morning-200 hover:bg-morning-200 hover:text-sapphire-900'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-morning-200 text-sapphire-900'
                  }`}
                >
                  {chip.count.toLocaleString('ro-RO')}
                </span>
              </button>
            );
          })}

          {kpiStats.duplicate > 0 && (
            <button
              type="button"
              onClick={() => handleKpiClick('DUPLICATE')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                onlyDuplicates
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Duplicate</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  onlyDuplicates
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-200/80 text-amber-950'
                }`}
              >
                {kpiStats.duplicate}
              </span>
            </button>
          )}
        </div>

        {/* Search Input + Multi-Criteria Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-2.5 items-center">
          <div className="relative xl:col-span-4">
            <Search className="w-4 h-4 text-sage-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută serie, marcă, model, dimensiune, utilaj, poziție, furnizor, factură, depozit..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-morning-100 border border-morning-200 text-xs text-sapphire-900 placeholder:text-sage-500 focus:outline-none focus:border-sapphire-400 focus:ring-1 focus:ring-sapphire-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-500 hover:text-sapphire-900 cursor-pointer"
                aria-label="Șterge căutarea"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <FilterableSelect
            value={vehiculFilter}
            onChange={(e) => setVehiculFilter(e.target.value)}
            title="Filtrează după vehicul"
            searchPlaceholder="Caută vehicul..."
            className="xl:col-span-2 px-3 py-2 rounded-xl bg-morning-100 border border-morning-200 text-xs font-semibold text-sapphire-900 focus:outline-none focus:border-sapphire-400"
          >
            <option value="">Toate vehiculele ({filterOptions.vehicule.length})</option>
            <option value="__FARA_VEHICUL__">Fără vehicul (Stoc / Nealocate)</option>
            {filterOptions.vehicule.map((v) => (
              <option key={v.code} value={v.code}>
                {v.plate ? `${v.code} (${v.plate})` : v.code}
              </option>
            ))}
          </FilterableSelect>

          <FilterableSelect
            value={marcaFilter}
            onChange={(e) => setMarcaFilter(e.target.value)}
            title="Filtrează după marcă"
            searchPlaceholder="Caută marcă..."
            className="xl:col-span-2 px-3 py-2 rounded-xl bg-morning-100 border border-morning-200 text-xs font-semibold text-sapphire-900 focus:outline-none focus:border-sapphire-400"
          >
            <option value="">Toate mărcile ({filterOptions.marci.length})</option>
            {filterOptions.marci.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </FilterableSelect>

          <FilterableSelect
            value={dimensiuneFilter}
            onChange={(e) => setDimensiuneFilter(e.target.value)}
            title="Filtrează după dimensiune"
            searchPlaceholder="Caută dimensiune..."
            className="xl:col-span-2 px-3 py-2 rounded-xl bg-morning-100 border border-morning-200 text-xs font-semibold text-sapphire-900 focus:outline-none focus:border-sapphire-400"
          >
            <option value="">Toate dimensiunile ({filterOptions.dimensiuni.length})</option>
            {filterOptions.dimensiuni.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </FilterableSelect>

          <div className="xl:col-span-2 flex items-center gap-2">
            <FilterableSelect
              value={furnizorFilter}
              onChange={(e) => setFurnizorFilter(e.target.value)}
              title="Filtrează după furnizor"
              searchPlaceholder="Caută furnizor..."
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-morning-100 border border-morning-200 text-xs font-semibold text-sapphire-900 focus:outline-none focus:border-sapphire-400"
            >
              <option value="">Toți furnizorii ({filterOptions.furnizori.length})</option>
              {filterOptions.furnizori.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </FilterableSelect>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="shrink-0 inline-flex items-center space-x-1 px-2.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-xs font-bold text-sapphire-900 transition cursor-pointer"
                title="Resetează toate filtrele"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sapphire-600" />
                <span className="hidden 2xl:inline">Resetează filtre</span>
              </button>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-sage-600">
            <span>
              Filtre active — {filteredTires.length.toLocaleString('ro-RO')} rezultate găsite.
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1 text-sapphire-700 hover:text-sapphire-900 font-bold hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Resetează filtre</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredTires.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-morning-300 bg-morning-50 space-y-2">
          <CircleDot className="w-8 h-8 text-sage-400 mx-auto" />
          <p className="text-sm font-bold text-sapphire-900">
            Nu există anvelope care să corespundă filtrelor curente.
          </p>
          <p className="text-xs text-sage-600">
            Încercați să schimbați starea selectată (de ex. Toate sau Casate) ori să resetați filtrele.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetează filtre</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* VIEW MODE 1: PAGINATED SORTABLE TABLE */
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-morning-200">
            <table className="w-full text-left text-xs text-slate-700 min-w-[960px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('serie')}
                      className="inline-flex items-center space-x-1 hover:text-sapphire-900 transition cursor-pointer uppercase"
                    >
                      <span>Serie</span>
                      {renderSortIcon('serie')}
                    </button>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('marca')}
                      className="inline-flex items-center space-x-1 hover:text-sapphire-900 transition cursor-pointer uppercase"
                    >
                      <span>Marcă & Furnizor</span>
                      {renderSortIcon('marca')}
                    </button>
                  </th>
                  <th className="p-3 font-mono">
                    <button
                      type="button"
                      onClick={() => handleSort('dimensiune')}
                      className="inline-flex items-center space-x-1 hover:text-sapphire-900 transition cursor-pointer uppercase"
                    >
                      <span>Dimensiune</span>
                      {renderSortIcon('dimensiune')}
                    </button>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('stare')}
                      className="inline-flex items-center space-x-1 hover:text-sapphire-900 transition cursor-pointer uppercase"
                    >
                      <span>Stare & Poziție</span>
                      {renderSortIcon('stare')}
                    </button>
                  </th>
                  <th className="p-3 font-mono">
                    <button
                      type="button"
                      onClick={() => handleSort('rulaj')}
                      className="inline-flex items-center space-x-1 hover:text-sapphire-900 transition cursor-pointer uppercase"
                    >
                      <span>Rulaj Total</span>
                      {renderSortIcon('rulaj')}
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('pret')}
                      className="inline-flex items-center space-x-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                    >
                      <span>Preț</span>
                      {renderSortIcon('pret')}
                    </button>
                  </th>
                  <th className="p-3 text-center">Istoric & Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {paginatedTires.map((item) => renderTireRow(item, false))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
            <div className="flex items-center space-x-2 text-sage-700 font-medium">
              <span>
                Rânduri{' '}
                <strong className="text-sapphire-900 font-mono">
                  {rangeStart.toLocaleString('ro-RO')}–{rangeEnd.toLocaleString('ro-RO')}
                </strong>{' '}
                din{' '}
                <strong className="text-sapphire-900 font-mono">
                  {sortedTires.length.toLocaleString('ro-RO')}
                </strong>
              </span>
              <span className="text-morning-300">|</span>
              <label className="inline-flex items-center space-x-1.5">
                <span>Pe pagină:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-morning-100 border border-morning-200 text-xs font-bold text-sapphire-900 focus:outline-none focus:border-sapphire-400"
                >
                  {PAGE_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-200 text-sapphire-900 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="px-3 py-1.5 rounded-xl bg-sapphire-50 border border-sapphire-200 text-sapphire-900 font-mono font-bold">
                Pagina {safePage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-200 text-sapphire-900 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <span>Următor</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: GROUPED BY VEHICLE */
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="text-sage-700 font-medium">
              <strong className="text-sapphire-900 font-mono">{vehicleGroups.length}</strong>{' '}
              {vehicleGroups.length === 1 ? 'grup de vehicule' : 'grupuri de vehicule'} (sortate natural)
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={expandAllGroups}
                className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 border border-morning-200 text-sapphire-900 font-bold transition cursor-pointer"
              >
                Extinde toate
              </button>
              <button
                type="button"
                onClick={collapseAllGroups}
                className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 border border-morning-200 text-sapphire-900 font-bold transition cursor-pointer"
              >
                Restrânge toate
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {vehicleGroups.map((grp) => {
              const isOpen = Boolean(expandedGroups[grp.key]);
              return (
                <div
                  key={grp.key}
                  className="rounded-xl border border-morning-200 overflow-hidden bg-white"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 bg-morning-100 hover:bg-morning-200/70 transition">
                    <button
                      type="button"
                      onClick={() => toggleGroup(grp.key)}
                      className="flex items-center space-x-2.5 text-left flex-1 min-w-[200px] cursor-pointer"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-sapphire-600 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-sage-600 shrink-0" />
                      )}
                      <Truck className="w-4 h-4 text-sapphire-500 shrink-0" />
                      <span className="font-extrabold text-sm text-sapphire-900">
                        {grp.numarIntern}
                      </span>
                      {grp.numarInmatriculare && (
                        <span className="px-2 py-0.5 rounded-full bg-sapphire-100 text-sapphire-900 font-mono text-[10px] font-bold">
                          {grp.numarInmatriculare}
                        </span>
                      )}
                    </button>

                    <div className="flex items-center flex-wrap gap-1.5 text-[11px]">
                      {grp.montateCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-sapphire-50 text-sapphire-700 border border-sapphire-200 font-bold">
                          {grp.montateCount} montate
                        </span>
                      )}
                      {grp.casateCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-roseash-100 text-terracotta-700 border border-roseash-300 font-bold">
                          {grp.casateCount} casate
                        </span>
                      )}
                      {grp.inStocCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          {grp.inStocCount} în stoc
                        </span>
                      )}
                      {grp.resapateCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                          {grp.resapateCount} reșapate
                        </span>
                      )}
                      {grp.duplicateCount > 0 && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px]">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>{grp.duplicateCount} dup</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-morning-50 border border-morning-200 font-mono font-bold text-sapphire-900">
                        {grp.totalKm.toLocaleString('ro-RO')} km
                      </span>

                      {grp.firstMountedTire && (
                        <button
                          type="button"
                          onClick={() => onJumpToVehicleAxle(grp.firstMountedTire)}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold transition cursor-pointer"
                          title={`Deschide Șasiu & Axe pentru ${grp.numarIntern}`}
                        >
                          <CircleDot className="w-3 h-3" />
                          <span>Șasiu & Axe</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="overflow-x-auto border-t border-morning-200">
                      <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
                        <thead className="bg-morning-50 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                          <tr>
                            <th className="px-3 py-2">Serie</th>
                            <th className="px-3 py-2">Marcă & Furnizor</th>
                            <th className="px-3 py-2 font-mono">Dimensiune</th>
                            <th className="px-3 py-2">Stare & Poziție</th>
                            <th className="px-3 py-2 font-mono">Rulaj Total</th>
                            <th className="px-3 py-2 text-right">Preț</th>
                            <th className="px-3 py-2 text-center">Istoric</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-200">
                          {grp.items.map((item) => renderTireRow(item, true))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default InventarAnvelopeTab;
