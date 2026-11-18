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
    id: 'ULEI_MOTOR',
    cod: 'ULEI_MOTOR',
    nume: 'Ulei Motor',
    descriere: 'Lubrifiere motor termic, protecție împotriva uzurii și depunerilor la temperaturi înalte.',
    accentColor: 'amber',
    recomandat: 'Esențial pentru toate utilajele și autovehiculele',
    presetKm: [10000, 15000, 20000, 30000, 40000],
    presetMth: [150, 250, 500],
    esteStandard: true,
    ordine: 1,
    activ: true,
  },
  {
    id: 'ULEI_HIDRAULIC',
    cod: 'ULEI_HIDRAULIC',
    nume: 'Ulei Hidraulic',
    descriere: 'Transmisie putere hidraulică, operare braț, cilindri și pompe de presiune.',
    accentColor: 'blue',
    recomandat: 'Critic pentru Excavatoare, Încărcătoare, Basculante',
    presetKm: [30000, 60000, 100000],
    presetMth: [500, 1000, 1500, 2000],
    esteStandard: true,
    ordine: 2,
    activ: true,
  },
  {
    id: 'ULEI_TRANSMISIE',
    cod: 'ULEI_TRANSMISIE',
    nume: 'Ulei Transmisie & Diferențial',
    descriere: 'Protecție cutie viteze mecanică/automată, grupuri conice și diferențiale axe.',
    accentColor: 'indigo',
    recomandat: 'Capete Tractor, Camioane 8x4, Basculante, Autoutilitare',
    presetKm: [30000, 60000, 90000, 120000],
    presetMth: [500, 1000, 1500],
    esteStandard: true,
    ordine: 3,
    activ: true,
  },
  {
    id: 'ANTIGEL_G12',
    cod: 'ANTIGEL_G12',
    nume: 'Antigel G12+ (Lichid Răcire Roz)',
    descriere: 'Răcire motor, protecție anti-îngheț și anticoroziune aluminiu/aliaj.',
    accentColor: 'rose',
    recomandat: 'Flotă modernă (Euro 5, Euro 6, Stage IV / V)',
    presetKm: [40000, 60000, 100000],
    presetMth: [1000, 2000],
    esteStandard: true,
    ordine: 4,
    activ: true,
  },
  {
    id: 'ADBLUE',
    cod: 'ADBLUE',
    nume: 'AdBlue (Soluție Uree 32.5%)',
    descriere: 'Tratare gaze eșapament SCR, reducere emisii NOx conform normelor antipoluare.',
    accentColor: 'emerald',
    recomandat: 'Vehicule echipate cu catalizator SCR (Euro 6 / Stage V)',
    presetKm: [10000, 15000, 25000],
    presetMth: [250, 500],
    esteStandard: true,
    ordine: 5,
    activ: true,
  },
  {
    id: 'ANTIGEL_G11',
    cod: 'ANTIGEL_G11',
    nume: 'Antigel G11 (Lichid Răcire Albastru)',
    descriere: 'Răcire motor pe bază de silicați pentru utilaje din generații clasice.',
    accentColor: 'cyan',
    recomandat: 'Generații clasice de utilaje',
    presetKm: [30000, 50000],
    presetMth: [1000],
    esteStandard: true,
    ordine: 6,
    activ: true,
  },
  {
    id: 'ULEI_LIEBHERR_PUNTE',
    cod: 'ULEI_LIEBHERR_PUNTE',
    nume: 'Ulei Punte Liebherr',
    descriere: 'Ulei specific de înaltă presiune pentru punți și reductoare de roată Liebherr.',
    accentColor: 'purple',
    recomandat: 'Utilaje grele Liebherr (Excavatoare, Vole)',
    presetKm: [30000, 50000],
    presetMth: [500, 1000],
    esteStandard: true,
    ordine: 7,
    activ: true,
  },
  {
    id: 'ULEI_LIEBHERR_CUTIE',
    cod: 'ULEI_LIEBHERR_CUTIE',
    nume: 'Ulei Cutie Liebherr',
    descriere: 'Ulei transmisie hidrostatică sau powershift pentru utilaje terasiere Liebherr.',
    accentColor: 'purple',
    recomandat: 'Transmisii utilaje Liebherr',
    presetKm: [30000, 50000],
    presetMth: [500, 1000],
    esteStandard: true,
    ordine: 8,
    activ: true,
  },
  {
    id: 'ULEI_CUTIE_MANUALA',
    cod: 'ULEI_CUTIE_MANUALA',
    nume: 'Ulei Cutie Manuală',
    descriere: 'Transmisii manuale sinteză 75W-80 sau 80W-90.',
    accentColor: 'slate',
    recomandat: 'Camioane și autoutilitare cu cutie manuală',
    presetKm: [40000, 80000],
    presetMth: [500, 1000],
    esteStandard: true,
    ordine: 9,
    activ: true,
  },
  {
    id: 'ULEI_CUTIE_AUTOMATA',
    cod: 'ULEI_CUTIE_AUTOMATA',
    nume: 'Ulei Cutie Automată (ATF)',
    descriere: 'Fluide de transmisie automată ATF Dexron / ZF Ecolife / TraXon.',
    accentColor: 'purple',
    recomandat: 'Capete tractor automate și autoturisme',
    presetKm: [60000, 120000],
    presetMth: [1000, 1500],
    esteStandard: true,
    ordine: 10,
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

export function isFluidCategoryOrItem(
  catName?: string | null,
  esteFluidFlag?: boolean,
  tipLichid?: string | null,
  um?: string | null,
  descriere?: string | null,
): boolean {
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

export function detectTipLichidFromStockText(item: any): string {
  const txt = `${item?.subcategorie || ''} ${item?.denumire || ''} ${item?.categorie || ''} ${item?.marcaUlei || ''}`.toLowerCase();
  if (/adblue|uree/i.test(txt)) return 'ADBLUE';
  if (/antigel|coolant|racire|g12|g11/i.test(txt)) {
    return /g11|albastru|blue/i.test(txt) ? 'ANTIGEL_G11' : 'ANTIGEL_G12';
  }
  if (/hidraulic|hlp|hvlp|tellus|dte/i.test(txt)) return 'ULEI_HIDRAULIC';
  if (/liebherr.*punte|punte.*liebherr/i.test(txt)) return 'ULEI_LIEBHERR_PUNTE';
  if (/liebherr.*cutie|cutie.*liebherr/i.test(txt)) return 'ULEI_LIEBHERR_CUTIE';
  if (/cutie.*automat|atf|dexron/i.test(txt)) return 'ULEI_CUTIE_AUTOMATA';
  if (/cutie.*manual/i.test(txt)) return 'ULEI_CUTIE_MANUALA';
  if (/transmis|diferential|gear|punte|cutie|80w90|75w90|ls90/i.test(txt)) return 'ULEI_TRANSMISIE';
  return 'ULEI_MOTOR';
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
  return { cod: detectTipLichidFromStockText(item), source: 'AUTO' };
}

export function isArticolMatchingTipLichid(
  item: any,
  tipLichid: string,
  subcatTipMap?: Record<string, string>,
): boolean {
  if (!item) return false;
  const sub = (item.subcategorie || '').toLowerCase();
  const den = (item.denumire || '').toLowerCase();
  const cat = (item.categorie || '').toLowerCase();
  const marca = (item.marcaUlei || '').toLowerCase();
  const combined = `${sub} ${den} ${cat} ${marca}`;

  if (/spuma|curatitor|spray|degresant/i.test(combined)) {
    return false;
  }

  // 1. Asociere explicită pe ArticolStoc sau SubcategorieStoc are prioritate absolută!
  const resolved = resolveEffectiveTipLichid(item, subcatTipMap);
  if (resolved.source === 'ARTICOL' || resolved.source === 'SUBCATEGORIE') {
    return resolved.cod === tipLichid;
  }

  // 2. Fallback bazat pe cuvinte cheie pentru articole fără legătură explicită
  switch (tipLichid) {
    case 'ULEI_MOTOR':
      return (
        (sub.includes('motor') || den.includes('motor') || /15w40|10w40|5w30|5w40|0w30|0w20|delvac|castrol/i.test(combined)) &&
        !/hidraulic|hlp|dte|tellus|hvlp|transmisie|diferential|gear|punte|cutie|80w90|75w90|atf|antigel|adblue/i.test(combined)
      );
    case 'ULEI_HIDRAULIC':
      return (
        /hidraulic|hlp|dte|tellus|hvlp|hvi/i.test(combined) &&
        !/delvac|castrol.*10w40|antigel|adblue/i.test(combined)
      );
    case 'ULEI_TRANSMISIE':
      return (
        /transmisie|diferential|gear|punte|cutie|80w90|75w90|75w80|85w140|atf|utto/i.test(combined) &&
        !/hidraulic|antigel|adblue/i.test(combined)
      );
    case 'ULEI_LIEBHERR_PUNTE':
      return (
        /punte/i.test(combined) ||
        (combined.includes('liebherr') && /gear|80w90|punte/i.test(combined)) ||
        /80w90|gear\s*oil|punte/i.test(combined)
      );
    case 'ULEI_LIEBHERR_CUTIE':
      return (
        (combined.includes('liebherr') && /cutie|transmisie/i.test(combined)) ||
        /cutie/i.test(combined) ||
        /transmisie|atf/i.test(combined)
      );
    case 'ULEI_CUTIE_MANUALA':
      return (
        /cutie.*manual|manual.*cutie/i.test(combined) ||
        /75w80|75w90|80w90|transmisie|cutie/i.test(combined)
      );
    case 'ULEI_CUTIE_AUTOMATA':
      return /automat|atf|dexron/i.test(combined);
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
