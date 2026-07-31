import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VehiculeService {
  constructor(private prisma: PrismaService) {}

  async getCategorii() {
    const implicite = [
      { id: 'CAP_TRACTOR', nume: 'Cap Tractor (2 Axe, 6 Roți - 2 Ghidaj / 4 Tracțiune)', esteEnum: true },
      { id: 'REMORCA', nume: 'Remorcă / Semiremorcă (3 Axe, 6 Roți)', esteEnum: true },
      { id: 'BASCULANTA', nume: 'Basculantă 4 Axe (4 Axe, 12 Roți)', esteEnum: true },
      { id: 'EXCAVATOR', nume: 'Excavator / Utilitară (2 Axe, 4 Roți)', esteEnum: true },
      { id: 'INCARCATOR_FRONTAL', nume: 'Încărcător Frontal (2 Axe, 4 Roți)', esteEnum: true },
      { id: 'BULLDOZER', nume: 'Bulldozer (Șenile / 2 Axe)', esteEnum: true },
      { id: 'AUTOVALT', nume: 'Autovalț / Compactor (2 Axe, 2-4 Roți)', esteEnum: true },
      { id: 'UTILAJ_SPECIAL', nume: 'Utilaj Special (2 Axe, 4 Roți)', esteEnum: true },
    ];
    return { categoriiEnum: implicite, categoriiPersonalizate: [] };
  }

  async createCategoriePersonalizata(nume: string, descriere?: string) {
    return { id: nume, nume, descriere };
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
}
