// ==========================================
// UTILITARE CENTRALIZATE FLUIDE & LUBRIFIANȚI
// ==========================================

export interface DefaultTipFluidSeed {
  cod: string;
  nume: string;
  descriere: string;
  accentColor: string;
  recomandat: string;
  presetKm: number[];
  presetMth: number[];
  ordine: number;
}

export const DEFAULT_TIPURI_FLUIDE: DefaultTipFluidSeed[] = [
  {
    cod: 'ULEI_MOTOR_15W40',
    nume: 'ULEI MOTOR 15W40',
    descriere: 'Ulei motor heavy-duty 15W-40 pentru camioane, vole, excavatoare, buldozer și bobcat.',
    accentColor: 'amber',
    recomandat: 'Cap Tractor, Camion 8x4, Vole, Excavatoare, Buldozer, Bobcat',
    presetKm: [15000, 30000],
    presetMth: [500, 1000, 1250],
    ordine: 1,
  },
  {
    cod: 'ULEI_HIDRAULIC',
    nume: 'ULEI HIDRAULIC',
    descriere: 'Ulei hidraulic HLP / HVLP pentru utilaje de șantier, camioane 8x4 și semiremorci.',
    accentColor: 'blue',
    recomandat: 'Semiremorci, Camion 8x4, Vole, Excavatoare, Buldozer, Bobcat',
    presetKm: [50000],
    presetMth: [4000, 5000],
    ordine: 2,
  },
  {
    cod: 'ULEI_CUTIE_DIF_80W90_GL5',
    nume: 'ULEI CUTIE / DIFERENTIAL 80W90 GL5',
    descriere: 'Ulei transmisie SAE 80W-90 API GL-5 pentru cutii de viteză și diferențiale grele.',
    accentColor: 'indigo',
    recomandat: 'Cap Tractor, Camion 8x4',
    presetKm: [60000, 100000],
    presetMth: [2000],
    ordine: 3,
  },
  {
    cod: 'ULEI_CUTIE_VITEZA',
    nume: 'ULEI CUTIE DE VITEZA',
    descriere: 'Ulei cutie de viteze pentru capete tractor.',
    accentColor: 'indigo',
    recomandat: 'Cap Tractor',
    presetKm: [80000, 120000],
    presetMth: [2000],
    ordine: 4,
  },
  {
    cod: 'ULEI_DIFERENTIAL',
    nume: 'ULEI DIFERENTIAL',
    descriere: 'Ulei diferențial punți grele pentru camioane 8x4.',
    accentColor: 'indigo',
    recomandat: 'Camion 8x4',
    presetKm: [60000, 100000],
    presetMth: [2000],
    ordine: 5,
  },
  {
    cod: 'ULEI_AXE_10W_KOM',
    nume: 'ULEI AXE 10W KOM',
    descriere: 'Ulei axe și reductoare finale SAE 10W pentru vole Komatsu.',
    accentColor: 'amber',
    recomandat: 'Vole Komatsu',
    presetKm: [50000],
    presetMth: [2000],
    ordine: 6,
  },
  {
    cod: 'ULEI_CUTIE_KOM',
    nume: 'ULEI CUTIE KOM',
    descriere: 'Ulei transmisie powershift / cutie viteze Komatsu, Buldozer și Bobcat.',
    accentColor: 'amber',
    recomandat: 'Vole Komatsu, Buldozer, Bobcat',
    presetKm: [50000],
    presetMth: [2000],
    ordine: 7,
  },
  {
    cod: 'ULEI_AXE_LIEB',
    nume: 'ULEI AXE LIEB',
    descriere: 'Ulei punți și reductoare roți pentru vole Liebherr.',
    accentColor: 'purple',
    recomandat: 'Vole Liebherr',
    presetKm: [50000],
    presetMth: [2000],
    ordine: 8,
  },
  {
    cod: 'ULEI_CUTIE_LIEB',
    nume: 'ULEI CUTIE LIEB',
    descriere: 'Ulei cutie / transmisie hidrostatică pentru vole Liebherr.',
    accentColor: 'purple',
    recomandat: 'Vole Liebherr',
    presetKm: [50000],
    presetMth: [2000],
    ordine: 9,
  },
  {
    cod: 'ULEI_ROTIRE_KOM',
    nume: 'ULEI ROTIRE KOM',
    descriere: 'Ulei reductor mecanism rotire pentru excavatoare Komatsu.',
    accentColor: 'amber',
    recomandat: 'Excavatoare Komatsu',
    presetKm: [50000],
    presetMth: [2000],
    ordine: 10,
  },
  {
    cod: 'ULEI_GRUPURI_KOM',
    nume: 'ULEI GRUPURI KOM',
    descriere: 'Ulei grupuri și reductoare finale Komatsu, Buldozer și Bobcat.',
    accentColor: 'amber',
    recomandat: 'Excavatoare Komatsu, Buldozer, Bobcat',
    presetKm: [50000],
    presetMth: [3000],
    ordine: 11,
  },
  {
    cod: 'ULEI_ROTIRE_LIEB',
    nume: 'ULEI ROTIRE LIEB',
    descriere: 'Ulei reductor mecanism rotire pentru excavatoare Liebherr.',
    accentColor: 'purple',
    recomandat: 'Excavatoare Liebherr',
    presetKm: [50000],
    presetMth: [2000],
    ordine: 12,
  },
  {
    cod: 'ULEI_GRUPURI_LIEB',
    nume: 'ULEI GRUPURI LIEB',
    descriere: 'Ulei grupuri și reductoare finale pentru excavatoare Liebherr.',
    accentColor: 'purple',
    recomandat: 'Excavatoare Liebherr',
    presetKm: [50000],
    presetMth: [3000],
    ordine: 13,
  },
  {
    cod: 'ULEI_HIDRAULIC_CONCASOR',
    nume: 'ULEI HIDRAULIC CONCASOR',
    descriere: 'Ulei sistem hidraulic specific concasor.',
    accentColor: 'blue',
    recomandat: 'Concasor',
    presetKm: [50000],
    presetMth: [2000],
    ordine: 14,
  },
  {
    cod: 'ULEI_DE_UNGERE_CONCASOR',
    nume: 'ULEI DE UNGERE CONCASOR',
    descriere: 'Ulei circulație și ungere con/lagăre concasor (ex: Mobil Gear 600 XP 150).',
    accentColor: 'slate',
    recomandat: 'Concasor',
    presetKm: [50000],
    presetMth: [2000],
    ordine: 15,
  },
  {
    cod: 'ULEI_MOTOR_TURISME',
    nume: 'ULEI MOTOR TURISME',
    descriere: 'Ulei motor sintetic autoturisme (5W-30 / 5W-40 / 0W-30).',
    accentColor: 'emerald',
    recomandat: 'Autoturisme',
    presetKm: [15000],
    presetMth: [500],
    ordine: 16,
  },
  {
    cod: 'ANTIGEL_G12',
    nume: 'Antigel G12+ (Roz)',
    descriere: 'Lichid răcire motor, protecție anti-îngheț și anticoroziune aluminiu/aliaj.',
    accentColor: 'rose',
    recomandat: 'Flotă modernă',
    presetKm: [40000, 60000],
    presetMth: [1000, 2000],
    ordine: 17,
  },
  {
    cod: 'ANTIGEL_G11',
    nume: 'Antigel G11 (Albastru)',
    descriere: 'Lichid răcire motor pe bază de silicați.',
    accentColor: 'cyan',
    recomandat: 'Generații clasice de utilaje',
    presetKm: [30000, 50000],
    presetMth: [1000],
    ordine: 18,
  },
  {
    cod: 'ADBLUE',
    nume: 'AdBlue',
    descriere: 'Soluție uree 32.5% pentru tratare gaze eșapament SCR.',
    accentColor: 'emerald',
    recomandat: 'Vehicule echipate SCR',
    presetKm: [10000, 15000],
    presetMth: [250, 500],
    ordine: 19,
  },
];

