// ==========================================
// UTILITARE CENTRALIZATE FLUIDE & LUBRIFIANȚI
// ==========================================

export const TIP_LICHID_LABELS: Record<string, string> = {
  ULEI_MOTOR: 'Ulei Motor',
  ULEI_HIDRAULIC: 'Ulei Hidraulic',
  ULEI_TRANSMISIE: 'Ulei Transmisie & Diferențial',
  ANTIGEL_G12: 'Antigel G12+ (Lichid Răcire Roz)',
  ANTIGEL_G11: 'Antigel G11 (Lichid Răcire Albastru)',
  ADBLUE: 'AdBlue (Soluție Uree 32.5%)',
  ULEI_LIEBHERR_PUNTE: 'Ulei Punte Liebherr',
  ULEI_LIEBHERR_CUTIE: 'Ulei Cutie Liebherr',
  ULEI_CUTIE_MANUALA: 'Ulei Cutie Manuală',
  ULEI_CUTIE_AUTOMATA: 'Ulei Cutie Automată',
};

export function isMthTipMasurare(tipMasurare?: string | null): boolean {
  const tm = String(tipMasurare || '').trim().toUpperCase();
  return tm === 'MTH' || tm === 'ORE' || tm === 'M_TH';
}

const NON_FLUID_PATTERN =
  /\b(filtru|filter|senzor|vas\s+expansiune|furtun|pompa|joja|buson|capac|garnitur|oring|o-ring|simering|bec|pozitie|cireasa|vopsea|kober|diluant|grund|spray|spuma|degresant|sapun|lavete|taxa\s+(?:mediu\s+)?ulei)\b/i;

const POSITIVE_FLUID_PATTERN =
  /\b(ulei|oil|antigel|coolant|adblue|uree|vaselina|unsoare|atf|hlp|hvlp|tellus|delvac|urania|castrol|rimula|gear\s*\d*|10w[- ]?40|15w[- ]?40|5w[- ]?30|5w[- ]?40|0w[- ]?30|0w[- ]?20|80w[- ]?90|75w[- ]?90|75w[- ]?80|85w[- ]?140|lichid\s+(?:frana|parbriz|racire|hidraulic))\b/i;

const FLUID_CATEGORY_PATTERN =
  /\b(lubrifian|ulei|fluid|antigel|adblue|racire|vaselin|lichid\s+spalare)\b/i;

/**
 * Verifică strict dacă un articol sau element de deviz reprezintă un fluid/lubrifiant real
 * (exclude piese conexe precum filtre de ulei, senzori nivel ulei, pompe, furtunuri, taxe mediu, vopsele sau becuri).
 */
export function isActualFluidItem(
  descriere?: string | null,
  categorie?: string | null,
  subcategorie?: string | null,
): boolean {
  const desc = String(descriere || '').trim();
  const cat = String(categorie || '').trim();
  const sub = String(subcategorie || '').trim();

  if (desc && NON_FLUID_PATTERN.test(desc)) {
    return false;
  }

  if (FLUID_CATEGORY_PATTERN.test(cat) || FLUID_CATEGORY_PATTERN.test(sub)) {
    return true;
  }

  return POSITIVE_FLUID_PATTERN.test(desc);
}

/**
 * Deduce tipul standardizat de lichid din descriere / categorie / subcategorie.
 */
