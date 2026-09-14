export interface CategoryColorStyle {
  badge: string;         // classes for pill/badge in tables, cards, dropdowns
  dot: string;           // background color for indicator dot
  chipActive: string;    // classes for active filter chip button
  chipInactive: string;  // classes for inactive filter chip button
  countActive: string;   // count badge style when filter is active
  countInactive: string; // count badge style when filter is inactive
  borderAccent: string;  // subtle accent border
}

const CATEGORY_MAP: Record<string, CategoryColorStyle> = {
  CAP_TRACTOR: {
    badge: 'bg-blue-100 text-blue-900 border-blue-300 shadow-xs',
    dot: 'bg-blue-500',
    chipActive: 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20',
    chipInactive: 'bg-white text-blue-950 border-blue-200/80 hover:bg-blue-50 hover:border-blue-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-blue-100 text-blue-800',
    borderAccent: 'border-blue-400',
  },
  SEMIREMORCA: {
    badge: 'bg-purple-100 text-purple-900 border-purple-300 shadow-xs',
    dot: 'bg-purple-500',
    chipActive: 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/20',
    chipInactive: 'bg-white text-purple-950 border-purple-200/80 hover:bg-purple-50 hover:border-purple-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-purple-100 text-purple-800',
    borderAccent: 'border-purple-400',
  },
  REMORCA: {
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-xs',
    dot: 'bg-indigo-500',
    chipActive: 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20',
    chipInactive: 'bg-white text-indigo-950 border-indigo-200/80 hover:bg-indigo-50 hover:border-indigo-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-indigo-100 text-indigo-800',
    borderAccent: 'border-indigo-400',
  },
  BASCULANTA: {
    badge: 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs',
    dot: 'bg-amber-500',
    chipActive: 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/20',
    chipInactive: 'bg-white text-amber-950 border-amber-200/80 hover:bg-amber-50 hover:border-amber-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-amber-100 text-amber-900',
    borderAccent: 'border-amber-400',
  },
  AUTOUTILITARA: {
    badge: 'bg-teal-100 text-teal-900 border-teal-300 shadow-xs',
    dot: 'bg-teal-500',
    chipActive: 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-500/20',
    chipInactive: 'bg-white text-teal-950 border-teal-200/80 hover:bg-teal-50 hover:border-teal-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-teal-100 text-teal-800',
    borderAccent: 'border-teal-400',
  },
  DUBITA: {
    badge: 'bg-teal-100 text-teal-900 border-teal-300 shadow-xs',
    dot: 'bg-teal-500',
    chipActive: 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-500/20',
    chipInactive: 'bg-white text-teal-950 border-teal-200/80 hover:bg-teal-50 hover:border-teal-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-teal-100 text-teal-800',
    borderAccent: 'border-teal-400',
  },
  AUTOTURISM: {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs',
    dot: 'bg-emerald-500',
    chipActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20',
    chipInactive: 'bg-white text-emerald-950 border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-emerald-100 text-emerald-800',
    borderAccent: 'border-emerald-400',
  },
  ATV: {
    badge: 'bg-lime-100 text-lime-950 border-lime-400 shadow-xs',
    dot: 'bg-lime-600',
    chipActive: 'bg-lime-600 text-white border-lime-600 shadow-sm shadow-lime-500/20',
    chipInactive: 'bg-white text-lime-950 border-lime-300 hover:bg-lime-50 hover:border-lime-400',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-lime-100 text-lime-900 font-bold',
    borderAccent: 'border-lime-500',
  },
  EXCAVATOR: {
    badge: 'bg-rose-100 text-rose-900 border-rose-300 shadow-xs',
    dot: 'bg-rose-500',
    chipActive: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/20',
    chipInactive: 'bg-white text-rose-950 border-rose-200/80 hover:bg-rose-50 hover:border-rose-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-rose-100 text-rose-800',
    borderAccent: 'border-rose-400',
  },
  BULLDOZER: {
    badge: 'bg-yellow-100 text-yellow-950 border-yellow-400 shadow-xs',
    dot: 'bg-yellow-500',
    chipActive: 'bg-yellow-600 text-white border-yellow-600 shadow-sm shadow-yellow-500/20',
    chipInactive: 'bg-white text-yellow-950 border-yellow-300 hover:bg-yellow-50 hover:border-yellow-400',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-yellow-100 text-yellow-900',
    borderAccent: 'border-yellow-500',
  },
  INCARCATOR_FRONTAL: {
    badge: 'bg-orange-100 text-orange-950 border-orange-300 shadow-xs',
    dot: 'bg-orange-500',
    chipActive: 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-500/20',
    chipInactive: 'bg-white text-orange-950 border-orange-200/80 hover:bg-orange-50 hover:border-orange-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-orange-100 text-orange-900',
    borderAccent: 'border-orange-400',
  },
  AUTOVALT: {
    badge: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 shadow-xs',
    dot: 'bg-fuchsia-500',
    chipActive: 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm shadow-fuchsia-500/20',
    chipInactive: 'bg-white text-fuchsia-950 border-fuchsia-200/80 hover:bg-fuchsia-50 hover:border-fuchsia-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-fuchsia-100 text-fuchsia-800',
    borderAccent: 'border-fuchsia-400',
  },
  COMPACTOR: {
    badge: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 shadow-xs',
    dot: 'bg-fuchsia-500',
    chipActive: 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm shadow-fuchsia-500/20',
    chipInactive: 'bg-white text-fuchsia-950 border-fuchsia-200/80 hover:bg-fuchsia-50 hover:border-fuchsia-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-fuchsia-100 text-fuchsia-800',
    borderAccent: 'border-fuchsia-400',
  },
  CAMION: {
    badge: 'bg-cyan-100 text-cyan-950 border-cyan-300 shadow-xs',
    dot: 'bg-cyan-500',
    chipActive: 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-500/20',
    chipInactive: 'bg-white text-cyan-950 border-cyan-200/80 hover:bg-cyan-50 hover:border-cyan-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-cyan-100 text-cyan-900',
    borderAccent: 'border-cyan-400',
  },
  CISTERNA: {
    badge: 'bg-sky-100 text-sky-950 border-sky-300 shadow-xs',
    dot: 'bg-sky-500',
    chipActive: 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-500/20',
    chipInactive: 'bg-white text-sky-950 border-sky-200/80 hover:bg-sky-50 hover:border-sky-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-sky-100 text-sky-900',
    borderAccent: 'border-sky-400',
  },
  MACARA: {
    badge: 'bg-violet-100 text-violet-900 border-violet-300 shadow-xs',
    dot: 'bg-violet-500',
    chipActive: 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20',
    chipInactive: 'bg-white text-violet-950 border-violet-200/80 hover:bg-violet-50 hover:border-violet-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-violet-100 text-violet-800',
    borderAccent: 'border-violet-400',
  },
  TRACTOR: {
    badge: 'bg-green-100 text-green-900 border-green-300 shadow-xs',
    dot: 'bg-green-500',
    chipActive: 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-500/20',
    chipInactive: 'bg-white text-green-950 border-green-200/80 hover:bg-green-50 hover:border-green-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-green-100 text-green-800',
    borderAccent: 'border-green-400',
  },
  UTILAJ_SPECIAL: {
    badge: 'bg-zinc-200 text-zinc-900 border-zinc-300 shadow-xs',
    dot: 'bg-zinc-500',
    chipActive: 'bg-zinc-700 text-white border-zinc-700 shadow-sm shadow-zinc-600/20',
    chipInactive: 'bg-white text-zinc-900 border-zinc-200/80 hover:bg-zinc-100 hover:border-zinc-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-zinc-200 text-zinc-800',
    borderAccent: 'border-zinc-400',
  },
  NEALOCAT: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300 shadow-xs',
    dot: 'bg-slate-400',
    chipActive: 'bg-slate-700 text-white border-slate-700 shadow-sm shadow-slate-600/20',
    chipInactive: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-slate-100 text-slate-700',
    borderAccent: 'border-slate-300',
  },
};