export const TIP_LICHID_LABELS: Record<string, string> = {
  ...DEFAULT_TIPURI_FLUIDE.reduce(
    (acc, item) => {
      acc[item.cod] = item.nume;
      return acc;
    },
    {} as Record<string, string>,
  ),
  ULEI_MOTOR: 'Ulei Motor',
  ULEI_TRANSMISIE: 'Ulei Transmisie & Diferențial',
  ULEI_LIEBHERR_PUNTE: 'Ulei Punte Liebherr',
  ULEI_LIEBHERR_CUTIE: 'Ulei Cutie Liebherr',
  ULEI_CUTIE_MANUALA: 'Ulei Cutie Manuală',
  ULEI_CUTIE_AUTOMATA: 'Ulei Cutie Automată (ATF)',
};

export function isMthTipMasurare(tipMasurare?: string | null): boolean {
  const tm = String(tipMasurare || '').trim().toUpperCase();
  return tm === 'MTH' || tm === 'ORE' || tm === 'M_TH';
}

export function isDualMthVehicle(vehicul?: any): boolean {
  if (!vehicul) return false;
  if (isMthTipMasurare(vehicul.tipMasurare)) return false;
  return Boolean(vehicul.areContorDualMth) || String(vehicul.categorieEnum || '').toUpperCase() === 'CAP_TRACTOR';
}

export function getEffectiveMthCounter(vehicul?: any): number {
  if (!vehicul) return 0;
  if (isMthTipMasurare(vehicul.tipMasurare)) {
    return Number(vehicul.valoareContorCurent || 0);
  }
  return Number(vehicul.oreFunctionareCurent || 0);
}

/**
 * Rezolvă unitatea de măsură și contorul efectiv pentru o normă de fluid,
 * suportând inclusiv vehicule duale (KM la alimentare + mTH manual pentru ulei motor, ex: CAP_TRACTOR).
 */
export function resolveFluidRuleCounterConfig(vehicul: any, cfg: any): {
  trackingMode: 'MTH' | 'KM' | 'LUNI';
  unitateMasura: 'mTH' | 'KM';
  currentContor: number;
  intervalPrincipal: number | null;
  pragPrincipal: number;
} {
  const vehicleIsMth = isMthTipMasurare(vehicul?.tipMasurare);
  const dualMth = isDualMthVehicle(vehicul);
  const hasMthRule = Boolean(cfg?.intervalMth && Number(cfg.intervalMth) > 0);
  const hasKmRule = Boolean(cfg?.intervalKm && Number(cfg.intervalKm) > 0);

  if (hasMthRule && (vehicleIsMth || dualMth || !hasKmRule)) {
    return {
      trackingMode: 'MTH',
      unitateMasura: 'mTH',
      currentContor: vehicleIsMth
        ? Number(vehicul?.valoareContorCurent || 0)
        : Number(vehicul?.oreFunctionareCurent || 0),
      intervalPrincipal: Number(cfg.intervalMth),
      pragPrincipal: Number(cfg.pragAvertizareMth || 50),
    };
  }

  if (hasKmRule && (!vehicleIsMth || !hasMthRule)) {
    return {
      trackingMode: 'KM',
      unitateMasura: 'KM',
      currentContor: Number(vehicul?.valoareContorCurent || 0),
      intervalPrincipal: Number(cfg.intervalKm),
      pragPrincipal: Number(cfg.pragAvertizareKm || 1000),
    };
  }

  return {
    trackingMode: 'LUNI',
    unitateMasura: vehicleIsMth ? 'mTH' : 'KM',
    currentContor: Number(vehicul?.valoareContorCurent || 0),
    intervalPrincipal: null,
    pragPrincipal: 0,
  };
}

