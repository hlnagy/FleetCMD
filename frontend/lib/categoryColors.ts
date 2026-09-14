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
    badge: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500/40 shadow-xs',
    dot: 'bg-blue-500 shadow-xs shadow-blue-500/50',
    chipActive: 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/25',
    chipInactive: 'bg-white text-blue-900 border-blue-300/80 hover:bg-blue-50 hover:border-blue-400 dark:bg-[#142232] dark:text-blue-200 dark:border-blue-500/40 dark:hover:bg-blue-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100 dark:border dark:border-blue-500/40',
    borderAccent: 'border-blue-400 dark:border-blue-500',
  },
  SEMIREMORCA: {
    badge: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-500/40 shadow-xs',
    dot: 'bg-purple-500 shadow-xs shadow-purple-500/50',
    chipActive: 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/25',
    chipInactive: 'bg-white text-purple-900 border-purple-300/80 hover:bg-purple-50 hover:border-purple-400 dark:bg-[#142232] dark:text-purple-200 dark:border-purple-500/40 dark:hover:bg-purple-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-purple-100 text-purple-900 dark:bg-purple-900/50 dark:text-purple-100 dark:border dark:border-purple-500/40',
    borderAccent: 'border-purple-400 dark:border-purple-500',
  },
  REMORCA: {
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-500/40 shadow-xs',
    dot: 'bg-indigo-500 shadow-xs shadow-indigo-500/50',
    chipActive: 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/25',
    chipInactive: 'bg-white text-indigo-900 border-indigo-300/80 hover:bg-indigo-50 hover:border-indigo-400 dark:bg-[#142232] dark:text-indigo-200 dark:border-indigo-500/40 dark:hover:bg-indigo-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-100 dark:border dark:border-indigo-500/40',
    borderAccent: 'border-indigo-400 dark:border-indigo-500',
  },
  BASCULANTA: {
    badge: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-500/40 shadow-xs',
    dot: 'bg-amber-500 shadow-xs shadow-amber-500/50',
    chipActive: 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/25',
    chipInactive: 'bg-white text-amber-900 border-amber-300/80 hover:bg-amber-50 hover:border-amber-400 dark:bg-[#142232] dark:text-amber-200 dark:border-amber-500/40 dark:hover:bg-amber-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100 dark:border dark:border-amber-500/40',
    borderAccent: 'border-amber-400 dark:border-amber-500',
  },
  AUTOUTILITARA: {
    badge: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-500/40 shadow-xs',
    dot: 'bg-teal-500 shadow-xs shadow-teal-500/50',
    chipActive: 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-500/25',
    chipInactive: 'bg-white text-teal-900 border-teal-300/80 hover:bg-teal-50 hover:border-teal-400 dark:bg-[#142232] dark:text-teal-200 dark:border-teal-500/40 dark:hover:bg-teal-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-teal-100 text-teal-900 dark:bg-teal-900/50 dark:text-teal-100 dark:border dark:border-teal-500/40',
    borderAccent: 'border-teal-400 dark:border-teal-500',
  },
  DUBITA: {
    badge: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-500/40 shadow-xs',
    dot: 'bg-teal-500 shadow-xs shadow-teal-500/50',
    chipActive: 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-500/25',
    chipInactive: 'bg-white text-teal-900 border-teal-300/80 hover:bg-teal-50 hover:border-teal-400 dark:bg-[#142232] dark:text-teal-200 dark:border-teal-500/40 dark:hover:bg-teal-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-teal-100 text-teal-900 dark:bg-teal-900/50 dark:text-teal-100 dark:border dark:border-teal-500/40',
    borderAccent: 'border-teal-400 dark:border-teal-500',
  },
  AUTOTURISM: {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500/40 shadow-xs',
    dot: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
    chipActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/25',
    chipInactive: 'bg-white text-emerald-900 border-emerald-300/80 hover:bg-emerald-50 hover:border-emerald-400 dark:bg-[#142232] dark:text-emerald-200 dark:border-emerald-500/40 dark:hover:bg-emerald-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border dark:border-emerald-500/40',
    borderAccent: 'border-emerald-400 dark:border-emerald-500',
  },
  ATV: {
    badge: 'bg-lime-100 text-lime-950 border-lime-400 dark:bg-lime-950/60 dark:text-lime-200 dark:border-lime-500/40 shadow-xs',
    dot: 'bg-lime-500 shadow-xs shadow-lime-500/50',
    chipActive: 'bg-lime-600 text-white border-lime-600 shadow-sm shadow-lime-500/25',
    chipInactive: 'bg-white text-lime-900 border-lime-300 hover:bg-lime-50 hover:border-lime-400 dark:bg-[#142232] dark:text-lime-200 dark:border-lime-500/40 dark:hover:bg-lime-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-lime-100 text-lime-950 dark:bg-lime-900/50 dark:text-lime-100 dark:border dark:border-lime-500/40',
    borderAccent: 'border-lime-400 dark:border-lime-500',
  },
  EXCAVATOR: {
    badge: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-500/40 shadow-xs',
    dot: 'bg-rose-500 shadow-xs shadow-rose-500/50',
    chipActive: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/25',
    chipInactive: 'bg-white text-rose-900 border-rose-300/80 hover:bg-rose-50 hover:border-rose-400 dark:bg-[#142232] dark:text-rose-200 dark:border-rose-500/40 dark:hover:bg-rose-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-100 dark:border dark:border-rose-500/40',
    borderAccent: 'border-rose-400 dark:border-rose-500',
  },
  BULLDOZER: {
    badge: 'bg-yellow-100 text-yellow-950 border-yellow-400 dark:bg-yellow-950/60 dark:text-yellow-200 dark:border-yellow-500/40 shadow-xs',
    dot: 'bg-yellow-500 shadow-xs shadow-yellow-500/50',
    chipActive: 'bg-yellow-600 text-white border-yellow-600 shadow-sm shadow-yellow-500/25',
    chipInactive: 'bg-white text-yellow-900 border-yellow-300 hover:bg-yellow-50 hover:border-yellow-400 dark:bg-[#142232] dark:text-yellow-200 dark:border-yellow-500/40 dark:hover:bg-yellow-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-yellow-100 text-yellow-950 dark:bg-yellow-900/50 dark:text-yellow-100 dark:border dark:border-yellow-500/40',
    borderAccent: 'border-yellow-400 dark:border-yellow-500',
  },
  INCARCATOR_FRONTAL: {
    badge: 'bg-orange-100 text-orange-950 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-500/40 shadow-xs',
    dot: 'bg-orange-500 shadow-xs shadow-orange-500/50',
    chipActive: 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-500/25',
    chipInactive: 'bg-white text-orange-900 border-orange-300/80 hover:bg-orange-50 hover:border-orange-400 dark:bg-[#142232] dark:text-orange-200 dark:border-orange-500/40 dark:hover:bg-orange-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-orange-100 text-orange-950 dark:bg-orange-900/50 dark:text-orange-100 dark:border dark:border-orange-500/40',
    borderAccent: 'border-orange-400 dark:border-orange-500',
  },
  AUTOVALT: {
    badge: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-200 dark:border-fuchsia-500/40 shadow-xs',
    dot: 'bg-fuchsia-500 shadow-xs shadow-fuchsia-500/50',
    chipActive: 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm shadow-fuchsia-500/25',
    chipInactive: 'bg-white text-fuchsia-900 border-fuchsia-300/80 hover:bg-fuchsia-50 hover:border-fuchsia-400 dark:bg-[#142232] dark:text-fuchsia-200 dark:border-fuchsia-500/40 dark:hover:bg-fuchsia-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/50 dark:text-fuchsia-100 dark:border dark:border-fuchsia-500/40',
    borderAccent: 'border-fuchsia-400 dark:border-fuchsia-500',
  },
  COMPACTOR: {
    badge: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-200 dark:border-fuchsia-500/40 shadow-xs',
    dot: 'bg-fuchsia-500 shadow-xs shadow-fuchsia-500/50',
    chipActive: 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-sm shadow-fuchsia-500/25',
    chipInactive: 'bg-white text-fuchsia-900 border-fuchsia-300/80 hover:bg-fuchsia-50 hover:border-fuchsia-400 dark:bg-[#142232] dark:text-fuchsia-200 dark:border-fuchsia-500/40 dark:hover:bg-fuchsia-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/50 dark:text-fuchsia-100 dark:border dark:border-fuchsia-500/40',
    borderAccent: 'border-fuchsia-400 dark:border-fuchsia-500',
  },
  CAMION: {
    badge: 'bg-cyan-100 text-cyan-950 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-500/40 shadow-xs',
    dot: 'bg-cyan-500 shadow-xs shadow-cyan-500/50',
    chipActive: 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-500/25',
    chipInactive: 'bg-white text-cyan-900 border-cyan-300/80 hover:bg-cyan-50 hover:border-cyan-400 dark:bg-[#142232] dark:text-cyan-200 dark:border-cyan-500/40 dark:hover:bg-cyan-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-cyan-100 text-cyan-950 dark:bg-cyan-900/50 dark:text-cyan-100 dark:border dark:border-cyan-500/40',
    borderAccent: 'border-cyan-400 dark:border-cyan-500',
  },
  CAMION_8X4: {
    badge: 'bg-cyan-100 text-cyan-950 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-500/40 shadow-xs',
    dot: 'bg-cyan-500 shadow-xs shadow-cyan-500/50',
    chipActive: 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-500/25',
    chipInactive: 'bg-white text-cyan-900 border-cyan-300/80 hover:bg-cyan-50 hover:border-cyan-400 dark:bg-[#142232] dark:text-cyan-200 dark:border-cyan-500/40 dark:hover:bg-cyan-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-cyan-100 text-cyan-950 dark:bg-cyan-900/50 dark:text-cyan-100 dark:border dark:border-cyan-500/40',
    borderAccent: 'border-cyan-400 dark:border-cyan-500',
  },
  CISTERNA: {
    badge: 'bg-sky-100 text-sky-950 border-sky-300 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-500/40 shadow-xs',
    dot: 'bg-sky-500 shadow-xs shadow-sky-500/50',
    chipActive: 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-500/25',
    chipInactive: 'bg-white text-sky-900 border-sky-300/80 hover:bg-sky-50 hover:border-sky-400 dark:bg-[#142232] dark:text-sky-200 dark:border-sky-500/40 dark:hover:bg-sky-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-sky-100 text-sky-950 dark:bg-sky-900/50 dark:text-sky-100 dark:border dark:border-sky-500/40',
    borderAccent: 'border-sky-400 dark:border-sky-500',
  },
  MACARA: {
    badge: 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/60 dark:text-violet-200 dark:border-violet-500/40 shadow-xs',
    dot: 'bg-violet-500 shadow-xs shadow-violet-500/50',
    chipActive: 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/25',
    chipInactive: 'bg-white text-violet-900 border-violet-300/80 hover:bg-violet-50 hover:border-violet-400 dark:bg-[#142232] dark:text-violet-200 dark:border-violet-500/40 dark:hover:bg-violet-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100 dark:border dark:border-violet-500/40',
    borderAccent: 'border-violet-400 dark:border-violet-500',
  },
  TRACTOR: {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500/40 shadow-xs',
    dot: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
    chipActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/25',
    chipInactive: 'bg-white text-emerald-900 border-emerald-300/80 hover:bg-emerald-50 hover:border-emerald-400 dark:bg-[#142232] dark:text-emerald-200 dark:border-emerald-500/40 dark:hover:bg-emerald-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border dark:border-emerald-500/40',
    borderAccent: 'border-emerald-400 dark:border-emerald-500',
  },
  UTILAJ_SPECIAL: {
    badge: 'bg-zinc-200 text-zinc-900 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-600 shadow-xs',
    dot: 'bg-zinc-400',
    chipActive: 'bg-zinc-700 text-white border-zinc-700 shadow-sm shadow-zinc-600/25',
    chipInactive: 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 dark:bg-[#142232] dark:text-zinc-200 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:border dark:border-zinc-600',
    borderAccent: 'border-zinc-400 dark:border-zinc-600',
  },
  NEALOCAT: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-xs',
    dot: 'bg-slate-400',
    chipActive: 'bg-slate-700 text-white border-slate-700 shadow-sm shadow-slate-600/25',
    chipInactive: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 dark:bg-[#142232] dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:border dark:border-slate-600',
    borderAccent: 'border-slate-400 dark:border-slate-600',
  },
};