export function detectTipLichidFromText(
  descriere?: string | null,
  categorie?: string | null,
  subcategorie?: string | null,
  fallback = 'ULEI_MOTOR',
): string {
  const txt = `${subcategorie || ''} ${descriere || ''} ${categorie || ''}`.toLowerCase();

  if (/adblue|uree/i.test(txt)) return 'ADBLUE';
  if (/antigel|coolant|racire|g12|g11|g13/i.test(txt)) {
    if (/g11|albastru|blue/i.test(txt)) return 'ANTIGEL_G11';
    return 'ANTIGEL_G12';
  }
  if (/hidraulic|hlp|hvlp|tellus|dte/i.test(txt)) return 'ULEI_HIDRAULIC';
  if (/liebherr.*punte|punte.*liebherr/i.test(txt)) return 'ULEI_LIEBHERR_PUNTE';
  if (/liebherr.*cutie|cutie.*liebherr/i.test(txt)) return 'ULEI_LIEBHERR_CUTIE';
  if (/cutie.*automat|atf|dexron/i.test(txt)) return 'ULEI_CUTIE_AUTOMATA';
  if (/cutie.*manual/i.test(txt)) return 'ULEI_CUTIE_MANUALA';
  if (/transmisie|diferential|gear|punte|cutie|80w[- ]?90|75w[- ]?90|75w[- ]?80|85w[- ]?140|ls90/i.test(txt)) {
    return 'ULEI_TRANSMISIE';
  }
  if (/motor|15w[- ]?40|10w[- ]?40|5w[- ]?30|5w[- ]?40|0w[- ]?30|0w[- ]?20|castrol|delvac|urania|rimula/i.test(txt)) {
    return 'ULEI_MOTOR';
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

export async function removeFluidCompletariForComanda(prisma: any, comandaId: string) {
  await prisma.completareLichid.deleteMany({
    where: { comandaLucruId: comandaId },
  });
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

  await prisma.completareLichid.deleteMany({
    where: { comandaLucruId: comandaId },
  });

  if (comanda.stare !== 'FINALIZAT') {
    return { synced: 0 };
  }

  const fluidElements = (comanda.elementeComanda || []).filter(
    (el: any) =>
      el.pilonCost !== 'MANOPERA_INTERNA' &&
      el.pilonCost !== 'PRESTATIE_EXTERNA' &&
      Number(el.costTotal || 0) >= 0 &&
      isActualFluidItem(
        el.descriere,
        el.categorie || el.articolStoc?.categorie,
        el.subcategorie || el.articolStoc?.subcategorie,
      ),
  );

  if (fluidElements.length === 0) {
    return { synced: 0 };
  }

  const efactItems = await prisma.eFacturaItem.findMany({
    where: { comandaLucruId: comandaId },
    select: { descrierePiesa: true, pretUnitar: true },
  });

  const effectiveContor =
    Number(comanda.valoareContorLaExecutie || 0) > 0
      ? Number(comanda.valoareContorLaExecutie)
      : Number(comanda.vehicul?.valoareContorCurent || 0);
  const opDate = comanda.dataFinalizare || comanda.dataDeschidere || new Date();
  const isMth = isMthTipMasurare(comanda.vehicul?.tipMasurare);

  let synced = 0;
  for (const el of fluidElements) {
    const tipLichid = detectTipLichidFromText(
      el.descriere,
      el.categorie || el.articolStoc?.categorie,
      el.subcategorie || el.articolStoc?.subcategorie,
    );

    const textCombined = `${el.descriere || ''} ${el.observatiiIntern || ''}`.toLowerCase();
    const explicitOp = overrides?.tipOperatiuneFluid;
    const isTopUp =
      explicitOp
        ? explicitOp.toUpperCase().includes('COMPLETARE')
        : /completare|top[- ]?up/i.test(textCombined) && !/schimb|revizie/i.test(textCombined);

    const tipOperatiune = tipLichid.startsWith('ANTIGEL')
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

    const liters =
      overrides?.cantitateLitriReala && overrides.cantitateLitriReala > 0 && fluidElements.length === 1
        ? Number(overrides.cantitateLitriReala)
        : computeElementFluidLiters(el, matchedEf?.pretUnitar);

    const costTotal = Number(el.costTotal || Number(el.cantitate || 1) * Number(el.pretUnitar || 0));
    const pretPerLitru = liters > 0 ? Number((costTotal / liters).toFixed(2)) : Number(el.pretUnitar || 0);

    await prisma.completareLichid.create({
      data: {
        vehiculId: comanda.vehiculId,
        articolStocId: el.articolStocId || null,
        tipLichid,
        tipOperatiune,
        marcaUlei: el.articolStoc?.marcaUlei || el.descriere,
        cantitateLitri: liters,
        pretPerLitru,
        costTotal,
        valoareContor: effectiveContor,
        dataCompletare: opDate,
        mecanic: comanda.mecanicResponsabil || 'Atelier Intern',
        observatii: `Sincronizat automat din Comandă de Lucru ${comanda.numarComanda}`,
        stareAlerta: 'REZOLVATA',
        comandaLucruId: comanda.id,
        elementComandaId: el.id,
      },
    });

    if (tipOperatiune.includes('SCHIMB')) {
      await prisma.configurareUleiVehicul.upsert({
        where: { vehiculId_tipLichid: { vehiculId: comanda.vehiculId, tipLichid } },
        update: {
          ultimulSchimbContor: effectiveContor,
          ultimulSchimbData: opDate,
        },
        create: {
          vehiculId: comanda.vehiculId,
          tipLichid,
          ultimulSchimbContor: effectiveContor,
          ultimulSchimbData: opDate,
          intervalMth: isMth ? 250 : null,
          intervalKm: !isMth ? 15000 : null,
          intervalLuni: 12,
        },
      });
    }

    synced++;
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
  if (t.includes('TRANSMISIE') || t.includes('CUTIE') || t.includes('PUNTE') || d.includes('transmis') || d.includes('diferen') || d.includes('gear') || d.includes('80w90') || d.includes('75w90') || d.includes('atf') || d.includes('ls90')) {
    return { key: 'TRANSMISIE', label: 'Ulei Transmisie / Cutie / Punte' };
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