const NON_FLUID_PATTERN =
  /\b(filtru|filter|senzor|vas\s+expansiune|furtun|pompa|joja|buson|capac|garnitur|oring|o-ring|simering|bec|pozitie|cireasa|vopsea|kober|diluant|grund|spray|spuma|degresant|degripant|curatitor|sapun|lavete|manus[ia]|cizm[ae]|bocanc|salopet[ae]|casc[ae]|echipament|protectie|taxa\s+(?:mediu\s+)?ulei)\b/i;

const POSITIVE_FLUID_PATTERN =
  /\b(ulei|oil|antigel|coolant|adblue|uree|vaselina|unsoare|atf|hlp|hvlp|tellus|delvac|urania|castrol|rimula|gear\s*\d*|10w[- ]?40|15w[- ]?40|5w[- ]?30|5w[- ]?40|0w[- ]?30|0w[- ]?20|80w[- ]?90|75w[- ]?90|75w[- ]?80|85w[- ]?140|lichid\s+(?:frana|parbriz|racire|hidraulic))\b/i;

const FLUID_CATEGORY_PATTERN =
  /\b(lubrifian|ulei|fluid|antigel|adblue|racire|vaselin|lichid\s+spalare)\b/i;

const CONSUMABLE_PIECE_NORM_PATTERN =
  /(?:^|_)(FILTR[A-Z0-9]*|FILTER|CUREA|CURELE|BUJIE|BUJII|PLACUT[AE]|SABOT|DISC|BEC|STERGATOR|BATERIE|ACUMULATOR)(?:_|$)/i;

/**
 * Returnează true dacă un cod de normă (TipFluid.cod) reprezintă un consumabil la bucată
 * (ex: FILTRU_AER, FILTRU_ULEI, FILTRU_COMBUSTIBIL, FILTRU_HIDRAULIC, CUREA_TRANSMISIE)
 * și NU un lichid/lubrifiant măsurat în litri.
 */
export function isConsumablePieceNorm(tipLichid?: string | null): boolean {
  const code = String(tipLichid || '').trim().toUpperCase();
  if (!code) return false;
  return CONSUMABLE_PIECE_NORM_PATTERN.test(code);
}

/**
 * Unitatea de măsură standard pentru afișare & cost unitar în funcție de tipul normei.
 */
export function getNormUnitMeasure(
  tipLichid?: string | null,
  articolUm?: string | null,
): string {
  if (isConsumablePieceNorm(tipLichid)) {
    const cleanUm = String(articolUm || '').trim();
    if (cleanUm && !/^(l|litri|litru)$/i.test(cleanUm)) {
      return cleanUm;
    }
    return 'buc';
  }
  return 'L';
}

interface ConsumableNormMatcher {
  normTest: (normCode: string) => boolean;
  excludeDesc: RegExp;
  matchDesc: RegExp;
  matchSubcat?: (cat: string, sub: string) => boolean;
}

