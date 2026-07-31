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
        _count: { select: { articoleStoc: true } },
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
          _count: { select: { articoleStoc: true } },
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
  // 2. CATEGORII STOC CU STOC MINIM IMPLICIT
  // ==========================================

  async getCategorii() {
    const categoriiCustom = await this.prisma.categorieStoc.findMany({
      include: { subcategorii: true },
    });

    const categoriiImplicite = [
      {
        id: '1',
        nume: 'Anvelope',
        descriere: 'Anvelope vehicule, utilaje șantier și echipamente',
        stocMinimImplicit: 4,
        subcategorii: [
          { id: 'sub-anv-1', nume: 'anv tracțiune', descriere: 'Anvelope axă motrică / tracțiune' },
          { id: 'sub-anv-2', nume: 'anv. remorcă', descriere: 'Anvelope axă remorcă / semiremorcă' },
          { id: 'sub-anv-3', nume: 'anv direcție', descriere: 'Anvelope axă directorială / ghidaj' },
          { id: 'sub-anv-4', nume: 'anv volă Komatsu', descriere: 'Anvelope industriale volă & încărcător' },
        ],
      },
      {
        id: '2',
        nume: 'Lubrifianți',
        descriere: 'Ulei motor, hidraulic, transmisie, antigel',
        stocMinimImplicit: 50,
        subcategorii: [
          { id: 'sub-lub-1', nume: 'ulei motor', descriere: '15W40, 10W40, 5W30' },
          { id: 'sub-lub-2', nume: 'ulei hidraulic', descriere: 'HVI 46, HVI 68' },
          { id: 'sub-lub-3', nume: 'ulei transmisie', descriere: '80W90, UTTO' },
          { id: 'sub-lub-4', nume: 'vaselină greasă', descriere: 'Vaselină gresare șasiu' },
        ],
      },
      {
        id: '3',
        nume: 'Piese Motor',
        descriere: 'Componente motor, turbosuflante, filtre, injectoare',
        stocMinimImplicit: 2,
        subcategorii: [
          { id: 'sub-pm-1', nume: 'injectoare', descriere: 'Injectoare motorină și duze' },
          { id: 'sub-pm-2', nume: 'turbosuflante', descriere: 'Turbine și kituri supraalimentare' },
          { id: 'sub-pm-3', nume: 'set filtre', descriere: 'Filtre aer, ulei, combustibil' },
          { id: 'sub-pm-4', nume: 'pistoane & supape', descriere: 'Kituri de reparație motor' },
        ],
      },
      {
        id: '4',
        nume: 'Componente Motor Majore',
        descriere: 'Turbine, pompe, injectoare',
        stocMinimImplicit: 1,
        subcategorii: [
          { id: 'sub-cmm-1', nume: 'turbosuflante', descriere: 'Turbosuflet & kituri' },
          { id: 'sub-cmm-2', nume: 'pompe injecție', descriere: 'Pompe și sisteme alimentare' },
        ],
      },
      {
        id: '5',
        nume: 'Filtre',
        descriere: 'Filtre aer, motorină, hidraulice',
        stocMinimImplicit: 3,
        subcategorii: [
          { id: 'sub-flt-1', nume: 'filtre ulei', descriere: 'Filtre ulei motor & transmisie' },
          { id: 'sub-flt-2', nume: 'filtre aer', descriere: 'Filtre aer motor & cabină' },
          { id: 'sub-flt-3', nume: 'filtre hidraulice', descriere: 'Filtre retur hidraulic' },
        ],
      },
      {
        id: '6',
        nume: 'Consumabile Motor',
        descriere: 'Filtre, curele, garnituri',
        stocMinimImplicit: 5,
        subcategorii: [
          { id: 'sub-con-1', nume: 'curele transmisie', descriere: 'Curele trapezoidale & canelate' },
          { id: 'sub-con-2', nume: 'baterii & acumulatori', descriere: 'Baterii 12V / 24V' },
        ],
      },
      {
        id: '7',
        nume: 'Frână & Suspensie',
        descriere: 'Plăcuțe, discuri, bucșe, perne aer',
        stocMinimImplicit: 4,
        subcategorii: [
          { id: 'sub-fr-1', nume: 'plăcuțe frână', descriere: 'Garnituri și plăcuțe frână' },
          { id: 'sub-fr-2', nume: 'discuri & tamburi', descriere: 'Discuri frână și cilindri' },
          { id: 'sub-fr-3', nume: 'bucșe & perne aer', descriere: 'Elemente de suspensie' },
        ],
      },
    ];

    const dbSubcats = await this.prisma.subcategorieStoc.findMany();

    return { categoriiImplicite, categoriiCustom, subcategoriiExistente: dbSubcats };
  }

  async createCategorie(data: { nume: string; descriere?: string; stocMinimImplicit?: number }) {
    if (!data.nume) throw new BadRequestException('Numele categoriei este obligatoriu.');
    return this.prisma.categorieStoc.create({
      data: {
        nume: data.nume,
        descriere: data.descriere,
        stocMinimImplicit: data.stocMinimImplicit ? Number(data.stocMinimImplicit) : 5,
      },
    });
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
        nume: data.nume,
        descriere: data.descriere,
        categorieStocId: catId || null,
      },
    });
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
      mesaj: `✅ Transfer parțial efectuat cu succes! Au fost transferate ${cantitate} ${articolSursa.unitateMasura} de "${articolSursa.denumire}" din ${articolSursa.depozit?.nume || 'Depozitul Sursă'} în ${depozitDestinatie.nume}.`,
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
        mesaj: `⚠️ AVERTISMENT STOC CRITIC: Articolul "${a.denumire}" (${a.codArticol}) are stocul de ${a.stocCurent} ${a.unitateMasura}, sub limita minimă de ${a.stocMinim} ${a.unitateMasura}!`,
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
        denumire: data.denumire,
        subcategorie: data.subcategorie,
        stocCurent: data.stocCurent !== undefined ? Number(data.stocCurent) : undefined,
        stocMinim: data.stocMinim !== undefined ? Number(data.stocMinim) : undefined,
        pretUnitar: data.pretUnitar !== undefined ? Number(data.pretUnitar) : undefined,
        depozitId: data.depozitId,
        marcaUlei: data.marcaUlei,
      },
    });
  }

  async deleteArticolStoc(id: string) {
    return this.prisma.articolStoc.delete({ where: { id } });
  }

  // ==========================================
  // 5. RECEPȚIE MARFĂ PE FACTURĂ & GARANȚII
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

    let articol = await this.prisma.articolStoc.findFirst({
      where: { codArticol: data.codArticol, depozitId: depozitIdFinal },
    });

    if (articol) {
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
      const stocMinimImplicit = catCustom ? catCustom.stocMinimImplicit : 5;

      articol = await this.prisma.articolStoc.create({
        data: {
          codArticol: data.codArticol,
          denumire: data.denumire,
          categorie: data.categorie,
          subcategorie: data.subcategorie,
          stocCurent: cantitate,
          stocMinim: stocMinimImplicit,
          pretUnitar,
          unitateMasura: data.unitateMasura || 'buc',
          esteSerializat: !!data.areGarantie,
          depozitId: depozitIdFinal,
          marcaUlei: data.marcaUlei,
        },
      });
    }

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
      mesaj: `Recepție marfă înregistrată! ${cantitate} ${articol.unitateMasura} de "${articol.denumire}" (Preț unitar: ${pretUnitar} RON) adăugate în ${depozit?.nume || 'Depozit Central'}.${data.areGarantie ? ' 🛡️ Garanție producător activată în registru!' : ''}`,
      articol,
      intrare,
      pretUnitar,
      componentaGarantie,
    };
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
      include: { articolStoc: true },
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
      mesaj: `⚠️ Piesa ${serieUnica} marcată ca DEFECTĂ (Cerere Reclamație Garanție).`,
      esteInGarantie: true,
    };
  }
}
