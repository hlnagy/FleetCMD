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
        cuplariSemiremorca: { where: { esteActiv: true }, include: { capTractor: true } },
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
        const val = parseFloat(litriRaw.replace(/\./g, '').replace(/,/g, '.'));
        cantitateLitri = !isNaN(val) ? (val > 1000 ? val / 1000 : val) : undefined;
      }

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

    // Deduplicare pe zi și vehicul (întotdeauna ultima alimentare din acea zi)
    const alimentariPerZiMap = new Map<string, RawAlimentare>();
    for (const al of alimentari) {
      const key = `${al.normUnit}___${al.dataStr}`;
      const existing = alimentariPerZiMap.get(key);
      if (!existing || al.timestamp.getTime() > existing.timestamp.getTime()) {
        alimentariPerZiMap.set(key, al);
      }
    }

    // Cea mai recentă alimentare din întregul fișier pentru fiecare vehicul
    const vehiculeAlimentariMap = new Map<string, {
      ultimaAlimentare: RawAlimentare;
      toateAlimentarileZi: RawAlimentare[];
    }>();

    for (const al of alimentariPerZiMap.values()) {
      const existing = vehiculeAlimentariMap.get(al.normUnit);
      if (!existing) {
        vehiculeAlimentariMap.set(al.normUnit, {
          ultimaAlimentare: al,
          toateAlimentarileZi: [al],
        });
      } else {
        existing.toateAlimentarileZi.push(al);
        if (al.timestamp.getTime() > existing.ultimaAlimentare.timestamp.getTime()) {
          existing.ultimaAlimentare = al;
        }
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

      if (!vehicul) {
        status = 'VEHICUL_NEGASIȚ';
        anomaliiMesaje.push(`Vehiculul "${ultima.cleanUnit}" nu a fost găsit în baza de date.`);
      } else {
        const catUpper = (vehicul.categorieEnum || '').toUpperCase();
        const isMth = vehicul.tipMasurare === 'MTH';

        if (allowedCatsSet && !allowedCatsSet.has(catUpper)) {
          status = 'CATEGORIE_IGNORATA';
          anomaliiMesaje.push(`Categoria "${vehicul.categorieEnum}" nu este selectată pentru actualizare.`);
        } else if (isMth) {
          status = 'CATEGORIE_IGNORATA';
          anomaliiMesaje.push(`Vehiculul este pe Ore de Funcționare (MTH), nu pe Kilometri.`);
        } else {
          const curKm = vehicul.valoareContorCurent || 0;
          const newKm = ultima.valoareKm;
          const delta = newKm - curKm;

          if (newKm === 0) {
            status = 'KM_ZERO';
            anomaliiMesaje.push('Indexul introdus la pompă este 0 km.');
          } else if (curKm > 0 && newKm < curKm) {
            status = 'REGRESSIE_KM';
            anomaliiMesaje.push(`Indexul nou (${newKm} km) este mai mic decât contorul curent (${curKm} km).`);
          } else if (curKm > 0 && delta > 5000) {
            status = 'DELTA_EXCESIV';
            anomaliiMesaje.push(`Salt mare de kilometraj (+${delta.toLocaleString()} km). Posibilă cifră în plus.`);
          }
        }
      }

      const curKm = vehicul?.valoareContorCurent || 0;
      const newKm = ultima.valoareKm;
      const delta = vehicul ? newKm - curKm : 0;

      previewRows.push({
        idTemp: `${normUnit}_${ultima.dataStr}`,
        normUnit,
        cleanUnit: ultima.cleanUnit,
        unitRaw: ultima.unitRaw,
        data: ultima.dataStr,
        ora: ultima.oraStr,
        timestamp: ultima.timestamp,
        valoareKmInitiala: newKm,
        valoareKmPropusa: newKm,
        contorCurent: curKm,
        deltaKm: delta,
        tipMasurare: vehicul?.tipMasurare || 'KM',
        vehiculId: vehicul?.id || null,
        numarInmatriculare: vehicul?.numarInmatriculare || ultima.cleanUnit,
        numarIntern: vehicul?.numarIntern || null,
        categorieEnum: vehicul?.categorieEnum || 'NECUNOSCUT',
        status,
        anomaliiMesaje,
        aprobat: status === 'VALID',
        istoricAlimentariFisier: item.toateAlimentarileZi.map((a) => ({
          data: a.dataStr,
          ora: a.oraStr,
          km: a.valoareKm,
          litri: a.cantitateLitri,
        })),
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

      const valKm = Number(item.valoareKm);
      if (isNaN(valKm) || valKm < 0) {
        erori.push(`Valoare kilometraj invalidă (${item.valoareKm})`);
        continue;
      }

      const v = await this.prisma.vehicul.findUnique({ where: { id: item.vehiculId } });
      if (!v) {
        erori.push(`Vehiculul cu ID ${item.vehiculId} nu a fost găsit.`);
        continue;
      }

      let dataInreg = new Date();
      if (item.data && /^\d{2}\.\d{2}\.\d{4}$/.test(item.data)) {
        const [d, m, y] = item.data.split('.').map(Number);
        const [h, min] = (item.ora || '12:00').split(':').map(Number);
        dataInreg = new Date(y, m - 1, d, h || 0, min || 0);
      } else if (item.data) {
        dataInreg = new Date(item.data);
      }

      const obs = item.observatii || `Alimentare pompă carburant ${item.data || ''} ${item.ora || ''} (${valKm} km)`;

      await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: v.id,
          valoareContor: valKm,
          dataInregistrare: dataInreg,
          sursa: 'ALIMENTARE',
          operator: 'Pompă Combustibil (Import CSV)',
          observatii: obs,
        },
      });

      if (v.categorieEnum === 'CAP_TRACTOR' && valKm > v.valoareContorCurent) {
        await this.propagaKmCuplare(v.id, v.valoareContorCurent, valKm);
      }

      await this.prisma.vehicul.update({
        where: { id: v.id },
        data: {
          valoareContorCurent: valKm,
          dataInregistrareContor: dataInreg,
        },
      });

      actualizate.push({
        id: v.id,
        numarInmatriculare: v.numarInmatriculare,
        numarIntern: v.numarIntern,
        vechiKm: v.valoareContorCurent,
        nouKm: valKm,
        delta: valKm - v.valoareContorCurent,
      });
    }

    return {
      mesaj: `Au fost actualizate cu succes contoarele pentru ${actualizate.length} vehicule!`,
      numarActualizate: actualizate.length,
      actualizate,
      erori,
    };
  }
}