const CONSUMABLE_NORM_MATCHERS: ConsumableNormMatcher[] = [
  {
    // Filtru de aer motor (exclude polen/cabină, uscător aer, perne aer, aerisitoare, aeroterme, bucșe)
    normTest: (c) => c === 'FILTRU_AER' || /^FILTRU_AER(?:_|$)/.test(c),
    excludeDesc:
      /\b(polen|cabina|habitaclu|uscator|perna|perne|aerisitor|aeroterma|bucsa|bucse|radiator|compresor|supapa|furtun|senzor|robinet)\b/i,
    matchDesc:
      /\b(?:filtr[uueia]*\s+(?:de\s+)?aer|air\s+filter|cartus\s+filtr[u]?\s+aer)\b/i,
    matchSubcat: (cat, sub) =>
      /\bfiltr/i.test(cat) &&
      /\b(?:filtr[uueia]*\s+)?aer\b/i.test(sub) &&
      !/polen|cabina|habitaclu|perna|uscator/i.test(sub),
  },
  {
    // Filtru ulei motor (exclude filtre hidraulice / transmisie / combustibil / aer)
    normTest: (c) => c === 'FILTRU_ULEI' || /^FILTRU_ULEI(?:_MOTOR)?$/.test(c),
    excludeDesc:
      /\b(hidraulic|cutie|transmis|servo|aer|combustibil|motorina|polen|cabina|uscator|separator|senzor|capac|garnitur|cheie)\b/i,
    matchDesc: /\b(?:filtr[uueia]*\s+(?:de\s+)?ulei|oil\s+filter)\b/i,
    matchSubcat: (cat, sub) =>
      /\bfiltr/i.test(cat) && /\bulei\b/i.test(sub) && !/hidraulic/i.test(sub),
  },
  {
    // Filtru combustibil / motorină
    normTest: (c) => /^FILTRU_(?:COMBUSTIBIL|MOTORINA|CARBURANT)/.test(c),
    excludeDesc: /\b(ulei|aer|hidraulic|polen|cabina|uscator|servo|senzor|pompa)\b/i,
    matchDesc:
      /\b(?:filtr[uueia]*\s+(?:de\s+)?(?:combustibil|motorina|benzina|carburant)|fuel\s+filter)\b/i,
    matchSubcat: (cat, sub) =>
      /\bfiltr/i.test(cat) && /\b(?:combustibil|motorina|carburant)\b/i.test(sub),
  },
  {
    // Filtru hidraulic
    normTest: (c) => /^FILTRU_HIDRAULIC/.test(c),
    excludeDesc: /\b(aer|combustibil|motorina|polen|cabina|uscator|pompa|furtun|senzor)\b/i,
    matchDesc:
      /\b(?:filtr[uueia]*\s+(?:de\s+)?(?:ulei\s+)?hidraulic|hydraulic\s+filter)\b/i,
    matchSubcat: (cat, sub) => /\bfiltr/i.test(cat) && /\bhidraulic/i.test(sub),
  },
  {
    // Filtru polen / cabină / habitaclu
    normTest: (c) => /^FILTRU_(?:POLEN|CABINA|HABITACLU)/.test(c),
    excludeDesc: /\b(ulei|combustibil|motorina|hidraulic|uscator|perna|aerisitor)\b/i,
    matchDesc:
      /\b(?:filtr[uueia]*\s+(?:de\s+)?(?:polen|cabina|habitaclu|aer\s+cabina|aer\s+habitaclu)|cabin\s+(?:air\s+)?filter)\b/i,
    matchSubcat: (cat, sub) =>
      /\bfiltr/i.test(cat) && /\b(?:polen|cabina|habitaclu)\b/i.test(sub),
  },
  {
    // Filtru uscător aer (sistem pneumatic frânare)
    normTest: (c) => /^FILTRU_USCATOR/.test(c),
    excludeDesc: /\b(ulei|combustibil|hidraulic|polen|cabina)\b/i,
    matchDesc:
      /\b(?:filtr[uueia]*\s+uscator|air\s+dryer\s+(?:filter|cartridge)|cartus\s+uscator)\b/i,
    matchSubcat: (cat, sub) => /\bfiltr/i.test(cat) && /\buscator\b/i.test(sub),
  },
  {
    // Filtru separator apă / combustibil
    normTest: (c) => /^FILTRU_SEPARATOR/.test(c),
    excludeDesc: /\b(ulei|aer|polen|cabina|hidraulic)\b/i,
    matchDesc: /\b(?:filtr[uueia]*\s+separator|water\s+separator)\b/i,
    matchSubcat: (cat, sub) => /\bfiltr/i.test(cat) && /\bseparator\b/i.test(sub),
  },
  {
    // Filtru servodirecție
    normTest: (c) => /^FILTRU_SERVO/.test(c),
    excludeDesc: /\b(aer|combustibil|motorina|polen|cabina)\b/i,
    matchDesc: /\bfiltr[uueia]*\s+(?:de\s+)?servo/i,
    matchSubcat: (cat, sub) => /\bfiltr/i.test(cat) && /\bservo/i.test(sub),
  },
];

