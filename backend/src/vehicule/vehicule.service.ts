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
            { codPozitie: `${axNum}-SS`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Simplu` },
            { codPozitie: `${axNum}-DS`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Simplu` }
          );
        } else if (numRoti === 4) {
          axe.push(
            { codPozitie: `${axNum}-SS`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Exterior` },
            { codPozitie: `${axNum}-SI`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Interior` },
            { codPozitie: `${axNum}-DI`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Interior` },
            { codPozitie: `${axNum}-DS`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Exterior` }
          );
        } else if (numRoti === 6) {
          axe.push(
            { codPozitie: `${axNum}-SS1`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Ext 1` },
            { codPozitie: `${axNum}-SS2`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Ext 2` },
            { codPozitie: `${axNum}-SI`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Stânga Int` },
            { codPozitie: `${axNum}-DI`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Int` },
            { codPozitie: `${axNum}-DS2`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Ext 2` },
            { codPozitie: `${axNum}-DS1`, numarAx: axNum, descrierePozitie: `Axă ${axNum} Dreapta Ext 1` }
          );
        } else {
          for (let r = 1; r <= numRoti; r++) {
            const side = r <= Math.ceil(numRoti / 2) ? 'S' : 'D';
            const posCode = `${axNum}-${side}${r}`;
            axe.push({ codPozitie: posCode, numarAx: axNum, descrierePozitie: `Axă ${axNum} Poziție ${r}` });
          }
        }
      }
    } else if (categorie === 'CAP_TRACTOR') {
      axe.push(
        { codPozitie: '1-SS', numarAx: 1, descrierePozitie: 'Axă 1 Stânga Simplu (Directoare)' },
        { codPozitie: '1-DS', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta Simplu (Directoare)' },
        { codPozitie: '2-SS', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Exterior (Tracțiune)' },
        { codPozitie: '2-SI', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Interior (Tracțiune)' },
        { codPozitie: '2-DI', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Interior (Tracțiune)' },
        { codPozitie: '2-DS', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Exterior (Tracțiune)' }
      );
    } else if (categorie === 'REMORCA' || categorie === 'SEMIREMORCA') {
      axe.push(
        { codPozitie: '1-SS', numarAx: 1, descrierePozitie: 'Axă 1 Stânga Simplu' },
        { codPozitie: '1-DS', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta Simplu' },
        { codPozitie: '2-SS', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Simplu' },
        { codPozitie: '2-DS', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Simplu' },
        { codPozitie: '3-SS', numarAx: 3, descrierePozitie: 'Axă 3 Stânga Simplu' },
        { codPozitie: '3-DS', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta Simplu' }
      );
    } else if (categorie === 'BASCULANTA') {
      axe.push(
        { codPozitie: '1-SS', numarAx: 1, descrierePozitie: 'Axă 1 Stânga Simplu (Directoare)' },
        { codPozitie: '1-DS', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta Simplu (Directoare)' },
        { codPozitie: '2-SS', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Simplu (Directoare 2)' },
        { codPozitie: '2-DS', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Simplu (Directoare 2)' },
        { codPozitie: '3-SS', numarAx: 3, descrierePozitie: 'Axă 3 Stânga Ext (Tracțiune)' },
        { codPozitie: '3-SI', numarAx: 3, descrierePozitie: 'Axă 3 Stânga Int (Tracțiune)' },
        { codPozitie: '3-DI', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta Int (Tracțiune)' },
        { codPozitie: '3-DS', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta Ext (Tracțiune)' },
        { codPozitie: '4-SS', numarAx: 4, descrierePozitie: 'Axă 4 Stânga Ext (Tracțiune)' },
        { codPozitie: '4-SI', numarAx: 4, descrierePozitie: 'Axă 4 Stânga Int (Tracțiune)' },
        { codPozitie: '4-DI', numarAx: 4, descrierePozitie: 'Axă 4 Dreapta Int (Tracțiune)' },
        { codPozitie: '4-DS', numarAx: 4, descrierePozitie: 'Axă 4 Dreapta Ext (Tracțiune)' }
      );
    } else {
      axe.push(
        { codPozitie: '1-SS', numarAx: 1, descrierePozitie: 'Axă 1 Stânga Simplu' },
        { codPozitie: '1-DS', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta Simplu' },
        { codPozitie: '2-SS', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Simplu' },
        { codPozitie: '2-DS', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Simplu' }
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
      },
    });

    if (!vehicul) throw new NotFoundException('Vehiculul nu a fost găsit.');
    return vehicul;
  }

  async updateVehicul(id: string, data: any) {
    const v = await this.prisma.vehicul.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Vehicul negăsit');

    const updated = await this.prisma.vehicul.update({
      where: { id },
      data: {
        numarInmatriculare: data.numarInmatriculare ?? v.numarInmatriculare,
        serieSasiu: data.serieSasiu || data.vin || v.serieSasiu,
        numarIntern: data.numarIntern ?? v.numarIntern,
        marca: data.marca ?? v.marca,
        model: data.model ?? v.model,
        anFabricatie: data.anFabricatie ? Number(data.anFabricatie) : v.anFabricatie,
        valoareContorCurent: data.valoareContorCurent !== undefined ? Number(data.valoareContorCurent) : v.valoareContorCurent,
        valoareContorInitial: data.valoareContorInitial !== undefined ? Number(data.valoareContorInitial) : v.valoareContorInitial,
        dataInregistrareContor: data.dataContorInitial || data.dataInregistrareContor ? new Date(data.dataContorInitial || data.dataInregistrareContor) : v.dataInregistrareContor,
        tarifOrarStandard: data.tarifOrarStandard || data.tarifOrarManopera !== undefined ? Number(data.tarifOrarStandard || data.tarifOrarManopera) : v.tarifOrarStandard,
      },
    });

    if (data.configuratieManualAxe && Array.isArray(data.configuratieManualAxe)) {
      await this.generarePozitiiAxeImplicit(id, updated.categorieEnum, data.configuratieManualAxe);
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
    await this.prisma.vehicul.update({
      where: { id: data.vehiculId },
      data: {
        valoareContorCurent: valContor,
        dataInregistrareContor: dataInreg,
      },
    });

    return { mesaj: `✅ Contor înregistrat cu succes pentru ${v.numarIntern}: ${valContor} ${v.tipMasurare}!`, entry };
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
    return { mesaj: `✅ Actualizate ${rezultate.length} contoare de flotă cu succes!`, rezultate };
  }

  // Istoric Audit Contoare Flotă
  async getIstoricContoare(vehiculId?: string) {
    const where: any = {};
    if (vehiculId) where.vehiculId = vehiculId;
    return this.prisma.istoricContorVehicul.findMany({
      where,
      include: { vehicul: true },
      orderBy: { dataInregistrare: 'desc' },
      take: 100,
    });
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
      mesaj: `✅ Import GPS finalizat! S-au procesat ${rezultate.length} contoare.`,
      rezultate,
      erori,
    };
  }
}
