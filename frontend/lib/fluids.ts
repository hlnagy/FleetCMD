export interface TipFluidDef {
  id: string;
  dbId?: string;
  cod: string;
  nume: string;
  descriere: string;
  accentColor: string;
  recomandat?: string;
  presetKm: number[];
  presetMth: number[];
  esteStandard?: boolean;
  ordine?: number;
  activ?: boolean;
}

export const FLUID_ACCENT_OPTIONS: Array<{
  value: string;
  label: string;
  iconBg: string;
  badgeBg: string;
}> = [
  {
    value: 'amber',
    label: 'Chihlimbar (Motor)',
    iconBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700',
  },
  {
    value: 'blue',
    label: 'Albastru (Hidraulic)',
    iconBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700',
  },
  {
    value: 'indigo',
    label: 'Indigo (Transmisie)',
    iconBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700',
  },
  {
    value: 'purple',
    label: 'Violet (Special / Liebherr)',
    iconBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700',
  },
  {
    value: 'emerald',
    label: 'Smarald (AdBlue / Eco)',
    iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700',
  },
  {
    value: 'rose',
    label: 'Roz / Roșu (Antigel)',
    iconBg: 'bg-roseash-100 text-terracotta-700 dark:bg-rose-900/40 dark:text-rose-200',
    badgeBg: 'bg-roseash-100 text-terracotta-800 border-roseash-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-700',
  },
  {
    value: 'cyan',
    label: 'Cyan (Răcire)',
    iconBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
    badgeBg: 'bg-cyan-100 text-cyan-900 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-700',
  },
  {
    value: 'slate',
    label: 'Grafit (Universal)',
    iconBg: 'bg-morning-200 text-sapphire-900',
    badgeBg: 'bg-morning-100 text-sapphire-900 border-morning-300',
  },
];

export function getAccentClasses(accentColor?: string) {
  return (
    FLUID_ACCENT_OPTIONS.find((a) => a.value === accentColor) ||
    FLUID_ACCENT_OPTIONS[0]
  );
}

