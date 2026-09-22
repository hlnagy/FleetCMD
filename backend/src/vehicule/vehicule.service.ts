import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiculeService {
  constructor(private prisma: PrismaService) {}

  async getCategorii() {
    const count = await this.prisma.categorieVehicul.count();
    if (count === 0) {
      const implicite = [
        { nume: 'CAP_TRACTOR', descriere: 'Cap Tractor' },
        { nume: 'REMORCA', descriere: 'Remorcă / Semiremorcă' },
        { nume: 'BASCULANTA', descriere: 'Basculantă 4 Axe' },
        { nume: 'EXCAVATOR', descriere: 'Excavator / Utilitară' },
        { nume: 'INCARCATOR_FRONTAL', descriere: 'Încărcător Frontal' },
        { nume: 'BULLDOZER', descriere: 'Bulldozer' },
        { nume: 'AUTOVALT', descriere: 'Autovalt / Compactor' },
        { nume: 'UTILAJ_SPECIAL', descriere: 'Utilaj Special' },
        { nume: 'AUTOUTILITARA', descriere: 'Autoutilitară' },
      ];

      for (const cat of implicite) {
        await this.prisma.categorieVehicul.upsert({
          where: { nume: cat.nume },
          update: {},
          create: { nume: cat.nume, descriere: cat.descriere },
        });
      }
    }

    const allCats = await this.prisma.categorieVehicul.findMany({
      orderBy: { nume: 'asc' },
    });

    return { categoriiEnum: [], categoriiPersonalizate: allCats };
  }

  async createCategoriePersonalizata(nume: string, descriere?: string) {
    if (!nume || !nume.trim()) throw new BadRequestException('Numele categoriei este obligatoriu.');
    const catNumeUpper = nume.trim().toUpperCase().replace(/\s+/g, '_');

    const existing = await this.prisma.categorieVehicul.findUnique({
      where: { nume: catNumeUpper },
    });
    if (existing) {
      throw new BadRequestException(`Categoria "${catNumeUpper}" există deja.`);
    }

    return this.prisma.categorieVehicul.create({
      data: {
        nume: catNumeUpper,
        descriere: descriere || `Categorie utilaj ${catNumeUpper}`,
      },
    });
  }

  async updateCategorieVehicul(id: string, numeNou: string, descriere?: string) {
    const oldCat = await this.prisma.categorieVehicul.findFirst({
      where: { OR: [{ id }, { nume: id }] },
    });
    if (!oldCat) throw new NotFoundException('Categoria nu a fost găsită.');

    const newNumeUpper = (numeNou || oldCat.nume).trim().toUpperCase().replace(/\s+/g, '_');

    if (oldCat.nume === 'NEALOCAT' && newNumeUpper !== 'NEALOCAT') {
      throw new BadRequestException('Categoria "NEALOCAT" este rezervată de sistem și nu poate fi redenumită.');
    }

    if (oldCat.nume !== newNumeUpper) {
      const exist = await this.prisma.categorieVehicul.findUnique({ where: { nume: newNumeUpper } });
      if (exist && exist.id !== oldCat.id) {
        throw new BadRequestException(`Categoria "${newNumeUpper}" există deja.`);
      }

      // 1. Creăm/actualizăm noul nume mai întâi pentru ca Foreign Key-ul din Vehicul să fie valid
      await this.prisma.categorieVehicul.upsert({
        where: { nume: newNumeUpper },
        update: { descriere: descriere !== undefined ? descriere : oldCat.descriere },
        create: { nume: newNumeUpper, descriere: descriere !== undefined ? descriere : oldCat.descriere },
      });

      // 2. Actualizăm vehiculele către noul nume
      await this.prisma.vehicul.updateMany({
        where: { categorieEnum: oldCat.nume },
        data: { categorieEnum: newNumeUpper },
      });

      // 3. Actualizăm și regulile de mentenanță asociate categoriei
      await this.prisma.regulaAlertaMentenanta.updateMany({
        where: { categorieUtilaj: oldCat.nume },
        data: { categorieUtilaj: newNumeUpper },
      });

      // 4. Ștergem vechea categorie
      await this.prisma.categorieVehicul.delete({
        where: { id: oldCat.id },
      });

      return this.prisma.categorieVehicul.findUnique({ where: { nume: newNumeUpper } });
    }

    return this.prisma.categorieVehicul.update({
      where: { id: oldCat.id },
      data: {
        descriere: descriere !== undefined ? descriere : oldCat.descriere,
      },
    });
  }

  async deleteCategorieVehicul(id: string) {
    const cat = await this.prisma.categorieVehicul.findFirst({
      where: { OR: [{ id }, { nume: id }] },
    });
    if (!cat) throw new NotFoundException('Categoria nu a fost găsită.');

    if (cat.nume === 'NEALOCAT') {
      throw new BadRequestException('Categoria "NEALOCAT" este rezervată de sistem și nu poate fi ștearsă.');
    }

    // Asigurăm că există categoria NEALOCAT
    await this.prisma.categorieVehicul.upsert({
      where: { nume: 'NEALOCAT' },
      update: {},
      create: { nume: 'NEALOCAT', descriere: 'Vehicule neclasificate / Nealocat' },
    });

    // Mutăm toate vehiculele din această categorie la NEALOCAT
    await this.prisma.vehicul.updateMany({
      where: { categorieEnum: cat.nume },
      data: { categorieEnum: 'NEALOCAT' },
    });

    // Mutăm și regulile de mentenanță asociate la NEALOCAT
    await this.prisma.regulaAlertaMentenanta.updateMany({
      where: { categorieUtilaj: cat.nume },
      data: { categorieUtilaj: 'NEALOCAT' },
    });

    return this.prisma.categorieVehicul.delete({ where: { id: cat.id } });
  }

  async createVehicul(data: {
    numarInmatriculare: string;
    vin?: string;
    serieSasiu?: string;
    numarIntern: string;
    categorieEnum?: string;
    marca: string;
    model: string;
    anFabricatie: number;
    tipMasurare: string;
    valoareContorCurent: number;
    valoareContorInitial?: number;
    dataContorInitial?: string | Date;
    tarifOrarManopera?: number;
    tarifOrarStandard?: number;
    configuratieManualAxe?: Array<{ numarAx: number; numarRoti: number }>;
  }) {
    if (!data.numarIntern || !data.numarIntern.trim()) {
      throw new BadRequestException('Numărul intern al vehiculului este obligatoriu!');
    }

    let numInmat = (data.numarInmatriculare || '').trim();
    if (!numInmat || numInmat === '-' || numInmat.toLowerCase() === 'fara') {
      numInmat = `UTILAJ-${data.numarIntern.trim()}`;
    }

    // Verificare unicitate Numar Intern
    const existIntern = await this.prisma.vehicul.findUnique({
      where: { numarIntern: data.numarIntern.trim() },
    });
    if (existIntern) {
      throw new BadRequestException(`Numărul intern "${data.numarIntern}" există deja în baza de date!`);
    }

    // Verificare unicitate Numar Inmatriculare
    const existInmat = await this.prisma.vehicul.findUnique({
      where: { numarInmatriculare: numInmat },
    });
    if (existInmat) {
      numInmat = `${numInmat}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const valInitial = data.valoareContorInitial !== undefined ? Number(data.valoareContorInitial) : Number(data.valoareContorCurent || 0);
    const dataInitial = data.dataContorInitial ? new Date(data.dataContorInitial) : new Date();

    const catName = data.categorieEnum || 'CAP_TRACTOR';
    await this.prisma.categorieVehicul.upsert({
      where: { nume: catName },
      update: {},
      create: { nume: catName, descriere: `Categorie ${catName}` },
    });

    const vehicul = await this.prisma.vehicul.create({
      data: {
        numarInmatriculare: numInmat,
        serieSasiu: data.serieSasiu || data.vin || null,
        numarIntern: data.numarIntern.trim(),
        categorieEnum: data.categorieEnum || 'CAP_TRACTOR',
        marca: data.marca || 'Nedefinit',
        model: data.model || 'Standard',
        anFabricatie: Number(data.anFabricatie || new Date().getFullYear()),
        tipMasurare: data.tipMasurare || 'KM',
        valoareContorCurent: Number(data.valoareContorCurent || 0),
        valoareContorInitial: valInitial,
        dataInregistrareContor: dataInitial,
        tarifOrarStandard: data.tarifOrarStandard || data.tarifOrarManopera ? Number(data.tarifOrarStandard || data.tarifOrarManopera) : 0,
      },
    });

    await this.generarePozitiiAxeImplicit(vehicul.id, vehicul.categorieEnum || 'CAP_TRACTOR', data.configuratieManualAxe);
    return vehicul;
  }

  public async generarePozitiiAxeImplicit(
    vehiculId: string,
    categorie: string,
    configuratieManual?: Array<{ numarAx: number; numarRoti: number }>
  ) {
    const axe: Array<{ codPozitie: string; numarAx: number; descrierePozitie: string }> = [];

    if (configuratieManual && Array.isArray(configuratieManual) && configuratieManual.length > 0) {
      for (const axConf of configuratieManual) {
        const axNum = Number(axConf.numarAx);
        const numRoti = Number(axConf.numarRoti || 2);

        if (numRoti === 2) {
          axe.push(
            { codPozitie: `${axNum}-ST`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga` },
            { codPozitie: `${axNum}-DR`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta` }
          );
        } else if (numRoti === 4) {
          axe.push(
            { codPozitie: `${axNum}-ST-EXT`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Exterior` },
            { codPozitie: `${axNum}-ST-INT`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Interior` },
            { codPozitie: `${axNum}-DR-INT`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Interior` },
            { codPozitie: `${axNum}-DR-EXT`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Exterior` }
          );
        } else if (numRoti === 6) {
          axe.push(
            { codPozitie: `${axNum}-ST-EXT2`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Ext 2` },
            { codPozitie: `${axNum}-ST-EXT1`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Ext 1` },
            { codPozitie: `${axNum}-ST-INT`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Int` },
            { codPozitie: `${axNum}-DR-INT`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Int` },
            { codPozitie: `${axNum}-DR-EXT1`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Ext 1` },
            { codPozitie: `${axNum}-DR-EXT2`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Ext 2` }
          );
        } else {
          for (let r = 1; r <= numRoti; r++) {
            const side = r <= Math.ceil(numRoti / 2) ? 'ST' : 'DR';
            const posCode = `${axNum}-${side}${r}`;
            axe.push({ codPozitie: posCode, numarAx: axNum, descrierePozitie: `Axă ${axNum} Poziție ${r}` });
          }
        }
      }
    } else if (categorie === 'CAP_TRACTOR') {
      axe.push(
        { codPozitie: '1-ST', numarAx: 1, descrierePozitie: 'Axă 1 Stânga (Directoare)' },
        { codPozitie: '1-DR', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta (Directoare)' },
        { codPozitie: '2-ST-EXT', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Exterior (Tracțiune)' },
        { codPozitie: '2-ST-INT', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Interior (Tracțiune)' },
        { codPozitie: '2-DR-INT', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Interior (Tracțiune)' },
        { codPozitie: '2-DR-EXT', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Exterior (Tracțiune)' }
      );
    } else if (categorie === 'REMORCA' || categorie === 'SEMIREMORCA') {
      axe.push(
        { codPozitie: '1-ST', numarAx: 1, descrierePozitie: 'Axă 1 Stânga' },
        { codPozitie: '1-DR', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta' },
        { codPozitie: '2-ST', numarAx: 2, descrierePozitie: 'Axă 2 Stânga' },
        { codPozitie: '2-DR', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta' },
        { codPozitie: '3-ST', numarAx: 3, descrierePozitie: 'Axă 3 Stânga' },
        { codPozitie: '3-DR', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta' }
      );
    } else if (categorie === 'BASCULANTA') {
      axe.push(
        { codPozitie: '1-ST', numarAx: 1, descrierePozitie: 'Axă 1 Stânga (Directoare)' },
        { codPozitie: '1-DR', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta (Directoare)' },
        { codPozitie: '2-ST', numarAx: 2, descrierePozitie: 'Axă 2 Stânga (Directoare 2)' },
        { codPozitie: '2-DR', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta (Directoare 2)' },
        { codPozitie: '3-ST-EXT', numarAx: 3, descrierePozitie: 'Axă 3 Stânga Exterior (Tracțiune)' },
        { codPozitie: '3-ST-INT', numarAx: 3, descrierePozitie: 'Axă 3 Stânga Interior (Tracțiune)' },
        { codPozitie: '3-DR-INT', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta Interior (Tracțiune)' },
        { codPozitie: '3-DR-EXT', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta Exterior (Tracțiune)' },
        { codPozitie: '4-ST-EXT', numarAx: 4, descrierePozitie: 'Axă 4 Stânga Exterior (Tracțiune)' },
        { codPozitie: '4-ST-INT', numarAx: 4, descrierePozitie: 'Axă 4 Stânga Interior (Tracțiune)' },
        { codPozitie: '4-DR-INT', numarAx: 4, descrierePozitie: 'Axă 4 Dreapta Interior (Tracțiune)' },
        { codPozitie: '4-DR-EXT', numarAx: 4, descrierePozitie: 'Axă 4 Dreapta Exterior (Tracțiune)' }
      );
    } else {
      axe.push(
        { codPozitie: '1-ST', numarAx: 1, descrierePozitie: 'Axă 1 Stânga' },
        { codPozitie: '1-DR', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta' },
        { codPozitie: '2-ST', numarAx: 2, descrierePozitie: 'Axă 2 Stânga' },
        { codPozitie: '2-DR', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta' }
      );
    }

    const newCodes = new Set(axe.map(a => a.codPozitie));

    const existing = await this.prisma.pozitieAx.findMany({ where: { vehiculId } });
    for (const pos of existing) {
      if (!newCodes.has(pos.codPozitie)) {
        await this.prisma.anvelopa.updateMany({
          where: { pozitieAxId: pos.id },
          data: { pozitieAxId: null, stare: 'IN_STOC' },
        });
        await this.prisma.pozitieAx.delete({ where: { id: pos.id } });
      }
    }

    for (const ax of axe) {
      await this.prisma.pozitieAx.upsert({
        where: { vehiculId_codPozitie: { vehiculId, codPozitie: ax.codPozitie } },
        update: { numarAx: ax.numarAx, descrierePozitie: ax.descrierePozitie },
        create: { vehiculId, ...ax },
      });
    }
  }

  async getAllVehicule(categorie?: string) {
    const where: any = {};
    if (categorie) {
      where.categorieEnum = categorie;
    }
    return this.prisma.vehicul.findMany({
      where,
      include: {
        comenziLucru: { include: { elementeComanda: true } },
        anvelope: true,
        completariLichid: true,
        pozitiiAxe: { include: { anvelopa: true } },
        cuplariCapTractor: { where: { esteActiv: true }, include: { semiremorca: true } },
        cuplariSemiremorca: {
          where: { esteActiv: true },
          include: {
            capTractor: {
              include: {
                istoricContor: { orderBy: { dataInregistrare: 'desc' }, take: 1 },
              },
            },
          },
        },
        istoricContor: { orderBy: { dataInregistrare: 'desc' }, take: 1 },
      },
      orderBy: { numarIntern: 'asc' },
    });
  }

  async getVehiculById(id: string) {
    const vehicul = await this.prisma.vehicul.findUnique({
      where: { id },
      include: {
        comenziLucru: { include: { elementeComanda: true } },
        anvelope: { include: { masuratori: true, pozitieAx: true } },
        pozitiiAxe: { include: { anvelopa: true } },
        completariLichid: true,
        sarciniMentenanta: true,
        cuplariCapTractor: { where: { esteActiv: true }, include: { semiremorca: true } },
        cuplariSemiremorca: { where: { esteActiv: true }, include: { capTractor: true } },
      },
    });

    if (!vehicul) throw new NotFoundException('Vehiculul nu a fost găsit.');
    return vehicul;
  }

  async updateVehicul(id: string, data: any) {
    const v = await this.prisma.vehicul.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Vehicul negăsit');

    let normalizedTipMasurare = v.tipMasurare;
    if (data.tipMasurare) {
      const tm = String(data.tipMasurare).toUpperCase();
      if (tm === 'ORE' || tm === 'MTH' || tm === 'M_TH' || tm === 'HOUR' || tm === 'HOURS') {
        normalizedTipMasurare = 'mTH';
      } else {
        normalizedTipMasurare = 'KM';
      }
    }

    if (data.categorieEnum && data.categorieEnum !== v.categorieEnum) {
      await this.prisma.categorieVehicul.upsert({
        where: { nume: data.categorieEnum },
        update: {},
        create: { nume: data.categorieEnum, descriere: `Categorie ${data.categorieEnum}` },
      });
    }

    const updated = await this.prisma.vehicul.update({
      where: { id },
      data: {
        numarInmatriculare: data.numarInmatriculare ?? v.numarInmatriculare,
        serieSasiu: data.serieSasiu || data.vin || v.serieSasiu,
        numarIntern: data.numarIntern ?? v.numarIntern,
        categorieEnum: data.categorieEnum ?? v.categorieEnum,
        marca: data.marca ?? v.marca,
        model: data.model ?? v.model,
        anFabricatie: data.anFabricatie ? Number(data.anFabricatie) : v.anFabricatie,
        tipMasurare: normalizedTipMasurare,
        valoareContorCurent: data.valoareContorCurent !== undefined ? Number(data.valoareContorCurent) : v.valoareContorCurent,
        valoareContorInitial: data.valoareContorInitial !== undefined ? Number(data.valoareContorInitial) : v.valoareContorInitial,
        dataInregistrareContor: data.dataContorInitial || data.dataInregistrareContor ? new Date(data.dataContorInitial || data.dataInregistrareContor) : v.dataInregistrareContor,
        tarifOrarStandard: data.tarifOrarStandard || data.tarifOrarManopera !== undefined ? Number(data.tarifOrarStandard || data.tarifOrarManopera) : v.tarifOrarStandard,
      },
    });

    if (data.configuratieManualAxe && Array.isArray(data.configuratieManualAxe)) {
      await this.generarePozitiiAxeImplicit(id, updated.categorieEnum, data.configuratieManualAxe);
    }

    if (v.categorieEnum === 'CAP_TRACTOR' && data.valoareContorCurent !== undefined && Number(data.valoareContorCurent) > v.valoareContorCurent) {
      await this.propagaKmCuplare(id, v.valoareContorCurent, Number(data.valoareContorCurent));
    }

    return updated;
  }

  async deleteVehicul(id: string) {
    return this.prisma.vehicul.delete({ where: { id } });
  }

  async getFisaTehnicaDigitala(id: string) {
    const v = await this.getVehiculById(id);

    let costPieseStoc = 0;
    let costPieseDirecte = 0;
    let costServiciiExterne = 0;
    let costManoperaInterna = 0;
    let costPieseDezmembrata = 0;

    v.comenziLucru.forEach((cl) => {
      cl.elementeComanda.forEach((el) => {
        if (el.pilonCost === 'PIESA_STOC') costPieseStoc += el.costTotal;
        else if (el.pilonCost === 'PIESA_DIRECTA') costPieseDirecte += el.costTotal;
        else if (el.pilonCost === 'SERVICIU_EXTERN') costServiciiExterne += el.costTotal;
        else if (el.pilonCost === 'MANOPERA_INTERNA') costManoperaInterna += el.costTotal;
        else if (el.pilonCost === 'PIESA_DEZMEMBRATA') costPieseDezmembrata += el.costTotal;
      });
    });

    const costTotalGrajd = costPieseStoc + costPieseDirecte + costServiciiExterne + costManoperaInterna + costPieseDezmembrata;

    return {
      vehicul: v,
      costuri: {
        costPieseStoc,
        costPieseDirecte,
        costServiciiExterne,
        costManoperaInterna,
        costPieseDezmembrata,
        costTotalGrajd,
      },
    };
  }

  // Înregistrare Manuală Contor cu Dată & Operator
  async inregistreazaContorManual(data: {
    vehiculId: string;
    valoareContor: number;
    dataInregistrare?: string | Date;
    operator?: string;
    observatii?: string;
  }) {
    const v = await this.prisma.vehicul.findUnique({ where: { id: data.vehiculId } });
    if (!v) throw new NotFoundException('Vehicul negăsit.');

    const dataInreg = data.dataInregistrare ? new Date(data.dataInregistrare) : new Date();
    const valContor = Number(data.valoareContor);

    if (isNaN(valContor) || valContor < 0) {
      throw new BadRequestException('Valoarea contorului este invalidă.');
    }

    const isLower = valContor < v.valoareContorCurent;
    const sursaFinal = isLower ? 'MANUAL_CORECȚIE' : 'MANUAL';
    const noteFinal = data.observatii || (isLower
      ? `[CORECȚIE MANUALĂ / RESET BORD] Valoare nouă mai mică (${valContor} < ${v.valoareContorCurent} ${v.tipMasurare})`
      : `Înregistrare manuală contor (${valContor} ${v.tipMasurare})`);

    // Record audit history entry
    const entry = await this.prisma.istoricContorVehicul.create({
      data: {
        vehiculId: data.vehiculId,
        valoareContor: valContor,
        dataInregistrare: dataInreg,
        sursa: sursaFinal,
        operator: data.operator || 'Operat Atelier',
        observatii: noteFinal,
      },
    });

    // Update current vehicle odometer
    if (v.categorieEnum === 'CAP_TRACTOR' && valContor > v.valoareContorCurent) {
      await this.propagaKmCuplare(data.vehiculId, v.valoareContorCurent, valContor);
    }

    await this.prisma.vehicul.update({
      where: { id: data.vehiculId },
      data: {
        valoareContorCurent: valContor,
        dataInregistrareContor: dataInreg,
      },
    });

    return { mesaj: ` Contor înregistrat cu succes pentru ${v.numarIntern}: ${valContor} ${v.tipMasurare}!`, entry };
  }

  // Înregistrare Rapidă în Lot (Batch) Contoare Flotă
  async inregistreazaContoareBatch(entries: Array<{
    vehiculId: string;
    valoareContor: number;
    dataInregistrare?: string | Date;
    operator?: string;
    observatii?: string;
  }>) {
    const rezultate = [];
    for (const item of entries) {
      if (item.valoareContor !== undefined && item.valoareContor !== null) {
        const r = await this.inregistreazaContorManual(item);
        rezultate.push(r);
      }
    }
    return { mesaj: ` Actualizate ${rezultate.length} contoare de flotă cu succes!`, rezultate };
  }

  // Istoric Audit Contoare Flotă
  async getIstoricContoare(vehiculId?: string) {
    const where: any = {};
    if (vehiculId) where.vehiculId = vehiculId;
    return this.prisma.istoricContorVehicul.findMany({
      where,
      include: { vehicul: true },
      orderBy: { dataInregistrare: 'desc' },
      take: 200,
    });
  }

  async updateIstoricContor(id: string, data: {
    valoareContor?: number;
    dataInregistrare?: string | Date;
    operator?: string;
    observatii?: string;
  }) {
    const entry = await this.prisma.istoricContorVehicul.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Înregistrarea de contor nu există.');

    const updated = await this.prisma.istoricContorVehicul.update({
      where: { id },
      data: {
        valoareContor: data.valoareContor !== undefined ? Number(data.valoareContor) : entry.valoareContor,
        dataInregistrare: data.dataInregistrare ? new Date(data.dataInregistrare) : entry.dataInregistrare,
        operator: data.operator !== undefined ? data.operator : entry.operator,
        observatii: data.observatii !== undefined ? data.observatii : entry.observatii,
      },
    });

    // Recalculare valoare contor curent pentru vehicul
    const latest = await this.prisma.istoricContorVehicul.findFirst({
      where: { vehiculId: entry.vehiculId },
      orderBy: { valoareContor: 'desc' },
    });

    if (latest) {
      await this.prisma.vehicul.update({
        where: { id: entry.vehiculId },
        data: {
          valoareContorCurent: latest.valoareContor,
          dataInregistrareContor: latest.dataInregistrare,
        },
      });
    }

    return { mesaj: ' Înregistrare contor actualizată cu succes!', entry: updated };
  }

  async deleteIstoricContor(id: string) {
    const entry = await this.prisma.istoricContorVehicul.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Înregistrarea de contor nu există.');

    await this.prisma.istoricContorVehicul.delete({ where: { id } });

    // Recalculare valoare contor curent pentru vehicul
    const latest = await this.prisma.istoricContorVehicul.findFirst({
      where: { vehiculId: entry.vehiculId },
      orderBy: { valoareContor: 'desc' },
    });

    if (latest) {
      await this.prisma.vehicul.update({
        where: { id: entry.vehiculId },
        data: {
          valoareContorCurent: latest.valoareContor,
          dataInregistrareContor: latest.dataInregistrare,
        },
      });
    }

    return { mesaj: ' Înregistrare contor ștearsă cu succes!' };
  }

  // Import / Sincronizare Date GPS Telematică (CSV, JSON sau API GPS)
  async importDataGps(records: Array<{
    numarIntern?: string;
    numarInmatriculare?: string;
    valoareContor: number;
    dataInregistrare?: string | Date;
    sursaGps?: string;
    observatii?: string;
  }>) {
    const rezultate = [];
    const erori = [];

    for (const item of records) {
      if (!item.numarIntern && !item.numarInmatriculare) {
        erori.push(`Linie ignorată: lipsește numărul intern sau de înmatriculare.`);
        continue;
      }

      const numInt = item.numarIntern ? item.numarIntern.trim() : '';
      const numInm = item.numarInmatriculare ? item.numarInmatriculare.trim() : '';

      const vehiculeDb = await this.prisma.vehicul.findMany();
      const vehicul = vehiculeDb.find((v) =>
        (numInt && v.numarIntern.toLowerCase() === numInt.toLowerCase()) ||
        (numInm && v.numarInmatriculare.toLowerCase() === numInm.toLowerCase())
      );

      if (!vehicul) {
        erori.push(`Vehicul negăsit pentru codul "${numInt || numInm}"`);
        continue;
      }

      const valContor = Number(item.valoareContor);
      if (isNaN(valContor) || valContor <= 0) {
        erori.push(`Valoare contor invalidă (${item.valoareContor}) pentru ${vehicul.numarIntern}`);
        continue;
      }

      const dataInreg = item.dataInregistrare ? new Date(item.dataInregistrare) : new Date();
      const sursa = item.sursaGps || 'GPS_TELEMATICA';

      const entry = await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: vehicul.id,
          valoareContor: valContor,
          dataInregistrare: dataInreg,
          sursa: sursa,
          operator: 'Sistem GPS Telematică (Import)',
          observatii: item.observatii || `Import automat telematică GPS (${valContor} ${vehicul.tipMasurare})`,
        },
      });

    if (valContor >= vehicul.valoareContorCurent) {
        if (vehicul.categorieEnum === 'CAP_TRACTOR' && valContor > vehicul.valoareContorCurent) {
          await this.propagaKmCuplare(vehicul.id, vehicul.valoareContorCurent, valContor);
        }
        await this.prisma.vehicul.update({
          where: { id: vehicul.id },
          data: {
            valoareContorCurent: valContor,
            dataInregistrareContor: dataInreg,
          },
        });
      }

      rezultate.push({
        numarIntern: vehicul.numarIntern,
        numarInmatriculare: vehicul.numarInmatriculare,
        valoareContor: valContor,
        tipMasurare: vehicul.tipMasurare,
        dataInregistrare: dataInreg,
      });
    }

    return {
      mesaj: ` Import GPS finalizat! S-au procesat ${rezultate.length} contoare.`,
      rezultate,
      erori,
    };
  }

  // ==========================================
  // MANAGEMENT CUPLARE CAP TRACTOR - SEMIREMORCĂ
  // ==========================================

  public async propagaKmCuplare(capTractorId: string, kmVechi: number, kmNou: number) {
    const deltaKm = Number((kmNou - kmVechi).toFixed(2));
    if (deltaKm <= 0) return;

    const activeCoupling = await this.prisma.istoricCuplare.findFirst({
      where: { capTractorId, esteActiv: true },
      include: { capTractor: true, semiremorca: true },
    });

    if (!activeCoupling || !activeCoupling.semiremorca) return;

    const semiremorca = activeCoupling.semiremorca;
    const valoareNouaSemi = Number((semiremorca.valoareContorCurent + deltaKm).toFixed(2));
    const dataInreg = new Date();

    // Actualizare contor semiremorcă
    await this.prisma.vehicul.update({
      where: { id: semiremorca.id },
      data: {
        valoareContorCurent: valoareNouaSemi,
        dataInregistrareContor: dataInreg,
      },
    });

    // Istoric contor semiremorcă
    await this.prisma.istoricContorVehicul.create({
      data: {
        vehiculId: semiremorca.id,
        valoareContor: valoareNouaSemi,
        dataInregistrare: dataInreg,
        sursa: 'CUPLARE_CAP_TRACTOR',
        operator: 'Sistem Cuplare Dinamică',
        observatii: `Rulaj acumulat automat de la Cap Tractor ${activeCoupling.capTractor.numarIntern} (${activeCoupling.capTractor.numarInmatriculare}): +${deltaKm} KM`,
      },
    });
  }

  async cupleazaAnsamblu(capTractorId: string, semiremorcaId: string) {
    if (capTractorId === semiremorcaId) {
      throw new BadRequestException('Nu poți cupla un vehicul cu el însuși.');
    }

    const capTractor = await this.prisma.vehicul.findUnique({ where: { id: capTractorId } });
    if (!capTractor) throw new NotFoundException('Cap Tractor negăsit.');

    if (capTractor.categorieEnum !== 'CAP_TRACTOR') {
      throw new BadRequestException(`Vehiculul ${capTractor.numarIntern} nu este din categoria CAP_TRACTOR (categorie: ${capTractor.categorieEnum}).`);
    }

    const semiremorca = await this.prisma.vehicul.findUnique({ where: { id: semiremorcaId } });
    if (!semiremorca) throw new NotFoundException('Semiremorcă negăsită.');

    if (semiremorca.categorieEnum !== 'SEMIREMORCA' && semiremorca.categorieEnum !== 'REMORCA') {
      throw new BadRequestException(`Vehiculul ${semiremorca.numarIntern} nu este din categoria SEMIREMORCA sau REMORCA (categorie: ${semiremorca.categorieEnum}).`);
    }

    // Decuplare automată ansamblu activ existent pentru Cap Tractor
    const activeTractor = await this.prisma.istoricCuplare.findFirst({
      where: { capTractorId, esteActiv: true },
    });
    if (activeTractor) {
      await this.decupleazaAnsamblu({ cuplareId: activeTractor.id });
    }

    // Decuplare automată ansamblu activ existent pentru Semiremorcă
    const activeSemi = await this.prisma.istoricCuplare.findFirst({
      where: { semiremorcaId, esteActiv: true },
    });
    if (activeSemi) {
      await this.decupleazaAnsamblu({ cuplareId: activeSemi.id });
    }

    // Creare cuplare nouă
    const cuplare = await this.prisma.istoricCuplare.create({
      data: {
        capTractorId,
        semiremorcaId,
        kmInceputTractor: capTractor.valoareContorCurent,
        dataCuplare: new Date(),
        esteActiv: true,
      },
      include: {
        capTractor: true,
        semiremorca: true,
      },
    });

    return {
      mesaj: ` Ansamblu cuplat cu succes: Cap Tractor ${capTractor.numarInmatriculare}  Semiremorcă ${semiremorca.numarInmatriculare}`,
      cuplare,
    };
  }

  async decupleazaAnsamblu(params: { cuplareId?: string; capTractorId?: string; semiremorcaId?: string }) {
    let cuplare: any = null;

    if (params.cuplareId) {
      cuplare = await this.prisma.istoricCuplare.findUnique({
        where: { id: params.cuplareId },
        include: { capTractor: true, semiremorca: true },
      });
    } else if (params.capTractorId) {
      cuplare = await this.prisma.istoricCuplare.findFirst({
        where: { capTractorId: params.capTractorId, esteActiv: true },
        include: { capTractor: true, semiremorca: true },
      });
    } else if (params.semiremorcaId) {
      cuplare = await this.prisma.istoricCuplare.findFirst({
        where: { semiremorcaId: params.semiremorcaId, esteActiv: true },
        include: { capTractor: true, semiremorca: true },
      });
    }

    if (!cuplare) {
      throw new NotFoundException('Nu a fost găsită nicio cuplare activă pentru decuplare.');
    }

    const capTractorActual = await this.prisma.vehicul.findUnique({ where: { id: cuplare.capTractorId } });
    const kmSfarsitTractor = capTractorActual ? capTractorActual.valoareContorCurent : cuplare.capTractor.valoareContorCurent;
    const kmParcursiAnsa = Number(Math.max(0, kmSfarsitTractor - cuplare.kmInceputTractor).toFixed(2));

    const decuplare = await this.prisma.istoricCuplare.update({
      where: { id: cuplare.id },
      data: {
        kmSfarsitTractor,
        kmParcursiAnsa,
        dataDecuplare: new Date(),
        esteActiv: false,
      },
      include: {
        capTractor: true,
        semiremorca: true,
      },
    });

    return {
      mesaj: ` Decuplare efectuată cu succes! Total KM parcurși în ansamblu: ${kmParcursiAnsa} KM`,
      decuplare,
    };
  }

  async getCuplariActive() {
    return this.prisma.istoricCuplare.findMany({
      where: { esteActiv: true },
      include: {
        capTractor: true,
        semiremorca: true,
      },
      orderBy: { dataCuplare: 'desc' },
    });
  }

  async getIstoricCuplari(vehiculId?: string) {
    const where: any = {};
    if (vehiculId) {
      where.OR = [{ capTractorId: vehiculId }, { semiremorcaId: vehiculId }];
    }
    return this.prisma.istoricCuplare.findMany({
      where,
      include: {
        capTractor: true,
        semiremorca: true,
      },
      orderBy: { dataCuplare: 'desc' },
    });
  }

  async getStareCuplareVehicul(vehiculId: string) {
    const activeAsTractor = await this.prisma.istoricCuplare.findFirst({
      where: { capTractorId: vehiculId, esteActiv: true },
      include: { semiremorca: true },
    });
    if (activeAsTractor) {
      return { tipRol: 'CAP_TRACTOR', cuplareActiv: activeAsTractor, partener: activeAsTractor.semiremorca };
    }

    const activeAsSemi = await this.prisma.istoricCuplare.findFirst({
      where: { semiremorcaId: vehiculId, esteActiv: true },
      include: { capTractor: true },
    });
    if (activeAsSemi) {
      return { tipRol: 'SEMIREMORCA', cuplareActiv: activeAsSemi, partener: activeAsSemi.capTractor };
    }

    return { tipRol: 'NECUPLAT', cuplareActiv: null, partener: null };
  }

  // =========================================================================
  // MODUL IMPORT & SINCRONIZARE KILOMETRAJ POMPĂ COMBUSTIBIL (CSV SELFSERVICE)
  // =========================================================================

  private normalizeCodVehicul(cod: string): string {
    if (!cod) return '';
    return cod
      .trim()
      .toUpperCase()
      .replace(/\s+B$/i, '')
      .replace(/[^A-Z0-9]/g, '');
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map((s) => s.trim().replace(/^"|"$/g, '').trim());
  }

  /**
   * Recunoaște și ajustează automat trecerea de 1.000.000 km (odometer rollover / trunchiere cifră milioane de către șofer).
   * Ex: În sistem vehiculul are 999.958 km, iar șoferul tastează la pompă 14.898 km (în loc de 1.014.898 km).
   */
  public adjustOdometerRollover(
    rawKm: number,
    curKm: number
  ): { adjustedKm: number; isRollover: boolean; delta: number } {
    if (!curKm || curKm <= 0 || !rawKm || rawKm <= 0) {
      return { adjustedKm: rawKm, isRollover: false, delta: rawKm - (curKm || 0) };
    }

    if (rawKm >= curKm) {
      return { adjustedKm: rawKm, isRollover: false, delta: rawKm - curKm };
    }

    const remainder = rawKm % 1_000_000;
    const currentMillions = Math.floor(curKm / 1_000_000) * 1_000_000;

    // Cazul 1: Vehiculul este deja înregistrat la 1M+ (ex: curKm = 1.005.000 km, șoferul scrie 14.898 km -> 1.014.898 km)
    if (currentMillions >= 1_000_000) {
      const candidateSame = currentMillions + remainder;
      const deltaSame = candidateSame - curKm;
      if (deltaSame >= 0 && deltaSame <= 60_000) {
        return { adjustedKm: candidateSame, isRollover: true, delta: deltaSame };
      }
    }

    // Cazul 2: Vehiculul trece pragul de 1M (ex: curKm = 999.958 km, șoferul scrie 14.898 km -> 1.014.898 km)
    const candidateNext = currentMillions + 1_000_000 + remainder;
    const deltaNext = candidateNext - curKm;
    if (curKm >= 750_000 && deltaNext >= 0 && deltaNext <= 60_000) {
      return { adjustedKm: candidateNext, isRollover: true, delta: deltaNext };
    }

    return { adjustedKm: rawKm, isRollover: false, delta: rawKm - curKm };
  }

  private formatDateRo(d: Date | string): string {
    if (!d) return '';
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime())) return String(d);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}.${month}.${year}`;
  }

  async previewCsvPompa(csvContent: string, selectedCategories?: string[]) {
    if (!csvContent || !csvContent.trim()) {
      throw new BadRequestException('Fișierul CSV furnizat este gol.');
    }

    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const vehiculeDb = await this.prisma.vehicul.findMany({
      include: { categorie: true },
    });
    const categoriiDb = await this.prisma.categorieVehicul.findMany();

    const vehiculeMap = new Map<string, any>();
    for (const v of vehiculeDb) {
      vehiculeMap.set(this.normalizeCodVehicul(v.numarInmatriculare), v);
      vehiculeMap.set(this.normalizeCodVehicul(v.numarIntern), v);
    }

    // Încărcăm întregul istoric de contor pentru vehiculele din parcul auto
    const matchedVehicleIds = Array.from(
      new Set(Array.from(vehiculeMap.values()).map((v) => v.id))
    );

    const istoricDb = await this.prisma.istoricContorVehicul.findMany({
      where: { vehiculId: { in: matchedVehicleIds } },
      orderBy: { dataInregistrare: 'asc' },
      select: {
        id: true,
        vehiculId: true,
        valoareContor: true,
        dataInregistrare: true,
        sursa: true,
        observatii: true,
      },
    });

    const istoricByVehicul = new Map<string, typeof istoricDb>();
    for (const rec of istoricDb) {
      const list = istoricByVehicul.get(rec.vehiculId) || [];
      list.push(rec);
      istoricByVehicul.set(rec.vehiculId, list);
    }

    interface RawAlimentare {
      dataStr: string;
      oraStr: string;
      timestamp: Date;
      kmRaw: string;
      valoareKm: number;
      unitRaw: string;
      cleanUnit: string;
      normUnit: string;
      cantitateLitri?: number;
      linieIndex: number;
    }

    const alimentari: RawAlimentare[] = [];
    const seenFuelingKeys = new Set<string>();

    for (let idx = 0; idx < lines.length; idx++) {
      const cols = this.parseCsvLine(lines[idx]);
      if (cols.length < 15) continue;

      const dataCol = cols[10]?.trim();
      const oraCol = cols[11]?.trim() || '00:00';
      const kmCol = cols[14]?.trim();
      const unitCol = cols[15]?.trim();

      const isDate = /^\d{2}\.\d{2}\.\d{4}$/.test(dataCol) || /^\d{4}-\d{2}-\d{2}$/.test(dataCol);
      if (!isDate || !unitCol) continue;

      let valKm = 0;
      if (kmCol) {
        const noDots = kmCol.replace(/\./g, '').replace(/,/g, '.');
        valKm = parseFloat(noDots) || 0;
      }

      let parsedDate = new Date();
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(dataCol)) {
        const [d, m, y] = dataCol.split('.').map(Number);
        const [h, min] = oraCol.split(':').map(Number);
        parsedDate = new Date(y, m - 1, d, h || 0, min || 0);
      } else {
        parsedDate = new Date(`${dataCol}T${oraCol}:00`);
      }
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }

      const cleanUnit = unitCol.replace(/\s+B$/i, '').trim();
      const normUnit = this.normalizeCodVehicul(cleanUnit);

      const litriRaw = cols[16] || cols[9];
      let cantitateLitri: number | undefined = undefined;
      if (litriRaw) {
        const hasDotOrComma = litriRaw.includes('.') || litriRaw.includes(',');
        const val = parseFloat(litriRaw.replace(/\./g, '').replace(/,/g, '.'));
        if (!isNaN(val)) {
          if (!hasDotOrComma && val > 100) {
            cantitateLitri = Number((val / 100).toFixed(2));
          } else if (hasDotOrComma) {
            const parsedFloat = parseFloat(litriRaw.replace(/,/g, '.'));
            cantitateLitri = !isNaN(parsedFloat) ? Number(parsedFloat.toFixed(2)) : undefined;
          } else {
            cantitateLitri = val;
          }
        }
      }

      // Evităm duplicatele exacte de alimentare apărute din multiple fișiere CSV sau linii repetate
      const dedupeKey = `${normUnit}_${dataCol}_${oraCol}_${valKm}_${cantitateLitri || 0}`;
      if (seenFuelingKeys.has(dedupeKey)) continue;
      seenFuelingKeys.add(dedupeKey);

      alimentari.push({
        dataStr: dataCol,
        oraStr: oraCol,
        timestamp: parsedDate,
        kmRaw: kmCol,
        valoareKm: valKm,
        unitRaw: unitCol,
        cleanUnit,
        normUnit,
        cantitateLitri,
        linieIndex: idx + 1,
      });
    }

    // Păstrăm toate alimentările pentru fiecare vehicul (fără eliminare/deduplicare)
    const vehiculeAlimentariMap = new Map<string, {
      ultimaAlimentare: RawAlimentare;
      toateAlimentarile: RawAlimentare[];
    }>();

    for (const al of alimentari) {
      const existing = vehiculeAlimentariMap.get(al.normUnit);
      if (!existing) {
        vehiculeAlimentariMap.set(al.normUnit, {
          ultimaAlimentare: al,
          toateAlimentarile: [al],
        });
      } else {
        existing.toateAlimentarile.push(al);
        if (al.timestamp.getTime() > existing.ultimaAlimentare.timestamp.getTime()) {
          existing.ultimaAlimentare = al;
        }
      }
    }

    // Sortăm alimentările fiecărui vehicul cronologic și selectăm ultima din fișier
    for (const item of vehiculeAlimentariMap.values()) {
      item.toateAlimentarile.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      if (item.toateAlimentarile.length > 0) {
        item.ultimaAlimentare = item.toateAlimentarile[item.toateAlimentarile.length - 1];
      }
    }

    const previewRows = [];
    const allowedCatsSet = selectedCategories && selectedCategories.length > 0
      ? new Set(selectedCategories.map((c) => c.toUpperCase()))
      : null;

    for (const [normUnit, item] of vehiculeAlimentariMap.entries()) {
      const ultima = item.ultimaAlimentare;
      const vehicul = vehiculeMap.get(normUnit);

      let status = 'VALID';
      const anomaliiMesaje: string[] = [];

      const curKm = vehicul?.valoareContorCurent || 0;
      let effectiveNewKm = ultima.valoareKm;
      let isRolloverDetected = false;

      // Determinare fereastră istorică (anterior / posterior)
      const vehHistory = vehicul ? (istoricByVehicul.get(vehicul.id) || []) : [];
      const targetTime = ultima.timestamp.getTime();

      // Înregistrări strict anterioare sau egale
      const anterioare = vehHistory.filter((r) => r.dataInregistrare.getTime() <= targetTime);
      const recPrev = anterioare.length > 0 ? anterioare[anterioare.length - 1] : null;

      // Înregistrări strict posterioare
      const posterioare = vehHistory.filter((r) => r.dataInregistrare.getTime() > targetTime);
      let recNext = posterioare.length > 0 ? posterioare[0] : null;

      // Dacă nu există un record posterior în istoric, dar pe vehicul există o dată ulterioară
      const vehCurDate = vehicul?.dataInregistrareContor ? new Date(vehicul.dataInregistrareContor) : null;
      if (!recNext && vehCurDate && vehCurDate.getTime() > targetTime && curKm > 0) {
        recNext = {
          id: 'CURRENT_DB',
          vehiculId: vehicul.id,
          valoareContor: curKm,
          dataInregistrare: vehCurDate,
          sursa: 'CONTOR_CURENT',
          observatii: 'Contor curent salvat pe vehicul',
        };
      }

      const kmAnt = recPrev ? recPrev.valoareContor : null;
      const kmPost = recNext ? recNext.valoareContor : null;
      const esteInIstoricTrecut = kmPost !== null;

      if (!vehicul) {
        status = 'VEHICUL_NEGASIȚ';
        anomaliiMesaje.push(`Vehiculul "${ultima.cleanUnit}" nu a fost găsit în baza de date.`);
      } else {
        const catUpper = (vehicul.categorieEnum || '').toUpperCase();
        const isMth = (vehicul.tipMasurare || '').toUpperCase().includes('MTH');

        if (isMth) {
          status = 'CATEGORIE_IGNORATA';
          anomaliiMesaje.push(`Vehiculul este configurat pe Ore de Funcționare (MTH). Indexul KM de la pompă este exclus automat și nu se importă.`);
        } else if (allowedCatsSet && !allowedCatsSet.has(catUpper)) {
          status = 'CATEGORIE_IGNORATA';
          anomaliiMesaje.push(`Categoria "${vehicul.categorieEnum}" nu este selectată pentru actualizare.`);
        } else {
          // Verificare rollover (trecere peste 1.000.000 km)
          const baselineForRollover = kmPost !== null ? kmPost : (kmAnt !== null ? kmAnt : curKm);
          const rCheck = this.adjustOdometerRollover(effectiveNewKm, baselineForRollover);
          if (rCheck.isRollover) {
            effectiveNewKm = rCheck.adjustedKm;
            isRolloverDetected = true;
          }

          if (effectiveNewKm === 0) {
            status = 'KM_ZERO';
            anomaliiMesaje.push('Indexul introdus la pompă este 0 km.');
          } else if (kmAnt !== null && effectiveNewKm < kmAnt) {
            // Regresie față de indexul anterior
            status = 'REGRESSIE_KM';
            anomaliiMesaje.push(
              `Indexul nou (${effectiveNewKm.toLocaleString()} km) este mai mic decât indexul anterior din ${this.formatDateRo(recPrev!.dataInregistrare)} (${kmAnt.toLocaleString()} km).`
            );
          } else if (kmPost !== null && effectiveNewKm > kmPost) {
            // Regresie față de indexul posterior (viitor)
            status = 'REGRESSIE_KM';
            anomaliiMesaje.push(
              `Indexul nou (${effectiveNewKm.toLocaleString()} km) depășește indexul ulterior din ${this.formatDateRo(recNext!.dataInregistrare)} (${kmPost.toLocaleString()} km).`
            );
          } else {
            // Valoarea este între limitele ferestrei istorice!
            // Verificăm ritmul zilnic (km / zi) pentru a depista eventuale greșeli evidente de tastare
            let saltSuspect = false;

            if (kmAnt !== null) {
              const msDiff = Math.abs(targetTime - recPrev!.dataInregistrare.getTime());
              const daysDiff = Math.max(1, msDiff / (1000 * 60 * 60 * 24));
              const deltaAnt = effectiveNewKm - kmAnt;
              const dailyRate = deltaAnt / daysDiff;

              if (dailyRate > 2500) {
                status = 'DELTA_EXCESIV';
                anomaliiMesaje.push(
                  `Ritm zilnic neobișnuit de mare: +${deltaAnt.toLocaleString()} km în ${Math.round(daysDiff)} zile (~${Math.round(dailyRate).toLocaleString()} km/zi). Verificați tastarea.`
                );
                saltSuspect = true;
              }
            }

            if (!saltSuspect && kmPost !== null) {
              const msDiff = Math.abs(recNext!.dataInregistrare.getTime() - targetTime);
              const daysDiff = Math.max(1, msDiff / (1000 * 60 * 60 * 24));
              const deltaPost = kmPost - effectiveNewKm;
              const dailyRate = deltaPost / daysDiff;

              if (dailyRate > 2500) {
                status = 'DELTA_EXCESIV';
                anomaliiMesaje.push(
                  `Ritm zilnic neobișnuit de mare către indexul următor: +${deltaPost.toLocaleString()} km în ${Math.round(daysDiff)} zile (~${Math.round(dailyRate).toLocaleString()} km/zi).`
                );
                saltSuspect = true;
              }
            }

            if (!saltSuspect) {
              status = 'VALID';
              if (isRolloverDetected) {
                anomaliiMesaje.push(`Trecere peste 1.000.000 km recunoscută automat.`);
              } else if (kmAnt !== null && kmPost !== null) {
                anomaliiMesaje.push(
                  `Se încadrează în intervalul istoric (${kmAnt.toLocaleString()} km [${this.formatDateRo(recPrev!.dataInregistrare)}] ➔ ${kmPost.toLocaleString()} km [${this.formatDateRo(recNext!.dataInregistrare)}]).`
                );
              } else if (kmPost !== null) {
                anomaliiMesaje.push(
                  `Înregistrare istorică validă anterioară datei de ${this.formatDateRo(recNext!.dataInregistrare)} (${kmPost.toLocaleString()} km).`
                );
              } else if (kmAnt !== null) {
                anomaliiMesaje.push(
                  `Continuă cronologic după data de ${this.formatDateRo(recPrev!.dataInregistrare)} (+${(effectiveNewKm - kmAnt).toLocaleString()} km).`
                );
              }
            }
          }
        }
      }

      // Ajustăm toate alimentările individuale dacă vehiculul a trecut de 1.000.000 km
      const istoricAlimentariFisier = item.toateAlimentarile.map((a) => {
        let aKm = a.valoareKm;
        let subRollover = false;
        if (vehicul && !(vehicul.tipMasurare || '').toUpperCase().includes('MTH') && curKm > 0) {
          const subRCheck = this.adjustOdometerRollover(aKm, curKm);
          if (subRCheck.isRollover) {
            aKm = subRCheck.adjustedKm;
            subRollover = true;
          }
        }
        return {
          data: a.dataStr,
          ora: a.oraStr,
          km: aKm,
          rawKm: a.valoareKm,
          litri: a.cantitateLitri,
          isRollover: subRollover,
        };
      });

      if (istoricAlimentariFisier.length > 0) {
        const maxFromAlim = Math.max(...istoricAlimentariFisier.map((a) => a.km));
        if (maxFromAlim > effectiveNewKm) {
          effectiveNewKm = maxFromAlim;
        }
      }

      // Delta reală raportată la indexul anterior (sau la contor curent dacă nu există anterior)
      const finalDelta = vehicul
        ? (kmAnt !== null ? effectiveNewKm - kmAnt : effectiveNewKm - curKm)
        : 0;

      previewRows.push({
        idTemp: `${normUnit}_${ultima.dataStr}`,
        normUnit,
        cleanUnit: ultima.cleanUnit,
        unitRaw: ultima.unitRaw,
        data: ultima.dataStr,
        ora: ultima.oraStr,
        timestamp: ultima.timestamp,
        valoareKmInitiala: ultima.valoareKm,
        valoareKmPropusa: effectiveNewKm,
        contorCurent: curKm,
        deltaKm: finalDelta,
        tipMasurare: vehicul?.tipMasurare || 'KM',
        vehiculId: vehicul?.id || null,
        numarInmatriculare: vehicul?.numarInmatriculare || ultima.cleanUnit,
        numarIntern: vehicul?.numarIntern || null,
        categorieEnum: vehicul?.categorieEnum || 'NECUNOSCUT',
        status,
        anomaliiMesaje,
        aprobat: status === 'VALID',
        isRollover: isRolloverDetected,
        istoricAlimentariFisier,
        fereastraIstoric: {
          anterior: recPrev
            ? {
                km: recPrev.valoareContor,
                data: this.formatDateRo(recPrev.dataInregistrare),
                timestamp: new Date(recPrev.dataInregistrare).getTime(),
              }
            : null,
          posterior: recNext
            ? {
                km: recNext.valoareContor,
                data: this.formatDateRo(recNext.dataInregistrare),
                timestamp: new Date(recNext.dataInregistrare).getTime(),
              }
            : null,
          esteInIstoricTrecut,
        },
      });
    }

    previewRows.sort((a, b) => {
      const order: Record<string, number> = {
        REGRESSIE_KM: 1,
        KM_ZERO: 2,
        DELTA_EXCESIV: 3,
        VEHICUL_NEGASIȚ: 4,
        CATEGORIE_IGNORATA: 5,
        VALID: 6,
      };
      const diff = (order[a.status] || 99) - (order[b.status] || 99);
      if (diff !== 0) return diff;
      return a.numarInmatriculare.localeCompare(b.numarInmatriculare);
    });

    const statistici = {
      totalVehiculeGasiteInCsv: previewRows.length,
      valide: previewRows.filter((r) => r.status === 'VALID').length,
      cuAnomalii: previewRows.filter((r) => ['REGRESSIE_KM', 'KM_ZERO', 'DELTA_EXCESIV', 'VEHICUL_NEGASIȚ'].includes(r.status)).length,
      ignorateSauMth: previewRows.filter((r) => r.status === 'CATEGORIE_IGNORATA').length,
    };

    return {
      statistici,
      previewRows,
      categoriiDisponibile: categoriiDb.map((c) => c.nume),
    };
  }

  async applyCsvPompa(
    entries: Array<{
      vehiculId: string;
      valoareKm: number;
      data: string;
      ora?: string;
      observatii?: string;
      alimentari?: Array<{
        valoareKm: number;
        data: string;
        ora?: string;
        litri?: number;
      }>;
    }>,
    actorUserId?: string
  ) {
    if (!entries || entries.length === 0) {
      throw new BadRequestException('Nu a fost transmisă nicio înregistrare pentru salvare.');
    }

    const actualizate = [];
    const erori = [];

    for (const item of entries) {
      if (!item.vehiculId) {
        erori.push('Lipsește identificatorul vehiculului.');
        continue;
      }

      const v = await this.prisma.vehicul.findUnique({ where: { id: item.vehiculId } });
      if (!v) {
        erori.push(`Vehiculul cu ID ${item.vehiculId} nu a fost găsit.`);
        continue;
      }

      // REGULĂ STRICTĂ: Utilajele/Vehiculele pe MTH (ore de funcționare) NU importă indexul KM de la pompă!
      const isMth = (v.tipMasurare || '').toUpperCase().includes('MTH');
      if (isMth) {
        erori.push(`Vehiculul ${v.numarIntern} (${v.numarInmatriculare}) este configurat pe Ore de Funcționare (MTH) și este exclus de la actualizarea indexului din pompă.`);
        continue;
      }

      // Lista tuturor alimentărilor asociate acestui vehicul din fișier
      const alimentariList = (item.alimentari && item.alimentari.length > 0)
        ? item.alimentari
        : [{ valoareKm: item.valoareKm, data: item.data, ora: item.ora, litri: undefined }];

      let maxValKm = Number(item.valoareKm) || 0;
      let latestDataInreg = new Date();

      if (v.tipMasurare !== 'MTH' && v.valoareContorCurent > 0) {
        const rCheck = this.adjustOdometerRollover(maxValKm, v.valoareContorCurent);
        if (rCheck.isRollover) {
          maxValKm = rCheck.adjustedKm;
        }
      }

      // Înregistrăm fiecare alimentare individual în istoricul de contor pentru trasabilitate
      for (const al of alimentariList) {
        let alKm = Number(al.valoareKm);
        if (isNaN(alKm) || alKm < 0) continue;

        if (v.tipMasurare !== 'MTH' && v.valoareContorCurent > 0) {
          const rSubCheck = this.adjustOdometerRollover(alKm, v.valoareContorCurent);
          if (rSubCheck.isRollover) {
            alKm = rSubCheck.adjustedKm;
          }
        }

        if (alKm > maxValKm) {
          maxValKm = alKm;
        }

        let alDataInreg = new Date();
        if (al.data && /^\d{2}\.\d{2}\.\d{4}$/.test(al.data)) {
          const [d, m, y] = al.data.split('.').map(Number);
          const [h, min] = (al.ora || '12:00').split(':').map(Number);
          alDataInreg = new Date(y, m - 1, d, h || 0, min || 0);
        } else if (al.data) {
          alDataInreg = new Date(al.data);
        }
        if (isNaN(alDataInreg.getTime())) alDataInreg = new Date();

        if (alDataInreg.getTime() >= latestDataInreg.getTime()) {
          latestDataInreg = alDataInreg;
        }

        const obsParts = ['Alimentare pompă'];
        if (al.litri !== undefined && al.litri !== null) {
          obsParts.push(`${al.litri} L`);
        }
        if (al.data) {
          obsParts.push(`Data: ${al.data} ${al.ora || ''}`.trim());
        }
        const obs = obsParts.join(' | ') + ` (Index: ${alKm.toLocaleString()} km)`;

        // Verificăm dacă această alimentare nu a fost deja salvată anterior (pentru a evita duplicatele)
        const alreadyExists = await this.prisma.istoricContorVehicul.findFirst({
          where: {
            vehiculId: v.id,
            valoareContor: alKm,
            dataInregistrare: alDataInreg,
            sursa: 'ALIMENTARE',
          },
        });

        if (!alreadyExists) {
          await this.prisma.istoricContorVehicul.create({
            data: {
              vehiculId: v.id,
              valoareContor: alKm,
              dataInregistrare: alDataInreg,
              sursa: 'ALIMENTARE',
              operator: 'Pompă Combustibil (Import CSV)',
              observatii: obs,
            },
          });
        }
      }

      // Căutăm înregistrarea absolut cea mai recentă din întregul istoric al vehiculului
      const latestOverall = await this.prisma.istoricContorVehicul.findFirst({
        where: { vehiculId: v.id },
        orderBy: [
          { dataInregistrare: 'desc' },
          { valoareContor: 'desc' },
        ],
      });

      const currentDbDateMs = v.dataInregistrareContor ? new Date(v.dataInregistrareContor).getTime() : 0;
      const latestHistDateMs = latestOverall?.dataInregistrare ? new Date(latestOverall.dataInregistrare).getTime() : 0;

      let contorCurentActualizat = false;
      let nouKmFinal = v.valoareContorCurent;

      // Actualizăm contorul curent al vehiculului NUMAI DACĂ cel mai recent record din istoric
      // este la fel de recent sau mai recent decât data înregistrată pe vehicul
      if (latestOverall && latestHistDateMs >= currentDbDateMs) {
        nouKmFinal = latestOverall.valoareContor;

        // Propagare kilometraj cuplare pentru cap tractor (dacă contorul a crescut efectiv)
        if (v.categorieEnum === 'CAP_TRACTOR' && nouKmFinal > v.valoareContorCurent) {
          await this.propagaKmCuplare(v.id, v.valoareContorCurent, nouKmFinal);
        }

        await this.prisma.vehicul.update({
          where: { id: v.id },
          data: {
            valoareContorCurent: nouKmFinal,
            dataInregistrareContor: latestOverall.dataInregistrare,
          },
        });
        contorCurentActualizat = true;
      }

      actualizate.push({
        id: v.id,
        numarInmatriculare: v.numarInmatriculare,
        numarIntern: v.numarIntern,
        vechiKm: v.valoareContorCurent,
        nouKm: nouKmFinal,
        delta: nouKmFinal - v.valoareContorCurent,
        numarAlimentariSalvate: alimentariList.length,
        contorCurentActualizat,
      });
    }

    return {
      mesaj: `Au fost procesate cu succes alimentările pentru ${actualizate.length} vehicule (toate alimentările au fost arhivate în istoric)!`,
      numarActualizate: actualizate.length,
      actualizate,
      erori,
    };
  }

  // ==========================================
  // GESTIUNE ORE DE FUNCȚIONARE MTH (GPS)
  // ==========================================

  /**
   * Returnează toate utilajele (sau toate vehiculele dacă allVehicles=true)
   * cu sumarul orelor GPS înregistrate
   */
  async getUtilajeMth(allVehicles = false) {
    const whereClause: any = {};
    if (!allVehicles) {
      whereClause.OR = [
        { tipMasurare: { contains: 'MTH', mode: 'insensitive' } },
        { tipMasurare: { contains: 'mTH' } },
        { categorieEnum: { in: ['EXCAVATOR', 'BASCULA_8X4', 'INCARCATOR', 'BULLDOZER', 'COMPACTOR', 'UTILAJ', 'UTILAJ_GREU', 'INCARCATOR_FRONTAL', 'AUTOVALT', 'UTILAJ_SPECIAL'] } }
      ];
    }

    const vehicule = await this.prisma.vehicul.findMany({
      where: whereClause,
      include: {
        perioadeMth: {
          orderBy: { dataStart: 'desc' },
          take: 1,
        },
        _count: {
          select: { perioadeMth: true },
        },
      },
      orderBy: [
        { numarIntern: 'asc' },
        { numarInmatriculare: 'asc' },
      ],
    });

    return vehicule.map((v) => {
      const ultimaPerioada = v.perioadeMth[0] || null;
      return {
        id: v.id,
        numarIntern: v.numarIntern,
        numarInmatriculare: v.numarInmatriculare,
        marca: v.marca,
        model: v.model,
        anFabricatie: v.anFabricatie,
        categorieEnum: v.categorieEnum,
        tipMasurare: v.tipMasurare,
        valoareContorCurent: v.valoareContorCurent,
        valoareContorInitial: v.valoareContorInitial,
        dataInregistrareContor: v.dataInregistrareContor,
        stare: v.stare,
        numarPerioade: v._count.perioadeMth,
        ultimaPerioada: ultimaPerioada
          ? {
              id: ultimaPerioada.id,
              dataStart: ultimaPerioada.dataStart,
              dataEnd: ultimaPerioada.dataEnd,
              oreFunctionare: ultimaPerioada.oreFunctionare,
              indexContorEnd: ultimaPerioada.indexContorEnd,
              stareContinuitate: ultimaPerioada.stareContinuitate,
            }
          : null,
      };
    });
  }

  /**
   * Returnează istoricul perioadelor de funcționare mTH pentru un vehicul
   */
  async getPerioadeMth(vehiculId: string) {
    const vehicul = await this.prisma.vehicul.findUnique({
      where: { id: vehiculId },
    });
    if (!vehicul) {
      throw new NotFoundException(`Vehiculul cu ID-ul ${vehiculId} nu a fost găsit.`);
    }

    const perioade = await this.prisma.perioadaFunctionareMth.findMany({
      where: { vehiculId },
      orderBy: { dataStart: 'desc' },
    });

    const totalOre = perioade.reduce((acc, p) => acc + p.oreFunctionare, 0);

    return {
      vehicul: {
        id: vehicul.id,
        numarIntern: vehicul.numarIntern,
        numarInmatriculare: vehicul.numarInmatriculare,
        marca: vehicul.marca,
        model: vehicul.model,
        categorieEnum: vehicul.categorieEnum,
        tipMasurare: vehicul.tipMasurare,
        valoareContorCurent: vehicul.valoareContorCurent,
        valoareContorInitial: vehicul.valoareContorInitial,
        dataInregistrareContor: vehicul.dataInregistrareContor,
      },
      statistici: {
        numarPerioade: perioade.length,
        totalOreInregistrate: Number(totalOre.toFixed(2)),
        primaData: perioade.length > 0 ? perioade[perioade.length - 1].dataStart : null,
        ultimaData: perioade.length > 0 ? perioade[0].dataEnd : null,
      },
      perioade,
    };
  }

  /**
   * Verifică continuitatea și analizează golurile/suprapunerile pentru o perioadă propusă
   */
  async verificaContinuitateMth(data: {
    vehiculId: string;
    dataStart: string;
    dataEnd: string;
    oreFunctionare: number;
    excludePerioadaId?: string;
  }) {
    const vehicul = await this.prisma.vehicul.findUnique({
      where: { id: data.vehiculId },
    });
    if (!vehicul) {
      throw new NotFoundException(`Vehiculul nu a fost găsit.`);
    }

    const dStart = new Date(data.dataStart);
    const dEnd = new Date(data.dataEnd);

    if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) {
      throw new BadRequestException('Datele introduse sunt invalide.');
    }

    // Normalizare calendaristică (doar zile: YYYY-MM-DD)
    const dStartDay = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
    const dEndDay = new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate());

    if (dStartDay > dEndDay) {
      return {
        valid: false,
        status: 'EROARE',
        mesaj: 'Data de început nu poate fi ulterioară datei de sfârșit!',
      };
    }

    const diffMs = dEndDay.getTime() - dStartDay.getTime();
    const nrZile = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const maxOreTeoretic = nrZile * 24;

    const ore = Number(data.oreFunctionare || 0);
    if (ore < 0) {
      return {
        valid: false,
        status: 'EROARE',
        mesaj: 'Orele de funcționare nu pot fi negative!',
      };
    }

    if (ore > maxOreTeoretic) {
      return {
        valid: false,
        status: 'EROARE',
        mesaj: `Valoare fizic imposibilă: ${ore} ore în ${nrZile} ${nrZile === 1 ? 'zi' : 'zile'} (maximul teoretic este de ${maxOreTeoretic} ore)!`,
      };
    }

    const medieOrePeZi = nrZile > 0 ? Number((ore / nrZile).toFixed(2)) : 0;

    // Căutăm perioadele existente ale vehiculului
    const existing = await this.prisma.perioadaFunctionareMth.findMany({
      where: {
        vehiculId: data.vehiculId,
        ...(data.excludePerioadaId ? { id: { not: data.excludePerioadaId } } : {}),
      },
      orderBy: { dataStart: 'asc' },
    });

    // 1. Verificare SUPRAPUNERE (Overlap)
    const suprapunere = existing.find((p) => {
      const pStart = new Date(p.dataStart.getFullYear(), p.dataStart.getMonth(), p.dataStart.getDate());
      const pEnd = new Date(p.dataEnd.getFullYear(), p.dataEnd.getMonth(), p.dataEnd.getDate());
      return dStartDay <= pEnd && dEndDay >= pStart;
    });

    if (suprapunere) {
      const pStartStr = suprapunere.dataStart.toISOString().split('T')[0];
      const pEndStr = suprapunere.dataEnd.toISOString().split('T')[0];
      const nextAvailableDay = new Date(suprapunere.dataEnd);
      nextAvailableDay.setDate(nextAvailableDay.getDate() + 1);
      const sugestieDataStart = nextAvailableDay.toISOString().split('T')[0];

      return {
        valid: false,
        status: 'SUPRAPUNERE',
        nrZile,
        medieOrePeZi,
        mesaj: `Perioada selectată se suprapune cu perioada deja înregistrată (${pStartStr} - ${pEndStr}). Risc de dublare a orelor!`,
        perioadaSuprapusa: {
          id: suprapunere.id,
          dataStart: pStartStr,
          dataEnd: pEndStr,
          ore: suprapunere.oreFunctionare,
        },
        sugestieDataStart,
      };
    }

    // 2. Găsire perioadă anterioară și posterioară
    let prevPeriod: any = null;
    for (const p of existing) {
      const pEnd = new Date(p.dataEnd.getFullYear(), p.dataEnd.getMonth(), p.dataEnd.getDate());
      if (pEnd < dStartDay) {
        prevPeriod = p;
      }
    }

    // Calcul index contor estimat
    const startContorEstimat = prevPeriod
      ? prevPeriod.indexContorEnd
      : (vehicul.valoareContorCurent > 0 ? vehicul.valoareContorCurent : vehicul.valoareContorInitial);
    const endContorEstimat = Number((startContorEstimat + ore).toFixed(2));

    // 3. Verificare CONTINUITATE sau GOL (Gap)
    if (!prevPeriod) {
      // Este prima perioadă înregistrată (sau cea mai timpurie)
      return {
        valid: true,
        status: 'PRIMA_INREGISTRARE',
        nrZile,
        medieOrePeZi,
        mesaj: 'Aceasta este prima perioadă înregistrată pe acest utilaj.',
        indexContorStartEstimat: startContorEstimat,
        indexContorEndEstimat: endContorEstimat,
        estePrimaPerioada: true,
      };
    }

    const prevEndDay = new Date(prevPeriod.dataEnd.getFullYear(), prevPeriod.dataEnd.getMonth(), prevPeriod.dataEnd.getDate());
    const gapDiffMs = dStartDay.getTime() - prevEndDay.getTime();
    const gapTotalZile = Math.round(gapDiffMs / (1000 * 60 * 60 * 24)); // Dacă dStartDay e fix a doua zi => gapTotalZile = 1

    if (gapTotalZile === 1) {
      // Fix a doua zi => Continuitate perfectă!
      const prevEndStr = prevPeriod.dataEnd.toISOString().split('T')[0];
      return {
        valid: true,
        status: 'CONTINUU',
        nrZile,
        medieOrePeZi,
        mesaj: `Continuitate perfectă: Perioada continuă direct de unde s-a oprit ultima înregistrare (${prevEndStr}).`,
        indexContorStartEstimat: startContorEstimat,
        indexContorEndEstimat: endContorEstimat,
      };
    }

    if (gapTotalZile > 1) {
      // Există un gol (gap) de n zile lipsă!
      const zileGol = gapTotalZile - 1;
      const dataGolStart = new Date(prevEndDay);
      dataGolStart.setDate(dataGolStart.getDate() + 1);
      const dataGolEnd = new Date(dStartDay);
      dataGolEnd.setDate(dataGolEnd.getDate() - 1);

      const dataGolStartStr = dataGolStart.toISOString().split('T')[0];
      const dataGolEndStr = dataGolEnd.toISOString().split('T')[0];
      const prevEndStr = prevPeriod.dataEnd.toISOString().split('T')[0];

      return {
        valid: true, // Valid dar necesită confirmare sau corectare
        status: 'GOL_DETECTAT',
        nrZile,
        medieOrePeZi,
        zileGol,
        dataGolInceput: dataGolStartStr,
        dataGolSfarsit: dataGolEndStr,
        sugestieDataStart: dataGolStartStr, // 1-click button to eliminate gap!
        mesaj: `Interval lipsă de ${zileGol} ${zileGol === 1 ? 'zi' : 'zile'} (${dataGolStartStr} - ${dataGolEndStr}) între ultima perioadă salvată (${prevEndStr}) și perioada curentă.`,
        indexContorStartEstimat: startContorEstimat,
        indexContorEndEstimat: endContorEstimat,
      };
    }

    return {
      valid: true,
      status: 'CONTINUU',
      nrZile,
      medieOrePeZi,
      mesaj: 'Perioada este validă.',
      indexContorStartEstimat: startContorEstimat,
      indexContorEndEstimat: endContorEstimat,
    };
  }

  /**
   * Înregistrează o perioadă nouă de funcționare mTH și recalculează lanțul cronologic
   */
  async inregistreazaPerioadaMth(data: {
    vehiculId: string;
    dataStart: string;
    dataEnd: string;
    oreFunctionare: number;
    confirmaInactivDacaGol?: boolean;
    observatii?: string;
    operator?: string;
    indexContorStartPersonalizat?: number;
  }) {
    const validare = await this.verificaContinuitateMth({
      vehiculId: data.vehiculId,
      dataStart: data.dataStart,
      dataEnd: data.dataEnd,
      oreFunctionare: data.oreFunctionare,
    });

    if (!validare.valid && validare.status === 'EROARE') {
      throw new BadRequestException(validare.mesaj);
    }

    if (validare.status === 'SUPRAPUNERE') {
      throw new BadRequestException(validare.mesaj);
    }

    let stareContinuitate = validare.status === 'GOL_DETECTAT' ? 'GOL_CONFIRMAT_INACTIV' : (validare.status || 'CONTINUU');
    let areGol = false;
    let zileGol = 0;
    let dataGolInceput: Date | null = null;
    let dataGolSfarsit: Date | null = null;
    let explicatieGol: string | null = null;

    if (validare.status === 'GOL_DETECTAT') {
      if (!data.confirmaInactivDacaGol) {
        throw new BadRequestException(
          `Există un interval lipsă de ${validare.zileGol} zile. Confirmați că utilajul a fost inactiv sau corectați data de început.`
        );
      }
      areGol = true;
      zileGol = validare.zileGol || 0;
      dataGolInceput = validare.dataGolInceput ? new Date(validare.dataGolInceput) : null;
      dataGolSfarsit = validare.dataGolSfarsit ? new Date(validare.dataGolSfarsit) : null;
      explicatieGol = `Utilaj inactiv confirmat (${zileGol} ${zileGol === 1 ? 'zi' : 'zile'} pauză: ${validare.dataGolInceput} - ${validare.dataGolSfarsit})`;
      stareContinuitate = 'GOL_CONFIRMAT_INACTIV';
    }

    const dStart = new Date(data.dataStart);
    const dEnd = new Date(data.dataEnd);

    // Salvăm temporar perioada
    const nouaPerioada = await this.prisma.perioadaFunctionareMth.create({
      data: {
        vehiculId: data.vehiculId,
        dataStart: dStart,
        dataEnd: dEnd,
        oreFunctionare: Number(data.oreFunctionare),
        indexContorStart: validare.indexContorStartEstimat || 0,
        indexContorEnd: validare.indexContorEndEstimat || 0,
        areGol,
        zileGol,
        dataGolInceput,
        dataGolSfarsit,
        stareContinuitate,
        explicatieGol,
        observatii: data.observatii || null,
        operator: data.operator || null,
        sursa: 'GPS_MANUAL',
      },
    });

    // Rulăm recalcularea cronologică completă a timpului pentru a asigura integritatea contorului
    await this.recalculeazaCronologieMth(data.vehiculId, data.indexContorStartPersonalizat);

    // Returnăm perioada actualizată și starea curentă a utilajului
    const perioadaActualizata = await this.prisma.perioadaFunctionareMth.findUnique({
      where: { id: nouaPerioada.id },
    });
    const vehicul = await this.prisma.vehicul.findUnique({
      where: { id: data.vehiculId },
    });

    return {
      mesaj: `Perioada de funcționare a fost salvată cu succes! Contor utilaj: ${vehicul?.valoareContorCurent} mTH.`,
      perioada: perioadaActualizata,
      vehicul,
    };
  }

  /**
   * Recalculează în lanț cronologic toate perioadele unui vehicul și actualizează contorul curent
   */
  async recalculeazaCronologieMth(vehiculId: string, customInitialBase?: number) {
    const vehicul = await this.prisma.vehicul.findUnique({
      where: { id: vehiculId },
    });
    if (!vehicul) return;

    const perioade = await this.prisma.perioadaFunctionareMth.findMany({
      where: { vehiculId },
      orderBy: [
        { dataStart: 'asc' },
        { dataEnd: 'asc' },
      ],
    });

    if (perioade.length === 0) {
      return;
    }

    // Baza inițială a contorului
    let contorRulant = customInitialBase !== undefined && customInitialBase !== null
      ? Number(customInitialBase)
      : (vehicul.valoareContorInitial > 0 ? vehicul.valoareContorInitial : 0);

    // Dacă există deja o bază setată pe prima perioadă și nu este specificată o altă bază:
    if (contorRulant === 0 && perioade[0].indexContorStart > 0 && customInitialBase === undefined) {
      contorRulant = perioade[0].indexContorStart;
    }

    for (let i = 0; i < perioade.length; i++) {
      const p = perioade[i];
      const startVal = Number(contorRulant.toFixed(2));
      const endVal = Number((startVal + p.oreFunctionare).toFixed(2));

      // Verificăm golul față de perioada precedentă
      let areGol = false;
      let zileGol = 0;
      let dataGolInceput: Date | null = null;
      let dataGolSfarsit: Date | null = null;
      let stareContinuitate = p.stareContinuitate;

      if (i > 0) {
        const prevP = perioade[i - 1];
        const prevEndDay = new Date(prevP.dataEnd.getFullYear(), prevP.dataEnd.getMonth(), prevP.dataEnd.getDate());
        const curStartDay = new Date(p.dataStart.getFullYear(), p.dataStart.getMonth(), p.dataStart.getDate());
        const diffDays = Math.round((curStartDay.getTime() - prevEndDay.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          areGol = true;
          zileGol = diffDays - 1;
          const dGStart = new Date(prevEndDay);
          dGStart.setDate(dGStart.getDate() + 1);
          const dGEnd = new Date(curStartDay);
          dGEnd.setDate(dGEnd.getDate() - 1);
          dataGolInceput = dGStart;
          dataGolSfarsit = dGEnd;
          if (stareContinuitate !== 'GOL_CONFIRMAT_INACTIV') {
            stareContinuitate = 'GOL_CONFIRMAT_INACTIV';
          }
        } else {
          areGol = false;
          zileGol = 0;
          stareContinuitate = 'CONTINUU';
        }
      } else {
        stareContinuitate = 'PRIMA_INREGISTRARE';
      }

      await this.prisma.perioadaFunctionareMth.update({
        where: { id: p.id },
        data: {
          indexContorStart: startVal,
          indexContorEnd: endVal,
          areGol,
          zileGol,
          dataGolInceput,
          dataGolSfarsit,
          stareContinuitate,
        },
      });

      contorRulant = endVal;
    }

    // Ultima perioadă cronologică devine contorul curent al utilajului
    const ultimaPerioada = perioade[perioade.length - 1];
    const valoareFinala = contorRulant;

    await this.prisma.vehicul.update({
      where: { id: vehiculId },
      data: {
        valoareContorCurent: valoareFinala,
        dataInregistrareContor: ultimaPerioada.dataEnd,
      },
    });

    // Înregistrăm intrarea în IstoricContorVehicul pentru ultima perioadă
    await this.prisma.istoricContorVehicul.create({
      data: {
        vehiculId,
        valoareContor: valoareFinala,
        dataInregistrare: ultimaPerioada.dataEnd,
        sursa: 'GPS',
        observatii: `Sincronizare ore GPS mTH (Perioada ${ultimaPerioada.dataStart.toISOString().split('T')[0]} - ${ultimaPerioada.dataEnd.toISOString().split('T')[0]}, +${ultimaPerioada.oreFunctionare} ore)`,
      },
    });
  }

  /**
   * Șterge o perioadă și recalculează lanțul cronologic
   */
  async stergePerioadaMth(id: string) {
    const perioada = await this.prisma.perioadaFunctionareMth.findUnique({
      where: { id },
    });
    if (!perioada) {
      throw new NotFoundException(`Perioada cu ID-ul ${id} nu a fost găsită.`);
    }

    const vehiculId = perioada.vehiculId;
    await this.prisma.perioadaFunctionareMth.delete({
      where: { id },
    });

    // Recalculăm lanțul
    await this.recalculeazaCronologieMth(vehiculId);

    // Dacă nu mai există perioade, resetăm la contor inițial
    const remaining = await this.prisma.perioadaFunctionareMth.count({
      where: { vehiculId },
    });
    if (remaining === 0) {
      const v = await this.prisma.vehicul.findUnique({ where: { id: vehiculId } });
      if (v) {
        await this.prisma.vehicul.update({
          where: { id: vehiculId },
          data: {
            valoareContorCurent: v.valoareContorInitial,
          },
        });
      }
    }

    return {
      mesaj: 'Perioada de funcționare a fost ștearsă cu succes, iar contorul a fost recalculat.',
    };
  }

  /**
   * Actualizează o perioadă existentă și recalculează lanțul cronologic
   */
  async actualizeazaPerioadaMth(id: string, data: {
    dataStart?: string;
    dataEnd?: string;
    oreFunctionare?: number;
    observatii?: string;
    confirmaInactivDacaGol?: boolean;
  }) {
    const existenta = await this.prisma.perioadaFunctionareMth.findUnique({
      where: { id },
    });
    if (!existenta) {
      throw new NotFoundException(`Perioada nu a fost găsită.`);
    }

    const updateData: any = {};
    if (data.observatii !== undefined) updateData.observatii = data.observatii;
    if (data.oreFunctionare !== undefined) updateData.oreFunctionare = Number(data.oreFunctionare);
    if (data.dataStart) updateData.dataStart = new Date(data.dataStart);
    if (data.dataEnd) updateData.dataEnd = new Date(data.dataEnd);

    await this.prisma.perioadaFunctionareMth.update({
      where: { id },
      data: updateData,
    });

    await this.recalculeazaCronologieMth(existenta.vehiculId);

    const updated = await this.prisma.perioadaFunctionareMth.findUnique({
      where: { id },
    });

    return {
      mesaj: 'Perioada a fost modificată cu succes, iar contorul a fost recalculat.',
      perioada: updated,
    };
  }
}


