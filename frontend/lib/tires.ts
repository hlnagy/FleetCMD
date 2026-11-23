/**
 * Shared tire detection utilities for FleetCMD frontend.
 * Mirrors `backend/src/common/tire.utils.ts` so frontend and backend classify
 * physical tires vs. accessories/services/consumables identically.
 */

export interface TireItemInput {
  categorie?: string | null;
  subcategorie?: string | null;
  denumire?: string | null;
  descrierePiesa?: string | null;
  codArticol?: string | null;
  codArticolFurnizor?: string | null;
}

/** Normalizes text for case- and diacritic-insensitive matching. */
export function normalizeTireText(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Explicit exclusions: wheel accessories, services, eco-fees,
 * rubber parts (hoses, bushings, seals, mats) and non-tire consumables.
 */
const NON_TIRE_EXCLUSION_REGEX =
  /\b(?:valv[a-z]*|jant[a-z]*|senzor[a-z]*|tpms|echilibr[a-z]*|monta[jt][a-z]*|demonta[jt][a-z]*|vulcaniz[a-z]*|manoper[a-z]*|eco\s*-?\s*val(?:oare|or|ue)?|eco\s*-?\s*tax[a-z]*|ecotax[a-z]*|taxa\s*(?:eco|mediu|anvelop[a-z]*)|camer[ae]|lant(?:uri)?|capac[e]?|prezon[a-z]*|servici[iu][a-z]*|curierat|transport\s+anvelop[a-z]*|plumb|petic[e]?|geometrie|reglaj|azot|umflare|reparati[ei]|vopsea|kober|diluant|grund|amorsa|chit|adeziv|silicon|spray|ulei|lubrifiant|antigel|adblue|vaselina|unsoare|surub[a-z]*|piulit[a-z]*|saib[a-z]*|tabla|teav[a-z]*|electrod[a-z]*|bec(?:uri)?|proiector[a-z]*|filtr[uae][a-z]*|releu|furtun[a-z]*|bucs[ae]|tampon[a-z]*|covoras[a-z]*|pres\s+cauciuc|presuri|garnitur[ae]|simering[a-z]*|o-?ring[a-z]*|burduf[a-z]*|manus[ai]|cizm[ae]|cure[al][a-z]*|cheder[a-z]*|stergator[a-z]*|rulment[a-z]*|placute|disc\s+frana|amortizor[a-z]*|pomp[ae]|alternator|electromotor|bateri[ei]|acumulator[a-z]*)\b|t\*vop/i;

/** Full tire dimension (e.g. 315/80R22.5, 205/65R16, 205/55R16, 385/65R22.5, 315/80R22, 13R22.5, 29.5 R25, 195/75R16C). */
const EXPLICIT_TIRE_DIMENSION_REGEX =
  /\b(?:\d{2,3}\s*\/\s*\d{2,3}|\d{1,2}(?:\.\d{1,2})?)\s*R\s*(?:1[3-9]|2[0-5])(?:\.\d+)?C?\b/i;

/** Common tire rim diameter (R13 .. R25, including .5 and C). */
const RIM_SIZE_REGEX = /\bR(?:1[3-9]|2[0-5])(?:\.5)?C?\b/i;

const TIRE_KEYWORD_REGEX = /\b(?:anvelop[a-z]*|cauciuc[a-z]*|pneu[a-z]*)\b/i;

export function hasExplicitTireDimension(desc?: string | null): boolean {
  return EXPLICIT_TIRE_DIMENSION_REGEX.test(normalizeTireText(desc));
}

export function isTireCategoryName(categoryName?: string | null): boolean {
  const cat = normalizeTireText(categoryName);
  if (!cat) return false;
  return TIRE_KEYWORD_REGEX.test(cat);
}

/**
 * Unified predicate determining whether an item/line represents a physical tire
 * belonging strictly in Magazie Anvelope (`Anvelopa`), excluding accessories,
 * services, eco-fees, and rubber parts.
 */
export function isTireItem(input?: TireItemInput | null): boolean {
  if (!input) return false;

  const den = normalizeTireText(input.denumire ?? input.descrierePiesa);
  const cat = normalizeTireText(input.categorie);
  const sub = normalizeTireText(input.subcategorie);
  const code = String(input.codArticol ?? input.codArticolFurnizor ?? '')
    .trim()
    .toUpperCase();

  if (!den && !cat && !sub && !code) return false;

  // Explicit exclusions for ECO lines or non-tire accessories/services/consumables
  if (code === 'ECO' && /\beco\b/i.test(den)) return false;
  if (den && NON_TIRE_EXCLUSION_REGEX.test(den)) return false;
  if (sub && NON_TIRE_EXCLUSION_REGEX.test(sub)) return false;

  // Positive match on category / subcategory
  if (cat && TIRE_KEYWORD_REGEX.test(cat)) {
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

  // Positive match on description/name
  if (
    den &&
    (TIRE_KEYWORD_REGEX.test(den) ||
      EXPLICIT_TIRE_DIMENSION_REGEX.test(den) ||
      RIM_SIZE_REGEX.test(den))
  ) {
    return true;
  }

  // Supplier code convention for tires (e.g. ANV18154)
  if (code.startsWith('ANV')) {
    return true;
  }

  return false;
}
