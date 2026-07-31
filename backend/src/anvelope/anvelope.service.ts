import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnvelopeService {
  constructor(private prisma: PrismaService) {}

  async getAnvelopeStoc() {
    return this.prisma.anvelopa.findMany({
      where: { stare: 'IN_STOC' },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Înregistrare Anvelopă Nouă sau Folosită (cu gestionare înlocuire anvelopă veche)
  async inregistreazaAnvelopaNoua(data: {
    codDot: string;
    serieAnvelopa?: string;
    marca: string;
    model: string;
    dimensiune: string;
    adancimeInitialaMm: number;
    adancimeCurentaMm: number;
    pretAchizitie: number;
    stare?: string; // "IN_STOC" | "MONTATA"
    vehiculId?: string;
    pozitieAxId?: string;
    actiuneAnvelopaVeche?: 'DEMONTARE_IN_STOC' | 'CASARE_STOC';
    operator?: string;
  }) {
    let stare = data.stare || 'IN_STOC';
    let kilometrajMontare = 0;
    let pozitieTarget: any = null;

    if (data.pozitieAxId) {
      pozitieTarget = await this.prisma.pozitieAx.findUnique({
        where: { id: data.pozitieAxId },
        include: { vehicul: true, anvelopa: true },
      });

      if (pozitieTarget && pozitieTarget.vehicul) {
        stare = 'MONTATA';
        kilometrajMontare = pozitieTarget.vehicul.valoareContorCurent;
      }
    }

    const serieUnica = data.serieAnvelopa || `SN-${Date.now().toString().slice(-6)}`;

    // Dacă poziția pe axă este deja ocupată de altă anvelopă, executăm acțiunea de înlocuire!
    if (pozitieTarget && pozitieTarget.anvelopa) {
      const vechea = pozitieTarget.anvelopa;
      const actiune = data.actiuneAnvelopaVeche || 'DEMONTARE_IN_STOC';
      const valoareContor = pozitieTarget.vehicul?.valoareContorCurent || 0;
      const mecanic = data.operator || 'Mecanic Atelier';

      if (actiune === 'CASARE_STOC') {
        await this.prisma.anvelopa.update({
          where: { id: vechea.id },
          data: { stare: 'CASATA', vehiculId: null, pozitieAxId: null },
        });

        await this.prisma.istoricPermutareAnvelopa.create({
          data: {
            anvelopaId: vechea.id,
            vehiculId: pozitieTarget.vehiculId,
            pozitieSursaCod: pozitieTarget.codPozitie,
            pozitieDestCod: 'CASATĂ / DEȘEU',
            valoareContor,
            operator: mecanic,
            observatii: `Demontată & casată definitiv din stoc la montarea anvelopei noi ${serieUnica}`,
          },
        });
      } else {
        await this.prisma.anvelopa.update({
          where: { id: vechea.id },
          data: { stare: 'IN_STOC', vehiculId: null, pozitieAxId: null },
        });

        await this.prisma.istoricPermutareAnvelopa.create({
          data: {
            anvelopaId: vechea.id,
            vehiculId: pozitieTarget.vehiculId,
            pozitieSursaCod: pozitieTarget.codPozitie,
            pozitieDestCod: 'STOC_REZERVĂ',
            valoareContor,
            operator: mecanic,
            observatii: `Demontată în stoc ca anvelopă de rezervă la montarea anvelopei noi ${serieUnica}`,
          },
        });
      }
    }

    const anvelopa = await this.prisma.anvelopa.create({
      data: {
        codDot: data.codDot,
        serieAnvelopa: serieUnica,
        marca: data.marca,
        model: data.model,
        dimensiune: data.dimensiune,
        adancimeInitialaMm: Number(data.adancimeInitialaMm || 14),
        adancimeCurentaMm: Number(data.adancimeCurentaMm || 14),
        pretAchizitie: Number(data.pretAchizitie || 0),
        stare,
        vehiculId: data.vehiculId || (pozitieTarget ? pozitieTarget.vehiculId : null),
        pozitieAxId: data.pozitieAxId || null,
        kilometrajMontare,
      },
    });

    if (data.pozitieAxId && pozitieTarget) {
      await this.prisma.istoricPermutareAnvelopa.create({
        data: {
          anvelopaId: anvelopa.id,
          vehiculId: pozitieTarget.vehiculId,
          pozitieSursaCod: 'ACHIZIȚIE / REPAZIT',
          pozitieDestCod: pozitieTarget.codPozitie,
          valoareContor: pozitieTarget.vehicul ? pozitieTarget.vehicul.valoareContorCurent : 0,
          operator: data.operator || 'Mecanic Atelier',
          observatii: `Felszerelve pe axa ${pozitieTarget.numarAx} poz. ${pozitieTarget.codPozitie} (Profil: ${data.adancimeCurentaMm}mm)`,
        },
      });
    }

    return anvelopa;
  }

  // Centralizator Flotă Anvelope
  async getFlotaAnvelope() {
    const anvelope = await this.prisma.anvelopa.findMany({
      include: {
        vehicul: true,
        pozitieAx: true,
        masuratori: { orderBy: { dataMasurare: 'desc' }, take: 1 },
      },
      orderBy: { adancimeCurentaMm: 'asc' },
    });

    return anvelope.map((a) => {
      const uzuraPct = Math.round(((a.adancimeInitialaMm - a.adancimeCurentaMm) / a.adancimeInitialaMm) * 100);
      const esteKritica = a.adancimeCurentaMm <= 3.0;
      return {
        ...a,
        uzuraPct,
        esteKritica,
        vehiculNumarIntern: a.vehicul?.numarIntern || 'NEMONTATĂ',
        vehiculInmatriculare: a.vehicul?.numarInmatriculare || '-',
        pozitieCod: a.pozitieAx?.codPozitie || 'STOC',
      };
    });
  }

  async getHartaAxeVehicul(vehiculId: string) {
    let vehicul = await this.prisma.vehicul.findUnique({
      where: { id: vehiculId },
      include: {
        pozitiiAxe: {
          include: {
            anvelopa: {
              include: { masuratori: { orderBy: { dataMasurare: 'desc' } } },
            },
          },
          orderBy: [{ numarAx: 'asc' }, { codPozitie: 'asc' }],
        },
      },
    });

    if (!vehicul) throw new NotFoundException('Vehicul negăsit.');

    if (!vehicul.pozitiiAxe || vehicul.pozitiiAxe.length === 0) {
      const axe: Array<{ codPozitie: string; numarAx: number; descrierePozitie: string }> = [];
      const cat = vehicul.categorieEnum || 'CAP_TRACTOR';

      if (cat === 'BASCULANTA') {
        axe.push(
          { codPozitie: '1-SS', numarAx: 1, descrierePozitie: 'Axă 1 Stânga Simplu (Directoare)' },
          { codPozitie: '1-DS', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta Simplu (Directoare)' },
          { codPozitie: '2-SS', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Simplu (Directoare 2)' },
          { codPozitie: '2-DS', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Simplu (Directoare 2)' },
          { codPozitie: '3-SS', numarAx: 3, descrierePozitie: 'Axă 3 Stânga Ext (Tracțiune)' },
          { codPozitie: '3-SI', numarAx: 3, descrierePozitie: 'Axă 3 Stânga Int (Tracțiune)' },
          { codPozitie: '3-DI', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta Int (Tracțiune)' },
          { codPozitie: '3-DS', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta Ext (Tracțiune)' },
          { codPozitie: '4-SS', numarAx: 4, descrierePozitie: 'Axă 4 Stânga Ext (Tracțiune 2)' },
          { codPozitie: '4-SI', numarAx: 4, descrierePozitie: 'Axă 4 Stânga Int (Tracțiune 2)' },
          { codPozitie: '4-DI', numarAx: 4, descrierePozitie: 'Axă 4 Dreapta Int (Tracțiune 2)' },
          { codPozitie: '4-DS', numarAx: 4, descrierePozitie: 'Axă 4 Dreapta Ext (Tracțiune 2)' }
        );
      } else if (cat === 'REMORCA' || cat === 'SEMIREMORCA') {
        axe.push(
          { codPozitie: '1-SS', numarAx: 1, descrierePozitie: 'Axă 1 Stânga Simplu' },
          { codPozitie: '1-DS', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta Simplu' },
          { codPozitie: '2-SS', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Simplu' },
          { codPozitie: '2-DS', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Simplu' },
          { codPozitie: '3-SS', numarAx: 3, descrierePozitie: 'Axă 3 Stânga Simplu' },
          { codPozitie: '3-DS', numarAx: 3, descrierePozitie: 'Axă 3 Dreapta Simplu' }
        );
      } else {
        axe.push(
          { codPozitie: '1-SS', numarAx: 1, descrierePozitie: 'Axă 1 Stânga Simplu (Directoare)' },
          { codPozitie: '1-DS', numarAx: 1, descrierePozitie: 'Axă 1 Dreapta Simplu (Directoare)' },
          { codPozitie: '2-SS', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Exterior (Tracțiune)' },
          { codPozitie: '2-SI', numarAx: 2, descrierePozitie: 'Axă 2 Stânga Interior (Tracțiune)' },
          { codPozitie: '2-DI', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Interior (Tracțiune)' },
          { codPozitie: '2-DS', numarAx: 2, descrierePozitie: 'Axă 2 Dreapta Exterior (Tracțiune)' }
        );
      }

      for (const a of axe) {
        await this.prisma.pozitieAx.upsert({
          where: { vehiculId_codPozitie: { vehiculId: vehicul.id, codPozitie: a.codPozitie } },
          update: {},
          create: { ...a, vehiculId: vehicul.id },
        });
      }

      vehicul = await this.prisma.vehicul.findUnique({
        where: { id: vehiculId },
        include: {
          pozitiiAxe: {
            include: {
              anvelopa: {
                include: { masuratori: { orderBy: { dataMasurare: 'desc' } } },
              },
            },
            orderBy: [{ numarAx: 'asc' }, { codPozitie: 'asc' }],
          },
        },
      }) as any;
    }

    const alerteGeometrie: string[] = [];
    const axeGroupate = new Map<number, any[]>();

    vehicul.pozitiiAxe.forEach((poz) => {
      if (!axeGroupate.has(poz.numarAx)) axeGroupate.set(poz.numarAx, []);
      axeGroupate.get(poz.numarAx).push(poz);
    });

    axeGroupate.forEach((pozitiiOnAx, numarAx) => {
      const stanga = pozitiiOnAx.find((p) => p.codPozitie.includes('-SS') || p.codPozitie.includes('-SE'));
      const dreapta = pozitiiOnAx.find((p) => p.codPozitie.includes('-DS') || p.codPozitie.includes('-DE'));

      if (stanga?.anvelopa && dreapta?.anvelopa) {
        const uzuraStanga = stanga.anvelopa.adancimeInitialaMm - stanga.anvelopa.adancimeCurentaMm;
        const uzuraDreapta = dreapta.anvelopa.adancimeInitialaMm - dreapta.anvelopa.adancimeCurentaMm;

        if (uzuraStanga > 0 && uzuraDreapta > 0) {
          const difProcentual = Math.abs(uzuraStanga - uzuraDreapta) / Math.max(uzuraStanga, uzuraDreapta);
          if (difProcentual > 0.3) {
            alerteGeometrie.push(
              `Alertă Geometrie Axa ${numarAx}: Risc de aliniere incorectă între ${stanga.codPozitie} (${stanga.anvelopa.adancimeCurentaMm}mm) și ${dreapta.codPozitie} (${dreapta.anvelopa.adancimeCurentaMm}mm). Diferență uzură > 30%!`,
            );
          }
        }
      }
    });

    return {
      vehiculId: vehicul.id,
      numarIntern: vehicul.numarIntern,
      numarInmatriculare: vehicul.numarInmatriculare,
      valoareContorCurent: vehicul.valoareContorCurent,
      tipMasurare: vehicul.tipMasurare,
      pozitiiAxe: vehicul.pozitiiAxe,
      alerteGeometrie,
    };
  }

  async inregistreazaMasurare(data: {
    anvelopaId: string;
    adancimeProfilMm: number;
    tehnician: string;
  }) {
    const anvelopa = await this.prisma.anvelopa.findUnique({
      where: { id: data.anvelopaId },
      include: { vehicul: true },
    });
    if (!anvelopa) throw new NotFoundException('Anvelopa nu există.');

    const rulajParcurs = anvelopa.vehicul
      ? Math.max(1, anvelopa.vehicul.valoareContorCurent - (anvelopa.kilometrajMontare || 0))
      : Math.max(1, anvelopa.rulajTotalKm);

    const uzuraTotalaMm = Math.max(0.1, anvelopa.adancimeInitialaMm - Number(data.adancimeProfilMm));
    const rataUzuraPer10k = (uzuraTotalaMm / rulajParcurs) * 10000;

    const limitaSiguranta = 3.0;
    const profilUtilizabilMm = Math.max(0, Number(data.adancimeProfilMm) - limitaSiguranta);
    const kmRamasiEstimati = rataUzuraPer10k > 0 ? (profilUtilizabilMm / (rataUzuraPer10k / 10000)) : 99999;

    await this.prisma.anvelopa.update({
      where: { id: data.anvelopaId },
      data: {
        adancimeCurentaMm: Number(data.adancimeProfilMm),
        rulajTotalKm: rulajParcurs,
      },
    });

    const masurare = await this.prisma.masurareUzuraAnvelopa.create({
      data: {
        anvelopaId: data.anvelopaId,
        valoareContor: anvelopa.vehicul ? anvelopa.vehicul.valoareContorCurent : 0,
        adancimeProfilMm: Number(data.adancimeProfilMm),
        rataUzuraPer10k: Number(rataUzuraPer10k.toFixed(2)),
        kmRamasiEstimati: Number(kmRamasiEstimati.toFixed(0)),
        tehnician: data.tehnician,
      },
    });

    return {
      masurare,
      rataUzuraPer10k: Number(rataUzuraPer10k.toFixed(2)),
      kmRamasiEstimati: Number(kmRamasiEstimati.toFixed(0)),
    };
  }

  async monteazaAnvelopa(data: { anvelopaId: string; pozitieAxId: string; actiuneAnvelopaVeche?: 'DEMONTARE_IN_STOC' | 'CASARE_STOC'; operator?: string }) {
    const pozitie = await this.prisma.pozitieAx.findUnique({
      where: { id: data.pozitieAxId },
      include: { vehicul: true, anvelopa: true },
    });
    if (!pozitie) throw new NotFoundException('Poziția pe axă nu există.');

    // Daca exista anvelopa veche pe pozitie, executam acțiunea de schimb
    if (pozitie.anvelopa) {
      const vechea = pozitie.anvelopa;
      const actiune = data.actiuneAnvelopaVeche || 'DEMONTARE_IN_STOC';
      const valoareContor = pozitie.vehicul?.valoareContorCurent || 0;
      const mecanic = data.operator || 'Mecanic Atelier';

      if (actiune === 'CASARE_STOC') {
        await this.prisma.anvelopa.update({
          where: { id: vechea.id },
          data: { stare: 'CASATA', vehiculId: null, pozitieAxId: null },
        });

        await this.prisma.istoricPermutareAnvelopa.create({
          data: {
            anvelopaId: vechea.id,
            vehiculId: pozitie.vehiculId,
            pozitieSursaCod: pozitie.codPozitie,
            pozitieDestCod: 'CASATĂ / DEȘEU',
            valoareContor,
            operator: mecanic,
            observatii: `Demontată & casată definitiv din stoc`,
          },
        });
      } else {
        await this.prisma.anvelopa.update({
          where: { id: vechea.id },
          data: { stare: 'IN_STOC', vehiculId: null, pozitieAxId: null },
        });

        await this.prisma.istoricPermutareAnvelopa.create({
          data: {
            anvelopaId: vechea.id,
            vehiculId: pozitie.vehiculId,
            pozitieSursaCod: pozitie.codPozitie,
            pozitieDestCod: 'STOC_REZERVĂ',
            valoareContor,
            operator: mecanic,
            observatii: `Demontată în stoc ca anvelopă de rezervă`,
          },
        });
      }
    }

    const anvelopa = await this.prisma.anvelopa.update({
      where: { id: data.anvelopaId },
      data: {
        stare: 'MONTATA',
        vehiculId: pozitie.vehiculId,
        pozitieAxId: pozitie.id,
        kilometrajMontare: pozitie.vehicul ? pozitie.vehicul.valoareContorCurent : 0,
      },
    });

    return anvelopa;
  }

  async permutaAnvelopa(data: { anvelopaId: string; pozitieNouaAxId: string }) {
    return this.monteazaAnvelopa({
      anvelopaId: data.anvelopaId,
      pozitieAxId: data.pozitieNouaAxId,
    });
  }

  // Execută Permutare Vizuală între 2 Poziții cu Salvare Istoric
  async executaPermutareIntrePozitii(data: {
    pozitieAId: string;
    pozitieBId: string;
    valoareContor?: number;
    tehnician?: string;
    operator?: string;
    mecanic?: string;
    dataPermutare?: string;
    data?: string;
    observatii?: string;
  }) {
    const pozA = await this.prisma.pozitieAx.findUnique({ where: { id: data.pozitieAId }, include: { anvelopa: true, vehicul: true } });
    const pozB = await this.prisma.pozitieAx.findUnique({ where: { id: data.pozitieBId }, include: { anvelopa: true, vehicul: true } });

    if (!pozA || !pozB) throw new NotFoundException('Una sau ambele poziții pe axă nu au fost găsite.');

    const anvelopaA = pozA.anvelopa;
    const anvelopaB = pozB.anvelopa;
    const vehicul = pozA.vehicul || pozB.vehicul;
    let valoareContor = vehicul ? vehicul.valoareContorCurent : 0;

    if (data.valoareContor && Number(data.valoareContor) > 0) {
      valoareContor = Number(data.valoareContor);
      if (vehicul) {
        await this.prisma.vehicul.update({
          where: { id: vehicul.id },
          data: {
            valoareContorCurent: Math.max(vehicul.valoareContorCurent, valoareContor),
            dataInregistrareContor: new Date(),
          },
        });
      }
    }

    const operator = data.operator || data.tehnician || data.mecanic || 'Mecanic Atelier';
    const dataPermutare = data.dataPermutare || data.data ? new Date(data.dataPermutare || data.data!) : new Date();

    if (anvelopaA) {
      await this.prisma.anvelopa.update({
        where: { id: anvelopaA.id },
        data: { pozitieAxId: pozB.id },
      });

      await this.prisma.istoricPermutareAnvelopa.create({
        data: {
          anvelopaId: anvelopaA.id,
          vehiculId: pozA.vehiculId,
          pozitieSursaCod: pozA.codPozitie,
          pozitieDestCod: pozB.codPozitie,
          valoareContor,
          operator,
          dataPermutare,
          observatii: data.observatii || `Permutare roată de pe ${pozA.codPozitie} pe ${pozB.codPozitie}`,
        },
      });
    }

    if (anvelopaB) {
      await this.prisma.anvelopa.update({
        where: { id: anvelopaB.id },
        data: { pozitieAxId: pozA.id },
      });

      await this.prisma.istoricPermutareAnvelopa.create({
        data: {
          anvelopaId: anvelopaB.id,
          vehiculId: pozB.vehiculId,
          pozitieSursaCod: pozB.codPozitie,
          pozitieDestCod: pozA.codPozitie,
          valoareContor,
          operator,
          dataPermutare,
          observatii: data.observatii || `Permutare roată de pe ${pozB.codPozitie} pe ${pozA.codPozitie}`,
        },
      });
    }

    return {
      mesaj: `✅ Permutare roți executată și ÎNREGISTRATĂ ÎN ISTORIC! Poz. ${pozA.codPozitie} ↔️ ${pozB.codPozitie} la contorul ${valoareContor} ${vehicul?.tipMasurare || 'KM'}.`,
      pozitieA: pozA.codPozitie,
      pozitieB: pozB.codPozitie,
      valoareContor,
    };
  }

  async demonteazaInStoc(anvelopaId: string, operator?: string) {
    const anvelopa = await this.prisma.anvelopa.findUnique({
      where: { id: anvelopaId },
      include: { pozitieAx: true, vehicul: true },
    });
    if (!anvelopa) throw new NotFoundException('Anvelopa nu există.');

    const codPozitie = anvelopa.pozitieAx?.codPozitie || 'NEMONTATA';
    const valoareContor = anvelopa.vehicul?.valoareContorCurent || 0;

    await this.prisma.anvelopa.update({
      where: { id: anvelopaId },
      data: {
        stare: 'IN_STOC',
        vehiculId: null,
        pozitieAxId: null,
      },
    });

    if (anvelopa.vehiculId) {
      await this.prisma.istoricPermutareAnvelopa.create({
        data: {
          anvelopaId: anvelopa.id,
          vehiculId: anvelopa.vehiculId,
          pozitieSursaCod: codPozitie,
          pozitieDestCod: 'STOC_REZERVĂ',
          valoareContor,
          operator: operator || 'Mecanic Atelier',
          observatii: `Demontat de pe vehicul în stoc de rezervă`,
        },
      });
    }

    return { mesaj: `Anvelopă demontată pe starea IN_STOC!` };
  }

  async getIstoricPermutari(vehiculId?: string) {
    const where: any = {};
    if (vehiculId) where.vehiculId = vehiculId;

    const istoric = await this.prisma.istoricPermutareAnvelopa.findMany({
      where,
      include: {
        anvelopa: true,
        vehicul: true,
      },
      orderBy: { dataPermutare: 'desc' },
    });

    return istoric.map((i) => ({
      ...i,
      anvelopaSerie: i.anvelopa?.serieAnvelopa || '-',
      anvelopaMarca: i.anvelopa?.marca || '-',
      anvelopaDimensiune: i.anvelopa?.dimensiune || '-',
      vehiculNumarIntern: i.vehicul?.numarIntern || '-',
      vehiculInmatriculare: i.vehicul?.numarInmatriculare || '-',
      tipMasurare: i.vehicul?.tipMasurare || 'KM',
    }));
  }

  async getComparatieMarcireTCO() {
    const anvelope = await this.prisma.anvelopa.findMany({
      include: { masuratori: true },
    });

    const marcile = new Map<string, { count: number; costTotal: number; rulajTotal: number }>();

    anvelope.forEach((a) => {
      const marca = a.marca.toUpperCase();
      if (!marcile.has(marca)) {
        marcile.set(marca, { count: 0, costTotal: 0, rulajTotal: 0 });
      }
      const data = marcile.get(marca)!;
      data.count += 1;
      data.costTotal += a.pretAchizitie + a.costResapareTotal;
      data.rulajTotal += Math.max(100, a.rulajTotalKm);
    });

    const rezultat = Array.from(marcile.entries()).map(([marca, data]) => {
      const tcoPer1000Km = (data.costTotal / (data.rulajTotal / 1000));
      return {
        marca,
        numarAnvelope: data.count,
        costMediuAchizitie: Number((data.costTotal / data.count).toFixed(2)),
        rulajMediuKm: Number((data.rulajTotal / data.count).toFixed(0)),
        tcoPer1000Km: Number(tcoPer1000Km.toFixed(2)),
      };
    });

    return rezultat;
  }
}
