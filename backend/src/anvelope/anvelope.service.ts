import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function parseDimensiune(denumire: string): string {
  if (!denumire) return '315/80 R22.5';
  const match = denumire.match(/\b\d{2,3}(\/\d{2,3})?\s*R\s*\d{2}(\.\d)?\b/i);
  if (match) return match[0].toUpperCase().replace(/\s+/g, ' ');
  return '315/80 R22.5';
}

function parseMarca(denumire: string): string {
  if (!denumire) return 'BENCHMARK';
  const brands = [
    'MICHELIN', 'BRIDGESTONE', 'CONTINENTAL', 'GOODYEAR', 'PIRELLI', 'HANKOOK',
    'BENCHMARK', 'INFINITY', 'KORMORAN', 'SAVA', 'MATADOR', 'CORDIANT', 'DOUBLE COIN',
    'LINGLONG', 'TRIANGLE', 'AEOLUS', 'WESTLAKE', 'OTANI', 'SAILUN', 'KAMA', 'BARUM', 'FULDA'
  ];
  const upper = denumire.toUpperCase();
  for (const b of brands) {
    if (upper.includes(b)) return b;
  }
  return 'BENCHMARK';
}

function parseModel(denumire: string): string {
  if (!denumire) return 'Model Universal';
  const dim = parseDimensiune(denumire);
  const clean = denumire
    .replace(dim, '')
    .replace(/385\/65R22\.5|315\/80R22\.5|315\/70R22\.5|295\/80R22\.5|13R22\.5|12R22\.5/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.substring(0, 45) || 'Model Stoc';
}

@Injectable()
export class AnvelopeService {
  constructor(private prisma: PrismaService) {}

  async getAnvelopeStoc() {
    // 1. Anvelope individuale în stoc (din tabela Anvelopa cu stare 'IN_STOC')
    const anvelopeStoc = await this.prisma.anvelopa.findMany({
      where: { stare: 'IN_STOC' },
      include: { depozit: true },
      orderBy: { updatedAt: 'desc' },
    });

    const listaIndividuale = anvelopeStoc.map((a) => {
      const isNoua = (a.adancimeCurentaMm || 16) >= 15;
      const tag = isNoua ? 'NOUĂ' : 'RULATĂ / REZERVĂ';
      return {
        id: a.id,
        tipSursa: isNoua ? 'ANVELOPA_NOUA_INDIVIDUALA' : 'ANVELOPA_RULATA',
        anvelopaId: a.id,
        articolStocId: null,
        codArticol: a.serieAnvelopa,
        serieAnvelopa: a.serieAnvelopa,
        codDot: a.codDot || '2625',
        marca: a.marca,
        model: a.model,
        dimensiune: a.dimensiune,
        adancimeInitialaMm: a.adancimeInitialaMm || 16,
        adancimeCurentaMm: a.adancimeCurentaMm || 16,
        pretAchizitie: Number(Number(a.pretAchizitie || 0).toFixed(2)),
        stocDisponibil: 1,
        depozitId: a.depozitId,
        depozit: a.depozit,
        depozitNume: a.depozit?.nume || 'Depozit Central',
        eticheta: `${tag} [SN: ${a.serieAnvelopa}] ${a.marca} ${a.model} (${a.dimensiune}) • DOT ${a.codDot || '-'} • Profil: ${a.adancimeCurentaMm}mm • ${Number(a.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON • ${a.depozit?.nume || 'Depozit'}`,
      };
    });

    return listaIndividuale;
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
    depozitId?: string;
    vehiculId?: string;
    pozitieAxId?: string;
    valoareContor?: number;
    dataMontare?: string;
    actiuneAnvelopaVeche?: 'DEMONTARE_IN_STOC' | 'CASARE_STOC';
    operator?: string;
    observatii?: string;
  }) {
    let stare = data.stare || 'IN_STOC';
    let kilometrajMontare = 0;
    let oreMontare = 0;
    let pozitieTarget: any = null;

    const dataMontareFinal = data.dataMontare ? new Date(data.dataMontare) : new Date();

    if (data.pozitieAxId) {
      pozitieTarget = await this.prisma.pozitieAx.findUnique({
        where: { id: data.pozitieAxId },
        include: { vehicul: true, anvelopa: true },
      });

      if (pozitieTarget && pozitieTarget.vehicul) {
        stare = 'MONTATA';
        const contorInput = data.valoareContor !== undefined && Number(data.valoareContor) > 0
          ? Number(data.valoareContor)
          : pozitieTarget.vehicul.valoareContorCurent;

        if (pozitieTarget.vehicul.tipMasurare === 'ORE_MTH') {
          oreMontare = contorInput;
        } else {
          kilometrajMontare = contorInput;
        }

        if (contorInput > pozitieTarget.vehicul.valoareContorCurent) {
          await this.prisma.vehicul.update({
            where: { id: pozitieTarget.vehicul.id },
            data: {
              valoareContorCurent: contorInput,
              dataInregistrareContor: dataMontareFinal,
            },
          });
        }
      }
    }

    const serieUnica = data.serieAnvelopa || `SN-${Date.now().toString().slice(-6)}`;
    const mecanic = data.operator || 'Mecanic Atelier';
    const valoareContorFinal = kilometrajMontare || oreMontare || (pozitieTarget?.vehicul?.valoareContorCurent || 0);

    // Dacă poziția pe axă este deja ocupată de altă anvelopă, executăm acțiunea de înlocuire!
    if (pozitieTarget && pozitieTarget.anvelopa) {
      const vechea = pozitieTarget.anvelopa;
      const actiune = data.actiuneAnvelopaVeche || 'DEMONTARE_IN_STOC';

      if (actiune === 'CASARE_STOC') {
        await this.prisma.anvelopa.update({
          where: { id: vechea.id },
          data: { stare: 'CASATA', vehiculId: null, pozitieAxId: null, depozitId: null },
        });

        await this.prisma.istoricPermutareAnvelopa.create({
          data: {
            anvelopaId: vechea.id,
            vehiculId: pozitieTarget.vehiculId,
            pozitieSursaCod: pozitieTarget.codPozitie,
            pozitieDestCod: 'CASATĂ / DEȘEU',
            valoareContor: valoareContorFinal,
            dataPermutare: dataMontareFinal,
            operator: mecanic,
            observatii: `Demontată & casată definitiv din stoc la montarea anvelopei noi ${serieUnica}`,
          },
        });
      } else {
        await this.prisma.anvelopa.update({
          where: { id: vechea.id },
          data: { stare: 'IN_STOC', vehiculId: null, pozitieAxId: null, depozitId: data.depozitId || null },
        });

        await this.prisma.istoricPermutareAnvelopa.create({
          data: {
            anvelopaId: vechea.id,
            vehiculId: pozitieTarget.vehiculId,
            pozitieSursaCod: pozitieTarget.codPozitie,
            pozitieDestCod: 'STOC_REZERVĂ',
            valoareContor: valoareContorFinal,
            dataPermutare: dataMontareFinal,
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
        depozitId: data.depozitId || null,
        vehiculId: data.vehiculId || (pozitieTarget ? pozitieTarget.vehiculId : null),
        pozitieAxId: data.pozitieAxId || null,
        kilometrajMontare,
        oreMontare,
      },
    });

    if (data.pozitieAxId && pozitieTarget) {
      await this.prisma.istoricPermutareAnvelopa.create({
        data: {
          anvelopaId: anvelopa.id,
          vehiculId: pozitieTarget.vehiculId,
          pozitieSursaCod: 'ACHIZIȚIE / DEPOZIT',
          pozitieDestCod: pozitieTarget.codPozitie,
          valoareContor: valoareContorFinal,
          dataPermutare: dataMontareFinal,
          operator: mecanic,
          observatii: data.observatii || `Montată pe axa ${pozitieTarget.numarAx} poz. ${pozitieTarget.codPozitie} (Profil: ${data.adancimeCurentaMm}mm)`,
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
        depozit: true,
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
        pozitieCod: a.pozitieAx?.codPozitie || (a.depozit ? `STOC: ${a.depozit.nume}` : 'STOC'),
        depozitNume: a.depozit?.nume || 'Depozit Central',
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

    if (anvelopa.vehicul) {
      await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: anvelopa.vehicul.id,
          valoareContor: anvelopa.vehicul.valoareContorCurent,
          dataInregistrare: new Date(),
          sursa: 'ANVELOPE_MĂSURARE',
          operator: data.tehnician || 'Tehnician Anvelope',
          observatii: `Măsurătoare uzură profil anvelopă ${anvelopa.serieAnvelopa} (${anvelopa.marca}): ${data.adancimeProfilMm} mm`,
        },
      });
    }

    return {
      masurare,
      rataUzuraPer10k: Number(rataUzuraPer10k.toFixed(2)),
      kmRamasiEstimati: Number(kmRamasiEstimati.toFixed(0)),
    };
  }

  async monteazaAnvelopa(data: {
    anvelopaId?: string;
    articolStocId?: string;
    pozitieAxId: string;
    serieAnvelopa?: string;
    codDot?: string;
    marca?: string;
    model?: string;
    dimensiune?: string;
    adancimeInitialaMm?: number;
    adancimeCurentaMm?: number;
    pretAchizitie?: number;
    valoareContor?: number;
    dataMontare?: string;
    actiuneAnvelopaVeche?: 'DEMONTARE_IN_STOC' | 'CASARE_STOC';
    operator?: string;
    observatii?: string;
  }) {
    const pozitie = await this.prisma.pozitieAx.findUnique({
      where: { id: data.pozitieAxId },
      include: { vehicul: true, anvelopa: true },
    });
    if (!pozitie) throw new NotFoundException('Poziția pe axă nu există.');

    const vehicul = pozitie.vehicul;
    const dataMontareFinal = data.dataMontare ? new Date(data.dataMontare) : new Date();
    let valoareContorFinal = data.valoareContor !== undefined && Number(data.valoareContor) > 0
      ? Number(data.valoareContor)
      : (vehicul?.valoareContorCurent || 0);

    const mecanic = data.operator || 'Mecanic Atelier';

    // Dacă s-a specificat un index contor mai mare pe vehicul, actualizăm vehiculul și salvăm în istoric
    if (vehicul && valoareContorFinal > vehicul.valoareContorCurent) {
      await this.prisma.vehicul.update({
        where: { id: vehicul.id },
        data: {
          valoareContorCurent: valoareContorFinal,
          dataInregistrareContor: dataMontareFinal,
        },
      });

      await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: vehicul.id,
          valoareContor: valoareContorFinal,
          dataInregistrare: dataMontareFinal,
          sursa: 'MONTARE_ANVELOPA',
          operator: mecanic,
          observatii: `Montare anvelopă pe axa ${pozitie.numarAx} poz. ${pozitie.codPozitie}`,
        },
      });
    }

    // Dacă există deja o anvelopă veche pe poziție, executăm acțiunea de schimb
    if (pozitie.anvelopa) {
      const vechea = pozitie.anvelopa;
      const actiune = data.actiuneAnvelopaVeche || 'DEMONTARE_IN_STOC';

      if (actiune === 'CASARE_STOC') {
        await this.prisma.anvelopa.update({
          where: { id: vechea.id },
          data: { stare: 'CASATA', vehiculId: null, pozitieAxId: null, depozitId: null },
        });

        await this.prisma.istoricPermutareAnvelopa.create({
          data: {
            anvelopaId: vechea.id,
            vehiculId: pozitie.vehiculId,
            pozitieSursaCod: pozitie.codPozitie,
            pozitieDestCod: 'CASATĂ / DEȘEU',
            valoareContor: valoareContorFinal,
            dataPermutare: dataMontareFinal,
            operator: mecanic,
            observatii: data.observatii ? `Demontată & casată: ${data.observatii}` : 'Demontată & casată definitiv din stoc la montare anvelopă',
          },
        });
      } else {
        await this.prisma.anvelopa.update({
          where: { id: vechea.id },
          data: { stare: 'IN_STOC', vehiculId: null, pozitieAxId: null, depozitId: (data as any).depozitId || null },
        });

        await this.prisma.istoricPermutareAnvelopa.create({
          data: {
            anvelopaId: vechea.id,
            vehiculId: pozitie.vehiculId,
            pozitieSursaCod: pozitie.codPozitie,
            pozitieDestCod: 'STOC_REZERVĂ',
            valoareContor: valoareContorFinal,
            dataPermutare: dataMontareFinal,
            operator: mecanic,
            observatii: data.observatii ? `Demontată în stoc: ${data.observatii}` : 'Demontată în stoc ca anvelopă de rezervă la montare anvelopă',
          },
        });
      }
    }

    let anvelopaFinal: any = null;

    // Cazul 1: Montare dintr-un ArticolStoc (Anvelopă Nouă din Magazie)
    if (data.articolStocId) {
      const art = await this.prisma.articolStoc.findUnique({
        where: { id: data.articolStocId },
      });
      if (!art) throw new NotFoundException('Articolul de stoc nu a fost găsit.');
      if (art.stocCurent <= 0) throw new BadRequestException(`Stoc epuizat pentru articolul "${art.denumire}"!`);

      // Scădem 1 bucată din stocul articolului
      await this.prisma.articolStoc.update({
        where: { id: art.id },
        data: { stocCurent: Math.max(0, art.stocCurent - 1) },
      });

      const serieGen = data.serieAnvelopa || `${art.codArticol}-${Date.now().toString().slice(-6)}`;
      const marca = data.marca || parseMarca(art.denumire);
      const model = data.model || parseModel(art.denumire);
      const dimensiune = data.dimensiune || parseDimensiune(art.denumire);

      anvelopaFinal = await this.prisma.anvelopa.create({
        data: {
          codDot: data.codDot || 'DOT-2026',
          serieAnvelopa: serieGen,
          marca,
          model,
          dimensiune,
          adancimeInitialaMm: Number(data.adancimeInitialaMm || 16),
          adancimeCurentaMm: Number(data.adancimeCurentaMm || 16),
          pretAchizitie: Number(data.pretAchizitie || art.pretUnitar || 0),
          stare: 'MONTATA',
          depozitId: art.depozitId,
          vehiculId: pozitie.vehiculId,
          pozitieAxId: pozitie.id,
          kilometrajMontare: vehicul?.tipMasurare === 'ORE_MTH' ? 0 : valoareContorFinal,
          oreMontare: vehicul?.tipMasurare === 'ORE_MTH' ? valoareContorFinal : 0,
        },
      });

      await this.prisma.istoricPermutareAnvelopa.create({
        data: {
          anvelopaId: anvelopaFinal.id,
          vehiculId: pozitie.vehiculId,
          pozitieSursaCod: `STOC: ${art.codArticol}`,
          pozitieDestCod: pozitie.codPozitie,
          valoareContor: valoareContorFinal,
          dataPermutare: dataMontareFinal,
          operator: mecanic,
          observatii: data.observatii || `Montată din stoc marfă (${art.denumire}) pe axa ${pozitie.numarAx} poz. ${pozitie.codPozitie}`,
        },
      });

      return anvelopaFinal;
    }

    // Cazul 2: Montare dintr-o Anvelopă existentă în stoc (rulată / demontată)
    if (data.anvelopaId) {
      anvelopaFinal = await this.prisma.anvelopa.update({
        where: { id: data.anvelopaId },
        data: {
          stare: 'MONTATA',
          vehiculId: pozitie.vehiculId,
          pozitieAxId: pozitie.id,
          depozitId: null,
          kilometrajMontare: vehicul?.tipMasurare === 'ORE_MTH' ? 0 : valoareContorFinal,
          oreMontare: vehicul?.tipMasurare === 'ORE_MTH' ? valoareContorFinal : 0,
        },
      });

      await this.prisma.istoricPermutareAnvelopa.create({
        data: {
          anvelopaId: anvelopaFinal.id,
          vehiculId: pozitie.vehiculId,
          pozitieSursaCod: 'STOC_REZERVĂ',
          pozitieDestCod: pozitie.codPozitie,
          valoareContor: valoareContorFinal,
          dataPermutare: dataMontareFinal,
          operator: mecanic,
          observatii: data.observatii || `Montată din stoc rezervă pe axa ${pozitie.numarAx} poz. ${pozitie.codPozitie}`,
        },
      });

      return anvelopaFinal;
    }

    throw new BadRequestException('Trebuie să specificați o anvelopă sau un articol din stoc!');
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

    if (data.valoareContor && Number(data.valoareContor) > 0 && vehicul) {
      valoareContor = Number(data.valoareContor);
      await this.prisma.vehicul.update({
        where: { id: vehicul.id },
        data: {
          valoareContorCurent: Math.max(vehicul.valoareContorCurent, valoareContor),
          dataInregistrareContor: new Date(),
        },
      });

      await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: vehicul.id,
          valoareContor,
          dataInregistrare: dataPermutare,
          sursa: 'ANVELOPE',
          operator,
          observatii: `Rotire anvelope ${pozA.codPozitie} ${pozB.codPozitie}`,
        },
      });
    }

    // 1. Detașare temporară a ambelor anvelope pentru a evita Unique Constraint pe pozitieAxId
    if (anvelopaA) {
      await this.prisma.anvelopa.update({
        where: { id: anvelopaA.id },
        data: { pozitieAxId: null },
      });
    }
    if (anvelopaB) {
      await this.prisma.anvelopa.update({
        where: { id: anvelopaB.id },
        data: { pozitieAxId: null },
      });
    }

    // 2. Re-atașare pe pozițiile inversate
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
      mesaj: ` Permutare roți executată și ÎNREGISTRATĂ ÎN ISTORIC! Poz. ${pozA.codPozitie}  ${pozB.codPozitie} la contorul ${valoareContor} ${vehicul?.tipMasurare || 'KM'}.`,
      pozitieA: pozA.codPozitie,
      pozitieB: pozB.codPozitie,
      valoareContor,
    };
  }

  async demonteazaInStoc(anvelopaId: string, data?: {
    actiune?: 'DEMONTARE_IN_STOC' | 'CASARE_DIRECTA' | 'RESAPARE';
    depozitId?: string;
    motivCasare?: string;
    operator?: string;
    valoareContor?: number;
    dataDemontare?: string;
    observatii?: string;
  }) {
    const anvelopa = await this.prisma.anvelopa.findUnique({
      where: { id: anvelopaId },
      include: { pozitieAx: true, vehicul: true },
    });
    if (!anvelopa) throw new NotFoundException('Anvelopa nu există.');

    let depozitSelectat: any = null;
    if (data?.depozitId) {
      depozitSelectat = await this.prisma.depozit.findUnique({
        where: { id: data.depozitId },
      });
    }

    const codPozitie = anvelopa.pozitieAx?.codPozitie || 'NEMONTATA';
    const vehicul = anvelopa.vehicul;
    const kmMontare = anvelopa.kilometrajMontare || 0;
    
    let kmDemontare = vehicul ? vehicul.valoareContorCurent : 0;
    if (data?.valoareContor && Number(data.valoareContor) > 0) {
      kmDemontare = Number(data.valoareContor);
      if (vehicul) {
        await this.prisma.vehicul.update({
          where: { id: vehicul.id },
          data: {
            valoareContorCurent: Math.max(vehicul.valoareContorCurent, kmDemontare),
            dataInregistrareContor: new Date(),
          },
        });
      }
    }

    const dataDemontare = data?.dataDemontare ? new Date(data.dataDemontare) : new Date();
    const operator = data?.operator || 'Mecanic Atelier';

    // Calcul precis al kilometrilor rulați în această perioadă de montaj
    const deltaKm = kmDemontare > kmMontare ? Math.round(kmDemontare - kmMontare) : 0;
    const rulajTotalNou = (anvelopa.rulajTotalKm || 0) + deltaKm;

    const actiune = data?.actiune || 'DEMONTARE_IN_STOC';
    let stareNoua = 'IN_STOC';
    let pozitieDest = depozitSelectat ? `STOC (${depozitSelectat.nume})` : 'STOC_DEPOZIT';
    let observatiiFinale = data?.observatii || '';
    let finalDepozitId: string | null = null;

    if (actiune === 'CASARE_DIRECTA') {
      stareNoua = 'CASATA';
      const motivNume = data?.motivCasare || 'UZURA_FINITA';
      pozitieDest = `CASATĂ / DEȘEU (${motivNume})`;
      observatiiFinale = `[CASATĂ - ${motivNume}] ${observatiiFinale} (Rulaj pe ${vehicul?.numarIntern || 'Vehicul'}: +${deltaKm} KM, Rulaj Total: ${rulajTotalNou} KM)`;
      finalDepozitId = null;
    } else if (actiune === 'RESAPARE') {
      stareNoua = 'RESAPATA';
      pozitieDest = 'TRIMIS LA REȘAPARE';
      observatiiFinale = `[REȘAPARE] ${observatiiFinale} (Rulaj pe ${vehicul?.numarIntern || 'Vehicul'}: +${deltaKm} KM)`;
      finalDepozitId = null;
    } else {
      stareNoua = 'IN_STOC';
      finalDepozitId = data?.depozitId || null;
      const depNumeText = depozitSelectat ? `în ${depozitSelectat.nume}` : 'în stoc';
      observatiiFinale = observatiiFinale 
        ? `${observatiiFinale} (Demontată ${depNumeText}, Rulaj pe ${vehicul?.numarIntern || 'Vehicul'}: +${deltaKm} KM)`
        : `Demontată ${depNumeText}. Rulaj pe vehicul: +${deltaKm} KM (de la ${kmMontare} la ${kmDemontare} KM)`;
    }

    await this.prisma.anvelopa.update({
      where: { id: anvelopaId },
      data: {
        stare: stareNoua,
        vehiculId: null,
        pozitieAxId: null,
        kilometrajMontare: null,
        depozitId: finalDepozitId,
        rulajTotalKm: rulajTotalNou,
      },
    });

    if (vehicul) {
      // 1. Înregistrare în istoricul de permutări / montaj al anvelopei
      await this.prisma.istoricPermutareAnvelopa.create({
        data: {
          anvelopaId: anvelopa.id,
          vehiculId: vehicul.id,
          pozitieSursaCod: codPozitie,
          pozitieDestCod: pozitieDest,
          valoareContor: kmDemontare,
          operator,
          dataPermutare: dataDemontare,
          observatii: observatiiFinale,
        },
      });

      // 2. Înregistrare în auditul contorului vehiculului
      if (kmDemontare > 0) {
        await this.prisma.istoricContorVehicul.create({
          data: {
            vehiculId: vehicul.id,
            valoareContor: kmDemontare,
            dataInregistrare: dataDemontare,
            sursa: 'ANVELOPE',
            operator,
            observatii: actiune === 'CASARE_DIRECTA' 
              ? `Casare / Deșeu anvelopă ${anvelopa.marca} (${anvelopa.serieAnvelopa}) de pe poziția ${codPozitie}`
              : `Demontare anvelopă ${anvelopa.marca} (${anvelopa.serieAnvelopa}) de pe poziția ${codPozitie} -> ${pozitieDest}`,
          },
        });
      }
    }

    const mesaj = actiune === 'CASARE_DIRECTA'
      ? ` Anvelopa ${anvelopa.marca} (${anvelopa.serieAnvelopa}) a fost casată definitiv (Stare: CASATĂ) și transmisă în Rapoarte & Analitică! Rulaj final atins: ${rulajTotalNou} KM.`
      : ` Anvelopa ${anvelopa.marca} (${anvelopa.serieAnvelopa}) a fost demontată cu succes în ${depozitSelectat ? depozitSelectat.nume : 'Stoc Depozit'}! (+${deltaKm} KM adăugați la rulaj).`;

    return {
      mesaj,
      deltaKm,
      rulajTotalKm: rulajTotalNou,
      stare: stareNoua,
      depozit: depozitSelectat,
    };
  }

  async getAnaliticaCasariAnvelope() {
    const anvelopeCasate = await this.prisma.anvelopa.findMany({
      where: { stare: 'CASATA' },
      include: {
        istoricPermutari: {
          include: { vehicul: true },
          orderBy: { dataPermutare: 'desc' },
        },
      },
    });

    const totalCasate = anvelopeCasate.length;
    let costPierdutTotal = 0;
    let rulajTotalToateCasate = 0;

    const motiveCount: Record<string, number> = {
      EXPLOZIE_PUNCTURA: 0,
      UZURA_FINITA: 0,
      TAIETURA_STRUCTURA: 0,
      UZURA_NEUNIFORMA: 0,
      ALTELE: 0,
    };

    const marciStat: Record<string, { count: number; costTotal: number; rulajTotal: number; explozii: number }> = {};

    const listaDetaliata = anvelopeCasate.map((a) => {
      costPierdutTotal += a.pretAchizitie || 0;
      rulajTotalToateCasate += a.rulajTotalKm || 0;

      const marca = a.marca.toUpperCase();
      if (!marciStat[marca]) {
        marciStat[marca] = { count: 0, costTotal: 0, rulajTotal: 0, explozii: 0 };
      }
      marciStat[marca].count += 1;
      marciStat[marca].costTotal += a.pretAchizitie || 0;
      marciStat[marca].rulajTotal += a.rulajTotalKm || 0;

      const ultimulEveniment = a.istoricPermutari[0];
      const observatii = ultimulEveniment?.observatii || '';
      let motivDetectat = 'UZURA_FINITA';
      if (observatii.includes('EXPLOZIE_PUNCTURA') || observatii.includes('Explozie') || ultimulEveniment?.pozitieDestCod?.includes('EXPLOZIE')) {
        motivDetectat = 'EXPLOZIE_PUNCTURA';
        motiveCount.EXPLOZIE_PUNCTURA += 1;
        marciStat[marca].explozii += 1;
      } else if (observatii.includes('TAIETURA') || ultimulEveniment?.pozitieDestCod?.includes('TAIETURA')) {
        motivDetectat = 'TAIETURA_STRUCTURA';
        motiveCount.TAIETURA_STRUCTURA += 1;
      } else if (observatii.includes('UZURA_NEUNIFORMA') || ultimulEveniment?.pozitieDestCod?.includes('NEUNIFORMA')) {
        motivDetectat = 'UZURA_NEUNIFORMA';
        motiveCount.UZURA_NEUNIFORMA += 1;
      } else if (observatii.includes('ALTELE')) {
        motivDetectat = 'ALTELE';
        motiveCount.ALTELE += 1;
      } else {
        motivDetectat = 'UZURA_FINITA';
        motiveCount.UZURA_FINITA += 1;
      }

      const tcoKmRealizat = a.rulajTotalKm > 0 ? ((a.pretAchizitie / (a.rulajTotalKm / 1000))) : a.pretAchizitie;

      return {
        id: a.id,
        serieAnvelopa: a.serieAnvelopa,
        marca: a.marca,
        model: a.model,
        dimensiune: a.dimensiune,
        pretAchizitie: a.pretAchizitie,
        rulajFinalKm: a.rulajTotalKm,
        costPer1000KmRealizat: Number(tcoKmRealizat.toFixed(2)),
        dataCasare: ultimulEveniment?.dataPermutare || a.updatedAt,
        vehiculUltim: ultimulEveniment?.vehicul?.numarIntern || '-',
        vehiculInmatriculare: ultimulEveniment?.vehicul?.numarInmatriculare || '-',
        operator: ultimulEveniment?.operator || 'Atelier',
        motivCasare: motivDetectat,
        observatii: ultimulEveniment?.observatii || a.stare,
      };
    });

    const statisticiMarci = Object.entries(marciStat).map(([marca, data]) => ({
      marca,
      numarCasate: data.count,
      explozii: data.explozii,
      rataExplozii: Number(((data.explozii / data.count) * 100).toFixed(1)),
      rulajMediuFinalKm: Number((data.rulajTotal / data.count).toFixed(0)),
      costMediu: Number((data.costTotal / data.count).toFixed(2)),
    }));

    return {
      totalCasate,
      costPierdutTotal: Number(costPierdutTotal.toFixed(2)),
      rulajMediuToateCasate: totalCasate > 0 ? Number((rulajTotalToateCasate / totalCasate).toFixed(0)) : 0,
      motiveCount,
      statisticiMarci,
      listaDetaliata,
    };
  }

  async getIstoricCompletAnvelopa(anvelopaId: string) {
    const anvelopa = await this.prisma.anvelopa.findUnique({
      where: { id: anvelopaId },
      include: {
        vehicul: true,
        pozitieAx: true,
        istoricPermutari: {
          include: { vehicul: true },
          orderBy: { dataPermutare: 'desc' },
        },
      },
    });

    if (!anvelopa) throw new NotFoundException('Anvelopa nu a fost găsită.');

    let kmRulatiCurenti = 0;
    if (anvelopa.stare === 'MONTATA' && anvelopa.vehicul) {
      const kmStart = anvelopa.kilometrajMontare || 0;
      const kmAcum = anvelopa.vehicul.valoareContorCurent || 0;
      kmRulatiCurenti = kmAcum > kmStart ? (kmAcum - kmStart) : 0;
    }

    const rulajTotalCalculat = anvelopa.rulajTotalKm + kmRulatiCurenti;

    return {
      anvelopa: {
        ...anvelopa,
        rulajTotalCalculat,
        kmRulatiCurenti,
      },
      istoric: anvelopa.istoricPermutari.map((item) => ({
        id: item.id,
        dataPermutare: item.dataPermutare,
        vehiculId: item.vehiculId,
        vehiculNumarIntern: item.vehicul?.numarIntern || '-',
        vehiculInmatriculare: item.vehicul?.numarInmatriculare || '-',
        vehiculMarcaModel: `${item.vehicul?.marca || ''} ${item.vehicul?.model || ''}`.trim(),
        pozitieSursaCod: item.pozitieSursaCod,
        pozitieDestCod: item.pozitieDestCod,
        valoareContor: item.valoareContor,
        operator: item.operator || 'Atelier',
        observatii: item.observatii,
      })),
    };
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

  async getDepozitStoc() {
    return this.prisma.anvelopa.findMany({
      where: { stare: 'IN_STOC' },
      include: { depozit: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateAnvelopa(id: string, data: any) {
    return this.prisma.anvelopa.update({
      where: { id },
      data: {
        serieAnvelopa: data.serieAnvelopa !== undefined ? data.serieAnvelopa : undefined,
        codDot: data.codDot !== undefined ? data.codDot : undefined,
        marca: data.marca !== undefined ? data.marca : undefined,
        model: data.model !== undefined ? data.model : undefined,
        dimensiune: data.dimensiune !== undefined ? data.dimensiune : undefined,
        adancimeInitialaMm: data.adancimeInitialaMm !== undefined ? Number(data.adancimeInitialaMm) : undefined,
        adancimeCurentaMm: data.adancimeCurentaMm !== undefined ? Number(data.adancimeCurentaMm) : undefined,
        pretAchizitie: data.pretAchizitie !== undefined ? Number(Number(data.pretAchizitie).toFixed(2)) : undefined,
        depozitId: data.depozitId !== undefined ? data.depozitId : undefined,
        stare: data.stare !== undefined ? data.stare : undefined,
      },
      include: { depozit: true },
    });
  }

  async deleteAnvelopa(id: string) {
    return this.prisma.anvelopa.delete({
      where: { id },
    });
  }

  async adaugaAnvelopeSerializateStoc(data: {
    cantitate?: number;
    marca: string;
    model: string;
    dimensiune: string;
    adancimeMm?: number;
    codDot?: string;
    pretAchizitie: number;
    depozitId: string;
    serii?: string[];
  }) {
    const depozitId = data.depozitId;
    const adancime = data.adancimeMm || 16;
    const pret = Number(Number(data.pretAchizitie || 0).toFixed(2));
    const created = [];
    const count = data.serii && data.serii.length > 0 ? data.serii.length : (data.cantitate || 1);

    for (let i = 0; i < count; i++) {
      const serie = data.serii && data.serii[i] 
        ? data.serii[i] 
        : `SN-${Date.now().toString().slice(-6)}-${i + 1}`;
      const item = await this.prisma.anvelopa.create({
        data: {
          serieAnvelopa: serie,
          codDot: data.codDot || 'DOT-2026',
          marca: data.marca,
          model: data.model,
          dimensiune: data.dimensiune,
          adancimeInitialaMm: adancime,
          adancimeCurentaMm: adancime,
          pretAchizitie: pret,
          stare: 'IN_STOC',
          depozitId,
        },
      });
      created.push(item);
    }
    return created;
  }
}