// Rotating fallback palettes for any custom categories added dynamically
const FALLBACK_PALETTES: CategoryColorStyle[] = [
  {
    badge: 'bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-950/60 dark:text-pink-200 dark:border-pink-500/40 shadow-xs',
    dot: 'bg-pink-500 shadow-xs shadow-pink-500/50',
    chipActive: 'bg-pink-600 text-white border-pink-600 shadow-sm shadow-pink-500/25',
    chipInactive: 'bg-white text-pink-900 border-pink-300/80 hover:bg-pink-50 hover:border-pink-400 dark:bg-[#142232] dark:text-pink-200 dark:border-pink-500/40 dark:hover:bg-pink-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-pink-100 text-pink-900 dark:bg-pink-900/50 dark:text-pink-100 dark:border dark:border-pink-500/40',
    borderAccent: 'border-pink-400 dark:border-pink-500',
  },
  {
    badge: 'bg-cyan-100 text-cyan-950 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-200 dark:border-cyan-500/40 shadow-xs',
    dot: 'bg-cyan-500 shadow-xs shadow-cyan-500/50',
    chipActive: 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-500/25',
    chipInactive: 'bg-white text-cyan-900 border-cyan-300/80 hover:bg-cyan-50 hover:border-cyan-400 dark:bg-[#142232] dark:text-cyan-200 dark:border-cyan-500/40 dark:hover:bg-cyan-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-cyan-100 text-cyan-950 dark:bg-cyan-900/50 dark:text-cyan-100 dark:border dark:border-cyan-500/40',
    borderAccent: 'border-cyan-400 dark:border-cyan-500',
  },
  {
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500/40 shadow-xs',
    dot: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
    chipActive: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/25',
    chipInactive: 'bg-white text-emerald-900 border-emerald-300/80 hover:bg-emerald-50 hover:border-emerald-400 dark:bg-[#142232] dark:text-emerald-200 dark:border-emerald-500/40 dark:hover:bg-emerald-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100 dark:border dark:border-emerald-500/40',
    borderAccent: 'border-emerald-400 dark:border-emerald-500',
  },
  {
    badge: 'bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/60 dark:text-violet-200 dark:border-violet-500/40 shadow-xs',
    dot: 'bg-violet-500 shadow-xs shadow-violet-500/50',
    chipActive: 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/25',
    chipInactive: 'bg-white text-violet-900 border-violet-300/80 hover:bg-violet-50 hover:border-violet-400 dark:bg-[#142232] dark:text-violet-200 dark:border-violet-500/40 dark:hover:bg-violet-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100 dark:border dark:border-violet-500/40',
    borderAccent: 'border-violet-400 dark:border-violet-500',
  },
  {
    badge: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-500/40 shadow-xs',
    dot: 'bg-amber-500 shadow-xs shadow-amber-500/50',
    chipActive: 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/25',
    chipInactive: 'bg-white text-amber-900 border-amber-300/80 hover:bg-amber-50 hover:border-amber-400 dark:bg-[#142232] dark:text-amber-200 dark:border-amber-500/40 dark:hover:bg-amber-950/40 dark:hover:text-white',
    countActive: 'bg-white/25 text-white',
    countInactive: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100 dark:border dark:border-amber-500/40',
    borderAccent: 'border-amber-400 dark:border-amber-500',
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
