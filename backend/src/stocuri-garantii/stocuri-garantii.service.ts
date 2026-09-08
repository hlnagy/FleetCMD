import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
          { nume: 'Depozit Central Atelier', adresa: 'Sediu Central', responsabil: 'Brașoveanu Virgil (Șef Atelier)' },
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

    return depozite;
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

    for (const c of categoriiInit) {
      let cat = await this.prisma.categorieStoc.findUnique({ where: { nume: c.nume } });
      if (!cat) {
        cat = await this.prisma.categorieStoc.create({
          data: {
            nume: c.nume,
            descriere: c.descriere,
            stocMinimImplicit: c.stocMinimImplicit,
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
            },
          });
        }
      }
    }
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

    const dbSubcats = await this.prisma.subcategorieStoc.findMany();

    return { categoriiImplicite: [], categoriiCustom, subcategoriiExistente: dbSubcats };
  }

  async createCategorie(data: { nume: string; descriere?: string; stocMinimImplicit?: number; esteFluid?: boolean }) {
    if (!data.nume) throw new BadRequestException('Numele categoriei este obligatoriu.');
    const isFluid = data.esteFluid !== undefined 
      ? Boolean(data.esteFluid) 
      : /lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(data.nume);

    return this.prisma.categorieStoc.create({
      data: {
        nume: data.nume.trim(),
        descriere: data.descriere?.trim() || null,
        stocMinimImplicit: data.stocMinimImplicit ? Number(data.stocMinimImplicit) : (isFluid ? 20 : 5),
        esteFluid: isFluid,
      },
      include: { subcategorii: true },
    });
  }

  async updateCategorie(id: string, data: { nume?: string; descriere?: string; stocMinimImplicit?: number; esteFluid?: boolean }) {
    const existing = await this.prisma.categorieStoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Categoria nu a fost găsită.');

    const updated = await this.prisma.categorieStoc.update({
      where: { id },
      data: {
        nume: data.nume ? data.nume.trim() : undefined,
        descriere: data.descriere !== undefined ? (data.descriere?.trim() || null) : undefined,
        stocMinimImplicit: data.stocMinimImplicit !== undefined ? Number(data.stocMinimImplicit) : undefined,
        esteFluid: data.esteFluid !== undefined ? Boolean(data.esteFluid) : undefined,
      },
      include: { subcategorii: true },
    });

    if (data.nume && data.nume.trim() !== existing.nume) {
      await this.prisma.articolStoc.updateMany({
        where: { categorie: existing.nume },
        data: { categorie: data.nume.trim() },
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

  async createSubcategorie(data: { categorieStocId?: string; categorieNume?: string; nume: string; descriere?: string }) {
    if (!data.nume) throw new BadRequestException('Numele subcategoriei este obligatoriu.');
    
    let catId = data.categorieStocId;
    if (!catId && data.categorieNume) {
      let cat = await this.prisma.categorieStoc.findUnique({ where: { nume: data.categorieNume } });
      if (!cat) {
        cat = await this.prisma.categorieStoc.create({ data: { nume: data.categorieNume } });
      }
      catId = cat.id;
    }

    return this.prisma.subcategorieStoc.create({
      data: {
        nume: data.nume.trim(),
        descriere: data.descriere?.trim() || null,
        categorieStocId: catId || null,
      },
    });
  }

  async updateSubcategorie(id: string, data: { nume?: string; descriere?: string; categorieStocId?: string }) {
    const existing = await this.prisma.subcategorieStoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Subcategoria nu a fost găsită.');

    const updated = await this.prisma.subcategorieStoc.update({
      where: { id },
      data: {
        nume: data.nume ? data.nume.trim() : undefined,
        descriere: data.descriere !== undefined ? (data.descriere?.trim() || null) : undefined,
        categorieStocId: data.categorieStocId !== undefined ? data.categorieStocId : undefined,
      },
    });

    if (data.nume && data.nume.trim() !== existing.nume) {
      await this.prisma.articolStoc.updateMany({
        where: { subcategorie: existing.nume },
        data: { subcategorie: data.nume.trim() },
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
  }) {
    const cantitate = Number(data.cantitate);
    if (cantitate <= 0) throw new BadRequestException('Cantitatea de transferat trebuie să fie mai mare ca 0.');

    const articolSursa = await this.prisma.articolStoc.findUnique({
      where: { id: data.articolStocId },
      include: { depozit: true },
    });

    if (!articolSursa) throw new NotFoundException('Articolul sursă nu a fost găsit.');

    if (articolSursa.stocCurent < cantitate) {
      throw new BadRequestException(
        `Stoc insuficient în ${articolSursa.depozit?.nume || 'Depozitul Sursă'}! Stoc disponibil: ${articolSursa.stocCurent} ${articolSursa.unitateMasura}, ați solicitat ${cantitate} ${articolSursa.unitateMasura}.`
      );
    }

    if (articolSursa.depozitId === data.depozitDestinatieId) {
      throw new BadRequestException('Depozitul destinație trebuie să fie diferit de depozitul sursă.');
    }

    const depozitDestinatie = await this.prisma.depozit.findUnique({
      where: { id: data.depozitDestinatieId },
    });
    if (!depozitDestinatie) throw new NotFoundException('Depozitul destinație nu a fost găsit.');

    // 1. Scădem din stocul sursă
    await this.prisma.articolStoc.update({
      where: { id: articolSursa.id },
      data: { stocCurent: articolSursa.stocCurent - cantitate },
    });

    // 2. Căutăm sau creăm articolul în depozitul destinație
    let articolDestinatie = await this.prisma.articolStoc.findFirst({
      where: {
        codArticol: articolSursa.codArticol,
        depozitId: data.depozitDestinatieId,
      },
    });

    if (articolDestinatie) {
      articolDestinatie = await this.prisma.articolStoc.update({
        where: { id: articolDestinatie.id },
        data: { stocCurent: articolDestinatie.stocCurent + cantitate },
      });
    } else {
      articolDestinatie = await this.prisma.articolStoc.create({
        data: {
          codArticol: articolSursa.codArticol,
          denumire: articolSursa.denumire,
          categorie: articolSursa.categorie,
          subcategorie: articolSursa.subcategorie,
          marcaUlei: articolSursa.marcaUlei,
          pretUnitar: articolSursa.pretUnitar,
          unitateMasura: articolSursa.unitateMasura,
          stocMinim: articolSursa.stocMinim,
          stocCurent: cantitate,
          depozitId: data.depozitDestinatieId,
        },
      });
    }

    // 3. Înregistrăm log-ul de transfer
    const transferLog = await this.prisma.transferStoc.create({
      data: {
        articolStocId: articolSursa.id,
        depozitSursaId: articolSursa.depozitId || data.depozitDestinatieId,
        depozitDestinatieId: data.depozitDestinatieId,
        cantitateTransferata: cantitate,
        operator: data.operator || 'Brașoveanu Virgil (Șef Atelier)',
        observatii: data.observatii,
      },
    });

    return {
      mesaj: ` Transfer parțial efectuat cu succes! Au fost transferate ${cantitate} ${articolSursa.unitateMasura} de "${articolSursa.denumire}" din ${articolSursa.depozit?.nume || 'Depozitul Sursă'} în ${depozitDestinatie.nume}.`,
      transferLog,
      stocSursaNou: articolSursa.stocCurent - cantitate,
      stocDestinatieNou: articolDestinatie.stocCurent,
    };
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
    const where: any = {};

    if (filters?.categorie) {
      const catVal = filters.categorie.trim();
      const firstWord = catVal.split(' ')[0];
      where.OR = [
        { categorie: { equals: catVal } },
        { categorie: { contains: catVal } },
        { categorie: { contains: firstWord } },
      ];
    }

    if (filters?.subcategorie) {
      where.subcategorie = filters.subcategorie;
    }

    if (filters?.depozitId) {
      const depozite = await this.getDepozite();
      const mainDepozitId = depozite[0]?.id;
      if (mainDepozitId && filters.depozitId === mainDepozitId) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { depozitId: filters.depozitId },
              { depozitId: null },
            ],
          },
        ];
      } else {
        where.depozitId = filters.depozitId;
      }
    }

    if (filters?.cautare) {
      const q = filters.cautare.toLowerCase();
      where.OR = [
        { codArticol: { contains: q } },
        { denumire: { contains: q } },
        { marcaUlei: { contains: q } },
        { categorie: { contains: q } },
        { subcategorie: { contains: q } },
      ];
    }

    const articole = await this.prisma.articolStoc.findMany({
      where,
      include: { depozit: true },
      orderBy: { denumire: 'asc' },
    });

    if (filters?.statusStoc === 'CRITIC') {
      return articole.filter((a) => a.stocCurent <= a.stocMinim);
    } else if (filters?.statusStoc === 'IN_STOC') {
      return articole.filter((a) => a.stocCurent > a.stocMinim);
    }

    return articole;
  }

  async getStocuriCritice() {
    const articole = await this.prisma.articolStoc.findMany({
      include: { depozit: true },
    });
    const critice = articole.filter((a) => a.stocCurent <= a.stocMinim);
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
    stocCurent: number;
    stocMinim?: number;
    pretUnitar: number;
    unitateMasura?: string;
    esteSerializat?: boolean;
    depozitId?: string;
    marcaUlei?: string;
  }) {
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

    return this.prisma.articolStoc.create({
      data: {
        codArticol: data.codArticol,
        denumire: data.denumire,
        categorie: data.categorie,
        subcategorie: data.subcategorie,
        stocCurent: Number(data.stocCurent),
        stocMinim: Number(stocMinimFinal),
        pretUnitar: Number(data.pretUnitar),
        unitateMasura: data.unitateMasura || 'buc',
        esteSerializat: !!data.esteSerializat,
        depozitId: depozitIdFinal,
        marcaUlei: data.marcaUlei,
      },
    });
  }

  async updateArticolStoc(id: string, data: any) {
    return this.prisma.articolStoc.update({
      where: { id },
      data: {
        codArticol: data.codArticol !== undefined ? data.codArticol : undefined,
        denumire: data.denumire !== undefined ? data.denumire : undefined,
        categorie: data.categorie !== undefined ? data.categorie : undefined,
        subcategorie: data.subcategorie !== undefined ? data.subcategorie : undefined,
        stocCurent: data.stocCurent !== undefined ? Number(data.stocCurent) : undefined,
        stocMinim: data.stocMinim !== undefined ? Number(data.stocMinim) : undefined,
        pretUnitar: data.pretUnitar !== undefined ? Number(data.pretUnitar) : undefined,
        unitateMasura: data.unitateMasura !== undefined ? data.unitateMasura : undefined,
        depozitId: data.depozitId !== undefined ? data.depozitId : undefined,
        marcaUlei: data.marcaUlei !== undefined ? data.marcaUlei : undefined,
      },
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
    articolStocId?: string;

    areGarantie?: boolean;
    serieUnica?: string;
    durataGarantieLuni?: number;
    durataGarantieRulaj?: number;
  }) {
    const cantitate = Number(data.cantitate);
    const pretTotal = Number(data.pretTotal);
    if (cantitate <= 0) throw new BadRequestException('Cantitatea trebuie să fie mai mare ca 0.');

    const pretUnitar = Number((pretTotal / cantitate).toFixed(2));

    let depozitIdFinal = data.depozitId;
    if (!depozitIdFinal) {
      const depozite = await this.getDepozite();
      depozitIdFinal = depozite[0]?.id;
    }

    const isLiquid = this.esteCategorieLichid(data.categorie, data.subcategorie, data.unitateMasura);

    // 1. Căutare inteligentă articol master existent:
    // a) După ID direct (dacă a fost selectat)
    // b) După Cod Articol în depozit
    // c) Pentru fluide/uleiuri/antigel: după Categorie + Subcategorie identice în depozit!
    let articol: any = null;

    if (data.articolStocId) {
      articol = await this.prisma.articolStoc.findUnique({ where: { id: data.articolStocId } });
    }

    if (!articol && data.codArticol) {
      articol = await this.prisma.articolStoc.findFirst({
        where: { codArticol: data.codArticol, depozitId: depozitIdFinal },
      });
    }

    if (!articol && isLiquid && data.categorie && data.subcategorie) {
      articol = await this.prisma.articolStoc.findFirst({
        where: {
          depozitId: depozitIdFinal,
          categorie: data.categorie,
          subcategorie: data.subcategorie,
        },
      });
    }

    if (!articol && isLiquid && data.categorie && !data.subcategorie) {
      articol = await this.prisma.articolStoc.findFirst({
        where: {
          depozitId: depozitIdFinal,
          categorie: data.categorie,
          denumire: data.denumire,
        },
      });
    }

    if (articol) {
      // CONSOLIDARE STOC PE CATEGORIE / SUBCATEGORIE
      articol = await this.prisma.articolStoc.update({
        where: { id: articol.id },
        data: {
          stocCurent: articol.stocCurent + cantitate,
          pretUnitar,
          subcategorie: data.subcategorie || articol.subcategorie,
          marcaUlei: data.marcaUlei || articol.marcaUlei,
          esteSerializat: data.areGarantie || articol.esteSerializat,
        },
      });
    } else {
      const catCustom = await this.prisma.categorieStoc.findUnique({ where: { nume: data.categorie } });
      const stocMinimImplicit = catCustom ? catCustom.stocMinimImplicit : (isLiquid ? 20 : 5);

      articol = await this.prisma.articolStoc.create({
        data: {
          codArticol: data.codArticol,
          denumire: data.denumire,
          categorie: data.categorie,
          subcategorie: data.subcategorie,
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

    // Înregistrăm lotul FIFO în registrul de intrări
    const intrare = await this.prisma.intrareStoc.create({
      data: {
        articolStocId: articol.id,
        depozitId: depozitIdFinal,
        tipLichid: data.tipLichid,
        marcaUlei: data.marcaUlei,
        furnizor: data.furnizor,
        numarFactura: data.numarFactura,
        dataFactura: data.dataFactura ? new Date(data.dataFactura) : new Date(),
        cantitateIntrata: cantitate,
        cantitateRamasa: cantitate,
        pretUnitar,
        pretTotal,
        observatii: data.observatii,
      },
    });

    let componentaGarantie = null;
    if (data.areGarantie) {
      const serieUnicaFinal = data.serieUnica || `SN-${data.codArticol}-${Date.now().toString().substring(6)}`;
      componentaGarantie = await this.prisma.componentaSerializata.upsert({
        where: { serieUnica: serieUnicaFinal },
        update: {
          luniGarantie: data.durataGarantieLuni ? Number(data.durataGarantieLuni) : 24,
          kilometriGarantie: data.durataGarantieRulaj ? Number(data.durataGarantieRulaj) : 2000,
        },
        create: {
          articolStocId: articol.id,
          serieUnica: serieUnicaFinal,
          luniGarantie: data.durataGarantieLuni ? Number(data.durataGarantieLuni) : 24,
          kilometriGarantie: data.durataGarantieRulaj ? Number(data.durataGarantieRulaj) : 2000,
          stare: 'IN_STOC',
        },
      });
    }

    const depozit = await this.prisma.depozit.findUnique({ where: { id: depozitIdFinal } });

    return {
      mesaj: `Recepție marfă înregistrată! ${cantitate} ${articol.unitateMasura} de "${articol.denumire}" (Preț unitar: ${pretUnitar} RON) adăugate în ${depozit?.nume || 'Depozit Central'}.${data.areGarantie ? '  Garanție producător activată în registru!' : ''}`,
      articol,
      intrare,
      pretUnitar,
      componentaGarantie,
    };
  }

  // ==========================================
  // MOTOR DE CONSUM FIFO (FIRST-IN, FIRST-OUT)
  // Consumă din cele mai vechi loturi de intrare și deduce stocul curent
  // ==========================================
  async consumaStocFIFO(articolStocId: string, cantitateDeConsumat: number) {
    const cantitate = Number(cantitateDeConsumat);
    if (cantitate <= 0) throw new BadRequestException('Cantitatea de consumat trebuie să fie mai mare ca 0.');

    const articol = await this.prisma.articolStoc.findUnique({
      where: { id: articolStocId },
    });
    if (!articol) throw new NotFoundException('Articolul din stoc nu a fost găsit.');

    // 1. Căutăm toate loturile cu stoc disponibil pentru acest articol, ordonate FIFO (cele mai vechi primele)
    const loturi = await this.prisma.intrareStoc.findMany({
      where: {
        articolStocId,
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

    let cantitateRamasaDeConsumat = cantitate;
    let costTotalConsum = 0;
    const loturiConsumate: Array<{
      intrareId: string;
      furnizor: string;
      numarFactura: string;
      dataFactura: Date;
      cantitateLuata: number;
      pretUnitar: number;
      costLot: number;
    }> = [];

    for (const lot of loturi) {
      if (cantitateRamasaDeConsumat <= 0) break;

      const stocLot = lot.cantitateRamasa !== null && lot.cantitateRamasa !== undefined
        ? Number(lot.cantitateRamasa)
        : Number(lot.cantitateIntrata);

      if (stocLot <= 0) continue;

      const luamDinLot = Math.min(cantitateRamasaDeConsumat, stocLot);
      const costLot = Number((luamDinLot * lot.pretUnitar).toFixed(2));

      costTotalConsum += costLot;
      cantitateRamasaDeConsumat -= luamDinLot;

      const nouaCantitateRamasaLot = Number((stocLot - luamDinLot).toFixed(2));

      await this.prisma.intrareStoc.update({
        where: { id: lot.id },
        data: { cantitateRamasa: Math.max(0, nouaCantitateRamasaLot) },
      });

      loturiConsumate.push({
        intrareId: lot.id,
        furnizor: lot.furnizor,
        numarFactura: lot.numarFactura,
        dataFactura: lot.dataFactura,
        cantitateLuata: luamDinLot,
        pretUnitar: lot.pretUnitar,
        costLot,
      });
    }

    if (cantitateRamasaDeConsumat > 0) {
      const costExtra = Number((cantitateRamasaDeConsumat * (articol.pretUnitar || 0)).toFixed(2));
      costTotalConsum += costExtra;
    }

    // 2. Scădem din stocul total al articolului
    const noulStocCurent = Math.max(0, Number((articol.stocCurent - cantitate).toFixed(2)));
    await this.prisma.articolStoc.update({
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
    const where: any = {};
    if (cautare) {
      const q = cautare.toLowerCase();
      where.OR = [
        { furnizor: { contains: q } },
        { numarFactura: { contains: q } },
        { articolStoc: { denumire: { contains: q } } },
        { articolStoc: { codArticol: { contains: q } } },
      ];
    }

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
    return this.prisma.componentaSerializata.findMany({
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
  }

  async demonteazaComponenta(serieUnica: string, mecanic: string, motivDemontare: string) {
    const componenta = await this.prisma.componentaSerializata.findUnique({
      where: { serieUnica },
      include: { articolStoc: true },
    });

    if (!componenta) throw new NotFoundException('Componenta nu a fost găsită');

    await this.prisma.componentaSerializata.update({
      where: { serieUnica },
      data: { stare: 'DEFECT' },
    });

    return {
      mesaj: ` Piesa ${serieUnica} marcată ca DEFECTĂ (Cerere Reclamație Garanție).`,
      esteInGarantie: true,
    };
  }
}