function stripDiacritics(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Verifică dacă o linie de piesă (descriere/categorie/subcategorie) corespunde unui cod de normă de tip consumabil/filtru.
 */
export function matchesConsumableNorm(
  normCode: string,
  descriere?: string | null,
  categorie?: string | null,
  subcategorie?: string | null,
): boolean {
  const code = String(normCode || '').trim().toUpperCase();
  if (!isConsumablePieceNorm(code)) return false;

  const desc = stripDiacritics(descriere || '').trim();
  const cat = stripDiacritics(categorie || '').trim();
  const sub = stripDiacritics(subcategorie || '').trim();

  const matcher = CONSUMABLE_NORM_MATCHERS.find((m) => m.normTest(code));
  if (matcher) {
    if (desc && matcher.excludeDesc.test(desc)) return false;
    if (desc && matcher.matchDesc.test(desc)) return true;
    if (matcher.matchSubcat && matcher.matchSubcat(cat, sub)) {
      // Dacă descrierea nu conține cuvinte excluse și are măcar referință de filtru/piesă validă (nu aerisitor/etc.)
      return !desc || !/\b(ulei\s+motor|antigel|adblue|vaselina)\b/i.test(desc);
    }
    return false;
  }

  // Fallback generic pentru norme custom de consumabile (ex: FILTRU_TRANSMISIE, CUREA_ALTERNATOR):
  // Toate cuvintele semnificative din cod trebuie să apară în descriere + categorie + subcategorie.
  const tokens = code
    .toLowerCase()
    .split('_')
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return false;
  const combined = `${desc} ${sub} ${cat}`.toLowerCase();
  return tokens.every((tk) => combined.includes(tk));
}

/**
 * Detectează dacă un element dintr-o Comandă de Lucru corespunde unei norme de tip consumabil/filtru
 * ACTIVĂ pe vehiculul respectiv (strict activă în ConfigurareUleiVehicul sau ConfigurareUleiCategorie).
 */
export function detectTrackedConsumableTip(
  el: {
    descriere?: string | null;
    categorie?: string | null;
    subcategorie?: string | null;
    tipLichid?: string | null;
    articolStoc?: {
      categorie?: string | null;
      subcategorie?: string | null;
      tipLichid?: string | null;
      denumire?: string | null;
    } | null;
  },
  activeConsumableNormCodes: Set<string>,
  mappedSubcatTip?: string | null,
): string | null {
  if (!activeConsumableNormCodes || activeConsumableNormCodes.size === 0) {
    return null;
  }

  const desc = el.descriere || el.articolStoc?.denumire || '';
  const cat = el.categorie || el.articolStoc?.categorie || '';
  const sub = el.subcategorie || el.articolStoc?.subcategorie || '';

  // 1. Asociere directă pe element sau pe ArticolStoc — prioritate maximă
  const directExplicit = String(el.tipLichid || el.articolStoc?.tipLichid || '').trim().toUpperCase();
  if (directExplicit && isConsumablePieceNorm(directExplicit) && activeConsumableNormCodes.has(directExplicit)) {
    return directExplicit;
  }

  // 2. Asociere pe SubcategorieStoc — validată împotriva articolelor încadrate greșit (ex: aerisitor în "filtre aer")
  const subExplicit = String(mappedSubcatTip || '').trim().toUpperCase();
  if (subExplicit && isConsumablePieceNorm(subExplicit) && activeConsumableNormCodes.has(subExplicit)) {
    const matcher = CONSUMABLE_NORM_MATCHERS.find((m) => m.normTest(subExplicit));
    const cleanDesc = stripDiacritics(desc);
    if (!matcher || !cleanDesc || !matcher.excludeDesc.test(cleanDesc)) {
      return subExplicit;
    }
  }

  // 3. Detecție inteligentă din descriere / categorie / subcategorie DOAR pentru normele active ale vehiculului
  for (const normCode of activeConsumableNormCodes) {
    if (matchesConsumableNorm(normCode, desc, cat, sub)) {
      return normCode;
    }
  }

  return null;
}

/**
 * Verifică strict dacă un articol sau element de deviz reprezintă un fluid/lubrifiant real
 * (exclude piese conexe precum filtre de ulei, senzori nivel ulei, pompe, furtunuri, taxe mediu, vopsele sau becuri).
 */
export function isActualFluidItem(
  descriere?: string | null,
  categorie?: string | null,
  subcategorie?: string | null,
  explicitTipLichid?: string | null,
): boolean {
  const desc = String(descriere || '').trim();
  const cat = String(categorie || '').trim();
  const sub = String(subcategorie || '').trim();

  // Normele de tip filtru/consumabil la bucată nu sunt fluide lichide (nu intră în totalul de litri)
  if (explicitTipLichid && isConsumablePieceNorm(explicitTipLichid)) {
    return false;
  }

  if (desc && NON_FLUID_PATTERN.test(desc)) {
    return false;
  }

  if (explicitTipLichid && String(explicitTipLichid).trim() !== '') {
    return true;
  }

  // Lichidul de spălare parbriz fără normă explicită nu trebuie să reseteze intervalul de ulei motor
  if (/\bparbriz\b/i.test(`${desc} ${cat} ${sub}`)) {
    return false;
  }

  if (FLUID_CATEGORY_PATTERN.test(cat) || FLUID_CATEGORY_PATTERN.test(sub)) {
    return true;
  }

  return POSITIVE_FLUID_PATTERN.test(desc);
}

/**
 * Deduce tipul standardizat de lichid din asocierea explicită sau, în lipsă, din descriere / categorie / subcategorie.
 */
export function detectTipLichidFromText(
  descriere?: string | null,
  categorie?: string | null,
  subcategorie?: string | null,
  fallback = 'ULEI_MOTOR_15W40',
  explicitTipLichid?: string | null,
): string {
  const explicit = String(explicitTipLichid || '').trim();
  if (explicit) return explicit;

  const txt = `${subcategorie || ''} ${descriere || ''} ${categorie || ''}`.toLowerCase();

  if (/adblue|uree/i.test(txt)) return 'ADBLUE';
  if (/antigel|coolant|racire|g12|g11|g13/i.test(txt)) {
    if (/g11|albastru|blue/i.test(txt)) return 'ANTIGEL_G11';
    return 'ANTIGEL_G12';
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
  if (/motor|15w[- ]?40|10w[- ]?40|castrol|delvac|urania|rimula/i.test(txt)) {
    return 'ULEI_MOTOR_15W40';
  }
  return fallback;
}

/**
 * Extrage volumul per unitate din denumire (ex: "20L" -> 20, "5L" -> 5, "208/1" -> 208)
 * dacă unitatea de măsură este la bucată ("buc"). Pentru "L"/"kg" returnează 1.
 */
export function extractPackagingVolumePerUnit(
  descriere?: string | null,
  unitateMasura?: string | null,
): number {
  const um = String(unitateMasura || '').trim().toLowerCase();
  if (um === 'l' || um === 'litri' || um === 'litru' || um === 'kg') {
    return 1;
  }

  const desc = String(descriere || '');
  const litriMatch = desc.match(/(?:^|[\s\-\/(\[])(\d+(?:[.,]\d+)?)\s*(?:l|litri|kg)(?:\b|\/|$)/i);
  if (litriMatch) {
    const val = parseFloat(litriMatch[1].replace(',', '.'));
    if (val > 0 && val <= 2000) return val;
  }

  const drumMatch = desc.match(/\b(208|205|200|1000|60|25|20|18|10|5)\/1\b/);
  if (drumMatch) {
    const val = parseFloat(drumMatch[1]);
    if (val > 0) return val;
  }

  return 1;
}

export function computeElementFluidLiters(
  el: {
    descriere?: string | null;
    cantitate?: number | null;
    pretUnitar?: number | null;
    costTotal?: number | null;
    observatiiIntern?: string | null;
    articolStoc?: { unitateMasura?: string | null } | null;
  },
  efacturaUnitPrice?: number | null,
): number {
  const obsIntern = String(el.observatiiIntern || '');
  const explicitMatch = obsIntern.match(/\[VOL:(\d+(?:[.,]\d+)?)L\]/i);
  if (explicitMatch) {
    const val = parseFloat(explicitMatch[1].replace(',', '.'));
    if (val > 0) return Number(val.toFixed(2));
  }

  const cant = Math.max(0, Number(el.cantitate || 0));
  if (cant <= 0) return 0;

  const um = el.articolStoc?.unitateMasura || null;
  const packPerUnit = extractPackagingVolumePerUnit(el.descriere, um);
  if (packPerUnit <= 1) return Number(cant.toFixed(2));

  const cost = Number(el.costTotal || cant * Number(el.pretUnitar || 0));
  const unitP = Number(el.pretUnitar || 0);
  if (
    efacturaUnitPrice &&
    efacturaUnitPrice > 0 &&
    unitP > 0 &&
    unitP < efacturaUnitPrice * 0.85
  ) {
    const ratio = cost / (efacturaUnitPrice * cant);
    if (ratio > 0 && ratio < 1.2) {
      return Number(Math.max(0.25, cant * packPerUnit * ratio).toFixed(2));
    }
  }

  return Number((cant * packPerUnit).toFixed(2));
}

async function recalculateVehicleNormBaselineFromHistory(
  prisma: any,
  vehiculId: string,
  tipLichid: string,
) {
  const latestSchimb = await prisma.completareLichid.findFirst({
    where: {
      vehiculId,
      tipLichid,
      tipOperatiune: { contains: 'SCHIMB' },
    },
    orderBy: [{ dataCompletare: 'desc' }, { valoareContor: 'desc' }],
  });

  if (latestSchimb) {
    await prisma.configurareUleiVehicul.updateMany({
      where: { vehiculId, tipLichid },
      data: {
        ultimulSchimbContor: latestSchimb.valoareContor,
        ultimulSchimbData: latestSchimb.dataCompletare,
        ultimulSchimbEstimat: false,
      },
    });
  }
}

export async function removeFluidCompletariForComanda(prisma: any, comandaId: string) {
  const existingSchimburi = await prisma.completareLichid.findMany({
    where: {
      comandaLucruId: comandaId,
      tipOperatiune: { contains: 'SCHIMB' },
    },
    select: { vehiculId: true, tipLichid: true },
  });

  await prisma.completareLichid.deleteMany({
    where: { comandaLucruId: comandaId },
  });

  const affectedKeys = new Set<string>();
  for (const row of existingSchimburi) {
    const key = `${row.vehiculId}::${row.tipLichid}`;
    if (affectedKeys.has(key)) continue;
    affectedKeys.add(key);
    await recalculateVehicleNormBaselineFromHistory(prisma, row.vehiculId, row.tipLichid);
  }
}

export async function syncFluidCompletariForComanda(
  prisma: any,
  comandaId: string,
  overrides?: { tipOperatiuneFluid?: string; cantitateLitriReala?: number },
) {
  const comanda = await prisma.comandaLucru.findUnique({
    where: { id: comandaId },
    include: {
      vehicul: true,
      elementeComanda: { include: { articolStoc: true } },
    },
  });

  if (!comanda) return { synced: 0 };

  const previousSchimburi = await prisma.completareLichid.findMany({
    where: {
      comandaLucruId: comandaId,
      tipOperatiune: { contains: 'SCHIMB' },
    },
    select: { vehiculId: true, tipLichid: true },
  });

  await prisma.completareLichid.deleteMany({
    where: { comandaLucruId: comandaId },
  });

  if (comanda.stare !== 'FINALIZAT') {
    const affectedKeys = new Set<string>();
    for (const row of previousSchimburi) {
      const key = `${row.vehiculId}::${row.tipLichid}`;
      if (affectedKeys.has(key)) continue;
      affectedKeys.add(key);
      await recalculateVehicleNormBaselineFromHistory(prisma, row.vehiculId, row.tipLichid);
    }
    return { synced: 0 };
  }

  const [subcatsWithTip, vehNorms, catNorms] = await Promise.all([
    prisma.subcategorieStoc.findMany({
      where: { tipLichid: { not: null } },
      include: { categorieStoc: { select: { nume: true } } },
    }),
    prisma.configurareUleiVehicul.findMany({ where: { vehiculId: comanda.vehiculId } }),
    comanda.vehicul?.categorieEnum
      ? prisma.configurareUleiCategorie.findMany({ where: { categorieEnum: comanda.vehicul.categorieEnum } })
      : Promise.resolve([]),
  ]);

  // Setul normelor active de tip consumabil/filtru (la bucată) pentru acest vehicul / categorie
  const activeConsumableNormCodes = new Set<string>();
  for (const n of [...vehNorms, ...catNorms]) {
    const cod = String(n?.tipLichid || '').trim().toUpperCase();
    if (cod && isConsumablePieceNorm(cod)) {
      activeConsumableNormCodes.add(cod);
    }
  }

  const findMappedSubcatTip = (el: any): string | null => {
    const subName = String(el.subcategorie || el.articolStoc?.subcategorie || '').trim().toLowerCase();
    if (!subName) return null;
    const catName = String(el.categorie || el.articolStoc?.categorie || '').trim().toLowerCase();
    const exact = subcatsWithTip.find(
      (sc: any) =>
        String(sc.nume || '').trim().toLowerCase() === subName &&
        (!catName || String(sc.categorieStoc?.nume || '').trim().toLowerCase() === catName),
    );
    if (exact?.tipLichid) return exact.tipLichid;
    const subOnly = subcatsWithTip.find((sc: any) => String(sc.nume || '').trim().toLowerCase() === subName);
    return subOnly?.tipLichid || null;
  };

  interface TrackedOrderElement {
    el: any;
    kind: 'FLUID' | 'CONSUMABLE';
    detectedTip: string;
  }

  const defaultMotor =
    String(comanda.vehicul?.categorieEnum || '').toUpperCase() === 'AUTOTURISM'
      ? 'ULEI_MOTOR_TURISME'
      : 'ULEI_MOTOR_15W40';

  const trackedElements: TrackedOrderElement[] = [];
  for (const el of comanda.elementeComanda || []) {
    if (
      el.pilonCost === 'MANOPERA_INTERNA' ||
      el.pilonCost === 'PRESTATIE_EXTERNA' ||
      Number(el.costTotal || 0) < 0 ||
      Number(el.cantitate || 0) <= 0
    ) {
      continue;
    }

    const mappedSubcatTip = findMappedSubcatTip(el);
    const explicitTip = el.tipLichid || el.articolStoc?.tipLichid || mappedSubcatTip;

    // 1. Verificăm întâi dacă elementul corespunde unei norme de consumabil/filtru ACTIVĂ pe acest vehicul
    const matchedConsumableTip = detectTrackedConsumableTip(
      el,
      activeConsumableNormCodes,
      mappedSubcatTip,
    );
    if (matchedConsumableTip) {
      trackedElements.push({ el, kind: 'CONSUMABLE', detectedTip: matchedConsumableTip });
      continue;
    }

    // 2. Verificăm dacă este fluid/lubrifiant real (ulei, antigel, AdBlue, hidraulic etc.)
    if (
      isActualFluidItem(
        el.descriere,
        el.categorie || el.articolStoc?.categorie,
        el.subcategorie || el.articolStoc?.subcategorie,
        explicitTip,
      )
    ) {
      const tipLichid = detectTipLichidFromText(
        el.descriere,
        el.categorie || el.articolStoc?.categorie,
        el.subcategorie || el.articolStoc?.subcategorie,
        defaultMotor,
        explicitTip,
      );
      trackedElements.push({ el, kind: 'FLUID', detectedTip: tipLichid });
    }
  }

  if (trackedElements.length === 0) {
    const affectedKeys = new Set<string>();
    for (const row of previousSchimburi) {
      const key = `${row.vehiculId}::${row.tipLichid}`;
      if (affectedKeys.has(key)) continue;
      affectedKeys.add(key);
      await recalculateVehicleNormBaselineFromHistory(prisma, row.vehiculId, row.tipLichid);
    }
    return { synced: 0 };
  }

  const efactItems = await prisma.eFacturaItem.findMany({
    where: { comandaLucruId: comandaId },
    select: { descrierePiesa: true, pretUnitar: true },
  });

  const opDate = comanda.dataFinalizare || comanda.dataDeschidere || new Date();
  const isMth = isMthTipMasurare(comanda.vehicul?.tipMasurare);
  const fluidOnlyCount = trackedElements.filter((t) => t.kind === 'FLUID').length;
  const touchedSchimbTips = new Set<string>();

  let synced = 0;
  for (const { el, kind, detectedTip: tipLichid } of trackedElements) {
    const matchingVehNorm = vehNorms.find((n: any) => n.tipLichid === tipLichid);
    const matchingCatNorm = catNorms.find((n: any) => n.tipLichid === tipLichid);
    const ruleCfg = matchingVehNorm || matchingCatNorm || {};
    const counterMeta = resolveFluidRuleCounterConfig(comanda.vehicul, ruleCfg);
    const useMthCounter = counterMeta.trackingMode === 'MTH';

    // Pentru reguli mTH pe vehicule cu contor principal KM (ex: CAP_TRACTOR dual-mTH), folosim oreFunctionareCurent
    // astfel încât kilometrajul (ex: 615.920 KM) să nu corupă contorul de ore (ex: 1.716 mTH).
    const effectiveContor =
      useMthCounter && !isMth
        ? getEffectiveMthCounter(comanda.vehicul)
        : Number(comanda.valoareContorLaExecutie || 0) > 0
        ? Number(comanda.valoareContorLaExecutie)
        : Number(comanda.vehicul?.valoareContorCurent || 0);
    const unitateContor = useMthCounter ? 'MTH' : isMth ? 'MTH' : 'KM';

    let tipOperatiune: string;
    let quantityValue: number;

    if (kind === 'CONSUMABLE') {
      // Filtrele / consumabilele la bucată reprezintă întotdeauna o înlocuire completă (resetare normă)
      tipOperatiune = 'SCHIMB_FILTRU';
      quantityValue = Math.max(0.01, Number(Number(el.cantitate || 1).toFixed(2)));
    } else {
      const textCombined = `${el.descriere || ''} ${el.observatiiIntern || ''}`.toLowerCase();
      const explicitOp = overrides?.tipOperatiuneFluid;
      const isTopUp = explicitOp
        ? explicitOp.toUpperCase().includes('COMPLETARE')
        : /completare|top[- ]?up/i.test(textCombined) && !/schimb|revizie/i.test(textCombined);

      tipOperatiune = tipLichid.startsWith('ANTIGEL')
        ? isTopUp
          ? 'COMPLETARE_ANTIGEL'
          : 'SCHIMB_ANTIGEL'
        : isTopUp
        ? 'COMPLETARE_ULEI'
        : 'SCHIMB_ULEI';

      const matchedEf = efactItems.find(
        (it: any) =>
          el.descriere &&
          it.descrierePiesa &&
          el.descriere.toLowerCase().includes(it.descrierePiesa.toLowerCase()),
      );

      quantityValue =
        overrides?.cantitateLitriReala && overrides.cantitateLitriReala > 0 && fluidOnlyCount === 1
          ? Number(overrides.cantitateLitriReala)
          : computeElementFluidLiters(el, matchedEf?.pretUnitar);
    }

    const costTotal = Number(el.costTotal || Number(el.cantitate || 1) * Number(el.pretUnitar || 0));
    const pretUnitarFinal =
      quantityValue > 0 ? Number((costTotal / quantityValue).toFixed(2)) : Number(el.pretUnitar || 0);

    await prisma.completareLichid.create({
      data: {
        vehiculId: comanda.vehiculId,
        articolStocId: el.articolStocId || null,
        tipLichid,
        tipOperatiune,
        marcaUlei: el.articolStoc?.marcaUlei || el.descriere,
        cantitateLitri: quantityValue,
        pretPerLitru: pretUnitarFinal,
        costTotal,
        valoareContor: effectiveContor,
        unitateContor,
        dataCompletare: opDate,
        mecanic: comanda.mecanicResponsabil || 'Atelier Intern',
        observatii: `Sincronizat automat din Comandă de Lucru ${comanda.numarComanda}`,
        stareAlerta: 'REZOLVATA',
        comandaLucruId: comanda.id,
        elementComandaId: el.id,
      },
    });

    if (tipOperatiune.includes('SCHIMB')) {
      touchedSchimbTips.add(tipLichid);
      const latestReal = await prisma.completareLichid.findFirst({
        where: {
          vehiculId: comanda.vehiculId,
          tipLichid,
          tipOperatiune: { contains: 'SCHIMB' },
        },
        orderBy: [{ dataCompletare: 'desc' }, { valoareContor: 'desc' }],
      });
      const resetContor = latestReal ? latestReal.valoareContor : effectiveContor;
      const resetDate = latestReal ? latestReal.dataCompletare : opDate;

      await prisma.configurareUleiVehicul.upsert({
        where: { vehiculId_tipLichid: { vehiculId: comanda.vehiculId, tipLichid } },
        update: {
          ultimulSchimbContor: resetContor,
          ultimulSchimbData: resetDate,
          ultimulSchimbEstimat: false,
        },
        create: {
          vehiculId: comanda.vehiculId,
          tipLichid,
          ultimulSchimbContor: resetContor,
          ultimulSchimbData: resetDate,
          ultimulSchimbEstimat: false,
          intervalMth: matchingCatNorm?.intervalMth ?? (useMthCounter ? 500 : null),
          intervalKm: matchingCatNorm?.intervalKm ?? (!useMthCounter ? 15000 : null),
          intervalLuni: matchingCatNorm?.intervalLuni ?? null,
          pragAvertizareMth: matchingCatNorm?.pragAvertizareMth ?? (useMthCounter ? 50 : null),
          pragAvertizareKm: matchingCatNorm?.pragAvertizareKm ?? (!useMthCounter ? 1000 : null),
          pragAvertizareLuni: matchingCatNorm?.pragAvertizareLuni ?? null,
        },
      });
    }

    synced++;
  }

  // Dacă un tip care fusese anterior sincronizat pe această comandă a fost eliminat la re-editare, recalculăm baza
  for (const prev of previousSchimburi) {
    if (!touchedSchimbTips.has(prev.tipLichid)) {
      await recalculateVehicleNormBaselineFromHistory(prisma, prev.vehiculId, prev.tipLichid);
    }
  }

  return { synced };
}

export function mapFluidCategoryReport(
  descriere: string,
  tipLichid?: string | null,
): { key: string; label: string } {
  const d = (descriere || '').toLowerCase();
  const t = (tipLichid || '').toUpperCase();
  if (t.includes('HIDRAULIC') || d.includes('hidraulic') || d.includes('hlp') || d.includes('hvlp')) {
    return { key: 'HIDRAULIC', label: 'Ulei Hidraulic' };
  }
  if (t.includes('TRANSMISIE') || t.includes('CUTIE') || t.includes('PUNTE') || t.includes('AXE') || t.includes('GRUPURI') || t.includes('ROTIRE') || t.includes('DIFERENTIAL') || t.includes('UNGERE') || d.includes('transmis') || d.includes('diferen') || d.includes('gear') || d.includes('80w90') || d.includes('75w90') || d.includes('atf') || d.includes('ls90')) {
    return { key: 'TRANSMISIE', label: 'Ulei Transmisie / Cutie / Punte / Grupuri' };
  }
  if (t.includes('ANTIGEL') || d.includes('antigel') || d.includes('g12') || d.includes('g11') || d.includes('racire') || d.includes('coolant')) {
    return { key: 'ANTIGEL', label: 'Antigel & Lichid Răcire' };
  }
  if (t.includes('VASELINA') || d.includes('vaselin') || d.includes('unsoare') || d.includes('fett')) {
    return { key: 'VASELINA', label: 'Vaselină & Unsori' };
  }
  if (t.includes('ADBLUE') || d.includes('adblue') || d.includes('uree')) {
    return { key: 'ADBLUE', label: 'AdBlue (SCR)' };
  }
  if (
    t.includes('MOTOR') ||
    /motor|10w[- ]?40|15w[- ]?40|5w[- ]?30|5w[- ]?40|0w[- ]?30|0w[- ]?20|delvac|castrol|urania|rimula/i.test(d)
  ) {
    return { key: 'MOTOR', label: 'Ulei Motor (10W-40 / 15W-40 / 5W-30 / 5W-40)' };
  }
  return { key: 'ALTE', label: 'Alte Fluide' };
}
