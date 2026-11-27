"use client";

import React, { useMemo, useState } from 'react';
import FilterableSelect from '@/components/FilterableSelect';
import {
  Search,
  X,
  RotateCcw,
  Award,
  Gauge,
  Layers,
  TrendingUp,
  Coins,
  Building2,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Info,
} from 'lucide-react';

export interface AnalizaTcoTabProps {
  flotaAnvelope: any[];
  tcoData: any[];
}

type StareScope = 'TOATE' | 'CASATA' | 'MONTATA';

type SortKey =
  | 'marca'
  | 'totalCount'
  | 'montateCount'
  | 'casateCount'
  | 'avgKm'
  | 'maxKm'
  | 'totalKm'
  | 'avgPrice'
  | 'costPer10kKm';

type SortDir = 'asc' | 'desc';

interface NormalizedTire {
  id: string;
  marca: string;
  model: string;
  dimensiune: string;
  furnizor: string;
  serieAnvelopa: string;
  stare: string;
  categorieVehicul: string;
  effectiveKm: number;
  pretAchizitie: number;
}

interface DimensionBreakdown {
  dimensiune: string;
  totalCount: number;
  montateCount: number;
  casateCount: number;
  kmCount: number;
  avgKm: number | null;
  maxKm: number;
  totalKm: number;
  pricedCount: number;
  avgPrice: number | null;
  costSampleCount: number;
  costPer10kKm: number | null;
}

interface BrandStats {
  marca: string;
  totalCount: number;
  montateCount: number;
  casateCount: number;
  inStocCount: number;
  kmCount: number;
  avgKm: number | null;
  maxKm: number;
  totalKm: number;
  pricedCount: number;
  avgPrice: number | null;
  costSampleCount: number;
  costPer10kKm: number | null;
  dimensions: DimensionBreakdown[];
}

interface SupplierStats {
  furnizor: string;
  isUnspecified: boolean;
  totalCount: number;
  sharePct: number;
  kmCount: number;
  avgKm: number | null;
  pricedCount: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  CAP_TRACTOR: 'Cap Tractor',
  SEMIREMORCA: 'Semiremorcă',
  REMORCA: 'Remorcă',
  CAMION_8X4: 'Camion 8x4',
  CAMION_6X4: 'Camion 6x4',
  CAMION_4X2: 'Camion 4x2',
  BASCULANTA: 'Basculantă',
  AUTOUTILITARA: 'Autoutilitară',
  DUBITA: 'Dubiță',
  AUTOTURISM: 'Autoturism',
  UTILAJ: 'Utilaj',
  ATV: 'ATV',
};

