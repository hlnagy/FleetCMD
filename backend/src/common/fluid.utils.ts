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
  explicitTipLichid?: string | null,
): boolean {
  const desc = String(descriere || '').trim();
  const cat = String(categorie || '').trim();
  const sub = String(subcategorie || '').trim();

  if (desc && NON_FLUID_PATTERN.test(desc)) {
    return false;
  }

  if (explicitTipLichid && String(explicitTipLichid).trim() !== '') {
    return true;
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

  const subcatsWithTip = await prisma.subcategorieStoc.findMany({
    where: { tipLichid: { not: null } },
    include: { categorieStoc: { select: { nume: true } } },
  });

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

  const fluidElements = (comanda.elementeComanda || []).filter(
    (el: any) => {
      if (
        el.pilonCost === 'MANOPERA_INTERNA' ||
        el.pilonCost === 'PRESTATIE_EXTERNA' ||
        Number(el.costTotal || 0) < 0
      ) {
        return false;
      }
      const explicitTip = el.tipLichid || el.articolStoc?.tipLichid || findMappedSubcatTip(el);
      return isActualFluidItem(
        el.descriere,
        el.categorie || el.articolStoc?.categorie,
        el.subcategorie || el.articolStoc?.subcategorie,
        explicitTip,
      );
    },
  );

  if (fluidElements.length === 0) {
    return { synced: 0 };
  }

  const efactItems = await prisma.eFacturaItem.findMany({
    where: { comandaLucruId: comandaId },
    select: { descrierePiesa: true, pretUnitar: true },
  });

  const opDate = comanda.dataFinalizare || comanda.dataDeschidere || new Date();
  const isMth = isMthTipMasurare(comanda.vehicul?.tipMasurare);

  const [vehNorms, catNorms] = await Promise.all([
    prisma.configurareUleiVehicul.findMany({ where: { vehiculId: comanda.vehiculId } }),
    comanda.vehicul?.categorieEnum
      ? prisma.configurareUleiCategorie.findMany({ where: { categorieEnum: comanda.vehicul.categorieEnum } })
      : Promise.resolve([]),
  ]);

  let synced = 0;
  for (const el of fluidElements) {
    const explicitTip = el.tipLichid || el.articolStoc?.tipLichid || findMappedSubcatTip(el);
    const defaultMotor = String(comanda.vehicul?.categorieEnum || '').toUpperCase() === 'AUTOTURISM'
      ? 'ULEI_MOTOR_TURISME'
      : 'ULEI_MOTOR_15W40';
    const tipLichid = detectTipLichidFromText(
      el.descriere,
      el.categorie || el.articolStoc?.categorie,
      el.subcategorie || el.articolStoc?.subcategorie,
      defaultMotor,
      explicitTip,
    );

    const matchingVehNorm = vehNorms.find((n: any) => n.tipLichid === tipLichid);
    const matchingCatNorm = catNorms.find((n: any) => n.tipLichid === tipLichid);
    const ruleCfg = matchingVehNorm || matchingCatNorm || {};
    const counterMeta = resolveFluidRuleCounterConfig(comanda.vehicul, ruleCfg);
    const useMthCounter = counterMeta.trackingMode === 'MTH';

    const effectiveContor =
      useMthCounter && isDualMthVehicle(comanda.vehicul)
        ? Number(comanda.vehicul?.oreFunctionareCurent || 0)
        : Number(comanda.valoareContorLaExecutie || 0) > 0
        ? Number(comanda.valoareContorLaExecutie)
        : Number(comanda.vehicul?.valoareContorCurent || 0);
    const unitateContor = useMthCounter ? 'MTH' : (isMth ? 'MTH' : 'KM');

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
      await prisma.configurareUleiVehicul.upsert({
        where: { vehiculId_tipLichid: { vehiculId: comanda.vehiculId, tipLichid } },
        update: {
          ultimulSchimbContor: effectiveContor,
          ultimulSchimbData: opDate,
          ultimulSchimbEstimat: false,
        },
        create: {
          vehiculId: comanda.vehiculId,
          tipLichid,
          ultimulSchimbContor: effectiveContor,
          ultimulSchimbData: opDate,
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
