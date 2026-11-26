import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { detectTipLichidFromText } from '../common/fluid.utils';
import {
  isTireItem,
  parseTireDimensiune,
  parseTireMarca,
  parseTireModel,
} from '../common/tire.utils';

/** Normalizes text for case- and diacritic-insensitive search matching. */
function normalizeSearchText(value?: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Returns true when every whitespace-separated search token appears across the given fields. */
function matchesSearchTokens(fields: Array<string | null | undefined>, query?: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = fields.map((f) => normalizeSearchText(f)).join(' ');
  return tokens.every((token) => haystack.includes(token));
}

@Injectable()
export class StocuriGarantiiService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // 1. GESTIUNE DEPOZITE
  // ==========================================

  async getDepozite() {
    let depozite = await this.prisma.depozit.findMany({
      include: {
        articoleStoc: true,
        anvelope: {
          where: { stare: 'IN_STOC' },
        },
        _count: {
          select: {
            articoleStoc: true,
            anvelope: { where: { stare: 'IN_STOC' } },
          },
        },
      },
    });

    if (depozite.length === 0) {
      await this.prisma.depozit.createMany({
        data: [
          { nume: 'Depozit Central Atelier', adresa: 'Sediu Central', responsabil: 'Responsabil Depozit' },
          { nume: 'Depozit Șantier Autostrada A3', adresa: 'Șantier A3', responsabil: 'Mecanic Șantier A3' },
          { nume: 'Depozit Cariera Poiana', adresa: 'Cariera Poiana', responsabil: 'Gestionar Cariera' },
        ],
      });
      depozite = await this.prisma.depozit.findMany({
        include: {
          articoleStoc: true,
          anvelope: {
            where: { stare: 'IN_STOC' },
          },
          _count: {
            select: {
              articoleStoc: true,
              anvelope: { where: { stare: 'IN_STOC' } },
            },
          },
        },
      });
    }

    return depozite.map((d) => {
      const nonTireArticole = (d.articoleStoc || []).filter(
        (a) =>
          !isTireItem({
            categorie: a.categorie,
            subcategorie: a.subcategorie,
            denumire: a.denumire,
            codArticol: a.codArticol,
          }),
      );
      const activeNonTireCount = nonTireArticole.filter((a) => Number(a.stocCurent || 0) > 0).length;
      const anvelopeInStocCount = (d.anvelope || []).length;

      return {
        ...d,
        articoleStoc: nonTireArticole,
        _count: {
          ...d._count,
          articoleStoc: activeNonTireCount,
          anvelope: anvelopeInStocCount,
        },
      };
    });
  }

  /**
   * Calculează stocul rezervat în comenzile de lucru deschise (`IN_LUCRU` / `DEVALIDAT`)
   * pentru a preveni supra-alocarea în devize, transferuri și ieșiri de fluide.
   */
  async getReservedStockMap(
    excludeComandaId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, number>> {
    const db = tx || this.prisma;
    const rows = await db.elementComandaLucru.findMany({
      where: {
        pilonCost: 'PIESA_STOC',
        articolStocId: { not: null },
        comandaLucru: {
          stare: { in: ['IN_LUCRU', 'DEVALIDAT'] },
          ...(excludeComandaId ? { id: { not: excludeComandaId } } : {}),
        },
      },
      select: {
        articolStocId: true,
        cantitate: true,
      },
    });

    const reservedMap = new Map<string, number>();
    for (const row of rows) {
      if (!row.articolStocId) continue;
      const qty = Number(row.cantitate || 0);
      if (qty <= 0) continue;
      const prev = reservedMap.get(row.articolStocId) || 0;
      reservedMap.set(row.articolStocId, Number((prev + qty).toFixed(4)));
    }
    return reservedMap;
  }

  async getReservedStockDetailsMap(
    tx?: Prisma.TransactionClient,
  ): Promise<
    Map<
      string,
      Array<{
        comandaId: string;
        numarComanda: string;
        stare: string;
        vehiculNumar: string;
        cantitate: number;
      }>
    >
  > {
    const db = tx || this.prisma;
    const rows = await db.elementComandaLucru.findMany({
      where: {
        pilonCost: 'PIESA_STOC',
        articolStocId: { not: null },
        comandaLucru: {
          stare: { in: ['IN_LUCRU', 'DEVALIDAT'] },
        },
      },
      select: {
        articolStocId: true,
        cantitate: true,
        comandaLucru: {
          select: {
            id: true,
            numarComanda: true,
            stare: true,
            vehicul: { select: { numarIntern: true, numarInmatriculare: true } },
          },
        },
      },
    });

    const grouped = new Map<
      string,
      Map<string, { comandaId: string; numarComanda: string; stare: string; vehiculNumar: string; cantitate: number }>
    >();

    for (const r of rows) {
      if (!r.articolStocId || !r.comandaLucru) continue;
      let perArt = grouped.get(r.articolStocId);
      if (!perArt) {
        perArt = new Map();
        grouped.set(r.articolStocId, perArt);
      }
      const existing = perArt.get(r.comandaLucru.id);
      if (existing) {
        existing.cantitate = Number((existing.cantitate + Number(r.cantitate || 0)).toFixed(4));
      } else {
        perArt.set(r.comandaLucru.id, {
          comandaId: r.comandaLucru.id,
          numarComanda: r.comandaLucru.numarComanda,
          stare: r.comandaLucru.stare,
          vehiculNumar: r.comandaLucru.vehicul?.numarIntern || r.comandaLucru.vehicul?.numarInmatriculare || '—',
          cantitate: Number(r.cantitate || 0),
        });
      }
    }

    const result = new Map<
      string,
      Array<{ comandaId: string; numarComanda: string; stare: string; vehiculNumar: string; cantitate: number }>
    >();
    grouped.forEach((inner, artId) => {
      result.set(artId, Array.from(inner.values()));
    });
    return result;
  }

  async createDepozit(data: { nume: string; adresa?: string; responsabil?: string }) {
    if (!data.nume) throw new BadRequestException('Numele depozitului este obligatoriu.');
    return this.prisma.depozit.create({
      data: {
        nume: data.nume,
        adresa: data.adresa,
        responsabil: data.responsabil,
      },
    });
  }

  async updateDepozit(id: string, data: { nume?: string; adresa?: string; responsabil?: string }) {
    return this.prisma.depozit.update({
      where: { id },
      data: {
        nume: data.nume,
        adresa: data.adresa,
        responsabil: data.responsabil,
      },
    });
  }

  async deleteDepozit(id: string) {
    return this.prisma.depozit.delete({ where: { id } });
  }

  // ==========================================
  // 2. CATEGORII STOC CU STOC MINIM IMPLICIT & FLUIDE
  // ==========================================

  esteCategorieLichid(cat?: string, subcat?: string, um?: string): boolean {
    const c = (cat || '').toLowerCase();
    const s = (subcat || '').toLowerCase();
    const u = (um || '').toLowerCase();
    return (
      c.includes('ulei') ||
      c.includes('lubrifian') ||
      c.includes('antigel') ||
      c.includes('racire') ||
      c.includes('adblue') ||
      c.includes('lichid') ||
      s.includes('10w') ||
      s.includes('15w') ||
      s.includes('5w') ||
      s.includes('hlp') ||
      s.includes('hvlp') ||
      s.includes('g12') ||
      s.includes('g11') ||
      s.includes('adblue') ||
      u === 'l' ||
      u === 'litru' ||
      u === 'litri'
    );
  }

  async asiguraCategoriiStandard() {
    const categoriiInit = [
      {
        nume: 'Ulei Motor',
        descriere: 'Uleiuri de motor pentru camioane, utilaje și autoutilitare',
        stocMinimImplicit: 20,
        subcategorii: [
          '10W-40 (Heavy Duty Low-SAPS)',
          '15W-40 (Mineral Heavy Duty)',
          '5W-30 (Synthetic Longlife)',
          '5W-40 (Synthetic Universal)',
          '10W-30 (Utilaje Grele & TRACTO)',
        ],
      },
      {
        nume: 'Ulei Hidraulic',
        descriere: 'Fluide hidraulice pentru excavatoare, basculante și macarale',
        stocMinimImplicit: 40,
        subcategorii: [
          'HLP 46 (Hidraulic Standard)',
          'HVLP 46 (Hidraulic Presiune Înaltă)',
          'HLP 32 (Hidraulic Vâscozitate Redusă)',
          'HLP 68 (Hidraulic Sarcini Grele)',
          'Bio-Hidraulic (HEES / Ecologic)',
        ],
      },
      {
        nume: 'Ulei Transmisie & Diferențial',
        descriere: 'Uleiuri de transmisie manuală, punți și diferențiale',
        stocMinimImplicit: 15,
        subcategorii: [
          '80W-90 (Transmisie & Diferențial)',
          '75W-90 (Transmisie Sintetic)',
          '85W-140 (Diferențial Sarcini Grele)',
          'UTTO 10W-30 (Transmisie Universală Utilaj)',
          'ATF Dexron III (Cutie Automată / Servodirecție)',
        ],
      },
      {
        nume: 'Lichide Răcire & Antigel',
        descriere: 'Antigel concentrat și gata preparat pentru sistemul de răcire',
        stocMinimImplicit: 25,
        subcategorii: [
          'Antigel G12+ (Roz / Organic Concentrat)',
          'Antigel G12+ (Gata Preparat -35°C)',
          'Antigel G11 (Albastru / Clasic)',
          'Antigel G13 (Violet / Si-OAT)',
          'Apă Demineralizată',
        ],
      },
      {
        nume: 'AdBlue & Fluide Speciale',
        descriere: 'Soluție AdBlue, lichid de frână, lichid parbriz și unsori',
        stocMinimImplicit: 50,
        subcategorii: [
          'AdBlue (Soluție Uree 32.5% ISO 22241)',
          'Lichid Frână DOT 4',
          'Lichid Spălare Parbriz (Iarnă / Vară)',
          'Vaselină EP2 (Unsoare Mecanică)',
        ],
      },
      {
        nume: 'Filtre',
        descriere: 'Filtre motor, combustibil, aer și hidraulice',
        stocMinimImplicit: 5,
        subcategorii: [
          'Filtru Ulei Motor',
          'Filtru Combustibil / Motorină',
          'Filtru Aer Primar & Secundar',
          'Filtru Hidraulic',
          'Filtru Uscător Aer',
          'Filtru Habitaclu',
        ],
      },
      {
        nume: 'Piese Mecanice & Direcție',
        descriere: 'Componente mecanice, frânare și direcție',
        stocMinimImplicit: 2,
        subcategorii: [
          'Plăcuțe & Discuri Frână',
          'Bucșe, Pivoți & Capete Bară',
          'Amortizoare & Perne Aer',
          'Curele & Întinzătoare',
          'Turbosuflante & Componente Motor',
        ],
      },
      {
        nume: 'Alte',
        descriere: 'Alte piese, componente și materiale diverse',
        stocMinimImplicit: 1,
        subcategorii: [
          'Alte piese',
        ],
      },
      {
        nume: 'Anvelope',
        descriere: 'Anvelope camioane, semiremorci și utilaje grele',
        stocMinimImplicit: 4,
        subcategorii: [
          '315/80 R22.5',
          '385/65 R22.5',
          '13 R22.5',
          '29.5 R25',
          '17.5 / 19.5',
        ],
      },
    ];

    const resolveDefaultSubTip = (catName: string, subName: string): string | null => {
      if (!this.esteCategorieLichid(catName)) return null;
      return detectTipLichidFromText(undefined, catName, subName, 'ULEI_MOTOR_15W40');
    };

    for (const c of categoriiInit) {
      let cat = await this.prisma.categorieStoc.findUnique({ where: { nume: c.nume } });
      if (!cat) {
        cat = await this.prisma.categorieStoc.create({
          data: {
            nume: c.nume,
            descriere: c.descriere,
            stocMinimImplicit: c.stocMinimImplicit,
            esteFluid: this.esteCategorieLichid(c.nume),
          },
        });
      }

      for (const sub of c.subcategorii) {
        const subExists = await this.prisma.subcategorieStoc.findFirst({
          where: { categorieStocId: cat.id, nume: sub },
        });
        if (!subExists) {
          await this.prisma.subcategorieStoc.create({
            data: {
              nume: sub,
              categorieStocId: cat.id,
              tipLichid: resolveDefaultSubTip(c.nume, sub),
            },
          });
        }
      }
    }
  }

  private async resolveSubcatTipLichid(categorieNume?: string | null, subcategorieNume?: string | null): Promise<string | null> {
    const cleanSub = String(subcategorieNume || '').trim();
    if (!cleanSub) return null;
    const cleanCat = String(categorieNume || '').trim();

    if (cleanCat) {
      const exact = await this.prisma.subcategorieStoc.findFirst({
        where: {
          nume: { equals: cleanSub, mode: 'insensitive' },
          categorieStoc: { nume: { equals: cleanCat, mode: 'insensitive' } },
          tipLichid: { not: null },
        },
        select: { tipLichid: true },
      });
      if (exact?.tipLichid) return exact.tipLichid;
    }

    const fallbackSub = await this.prisma.subcategorieStoc.findFirst({
      where: {
        nume: { equals: cleanSub, mode: 'insensitive' },
        tipLichid: { not: null },
      },
      select: { tipLichid: true },
    });
    return fallbackSub?.tipLichid || null;
  }

  async getCategorii() {
    let categoriiCustom = await this.prisma.categorieStoc.findMany({
      include: { subcategorii: true },
      orderBy: { nume: 'asc' },
    });

    if (categoriiCustom.length < 5) {
      await this.asiguraCategoriiStandard();
      categoriiCustom = await this.prisma.categorieStoc.findMany({
        include: { subcategorii: true },
        orderBy: { nume: 'asc' },
      });
    }

    // Backfill inițial unic pentru subcategoriile standard de fluide care nu au încă tipLichid asignat
    const anyTipMapped = categoriiCustom.some((c) =>
      (c.subcategorii || []).some((s) => Boolean(s.tipLichid)),
    );
    if (!anyTipMapped) {
      let updatedAny = false;
      for (const c of categoriiCustom) {
        const isFluidCat = c.esteFluid || this.esteCategorieLichid(c.nume);
        if (!isFluidCat) continue;
        for (const s of c.subcategorii || []) {
          if (s.tipLichid) continue;
          const autoTip = detectTipLichidFromText(undefined, c.nume, s.nume, '');
          if (autoTip) {
            await this.prisma.subcategorieStoc.update({
              where: { id: s.id },
              data: { tipLichid: autoTip },
            });
            updatedAny = true;
          }
        }
      }
      if (updatedAny) {
        categoriiCustom = await this.prisma.categorieStoc.findMany({
          include: { subcategorii: true },
          orderBy: { nume: 'asc' },
        });
      }
    }

    const dbSubcats = await this.prisma.subcategorieStoc.findMany();

    return { categoriiImplicite: [], categoriiCustom, subcategoriiExistente: dbSubcats };
  }

  async createCategorie(data: { nume: string; descriere?: string; stocMinimImplicit?: number; esteFluid?: boolean }) {
    const cleanName = String(data.nume || '').trim();
    if (!cleanName) throw new BadRequestException('Numele categoriei este obligatoriu.');

    const existing = await this.prisma.categorieStoc.findFirst({
      where: { nume: { equals: cleanName, mode: 'insensitive' } },
      include: { subcategorii: true },
    });
    if (existing) {
      return existing;
    }

    const isFluid = data.esteFluid !== undefined
      ? Boolean(data.esteFluid)
      : /lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(cleanName);

    if (data.stocMinimImplicit !== undefined && Number(data.stocMinimImplicit) < 0) {
      throw new BadRequestException('Pragul de stoc minim nu poate fi negativ.');
    }
    const stocMinimImplicit = data.stocMinimImplicit !== undefined
      ? Math.max(0, Number(data.stocMinimImplicit))
      : (isFluid ? 20 : 5);

    return this.prisma.categorieStoc.create({
      data: {
        nume: cleanName,
        descriere: data.descriere?.trim() || null,
        stocMinimImplicit,
        esteFluid: isFluid,
      },
      include: { subcategorii: true },
    });
  }

  async updateCategorie(id: string, data: { nume?: string; descriere?: string; stocMinimImplicit?: number; esteFluid?: boolean }) {
    const existing = await this.prisma.categorieStoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Categoria nu a fost găsită.');

    if (data.stocMinimImplicit !== undefined && Number(data.stocMinimImplicit) < 0) {
      throw new BadRequestException('Pragul de alertă stoc minim nu poate fi negativ.');
    }

    const newStocMinim = data.stocMinimImplicit !== undefined
      ? Math.max(0, Number(data.stocMinimImplicit))
      : undefined;

    const updated = await this.prisma.categorieStoc.update({
      where: { id },
      data: {
        nume: data.nume ? data.nume.trim() : undefined,
        descriere: data.descriere !== undefined ? (data.descriere?.trim() || null) : undefined,
        stocMinimImplicit: newStocMinim,
        esteFluid: data.esteFluid !== undefined ? Boolean(data.esteFluid) : undefined,
      },
      include: { subcategorii: true },
    });

    const targetCategoryName = data.nume ? data.nume.trim() : existing.nume;

    // 1. Sincronizare redenumire categorie pe articolele din stoc
    if (data.nume && data.nume.trim() !== existing.nume) {
      await this.prisma.articolStoc.updateMany({
        where: {
          OR: [
            { categorie: existing.nume },
            { categorie: { equals: existing.nume, mode: 'insensitive' } },
          ],
        },
        data: { categorie: targetCategoryName },
      });
    }

    // 2. Sincronizare prag stocMinim pe articolele din stoc din această categorie
    if (newStocMinim !== undefined) {
      await this.prisma.articolStoc.updateMany({
        where: {
          OR: [
            { categorie: targetCategoryName },
            { categorie: existing.nume },
            { categorie: { equals: targetCategoryName, mode: 'insensitive' } },
            { categorie: { equals: existing.nume, mode: 'insensitive' } },
          ],
        },
        data: { stocMinim: newStocMinim },
      });
    }

    return updated;
  }

  async deleteCategorie(id: string) {
    const existing = await this.prisma.categorieStoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Categoria nu a fost găsită.');

    await this.prisma.subcategorieStoc.deleteMany({ where: { categorieStocId: id } });
    return this.prisma.categorieStoc.delete({ where: { id } });
  }

  async createSubcategorie(data: { categorieStocId?: string; categorieNume?: string; nume: string; descriere?: string; tipLichid?: string | null }) {
    const cleanSubName = String(data.nume || '').trim();
    if (!cleanSubName) throw new BadRequestException('Numele subcategoriei este obligatoriu.');

    let catId = data.categorieStocId;
    const cleanCatName = String(data.categorieNume || '').trim();
    if (!catId && cleanCatName) {
      let cat = await this.prisma.categorieStoc.findFirst({
        where: { nume: { equals: cleanCatName, mode: 'insensitive' } },
      });
      if (!cat) {
        cat = await this.prisma.categorieStoc.create({ data: { nume: cleanCatName } });
      }
      catId = cat.id;
    }

    const existingSub = await this.prisma.subcategorieStoc.findFirst({
      where: {
        categorieStocId: catId || null,
        nume: { equals: cleanSubName, mode: 'insensitive' },
      },
    });
    if (existingSub) {
      return existingSub;
    }

    return this.prisma.subcategorieStoc.create({
      data: {
        nume: cleanSubName,
        descriere: data.descriere?.trim() || null,
        tipLichid: data.tipLichid?.trim() || null,
        categorieStocId: catId || null,
      },
    });
  }

  async updateSubcategorie(id: string, data: { nume?: string; descriere?: string; categorieStocId?: string; categorieNume?: string; tipLichid?: string | null }) {
    const existing = await this.prisma.subcategorieStoc.findUnique({
      where: { id },
      include: { categorieStoc: true },
    });
    if (!existing) throw new NotFoundException('Subcategoria nu a fost găsită.');

    let newCatId = data.categorieStocId;
    let newCatNume: string | undefined;

    if (data.categorieNume) {
      let cat = await this.prisma.categorieStoc.findUnique({ where: { nume: data.categorieNume } });
      if (!cat) {
        cat = await this.prisma.categorieStoc.create({ data: { nume: data.categorieNume } });
      }
      newCatId = cat.id;
      newCatNume = cat.nume;
    } else if (newCatId) {
      const cat = await this.prisma.categorieStoc.findUnique({ where: { id: newCatId } });
      if (cat) newCatNume = cat.nume;
    }

    const newTipLichid =
      data.tipLichid !== undefined ? (data.tipLichid?.trim() || null) : undefined;

    const updated = await this.prisma.subcategorieStoc.update({
      where: { id },
      data: {
        nume: data.nume ? data.nume.trim() : undefined,
        descriere: data.descriere !== undefined ? (data.descriere?.trim() || null) : undefined,
        tipLichid: newTipLichid,
        categorieStocId: newCatId !== undefined ? newCatId : undefined,
      },
      include: { categorieStoc: true },
    });

    const oldSubName = existing.nume;
    const newSubName = data.nume ? data.nume.trim() : existing.nume;
    const oldCatName = existing.categorieStoc?.nume;

    // Actualizare în cascadă pe articolele de stoc existente
    if (newCatNume && oldCatName && newCatNume !== oldCatName) {
      await this.prisma.articolStoc.updateMany({
        where: {
          subcategorie: oldSubName,
          categorie: oldCatName,
        },
        data: {
          categorie: newCatNume,
          subcategorie: newSubName,
        },
      });
    } else if (newSubName !== oldSubName) {
      await this.prisma.articolStoc.updateMany({
        where: { subcategorie: oldSubName },
        data: { subcategorie: newSubName },
      });
    }

    // Propagăm tipLichid pe articolele din această subcategorie care nu aveau un alt override diferit
    if (newTipLichid !== undefined && newTipLichid !== existing.tipLichid) {
      const targetCat = newCatNume || oldCatName;
      await this.prisma.articolStoc.updateMany({
        where: {
          subcategorie: newSubName,
          ...(targetCat ? { categorie: targetCat } : {}),
          OR: [
            { tipLichid: null },
            ...(existing.tipLichid ? [{ tipLichid: existing.tipLichid }] : []),
          ],
        },
        data: { tipLichid: newTipLichid },
      });
    }

    return updated;
  }

  async deleteSubcategorie(id: string) {
    const existing = await this.prisma.subcategorieStoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subcategoria nu a fost găsită.');

    return this.prisma.subcategorieStoc.delete({ where: { id } });
  }

  // ==========================================
  // 3. TRANSFER PARȚIAL ÎNTRE DEPOZITE (POINT REQUESTED BY USER)
  // ==========================================

  async transferStocParcial(data: {
    articolStocId: string;
    depozitDestinatieId: string;
    cantitate: number;
    operator?: string;
    observatii?: string;
    preferredNumarFactura?: string | null;
    preferredPretUnitar?: number | null;
  }) {
    const cantitate = Number(data.cantitate);
    if (!Number.isFinite(cantitate) || cantitate <= 0) {
      throw new BadRequestException('Cantitatea de transferat trebuie să fie mai mare ca 0.');
    }

    return this.prisma.$transaction(async (tx) => {
      const articolSursa = await tx.articolStoc.findUnique({
        where: { id: data.articolStocId },
        include: { depozit: true },
      });

      if (!articolSursa) throw new NotFoundException('Articolul sursă nu a fost găsit.');

      if (
        isTireItem({
          categorie: articolSursa.categorie,
          subcategorie: articolSursa.subcategorie,
          denumire: articolSursa.denumire,
          codArticol: articolSursa.codArticol,
        })
      ) {
        throw new BadRequestException(
          'Anvelopele se gestionează și se mută între depozite exclusiv din Magazie Anvelope (/anvelope).',
        );
      }

      if (articolSursa.depozitId === data.depozitDestinatieId) {
        throw new BadRequestException('Depozitul destinație trebuie să fie diferit de depozitul sursă.');
      }

      const depozitDestinatie = await tx.depozit.findUnique({
        where: { id: data.depozitDestinatieId },
      });
      if (!depozitDestinatie) throw new NotFoundException('Depozitul destinație nu a fost găsit.');

      const reservedMap = await this.getReservedStockMap(undefined, tx);
      const reservedQty = reservedMap.get(articolSursa.id) || 0;
      const stocDisponibil = Number((Number(articolSursa.stocCurent || 0) - reservedQty).toFixed(4));

      if (stocDisponibil < cantitate - 0.0001) {
        throw new BadRequestException(
          reservedQty > 0
            ? `Stoc disponibil insuficient în ${articolSursa.depozit?.nume || 'Depozitul Sursă'}! Stoc fizic: ${articolSursa.stocCurent} ${articolSursa.unitateMasura}, rezervat în comenzi deschise: ${reservedQty} ${articolSursa.unitateMasura}, disponibil pentru transfer: ${Math.max(0, stocDisponibil)} ${articolSursa.unitateMasura}.`
            : `Stoc insuficient în ${articolSursa.depozit?.nume || 'Depozitul Sursă'}! Stoc disponibil: ${articolSursa.stocCurent} ${articolSursa.unitateMasura}, ați solicitat ${cantitate} ${articolSursa.unitateMasura}.`,
        );
      }

      // 1. Consumăm FIFO atomic din depozitul sursă (respectă lotul selectat explicit dacă există)
      const fifoRes = await this.consumaStocFIFO(
        articolSursa.id,
        cantitate,
        tx,
        data.preferredNumarFactura
          ? {
              numarFactura: data.preferredNumarFactura,
              pretUnitar: data.preferredPretUnitar,
            }
          : undefined,
      );

      // 2. Căutăm sau creăm articolul în depozitul destinație
      let articolDestinatie = await tx.articolStoc.findFirst({
        where: {
          codArticol: articolSursa.codArticol,
          depozitId: data.depozitDestinatieId,
        },
      });

      if (articolDestinatie) {
        articolDestinatie = await tx.articolStoc.update({
          where: { id: articolDestinatie.id },
          data: {
            stocCurent: Number((Number(articolDestinatie.stocCurent || 0) + cantitate).toFixed(4)),
            pretUnitar: fifoRes.pretUnitarMediu > 0 ? fifoRes.pretUnitarMediu : articolDestinatie.pretUnitar,
            esteSerializat: articolDestinatie.esteSerializat || articolSursa.esteSerializat,
            subcategorie: articolDestinatie.subcategorie || articolSursa.subcategorie,
            tipLichid: articolDestinatie.tipLichid || articolSursa.tipLichid,
            marcaUlei: articolDestinatie.marcaUlei || articolSursa.marcaUlei,
          },
        });
      } else {
        articolDestinatie = await tx.articolStoc.create({
          data: {
            codArticol: articolSursa.codArticol,
            denumire: articolSursa.denumire,
            categorie: articolSursa.categorie,
            subcategorie: articolSursa.subcategorie,
            tipLichid: articolSursa.tipLichid,
            marcaUlei: articolSursa.marcaUlei,
            pretUnitar: fifoRes.pretUnitarMediu > 0 ? fifoRes.pretUnitarMediu : articolSursa.pretUnitar,
            unitateMasura: articolSursa.unitateMasura,
            stocMinim: articolSursa.stocMinim,
            stocCurent: cantitate,
            esteSerializat: articolSursa.esteSerializat,
            observatiiIntern: articolSursa.observatiiIntern,
            depozitId: data.depozitDestinatieId,
          },
        });
      }

      // 3. Creăm loturi FIFO corespunzătoare pe destinație, păstrând trasabilitatea (furnizor, factură, dată, preț)
      let totalInLots = 0;
      for (const lot of fifoRes.loturiConsumate) {
        totalInLots = Number((totalInLots + lot.cantitateLuata).toFixed(4));
        await tx.intrareStoc.create({
          data: {
            articolStocId: articolDestinatie.id,
            depozitId: data.depozitDestinatieId,
            tipLichid: articolSursa.tipLichid,
            marcaUlei: articolSursa.marcaUlei,
            furnizor: lot.furnizor,
            numarFactura: lot.numarFactura,
            dataFactura: lot.dataFactura,
            cantitateIntrata: lot.cantitateLuata,
            cantitateRamasa: lot.cantitateLuata,
            pretUnitar: lot.pretUnitar,
            pretTotal: Number((lot.cantitateLuata * lot.pretUnitar).toFixed(2)),
            observatii: `Transferat din ${articolSursa.depozit?.nume || 'Depozit Sursă'}${data.observatii ? ` • ${data.observatii}` : ''}`,
          },
        });
      }

      const remainderUnlotted = Number((cantitate - totalInLots).toFixed(4));
      if (remainderUnlotted > 0.0001) {
        const fallbackPret = Number(articolSursa.pretUnitar || 0);
        await tx.intrareStoc.create({
          data: {
            articolStocId: articolDestinatie.id,
            depozitId: data.depozitDestinatieId,
            tipLichid: articolSursa.tipLichid,
            marcaUlei: articolSursa.marcaUlei,
            furnizor: `Transfer din ${articolSursa.depozit?.nume || 'Depozit Sursă'}`,
            numarFactura: 'TRANSFER-STOC',
            dataFactura: new Date(),
            cantitateIntrata: remainderUnlotted,
            cantitateRamasa: remainderUnlotted,
            pretUnitar: fallbackPret,
            pretTotal: Number((remainderUnlotted * fallbackPret).toFixed(2)),
            observatii: `Transfer parțial între depozite${data.observatii ? ` • ${data.observatii}` : ''}`,
          },
        });
      }

      // 4. Dacă articolul este serializat, migrăm componentele IN_STOC aferente către depozitul destinație
      if (articolSursa.esteSerializat) {
        const serialCountToMove = Math.max(0, Math.round(cantitate));
        if (serialCountToMove > 0) {
          const serialsToMove = await tx.componentaSerializata.findMany({
            where: { articolStocId: articolSursa.id, stare: 'IN_STOC' },
            orderBy: { createdAt: 'asc' },
            take: serialCountToMove,
          });
          if (serialsToMove.length > 0) {
            await tx.componentaSerializata.updateMany({
              where: { id: { in: serialsToMove.map((s) => s.id) } },
              data: { articolStocId: articolDestinatie.id },
            });
          }
        }
      }

      // 5. Înregistrăm log-ul de transfer
      const transferLog = await tx.transferStoc.create({
        data: {
          articolStocId: articolSursa.id,
          depozitSursaId: articolSursa.depozitId || data.depozitDestinatieId,
          depozitDestinatieId: data.depozitDestinatieId,
          cantitateTransferata: cantitate,
          operator: data.operator?.trim() || 'Operator Depozit',
          observatii: data.observatii?.trim() || null,
        },
      });

      const isTotal = fifoRes.stocCurentRamas <= 0.0001;
      return {
        mesaj: `${isTotal ? 'Transfer total' : 'Transfer parțial'} efectuat cu succes! Au fost transferate ${cantitate} ${articolSursa.unitateMasura} de "${articolSursa.denumire}" din ${articolSursa.depozit?.nume || 'Depozitul Sursă'} în ${depozitDestinatie.nume}.`,
        transferLog,
        stocSursaNou: fifoRes.stocCurentRamas,
        stocDestinatieNou: articolDestinatie.stocCurent,
      };
    });
  }

  async getIstoricTransferuri() {
    return this.prisma.transferStoc.findMany({
      include: { articolStoc: true, depozitSursa: true, depozitDestinatie: true },
      orderBy: { dataTransfer: 'desc' },
    });
  }

  // ==========================================
  // 4. CAUTARE & FILTRARE MULTI-CRITERIU STOC
  // ==========================================

  async getStocuri(filters?: {
    categorie?: string;
    subcategorie?: string;
    depozitId?: string;
    statusStoc?: string; // "CRITIC" | "IN_STOC" | "TOATE"
    cautare?: string;
  }) {
    const andConditions: any[] = [];

    if (filters?.categorie?.trim()) {
      const catVal = filters.categorie.trim();
      const firstWord = catVal.split(' ')[0];
      andConditions.push({
        OR: [
          { categorie: { equals: catVal, mode: 'insensitive' } },
          { categorie: { contains: catVal, mode: 'insensitive' } },
          { categorie: { contains: firstWord, mode: 'insensitive' } },
        ],
      });
    }

    if (filters?.subcategorie?.trim()) {
      andConditions.push({
        subcategorie: { equals: filters.subcategorie.trim(), mode: 'insensitive' },
      });
    }

    if (filters?.depozitId) {
      const depozite = await this.getDepozite();
      const mainDepozitId = depozite[0]?.id;
      if (mainDepozitId && filters.depozitId === mainDepozitId) {
        andConditions.push({
          OR: [
            { depozitId: filters.depozitId },
            { depozitId: null },
          ],
        });
      } else {
        andConditions.push({ depozitId: filters.depozitId });
      }
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    let articole = await this.prisma.articolStoc.findMany({
      where,
      include: {
        depozit: true,
        intrariStoc: {
          orderBy: { dataFactura: 'desc' },
        },
      },
      orderBy: { denumire: 'asc' },
    });

    // Excludem strict orice ArticolStoc rezidual de tip anvelopă (anvelopele trăiesc exclusiv în Magazie Anvelope)
    articole = articole.filter(
      (a) =>
        !isTireItem({
          categorie: a.categorie,
          subcategorie: a.subcategorie,
          denumire: a.denumire,
          codArticol: a.codArticol,
        }),
    );

    if (filters?.cautare?.trim()) {
      articole = articole.filter((a) =>
        matchesSearchTokens(
          [
            a.codArticol,
            a.denumire,
            a.marcaUlei,
            a.categorie,
            a.subcategorie,
            a.tipLichid,
            a.observatiiIntern,
            a.depozit?.nume,
            ...(Array.isArray(a.intrariStoc)
              ? a.intrariStoc.flatMap((i) => [
                  i.furnizor,
                  i.numarFactura,
                  i.observatii,
                  i.marcaUlei,
                  i.tipLichid,
                ])
              : []),
          ],
          filters.cautare,
        ),
      );
    }

    const [reservedMap, reservedDetailsMap] = await Promise.all([
      this.getReservedStockMap(),
      this.getReservedStockDetailsMap(),
    ]);
    const enriched = articole.map((a) => {
      const stocRezervat = Number((reservedMap.get(a.id) || 0).toFixed(4));
      const stocDisponibil = Math.max(0, Number((Number(a.stocCurent || 0) - stocRezervat).toFixed(4)));
      const rezervariActive = reservedDetailsMap.get(a.id) || [];
      return {
        ...a,
        stocRezervat,
        stocDisponibil,
        rezervariActive,
      };
    });

    if (filters?.statusStoc === 'CRITIC') {
      return enriched.filter((a) => (Number(a.stocMinim) || 0) > 0 && a.stocCurent < (Number(a.stocMinim) || 0));
    } else if (filters?.statusStoc === 'IN_STOC') {
      return enriched.filter((a) => (Number(a.stocMinim) || 0) <= 0 || a.stocCurent >= (Number(a.stocMinim) || 0));
    }

    return enriched;
  }

  async getStocuriCritice() {
    const articoleRaw = await this.prisma.articolStoc.findMany({
      include: { depozit: true },
    });
    const articole = articoleRaw.filter(
      (a) =>
        !isTireItem({
          categorie: a.categorie,
          subcategorie: a.subcategorie,
          denumire: a.denumire,
          codArticol: a.codArticol,
        }),
    );
    // Doar articolele non-anvelopă care au un stoc minim configurat (> 0) și stocul este strict sub acesta
    const critice = articole.filter((a) => (Number(a.stocMinim) || 0) > 0 && a.stocCurent < (Number(a.stocMinim) || 0));
    return {
      numarArticoleCritice: critice.length,
      articoleCritice: critice.map((a) => ({
        id: a.id,
        codArticol: a.codArticol,
        denumire: a.denumire,
        stocCurent: a.stocCurent,
        stocMinim: a.stocMinim,
        unitateMasura: a.unitateMasura,
        depozit: a.depozit?.nume || 'Depozit Central Atelier',
        mesaj: ` AVERTISMENT STOC CRITIC: Articolul "${a.denumire}" (${a.codArticol}) are stocul de ${a.stocCurent} ${a.unitateMasura}, sub limita minimă de ${a.stocMinim} ${a.unitateMasura}!`,
      })),
    };
  }

  async createArticolStoc(data: {
    codArticol: string;
    denumire: string;
    categorie: string;
    subcategorie?: string;
    tipLichid?: string | null;
    stocCurent: number;
    stocMinim?: number;
    pretUnitar: number;
    unitateMasura?: string;
    esteSerializat?: boolean;
    depozitId?: string;
    marcaUlei?: string;
  }) {
    if (
      isTireItem({
        categorie: data.categorie,
        subcategorie: data.subcategorie,
        denumire: data.denumire,
        codArticol: data.codArticol,
      })
    ) {
      throw new BadRequestException(
        'Anvelopele sunt gestionate exclusiv în Magazie Anvelope (/anvelope) și nu pot fi create ca articole de stoc atelier.',
      );
    }

    const stocInitial = Number(data.stocCurent || 0);
    if (stocInitial < 0) {
      throw new BadRequestException('Stocul curent nu poate fi negativ.');
    }

    let stocMinimFinal = data.stocMinim;
    if (stocMinimFinal === undefined || stocMinimFinal === null) {
      const catCustom = await this.prisma.categorieStoc.findUnique({ where: { nume: data.categorie } });
      stocMinimFinal = catCustom ? catCustom.stocMinimImplicit : 5;
    }

    let depozitIdFinal = data.depozitId;
    if (!depozitIdFinal) {
      const depozite = await this.getDepozite();
      depozitIdFinal = depozite[0]?.id;
    }

    const explicitTip = data.tipLichid?.trim() || null;
    const inheritedTip = !explicitTip
      ? await this.resolveSubcatTipLichid(data.categorie, data.subcategorie)
      : null;
    const finalTipLichid = explicitTip || inheritedTip || null;
    const pretUnitarFinal = Number(data.pretUnitar || 0);

    return this.prisma.$transaction(async (tx) => {
      const articol = await tx.articolStoc.create({
        data: {
          codArticol: data.codArticol,
          denumire: data.denumire,
          categorie: data.categorie,
          subcategorie: data.subcategorie,
          tipLichid: finalTipLichid,
          stocCurent: stocInitial,
          stocMinim: Number(stocMinimFinal),
          pretUnitar: pretUnitarFinal,
          unitateMasura: data.unitateMasura || 'buc',
          esteSerializat: !!data.esteSerializat,
          depozitId: depozitIdFinal,
          marcaUlei: data.marcaUlei,
        },
      });

      if (stocInitial > 0) {
        await tx.intrareStoc.create({
          data: {
            articolStocId: articol.id,
            depozitId: depozitIdFinal || null,
            tipLichid: finalTipLichid,
            marcaUlei: data.marcaUlei || null,
            furnizor: 'Stoc Inițial / Inventar',
            numarFactura: 'STOC-INITIAL',
            dataFactura: new Date(),
            cantitateIntrata: stocInitial,
            cantitateRamasa: stocInitial,
            pretUnitar: pretUnitarFinal,
            pretTotal: Number((stocInitial * pretUnitarFinal).toFixed(2)),
            observatii: 'Lot inițial FIFO creat automat la adăugarea articolului în stoc',
          },
        });
      }

      return articol;
    });
  }

  private async ensureCategoryAndSubcategoryExist(categorieNume?: string, subcategorieNume?: string | null) {
    const cleanCat = String(categorieNume || '').trim();
    if (!cleanCat) return;

    let cat = await this.prisma.categorieStoc.findFirst({
      where: { nume: { equals: cleanCat, mode: 'insensitive' } },
    });
    if (!cat) {
      const isFluid = /lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(cleanCat);
      cat = await this.prisma.categorieStoc.create({
        data: {
          nume: cleanCat,
          stocMinimImplicit: isFluid ? 20 : 5,
          esteFluid: isFluid,
        },
      });
    }

    const cleanSub = String(subcategorieNume || '').trim();
    if (cleanSub) {
      const existingSub = await this.prisma.subcategorieStoc.findFirst({
        where: {
          categorieStocId: cat.id,
          nume: { equals: cleanSub, mode: 'insensitive' },
        },
      });
      if (!existingSub) {
        await this.prisma.subcategorieStoc.create({
          data: {
            categorieStocId: cat.id,
            nume: cleanSub,
          },
        });
      }
    }
  }

  async updateArticolStoc(id: string, data: any) {
    if (data.stocMinim !== undefined && Number(data.stocMinim) < 0) {
      throw new BadRequestException('Pragul de alertă stoc minim nu poate fi negativ.');
    }
    if (data.stocCurent !== undefined && (isNaN(Number(data.stocCurent)) || Number(data.stocCurent) < 0)) {
      throw new BadRequestException('Stocul curent nu poate fi negativ.');
    }

    const cleanCategorie = data.categorie !== undefined ? String(data.categorie || '').trim() : undefined;
    const cleanSubcategorie =
      data.subcategorie !== undefined
        ? (String(data.subcategorie || '').trim() || null)
        : undefined;

    if (cleanCategorie && isTireItem({ categorie: cleanCategorie })) {
      throw new BadRequestException(
        'Anvelopele sunt gestionate exclusiv în Magazie Anvelope (/anvelope).',
      );
    }

    if (cleanCategorie) {
      await this.ensureCategoryAndSubcategoryExist(cleanCategorie, cleanSubcategorie);
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.articolStoc.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Articolul din stoc nu a fost găsit.');

      const nextDepozitId =
        data.depozitId !== undefined ? (data.depozitId || null) : existing.depozitId;
      const nextTipLichid =
        data.tipLichid !== undefined
          ? (data.tipLichid ? String(data.tipLichid).trim() : null)
          : existing.tipLichid;
      const nextMarcaUlei =
        data.marcaUlei !== undefined
          ? (String(data.marcaUlei || '').trim() || null)
          : existing.marcaUlei;
      const nextPretUnitar =
        data.pretUnitar !== undefined ? Number(data.pretUnitar) : Number(existing.pretUnitar || 0);
      const nextUnitateMasura =
        data.unitateMasura !== undefined ? data.unitateMasura : existing.unitateMasura;

      // 1. Dacă s-a schimbat depozitul articolului, sincronizăm și IntrareStoc.depozitId
      if (data.depozitId !== undefined && nextDepozitId !== existing.depozitId) {
        await tx.intrareStoc.updateMany({
          where: { articolStocId: id },
          data: { depozitId: nextDepozitId },
        });
      }

      // 2. Dacă stocCurent este modificat manual, validăm rezervările active și reconciliem delta pe IntrareStoc.cantitateRamasa
      if (data.stocCurent !== undefined) {
        const nextStoc = Number(Number(data.stocCurent).toFixed(4));
        const reservedMap = await this.getReservedStockMap(undefined, tx);
        const reservedQty = reservedMap.get(id) || 0;
        if (nextStoc < reservedQty - 0.0001) {
          throw new BadRequestException(
            `Stocul curent nu poate fi redus la ${nextStoc} ${nextUnitateMasura} deoarece există ${reservedQty} ${nextUnitateMasura} rezervate în comenzi de lucru deschise (IN_LUCRU / DEVALIDAT).`,
          );
        }
        const existingLots = await tx.intrareStoc.findMany({
          where: { articolStocId: id, cantitateIntrata: { gt: 0 } },
          orderBy: [{ dataFactura: 'asc' }, { createdAt: 'asc' }],
        });

        const currentSumRamasa = Number(
          existingLots
            .reduce(
              (sum, lot) =>
                sum +
                (lot.cantitateRamasa !== null && lot.cantitateRamasa !== undefined
                  ? Number(lot.cantitateRamasa)
                  : Number(lot.cantitateIntrata || 0)),
              0,
            )
            .toFixed(4),
        );

        const fifoDiff = Number((nextStoc - currentSumRamasa).toFixed(4));

        if (fifoDiff < -0.0001) {
          let toDeduct = Math.abs(fifoDiff);
          for (const lot of existingLots) {
            if (toDeduct <= 0.0001) break;
            const lotRem =
              lot.cantitateRamasa !== null && lot.cantitateRamasa !== undefined
                ? Number(lot.cantitateRamasa)
                : Number(lot.cantitateIntrata || 0);
            if (lotRem <= 0) continue;
            const take = Math.min(lotRem, toDeduct);
            await tx.intrareStoc.update({
              where: { id: lot.id },
              data: { cantitateRamasa: Math.max(0, Number((lotRem - take).toFixed(4))) },
            });
            toDeduct = Number((toDeduct - take).toFixed(4));
          }
        } else if (fifoDiff > 0.0001) {
          let toAdd = fifoDiff;
          const newestFirst = [...existingLots].reverse();
          for (const lot of newestFirst) {
            if (toAdd <= 0.0001) break;
            const intrata = Number(lot.cantitateIntrata || 0);
            const ramasa =
              lot.cantitateRamasa !== null && lot.cantitateRamasa !== undefined
                ? Number(lot.cantitateRamasa)
                : intrata;
            const cap = Math.max(0, Number((intrata - ramasa).toFixed(4)));
            if (cap <= 0) continue;
            const addHere = Math.min(cap, toAdd);
            await tx.intrareStoc.update({
              where: { id: lot.id },
              data: { cantitateRamasa: Number((ramasa + addHere).toFixed(4)) },
            });
            toAdd = Number((toAdd - addHere).toFixed(4));
          }

          if (toAdd > 0.0001) {
            await tx.intrareStoc.create({
              data: {
                articolStocId: id,
                depozitId: nextDepozitId,
                tipLichid: nextTipLichid,
                marcaUlei: nextMarcaUlei,
                furnizor: 'Ajustare Inventar',
                numarFactura: 'AJUSTARE-STOC',
                dataFactura: new Date(),
                cantitateIntrata: toAdd,
                cantitateRamasa: toAdd,
                pretUnitar: nextPretUnitar,
                pretTotal: Number((toAdd * nextPretUnitar).toFixed(2)),
                observatii: `Ajustare manuală stoc (+${toAdd} ${nextUnitateMasura})`,
              },
            });
          }
        }
      }

      return tx.articolStoc.update({
        where: { id },
        data: {
          codArticol: data.codArticol !== undefined ? String(data.codArticol).trim() : undefined,
          denumire: data.denumire !== undefined ? String(data.denumire).trim() : undefined,
          categorie: cleanCategorie !== undefined ? cleanCategorie : undefined,
          subcategorie: cleanSubcategorie,
          tipLichid:
            data.tipLichid !== undefined
              ? (data.tipLichid ? String(data.tipLichid).trim() : null)
              : undefined,
          stocCurent: data.stocCurent !== undefined ? Number(Number(data.stocCurent).toFixed(4)) : undefined,
          stocMinim: data.stocMinim !== undefined ? Math.max(0, Number(data.stocMinim)) : undefined,
          pretUnitar: data.pretUnitar !== undefined ? Number(data.pretUnitar) : undefined,
          unitateMasura: data.unitateMasura !== undefined ? data.unitateMasura : undefined,
          depozitId: data.depozitId !== undefined ? (data.depozitId || null) : undefined,
          marcaUlei: data.marcaUlei !== undefined ? (String(data.marcaUlei || '').trim() || null) : undefined,
          observatiiIntern:
            data.observatiiIntern !== undefined
              ? (String(data.observatiiIntern || '').trim() || null)
              : undefined,
        },
        include: {
          depozit: true,
          intrariStoc: {
            orderBy: { dataFactura: 'desc' },
          },
        },
      });
    });
  }

  async deleteArticolStoc(id: string) {
    return this.prisma.articolStoc.delete({ where: { id } });
  }

  // ==========================================
  // 5. RECEPȚIE MARFĂ PE FACTURĂ, CONSOLIDARE STOC & GARANȚII
  // ==========================================

  async adaugaIntrareStoc(data: {
    codArticol: string;
    denumire: string;
    categorie: string;
    subcategorie?: string;
    furnizor: string;
    numarFactura: string;
    dataFactura?: string;
    cantitate: number;
    pretTotal: number;
    pretUnitar?: number;
    unitateMasura?: string;
    depozitId?: string;
    tipLichid?: string;
    marcaUlei?: string;
    observatii?: string;
    motivReceptieManuala?: string;
    esteReceptieManuala?: boolean;
    articolStocId?: string;
    codDot?: string;

    areGarantie?: boolean;
    serieUnica?: string;
    durataGarantieLuni?: number;
    durataGarantieRulaj?: number;
  }) {
    const cantitate = Number(data.cantitate);
    const pretTotal = Number(data.pretTotal || 0);
    if (!Number.isFinite(cantitate) || cantitate <= 0) {
      throw new BadRequestException('Cantitatea trebuie să fie mai mare ca 0.');
    }
    const motivManual = data.motivReceptieManuala ? String(data.motivReceptieManuala).trim() : null;
    if (data.esteReceptieManuala && !motivManual) {
      throw new BadRequestException(
        'Motivul recepției manuale este obligatoriu (ex: factură externă fără SPV, factură pe altă firmă din grup).',
      );
    }

    const pretUnitar =
      pretTotal > 0
        ? Number((pretTotal / cantitate).toFixed(2))
        : Number(Number(data.pretUnitar || 0).toFixed(2));
    const pretTotalFinal = pretTotal > 0 ? pretTotal : Number((pretUnitar * cantitate).toFixed(2));
    const dataFacturaDate = data.dataFactura ? new Date(data.dataFactura) : new Date();

    let depozitIdFinal = data.depozitId;
    if (!depozitIdFinal) {
      const depozite = await this.getDepozite();
      depozitIdFinal = depozite[0]?.id;
    }

    // SEPARARE STRICTĂ ANVELOPE: recepția de anvelope creează exclusiv rânduri Anvelopa (IN_STOC),
    // fără ArticolStoc, fără IntrareStoc și fără ComponentaSerializata!
    if (
      isTireItem({
        categorie: data.categorie,
        subcategorie: data.subcategorie,
        denumire: data.denumire,
        codArticol: data.codArticol,
      })
    ) {
      const tireCount = Math.max(1, Math.round(cantitate));
      const dimensiune = parseTireDimensiune(`${data.denumire || ''} ${data.subcategorie || ''}`);
      const marca = parseTireMarca(data.denumire);
      const model = parseTireModel(data.denumire);
      const codDot = String(data.codDot || 'DOT-2026').trim() || 'DOT-2026';
      const rawSerials = String(data.serieUnica || '')
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const codePrefix = (data.codArticol || 'ANV').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'ANV';
      const tsSuffix = Date.now().toString().slice(-6);

      const anvelopeCreate = await this.prisma.$transaction(async (tx) => {
        const created = [];
        for (let i = 0; i < tireCount; i++) {
          let serie: string;
          if (rawSerials.length >= tireCount) {
            serie = rawSerials[i];
          } else if (rawSerials.length === 1 && tireCount === 1) {
            serie = rawSerials[0];
          } else if (rawSerials.length === 1 && tireCount > 1) {
            serie = `${rawSerials[0]}-${String(i + 1).padStart(2, '0')}`;
          } else {
            serie = `SN-${codePrefix}-${tsSuffix}-${String(i + 1).padStart(2, '0')}`;
          }

          const anvelopa = await tx.anvelopa.create({
            data: {
              serieAnvelopa: serie,
              codDot,
              marca,
              model,
              dimensiune,
              adancimeInitialaMm: 16,
              adancimeCurentaMm: 16,
              pretAchizitie: pretUnitar,
              furnizor: data.furnizor || null,
              numarFactura: data.numarFactura || null,
              dataFactura: dataFacturaDate,
              stare: 'IN_STOC',
              depozitId: depozitIdFinal || null,
            },
          });
          created.push(anvelopa);
        }
        return created;
      });

      const depozit = depozitIdFinal
        ? await this.prisma.depozit.findUnique({ where: { id: depozitIdFinal } })
        : null;

      return {
        mesaj: `Recepție anvelope înregistrată direct în Magazie Anvelope! ${tireCount} buc "${marca} ${model}" (${dimensiune}, ${pretUnitar} RON/buc) adăugate în ${depozit?.nume || 'Depozit Central'}.`,
        tip: 'ANVELOPE_STOC',
        esteAnvelopa: true,
        anvelopeCreate,
        articol: null,
        intrare: null,
        pretUnitar,
        componentaGarantie: null,
      };
    }

    const isLiquid = this.esteCategorieLichid(data.categorie, data.subcategorie, data.unitateMasura) || Boolean(data.tipLichid);
    const resolvedTipLichid =
      data.tipLichid?.trim() ||
      (isLiquid ? await this.resolveSubcatTipLichid(data.categorie, data.subcategorie) : null) ||
      null;

    const { articol, intrare, componenteGarantie } = await this.prisma.$transaction(async (tx) => {
      // 1. Căutare inteligentă articol master existent
      let art: any = null;

      if (data.articolStocId) {
        art = await tx.articolStoc.findUnique({ where: { id: data.articolStocId } });
      }

      if (!art && data.codArticol) {
        art = await tx.articolStoc.findFirst({
          where: { codArticol: data.codArticol, depozitId: depozitIdFinal },
        });
      }

      if (!art && isLiquid && data.categorie && data.subcategorie) {
        art = await tx.articolStoc.findFirst({
          where: {
            depozitId: depozitIdFinal,
            categorie: data.categorie,
            subcategorie: data.subcategorie,
            ...(resolvedTipLichid ? { OR: [{ tipLichid: resolvedTipLichid }, { tipLichid: null }] } : {}),
          },
        });
      }

      if (!art && isLiquid && data.categorie && !data.subcategorie) {
        art = await tx.articolStoc.findFirst({
          where: {
            depozitId: depozitIdFinal,
            categorie: data.categorie,
            denumire: data.denumire,
          },
        });
      }

      if (art) {
        art = await tx.articolStoc.update({
          where: { id: art.id },
          data: {
            stocCurent: Number((Number(art.stocCurent || 0) + cantitate).toFixed(4)),
            pretUnitar,
            subcategorie: data.subcategorie || art.subcategorie,
            tipLichid: resolvedTipLichid || art.tipLichid,
            marcaUlei: data.marcaUlei || art.marcaUlei,
            esteSerializat: data.areGarantie || art.esteSerializat,
          },
        });
      } else {
        const catCustom = await tx.categorieStoc.findUnique({ where: { nume: data.categorie } });
        const stocMinimImplicit = catCustom ? catCustom.stocMinimImplicit : (isLiquid ? 20 : 5);

        art = await tx.articolStoc.create({
          data: {
            codArticol: data.codArticol,
            denumire: data.denumire,
            categorie: data.categorie,
            subcategorie: data.subcategorie,
            tipLichid: resolvedTipLichid,
            stocCurent: cantitate,
            stocMinim: stocMinimImplicit,
            pretUnitar,
            unitateMasura: data.unitateMasura || (isLiquid ? 'L' : 'buc'),
            esteSerializat: !!data.areGarantie,
            depozitId: depozitIdFinal,
            marcaUlei: data.marcaUlei,
          },
        });
      }

      // 2. Înregistrăm lotul FIFO în registrul de intrări
      const intr = await tx.intrareStoc.create({
        data: {
          articolStocId: art.id,
          depozitId: depozitIdFinal,
          tipLichid: resolvedTipLichid,
          marcaUlei: data.marcaUlei,
          furnizor: data.furnizor,
          numarFactura: data.numarFactura,
          dataFactura: dataFacturaDate,
          cantitateIntrata: cantitate,
          cantitateRamasa: cantitate,
          pretUnitar,
          pretTotal: pretTotalFinal,
          observatii: data.observatii,
          motivReceptieManuala: motivManual,
        },
      });

      // 3. Creare Componente Serializate (câte una per bucată pentru articole non-fluide cu cantitate > 1)
      const compList: any[] = [];
      if (data.areGarantie) {
        const umNorm = String(data.unitateMasura || art.unitateMasura || 'buc').trim().toLowerCase();
        const isBulkUnit = isLiquid || ['l', 'litri', 'litru', 'kg', 'm', 'mp', 'mc'].includes(umNorm);
        const serialCount = isBulkUnit ? 1 : Math.max(1, Math.round(cantitate));
        const rawSerials = String(data.serieUnica || '')
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const tsSuffix = Date.now().toString().slice(-6);
        const luniGarantie = data.durataGarantieLuni ? Number(data.durataGarantieLuni) : 24;
        const kilometriGarantie = data.durataGarantieRulaj ? Number(data.durataGarantieRulaj) : 2000;

        for (let i = 0; i < serialCount; i++) {
          let serieUnicaFinal: string;
          if (rawSerials.length >= serialCount) {
            serieUnicaFinal = rawSerials[i];
          } else if (rawSerials.length === 1 && serialCount === 1) {
            serieUnicaFinal = rawSerials[0];
          } else if (rawSerials.length === 1 && serialCount > 1) {
            serieUnicaFinal = `${rawSerials[0]}-${String(i + 1).padStart(2, '0')}`;
          } else {
            serieUnicaFinal =
              serialCount > 1
                ? `SN-${data.codArticol}-${tsSuffix}-${String(i + 1).padStart(2, '0')}`
                : `SN-${data.codArticol}-${tsSuffix}`;
          }

          const comp = await tx.componentaSerializata.upsert({
            where: { serieUnica: serieUnicaFinal },
            update: {
              articolStocId: art.id,
              dataAchizitie: dataFacturaDate,
              luniGarantie,
              kilometriGarantie,
            },
            create: {
              articolStocId: art.id,
              serieUnica: serieUnicaFinal,
              dataAchizitie: dataFacturaDate,
              luniGarantie,
              kilometriGarantie,
              stare: 'IN_STOC',
            },
          });
          compList.push(comp);
        }
      }

      return { articol: art, intrare: intr, componenteGarantie: compList };
    });

    const depozit = depozitIdFinal
      ? await this.prisma.depozit.findUnique({ where: { id: depozitIdFinal } })
      : null;

    return {
      mesaj: `Recepție marfă înregistrată! ${cantitate} ${articol.unitateMasura} de "${articol.denumire}" (Preț unitar: ${pretUnitar} RON) adăugate în ${depozit?.nume || 'Depozit Central'}.${data.areGarantie ? ` Garanție producător activată (${componenteGarantie.length} ${componenteGarantie.length === 1 ? 'serie' : 'serii'})!` : ''}`,
      articol,
      intrare,
      pretUnitar,
      componentaGarantie: componenteGarantie[0] || null,
      componenteGarantie,
    };
  }

  // ==========================================
  // MOTOR DE CONSUM FIFO (FIRST-IN, FIRST-OUT)
  // Consumă atomic din cele mai vechi loturi de intrare și deduce stocul curent
  // ==========================================
  async consumaStocFIFO(
    articolStocId: string,
    cantitateDeConsumat: number,
    tx?: Prisma.TransactionClient,
    preferredLot?: { numarFactura?: string | null; pretUnitar?: number | null },
  ) {
    if (!tx) {
      return this.prisma.$transaction((innerTx) =>
        this.consumaStocFIFO(articolStocId, cantitateDeConsumat, innerTx, preferredLot),
      );
    }

    const cantitate = Number(cantitateDeConsumat);
    if (!Number.isFinite(cantitate) || cantitate <= 0) {
      throw new BadRequestException('Cantitatea de consumat trebuie să fie mai mare ca 0.');
    }

    const articol = await tx.articolStoc.findUnique({
      where: { id: articolStocId },
    });
    if (!articol) throw new NotFoundException('Articolul din stoc nu a fost găsit.');

    const stocDisponibilFizic = Number(articol.stocCurent || 0);
    if (stocDisponibilFizic + 0.0001 < cantitate) {
      throw new BadRequestException(
        `Stoc insuficient pentru "${articol.denumire}"! Stoc curent: ${stocDisponibilFizic} ${articol.unitateMasura}, solicitat: ${cantitate} ${articol.unitateMasura}.`,
      );
    }

    // 1. Căutăm toate loturile cu stoc disponibil pentru acest articol, ordonate FIFO (cele mai vechi primele)
    const loturi = await tx.intrareStoc.findMany({
      where: {
        articolStocId,
        cantitateIntrata: { gt: 0 },
        OR: [
          { cantitateRamasa: { gt: 0 } },
          { cantitateRamasa: null },
        ],
      },
      orderBy: [
        { dataFactura: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Dacă utilizatorul a selectat explicit un lot (factură / preț) pe deviz, îl consumăm cu prioritate
    if (preferredLot?.numarFactura) {
      const targetFact = preferredLot.numarFactura.trim().toLowerCase();
      const targetPret =
        preferredLot.pretUnitar !== undefined && preferredLot.pretUnitar !== null
          ? Number(preferredLot.pretUnitar)
          : null;
      loturi.sort((a, b) => {
        const aMatchFact = (a.numarFactura || '').trim().toLowerCase() === targetFact ? 1 : 0;
        const bMatchFact = (b.numarFactura || '').trim().toLowerCase() === targetFact ? 1 : 0;
        if (aMatchFact !== bMatchFact) return bMatchFact - aMatchFact;
        if (aMatchFact === 1 && targetPret !== null) {
          const aDiff = Math.abs(Number(a.pretUnitar || 0) - targetPret);
          const bDiff = Math.abs(Number(b.pretUnitar || 0) - targetPret);
          if (Math.abs(aDiff - bDiff) > 0.005) return aDiff - bDiff;
        }
        return 0;
      });
    }

    let cantitateRamasaDeConsumat = cantitate;
    let costTotalConsum = 0;
    const loturiConsumate: Array<{
      intrareId: string;
      intrareStocId: string;
      furnizor: string;
      numarFactura: string;
      dataFactura: Date;
      cantitateLuata: number;
      pretUnitar: number;
      costLot: number;
    }> = [];

    for (const lot of loturi) {
      if (cantitateRamasaDeConsumat <= 0.0001) break;

      const stocLot =
        lot.cantitateRamasa !== null && lot.cantitateRamasa !== undefined
          ? Number(lot.cantitateRamasa)
          : Number(lot.cantitateIntrata);

      if (stocLot <= 0) continue;

      const luamDinLot = Number(Math.min(cantitateRamasaDeConsumat, stocLot).toFixed(4));
      const costLot = Number((luamDinLot * lot.pretUnitar).toFixed(2));

      costTotalConsum += costLot;
      cantitateRamasaDeConsumat = Number((cantitateRamasaDeConsumat - luamDinLot).toFixed(4));

      const nouaCantitateRamasaLot = Math.max(0, Number((stocLot - luamDinLot).toFixed(4)));

      await tx.intrareStoc.update({
        where: { id: lot.id },
        data: { cantitateRamasa: nouaCantitateRamasaLot },
      });

      loturiConsumate.push({
        intrareId: lot.id,
        intrareStocId: lot.id,
        furnizor: lot.furnizor,
        numarFactura: lot.numarFactura,
        dataFactura: lot.dataFactura,
        cantitateLuata: luamDinLot,
        pretUnitar: lot.pretUnitar,
        costLot,
      });
    }

    if (cantitateRamasaDeConsumat > 0.0001) {
      const costExtra = Number((cantitateRamasaDeConsumat * (articol.pretUnitar || 0)).toFixed(2));
      costTotalConsum += costExtra;
    }

    // 2. Scădem din stocul total al articolului (stocCurent >= cantitate a fost deja validat mai sus)
    const noulStocCurent = Math.max(0, Number((stocDisponibilFizic - cantitate).toFixed(4)));
    await tx.articolStoc.update({
      where: { id: articol.id },
      data: { stocCurent: noulStocCurent },
    });

    const pretUnitarMediu = Number((costTotalConsum / cantitate).toFixed(2));

    return {
      articolId: articol.id,
      denumire: articol.denumire,
      cantitateConsumata: cantitate,
      stocCurentRamas: noulStocCurent,
      costTotal: Number(costTotalConsum.toFixed(2)),
      pretUnitarMediu,
      loturiConsumate,
    };
  }

  // Restituire atomică stoc în depozitul original + refacere cantitateRamasa pe loturile FIFO
  async restituieStocFIFO(
    articolStocId: string,
    cantitateDeRestituit: number,
    hint?: string | number | null,
    tx?: Prisma.TransactionClient,
  ) {
    if (!tx) {
      return this.prisma.$transaction((innerTx) =>
        this.restituieStocFIFO(articolStocId, cantitateDeRestituit, hint, innerTx),
      );
    }

    const cantitate = Number(cantitateDeRestituit || 0);
    if (!Number.isFinite(cantitate) || cantitate <= 0) return null;

    const articol = await tx.articolStoc.findUnique({ where: { id: articolStocId } });
    if (!articol) return null;

    const loturi = await tx.intrareStoc.findMany({
      where: {
        articolStocId,
        cantitateIntrata: { gt: 0 },
      },
      orderBy: [
        { dataFactura: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const isStringHint = typeof hint === 'string' && hint.trim().length > 0;
    const isPriceHint = typeof hint === 'number' && Number.isFinite(hint) && hint > 0;

    const facturiHint = isStringHint
      ? new Set(
          hint
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
        )
      : new Set<string>();

    // Prioritizăm loturile care corespund facturii sau prețului unitar hint, apoi cele mai recente loturi
    const loturiOrdonate = [...loturi].sort((a, b) => {
      if (isStringHint) {
        const aMatch = facturiHint.has(String(a.numarFactura || '').trim().toLowerCase()) ? 0 : 1;
        const bMatch = facturiHint.has(String(b.numarFactura || '').trim().toLowerCase()) ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      } else if (isPriceHint) {
        const aDiff = Math.abs(Number(a.pretUnitar || 0) - Number(hint));
        const bDiff = Math.abs(Number(b.pretUnitar || 0) - Number(hint));
        const aMatch = aDiff < 0.02 ? 0 : 1;
        const bMatch = bDiff < 0.02 ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      return new Date(b.dataFactura).getTime() - new Date(a.dataFactura).getTime();
    });

    let ramasDeRestituit = cantitate;
    for (const lot of loturiOrdonate) {
      if (ramasDeRestituit <= 0.0001) break;
      const intrata = Number(lot.cantitateIntrata || 0);
      const ramasa =
        lot.cantitateRamasa !== null && lot.cantitateRamasa !== undefined
          ? Number(lot.cantitateRamasa)
          : intrata;
      const capacitateRestituire = Math.max(0, Number((intrata - ramasa).toFixed(4)));
      if (capacitateRestituire <= 0) continue;

      const deAdaugat = Number(Math.min(ramasDeRestituit, capacitateRestituire).toFixed(4));
      await tx.intrareStoc.update({
        where: { id: lot.id },
        data: { cantitateRamasa: Number((ramasa + deAdaugat).toFixed(4)) },
      });
      ramasDeRestituit = Number((ramasDeRestituit - deAdaugat).toFixed(4));
    }

    // Plasă de siguranță: dacă nu au existat suficiente loturi consumate, creăm un lot de restituire
    // pentru a păstra mereu SUM(IntrareStoc.cantitateRamasa) === ArticolStoc.stocCurent
    if (ramasDeRestituit > 0.0001) {
      const pretRestituire = isPriceHint ? Number(hint) : Number(articol.pretUnitar || 0);
      await tx.intrareStoc.create({
        data: {
          articolStocId: articol.id,
          depozitId: articol.depozitId,
          tipLichid: articol.tipLichid,
          marcaUlei: articol.marcaUlei,
          furnizor: 'Restituire Stoc',
          numarFactura: isStringHint ? hint.trim() : 'RESTITUIRE',
          dataFactura: new Date(),
          cantitateIntrata: ramasDeRestituit,
          cantitateRamasa: ramasDeRestituit,
          pretUnitar: pretRestituire,
          pretTotal: Number((ramasDeRestituit * pretRestituire).toFixed(2)),
          observatii: 'Lot creat automat la restituire stoc FIFO',
        },
      });
    }

    const noulStocCurent = Number((Number(articol.stocCurent || 0) + cantitate).toFixed(4));
    await tx.articolStoc.update({
      where: { id: articolStocId },
      data: { stocCurent: noulStocCurent },
    });

    return {
      articolId: articol.id,
      depozitId: articol.depozitId,
      cantitateRestituita: cantitate,
      stocCurentNou: noulStocCurent,
    };
  }

  // Obține loturile active FIFO pentru un articol de stoc
  async getLoturiArticol(articolStocId: string) {
    return this.prisma.intrareStoc.findMany({
      where: { articolStocId },
      orderBy: [
        { dataFactura: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async getIstoricIntrari(cautare?: string) {
    const tokens = (cautare || '').trim().split(/\s+/).filter(Boolean);
    const where: any =
      tokens.length > 0
        ? {
            AND: tokens.map((token) => ({
              OR: [
                { furnizor: { contains: token, mode: 'insensitive' } },
                { numarFactura: { contains: token, mode: 'insensitive' } },
                { observatii: { contains: token, mode: 'insensitive' } },
                { motivReceptieManuala: { contains: token, mode: 'insensitive' } },
                { marcaUlei: { contains: token, mode: 'insensitive' } },
                { articolStoc: { denumire: { contains: token, mode: 'insensitive' } } },
                { articolStoc: { codArticol: { contains: token, mode: 'insensitive' } } },
              ],
            })),
          }
        : {};

    return this.prisma.intrareStoc.findMany({
      where,
      include: { articolStoc: true, depozit: true },
      orderBy: { dataFactura: 'desc' },
    });
  }

  // ==========================================
  // 6. COMPONENTE SERIALIZATE & GARANȚII ACTIVE
  // ==========================================

  async getComponenteSerializate() {
    const componente = await this.prisma.componentaSerializata.findMany({
      include: {
        articolStoc: {
          include: {
            depozit: true,
            intrariStoc: {
              orderBy: { dataFactura: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Excludem anvelopele din registrul de garanții piese atelier
    const nonTireComponente = componente.filter(
      (c) =>
        !isTireItem({
          categorie: c.articolStoc?.categorie,
          subcategorie: c.articolStoc?.subcategorie,
          denumire: c.articolStoc?.denumire,
          codArticol: c.articolStoc?.codArticol,
        }),
    );

    const vehiculIds = Array.from(
      new Set(nonTireComponente.map((c) => c.vehiculId).filter((id): id is string => Boolean(id))),
    );

    const vehicule =
      vehiculIds.length > 0
        ? await this.prisma.vehicul.findMany({
            where: { id: { in: vehiculIds } },
            select: {
              id: true,
              numarIntern: true,
              numarInmatriculare: true,
              categorieEnum: true,
            },
          })
        : [];

    const vehiculMap = new Map(vehicule.map((v) => [v.id, v]));

    return nonTireComponente.map((c) => ({
      ...c,
      vehicul: c.vehiculId ? vehiculMap.get(c.vehiculId) || null : null,
    }));
  }

  async demonteazaComponenta(
    input:
      | string
      | {
          componentaId?: string;
          serieUnica?: string;
          mecanic?: string;
          motivDemontare?: string;
        },
    mecanicArg?: string,
    motivDemontareArg?: string,
  ) {
    const params =
      typeof input === 'string'
        ? { serieUnica: input, mecanic: mecanicArg, motivDemontare: motivDemontareArg }
        : input || {};

    const componentaId = params.componentaId?.trim();
    const serieUnica = params.serieUnica?.trim();
    const motivDemontare = params.motivDemontare?.trim();

    if (!componentaId && !serieUnica) {
      throw new BadRequestException('Specificați componentaId sau serieUnica.');
    }

    return this.prisma.$transaction(async (tx) => {
      const componenta = componentaId
        ? await tx.componentaSerializata.findUnique({
            where: { id: componentaId },
            include: { articolStoc: true },
          })
        : await tx.componentaSerializata.findUnique({
            where: { serieUnica: serieUnica! },
            include: { articolStoc: true },
          });

      if (!componenta) throw new NotFoundException('Componenta nu a fost găsită.');

      if (componenta.stare === 'DEFECT' || componenta.stare === 'CASAT') {
        throw new BadRequestException(`Componenta ${componenta.serieUnica} este deja marcată ca ${componenta.stare}.`);
      }

      // Dacă piesa era încă IN_STOC și este scoasă/casată ca DEFECT, verificăm rezervările active și scădem 1 buc prin FIFO atomic
      if (componenta.stare === 'IN_STOC' && componenta.articolStocId) {
        const reservedMap = await this.getReservedStockMap(undefined, tx);
        const reservedQty = reservedMap.get(componenta.articolStocId) || 0;
        const stocCurent = Number(componenta.articolStoc?.stocCurent || 0);
        if (stocCurent - 1 < reservedQty - 0.0001) {
          throw new BadRequestException(
            `Componenta "${componenta.serieUnica}" nu poate fi scoasă din stoc deoarece există ${reservedQty} ${componenta.articolStoc?.unitateMasura || 'buc'} rezervate în comenzi de lucru deschise (stoc fizic: ${stocCurent}).`,
          );
        }
        await this.consumaStocFIFO(componenta.articolStocId, 1, tx);
      }

      const defectNote = motivDemontare
        ? [componenta.pozitieMontaj, `DEFECT: ${motivDemontare}`].filter(Boolean).join(' • ')
        : componenta.pozitieMontaj;

      await tx.componentaSerializata.update({
        where: { id: componenta.id },
        data: {
          stare: 'DEFECT',
          ...(defectNote ? { pozitieMontaj: defectNote } : {}),
        },
      });

      let esteInGarantie = false;
      if (componenta.luniGarantie && componenta.dataAchizitie) {
        const expDate = new Date(componenta.dataAchizitie);
        expDate.setMonth(expDate.getMonth() + Number(componenta.luniGarantie));
        esteInGarantie = expDate.getTime() >= Date.now();
      }

      return {
        mesaj: `Piesa ${componenta.serieUnica} marcată ca DEFECTĂ (${esteInGarantie ? 'în termen de garanție' : 'garanție expirată / neverificată'}).`,
        esteInGarantie,
      };
    });
  }
}