function formatCategoryLabel(raw: string): string {
  if (!raw) return 'Fără categorie';
  if (CATEGORY_LABELS[raw]) return CATEGORY_LABELS[raw];
  return raw
    .toLowerCase()
    .split('_')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

function getEffectiveKm(a: any): number {
  const baseKm = Number(a?.rulajTotalKm) || 0;
  const montareKm = Number(a?.kilometrajMontare) || 0;
  const curentKm = Number(a?.vehicul?.valoareContorCurent) || 0;

  if (a?.stare === 'MONTATA' && a?.vehicul && curentKm > montareKm) {
    return Math.max(0, baseKm + (curentKm - montareKm));
  }
  return Math.max(0, baseKm);
}

function formatInt(val: number): string {
  return Math.round(val).toLocaleString('ro-RO');
}

function formatCurrency(val: number): string {
  return val.toLocaleString('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'ro-RO', { numeric: true, sensitivity: 'base' });
}

export default function AnalizaTcoTab({ flotaAnvelope, tcoData }: AnalizaTcoTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stareScope, setStareScope] = useState<StareScope>('TOATE');
  const [selectedDimensiune, setSelectedDimensiune] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('');
  const [selectedFurnizor, setSelectedFurnizor] = useState('');

  const [sortKey, setSortKey] = useState<SortKey>('totalCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  // 1. Normalize all tires once per flotaAnvelope change
  const normalizedTires = useMemo<NormalizedTire[]>(() => {
    const source = Array.isArray(flotaAnvelope) ? flotaAnvelope : [];
    return source.map((a: any, idx: number) => {
      const brand = (a?.marca || 'Nespecificat').trim().toUpperCase() || 'NESPECIFICAT';
      const dim = (a?.dimensiune || '').trim().toUpperCase();
      const furnizor = (a?.furnizor || '').trim();
      const categorie = (a?.vehicul?.categorieEnum || '').trim().toUpperCase();
      const pret = Number(a?.pretAchizitie) || 0;

      return {
        id: String(a?.id ?? idx),
        marca: brand,
        model: (a?.model || '').trim(),
        dimensiune: dim,
        furnizor,
        serieAnvelopa: (a?.serieAnvelopa || '').trim(),
        stare: (a?.stare || '').trim().toUpperCase(),
        categorieVehicul: categorie,
        effectiveKm: getEffectiveKm(a),
        pretAchizitie: pret > 0 ? pret : 0,
      };
    });
  }, [flotaAnvelope]);

  // 2. Dropdown options derived from dataset
  const filterOptions = useMemo(() => {
    const dimMap = new Map<string, number>();
    const catMap = new Map<string, number>();
    const supMap = new Map<string, number>();

    for (const t of normalizedTires) {
      if (t.dimensiune) {
        dimMap.set(t.dimensiune, (dimMap.get(t.dimensiune) || 0) + 1);
      }
      if (t.categorieVehicul) {
        catMap.set(t.categorieVehicul, (catMap.get(t.categorieVehicul) || 0) + 1);
      }
      if (t.furnizor) {
        supMap.set(t.furnizor, (supMap.get(t.furnizor) || 0) + 1);
      }
    }

    const dimensiuni = Array.from(dimMap.entries())
      .sort((a, b) => b[1] - a[1] || naturalCompare(a[0], b[0]))
      .map(([value, count]) => ({ value, count }));

    const categorii = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1] || naturalCompare(a[0], b[0]))
      .map(([value, count]) => ({ value, label: formatCategoryLabel(value), count }));

    const furnizori = Array.from(supMap.entries())
      .sort((a, b) => b[1] - a[1] || naturalCompare(a[0], b[0]))
      .map(([value, count]) => ({ value, count }));

    return { dimensiuni, categorii, furnizori };
  }, [normalizedTires]);

  // 3. Base filter (everything except Stare scope) so scope chip counts stay contextual
  const baseFilteredTires = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return normalizedTires.filter((t) => {
      if (selectedDimensiune && t.dimensiune !== selectedDimensiune) return false;
      if (selectedCategorie && t.categorieVehicul !== selectedCategorie) return false;
      if (selectedFurnizor && t.furnizor !== selectedFurnizor) return false;
      if (q) {
        const matches =
          t.marca.toLowerCase().includes(q) ||
          t.dimensiune.toLowerCase().includes(q) ||
          t.furnizor.toLowerCase().includes(q) ||
          t.model.toLowerCase().includes(q) ||
          t.serieAnvelopa.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [normalizedTires, searchQuery, selectedDimensiune, selectedCategorie, selectedFurnizor]);

  const scopeCounts = useMemo(() => {
    let casate = 0;
    let montate = 0;
    for (const t of baseFilteredTires) {
      if (t.stare === 'CASATA') casate++;
      else if (t.stare === 'MONTATA') montate++;
    }
    return {
      toate: baseFilteredTires.length,
      casate,
      montate,
    };
  }, [baseFilteredTires]);

  // 4. Final filtered dataset
  const filteredTires = useMemo(() => {
    if (stareScope === 'TOATE') return baseFilteredTires;
    return baseFilteredTires.filter((t) => t.stare === stareScope);
  }, [baseFilteredTires, stareScope]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    stareScope !== 'TOATE' ||
    Boolean(selectedDimensiune) ||
    Boolean(selectedCategorie) ||
    Boolean(selectedFurnizor);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStareScope('TOATE');
    setSelectedDimensiune('');
    setSelectedCategorie('');
    setSelectedFurnizor('');
  };

  // 5. Aggregate Brand Stats + Inline Dimension Breakdowns
  const brandStats = useMemo<BrandStats[]>(() => {
    const brandMap = new Map<
      string,
      {
        totalCount: number;
        montateCount: number;
        casateCount: number;
        inStocCount: number;
        kmCount: number;
        kmSum: number;
        maxKm: number;
        pricedCount: number;
        priceSum: number;
        costSampleCount: number;
        costPriceSum: number;
        costKmSum: number;
        dimMap: Map<
          string,
          {
            totalCount: number;
            montateCount: number;
            casateCount: number;
            kmCount: number;
            kmSum: number;
            maxKm: number;
            pricedCount: number;
            priceSum: number;
            costSampleCount: number;
            costPriceSum: number;
            costKmSum: number;
          }
        >;
      }
    >();

    for (const t of filteredTires) {
      let b = brandMap.get(t.marca);
      if (!b) {
        b = {
          totalCount: 0,
          montateCount: 0,
          casateCount: 0,
          inStocCount: 0,
          kmCount: 0,
          kmSum: 0,
          maxKm: 0,
          pricedCount: 0,
          priceSum: 0,
          costSampleCount: 0,
          costPriceSum: 0,
          costKmSum: 0,
          dimMap: new Map(),
        };
        brandMap.set(t.marca, b);
      }

      b.totalCount++;
      if (t.stare === 'MONTATA') b.montateCount++;
      else if (t.stare === 'CASATA') b.casateCount++;
      else if (t.stare === 'IN_STOC') b.inStocCount++;

      if (t.effectiveKm > 0) {
        b.kmCount++;
        b.kmSum += t.effectiveKm;
        if (t.effectiveKm > b.maxKm) b.maxKm = t.effectiveKm;
      }

      if (t.pretAchizitie > 0) {
        b.pricedCount++;
        b.priceSum += t.pretAchizitie;
      }

      if (t.pretAchizitie > 0 && t.effectiveKm > 0) {
        b.costSampleCount++;
        b.costPriceSum += t.pretAchizitie;
        b.costKmSum += t.effectiveKm;
      }

      const dimKey = t.dimensiune || 'NESPECIFICATĂ';
      let d = b.dimMap.get(dimKey);
      if (!d) {
        d = {
          totalCount: 0,
          montateCount: 0,
          casateCount: 0,
          kmCount: 0,
          kmSum: 0,
          maxKm: 0,
          pricedCount: 0,
          priceSum: 0,
          costSampleCount: 0,
          costPriceSum: 0,
          costKmSum: 0,
        };
        b.dimMap.set(dimKey, d);
      }

      d.totalCount++;
      if (t.stare === 'MONTATA') d.montateCount++;
      else if (t.stare === 'CASATA') d.casateCount++;

      if (t.effectiveKm > 0) {
        d.kmCount++;
        d.kmSum += t.effectiveKm;
        if (t.effectiveKm > d.maxKm) d.maxKm = t.effectiveKm;
      }

      if (t.pretAchizitie > 0) {
        d.pricedCount++;
        d.priceSum += t.pretAchizitie;
      }

      if (t.pretAchizitie > 0 && t.effectiveKm > 0) {
        d.costSampleCount++;
        d.costPriceSum += t.pretAchizitie;
        d.costKmSum += t.effectiveKm;
      }
    }

    const result: BrandStats[] = [];
    brandMap.forEach((b, marca) => {
      const dimensions: DimensionBreakdown[] = Array.from(b.dimMap.entries())
        .map(([dimensiune, d]) => ({
          dimensiune,
          totalCount: d.totalCount,
          montateCount: d.montateCount,
          casateCount: d.casateCount,
          kmCount: d.kmCount,
          avgKm: d.kmCount > 0 ? d.kmSum / d.kmCount : null,
          maxKm: d.maxKm,
          totalKm: d.kmSum,
          pricedCount: d.pricedCount,
          avgPrice: d.pricedCount > 0 ? d.priceSum / d.pricedCount : null,
          costSampleCount: d.costSampleCount,
          costPer10kKm: d.costKmSum > 0 ? (d.costPriceSum / d.costKmSum) * 10000 : null,
        }))
        .sort((a, x) => x.totalCount - a.totalCount || naturalCompare(a.dimensiune, x.dimensiune));

      result.push({
        marca,
        totalCount: b.totalCount,
        montateCount: b.montateCount,
        casateCount: b.casateCount,
        inStocCount: b.inStocCount,
        kmCount: b.kmCount,
        avgKm: b.kmCount > 0 ? b.kmSum / b.kmCount : null,
        maxKm: b.maxKm,
        totalKm: b.kmSum,
        pricedCount: b.pricedCount,
        avgPrice: b.pricedCount > 0 ? b.priceSum / b.pricedCount : null,
        costSampleCount: b.costSampleCount,
        costPer10kKm: b.costKmSum > 0 ? (b.costPriceSum / b.costKmSum) * 10000 : null,
        dimensions,
      });
    });

    return result;
  }, [filteredTires]);

  // 6. Executive KPIs
  const kpis = useMemo(() => {
    let montateCount = 0;
    let casateCount = 0;
    let kmCount = 0;
    let kmSum = 0;
    let maxKm = 0;
    let pricedCount = 0;
    let priceSum = 0;
    let costSampleCount = 0;
    let costPriceSum = 0;
    let costKmSum = 0;

    for (const t of filteredTires) {
      if (t.stare === 'MONTATA') montateCount++;
      else if (t.stare === 'CASATA') casateCount++;

      if (t.effectiveKm > 0) {
        kmCount++;
        kmSum += t.effectiveKm;
        if (t.effectiveKm > maxKm) maxKm = t.effectiveKm;
      }

      if (t.pretAchizitie > 0) {
        pricedCount++;
        priceSum += t.pretAchizitie;
      }

      if (t.pretAchizitie > 0 && t.effectiveKm > 0) {
        costSampleCount++;
        costPriceSum += t.pretAchizitie;
        costKmSum += t.effectiveKm;
      }
    }

    // Longest-lasting brand (>= 3 tires with km > 0)
    const longestBrand =
      brandStats
        .filter((b) => b.kmCount >= 3 && b.avgKm !== null)
        .sort((a, b) => (b.avgKm ?? 0) - (a.avgKm ?? 0))[0] || null;

    // Most used brand (by tire count)
    const mostUsedBrand =
      [...brandStats].sort(
        (a, b) => b.totalCount - a.totalCount || naturalCompare(a.marca, b.marca)
      )[0] || null;

    return {
      totalTires: filteredTires.length,
      brandCount: brandStats.length,
      montateCount,
      casateCount,
      kmCount,
      avgFleetKm: kmCount > 0 ? kmSum / kmCount : null,
      maxKm,
      totalKm: kmSum,
      pricedCount,
      avgFleetPrice: pricedCount > 0 ? priceSum / pricedCount : null,
      costSampleCount,
      costPer10kKm: costKmSum > 0 ? (costPriceSum / costKmSum) * 10000 : null,
      longestBrand,
      mostUsedBrand,
    };
  }, [filteredTires, brandStats]);

  // 7. Chart 1: Top 10 brands by longevity (>= 2 tires with km > 0)
  const topLongevityBrands = useMemo(() => {
    return brandStats
      .filter((b) => b.kmCount >= 2 && b.avgKm !== null)
      .sort((a, b) => (b.avgKm ?? 0) - (a.avgKm ?? 0))
      .slice(0, 10);
  }, [brandStats]);

  const maxLongevityKm = topLongevityBrands.length > 0 ? topLongevityBrands[0].avgKm || 1 : 1;

  // 8. Chart 2: Supplier distribution (top 10 by volume)
  const supplierStats = useMemo<SupplierStats[]>(() => {
    const map = new Map<
      string,
      { isUnspecified: boolean; totalCount: number; kmCount: number; kmSum: number; pricedCount: number }
    >();

    for (const t of filteredTires) {
      const hasSupplier = Boolean(t.furnizor);
      const key = hasSupplier ? t.furnizor : 'Fără furnizor înregistrat';
      let s = map.get(key);
      if (!s) {
        s = { isUnspecified: !hasSupplier, totalCount: 0, kmCount: 0, kmSum: 0, pricedCount: 0 };
        map.set(key, s);
      }
      s.totalCount++;
      if (t.effectiveKm > 0) {
        s.kmCount++;
        s.kmSum += t.effectiveKm;
      }
      if (t.pretAchizitie > 0) {
        s.pricedCount++;
      }
    }

    const total = filteredTires.length || 1;
    return Array.from(map.entries())
      .map(([furnizor, s]) => ({
        furnizor,
        isUnspecified: s.isUnspecified,
        totalCount: s.totalCount,
        sharePct: (s.totalCount / total) * 100,
        kmCount: s.kmCount,
        avgKm: s.kmCount > 0 ? s.kmSum / s.kmCount : null,
        pricedCount: s.pricedCount,
      }))
      .sort((a, b) => {
        if (a.isUnspecified !== b.isUnspecified) return a.isUnspecified ? 1 : -1;
        return b.totalCount - a.totalCount || naturalCompare(a.furnizor, b.furnizor);
      })
      .slice(0, 10);
  }, [filteredTires]);

  const maxSupplierVolume = useMemo(
    () => supplierStats.reduce((max, s) => Math.max(max, s.totalCount), 1),
    [supplierStats]
  );

  // 9. Sorted Brand Table
  const sortedBrands = useMemo(() => {
    const copy = [...brandStats];
    copy.sort((a, b) => {
      if (sortKey === 'marca') {
        const cmp = naturalCompare(a.marca, b.marca);
        return sortDir === 'asc' ? cmp : -cmp;
      }

      const valA = a[sortKey];
      const valB = b[sortKey];

      // Always keep null (N/A) rows at the bottom regardless of sort direction
      if (valA === null && valB === null) return naturalCompare(a.marca, b.marca);
      if (valA === null) return 1;
      if (valB === null) return -1;

      const diff = Number(valA) - Number(valB);
      if (diff !== 0) return sortDir === 'asc' ? diff : -diff;
      return b.totalCount - a.totalCount || naturalCompare(a.marca, b.marca);
    });
    return copy;
  }, [brandStats, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      // Natural default: ascending for brand name or cost/10k (lower cost is better), descending for counts/km/price
      setSortDir(key === 'marca' || key === 'costPer10kKm' ? 'asc' : 'desc');
    }
  };

  const toggleBrandExpand = (marca: string) => {
    setExpandedBrands((prev) => ({ ...prev, [marca]: !prev[marca] }));
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3 h-3 opacity-45 shrink-0" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-sapphire-600 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-sapphire-600 shrink-0" />
    );
  };

  // Keep reference to backend tcoData count for transparency if helpful
  const backendTcoCount = Array.isArray(tcoData) ? tcoData.length : 0;

  return (
    <div className="space-y-5">
      {/* HEADER + FILTER BAR */}
      <div className="pleasant-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-sapphire-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sapphire-600 shrink-0" />
              <span>Analiză TCO &amp; Longevitate Mărci Anvelope</span>
            </h2>
            <p className="text-xs text-sage-600 mt-0.5">
              Performanță calculată în timp real pe baza rulajului efectiv (inclusiv km acumulați pe vehiculele active) și a achizițiilor cu preț.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sapphire-50 border border-sapphire-200 text-sapphire-900 text-xs font-bold font-mono tabular-nums">
              <Filter className="w-3.5 h-3.5 text-sapphire-600 shrink-0" />
              {formatInt(filteredTires.length)} / {formatInt(normalizedTires.length)} anvelope
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sapphire-600" />
                <span>Resetează</span>
              </button>
            )}
          </div>
        </div>

        {/* Stare scope chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStareScope('TOATE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition inline-flex items-center gap-2 cursor-pointer ${
              stareScope === 'TOATE'
                ? 'bg-sapphire-500 text-white border-sapphire-500 shadow-xs'
                : 'bg-white text-sapphire-900 border-morning-300 hover:bg-morning-100'
            }`}
          >
            <span>Toate</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold tabular-nums ${
                stareScope === 'TOATE'
                  ? 'bg-white/20 text-white'
                  : 'bg-morning-100 text-sage-700'
              }`}
            >
              {formatInt(scopeCounts.toate)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStareScope('CASATA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition inline-flex items-center gap-2 cursor-pointer ${
              stareScope === 'CASATA'
                ? 'bg-sapphire-500 text-white border-sapphire-500 shadow-xs'
                : 'bg-white text-sapphire-900 border-morning-300 hover:bg-morning-100'
            }`}
            title="Ideal pentru măsurarea longevității reale pe ciclu complet de viață"
          >
            <span>Doar Casate (ciclu complet)</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold tabular-nums ${
                stareScope === 'CASATA'
                  ? 'bg-white/20 text-white'
                  : 'bg-roseash-100 text-terracotta-700'
              }`}
            >
              {formatInt(scopeCounts.casate)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStareScope('MONTATA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition inline-flex items-center gap-2 cursor-pointer ${
              stareScope === 'MONTATA'
                ? 'bg-sapphire-500 text-white border-sapphire-500 shadow-xs'
                : 'bg-white text-sapphire-900 border-morning-300 hover:bg-morning-100'
            }`}
          >
            <span>Doar Montate</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold tabular-nums ${
                stareScope === 'MONTATA'
                  ? 'bg-white/20 text-white'
                  : 'bg-sapphire-50 text-sapphire-700'
              }`}
            >
              {formatInt(scopeCounts.montate)}
            </span>
          </button>
        </div>

        {/* Search + Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-sage-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Caută marcă, dimensiune, furnizor..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-morning-300 text-xs font-medium text-sapphire-900 placeholder:text-sage-500 focus:outline-none focus:ring-2 focus:ring-sapphire-500/30 focus:border-sapphire-500"
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

          {/* Dimensiune */}
          <FilterableSelect
            value={selectedDimensiune}
            onChange={(e) => setSelectedDimensiune(e.target.value)}
            title="Filtrează după dimensiune"
            searchPlaceholder="Caută dimensiune (ex: 315/80)..."
            className="w-full px-3 py-2 rounded-xl bg-white border border-morning-300 text-xs font-semibold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/30 focus:border-sapphire-500"
          >
            <option value="">Toate dimensiunile ({filterOptions.dimensiuni.length})</option>
            {filterOptions.dimensiuni.map((d) => (
              <option key={d.value} value={d.value}>
                {d.value} ({d.count} buc)
              </option>
            ))}
          </FilterableSelect>

          {/* Categorie Vehicul */}
          <FilterableSelect
            value={selectedCategorie}
            onChange={(e) => setSelectedCategorie(e.target.value)}
            title="Filtrează după categorie vehicul"
            searchPlaceholder="Caută categorie vehicul..."
            className="w-full px-3 py-2 rounded-xl bg-white border border-morning-300 text-xs font-semibold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/30 focus:border-sapphire-500"
          >
            <option value="">Toate categoriile ({filterOptions.categorii.length})</option>
            {filterOptions.categorii.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label} ({c.count} buc)
              </option>
            ))}
          </FilterableSelect>

          {/* Furnizor */}
          <FilterableSelect
            value={selectedFurnizor}
            onChange={(e) => setSelectedFurnizor(e.target.value)}
            title="Filtrează după furnizor"
            searchPlaceholder="Caută furnizor..."
            className="w-full px-3 py-2 rounded-xl bg-white border border-morning-300 text-xs font-semibold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/30 focus:border-sapphire-500"
          >
            <option value="">Toți furnizorii ({filterOptions.furnizori.length})</option>
            {filterOptions.furnizori.map((f) => (
              <option key={f.value} value={f.value}>
                {f.value} ({f.count} buc)
              </option>
            ))}
          </FilterableSelect>
        </div>
      </div>

      {/* EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Mărci & Volum */}
        <div className="pleasant-card rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sage-600">
              Mărci &amp; Volum
            </span>
            <div className="w-8 h-8 rounded-xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 text-sapphire-600" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-sapphire-900 font-mono tabular-nums">
              {formatInt(kpis.brandCount)}{' '}
              <span className="text-xs font-bold text-sage-600 font-sans">mărci</span>
            </p>
            <p className="text-[11px] text-sage-600 font-medium mt-1">
              <span className="font-mono font-bold text-sapphire-900">{formatInt(kpis.totalTires)}</span> buc ({formatInt(kpis.montateCount)} mont. • {formatInt(kpis.casateCount)} cas.)
            </p>
          </div>
        </div>

        {/* Card 2: Cel mai longeviv brand */}
        <div className="pleasant-card rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sage-600">
              Cel Mai Longeviv
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div>
            <p
              className="text-lg font-extrabold text-sapphire-900 truncate"
              title={kpis.longestBrand?.marca || 'N/A'}
            >
              {kpis.longestBrand ? kpis.longestBrand.marca : 'N/A'}
            </p>
            <p className="text-[11px] text-sage-600 font-medium mt-1">
              {kpis.longestBrand && kpis.longestBrand.avgKm !== null ? (
                <>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatInt(kpis.longestBrand.avgKm)} KM
                  </span>{' '}
                  med. ({kpis.longestBrand.kmCount} buc)
                </>
              ) : (
                'Necesită min. 3 buc cu rulaj > 0'
              )}
            </p>
          </div>
        </div>

        {/* Card 3: Rulaj Mediu Flotă */}
        <div className="pleasant-card rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sage-600">
              Rulaj Mediu Flotă
            </span>
            <div className="w-8 h-8 rounded-xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center shrink-0">
              <Gauge className="w-4 h-4 text-sapphire-600" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-sapphire-900 font-mono tabular-nums">
              {kpis.avgFleetKm !== null ? `${formatInt(kpis.avgFleetKm)} KM` : 'N/A'}
            </p>
            <p className="text-[11px] text-sage-600 font-medium mt-1">
              Calculat pe <span className="font-mono font-bold text-sapphire-900">{formatInt(kpis.kmCount)}</span> buc cu rulaj &gt; 0
            </p>
          </div>
        </div>

        {/* Card 4: Cel mai utilizat brand */}
        <div className="pleasant-card rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sage-600">
              Cel Mai Utilizat
            </span>
            <div className="w-8 h-8 rounded-xl bg-periwinkle-100 border border-periwinkle-300 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-periwinkle-800" />
            </div>
          </div>
          <div>
            <p
              className="text-lg font-extrabold text-sapphire-900 truncate"
              title={kpis.mostUsedBrand?.marca || 'N/A'}
            >
              {kpis.mostUsedBrand ? kpis.mostUsedBrand.marca : 'N/A'}
            </p>
            <p className="text-[11px] text-sage-600 font-medium mt-1">
              {kpis.mostUsedBrand ? (
                <>
                  <span className="font-mono font-bold text-sapphire-900">
                    {formatInt(kpis.mostUsedBrand.totalCount)} buc
                  </span>{' '}
                  ({((kpis.mostUsedBrand.totalCount / (kpis.totalTires || 1)) * 100).toFixed(1)}% din flotă)
                </>
              ) : (
                'Fără anvelope în selecție'
              )}
            </p>
          </div>
        </div>

        {/* Card 5: Cost Mediu / 10.000 KM */}
        <div className="pleasant-card rounded-2xl p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sage-600">
              Cost / 10.000 KM
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-sapphire-900 font-mono tabular-nums">
              {kpis.costPer10kKm !== null ? (
                <>
                  {formatCurrency(kpis.costPer10kKm)}{' '}
                  <span className="text-xs font-bold text-sage-600 font-sans">RON</span>
                </>
              ) : (
                'N/A'
              )}
            </p>
            <p className="text-[11px] text-sage-600 font-medium mt-1">
              {kpis.costSampleCount > 0 ? (
                <>
                  Din <span className="font-mono font-bold text-sapphire-900">{formatInt(kpis.costSampleCount)}</span> buc cu preț &amp; rulaj
                </>
              ) : (
                'Fără anvelope cu preț și rulaj'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* VISUAL COMPARISON PANELS (SIDE BY SIDE ON DESKTOP) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Panel 1: Top Mărci după Longevitate */}
        <div className="pleasant-card rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-sapphire-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Top Mărci după Longevitate (KM Mediu / Anvelopă)</span>
              </h3>
              <p className="text-[11px] text-sage-600 mt-0.5">
                Top 10 mărci cu cel puțin 2 anvelope având rulaj &gt; 0 km în selecția curentă.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-morning-100 border border-morning-200 text-[10px] font-mono font-bold text-sage-700 shrink-0">
              Top {topLongevityBrands.length}
            </span>
          </div>

          {topLongevityBrands.length === 0 ? (
            <div className="py-10 text-center text-xs text-sage-600 bg-morning-50 rounded-xl border border-morning-200">
              Nu există mărci cu cel puțin 2 anvelope cu rulaj &gt; 0 km pentru filtrele selectate.
            </div>
          ) : (
            <div className="space-y-3">
              {topLongevityBrands.map((b, index) => {
                const avg = b.avgKm ?? 0;
                const widthPct = Math.max(6, Math.min(100, (avg / maxLongevityKm) * 100));
                const isTop3 = index < 3;

                return (
                  <div
                    key={b.marca}
                    onClick={() => toggleBrandExpand(b.marca)}
                    className="group cursor-pointer space-y-1.5"
                    title={`Click pentru a extinde dimensiunile ${b.marca} în tabel`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-md text-[10px] font-mono font-extrabold flex items-center justify-center shrink-0 ${
                            index === 0
                              ? 'bg-emerald-500 text-white'
                              : isTop3
                                ? 'bg-sapphire-500 text-white'
                                : 'bg-morning-200 text-sapphire-900'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="font-extrabold text-sapphire-900 truncate group-hover:text-sapphire-600 transition">
                          {b.marca}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-morning-100 border border-morning-200 text-[10px] font-mono font-semibold text-sage-700 shrink-0">
                          {b.kmCount} buc
                        </span>
                      </div>

                      <span className="font-mono font-extrabold text-sapphire-900 tabular-nums shrink-0">
                        {formatInt(avg)} KM
                      </span>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-morning-100 overflow-hidden border border-morning-200/70">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          index === 0
                            ? 'bg-emerald-500'
                            : isTop3
                              ? 'bg-sapphire-500'
                              : 'bg-sapphire-400'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 2: Distribuție pe Furnizori */}
        <div className="pleasant-card rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-sapphire-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sapphire-600 shrink-0" />
                <span>Distribuție pe Furnizori (Proveniență)</span>
              </h3>
              <p className="text-[11px] text-sage-600 mt-0.5">
                Volum și rulaj mediu pe furnizor. Click pe un furnizor pentru filtrare rapidă.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-morning-100 border border-morning-200 text-[10px] font-mono font-bold text-sage-700 shrink-0">
              Top {supplierStats.length}
            </span>
          </div>

          {supplierStats.length === 0 ? (
            <div className="py-10 text-center text-xs text-sage-600 bg-morning-50 rounded-xl border border-morning-200">
              Nu există date de proveniență pentru selecția curentă.
            </div>
          ) : (
            <div className="space-y-3">
              {supplierStats.map((s) => {
                const widthPct = Math.max(5, Math.min(100, (s.totalCount / maxSupplierVolume) * 100));
                const isActiveSupplier = !s.isUnspecified && selectedFurnizor === s.furnizor;

                return (
                  <div
                    key={s.furnizor}
                    onClick={() => {
                      if (s.isUnspecified) return;
                      setSelectedFurnizor((prev) => (prev === s.furnizor ? '' : s.furnizor));
                    }}
                    className={`space-y-1.5 rounded-xl p-1.5 -mx-1.5 transition ${
                      s.isUnspecified
                        ? 'opacity-80'
                        : isActiveSupplier
                          ? 'bg-sapphire-50 ring-1 ring-sapphire-300 cursor-pointer'
                          : 'hover:bg-morning-50 cursor-pointer'
                    }`}
                    title={
                      s.isUnspecified
                        ? 'Anvelope fără furnizor completat'
                        : isActiveSupplier
                          ? 'Click pentru a elimina filtrul de furnizor'
                          : `Click pentru a filtra după ${s.furnizor}`
                    }
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-extrabold truncate ${
                            s.isUnspecified ? 'text-sage-600 italic' : 'text-sapphire-900'
                          }`}
                        >
                          {s.furnizor}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-sage-600 shrink-0">
                          {s.sharePct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                        <span className="font-extrabold text-sapphire-900">
                          {formatInt(s.totalCount)} buc
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-morning-100 border border-morning-200 text-[10px] font-bold text-sage-700">
                          {s.avgKm !== null ? `${formatInt(s.avgKm)} km` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="h-2.5 w-full rounded-full bg-morning-100 overflow-hidden border border-morning-200/70">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          s.isUnspecified
                            ? 'bg-sage-400'
                            : isActiveSupplier
                              ? 'bg-emerald-500'
                              : 'bg-sapphire-500'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SORTABLE BRAND PERFORMANCE TABLE */}
      <div className="pleasant-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-sapphire-900">
              Tabel Comparativ Performanță pe Marcă ({sortedBrands.length} mărci)
            </h3>
            <p className="text-[11px] text-sage-600 mt-0.5">
              Click pe orice rând pentru a vedea defalcarea detaliată pe dimensiuni. Anvelopele fără preț de achiziție sunt excluse din calculul Preț Mediu și Cost / 10k KM.
            </p>
          </div>

          {kpis.pricedCount < kpis.totalTires && kpis.totalTires > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-morning-100 border border-morning-200 text-[11px] text-sage-700 font-medium shrink-0">
              <Info className="w-3.5 h-3.5 text-sapphire-600 shrink-0" />
              <span>
                Preț disponibil pe <strong className="font-mono text-sapphire-900">{formatInt(kpis.pricedCount)}</strong> / {formatInt(kpis.totalTires)} anv.
                {backendTcoCount > 0 ? ` • ${backendTcoCount} mărci TCO server` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-morning-200">
          <table className="w-full text-left text-xs min-w-[960px]">
            <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
              <tr>
                <th className="p-3">
                  <button
                    type="button"
                    onClick={() => handleSort('marca')}
                    className="inline-flex items-center gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase"
                  >
                    <span>Marcă</span>
                    {renderSortIcon('marca')}
                  </button>
                </th>
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('totalCount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                  >
                    <span>Total (Buc)</span>
                    {renderSortIcon('totalCount')}
                  </button>
                </th>
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('montateCount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                  >
                    <span>Montate</span>
                    {renderSortIcon('montateCount')}
                  </button>
                </th>
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('casateCount')}
                    className="inline-flex items-center justify-end gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                  >
                    <span>Casate</span>
                    {renderSortIcon('casateCount')}
                  </button>
                </th>
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('avgKm')}
                    className="inline-flex items-center justify-end gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                  >
                    <span>Rulaj Mediu (KM)</span>
                    {renderSortIcon('avgKm')}
                  </button>
                </th>
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('maxKm')}
                    className="inline-flex items-center justify-end gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                  >
                    <span>Rulaj Max (KM)</span>
                    {renderSortIcon('maxKm')}
                  </button>
                </th>
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('totalKm')}
                    className="inline-flex items-center justify-end gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                  >
                    <span>Rulaj Total (KM)</span>
                    {renderSortIcon('totalKm')}
                  </button>
                </th>
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('avgPrice')}
                    className="inline-flex items-center justify-end gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                  >
                    <span>Preț Mediu (RON)</span>
                    {renderSortIcon('avgPrice')}
                  </button>
                </th>
                <th className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('costPer10kKm')}
                    className="inline-flex items-center justify-end gap-1 hover:text-sapphire-900 transition cursor-pointer uppercase ml-auto"
                  >
                    <span>Cost / 10k KM</span>
                    {renderSortIcon('costPer10kKm')}
                  </button>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-morning-200">
              {sortedBrands.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sage-600 font-medium">
                    Nu există anvelope care să corespundă filtrelor active.
                  </td>
                </tr>
              ) : (
                sortedBrands.map((b) => {
                  const isExpanded = Boolean(expandedBrands[b.marca]);
                  return (
                    <React.Fragment key={b.marca}>
                      <tr
                        onClick={() => toggleBrandExpand(b.marca)}
                        className={`cursor-pointer transition ${
                          isExpanded ? 'bg-sapphire-50/70' : 'hover:bg-morning-50'
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-sapphire-600 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-sage-500 shrink-0" />
                            )}
                            <div>
                              <span className="font-extrabold text-sapphire-900">{b.marca}</span>
                              <span className="ml-2 text-[10px] font-semibold text-sage-600">
                                ({b.dimensions.length} {b.dimensions.length === 1 ? 'dimensiune' : 'dimensiuni'})
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3 text-right font-mono font-extrabold text-sapphire-900 tabular-nums">
                          {formatInt(b.totalCount)}
                        </td>

                        <td className="p-3 text-right font-mono font-bold tabular-nums">
                          {b.montateCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-sapphire-50 border border-sapphire-200 text-sapphire-800 text-[11px]">
                              {formatInt(b.montateCount)}
                            </span>
                          ) : (
                            <span className="text-sage-500">0</span>
                          )}
                        </td>

                        <td className="p-3 text-right font-mono font-bold tabular-nums">
                          {b.casateCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-roseash-100 border border-roseash-300 text-terracotta-700 text-[11px]">
                              {formatInt(b.casateCount)}
                            </span>
                          ) : (
                            <span className="text-sage-500">0</span>
                          )}
                        </td>

                        <td className="p-3 text-right font-mono font-extrabold text-sapphire-900 tabular-nums">
                          {b.avgKm !== null ? (
                            <div>
                              <span>{formatInt(b.avgKm)}</span>
                              {b.kmCount < b.totalCount && (
                                <span className="block text-[10px] font-normal text-sage-600">
                                  din {b.kmCount} buc
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sage-500 font-semibold">N/A</span>
                          )}
                        </td>

                        <td className="p-3 text-right font-mono font-semibold text-sage-700 tabular-nums">
                          {b.maxKm > 0 ? formatInt(b.maxKm) : <span className="text-sage-500">N/A</span>}
                        </td>

                        <td className="p-3 text-right font-mono font-semibold text-sage-700 tabular-nums">
                          {b.totalKm > 0 ? formatInt(b.totalKm) : <span className="text-sage-500">0</span>}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-sapphire-900 tabular-nums">
                          {b.avgPrice !== null ? (
                            <div>
                              <span>{formatCurrency(b.avgPrice)}</span>
                              {b.pricedCount < b.totalCount && (
                                <span className="block text-[10px] font-normal text-sage-600">
                                  {b.pricedCount} cu preț
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sage-500 font-semibold">N/A</span>
                          )}
                        </td>

                        <td className="p-3 text-right font-mono font-extrabold tabular-nums">
                          {b.costPer10kKm !== null ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                              {formatCurrency(b.costPer10kKm)} RON
                            </span>
                          ) : (
                            <span className="text-sage-500 font-semibold">N/A</span>
                          )}
                        </td>
                      </tr>

                      {/* INLINE EXPANDABLE BREAKDOWN BY DIMENSIUNE */}
                      {isExpanded && (
                        <tr className="bg-morning-50">
                          <td colSpan={9} className="px-4 py-3">
                            <div className="pl-6 border-l-2 border-sapphire-400 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-sapphire-800">
                                  Defalcare pe Dimensiuni — {b.marca}
                                </p>
                                <span className="text-[10px] text-sage-600 font-medium">
                                  {b.dimensions.length} {b.dimensions.length === 1 ? 'dimensiune' : 'dimensiuni'}
                                </span>
                              </div>

                              <div className="overflow-x-auto rounded-lg border border-morning-200 bg-white">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] font-bold border-b border-morning-200">
                                    <tr>
                                      <th className="px-3 py-2">Dimensiune</th>
                                      <th className="px-3 py-2 text-right">Total (Buc)</th>
                                      <th className="px-3 py-2 text-right">Montate</th>
                                      <th className="px-3 py-2 text-right">Casate</th>
                                      <th className="px-3 py-2 text-right">Rulaj Mediu (KM)</th>
                                      <th className="px-3 py-2 text-right">Rulaj Max (KM)</th>
                                      <th className="px-3 py-2 text-right">Preț Mediu (RON)</th>
                                      <th className="px-3 py-2 text-right">Cost / 10k KM</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-morning-200">
                                    {b.dimensions.map((d) => (
                                      <tr key={d.dimensiune} className="hover:bg-morning-50">
                                        <td className="px-3 py-2 font-mono font-bold text-sapphire-900">
                                          {d.dimensiune}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-extrabold text-sapphire-900 tabular-nums">
                                          {formatInt(d.totalCount)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-sapphire-700 tabular-nums">
                                          {formatInt(d.montateCount)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-terracotta-700 tabular-nums">
                                          {formatInt(d.casateCount)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-sapphire-900 tabular-nums">
                                          {d.avgKm !== null ? `${formatInt(d.avgKm)} KM` : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-sage-700 tabular-nums">
                                          {d.maxKm > 0 ? `${formatInt(d.maxKm)} KM` : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-sapphire-900 tabular-nums">
                                          {d.avgPrice !== null ? `${formatCurrency(d.avgPrice)} RON` : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 tabular-nums">
                                          {d.costPer10kKm !== null
                                            ? `${formatCurrency(d.costPer10kKm)} RON`
                                            : 'N/A'}
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
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {sortedBrands.length > 0 && (
              <tfoot className="bg-morning-100 border-t-2 border-morning-300 font-extrabold text-sapphire-900">
                <tr>
                  <td className="p-3 text-xs uppercase tracking-wider">
                    Total Selecție ({sortedBrands.length} mărci)
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">{formatInt(kpis.totalTires)}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{formatInt(kpis.montateCount)}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{formatInt(kpis.casateCount)}</td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {kpis.avgFleetKm !== null ? formatInt(kpis.avgFleetKm) : 'N/A'}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {kpis.maxKm > 0 ? formatInt(kpis.maxKm) : 'N/A'}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {formatInt(kpis.totalKm)}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {kpis.avgFleetPrice !== null ? formatCurrency(kpis.avgFleetPrice) : 'N/A'}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    {kpis.costPer10kKm !== null ? `${formatCurrency(kpis.costPer10kKm)} RON` : 'N/A'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
