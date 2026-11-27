'use client';

import React, { useMemo, useState, useEffect } from 'react';
import FilterableSelect from '@/components/FilterableSelect';
import {
  Search,
  X,
  RotateCcw,
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table2,
  Layers,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  PlusCircle,
  RefreshCw,
  ArchiveRestore,
  Trash2,
  History,
  Truck,
  Calendar,
  User,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

export interface IstoricPermutariTabProps {
  istoricPermutari: any[];
  onOpenHistory: (anvelopaId: string) => void;
}

type EventTypeKey = 'montare' | 'permutare' | 'demontare' | 'casare';
type EventTypeFilter = 'all' | EventTypeKey;
type ViewMode = 'table' | 'grouped';
type SortField = 'data' | 'vehicul' | 'anvelopa' | 'tip' | 'contor' | 'operator';
type SortDirection = 'asc' | 'desc';
type DatePreset = 'all' | '30d' | 'year' | 'custom';

interface EventMeta {
  type: EventTypeKey;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
  kpiActiveClass: string;
}

const EVENT_META: Record<EventTypeKey, EventMeta> = {
  montare: {
    type: 'montare',
    label: 'Montare',
    shortLabel: 'Montări',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    dotClass: 'bg-emerald-500',
    kpiActiveClass: 'border-emerald-400 ring-2 ring-emerald-500/30 bg-emerald-50/70',
  },
  permutare: {
    type: 'permutare',
    label: 'Permutare Axă',
    shortLabel: 'Permutări',
    badgeClass: 'bg-sapphire-100 text-sapphire-800 border border-sapphire-200',
    dotClass: 'bg-sapphire-500',
    kpiActiveClass: 'border-sapphire-400 ring-2 ring-sapphire-500/30 bg-sapphire-50/70',
  },
  demontare: {
    type: 'demontare',
    label: 'Demontare în Stoc',
    shortLabel: 'Demontări',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
    dotClass: 'bg-amber-500',
    kpiActiveClass: 'border-amber-400 ring-2 ring-amber-500/30 bg-amber-50/70',
  },
  casare: {
    type: 'casare',
    label: 'Casare',
    shortLabel: 'Casări',
    badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
    dotClass: 'bg-rose-500',
    kpiActiveClass: 'border-rose-400 ring-2 ring-rose-500/30 bg-rose-50/70',
  },
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

const naturalCollator = new Intl.Collator('ro', {
  numeric: true,
  sensitivity: 'base',
});

function naturalCompare(a: string, b: string): number {
  return naturalCollator.compare(a, b);
}

function classifyEvent(item: any): EventMeta {
  const src = String(item?.pozitieSursaCod ?? '').toUpperCase();
  const dst = String(item?.pozitieDestCod ?? '').toUpperCase();

  if (dst.includes('CASAT') || dst.includes('CASATA')) {
    return EVENT_META.casare;
  }
  if (src.includes('STOC') || src.includes('IMPORT_ODS') || src.includes('DEPOZIT') || src.includes('ACHIZI')) {
    return EVENT_META.montare;
  }
  if (dst.includes('STOC')) {
    return EVENT_META.demontare;
  }
  return EVENT_META.permutare;
}

function parseEventDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDateKey(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(d: Date | null): string {
  if (!d) return 'Dată necunoscută';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatPositionCode(code: unknown): string {
  const raw = String(code ?? '').trim();
  if (!raw) return 'Nespecificat';
  if (raw.toUpperCase() === 'IMPORT_ODS') return 'Import ODS';
  if (raw.toUpperCase() === 'STOC') return 'Stoc';
  if (raw.toUpperCase() === 'CASAT' || raw.toUpperCase() === 'CASATA') return 'Casat';
  return raw;
}

function getOdometerUnit(tipMasurare: unknown): string {
  const raw = String(tipMasurare ?? '').toUpperCase();
  if (raw.includes('ORE') || raw.includes('MTH')) return 'mTH';
  return 'KM';
}

function formatContor(value: unknown, tipMasurare: unknown): string {
  if (value === null || value === undefined || value === '') return 'Fără contor';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${num.toLocaleString('ro-RO')} ${getOdometerUnit(tipMasurare)}`;
}

function getOperatorLabel(operator: unknown): string {
  const clean = String(operator ?? '').trim();
  return clean || 'Atelier';
}

function getVehicleKey(item: any): string {
  return String(item?.vehiculId || item?.vehicul?.numarIntern || '__FARA_VEHICUL__');
}

function getVehicleLabel(item: any): string {
  const nr = String(item?.vehicul?.numarIntern ?? '').trim();
  if (nr) return nr;
  return 'Fără utilaj';
}

function getTirePrimaryLabel(item: any): string {
  const marca = String(item?.anvelopa?.marca ?? '').trim();
  const model = String(item?.anvelopa?.model ?? '').trim();
  if (marca && model) return `${marca} ${model}`;
  if (marca) return marca;
  if (model) return model;
  return 'Anvelopă nespecificată';
}

function EventTypeIcon({ type, className = 'w-3.5 h-3.5' }: { type: EventTypeKey; className?: string }) {
  switch (type) {
    case 'montare':
      return <PlusCircle className={className} />;
    case 'permutare':
      return <RefreshCw className={className} />;
    case 'demontare':
      return <ArchiveRestore className={className} />;
    case 'casare':
      return <Trash2 className={className} />;
  }
}

interface EnrichedEvent {
  raw: any;
  id: string;
  anvelopaId: string;
  meta: EventMeta;
  dateObj: Date | null;
  dateKey: string;
  timestamp: number;
  vehicleKey: string;
  vehicleLabel: string;
  vehiclePlate: string;
  tirePrimary: string;
  tireSerial: string;
  tireDimension: string;
  sourceCode: string;
  destCode: string;
  operatorLabel: string;
  observatii: string;
  contorNum: number;
  contorFormatted: string;
  searchHaystack: string;
}

export default function IstoricPermutariTab({
  istoricPermutari,
  onOpenHistory,
}: IstoricPermutariTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');

  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});

  // Pre-normalize events once per dataset update for instant 1,300+ row filtering
  const enrichedEvents = useMemo<EnrichedEvent[]>(() => {
    if (!Array.isArray(istoricPermutari)) return [];
    return istoricPermutari.map((h, idx) => {
      const meta = classifyEvent(h);
      const dateObj = parseEventDate(h?.dataPermutare);
      const dateKey = toIsoDateKey(dateObj);
      const vehicleKey = getVehicleKey(h);
      const vehicleLabel = getVehicleLabel(h);
      const vehiclePlate = String(h?.vehicul?.numarInmatriculare ?? '').trim();
      const tirePrimary = getTirePrimaryLabel(h);
      const tireSerial = String(h?.anvelopa?.serieAnvelopa ?? '').trim();
      const tireDimension = String(h?.anvelopa?.dimensiune ?? '').trim();
      const sourceCode = String(h?.pozitieSursaCod ?? '').trim();
      const destCode = String(h?.pozitieDestCod ?? '').trim();
      const operatorLabel = getOperatorLabel(h?.operator);
      const observatii = String(h?.observatii ?? '').trim();
      const contorNum =
        h?.valoareContor !== null && h?.valoareContor !== undefined && h?.valoareContor !== ''
          ? Number(h.valoareContor)
          : -1;
      const contorFormatted = formatContor(h?.valoareContor, h?.vehicul?.tipMasurare);

      const searchHaystack = [
        vehicleLabel,
        vehiclePlate,
        tireSerial,
        h?.anvelopa?.marca ?? '',
        h?.anvelopa?.model ?? '',
        tireDimension,
        sourceCode,
        destCode,
        formatPositionCode(sourceCode),
        formatPositionCode(destCode),
        operatorLabel,
        observatii,
        meta.label,
      ]
        .join(' ')
        .toLowerCase();

      return {
        raw: h,
        id: String(h?.id ?? `evt-${idx}`),
        anvelopaId: String(h?.anvelopaId || h?.anvelopa?.id || ''),
        meta,
        dateObj,
        dateKey,
        timestamp: dateObj ? dateObj.getTime() : 0,
        vehicleKey,
        vehicleLabel,
        vehiclePlate,
        tirePrimary,
        tireSerial,
        tireDimension,
        sourceCode,
        destCode,
        operatorLabel,
        observatii,
        contorNum: Number.isNaN(contorNum) ? -1 : contorNum,
        contorFormatted,
        searchHaystack,
      };
    });
  }, [istoricPermutari]);

  // Unique natural-sorted vehicle options
  const vehicleOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; plate: string; count: number }>();
    for (const ev of enrichedEvents) {
      const existing = map.get(ev.vehicleKey);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(ev.vehicleKey, {
          key: ev.vehicleKey,
          label: ev.vehicleLabel,
          plate: ev.vehiclePlate,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => naturalCompare(a.label, b.label));
  }, [enrichedEvents]);

  // Unique natural-sorted operator options
  const operatorOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of enrichedEvents) {
      map.set(ev.operatorLabel, (map.get(ev.operatorLabel) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => naturalCompare(a.label, b.label));
  }, [enrichedEvents]);

  // Filter by search, vehicle, operator, and date range (before event type) so KPI counts stay contextual
  const baseFiltered = useMemo(() => {
    const tokens = searchQuery
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return enrichedEvents.filter((ev) => {
      if (vehicleFilter !== 'all' && ev.vehicleKey !== vehicleFilter) return false;
      if (operatorFilter !== 'all' && ev.operatorLabel !== operatorFilter) return false;
      if (dateFrom && (!ev.dateKey || ev.dateKey < dateFrom)) return false;
      if (dateTo && (!ev.dateKey || ev.dateKey > dateTo)) return false;
      if (tokens.length > 0) {
        for (const token of tokens) {
          if (!ev.searchHaystack.includes(token)) return false;
        }
      }
      return true;
    });
  }, [enrichedEvents, searchQuery, vehicleFilter, operatorFilter, dateFrom, dateTo]);

  // KPI counts derived from baseFiltered
  const kpiCounts = useMemo(() => {
    const counts = {
      all: baseFiltered.length,
      montare: 0,
      permutare: 0,
      demontare: 0,
      casare: 0,
    };
    for (const ev of baseFiltered) {
      counts[ev.meta.type] += 1;
    }
    return counts;
  }, [baseFiltered]);

  // Final filtered list (including event type)
  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return baseFiltered;
    return baseFiltered.filter((ev) => ev.meta.type === typeFilter);
  }, [baseFiltered, typeFilter]);

  // Sorted events for table view
  const sortedEvents = useMemo(() => {
    const copy = [...filteredEvents];
    const dir = sortDir === 'asc' ? 1 : -1;

    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'data':
          cmp = a.timestamp - b.timestamp;
          break;
        case 'vehicul':
          cmp = naturalCompare(a.vehicleLabel, b.vehicleLabel);
          break;
        case 'anvelopa':
          cmp = naturalCompare(`${a.tirePrimary} ${a.tireSerial}`, `${b.tirePrimary} ${b.tireSerial}`);
          break;
        case 'tip':
          cmp = naturalCompare(
            `${a.meta.label} ${a.sourceCode} ${a.destCode}`,
            `${b.meta.label} ${b.sourceCode} ${b.destCode}`
          );
          break;
        case 'contor':
          cmp = a.contorNum - b.contorNum;
          break;
        case 'operator':
          cmp = naturalCompare(a.operatorLabel, b.operatorLabel);
          break;
      }
      if (cmp !== 0) return cmp * dir;
      // Stable tie-breaker: most recent first
      return b.timestamp - a.timestamp;
    });

    return copy;
  }, [filteredEvents, sortField, sortDir]);

  // Grouped by vehicle for grouped view
  const groupedByVehicle = useMemo(() => {
    const groups = new Map<
      string,
      {
        vehicleKey: string;
        vehicleLabel: string;
        vehiclePlate: string;
        events: EnrichedEvent[];
        counts: Record<EventTypeKey, number>;
        latestDate: Date | null;
        latestTimestamp: number;
      }
    >();

    for (const ev of filteredEvents) {
      let group = groups.get(ev.vehicleKey);
      if (!group) {
        group = {
          vehicleKey: ev.vehicleKey,
          vehicleLabel: ev.vehicleLabel,
          vehiclePlate: ev.vehiclePlate,
          events: [],
          counts: { montare: 0, permutare: 0, demontare: 0, casare: 0 },
          latestDate: ev.dateObj,
          latestTimestamp: ev.timestamp,
        };
        groups.set(ev.vehicleKey, group);
      }
      group.events.push(ev);
      group.counts[ev.meta.type] += 1;
      if (ev.timestamp > group.latestTimestamp) {
        group.latestTimestamp = ev.timestamp;
        group.latestDate = ev.dateObj;
      }
    }

    const result = Array.from(groups.values());
    for (const g of result) {
      g.events.sort((a, b) => b.timestamp - a.timestamp);
    }
    result.sort((a, b) => naturalCompare(a.vehicleLabel, b.vehicleLabel));
    return result;
  }, [filteredEvents]);

  // Reset pagination when filters/sort/pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, vehicleFilter, operatorFilter, dateFrom, dateTo, sortField, sortDir, pageSize]);

  // Auto-expand vehicle cards when filtered down to <= 3 vehicles
  useEffect(() => {
    if (viewMode === 'grouped' && groupedByVehicle.length > 0 && groupedByVehicle.length <= 3) {
      const next: Record<string, boolean> = {};
      for (const g of groupedByVehicle) {
        next[g.vehicleKey] = true;
      }
      setExpandedVehicles(next);
    }
  }, [viewMode, groupedByVehicle]);

  const totalPages = Math.max(1, Math.ceil(sortedEvents.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedEvents = useMemo(
    () => sortedEvents.slice(startIndex, startIndex + pageSize),
    [sortedEvents, startIndex, pageSize]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    typeFilter !== 'all' ||
    vehicleFilter !== 'all' ||
    operatorFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = toIsoDateKey(today);

    if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
      return;
    }
    if (preset === '30d') {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      setDateFrom(toIsoDateKey(from));
      setDateTo(todayStr);
      return;
    }
    if (preset === 'year') {
      setDateFrom(`${today.getFullYear()}-01-01`);
      setDateTo(todayStr);
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setVehicleFilter('all');
    setOperatorFilter('all');
    setDateFrom('');
    setDateTo('');
    setDatePreset('all');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'data' || field === 'contor' ? 'desc' : 'asc');
    }
  };

  const handleKpiClick = (target: EventTypeFilter) => {
    if (target === 'all') {
      setTypeFilter('all');
    } else {
      setTypeFilter((prev) => (prev === target ? 'all' : target));
    }
  };

  const toggleVehicleExpanded = (vehicleKey: string) => {
    setExpandedVehicles((prev) => ({
      ...prev,
      [vehicleKey]: !prev[vehicleKey],
    }));
  };

  const setAllVehiclesExpanded = (expanded: boolean) => {
    if (!expanded) {
      setExpandedVehicles({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const g of groupedByVehicle) {
      next[g.vehicleKey] = true;
    }
    setExpandedVehicles(next);
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-sage-500 opacity-70" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-sapphire-700" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sapphire-700" />
    );
  };

  // Pagination page numbers window
  const visiblePageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, safePage - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }
    return pages;
  }, [safePage, totalPages]);

  return (
    <div className="space-y-4">
      {/* Header & View Mode Switcher */}
      <div className="pleasant-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-800 border border-sapphire-200">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-sapphire-900">
                Registru Audit Schimburi &amp; Permutări Anvelope
              </h2>
              <p className="text-xs text-sage-700 font-medium">
                {filteredEvents.length.toLocaleString('ro-RO')} evenimente afișate
                {filteredEvents.length !== enrichedEvents.length
                  ? ` din ${enrichedEvents.length.toLocaleString('ro-RO')} total`
                  : ' în registru'}
              </p>
            </div>
          </div>

          {/* View Mode Segmented Control */}
          <div
            className="inline-flex items-center rounded-xl bg-morning-100 p-1 border border-morning-200 self-start sm:self-auto"
            role="tablist"
            aria-label="Mod vizualizare istoric"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'table'
                  ? 'bg-sapphire-600 text-white shadow-sm'
                  : 'text-sage-700 hover:text-sapphire-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Tabel Paginat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'grouped'}
              onClick={() => setViewMode('grouped')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'grouped'
                  ? 'bg-sapphire-600 text-white shadow-sm'
                  : 'text-sage-700 hover:text-sapphire-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Grupat pe Vehicul
            </button>
          </div>
        </div>

        {/* Clickable KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <button
            type="button"
            aria-pressed={typeFilter === 'all'}
            onClick={() => handleKpiClick('all')}
            className={`text-left rounded-xl p-3 border transition ${
              typeFilter === 'all'
                ? 'border-sapphire-400 ring-2 ring-sapphire-500/30 bg-sapphire-50/70'
                : 'border-morning-200 bg-morning-50 hover:border-sapphire-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sage-700">
                Total Evenimente
              </span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-sapphire-700" />
            </div>
            <p className="mt-1 text-xl font-extrabold font-mono text-sapphire-900">
              {kpiCounts.all.toLocaleString('ro-RO')}
            </p>
          </button>

          {(['montare', 'permutare', 'demontare', 'casare'] as EventTypeKey[]).map((key) => {
            const meta = EVENT_META[key];
            const isActive = typeFilter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleKpiClick(key)}
                className={`text-left rounded-xl p-3 border transition ${
                  isActive
                    ? meta.kpiActiveClass
                    : 'border-morning-200 bg-morning-50 hover:border-sapphire-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sage-700">
                    {meta.shortLabel}
                  </span>
                  <span className={`inline-flex items-center justify-center p-1 rounded-md ${meta.badgeClass}`}>
                    <EventTypeIcon type={key} className="w-3 h-3" />
                  </span>
                </div>
                <p className="mt-1 text-xl font-extrabold font-mono text-sapphire-900">
                  {kpiCounts[key].toLocaleString('ro-RO')}
                </p>
              </button>
            );
          })}
        </div>

        {/* Search & Multi-Criteria Filter Bar */}
        <div className="rounded-xl bg-morning-100/70 border border-morning-200 p-3.5 space-y-3">
          {/* Row 1: Search + Vehicle + Operator */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-sage-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Caută utilaj, serie anvelopă, marcă, dimensiune, poziție, operator, observații..."
                aria-label="Caută în istoricul permutărilor"
                className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-lg bg-morning-50 border border-morning-300 text-sapphire-900 placeholder:text-sage-600 focus:outline-none focus:ring-2 focus:ring-sapphire-500/40 focus:border-sapphire-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Șterge căutarea"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-600 hover:text-sapphire-900 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="md:col-span-4 relative">
              <Truck className="w-3.5 h-3.5 text-sage-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <FilterableSelect
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                title="Filtrează după vehicul"
                searchPlaceholder="Caută vehicul..."
                className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-lg bg-morning-50 border border-morning-300 text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/40 focus:border-sapphire-500"
              >
                <option value="all">Toate vehiculele ({vehicleOptions.length})</option>
                {vehicleOptions.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                    {v.plate ? ` (${v.plate})` : ''} — {v.count}
                  </option>
                ))}
              </FilterableSelect>
            </div>

            <div className="md:col-span-3 relative">
              <User className="w-3.5 h-3.5 text-sage-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <FilterableSelect
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                title="Filtrează după operator sau sursă"
                searchPlaceholder="Caută operator..."
                className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-lg bg-morning-50 border border-morning-300 text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/40 focus:border-sapphire-500"
              >
                <option value="all">Toți operatorii ({operatorOptions.length})</option>
                {operatorOptions.map((op) => (
                  <option key={op.label} value={op.label}>
                    {op.label} ({op.count})
                  </option>
                ))}
              </FilterableSelect>
            </div>
          </div>

          {/* Row 2: Event Type Chips + Date Range + Presets + Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-morning-200/80">
            {/* Event Type Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrare după tip eveniment">
              {(
                [
                  { key: 'all', label: 'Toate' },
                  { key: 'montare', label: 'Montări' },
                  { key: 'permutare', label: 'Permutări' },
                  { key: 'demontare', label: 'Demontări' },
                  { key: 'casare', label: 'Casări' },
                ] as Array<{ key: EventTypeFilter; label: string }>
              ).map((chip) => {
                const active = typeFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTypeFilter(chip.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      active
                        ? 'bg-sapphire-600 text-white border-sapphire-600 shadow-sm'
                        : 'bg-morning-50 text-sapphire-900 border-morning-300 hover:border-sapphire-400'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Date Range + Quick Presets + Reset */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sage-600 shrink-0" />
                <label className="text-[11px] font-bold text-sage-700" htmlFor="istoric-date-from">
                  De la
                </label>
                <input
                  id="istoric-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="px-2 py-1 text-xs font-medium rounded-lg bg-morning-50 border border-morning-300 text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/40"
                />
                <label className="text-[11px] font-bold text-sage-700" htmlFor="istoric-date-to">
                  Până la
                </label>
                <input
                  id="istoric-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="px-2 py-1 text-xs font-medium rounded-lg bg-morning-50 border border-morning-300 text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/40"
                />
              </div>

              <div className="inline-flex items-center rounded-lg border border-morning-300 bg-morning-50 p-0.5">
                {(
                  [
                    { key: '30d', label: '30 zile' },
                    { key: 'year', label: 'Anul curent' },
                    { key: 'all', label: 'Tot' },
                  ] as Array<{ key: DatePreset; label: string }>
                ).map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => applyDatePreset(preset.key)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                      datePreset === preset.key
                        ? 'bg-sapphire-600 text-white'
                        : 'text-sage-700 hover:text-sapphire-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 hover:opacity-90 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Resetează
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="pleasant-card p-10 text-center space-y-2">
          <History className="w-8 h-8 text-sage-500 mx-auto" />
          <p className="text-sm font-bold text-sapphire-900">
            Nu există evenimente care să corespundă filtrelor selectate.
          </p>
          <p className="text-xs text-sage-700">
            Ajustează termenul de căutare, intervalul de date sau resetează filtrele active.
          </p>
          {hasActiveFilters && (
            <div className="pt-2">
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sapphire-600 text-white hover:bg-sapphire-700 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Resetează toate filtrele
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* VIEW MODE 1: PAGINATED & SORTABLE TABLE */
        <div className="pleasant-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[920px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('data')}
                      className="inline-flex items-center gap-1 hover:text-sapphire-900 uppercase font-bold"
                    >
                      Dată {renderSortIcon('data')}
                    </button>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('vehicul')}
                      className="inline-flex items-center gap-1 hover:text-sapphire-900 uppercase font-bold"
                    >
                      Vehicul {renderSortIcon('vehicul')}
                    </button>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('anvelopa')}
                      className="inline-flex items-center gap-1 hover:text-sapphire-900 uppercase font-bold"
                    >
                      Anvelopă {renderSortIcon('anvelopa')}
                    </button>
                  </th>
                  <th className="p-3">
                    <button
                      type="button"
                      onClick={() => handleSort('tip')}
                      className="inline-flex items-center gap-1 hover:text-sapphire-900 uppercase font-bold"
                    >
                      Tip &amp; Traseu {renderSortIcon('tip')}
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('contor')}
                      className="inline-flex items-center gap-1 hover:text-sapphire-900 uppercase font-bold ml-auto"
                    >
                      Contor {renderSortIcon('contor')}
                    </button>
                  </th>
                  <th className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('operator')}
                      className="inline-flex items-center gap-1 hover:text-sapphire-900 uppercase font-bold ml-auto"
                    >
                      Operator {renderSortIcon('operator')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {paginatedEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 whitespace-nowrap font-mono font-semibold text-sage-700">
                      {formatDisplayDate(ev.dateObj)}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <div className="font-extrabold text-sapphire-900">{ev.vehicleLabel}</div>
                      {ev.vehiclePlate && (
                        <div className="text-[11px] font-medium text-sage-600">{ev.vehiclePlate}</div>
                      )}
                    </td>

                    <td className="p-3">
                      {ev.anvelopaId ? (
                        <button
                          type="button"
                          onClick={() => onOpenHistory(ev.anvelopaId)}
                          title="Deschide istoricul complet al anvelopei"
                          className="group text-left inline-flex flex-col focus:outline-none"
                        >
                          <span className="inline-flex items-center gap-1 font-bold text-sapphire-900 group-hover:text-sapphire-600 group-hover:underline">
                            {ev.tirePrimary}
                            <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 shrink-0" />
                          </span>
                          <span className="text-[11px] font-mono text-sage-700">
                            {ev.tireSerial || 'Fără serie'}
                            {ev.tireDimension ? ` · ${ev.tireDimension}` : ''}
                          </span>
                        </button>
                      ) : (
                        <div>
                          <div className="font-bold text-sapphire-900">{ev.tirePrimary}</div>
                          <div className="text-[11px] font-mono text-sage-700">
                            {ev.tireSerial || 'Fără serie'}
                            {ev.tireDimension ? ` · ${ev.tireDimension}` : ''}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${ev.meta.badgeClass}`}
                        >
                          <EventTypeIcon type={ev.meta.type} className="w-3 h-3" />
                          {ev.meta.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-morning-100 border border-morning-200 text-sapphire-900">
                            {formatPositionCode(ev.sourceCode)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-sage-600 shrink-0" />
                          <span className="px-1.5 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-900">
                            {formatPositionCode(ev.destCode)}
                          </span>
                        </span>
                      </div>
                      {ev.observatii && (
                        <p className="mt-1 text-[11px] text-sage-700 line-clamp-1" title={ev.observatii}>
                          {ev.observatii}
                        </p>
                      )}
                    </td>

                    <td className="p-3 whitespace-nowrap text-right font-mono font-extrabold text-sapphire-900">
                      {ev.contorFormatted}
                    </td>

                    <td className="p-3 whitespace-nowrap text-right font-semibold text-sage-700">
                      {ev.operatorLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-morning-100/60 border-t border-morning-200">
            <div className="flex flex-wrap items-center gap-3 text-xs text-sage-700 font-medium">
              <span>
                Afișate{' '}
                <strong className="text-sapphire-900 font-mono">
                  {(startIndex + 1).toLocaleString('ro-RO')}–
                  {Math.min(startIndex + pageSize, sortedEvents.length).toLocaleString('ro-RO')}
                </strong>{' '}
                din{' '}
                <strong className="text-sapphire-900 font-mono">
                  {sortedEvents.length.toLocaleString('ro-RO')}
                </strong>
              </span>

              <div className="inline-flex items-center gap-1.5">
                <label htmlFor="istoric-page-size" className="text-[11px] font-bold text-sage-700">
                  Pe pagină:
                </label>
                <select
                  id="istoric-page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 text-xs font-bold rounded-lg bg-morning-50 border border-morning-300 text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/40"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(1)}
                aria-label="Prima pagină"
                className="p-1.5 rounded-lg border border-morning-300 bg-morning-50 text-sapphire-900 hover:border-sapphire-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Pagina anterioară"
                className="p-1.5 rounded-lg border border-morning-300 bg-morning-50 text-sapphire-900 hover:border-sapphire-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {visiblePageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  aria-current={pageNum === safePage ? 'page' : undefined}
                  className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-bold font-mono border transition ${
                    pageNum === safePage
                      ? 'bg-sapphire-600 text-white border-sapphire-600 shadow-sm'
                      : 'bg-morning-50 text-sapphire-900 border-morning-300 hover:border-sapphire-400'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Pagina următoare"
                className="p-1.5 rounded-lg border border-morning-300 bg-morning-50 text-sapphire-900 hover:border-sapphire-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                aria-label="Ultima pagină"
                className="p-1.5 rounded-lg border border-morning-300 bg-morning-50 text-sapphire-900 hover:border-sapphire-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: GROUPED BY VEHICLE */
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs font-bold text-sage-700">
              {groupedByVehicle.length.toLocaleString('ro-RO')} vehicule cu evenimente în selecția curentă
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllVehiclesExpanded(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-morning-50 border border-morning-300 text-sapphire-900 hover:border-sapphire-400 transition"
              >
                Extinde tot
              </button>
              <button
                type="button"
                onClick={() => setAllVehiclesExpanded(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-morning-50 border border-morning-300 text-sapphire-900 hover:border-sapphire-400 transition"
              >
                Restrânge tot
              </button>
            </div>
          </div>

          {groupedByVehicle.map((group) => {
            const isExpanded = !!expandedVehicles[group.vehicleKey];
            return (
              <div key={group.vehicleKey} className="pleasant-card overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleVehicleExpanded(group.vehicleKey)}
                  className="w-full px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-morning-50 transition text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sage-700 shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                    <div className="p-1.5 rounded-lg bg-sapphire-100 text-sapphire-800 border border-sapphire-200 shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-sapphire-900">
                          {group.vehicleLabel}
                        </span>
                        {group.vehiclePlate && (
                          <span className="text-xs font-semibold text-sage-700">
                            {group.vehiclePlate}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-sage-700">
                        Ultimul eveniment: {formatDisplayDate(group.latestDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['montare', 'permutare', 'demontare', 'casare'] as EventTypeKey[]).map((key) => {
                      const count = group.counts[key];
                      if (count === 0) return null;
                      const meta = EVENT_META[key];
                      return (
                        <span
                          key={key}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.badgeClass}`}
                        >
                          {count} {meta.shortLabel.toLowerCase()}
                        </span>
                      );
                    })}
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold font-mono bg-morning-100 border border-morning-200 text-sapphire-900">
                      {group.events.length} total
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-morning-200 divide-y divide-morning-200 bg-morning-50/40">
                    {group.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="px-4 py-3 space-y-1.5 hover:bg-morning-50 transition"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                            <span className="font-mono text-xs font-bold text-sage-700 w-[84px] shrink-0">
                              {formatDisplayDate(ev.dateObj)}
                            </span>

                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${ev.meta.badgeClass}`}
                            >
                              <EventTypeIcon type={ev.meta.type} className="w-3 h-3" />
                              {ev.meta.label}
                            </span>

                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold">
                              <span className="px-1.5 py-0.5 rounded bg-morning-100 border border-morning-200 text-sapphire-900">
                                {formatPositionCode(ev.sourceCode)}
                              </span>
                              <ArrowRight className="w-3 h-3 text-sage-600 shrink-0" />
                              <span className="px-1.5 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-900">
                                {formatPositionCode(ev.destCode)}
                              </span>
                            </span>

                            {ev.anvelopaId ? (
                              <button
                                type="button"
                                onClick={() => onOpenHistory(ev.anvelopaId)}
                                title="Deschide istoricul complet al anvelopei"
                                className="inline-flex items-center gap-1 text-xs font-bold text-sapphire-900 hover:text-sapphire-600 hover:underline"
                              >
                                <span>{ev.tirePrimary}</span>
                                <span className="font-mono text-[11px] text-sage-700 font-semibold">
                                  ({ev.tireSerial || 'Fără serie'}
                                  {ev.tireDimension ? ` · ${ev.tireDimension}` : ''})
                                </span>
                                <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-sapphire-900">
                                {ev.tirePrimary}{' '}
                                <span className="font-mono text-[11px] text-sage-700 font-semibold">
                                  ({ev.tireSerial || 'Fără serie'})
                                </span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0 text-xs">
                            <span className="font-mono font-extrabold text-sapphire-900">
                              {ev.contorFormatted}
                            </span>
                            <span className="text-sage-700 font-semibold">{ev.operatorLabel}</span>
                          </div>
                        </div>

                        {ev.observatii && (
                          <p className="text-[11px] text-sage-700 lg:pl-[94px]">
                            {ev.observatii}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