// Rotating fallback palettes for any custom categories added dynamically
const FALLBACK_PALETTES: CategoryColorStyle[] = [
  {
    badge: 'bg-pink-100 text-pink-900 border-pink-300 shadow-xs',
    dot: 'bg-pink-500',
    chipActive: 'bg-pink-600 text-white border-pink-600 shadow-sm shadow-pink-500/20',
    chipInactive: 'bg-white text-pink-950 border-pink-200/80 hover:bg-pink-50 hover:border-pink-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-pink-100 text-pink-800',
    borderAccent: 'border-pink-400',
  },
  {
    badge: 'bg-cyan-100 text-cyan-950 border-cyan-300 shadow-xs',
    dot: 'bg-cyan-500',
    chipActive: 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-500/20',
    chipInactive: 'bg-white text-cyan-950 border-cyan-200/80 hover:bg-cyan-50 hover:border-cyan-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-cyan-100 text-cyan-900',
    borderAccent: 'border-cyan-400',
  },
  {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs',
    dot: 'bg-emerald-500',
    chipActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20',
    chipInactive: 'bg-white text-emerald-950 border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-emerald-100 text-emerald-800',
    borderAccent: 'border-emerald-400',
  },
  {
    badge: 'bg-violet-100 text-violet-900 border-violet-300 shadow-xs',
    dot: 'bg-violet-500',
    chipActive: 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/20',
    chipInactive: 'bg-white text-violet-950 border-violet-200/80 hover:bg-violet-50 hover:border-violet-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-violet-100 text-violet-800',
    borderAccent: 'border-violet-400',
  },
  {
    badge: 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs',
    dot: 'bg-amber-500',
    chipActive: 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/20',
    chipInactive: 'bg-white text-amber-950 border-amber-200/80 hover:bg-amber-50 hover:border-amber-300',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-amber-100 text-amber-900',
    borderAccent: 'border-amber-400',
  },
];

export function getCategoryColor(category?: string | null): CategoryColorStyle {
  if (!category || !category.trim()) {
    return CATEGORY_MAP.NEALOCAT;
  }

  const clean = category.trim().toUpperCase().replace(/[\s-]/g, '_');

  if (CATEGORY_MAP[clean]) {
    return CATEGORY_MAP[clean];
  }

  // Simple string hash for deterministically selecting a fallback palette
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[index];
}
