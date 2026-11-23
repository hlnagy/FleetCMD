// ==========================================
// UTILITARE CENTRALIZATE ANVELOPE (SINGLE SOURCE OF TRUTH)
// ==========================================

export interface TireItemInput {
  categorie?: string | null;
  subcategorie?: string | null;
  denumire?: string | null;
  codArticol?: string | null;
}

/** Normalizează textul pentru potrivire insensibilă la majuscule și diacritice. */
export function normalizeTireText(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Excluderi explicite: accesorii de roată, servicii, taxe ecologice,
 * piese din cauciuc (furtunuri, bucșe, garnituri, covorașe) și consumabile non-anvelopă.
 */
const NON_TIRE_EXCLUSION_REGEX =
  /\b(?:valv[a-z]*|jant[a-z]*|senzor[a-z]*|tpms|echilibr[a-z]*|monta[jt][a-z]*|demonta[jt][a-z]*|vulcaniz[a-z]*|manoper[a-z]*|eco\s*-?\s*val(?:oare|or|ue)?|eco\s*-?\s*tax[a-z]*|ecotax[a-z]*|taxa\s*(?:eco|mediu|anvelop[a-z]*)|camer[ae]|lant(?:uri)?|capac[e]?|prezon[a-z]*|servici[iu][a-z]*|curierat|transport\s+anvelop[a-z]*|plumb|petic[e]?|geometrie|reglaj|azot|umflare|reparati[ei]|vopsea|kober|diluant|grund|amorsa|chit|adeziv|silicon|spray|ulei|lubrifiant|antigel|adblue|vaselina|unsoare|surub[a-z]*|piulit[a-z]*|saib[a-z]*|tabla|teav[a-z]*|electrod[a-z]*|bec(?:uri)?|proiector[a-z]*|filtr[uae][a-z]*|releu|furtun[a-z]*|bucs[ae]|tampon[a-z]*|covoras[a-z]*|pres\s+cauciuc|presuri|garnitur[ae]|simering[a-z]*|o-?ring[a-z]*|burduf[a-z]*|manus[ai]|cizm[ae]|cure[al][a-z]*|cheder[a-z]*|stergator[a-z]*|rulment[a-z]*|placute|disc\s+frana|amortizor[a-z]*|pomp[ae]|alternator|electromotor|bateri[ei]|acumulator[a-z]*)\b|t\*vop/i;

/** Dimensiune completă de anvelopă (ex: 315/80R22.5, 205/65R16, 315/80R22, 13R22.5, 29.5 R25, 195/75R16C). */
const EXPLICIT_TIRE_DIMENSION_REGEX =
  /\b(?:\d{2,3}\s*\/\s*\d{2,3}|\d{1,2}(?:\.\d{1,2})?)\s*R\s*(?:1[3-9]|2[0-5])(?:\.\d+)?C?\b/i;

/** Diametru jantă uzual pentru anvelope (R13 .. R25, inclusiv .5 și C). */
const RIM_SIZE_REGEX = /\bR(?:1[3-9]|2[0-5])(?:\.5)?C?\b/i;

const TIRE_KEYWORD_REGEX = /\b(?:anvelop[a-z]*|cauciuc[a-z]*|pneu[a-z]*)\b/i;

export function hasExplicitTireDimension(desc?: string | null): boolean {
  return EXPLICIT_TIRE_DIMENSION_REGEX.test(normalizeTireText(desc));
}

/**
 * Determină unitar în tot sistemul dacă un articol/linie reprezintă o anvelopă fizică
 * (care aparține exclusiv de tabela `Anvelopa` / Magazie Anvelope),
 * excluzând accesorii, servicii, taxe ecologice și piese din cauciuc.
 */
export function isTireItem(input: TireItemInput): boolean {
  if (!input) return false;

  const den = normalizeTireText(input.denumire);
  const cat = normalizeTireText(input.categorie);
  const sub = normalizeTireText(input.subcategorie);
  const code = String(input.codArticol || '').trim().toUpperCase();

  if (!den && !cat && !sub && !code) return false;

  // Excluderi explicite de cod ECO sau denumire/subcategorie non-anvelopă
  if (code === 'ECO' && /\beco\b/i.test(den)) return false;
  if (den && NON_TIRE_EXCLUSION_REGEX.test(den)) return false;
  if (sub && NON_TIRE_EXCLUSION_REGEX.test(sub)) return false;

  // Potrivire pozitivă pe categorie / subcategorie
  if (cat && /\b(?:anvelop[a-z]*|cauciuc[a-z]*|pneu[a-z]*)\b/i.test(cat)) {
    return true;
  }
  if (
    sub &&
    (TIRE_KEYWORD_REGEX.test(sub) ||
      EXPLICIT_TIRE_DIMENSION_REGEX.test(sub) ||
      RIM_SIZE_REGEX.test(sub))
  ) {
    return true;
  }

  // Potrivire pozitivă pe denumire
  if (
    den &&
    (TIRE_KEYWORD_REGEX.test(den) ||
      EXPLICIT_TIRE_DIMENSION_REGEX.test(den) ||
      RIM_SIZE_REGEX.test(den))
  ) {
    return true;
  }

  // Cod furnizor specific anvelopelor (ex: ANV18154)
  if (code.startsWith('ANV')) {
    return true;
  }

  return false;
}

export function parseTireDimensiune(desc?: string | null, fallback = '315/80R22.5'): string {
  const raw = String(desc || '');
  const match = raw.match(/\b\d{2,3}(?:\s*\/\s*\d{2,3})?\s*R\s*\d{2}(?:\.\d+)?C?\b/i);
  if (match) return match[0].toUpperCase().replace(/\s+/g, '');
  const diagMatch = raw.match(/\b\d{1,2}(?:\.\d{1,2})?\s*R\s*(?:1[3-9]|2[0-5])(?:\.\d+)?C?\b/i);
  if (diagMatch) return diagMatch[0].toUpperCase().replace(/\s+/g, '');
  return fallback;
}

const TIRE_BRAND_ALIASES: Array<[string, string]> = [
  ['MICHELIN', 'MICHELIN'],
  ['BRIDGESTONE', 'BRIDGESTONE'],
  ['CONTINENTAL', 'CONTINENTAL'],
  ['GOODYEAR', 'GOODYEAR'],
  ['PIRELLI', 'PIRELLI'],
  ['BENCHMARK', 'BENCHMARK'],
  ['INFINITY', 'INFINITY'],
  ['TBBTIRES', 'TBBTIRES'],
  ['TBB', 'TBBTIRES'],
  ['HANKOOK', 'HANKOOK'],
  ['SAVA', 'SAVA'],
  ['KORMORAN', 'KORMORAN'],
  ['BARUM', 'BARUM'],
  ['MATADOR', 'MATADOR'],
  ['TRIANGLE', 'TRIANGLE'],
  ['WESTLAKE', 'WESTLAKE'],
  ['SAILUN', 'SAILUN'],
  ['LINGLONG', 'LINGLONG'],
  ['AEOLUS', 'AEOLUS'],
  ['DOUBLE COIN', 'DOUBLE COIN'],
  ['CORDIANT', 'CORDIANT'],
  ['OTANI', 'OTANI'],
  ['KAMA', 'KAMA'],
  ['FULDA', 'FULDA'],
  ['FIRESTONE', 'FIRESTONE'],
  ['DUNLOP', 'DUNLOP'],
  ['NOKIAN', 'NOKIAN'],
  ['FALKEN', 'FALKEN'],
  ['SEMPERIT', 'SEMPERIT'],
  ['KLEBER', 'KLEBER'],
  ['DEBICA', 'DEBICA'],
  ['TAURUS', 'TAURUS'],
  ['ORIUM', 'ORIUM'],
  ['RIKEN', 'RIKEN'],
  ['TIGAR', 'TIGAR'],
  ['UNIROYAL', 'UNIROYAL'],
  ['TOYO', 'TOYO'],
  ['YOKOHAMA', 'YOKOHAMA'],
  ['KUMHO', 'KUMHO'],
  ['NEXEN', 'NEXEN'],
  ['GT RADIAL', 'GT RADIAL'],
  ['PETLAS', 'PETLAS'],
  ['LASSA', 'LASSA'],
  ['GISLAVED', 'GISLAVED'],
  ['VREDESTEIN', 'VREDESTEIN'],
  ['BFGOODRICH', 'BFGOODRICH'],
  ['KENDA', 'KENDA'],
  ['MAXXIS', 'MAXXIS'],
  ['GITI', 'GITI'],
  ['DAYTON', 'DAYTON'],
  ['LAUFENN', 'LAUFENN'],
  ['COOPER', 'COOPER'],
  ['APOLLO', 'APOLLO'],
  ['OVATION', 'OVATION'],
  ['SUNFULL', 'SUNFULL'],
  ['HIFLY', 'HIFLY'],
  ['WINDPOWER', 'WINDPOWER'],
  ['LONGMARCH', 'LONGMARCH'],
  ['ADVANCE', 'ADVANCE'],
  ['BKT', 'BKT'],
  ['ALLIANCE', 'ALLIANCE'],
  ['MITAS', 'MITAS'],
  ['TRELLEBORG', 'TRELLEBORG'],
];

export function parseTireMarca(desc?: string | null, fallback = 'Marcă Nespecificată'): string {
  const upper = String(desc || '').toUpperCase();
  if (!upper.trim()) return fallback;
  for (const [needle, label] of TIRE_BRAND_ALIASES) {
    if (needle.length <= 3) {
      if (new RegExp(`\\b${needle}\\b`, 'i').test(upper)) return label;
    } else if (upper.includes(needle)) {
      return label;
    }
  }
  return fallback;
}

export function parseTireModel(desc?: string | null, fallback = 'Standard'): string {
  const clean = String(desc || '')
    .replace(/\b\d{2,3}\s*\/\s*\d{2,3}\s*R\s*\d{2}(?:\.\d+)?C?\b/gi, '')
    .replace(/\b\d{1,2}(?:\.\d{1,2})?\s*R\s*(?:1[3-9]|2[0-5])(?:\.\d+)?C?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > 45 ? clean.substring(0, 45) : clean || fallback;
}
