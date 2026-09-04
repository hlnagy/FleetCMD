import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiculeService {
  constructor(private prisma: PrismaService) {}

  async getCategorii() {
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
    if (existing) return existing;

    return this.prisma.categorieVehicul.create({
      data: {
        nume: catNumeUpper,
        descriere: descriere || `Categorie utilaj ${catNumeUpper}`,
      },
    });
  }

  async updateCategorieVehicul(id: string, numeNou: string, descriere?: string) {
    const oldCat = await this.prisma.categorieVehicul.findUnique({ where: { id } });
    if (!oldCat) throw new NotFoundException('Categoria nu a fost găsită.');

    const newNumeUpper = (numeNou || oldCat.nume).trim().toUpperCase().replace(/\s+/g, '_');

    if (oldCat.nume !== newNumeUpper) {
      const exist = await this.prisma.categorieVehicul.findUnique({ where: { nume: newNumeUpper } });
      if (exist && exist.id !== id) {
        throw new BadRequestException(`Categoria "${newNumeUpper}" există deja.`);
      }

      await this.prisma.vehicul.updateMany({
        where: { categorieEnum: oldCat.nume },
        data: { categorieEnum: newNumeUpper },
      });
    }

    return this.prisma.categorieVehicul.update({
      where: { id },
      data: {
        nume: newNumeUpper,
        descriere: descriere !== undefined ? descriere : oldCat.descriere,
      },
    });
  }

  async deleteCategorieVehicul(id: string) {
    const cat = await this.prisma.categorieVehicul.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoria nu a fost găsită.');

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

    return this.prisma.categorieVehicul.delete({ where: { id } });
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
}