export const FALLBACK_TIPURI_FLUIDE: TipFluidDef[] = [
  {
    id: 'ULEI_MOTOR_15W40',
    cod: 'ULEI_MOTOR_15W40',
    nume: 'ULEI MOTOR 15W40',
    descriere: 'Ulei motor heavy-duty 15W-40 pentru camioane, vole, excavatoare, buldozer și bobcat.',
    accentColor: 'amber',
    recomandat: 'Cap Tractor, Camion 8x4, Vole, Excavatoare, Buldozer, Bobcat',
    presetKm: [15000, 30000],
    presetMth: [500, 1000, 1250],
    esteStandard: true,
    ordine: 1,
    activ: true,
  },
  {
    id: 'ULEI_HIDRAULIC',
    cod: 'ULEI_HIDRAULIC',
    nume: 'ULEI HIDRAULIC',
    descriere: 'Ulei hidraulic HLP / HVLP pentru utilaje de șantier, camioane 8x4 și semiremorci.',
    accentColor: 'blue',
    recomandat: 'Semiremorci, Camion 8x4, Vole, Excavatoare, Buldozer, Bobcat',
    presetKm: [50000],
    presetMth: [4000, 5000],
    esteStandard: true,
    ordine: 2,
    activ: true,
  },
  {
    id: 'ULEI_CUTIE_DIF_80W90_GL5',
    cod: 'ULEI_CUTIE_DIF_80W90_GL5',
    nume: 'ULEI CUTIE / DIFERENTIAL 80W90 GL5',
    descriere: 'Ulei transmisie SAE 80W-90 API GL-5 pentru cutii de viteză și diferențiale grele.',
    accentColor: 'indigo',
    recomandat: 'Cap Tractor, Camion 8x4',
    presetKm: [60000, 100000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 3,
    activ: true,
  },
  {
    id: 'ULEI_CUTIE_VITEZA',
    cod: 'ULEI_CUTIE_VITEZA',
    nume: 'ULEI CUTIE DE VITEZA',
    descriere: 'Ulei cutie de viteze pentru capete tractor.',
    accentColor: 'indigo',
    recomandat: 'Cap Tractor',
    presetKm: [80000, 120000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 4,
    activ: true,
  },
  {
    id: 'ULEI_DIFERENTIAL',
    cod: 'ULEI_DIFERENTIAL',
    nume: 'ULEI DIFERENTIAL',
    descriere: 'Ulei diferențial punți grele pentru camioane 8x4.',
    accentColor: 'indigo',
    recomandat: 'Camion 8x4',
    presetKm: [60000, 100000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 5,
    activ: true,
  },
  {
    id: 'ULEI_AXE_10W_KOM',
    cod: 'ULEI_AXE_10W_KOM',
    nume: 'ULEI AXE 10W KOM',
    descriere: 'Ulei axe și reductoare finale SAE 10W pentru vole Komatsu.',
    accentColor: 'amber',
    recomandat: 'Vole Komatsu',
    presetKm: [50000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 6,
    activ: true,
  },
  {
    id: 'ULEI_CUTIE_KOM',
    cod: 'ULEI_CUTIE_KOM',
    nume: 'ULEI CUTIE KOM',
    descriere: 'Ulei transmisie powershift / cutie viteze Komatsu, Buldozer și Bobcat.',
    accentColor: 'amber',
    recomandat: 'Vole Komatsu, Buldozer, Bobcat',
    presetKm: [50000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 7,
    activ: true,
  },
  {
    id: 'ULEI_AXE_LIEB',
    cod: 'ULEI_AXE_LIEB',
    nume: 'ULEI AXE LIEB',
    descriere: 'Ulei punți și reductoare roți pentru vole Liebherr.',
    accentColor: 'purple',
    recomandat: 'Vole Liebherr',
    presetKm: [50000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 8,
    activ: true,
  },
  {
    id: 'ULEI_CUTIE_LIEB',
    cod: 'ULEI_CUTIE_LIEB',
    nume: 'ULEI CUTIE LIEB',
    descriere: 'Ulei cutie / transmisie hidrostatică pentru vole Liebherr.',
    accentColor: 'purple',
    recomandat: 'Vole Liebherr',
    presetKm: [50000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 9,
    activ: true,
  },
  {
    id: 'ULEI_ROTIRE_KOM',
    cod: 'ULEI_ROTIRE_KOM',
    nume: 'ULEI ROTIRE KOM',
    descriere: 'Ulei reductor mecanism rotire pentru excavatoare Komatsu.',
    accentColor: 'amber',
    recomandat: 'Excavatoare Komatsu',
    presetKm: [50000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 10,
    activ: true,
  },
  {
    id: 'ULEI_GRUPURI_KOM',
    cod: 'ULEI_GRUPURI_KOM',
    nume: 'ULEI GRUPURI KOM',
    descriere: 'Ulei grupuri și reductoare finale Komatsu, Buldozer și Bobcat.',
    accentColor: 'amber',
    recomandat: 'Excavatoare Komatsu, Buldozer, Bobcat',
    presetKm: [50000],
    presetMth: [3000],
    esteStandard: true,
    ordine: 11,
    activ: true,
  },
  {
    id: 'ULEI_ROTIRE_LIEB',
    cod: 'ULEI_ROTIRE_LIEB',
    nume: 'ULEI ROTIRE LIEB',
    descriere: 'Ulei reductor mecanism rotire pentru excavatoare Liebherr.',
    accentColor: 'purple',
    recomandat: 'Excavatoare Liebherr',
    presetKm: [50000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 12,
    activ: true,
  },
  {
    id: 'ULEI_GRUPURI_LIEB',
    cod: 'ULEI_GRUPURI_LIEB',
    nume: 'ULEI GRUPURI LIEB',
    descriere: 'Ulei grupuri și reductoare finale pentru excavatoare Liebherr.',
    accentColor: 'purple',
    recomandat: 'Excavatoare Liebherr',
    presetKm: [50000],
    presetMth: [3000],
    esteStandard: true,
    ordine: 13,
    activ: true,
  },
  {
    id: 'ULEI_HIDRAULIC_CONCASOR',
    cod: 'ULEI_HIDRAULIC_CONCASOR',
    nume: 'ULEI HIDRAULIC CONCASOR',
    descriere: 'Ulei sistem hidraulic specific concasor.',
    accentColor: 'blue',
    recomandat: 'Concasor',
    presetKm: [50000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 14,
    activ: true,
  },
  {
    id: 'ULEI_DE_UNGERE_CONCASOR',
    cod: 'ULEI_DE_UNGERE_CONCASOR',
    nume: 'ULEI DE UNGERE CONCASOR',
    descriere: 'Ulei circulație și ungere con/lagăre concasor (ex: Mobil Gear 600 XP 150).',
    accentColor: 'slate',
    recomandat: 'Concasor',
    presetKm: [50000],
    presetMth: [2000],
    esteStandard: true,
    ordine: 15,
    activ: true,
  },
  {
    id: 'ULEI_MOTOR_TURISME',
    cod: 'ULEI_MOTOR_TURISME',
    nume: 'ULEI MOTOR TURISME',
    descriere: 'Ulei motor sintetic autoturisme (5W-30 / 5W-40 / 0W-30).',
    accentColor: 'emerald',
    recomandat: 'Autoturisme',
    presetKm: [15000],
    presetMth: [500],
    esteStandard: true,
    ordine: 16,
    activ: true,
  },
  {
    id: 'ANTIGEL_G12',
    cod: 'ANTIGEL_G12',
    nume: 'Antigel G12+ (Roz)',
    descriere: 'Lichid răcire motor, protecție anti-îngheț și anticoroziune aluminiu/aliaj.',
    accentColor: 'rose',
    recomandat: 'Flotă modernă',
    presetKm: [40000, 60000],
    presetMth: [1000, 2000],
    esteStandard: true,
    ordine: 17,
    activ: true,
  },
  {
    id: 'ANTIGEL_G11',
    cod: 'ANTIGEL_G11',
    nume: 'Antigel G11 (Albastru)',
    descriere: 'Lichid răcire motor pe bază de silicați.',
    accentColor: 'cyan',
    recomandat: 'Generații clasice de utilaje',
    presetKm: [30000, 50000],
    presetMth: [1000],
    esteStandard: true,
    ordine: 18,
    activ: true,
  },
  {
    id: 'ADBLUE',
    cod: 'ADBLUE',
    nume: 'AdBlue',
    descriere: 'Soluție uree 32.5% pentru tratare gaze eșapament SCR.',
    accentColor: 'emerald',
    recomandat: 'Vehicule echipate SCR',
    presetKm: [10000, 15000],
    presetMth: [250, 500],
    esteStandard: true,
    ordine: 19,
    activ: true,
  },
];

export function normalizeTipuriFluideList(raw: any): TipFluidDef[] {
  if (!Array.isArray(raw) || raw.length === 0) return FALLBACK_TIPURI_FLUIDE;
  return raw.map((item, idx) => ({
    id: item.cod || item.id,
    dbId: item.dbId || (item.cod && item.id !== item.cod ? item.id : undefined),
    cod: item.cod || item.id,
    nume: item.nume || (item.cod || item.id || '').replace(/_/g, ' '),
    descriere: item.descriere || '',
    accentColor: item.accentColor || 'amber',
    recomandat: item.recomandat || '',
    presetKm: Array.isArray(item.presetKm) && item.presetKm.length > 0 ? item.presetKm : [15000, 30000],
    presetMth: Array.isArray(item.presetMth) && item.presetMth.length > 0 ? item.presetMth : [250, 500],
    esteStandard: Boolean(item.esteStandard),
    ordine: Number(item.ordine ?? idx + 1),
    activ: item.activ !== false,
  }));
}

export function buildTipLichidLabelMap(tipuri: TipFluidDef[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of FALLBACK_TIPURI_FLUIDE) map[f.cod] = f.nume;
  for (const f of tipuri) {
    if (f.cod && f.nume) map[f.cod] = f.nume;
  }
  return map;
}

export function getTipFluidLabel(cod?: string | null, tipuri: TipFluidDef[] = FALLBACK_TIPURI_FLUIDE): string {
  if (!cod) return '';
  const found = tipuri.find((t) => t.cod === cod) || FALLBACK_TIPURI_FLUIDE.find((t) => t.cod === cod);
  return found ? found.nume : cod.replace(/_/g, ' ');
}

export function buildSubcatTipMap(categorii: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  if (!Array.isArray(categorii)) return map;
  for (const c of categorii) {
    const catKey = String(c?.nume || '').trim().toLowerCase();
    for (const sc of c?.subcategorii || []) {
      const subKey = String(sc?.nume || '').trim().toLowerCase();
      if (subKey && sc?.tipLichid) {
        if (catKey) map[`${catKey}::${subKey}`] = sc.tipLichid;
        if (!map[subKey]) map[subKey] = sc.tipLichid;
      }
    }
  }
  return map;
}

const CONSUMABLE_PIECE_NORM_PATTERN =
  /(?:^|_)(FILTR[A-Z0-9]*|FILTER|CUREA|CURELE|BUJIE|BUJII|PLACUT[AE]|SABOT|DISC|BEC|STERGATOR|BATERIE|ACUMULATOR)(?:_|$)/i;

function stripDiacritics(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Returnează true pentru norme de tip filtru/consumabil la bucată (ex: FILTRU_AER, FILTRU_ULEI),
 * distincte de fluidele/lubrifianții măsurați în litri.
 */
export function isConsumablePieceNorm(tipLichid?: string | null): boolean {
  const code = String(tipLichid || '').trim().toUpperCase();
  if (!code) return false;
  return CONSUMABLE_PIECE_NORM_PATTERN.test(code);
}

/**
 * Returnează unitatea de măsură potrivită (buc pentru filtre/consumabile, L pentru fluide).
 */
export function getNormUnitMeasure(
  tipLichid?: string | null,
  articolUm?: string | null,
): string {
  if (isConsumablePieceNorm(tipLichid)) {
    const cleanUm = String(articolUm || '').trim();
    if (cleanUm && !/^(l|litri|litru)$/i.test(cleanUm)) return cleanUm;
    return 'buc';
  }
  return 'L';
}

export function isFluidCategoryOrItem(
  catName?: string | null,
  esteFluidFlag?: boolean,
  tipLichid?: string | null,
  um?: string | null,
  descriere?: string | null,
): boolean {
  if (tipLichid && isConsumablePieceNorm(tipLichid)) return false;
  if (tipLichid && String(tipLichid).trim() !== '') return true;
  if (esteFluidFlag) return true;
  const cat = String(catName || '').toLowerCase();
  if (/\b(filtr)/i.test(cat)) return false;
  if (/lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(cat)) return true;
  if (String(um || '').trim().toLowerCase() === 'l') return true;
  const desc = String(descriere || '').toLowerCase();
  if (/\b(filtru|filter|senzor|furtun|pompa|bec|vopsea|spray|spuma|degresant|sapun|taxa)\b/i.test(desc)) {
    return false;
  }
  return /\b(ulei|antigel|adblue|hlp|hvlp|10w40|15w40|5w30|5w40|80w90|75w90|atf|vaselina)\b/i.test(desc);
}

/**
 * Returnează true pentru articole/categorii eligibile pentru asocierea unei Norme Periodice
 * (atât fluide/lubrifianți, cât și filtre / consumabile monitorizate prin intervale).
 */
export function isNormTrackableCategoryOrItem(
  catName?: string | null,
  esteFluidFlag?: boolean,
  tipLichid?: string | null,
  um?: string | null,
  descriere?: string | null,
): boolean {
  if (tipLichid && String(tipLichid).trim() !== '') return true;
  if (isFluidCategoryOrItem(catName, esteFluidFlag, tipLichid, um, descriere)) return true;
  const cat = stripDiacritics(catName || '').toLowerCase();
  const desc = stripDiacritics(descriere || '').toLowerCase();
  if (/\bfiltr/i.test(cat)) return true;
  if (/\b(filtru|filtre|filter)\b/i.test(desc)) return true;
  return false;
}

export function detectTipLichidFromStockText(item: any): string {
  const desc = stripDiacritics(item?.denumire || '').toLowerCase();
  const sub = stripDiacritics(item?.subcategorie || '').toLowerCase();
  const cat = stripDiacritics(item?.categorie || '').toLowerCase();
  const txt = `${sub} ${desc} ${cat} ${stripDiacritics(item?.marcaUlei || '').toLowerCase()}`;

  // Filtre & consumabile (nu fac fallback la ULEI_MOTOR_15W40)
  if (/\bfiltr/i.test(cat) || /\b(filtru|filtre|filter)\b/i.test(desc)) {
    if (
      (/\bfiltr[uueia]*\s+(?:de\s+)?aer\b|\bair\s+filter\b/i.test(desc) ||
        (/\bfiltr/i.test(cat) && /\baer\b/i.test(sub))) &&
      !/\b(polen|cabina|habitaclu|uscator|perna|perne|aerisitor|aeroterma|bucsa|radiator)\b/i.test(desc)
    ) {
      return 'FILTRU_AER';
    }
    return '';
  }

  if (/adblue|uree/i.test(txt)) return 'ADBLUE';
  if (/antigel|coolant|racire|g12|g11/i.test(txt)) {
    return /g11|albastru|blue/i.test(txt) ? 'ANTIGEL_G11' : 'ANTIGEL_G12';
  }
  if (/hidraulic.*concasor|concasor.*hidraulic/i.test(txt)) return 'ULEI_HIDRAULIC_CONCASOR';
  if (/ung.*concasor|concasor.*ung|gear\s*600/i.test(txt)) return 'ULEI_DE_UNGERE_CONCASOR';
  if (/hidraulic|hlp|hvlp|tellus|dte/i.test(txt)) return 'ULEI_HIDRAULIC';
  if (/axe.*10w.*kom|10w.*kom/i.test(txt)) return 'ULEI_AXE_10W_KOM';
  if (/axe.*lieb|lieb.*axe|punte.*lieb/i.test(txt)) return 'ULEI_AXE_LIEB';
  if (/cutie.*kom|kom.*cutie/i.test(txt)) return 'ULEI_CUTIE_KOM';
  if (/cutie.*lieb|lieb.*cutie/i.test(txt)) return 'ULEI_CUTIE_LIEB';
  if (/rotire.*kom/i.test(txt)) return 'ULEI_ROTIRE_KOM';
  if (/rotire.*lieb/i.test(txt)) return 'ULEI_ROTIRE_LIEB';
  if (/grup.*kom/i.test(txt)) return 'ULEI_GRUPURI_KOM';
  if (/grup.*lieb/i.test(txt)) return 'ULEI_GRUPURI_LIEB';
  if (/80w[- ]?90|gl5|cutie.*diferen/i.test(txt)) return 'ULEI_CUTIE_DIF_80W90_GL5';
  if (/cutie.*vitez/i.test(txt)) return 'ULEI_CUTIE_VITEZA';
  if (/diferential/i.test(txt)) return 'ULEI_DIFERENTIAL';
  if (/turism|5w[- ]?30|5w[- ]?40|0w[- ]?30|0w[- ]?20/i.test(txt)) return 'ULEI_MOTOR_TURISME';
  return 'ULEI_MOTOR_15W40';
}

export function resolveEffectiveTipLichid(
  item: any,
  subcatTipMap?: Record<string, string>,
): { cod: string | null; source: 'ARTICOL' | 'SUBCATEGORIE' | 'AUTO' | null } {
  if (!item) return { cod: null, source: null };
  if (item.tipLichid && String(item.tipLichid).trim() !== '') {
    return { cod: String(item.tipLichid).trim(), source: 'ARTICOL' };
  }
  if (subcatTipMap && item.subcategorie) {
    const subKey = String(item.subcategorie).trim().toLowerCase();
    const catKey = String(item.categorie || '').trim().toLowerCase();
    const subTip = (catKey && subcatTipMap[`${catKey}::${subKey}`]) || subcatTipMap[subKey];
    if (subTip) {
      return { cod: subTip, source: 'SUBCATEGORIE' };
    }
  }
  const detected = detectTipLichidFromStockText(item);
  return detected ? { cod: detected, source: 'AUTO' } : { cod: null, source: null };
}

export function isArticolMatchingTipLichid(
  item: any,
  tipLichid: string,
  subcatTipMap?: Record<string, string>,
): boolean {
  if (!item) return false;
  const sub = stripDiacritics(item.subcategorie || '').toLowerCase();
  const den = stripDiacritics(item.denumire || '').toLowerCase();
  const cat = stripDiacritics(item.categorie || '').toLowerCase();
  const marca = stripDiacritics(item.marcaUlei || '').toLowerCase();
  const combined = `${sub} ${den} ${cat} ${marca}`;

  if (/spuma|curatitor|spray|degresant/i.test(combined)) {
    return false;
  }

  const targetIsPiece = isConsumablePieceNorm(tipLichid);

  // 1. Asociere explicită pe ArticolStoc sau SubcategorieStoc are prioritate absolută!
  const resolved = resolveEffectiveTipLichid(item, subcatTipMap);
  if (resolved.source === 'ARTICOL') {
    return resolved.cod === tipLichid;
  }
  if (resolved.source === 'SUBCATEGORIE') {
    if (targetIsPiece && /\b(aerisitor|perna|perne|bucsa|radiator|aeroterma)\b/i.test(den)) {
      return false;
    }
    return resolved.cod === tipLichid;
  }

  // 2. Norme de tip consumabil / filtru (la bucată)
  if (targetIsPiece) {
    const normUp = String(tipLichid || '').toUpperCase();
    if (normUp === 'FILTRU_AER' || normUp.startsWith('FILTRU_AER_')) {
      if (/\b(polen|cabina|habitaclu|uscator|perna|perne|aerisitor|aeroterma|bucsa|radiator)\b/i.test(den)) {
        return false;
      }
      return (
        /\bfiltr[uueia]*\s+(?:de\s+)?aer\b|\bair\s+filter\b/i.test(den) ||
        (/\bfiltr/i.test(cat) && /\baer\b/i.test(sub))
      );
    }
    const tokens = normUp
      .toLowerCase()
      .split('_')
      .filter((t) => t.length >= 3);
    return tokens.length > 0 && tokens.every((tk) => combined.includes(tk));
  }

  // Pentru norme de fluide, excludem filtrele
  if (/\bfiltr/i.test(cat) || /\b(filtru|filter)\b/i.test(den)) {
    return false;
  }

  // 3. Fallback bazat pe cuvinte cheie pentru articole fluide fără legătură explicită
  switch (tipLichid) {
    case 'ULEI_MOTOR_15W40':
      return (
        (/15w[- ]?40|motor|delvac|urania|rimula/i.test(combined)) &&
        !/hidraulic|hlp|dte|tellus|hvlp|turism|antigel|adblue|vaselin/i.test(combined)
      );
    case 'ULEI_MOTOR_TURISME':
      return /turism|5w[- ]?30|5w[- ]?40|0w[- ]?30|0w[- ]?20|edge/i.test(combined);
    case 'ULEI_HIDRAULIC':
    case 'ULEI_HIDRAULIC_CONCASOR':
      return /hidraulic|hlp|dte|tellus|hvlp|hvi/i.test(combined) && !/antigel|adblue/i.test(combined);
    case 'ULEI_DE_UNGERE_CONCASOR':
      return /concasor|gear\s*600/i.test(combined);
    case 'ANTIGEL_G12':
      return /g12|antigel.*roz|coolant.*pink|antigel/i.test(combined);
    case 'ANTIGEL_G11':
      return /g11|antigel.*albastru|coolant.*blue|antigel/i.test(combined);
    case 'ADBLUE':
      return /adblue|uree/i.test(combined);
    default: {
      const tokens = tipLichid
        .toLowerCase()
        .split('_')
        .filter((t) => t.length >= 3 && t !== 'ulei');
      return tokens.length > 0 && tokens.some((tk) => combined.includes(tk));
    }
  }
}
