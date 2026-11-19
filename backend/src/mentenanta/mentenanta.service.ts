import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StocuriGarantiiService } from '../stocuri-garantii/stocuri-garantii.service';
import {
  isActualFluidItem,
  mapFluidCategoryReport,
  computeElementFluidLiters,
  detectTipLichidFromText,
  syncFluidCompletariForComanda,
  removeFluidCompletariForComanda,
} from '../common/fluid.utils';

@Injectable()
export class MentenantaService {
  constructor(
    private prisma: PrismaService,
    private stocuriGarantiiService: StocuriGarantiiService,
  ) {}

  // ==========================================
  // REGISTRU MECANICI & ECHIPĂ ATELIER
  // ==========================================

  async getMecanici() {
    let mecanici = await this.prisma.mecanic.findMany({ orderBy: { nume: 'asc' } });
    if (mecanici.length === 0) {
      await this.prisma.mecanic.createMany({
        data: [
          { nume: 'Ion Popescu (Atelier)', functie: 'Mecanic Șef', telefon: '0722111222' },
          { nume: 'Vasile Ionescu (Atelier)', functie: 'Mecanic Utilaje', telefon: '0733222333' },
          { nume: 'Brașoveanu Virgil (Șef Atelier)', functie: 'Șef Atelier', telefon: '0744333444' },
          { nume: 'Gheorghe Radu (Electrician)', functie: 'Electrician Auto', telefon: '0755444555' },
        ],
      });
      mecanici = await this.prisma.mecanic.findMany({ orderBy: { nume: 'asc' } });
    }

    const mecanoStats = await Promise.all(
      mecanici.map(async (m) => {
        const serv = await this.getIstoricServiciiMecanic(m.nume);
        return {
          ...m,
          totalLucrari: serv.length,
        };
      })
    );

    return mecanoStats;
  }

  async createMecanic(data: { nume: string; functie?: string; telefon?: string }) {
    if (!data.nume) throw new BadRequestException('Numele mecanicui este obligatoriu.');
    return this.prisma.mecanic.create({
      data: {
        nume: data.nume,
        functie: data.functie || 'Mecanic Atelier',
        telefon: data.telefon,
      },
    });
  }

  async updateMecanic(id: string, data: { nume?: string; functie?: string; telefon?: string }) {
    const mecanic = await this.prisma.mecanic.findUnique({ where: { id } });
    if (!mecanic) throw new NotFoundException('Mecanicul nu a fost găsit.');

    return this.prisma.mecanic.update({
      where: { id },
      data: {
        ...(data.nume ? { nume: data.nume } : {}),
        ...(data.functie !== undefined ? { functie: data.functie } : {}),
        ...(data.telefon !== undefined ? { telefon: data.telefon } : {}),
      },
    });
  }

  async deleteMecanic(id: string) {
    const mecanic = await this.prisma.mecanic.findUnique({ where: { id } });
    if (!mecanic) throw new NotFoundException('Mecanicul nu a fost găsit.');

    await this.prisma.mecanic.delete({ where: { id } });

    return {
      mesaj: ` Mecanicul "${mecanic.nume}" a fost eliminat din lista mecanicilor activi. Toate comenzile de lucru și operațiunile efectuate anterior de acesta rămân salvate intact în istoric.`,
      mecanic,
    };
  }

  async getIstoricServiciiMecanic(mecanicNume?: string) {
    const filter = mecanicNume ? { contains: mecanicNume } : undefined;

    // 1. Comenzi de Lucru
    const comenzi = await this.prisma.comandaLucru.findMany({
      where: filter ? { mecanicResponsabil: filter } : {},
      include: { vehicul: true, elementeComanda: true },
      orderBy: { dataDeschidere: 'desc' },
    });

    // 2. Completări / Schimburi Ulei
    const fluide = await this.prisma.completareLichid.findMany({
      where: filter ? { mecanic: filter } : {},
      include: { vehicul: true },
      orderBy: { dataCompletare: 'desc' },
    });

    // 3. Permutări / Montări Anvelope
    const anvelopePermutari = await this.prisma.istoricPermutareAnvelopa.findMany({
      where: filter ? { operator: filter } : {},
      include: { vehicul: true, anvelopa: true },
      orderBy: { dataPermutare: 'desc' },
    });

    // 4. Măsurători Anvelope
    const masuratori = await this.prisma.masurareUzuraAnvelopa.findMany({
      where: filter ? { tehnician: filter } : {},
      include: { anvelopa: { include: { vehicul: true } } },
      orderBy: { dataMasurare: 'desc' },
    });

    const servicii: any[] = [];

    comenzi.forEach(c => {
      const hasContor = Number(c.valoareContorLaExecutie || 0) > 0;
      servicii.push({
        id: `CL-${c.id}`,
        tip: 'COMANDA_LUCRU',
        titlu: `Comandă de Lucru: ${c.numarComanda}`,
        mecanic: c.mecanicResponsabil,
        vehicul: c.vehicul ? `${c.vehicul.numarIntern} (${c.vehicul.numarInmatriculare})` : '-',
        data: c.dataDeschidere,
        stare: c.stare,
        detalii: `${c.elementeComanda.length} elemente piese/manoperă.${hasContor ? ` Contor: ${c.valoareContorLaExecutie}` : ''}`,
        costTotal: c.elementeComanda.reduce((sum, e) => sum + e.costTotal, 0),
      });
    });

    fluide.forEach(f => {
      servicii.push({
        id: `FL-${f.id}`,
        tip: f.tipOperatiune === 'SCHIMB_ULEI' ? 'SCHIMB_ULEI' : 'COMPLETARE_ULEI',
        titlu: f.tipOperatiune === 'SCHIMB_ULEI' ? `Schimb Complet Ulei (${f.tipLichid.replace(/_/g, ' ')})` : `Completare/Dopare Ulei (${f.tipLichid.replace(/_/g, ' ')})`,
        mecanic: f.mecanic,
        vehicul: f.vehicul ? `${f.vehicul.numarIntern} (${f.vehicul.numarInmatriculare})` : '-',
        data: f.dataCompletare,
        stare: 'FINALIZAT',
        detalii: `${f.cantitateLitri} Litri (${f.marcaUlei || 'Standard'}). Contor: ${f.valoareContor}`,
        costTotal: f.costTotal,
      });
    });

    anvelopePermutari.forEach(p => {
      servicii.push({
        id: `ANV-${p.id}`,
        tip: 'ROTIRE_ANVELOPA',
        titlu: `Permutare/Rotire Anvelopă (${p.anvelopa?.serieAnvelopa || 'Anvelopă'})`,
        mecanic: p.operator || 'Mecanic Atelier',
        vehicul: p.vehicul ? `${p.vehicul.numarIntern} (${p.vehicul.numarInmatriculare})` : '-',
        data: p.dataPermutare,
        stare: 'FINALIZAT',
        detalii: `Mutare de pe poz. ${p.pozitieSursaCod}  ${p.pozitieDestCod}. Contor: ${p.valoareContor}`,
        costTotal: 0,
      });
    });

    masuratori.forEach(m => {
      servicii.push({
        id: `MAS-${m.id}`,
        tip: 'MASURARE_PROFIL',
        titlu: `Măsurare Profil Anvelopă (${m.anvelopa?.serieAnvelopa || ''})`,
        mecanic: m.tehnician,
        vehicul: m.anvelopa?.vehicul ? `${m.anvelopa.vehicul.numarIntern} (${m.anvelopa.vehicul.numarInmatriculare})` : '-',
        data: m.dataMasurare,
        stare: 'FINALIZAT',
        detalii: `Adâncime profil: ${m.adancimeProfilMm} mm. Contor: ${m.valoareContor}`,
        costTotal: 0,
      });
    });

    servicii.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return servicii;
  }

  // ==========================================
  // PROFILURI & SARCINI MENTENANȚĂ FLOTĂ
  // ==========================================

  async getProfileMentenanta() {
    return this.prisma.profilMentenanta.findMany({
      include: { sarcini: { include: { sarciniSubordonate: true } } },
    });
  }

  async createProfilMentenanta(data: { nume: string; descriere?: string; categorieEnum?: string }) {
    return this.prisma.profilMentenanta.create({
      data: {
        nume: data.nume,
        descriere: data.descriere,
        categorieEnum: data.categorieEnum,
      },
    });
  }

  async createSarcinaMentenanta(data: {
    nume: string;
    descriere?: string;
    tipSarcina: string;
    tipMasurare: string;
    intervalRulaj: number;
    profilId?: string;
    vehiculId?: string;
    sarcinSuperioaraId?: string;
  }) {
    return this.prisma.sarcinaMentenanta.create({
      data: {
        nume: data.nume,
        descriere: data.descriere,
        tipSarcina: data.tipSarcina,
        tipMasurare: data.tipMasurare,
        intervalRulaj: Number(data.intervalRulaj),
        profilId: data.profilId || null,
        vehiculId: data.vehiculId || null,
        sarcinSuperioaraId: data.sarcinSuperioaraId || null,
      },
    });
  }

  // CENTRALIZATOR COMPLET SARCINI FLOTĂ
  async getToateSarcinileFlota() {
    const vehicule = await this.prisma.vehicul.findMany({
      include: {
        sarciniMentenanta: {
          include: { sarcinSuperioara: true, sarciniSubordonate: true },
        },
      },
      orderBy: { numarIntern: 'asc' },
    });

    const sarciniProfil = await this.prisma.sarcinaMentenanta.findMany({
      where: { profilId: { not: null } },
      include: { profil: true, sarcinSuperioara: true, sarciniSubordonate: true },
    });

    const rez: any[] = [];

    for (const v of vehicule) {
      for (const s of v.sarciniMentenanta) {
        const rulajParcursDeLaUltima = v.valoareContorCurent - s.ultimulRulajExecutie;
        const esteDepasit = rulajParcursDeLaUltima >= s.intervalRulaj;
        const procentUtilizat = Math.min(100, Math.round((rulajParcursDeLaUltima / s.intervalRulaj) * 100));

        rez.push({
          ...s,
          vehiculId: v.id,
          vehiculNumarIntern: v.numarIntern,
          vehiculInmatriculare: v.numarInmatriculare,
          vehiculMarca: v.marca,
          vehiculModel: v.model,
          valoareContorCurent: v.valoareContorCurent,
          tipMasurare: v.tipMasurare,
          rulajParcursDeLaUltima,
          esteDepasit,
          procentUtilizat,
        });
      }

      const potriviteProfil = sarciniProfil.filter((sp) => sp.profil?.categorieEnum === v.categorieEnum);
      for (const sp of potriviteProfil) {
        if (!v.sarciniMentenanta.some((s) => s.id === sp.id)) {
          const rulajParcursDeLaUltima = v.valoareContorCurent - sp.ultimulRulajExecutie;
          const esteDepasit = rulajParcursDeLaUltima >= sp.intervalRulaj;
          const procentUtilizat = Math.min(100, Math.round((rulajParcursDeLaUltima / sp.intervalRulaj) * 100));

          rez.push({
            ...sp,
            vehiculId: v.id,
            vehiculNumarIntern: v.numarIntern,
            vehiculInmatriculare: v.numarInmatriculare,
            vehiculMarca: v.marca,
            vehiculModel: v.model,
            valoareContorCurent: v.valoareContorCurent,
            tipMasurare: v.tipMasurare,
            rulajParcursDeLaUltima,
            esteDepasit,
            procentUtilizat,
          });
        }
      }
    }

    return rez.sort((a, b) => {
      if (a.esteDepasit && !b.esteDepasit) return -1;
      if (!a.esteDepasit && b.esteDepasit) return 1;
      return b.procentUtilizat - a.procentUtilizat;
    });
  }

  async getSarciniPerVehicul(vehiculId: string) {
    const vehicul = await this.prisma.vehicul.findUnique({ where: { id: vehiculId } });
    if (!vehicul) throw new NotFoundException('Vehiculul nu a fost găsit.');

    const sarcini = await this.prisma.sarcinaMentenanta.findMany({
      where: {
        OR: [
          { vehiculId },
          { profil: { categorieEnum: vehicul.categorieEnum } },
        ],
      },
      include: {
        sarcinSuperioara: true,
        sarciniSubordonate: true,
      },
    });

    return sarcini.map((s) => {
      const rulajParcursDeLaUltima = vehicul.valoareContorCurent - s.ultimulRulajExecutie;
      const esteDepasit = rulajParcursDeLaUltima >= s.intervalRulaj;
      const procentUtilizat = Math.min(100, Math.round((rulajParcursDeLaUltima / s.intervalRulaj) * 100));

      return {
        ...s,
        vehiculNumarIntern: vehicul.numarIntern,
        vehiculInmatriculare: vehicul.numarInmatriculare,
        valoareContorCurent: vehicul.valoareContorCurent,
        rulajParcursDeLaUltima,
        esteDepasit,
        procentUtilizat,
      };
    });
  }

  // 1-CLICK DIRECT RESET CONTOR DOAR PENTRU INSPECȚII / MANOPERĂ (SCHIMB PIESĂ REQUIRES WORK ORDER)
  async finalizeazaSarcinaDirect(sarcinaId: string) {
    const sarcina = await this.prisma.sarcinaMentenanta.findUnique({
      where: { id: sarcinaId },
      include: { vehicul: true, sarciniSubordonate: true },
    });

    if (!sarcina) throw new NotFoundException('Sarcina nu există.');

    if (sarcina.tipSarcina === 'SCHIMB_PIESA') {
      throw new BadRequestException('Sarcinile de tip SCHIMB_PIESA / ULEI nu se pot finaliza prin 1-Click! Trebuie deschisă o Comandă de Lucru pentru a înregistra piesa/uleiul folosit.');
    }

    let valoareContor = 0;
    if (sarcina.vehicul) {
      valoareContor = sarcina.vehicul.valoareContorCurent;
    } else {
      valoareContor = sarcina.ultimulRulajExecutie + sarcina.intervalRulaj;
    }

    await this.prisma.sarcinaMentenanta.update({
      where: { id: sarcina.id },
      data: { ultimulRulajExecutie: valoareContor },
    });

    return {
      mesaj: ` Inspecție/Manoperă finalizată! Contorul a fost resetat la ${valoareContor} ${sarcina.tipMasurare}.`,
      valoareContor,
    };
  }

  // ==========================================
  // COMENZI DE LUCRU CU MULTIPLE ELEMENTE & CICLU DE VIAȚĂ
  // ==========================================

  private isTireItemOrDescription(articol: any, descriere?: string): boolean {
    if (articol) {
      const cat = (articol.categorie || '').toLowerCase();
      const sub = (articol.subcategorie || '').toLowerCase();
      const cod = (articol.codArticol || '').toUpperCase();
      const den = (articol.denumire || '').toLowerCase();
      if (
        cat.includes('anvelop') ||
        cat.includes('cauciuc') ||
        cat.includes('pneu') ||
        sub.includes('anvelop') ||
        cod.startsWith('ANV') ||
        /anvelop|cauciuc|r22\.5|r17\.5|r20|r24|315\/80|385\/65/i.test(den)
      ) {
        return true;
      }
    }
    if (descriere) {
      if (/anvelop|cauciuc|pneu\b|pneuri/i.test(descriere)) {
        return true;
      }
    }
    return false;
  }

  private parseDevizDateInput(raw?: string | Date | null): Date | null {
    if (!raw) return null;
    if (raw instanceof Date) {
      return Number.isNaN(raw.getTime()) ? null : raw;
    }
    const str = String(raw).trim();
    if (!str) return null;
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
    if (ymd) {
      return new Date(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10), 12, 0, 0);
    }
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  async createComandaLucru(data: {
    vehiculId: string;
    mecanicResponsabil: string;
    valoareContorLaExecutie?: number;
    valoareContor?: number;
    dataDeschidere?: string | Date;
    dataDeviz?: string | Date;
    observatii?: string;
    elemente?: Array<{
      sarcinaMentenantaId?: string;
      pilonCost: string;
      descriere: string;
      cantitate: number;
      pretUnitar: number;
      provenienta?: string;
      articolStocId?: string;
      serieUnicaPiesa?: string;
      furnizor?: string;
      numarFactura?: string;
    }>;
  }) {
    const vehicul = await this.prisma.vehicul.findUnique({ where: { id: data.vehiculId } });
    if (!vehicul) throw new NotFoundException('Vehicul negăsit');

    const dataDeschidereFinal =
      this.parseDevizDateInput(data.dataDeschidere ?? data.dataDeviz) || new Date();

    const rawContorInput = data.valoareContorLaExecutie ?? data.valoareContor;
    const parsedContor =
      rawContorInput !== undefined && rawContorInput !== null && String(rawContorInput).trim() !== ''
        ? Number(rawContorInput)
        : 0;
    const contorVal = !isNaN(parsedContor) && parsedContor > 0 ? parsedContor : 0;

    // Înregistrăm KM / mTH pe vehicul și în istoric EXCLUSIV dacă utilizatorul a introdus o valoare > 0
    if (contorVal > 0) {
      await this.prisma.vehicul.update({
        where: { id: data.vehiculId },
        data: {
          valoareContorCurent: Math.max(vehicul.valoareContorCurent, contorVal),
          dataInregistrareContor: dataDeschidereFinal,
        },
      });

      await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: data.vehiculId,
          valoareContor: contorVal,
          dataInregistrare: dataDeschidereFinal,
          sursa: 'SERVICE',
          operator: data.mecanicResponsabil || 'Atelier Intern',
          observatii: data.observatii || `Deschidere Comandă de Lucru (${contorVal} ${vehicul.tipMasurare})`,
        },
      });
    }

    // Generare număr comandă fără riscul de coliziune cu numere existente
    const allComenzi = await this.prisma.comandaLucru.findMany({
      select: { numarComanda: true },
    });
    let maxNum = 0;
    for (const c of allComenzi) {
      const match = c.numarComanda?.match(/CL-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    let nextNum = maxNum + 1;
    let numarComanda = `CL-${nextNum.toString().padStart(5, '0')}`;
    while (await this.prisma.comandaLucru.findUnique({ where: { numarComanda } })) {
      nextNum++;
      numarComanda = `CL-${nextNum.toString().padStart(5, '0')}`;
    }

    const elementeData = data.elemente || [];

    // ENFORCE STRICT STOCK LIMIT VALIDATION & EXCLUDE TIRES (Tires must be mounted only via Anvelope / Axe)
    for (const el of elementeData) {
      if ((el.pilonCost === 'PIESA_STOC' || el.articolStocId) && el.articolStocId) {
        const articol = await this.prisma.articolStoc.findUnique({ where: { id: el.articolStocId } });
        if (articol) {
          if (this.isTireItemOrDescription(articol, el.descriere)) {
            throw new BadRequestException(
              'Anvelopele nu pot fi montate din Comanda de Lucru! Montarea și gestiunea anvelopelor pe vehicul se realizează exclusiv din meniul Anvelope / Harta Axe.'
            );
          }
          const requestedQty = Number(el.cantitate || 1);
          if (requestedQty > articol.stocCurent) {
            throw new BadRequestException(
              `Stoc insuficient pentru articolul "${articol.denumire}"! Stoc disponibil: ${articol.stocCurent} ${articol.unitateMasura || 'buc'}, dar ați solicitat: ${requestedQty} ${articol.unitateMasura || 'buc'}.`
            );
          }
        }
      } else if (el.pilonCost === 'PIESA_DIRECTA' || el.pilonCost === 'PIESA_DEZMEMBRATA' || el.pilonCost === 'PIESA_STOC') {
        if (this.isTireItemOrDescription(null, el.descriere)) {
          throw new BadRequestException(
            'Anvelopele nu pot fi montate din Comanda de Lucru! Montarea și gestiunea anvelopelor pe vehicul se realizează exclusiv din meniul Anvelope / Harta Axe.'
          );
        }
      }
    }

    const processedElemente = await Promise.all(
      elementeData.map(async (el) => {
        let furnizor = el.furnizor || null;
        let numarFactura = el.numarFactura || null;
        let pretUnitar = Number(el.pretUnitar || 0);

        if (el.articolStocId && (!furnizor || !numarFactura)) {
          const latestLot = await this.prisma.intrareStoc.findFirst({
            where: { articolStocId: el.articolStocId },
            orderBy: { dataFactura: 'desc' },
          });
          if (latestLot) {
            if (!furnizor) furnizor = latestLot.furnizor;
            if (!numarFactura) numarFactura = latestLot.numarFactura;
            if (!pretUnitar && latestLot.pretUnitar) pretUnitar = latestLot.pretUnitar;
          }
        }

        return {
          sarcinaMentenantaId: el.sarcinaMentenantaId || null,
          pilonCost: el.pilonCost,
          descriere: el.descriere,
          cantitate: Number(el.cantitate || 1),
          pretUnitar,
          costTotal: Number(el.cantitate || 1) * pretUnitar,
          provenienta: el.provenienta || (el.pilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : 'Stoc Intern'),
          articolStocId: el.articolStocId || null,
          serieUnicaPiesa: el.serieUnicaPiesa || null,
          furnizor,
          numarFactura,
        };
      })
    );

    const comanda = await this.prisma.comandaLucru.create({
      data: {
        numarComanda,
        vehiculId: data.vehiculId,
        mecanicResponsabil: data.mecanicResponsabil,
        observatii: data.observatii,
        valoareContorLaExecutie: contorVal,
        stare: 'IN_LUCRU',
        dataDeschidere: dataDeschidereFinal,
        elementeComanda: {
          create: processedElemente,
        },
      },
      include: {
        elementeComanda: {
          include: {
            articolStoc: {
              include: {
                intrariStoc: {
                  orderBy: { dataFactura: 'desc' },
                },
              },
            },
          },
        },
        vehicul: true,
      },
    });

    return comanda;
  }

  // Adaugă Element / Piesă suplimentară pe o Comandă de Lucru Deschisă
  async adaugaElementComanda(comandaId: string, el: {
    sarcinaMentenantaId?: string;
    pilonCost: string;
    descriere: string;
    cantitate: number;
    pretUnitar: number;
    provenienta?: string;
    articolStocId?: string;
    furnizor?: string;
    numarFactura?: string;
  }) {
    const comanda = await this.prisma.comandaLucru.findUnique({ where: { id: comandaId } });
    if (!comanda) throw new NotFoundException('Comanda nu există.');
    if (comanda.stare !== 'IN_LUCRU') throw new BadRequestException('Nu se pot adăuga piese pe o comandă finalizată sau anulată.');

    // ENFORCE STRICT STOCK LIMIT VALIDATION & EXCLUDE TIRES (Tires must be mounted only via Anvelope / Axe)
    if ((el.pilonCost === 'PIESA_STOC' || el.articolStocId) && el.articolStocId) {
      const articol = await this.prisma.articolStoc.findUnique({ where: { id: el.articolStocId } });
      if (articol) {
        if (this.isTireItemOrDescription(articol, el.descriere)) {
          throw new BadRequestException(
            'Anvelopele nu pot fi montate din Comanda de Lucru! Montarea și gestiunea anvelopelor pe vehicul se realizează exclusiv din meniul Anvelope / Harta Axe.'
          );
        }
        const requestedQty = Number(el.cantitate || 1);
        if (requestedQty > articol.stocCurent) {
          throw new BadRequestException(
            `Stoc insuficient pentru articolul "${articol.denumire}"! Stoc disponibil: ${articol.stocCurent} ${articol.unitateMasura || 'buc'}, dar ați solicitat: ${requestedQty} ${articol.unitateMasura || 'buc'}.`
          );
        }
      }
    } else if (el.pilonCost === 'PIESA_DIRECTA' || el.pilonCost === 'PIESA_DEZMEMBRATA' || el.pilonCost === 'PIESA_STOC') {
      if (this.isTireItemOrDescription(null, el.descriere)) {
        throw new BadRequestException(
          'Anvelopele nu pot fi montate din Comanda de Lucru! Montarea și gestiunea anvelopelor pe vehicul se realizează exclusiv din meniul Anvelope / Harta Axe.'
        );
      }
    }

    let furnizor = el.furnizor || null;
    let numarFactura = el.numarFactura || null;
    let pretUnitar = Number(el.pretUnitar || 0);
    let articolTipLichid: string | null = (el as any).tipLichid || null;

    if (el.articolStocId) {
      const artInfo = await this.prisma.articolStoc.findUnique({
        where: { id: el.articolStocId },
        select: { tipLichid: true },
      });
      if (!articolTipLichid && artInfo?.tipLichid) {
        articolTipLichid = artInfo.tipLichid;
      }
      if (!furnizor || !numarFactura) {
        const latestLot = await this.prisma.intrareStoc.findFirst({
          where: { articolStocId: el.articolStocId },
          orderBy: { dataFactura: 'desc' },
        });
        if (latestLot) {
          if (!furnizor) furnizor = latestLot.furnizor;
          if (!numarFactura) numarFactura = latestLot.numarFactura;
          if (!pretUnitar && latestLot.pretUnitar) pretUnitar = latestLot.pretUnitar;
        }
      }
    }

    return this.prisma.elementComandaLucru.create({
      data: {
        comandaLucruId: comandaId,
        sarcinaMentenantaId: el.sarcinaMentenantaId || null,
        pilonCost: el.pilonCost,
        descriere: el.descriere,
        cantitate: Number(el.cantitate || 1),
        pretUnitar,
        costTotal: Number(el.cantitate || 1) * pretUnitar,
        provenienta: el.provenienta || (el.pilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : 'Stoc Intern'),
        articolStocId: el.articolStocId || null,
        tipLichid: articolTipLichid,
        furnizor,
        numarFactura,
      },
      include: {
        articolStoc: {
          include: {
            intrariStoc: {
              orderBy: { dataFactura: 'desc' },
            },
          },
        },
      },
    });
  }

  async finalizeazaComandaLucru(comandaId: string) {
    const comanda = await this.prisma.comandaLucru.findUnique({
      where: { id: comandaId },
      include: {
        vehicul: true,
        elementeComanda: { include: { sarcinaMentenanta: { include: { sarciniSubordonate: true } } } },
      },
    });

    if (!comanda) throw new NotFoundException('Comanda de lucru nu există.');
    if (comanda.stare === 'FINALIZAT') throw new BadRequestException('Comanda de lucru este deja finalizată.');

    const comandaContor = Number(comanda.valoareContorLaExecutie || 0);

    for (const elem of comanda.elementeComanda) {
      if (elem.pilonCost === 'PIESA_STOC' && elem.articolStocId) {
        const articol = await this.prisma.articolStoc.findUnique({ where: { id: elem.articolStocId } });
        if (articol) {
          if (articol.stocCurent < elem.cantitate) {
            throw new BadRequestException(`Stoc insuficient pentru ${articol.denumire}. Disponibil: ${articol.stocCurent}`);
          }
          try {
            const fifoRes = await this.stocuriGarantiiService.consumaStocFIFO(elem.articolStocId, elem.cantitate);
            const furnizoriFIFO = fifoRes.loturiConsumate?.map((l: any) => l.furnizor).filter(Boolean);
            const facturiFIFO = fifoRes.loturiConsumate?.map((l: any) => l.numarFactura).filter(Boolean);
            const furnizorFinal = furnizoriFIFO && furnizoriFIFO.length > 0 ? Array.from(new Set(furnizoriFIFO)).join(', ') : elem.furnizor;
            const facturaFinal = facturiFIFO && facturiFIFO.length > 0 ? Array.from(new Set(facturiFIFO)).join(', ') : elem.numarFactura;

            await this.prisma.elementComandaLucru.update({
              where: { id: elem.id },
              data: {
                costTotal: fifoRes.costTotal,
                pretUnitar: fifoRes.pretUnitarMediu,
                furnizor: furnizorFinal,
                numarFactura: facturaFinal,
              },
            });
          } catch (err) {
            await this.prisma.articolStoc.update({
              where: { id: elem.articolStocId },
              data: { stocCurent: Math.max(0, articol.stocCurent - elem.cantitate) },
            });
          }
        }
      }

      if (elem.sarcinaMentenanta && comandaContor > 0) {
        const sarcina = elem.sarcinaMentenanta;

        await this.prisma.sarcinaMentenanta.update({
          where: { id: sarcina.id },
          data: { ultimulRulajExecutie: comandaContor },
        });

        if (sarcina.tipSarcina === 'SCHIMB_PIESA' && sarcina.sarciniSubordonate.length > 0) {
          for (const subordonata of sarcina.sarciniSubordonate) {
            await this.prisma.sarcinaMentenanta.update({
              where: { id: subordonata.id },
              data: { ultimulRulajExecutie: comandaContor },
            });
          }
        }
      }
    }

    // AUTOMATIC ALERT BASELINE RESET: Match work order elements with RegulaAlertaMentenanta rules
    const reguli = await this.prisma.regulaAlertaMentenanta.findMany({ where: { stare: 'ACTIV' } });
    for (const elem of comanda.elementeComanda) {
      const descLower = elem.descriere.toLowerCase();
      for (const reg of reguli) {
        if (
          descLower.includes(reg.denumireOperatiune.toLowerCase()) ||
          reg.denumireOperatiune.toLowerCase().includes(descLower)
        ) {
          const fallbackContor = comandaContor > 0 ? comandaContor : (comanda.vehicul?.valoareContorCurent || 0);
          await this.prisma.executieRegulaVehicul.upsert({
            where: {
              vehiculId_regulaAlertaId: {
                vehiculId: comanda.vehiculId,
                regulaAlertaId: reg.id,
              },
            },
            update: {
              ...(comandaContor > 0 ? { ultimulSchimbContor: comandaContor } : {}),
              ultimulSchimbData: new Date(),
              observatii: `Resetat automat prin finalizare Comandă de Lucru ${comanda.numarComanda}`,
            },
            create: {
              vehiculId: comanda.vehiculId,
              regulaAlertaId: reg.id,
              ultimulSchimbContor: fallbackContor,
              ultimulSchimbData: new Date(),
              observatii: `Resetat automat prin finalizare Comandă de Lucru ${comanda.numarComanda}`,
            },
          });
        }
      }
    }

    const updatedComanda = await this.prisma.comandaLucru.update({
      where: { id: comandaId },
      data: {
        stare: 'FINALIZAT',
        dataFinalizare: new Date(),
      },
    });

    await syncFluidCompletariForComanda(this.prisma, comandaId);
    return updatedComanda;
  }

  async anuleazaSauStergeComanda(comandaId: string) {
    const comanda = await this.prisma.comandaLucru.findUnique({
      where: { id: comandaId },
      include: { elementeComanda: true },
    });

    if (!comanda) throw new NotFoundException('Comanda nu există.');

    if (comanda.stare === 'FINALIZAT') {
      for (const elem of comanda.elementeComanda) {
        if (elem.pilonCost === 'PIESA_STOC' && elem.articolStocId) {
          await this.stocuriGarantiiService.restituieStocFIFO(
            elem.articolStocId,
            elem.cantitate,
            elem.numarFactura,
          );
        }
      }
    }

    await removeFluidCompletariForComanda(this.prisma, comandaId);
    return this.prisma.comandaLucru.update({
      where: { id: comandaId },
      data: { stare: 'ANULAT' },
    });
  }

  // REDESCHIDERE COMANDĂ DE LUCRU ANULATĂ (Reactivare în stare IN_LUCRU)
  async redeschideComandaLucru(comandaId: string) {
    const comanda = await this.prisma.comandaLucru.findUnique({
      where: { id: comandaId },
      include: { elementeComanda: true, vehicul: true },
    });
    if (!comanda) throw new NotFoundException('Comanda nu există.');

    return this.prisma.comandaLucru.update({
      where: { id: comandaId },
      data: {
        stare: 'IN_LUCRU',
        dataFinalizare: null,
      },
      include: { elementeComanda: true, vehicul: true },
    });
  }

  // ȘTERGERE DEFINITIVĂ COMANDĂ DE LUCRU (pentru comenzi anulate)
  async deleteComandaLucru(comandaId: string) {
    const comanda = await this.prisma.comandaLucru.findUnique({
      where: { id: comandaId },
      include: { elementeComanda: true },
    });
    if (!comanda) throw new NotFoundException('Comanda nu există.');

    if (comanda.stare === 'FINALIZAT') {
      for (const elem of comanda.elementeComanda) {
        if (elem.pilonCost === 'PIESA_STOC' && elem.articolStocId) {
          await this.stocuriGarantiiService.restituieStocFIFO(
            elem.articolStocId,
            elem.cantitate,
            elem.numarFactura,
          );
        }
      }
    }

    await removeFluidCompletariForComanda(this.prisma, comandaId);
    await this.prisma.notaAtelier.updateMany({
      where: { comandaLucruId: comandaId },
      data: { comandaLucruId: null, comandaLucruNumar: null },
    });
    return this.prisma.comandaLucru.delete({ where: { id: comandaId } });
  }

  // DEVALIDARE COMANDĂ DE LUCRU: Trecere din FINALIZAT în DEVALIDAT, restaurare stoc pentru re-editare
  async devalideazaComandaLucru(comandaId: string) {
    const comanda = await this.prisma.comandaLucru.findUnique({
      where: { id: comandaId },
      include: { elementeComanda: true },
    });

    if (!comanda) throw new NotFoundException('Comanda nu există.');

    if (comanda.stare === 'FINALIZAT') {
      for (const elem of comanda.elementeComanda) {
        if (elem.pilonCost === 'PIESA_STOC' && elem.articolStocId) {
          await this.stocuriGarantiiService.restituieStocFIFO(
            elem.articolStocId,
            elem.cantitate,
            elem.numarFactura,
          );
        }
      }
    }

    await removeFluidCompletariForComanda(this.prisma, comandaId);

    return this.prisma.comandaLucru.update({
      where: { id: comandaId },
      data: {
        stare: 'DEVALIDAT',
        dataFinalizare: null,
      },
    });
  }

  // UPDATE COMANDĂ DE LUCRU: Editare (dată deviz, mecanic, observații, elemente)
  async updateComandaLucru(comandaId: string, data: {
    mecanicResponsabil?: string;
    observatii?: string;
    dataDeschidere?: string | Date;
    dataFinalizare?: string | Date | null;
    elementeComanda?: Array<{
      id?: string;
      pilonCost: string;
      descriere: string;
      cantitate: number;
      pretUnitar: number;
      articolStocId?: string;
    }>;
  }) {
    const comanda = await this.prisma.comandaLucru.findUnique({ where: { id: comandaId } });
    if (!comanda) throw new NotFoundException('Comanda nu există.');

    const hasDateUpdate = data.dataDeschidere !== undefined || data.dataFinalizare !== undefined;
    const hasContentUpdate =
      data.mecanicResponsabil !== undefined ||
      data.observatii !== undefined ||
      data.elementeComanda !== undefined;

    if (comanda.stare === 'FINALIZAT' && hasContentUpdate) {
      throw new BadRequestException('Comanda finalizată trebuie mai întâi DEVALIDATĂ pentru a putea fi editată!');
    }

    const parsedDataDeschidere =
      data.dataDeschidere !== undefined ? this.parseDevizDateInput(data.dataDeschidere) : undefined;
    if (data.dataDeschidere !== undefined && !parsedDataDeschidere) {
      throw new BadRequestException('Data deschiderii devizului nu este validă.');
    }

    const parsedDataFinalizare =
      data.dataFinalizare !== undefined
        ? data.dataFinalizare === null || String(data.dataFinalizare).trim() === ''
          ? null
          : this.parseDevizDateInput(data.dataFinalizare)
        : undefined;
    if (
      data.dataFinalizare !== undefined &&
      data.dataFinalizare !== null &&
      String(data.dataFinalizare).trim() !== '' &&
      !parsedDataFinalizare
    ) {
      throw new BadRequestException('Data finalizării devizului nu este validă.');
    }

    if (data.mecanicResponsabil || data.observatii !== undefined || hasDateUpdate) {
      await this.prisma.comandaLucru.update({
        where: { id: comandaId },
        data: {
          ...(data.mecanicResponsabil ? { mecanicResponsabil: data.mecanicResponsabil } : {}),
          ...(data.observatii !== undefined ? { observatii: data.observatii } : {}),
          ...(parsedDataDeschidere ? { dataDeschidere: parsedDataDeschidere } : {}),
          ...(parsedDataFinalizare !== undefined ? { dataFinalizare: parsedDataFinalizare } : {}),
        },
      });
    }

    // Dacă s-a modificat data unui deviz FINALIZAT, sincronizăm automat și data completărilor/schimburilor de fluide asociate
    if (comanda.stare === 'FINALIZAT' && hasDateUpdate) {
      await syncFluidCompletariForComanda(this.prisma, comandaId);
      return this.prisma.comandaLucru.findUnique({
        where: { id: comandaId },
        include: { elementeComanda: true, vehicul: true },
      });
    }

    if (data.elementeComanda) {
      for (const el of data.elementeComanda) {
        if ((el.pilonCost === 'PIESA_STOC' || el.articolStocId) && el.articolStocId) {
          const articol = await this.prisma.articolStoc.findUnique({ where: { id: el.articolStocId } });
          if (articol) {
            if (this.isTireItemOrDescription(articol, el.descriere)) {
              throw new BadRequestException(
                'Anvelopele nu pot fi montate din Comanda de Lucru! Montarea și gestiunea anvelopelor pe vehicul se realizează exclusiv din meniul Anvelope / Harta Axe.'
              );
            }
            const requestedQty = Number(el.cantitate || 1);
            if (requestedQty > articol.stocCurent) {
              throw new BadRequestException(
                `Stoc insuficient pentru articolul "${articol.denumire}"! Stoc disponibil: ${articol.stocCurent} ${articol.unitateMasura || 'buc'}, dar ați solicitat: ${requestedQty} ${articol.unitateMasura || 'buc'}.`
              );
            }
          }
        } else if (el.pilonCost === 'PIESA_DIRECTA' || el.pilonCost === 'PIESA_DEZMEMBRATA' || el.pilonCost === 'PIESA_STOC') {
          if (this.isTireItemOrDescription(null, el.descriere)) {
            throw new BadRequestException(
              'Anvelopele nu pot fi montate din Comanda de Lucru! Montarea și gestiunea anvelopelor pe vehicul se realizează exclusiv din meniul Anvelope / Harta Axe.'
            );
          }
        }
      }
      // Re-create elements if passed
      await this.prisma.elementComandaLucru.deleteMany({ where: { comandaLucruId: comandaId } });
      const processedUpdateElemente = await Promise.all(
        data.elementeComanda.map(async (el: any) => {
          let furnizor = el.furnizor || null;
          let numarFactura = el.numarFactura || null;
          let pretUnitar = Number(el.pretUnitar || 0);
          let tipLichid: string | null = el.tipLichid || null;

          if (el.articolStocId) {
            if (!tipLichid) {
              const artInfo = await this.prisma.articolStoc.findUnique({
                where: { id: el.articolStocId },
                select: { tipLichid: true },
              });
              if (artInfo?.tipLichid) tipLichid = artInfo.tipLichid;
            }
            if (!furnizor || !numarFactura) {
              const latestLot = await this.prisma.intrareStoc.findFirst({
                where: { articolStocId: el.articolStocId },
                orderBy: { dataFactura: 'desc' },
              });
              if (latestLot) {
                if (!furnizor) furnizor = latestLot.furnizor;
                if (!numarFactura) numarFactura = latestLot.numarFactura;
                if (!pretUnitar && latestLot.pretUnitar) pretUnitar = latestLot.pretUnitar;
              }
            }
          }

          return {
            comandaLucruId: comandaId,
            pilonCost: el.pilonCost,
            descriere: el.descriere,
            cantitate: Number(el.cantitate || 1),
            pretUnitar,
            costTotal: Number(el.cantitate || 1) * pretUnitar,
            provenienta: el.provenienta || (el.pilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : el.pilonCost === 'PIESA_DIRECTA' ? 'Achiziție Directă' : 'Stoc Intern'),
            articolStocId: el.articolStocId || null,
            tipLichid,
            furnizor,
            numarFactura,
          };
        })
      );

      await this.prisma.elementComandaLucru.createMany({
        data: processedUpdateElemente,
      });
    }

    return this.prisma.comandaLucru.findUnique({
      where: { id: comandaId },
      include: {
        elementeComanda: {
          include: {
            articolStoc: {
              include: {
                intrariStoc: {
                  orderBy: { dataFactura: 'desc' },
                },
              },
            },
          },
        },
      },
    });
  }

  // Escaladare în Atelier: Deschide Comandă de Lucru în Stare "IN_LUCRU" cu dataDeschidere
  async escaladeazaSarcinaInAtelier(sarcinaId: string, data: {
    articolStocId?: string;
    esteBontott?: boolean;
    provenienta?: string;
    cantitate?: number;
    pretUnitar?: number;
    mecanicResponsabil: string;
    observatii?: string;
    elementeMultiple?: Array<any>;
  }) {
    const sarcina = await this.prisma.sarcinaMentenanta.findUnique({
      where: { id: sarcinaId },
      include: { sarcinSuperioara: true, vehicul: true },
    });

    if (!sarcina) throw new NotFoundException('Sarcina nu există.');
    if (!sarcina.vehiculId) throw new BadRequestException('Sarcina trebuie să fie asociată unui vehicul.');

    const elemente: any[] = [];

    // Allow multiple elements if passed, or create single initial element if part selected
    if (data.elementeMultiple && data.elementeMultiple.length > 0) {
      elemente.push(...data.elementeMultiple.map(el => ({ ...el, sarcinaMentenantaId: sarcina.id })));
    } else if (data.articolStocId || data.esteBontott) {
      let pilonCost = 'PIESA_STOC';
      if (data.esteBontott) pilonCost = 'PIESA_DEZMEMBRATA';

      elemente.push({
        sarcinaMentenantaId: sarcina.id,
        pilonCost,
        descriere: `Execuție mentenanță: ${sarcina.nume}`,
        cantitate: data.cantitate || 1,
        pretUnitar: data.pretUnitar || 0,
        provenienta: data.provenienta || (data.esteBontott ? 'Dezmembrări Parcul Propriu' : 'Stoc Intern'),
        articolStocId: data.articolStocId || null,
      });
    } else {
      // Open order with general description without forcing parts yet!
      elemente.push({
        sarcinaMentenantaId: sarcina.id,
        pilonCost: 'MANOPERA_INTERNA',
        descriere: `Deschidere Comandă de Lucru: ${sarcina.nume}`,
        cantitate: 1,
        pretUnitar: 0,
        provenienta: 'Atelier Intern',
      });
    }

    const comanda = await this.createComandaLucru({
      vehiculId: sarcina.vehiculId,
      mecanicResponsabil: data.mecanicResponsabil,
      observatii: data.observatii || `Deschidere Comandă de Lucru: ${sarcina.nume}`,
      elemente,
    });

    return {
      mesaj: ` Comandă de Lucru ${comanda.numarComanda} deschisă cu succes (Stare: ÎN LUCRU)! Puteți adăuga piese suplimentare și o puteți finaliza din Comenzi de Lucru.`,
      comanda,
    };
  }

  // ==========================================
  // UNIRE / COMASARE COMENZI DE LUCRU (ACELAȘI VEHICUL)
  // ==========================================
  async mergeComenziLucru(data: {
    targetId: string;
    sourceIds: string[];
    observatii?: string;
  }) {
    const targetId = String(data?.targetId || '').trim();
    const rawSourceIds = Array.isArray(data?.sourceIds) ? data.sourceIds : [];
    const uniqueSourceIds = Array.from(
      new Set(
        rawSourceIds
          .map((id) => String(id || '').trim())
          .filter((id) => id && id !== targetId)
      )
    );

    if (!targetId || uniqueSourceIds.length === 0) {
      throw new BadRequestException('Selectați cel puțin două comenzi de lucru diferite pentru unire.');
    }

    const allIds = [targetId, ...uniqueSourceIds];

    const initialOrders = await this.prisma.comandaLucru.findMany({
      where: { id: { in: allIds } },
      include: {
        elementeComanda: true,
        vehicul: true,
      },
    });

    if (initialOrders.length !== allIds.length) {
      throw new NotFoundException('Una sau mai multe comenzi de lucru selectate nu mai există.');
    }

    const targetOrder = initialOrders.find((o) => o.id === targetId);
    if (!targetOrder) {
      throw new NotFoundException('Comanda de destinație nu a fost găsită.');
    }
    const sourceOrders = initialOrders.filter((o) => o.id !== targetId);

    const canceled = initialOrders.find((o) => o.stare === 'ANULAT');
    if (canceled) {
      throw new BadRequestException(
        `Comanda ${canceled.numarComanda} este ANULATĂ și nu poate fi unită. Reactivați-o sau excludeți-o din selecție.`
      );
    }

    const mismatchVehicul = initialOrders.find((o) => o.vehiculId !== targetOrder.vehiculId);
    if (mismatchVehicul) {
      throw new BadRequestException(
        `Unirea este permisă exclusiv pentru comenzi de pe ACELAȘI vehicul/utilaj (${mismatchVehicul.numarComanda} aparține altui vehicul).`
      );
    }

    const finalizedSources = sourceOrders.filter((o) => o.stare === 'FINALIZAT');
    const openSources = sourceOrders.filter((o) => o.stare !== 'FINALIZAT');

    // Gestiune FIFO guard: comenzile finalizate au stocul deja consumat din loturile FIFO.
    if (targetOrder.stare !== 'FINALIZAT' && finalizedSources.length > 0) {
      throw new BadRequestException(
        'Comenzile finalizate nu pot fi absorbite într-o comandă deschisă/devalidată. Alegeți o comandă FINALIZATĂ ca destinație principală.'
      );
    }

    // Dacă destinația este FINALIZATĂ și există surse ÎN LUCRU / DEVALIDATE, le finalizăm FIFO mai întâi.
    if (targetOrder.stare === 'FINALIZAT' && openSources.length > 0) {
      const stockNeeded = new Map<string, number>();
      for (const src of openSources) {
        for (const el of src.elementeComanda) {
          if (el.pilonCost === 'PIESA_STOC' && el.articolStocId) {
            stockNeeded.set(
              el.articolStocId,
              (stockNeeded.get(el.articolStocId) || 0) + Number(el.cantitate || 0)
            );
          }
        }
      }
      if (stockNeeded.size > 0) {
        const articole = await this.prisma.articolStoc.findMany({
          where: { id: { in: Array.from(stockNeeded.keys()) } },
          select: { id: true, denumire: true, stocCurent: true, unitateMasura: true },
        });
        for (const art of articole) {
          const reqQty = stockNeeded.get(art.id) || 0;
          if (Number(art.stocCurent || 0) < reqQty) {
            throw new BadRequestException(
              `Stoc insuficient pentru finalizarea combinată a articolului "${art.denumire}": solicitat ${reqQty}, disponibil ${art.stocCurent} ${art.unitateMasura || 'buc'}.`
            );
          }
        }
      }

      for (const src of openSources) {
        await this.finalizeazaComandaLucru(src.id);
      }
    }

    // Re-fetch după eventuale finalizări FIFO pentru a avea costuri/date exacte
    const freshOrders = await this.prisma.comandaLucru.findMany({
      where: { id: { in: allIds } },
      include: {
        elementeComanda: true,
        vehicul: true,
      },
    });

    const freshTarget = freshOrders.find((o) => o.id === targetId);
    if (!freshTarget) {
      throw new NotFoundException('Comanda țintă nu a putut fi reîncărcată.');
    }
    const freshSources = freshOrders
      .filter((o) => o.id !== targetId)
      .sort((a, b) => a.numarComanda.localeCompare(b.numarComanda, undefined, { numeric: true }));

    const orderedForMerge = [freshTarget, ...freshSources];

    // Agregare mecanici unici
    const mechanicMap = new Map<string, string>();
    for (const o of orderedForMerge) {
      for (const part of String(o.mecanicResponsabil || '').split(/[,;]+/)) {
        const trimmed = part.trim();
        if (trimmed && !mechanicMap.has(trimmed.toLowerCase())) {
          mechanicMap.set(trimmed.toLowerCase(), trimmed);
        }
      }
    }
    const mergedMecanic = Array.from(mechanicMap.values()).join(', ') || freshTarget.mecanicResponsabil;

    // Agregare date deschidere / finalizare & contor maxim
    const minDeschidere = new Date(
      Math.min(...orderedForMerge.map((o) => new Date(o.dataDeschidere).getTime()))
    );

    let mergedFinalizare: Date | null = null;
    if (freshTarget.stare === 'FINALIZAT') {
      const finTimes = orderedForMerge
        .map((o) => (o.dataFinalizare ? new Date(o.dataFinalizare).getTime() : 0))
        .filter((t) => t > 0);
      mergedFinalizare = finTimes.length > 0 ? new Date(Math.max(...finTimes)) : new Date();
    }

    const maxContor = Math.max(
      ...orderedForMerge.map((o) => Number(o.valoareContorLaExecutie || 0))
    );

    // Agregare observații unice + urmă audit numere unite
    const mergedNumbersList = freshSources.map((o) => o.numarComanda).join(', ');
    let mergedObservatii: string | null = null;
    if (typeof data.observatii === 'string' && data.observatii.trim()) {
      mergedObservatii = data.observatii.trim();
    } else {
      const obsLines: string[] = [];
      const seenObs = new Set<string>();
      for (const o of orderedForMerge) {
        const raw = String(o.observatii || '').trim();
        if (raw && !seenObs.has(raw.toLowerCase())) {
          seenObs.add(raw.toLowerCase());
          obsLines.push(raw);
        }
      }
      const mergeTag = `[Comenzi unite în ${freshTarget.numarComanda}: ${mergedNumbersList}]`;
      if (!obsLines.some((l) => l.includes(mergeTag))) {
        obsLines.push(mergeTag);
      }
      mergedObservatii = obsLines.join(' | ');
    }

    const mergedComanda = await this.prisma.$transaction(async (tx) => {
      await tx.elementComandaLucru.updateMany({
        where: { comandaLucruId: { in: uniqueSourceIds } },
        data: { comandaLucruId: targetId },
      });

      await tx.eFacturaItem.updateMany({
        where: { comandaLucruId: { in: uniqueSourceIds } },
        data: { comandaLucruId: targetId },
      });

      await tx.completareLichid.updateMany({
        where: { comandaLucruId: { in: uniqueSourceIds } },
        data: { comandaLucruId: targetId },
      });

      await tx.notaAtelier.updateMany({
        where: { comandaLucruId: { in: uniqueSourceIds } },
        data: { comandaLucruId: targetId, comandaLucruNumar: freshTarget.numarComanda },
      });

      const updatedTarget = await tx.comandaLucru.update({
        where: { id: targetId },
        data: {
          mecanicResponsabil: mergedMecanic,
          observatii: mergedObservatii,
          dataDeschidere: minDeschidere,
          dataFinalizare: mergedFinalizare,
          valoareContorLaExecutie: maxContor,
        },
        include: {
          elementeComanda: {
            include: { articolStoc: true },
          },
          vehicul: true,
        },
      });

      await tx.comandaLucru.deleteMany({
        where: { id: { in: uniqueSourceIds } },
      });

      const vehLabel =
        freshTarget.vehicul?.numarInmatriculare ||
        freshTarget.vehicul?.numarIntern ||
        freshTarget.vehiculId;

      await tx.auditLog.create({
        data: {
          userNume: 'Atelier / Sistem',
          userRol: 'OPERATOR',
          actiune: 'UNIRE_COMENZI_LUCRU',
          modul: 'MENTENANTA',
          entitateTip: 'ComandaLucru',
          entitateId: targetId,
          detalii: `Au fost unite ${freshSources.length} comenzi (${mergedNumbersList}) în comanda ${freshTarget.numarComanda} (${vehLabel}). Total poziții: ${updatedTarget.elementeComanda.length}.`,
        },
      });

      return updatedTarget;
    });

    return {
      mesaj: `Comenzile ${mergedNumbersList} au fost unite cu succes în ${freshTarget.numarComanda}!`,
      comanda: mergedComanda,
      numarComenziAbsorbite: freshSources.length,
    };
  }

  // ==========================================
  // RAPORT CENTRALIZAT COSTURI, REPARAȚII & CONSUMABILE
  // ==========================================
  async getRaportCosturiSiActivitate(query: {
    vehiculId?: string;
    categorie?: string;
    dataStart?: string;
    dataEnd?: string;
  }) {
    // 1. Identificare vehicule țintă
    const vehiculWhere: any = {};
    if (query.vehiculId && query.vehiculId !== 'TOATE') {
      vehiculWhere.id = query.vehiculId;
    } else if (query.categorie && query.categorie !== 'TOATE') {
      vehiculWhere.categorieEnum = query.categorie;
    }

    const vehicule = await this.prisma.vehicul.findMany({
      where: vehiculWhere,
      select: {
        id: true,
        numarIntern: true,
        numarInmatriculare: true,
        marca: true,
        model: true,
        categorieEnum: true,
        tipMasurare: true,
        valoareContorCurent: true,
        valoareContorInitial: true,
      },
      orderBy: { numarIntern: 'asc' },
    });

    const vehiculIds = vehicule.map((v) => v.id);

    // 2. Filtrare perioadă (dată)
    let startFilter: Date | undefined;
    let endFilter: Date | undefined;

    if (query.dataStart) {
      const s = new Date(query.dataStart);
      if (!isNaN(s.getTime())) {
        s.setHours(0, 0, 0, 0);
        startFilter = s;
      }
    }
    if (query.dataEnd) {
      const e = new Date(query.dataEnd);
      if (!isNaN(e.getTime())) {
        e.setHours(23, 59, 59, 999);
        endFilter = e;
      }
    }

    const dateFilterComanda: any = {};
    const dateFilterLichid: any = {};
    const dateFilterPermutare: any = {};

    if (startFilter || endFilter) {
      dateFilterComanda.dataDeschidere = {};
      dateFilterLichid.dataCompletare = {};
      dateFilterPermutare.dataPermutare = {};
      if (startFilter) {
        dateFilterComanda.dataDeschidere.gte = startFilter;
        dateFilterLichid.dataCompletare.gte = startFilter;
        dateFilterPermutare.dataPermutare.gte = startFilter;
      }
      if (endFilter) {
        dateFilterComanda.dataDeschidere.lte = endFilter;
        dateFilterLichid.dataCompletare.lte = endFilter;
        dateFilterPermutare.dataPermutare.lte = endFilter;
      }
    }

    // 3. Comenzi de Lucru & Elemente Comandă
    const comenzi = await this.prisma.comandaLucru.findMany({
      where: {
        vehiculId: { in: vehiculIds },
        ...dateFilterComanda,
      },
      include: {
        vehicul: {
          select: {
            id: true,
            numarIntern: true,
            numarInmatriculare: true,
            marca: true,
            model: true,
            categorieEnum: true,
            tipMasurare: true,
          },
        },
        elementeComanda: {
          include: {
            articolStoc: {
              select: {
                id: true,
                denumire: true,
                codArticol: true,
                unitateMasura: true,
                categorie: true,
                subcategorie: true,
                tipLichid: true,
              },
            },
          },
        },
      },
      orderBy: { dataDeschidere: 'desc' },
    });

    // 4. Completări & Schimburi Fluide
    const completari = await this.prisma.completareLichid.findMany({
      where: {
        vehiculId: { in: vehiculIds },
        ...dateFilterLichid,
      },
      include: {
        vehicul: {
          select: {
            id: true,
            numarIntern: true,
            numarInmatriculare: true,
            marca: true,
            model: true,
            categorieEnum: true,
            tipMasurare: true,
          },
        },
        articolStoc: {
          select: {
            id: true,
            denumire: true,
            codArticol: true,
            unitateMasura: true,
          },
        },
      },
      orderBy: { dataCompletare: 'desc' },
    });

    // 5. Montaj Anvelope pe Mașini din Stoc
    const permutariAnvelope = await this.prisma.istoricPermutareAnvelopa.findMany({
      where: {
        vehiculId: { in: vehiculIds },
        pozitieSursaCod: { contains: 'STOC' },
        ...dateFilterPermutare,
      },
      include: {
        anvelopa: true,
        vehicul: {
          select: {
            id: true,
            numarIntern: true,
            numarInmatriculare: true,
            marca: true,
            model: true,
            categorieEnum: true,
            tipMasurare: true,
          },
        },
      },
      orderBy: { dataPermutare: 'desc' },
    });

    // 6. Înregistrări Contor pentru calcul Rulaj & Cost Unitar
    const dateFilterContor: any = {};
    if (startFilter || endFilter) {
      dateFilterContor.dataInregistrare = {};
      if (startFilter) dateFilterContor.dataInregistrare.gte = startFilter;
      if (endFilter) dateFilterContor.dataInregistrare.lte = endFilter;
    }

    const istoContoare = await this.prisma.istoricContorVehicul.findMany({
      where: {
        vehiculId: { in: vehiculIds },
        ...dateFilterContor,
      },
      select: {
        vehiculId: true,
        valoareContor: true,
        dataInregistrare: true,
      },
      orderBy: { dataInregistrare: 'asc' },
    });

    // 7. Achiziții e-Factura din perioadă
    const dateFilterEFactura: any = {};
    if (startFilter || endFilter) {
      dateFilterEFactura.dataFactura = {};
      if (startFilter) dateFilterEFactura.dataFactura.gte = startFilter;
      if (endFilter) dateFilterEFactura.dataFactura.lte = endFilter;
    }

    // 7. Achiziții e-Factura Procesate (Exclusiv articole intrate în depozite, montate pe vehicule, sau reduceri/storno procesate)
    const facturiEFactura = await this.prisma.eFacturaFactura.findMany({
      where: {
        ...dateFilterEFactura,
        tipFactura: { in: ['FACTURA', 'STORNO'] },
        stare: { in: ['IMPORTAT_TOTAL', 'IMPORTAT_PARȚIAL', 'IMPORTAT'] },
        articole: {
          some: {
            stare: 'IMPORTAT',
          },
        },
      },
      select: {
        id: true,
        cifVanzator: true,
        numeVanzator: true,
        numarFactura: true,
        dataFactura: true,
        valoareTotala: true,
        tipFactura: true,
        stare: true,
        articole: {
          where: {
            stare: 'IMPORTAT',
          },
          select: {
            id: true,
            descrierePiesa: true,
            codArticolFurnizor: true,
            cantitate: true,
            unitateMasura: true,
            pretUnitar: true,
            valoareFaraTVA: true,
            valoareTVA: true,
            cotaTVA: true,
            stare: true,
            observatiiIntern: true,
            articolStocId: true,
            comandaLucruId: true,
          },
        },
      },
      orderBy: { dataFactura: 'desc' },
      take: 2000,
    });

    // 8. Documente Scadente / Expirate (ITP, RCA, Rovinietă, Tahograf)
    const documenteVehicule = await this.prisma.documentVehicul.findMany({
      where: {
        vehiculId: { in: vehiculIds },
      },
      include: {
        vehicul: {
          select: {
            id: true,
            numarIntern: true,
            numarInmatriculare: true,
            marca: true,
            model: true,
            categorieEnum: true,
          },
        },
      },
      orderBy: { dataExpirare: 'asc' },
    });

    // 9. Configurații intervale schimb ulei & revizii
    const configurariUlei = await this.prisma.configurareUleiVehicul.findMany({
      where: {
        vehiculId: { in: vehiculIds },
      },
      include: {
        vehicul: {
          select: {
            id: true,
            numarIntern: true,
            numarInmatriculare: true,
            marca: true,
            model: true,
            tipMasurare: true,
            valoareContorCurent: true,
          },
        },
      },
    });

    // 10. Catalog articole stoc pentru rezoluție categorie & subcategorie
    const articoleStocCatalog = await this.prisma.articolStoc.findMany({
      select: {
        id: true,
        codArticol: true,
        denumire: true,
        categorie: true,
        subcategorie: true,
        unitateMasura: true,
        depozit: {
          select: {
            id: true,
            nume: true,
          },
        },
      },
    });
    const articoleStocMap = new Map<string, (typeof articoleStocCatalog)[0]>();
    articoleStocCatalog.forEach((a) => {
      if (a.id) articoleStocMap.set(a.id, a);
      if (a.codArticol) articoleStocMap.set(a.codArticol.toUpperCase().trim(), a);
    });

    // Rezoluție comenzi de lucru pentru articole montate direct pe vehicule
    const comandaLucruIds = new Set<string>();
    facturiEFactura.forEach((f) => {
      f.articole.forEach((a) => {
        if (a.comandaLucruId) comandaLucruIds.add(a.comandaLucruId);
      });
    });

    const comenziLucruDirecte = await this.prisma.comandaLucru.findMany({
      where: { id: { in: Array.from(comandaLucruIds) } },
      select: {
        id: true,
        numarComanda: true,
        vehiculId: true,
        vehicul: {
          select: {
            id: true,
            numarIntern: true,
            numarInmatriculare: true,
            marca: true,
            model: true,
            categorieEnum: true,
          },
        },
      },
    });
    const comenziDirecteMap = new Map<string, (typeof comenziLucruDirecte)[0]>();
    comenziLucruDirecte.forEach((cl) => comenziDirecteMap.set(cl.id, cl));

    // Helper mapare categorie fluid (reutilizat din fluid.utils)
    const mapFluidCategory = (desc: string, tipRaw?: string): { key: string; label: string } => {
      const mapped = mapFluidCategoryReport(desc, tipRaw);
      if (mapped.key === 'MOTOR') return { key: 'ULEI_MOTOR', label: 'Ulei Motor' };
      if (mapped.key === 'HIDRAULIC') return { key: 'ULEI_HIDRAULIC', label: 'Ulei Hidraulic' };
      if (mapped.key === 'TRANSMISIE') return { key: 'ULEI_TRANSMISIE', label: 'Ulei Transmisie / Cutie' };
      return mapped;
    };

    // Helper mapare Főkategória & Alkategória pentru articole facturate
    const categorizeInvoiceItem = (
      descriere: string,
      codArticol?: string | null,
      articolStoc?: { categorie?: string | null; subcategorie?: string | null; unitateMasura?: string | null } | null
    ): { categorie: string; subcategorie: string; unitateMasura: string } => {
      // 1. Dacă articolul este deja salvat/asociat cu un ArticolStoc din baza de date (și nu are categorie generică temporară)
      if (articolStoc && articolStoc.categorie && articolStoc.categorie.toUpperCase() !== 'PIESE_AUTO') {
        let cat = articolStoc.categorie.trim();
        if (cat.toLowerCase() === 'piese statie de sortare') cat = 'Piese Stație de Sortare';
        return {
          categorie: cat,
          subcategorie: articolStoc.subcategorie?.trim() || 'General',
          unitateMasura: articolStoc.unitateMasura || 'buc',
        };
      }

      const d = (descriere || '').toLowerCase();
      const cod = (codArticol || '').toUpperCase();

      // 2. Stație de sortare & benzi transportoare
      if (/banda\s*transportoare|statie|sortare|ciur|concasor|clema\s*banda/i.test(d)) {
        return {
          categorie: 'Piese Stație de Sortare',
          subcategorie: /banda/i.test(d) ? 'Benzi Transportoare' : 'Utilaje Sortare',
          unitateMasura: 'buc',
        };
      }

      // 3. Anvelope & Camere
      const matchAnvelopaDim = descriere.match(/\b\d{2,3}\/\d{2,3}\s*R\s*\d{2}(?:\.5)?\b/i);
      if (matchAnvelopaDim || /anvelop|cauciuc|pneu/i.test(d) || cod.startsWith('ANV')) {
        const dim = matchAnvelopaDim ? matchAnvelopaDim[0].replace(/\s+/g, '') : 'Diverse Anvelope';
        return { categorie: 'Anvelope', subcategorie: dim, unitateMasura: 'buc' };
      }

      // 4. Sistem Frânare (Mecanică Frână - Evaluat înaintea fluidelor chimice pentru a nu confunda discurile/plăcuțele cu lichid de frână!)
      if (/placute|placuta|disc\s*frana|tambur|sabot|ferodo|etrier|camera\s*fran|cama\s*frana|supapa\s*frana|frana/i.test(d) && !/lichid|dot\s*[345]|ulei.*frana/i.test(d)) {
        if (/placut/i.test(d)) return { categorie: 'Sistem Frânare', subcategorie: 'Plăcuțe Frână', unitateMasura: 'set' };
        if (/disc/i.test(d)) return { categorie: 'Sistem Frânare', subcategorie: 'Discuri Frână', unitateMasura: 'buc' };
        if (/tambur|sabot|ferodo/i.test(d)) return { categorie: 'Sistem Frânare', subcategorie: 'Saboți & Tamburi Frână', unitateMasura: 'set' };
        if (/etrier|cilindru/i.test(d)) return { categorie: 'Sistem Frânare', subcategorie: 'Etrieri & Cilindri Frână', unitateMasura: 'buc' };
        return { categorie: 'Sistem Frânare', subcategorie: 'Componente Frânare', unitateMasura: 'buc' };
      }

      // 5. Filtre (evaluat înaintea fluidelor ca "Filtru ulei" / "Filtru hidraulic" să meargă la Filtre!)
      if (/filtr|cartus\s*filtr/i.test(d)) {
        if (/ulei/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Ulei Motor', unitateMasura: 'buc' };
        if (/aer/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Aer', unitateMasura: 'buc' };
        if (/combustibil|motorina|carburant/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Combustibil', unitateMasura: 'buc' };
        if (/hidraul/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Hidraulic', unitateMasura: 'buc' };
        if (/uscator|desiccant/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Uscător Aer', unitateMasura: 'buc' };
        if (/habitaclu|polen/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Habitaclu', unitateMasura: 'buc' };
        return { categorie: 'Filtre', subcategorie: 'Filtre Diverse', unitateMasura: 'buc' };
      }

      // 6. Uleiuri & Lubrifianți (strict fluide reale, excluzând senzori/vase/furtunuri/pompe)
      if (isActualFluidItem(descriere) && /ulei|oil|lubrifiant|unsoare|vaselin|10w40|15w40|5w30|5w40|hlp|tellus|rimula|spirax/i.test(d)) {
        if (/motor|10w40|15w40|5w30|5w40|rimula|ck-4/i.test(d)) {
          return { categorie: 'Uleiuri & Lubrifianți', subcategorie: 'Ulei Motor', unitateMasura: 'L' };
        }
        if (/hidraul|hlp|tellus|vg\s*46|vg\s*68/i.test(d)) {
          return { categorie: 'Uleiuri & Lubrifianți', subcategorie: 'Ulei Hidraulic', unitateMasura: 'L' };
        }
        if (/transmis|cutie|punte|80w90|75w90|75w80|spirax|atf/i.test(d)) {
          return { categorie: 'Uleiuri & Lubrifianți', subcategorie: 'Ulei Transmisie / Cutie', unitateMasura: 'L' };
        }
        if (/vaselin|unsoare|grease|gadus/i.test(d)) {
          return { categorie: 'Uleiuri & Lubrifianți', subcategorie: 'Vaselină Mecanică', unitateMasura: 'kg' };
        }
        return { categorie: 'Uleiuri & Lubrifianți', subcategorie: 'Alte Lubrifianți', unitateMasura: 'L' };
      }

      // 7. Antigel & Răcire
      if (isActualFluidItem(descriere) && /antigel|coolant|racire|g11|g12|g13|demineraliz/i.test(d)) {
        if (/g12|roz|organic/i.test(d)) {
          return { categorie: 'Antigel & Răcire', subcategorie: 'Antigel G12+ (Roz)', unitateMasura: 'L' };
        }
        if (/g11|albastru/i.test(d)) {
          return { categorie: 'Antigel & Răcire', subcategorie: 'Antigel G11 (Albastru)', unitateMasura: 'L' };
        }
        if (/apa|demineraliz/i.test(d)) {
          return { categorie: 'Antigel & Răcire', subcategorie: 'Apă Demineralizată', unitateMasura: 'L' };
        }
        return { categorie: 'Antigel & Răcire', subcategorie: 'Antigel Concentrat / Mixt', unitateMasura: 'L' };
      }

      // 8. AdBlue & Fluide Speciale (Exclusiv fluide chimice)
      if (isActualFluidItem(descriere) && /adblue|uree|lichid.*frana|dot\s*[345]|parbriz|spalare/i.test(d)) {
        if (/adblue|uree/i.test(d)) {
          return { categorie: 'AdBlue & Chimice', subcategorie: 'AdBlue (Soluție Uree)', unitateMasura: 'L' };
        }
        if (/lichid.*frana|dot\s*[345]/i.test(d)) {
          return { categorie: 'AdBlue & Chimice', subcategorie: 'Lichid Frână DOT 4', unitateMasura: 'L' };
        }
        if (/parbriz|spalare/i.test(d)) {
          return { categorie: 'AdBlue & Chimice', subcategorie: 'Lichid Spălare Parbriz', unitateMasura: 'L' };
        }
        return { categorie: 'AdBlue & Chimice', subcategorie: 'Fluide Speciale', unitateMasura: 'L' };
      }

      // 9. Piese Motor & Injecție
      if (/injector|piston|segment|camasa|supapa|chiulasa|vibrochen|arbore|biele|garnitura.*chiulasa/i.test(d)) {
        return {
          categorie: 'Piese Motor',
          subcategorie: /injector/i.test(d) ? 'Injectoare & Injecție' : 'Componente Motor',
          unitateMasura: 'buc',
        };
      }

      // 10. Piese Mecanice & Direcție & Rulmenți
      if (/pivot|bucsa|bara|amortizor|perna|curea|intinzator|rola|turbo|turbosuflanta|ambreiaj|rulment|pompa\s*apa|termostat|butuc|prezon|caseta/i.test(d)) {
        if (/amortizor|perna/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Suspensie & Amortizoare', unitateMasura: 'buc' };
        if (/pivot|bucsa|bara|caseta/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Articulații & Direcție', unitateMasura: 'buc' };
        if (/curea|intinzator|rola/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Curele & Transmisie Auxiliară', unitateMasura: 'buc' };
        if (/turbo|turbosufl/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Turbosuflante & Turbo', unitateMasura: 'buc' };
        if (/ambreiaj|volanta/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Kit Ambreiaj & Volantă', unitateMasura: 'buc' };
        if (/pompa\s*apa|termostat/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Pompă Apă & Termostat', unitateMasura: 'buc' };
        if (/rulment|butuc|prezon/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Butuci & Rulmenți Roată', unitateMasura: 'buc' };
        return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Piese Mecanice Generale', unitateMasura: 'buc' };
      }

      // 11. Electrice & Acumulatori
      if (/baterie|acumulator|alternator|electromotor|demaror|far|bec|led|lampa|senzor|cablu|releu|regulator.*tensiune/i.test(d)) {
        if (/baterie|acumulator/i.test(d)) return { categorie: 'Sisteme Electrice', subcategorie: 'Baterii & Acumulatori', unitateMasura: 'buc' };
        if (/alternator|electromotor|demaror|regulator/i.test(d)) return { categorie: 'Sisteme Electrice', subcategorie: 'Alternatoare & Demaroare', unitateMasura: 'buc' };
        if (/far|bec|led|lampa|stop|proiector/i.test(d)) return { categorie: 'Sisteme Electrice', subcategorie: 'Iluminare & Semnalizare', unitateMasura: 'buc' };
        return { categorie: 'Sisteme Electrice', subcategorie: 'Cablaje & Senzori', unitateMasura: 'buc' };
      }

      // 12. Consumabile & Atelier
      if (/spray|degresant|pasta|silicon|colier|surub|piulita|saiba|manusi/i.test(d)) {
        if (/spray|degresant|curatitor/i.test(d)) return { categorie: 'Consumabile & Feronerie', subcategorie: 'Spray-uri Tehnice & Curățare', unitateMasura: 'buc' };
        if (/colier|surub|piulita|saiba/i.test(d)) return { categorie: 'Consumabile & Feronerie', subcategorie: 'Organe de Asamblare & Coliere', unitateMasura: 'buc' };
        return { categorie: 'Consumabile & Feronerie', subcategorie: 'Consumabile Atelier', unitateMasura: 'buc' };
      }

      return { categorie: 'Alte Piese & Materiale', subcategorie: 'Diverse Piese Nespecificate', unitateMasura: 'buc' };
    };

    // 6. Agregare Piese, Manoperă, Anvelope & Fluide (Csere vs Potlas + Lebontás)
    let totalPiese = 0;
    let totalManopera = 0;
    let totalAnvelope = 0;
    let totalFluide = 0;
    let totalVolumFluideLitri = 0;
    let totalFluideCsereLitri = 0;
    let totalFluideCsereCost = 0;
    let totalFluidePotlasLitri = 0;
    let totalFluidePotlasCost = 0;

    const pieseConsumate: any[] = [];
    const anvelopeMontate: any[] = [];
    const comenziPrelucrate: any[] = [];
    const completariPrelucrate: any[] = [];

    // Mapare fluide pe tipuri
    const fluideTipuriMap: Record<string, {
      key: string;
      label: string;
      totalLitri: number;
      totalCost: number;
      csereLitri: number;
      csereCost: number;
      potlasLitri: number;
      potlasCost: number;
    }> = {
      ULEI_MOTOR: { key: 'ULEI_MOTOR', label: 'Ulei Motor', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
      ULEI_HIDRAULIC: { key: 'ULEI_HIDRAULIC', label: 'Ulei Hidraulic', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
      ULEI_TRANSMISIE: { key: 'ULEI_TRANSMISIE', label: 'Ulei Transmisie / Cutie', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
      ANTIGEL: { key: 'ANTIGEL', label: 'Antigel / Lichid Răcire', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
      VASELINA: { key: 'VASELINA', label: 'Vaselină / Unsoare', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
      ADBLUE: { key: 'ADBLUE', label: 'AdBlue', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
      ALTE: { key: 'ALTE', label: 'Alte Fluide', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
    };

    // Vehicule agregate
    const vehiculeMap: Record<string, {
      id: string;
      numarIntern: string;
      numarInmatriculare: string;
      marca: string;
      model: string;
      categorieEnum: string;
      costPiese: number;
      costManopera: number;
      costAnvelope: number;
      costFluide: number;
      costFluideCsere: number;
      costFluidePotlas: number;
      volumFluideLitri: number;
      volumCsereLitri: number;
      volumPotlasLitri: number;
      numarComenzi: number;
      numarAnvelope: number;
      totalCost: number;
    }> = {};

    vehicule.forEach((v) => {
      vehiculeMap[v.id] = {
        id: v.id,
        numarIntern: v.numarIntern || '',
        numarInmatriculare: v.numarInmatriculare || '',
        marca: v.marca || '',
        model: v.model || '',
        categorieEnum: v.categorieEnum || 'NESPECIFICAT',
        costPiese: 0,
        costManopera: 0,
        costAnvelope: 0,
        costFluide: 0,
        costFluideCsere: 0,
        costFluidePotlas: 0,
        volumFluideLitri: 0,
        volumCsereLitri: 0,
        volumPotlasLitri: 0,
        numarComenzi: 0,
        numarAnvelope: 0,
        totalCost: 0,
      };
    });

    // Harta evoluție lunară
    const evolutieMap: Record<string, { luna: string; piese: number; manopera: number; anvelope: number; fluide: number; total: number }> = {};
    const getLunaKey = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    // A. Prelucrare Anvelope montate din stoc (Harta Axe)
    permutariAnvelope.forEach((p) => {
      const cost = Number(p.anvelopa?.pretAchizitie || 0);
      totalAnvelope += cost;

      const lKey = getLunaKey(new Date(p.dataPermutare));
      if (!evolutieMap[lKey]) {
        evolutieMap[lKey] = { luna: lKey, piese: 0, manopera: 0, anvelope: 0, fluide: 0, total: 0 };
      }
      evolutieMap[lKey].anvelope += cost;
      evolutieMap[lKey].total += cost;

      if (vehiculeMap[p.vehiculId]) {
        vehiculeMap[p.vehiculId].costAnvelope += cost;
        vehiculeMap[p.vehiculId].numarAnvelope += 1;
        vehiculeMap[p.vehiculId].totalCost += cost;
      }

      anvelopeMontate.push({
        id: p.id,
        anvelopaId: p.anvelopaId,
        data: p.dataPermutare,
        vehiculId: p.vehiculId,
        vehicul: p.vehicul,
        serieAnvelopa: p.anvelopa?.serieAnvelopa || '-',
        marca: p.anvelopa?.marca || '-',
        model: p.anvelopa?.model || '-',
        dimensiune: p.anvelopa?.dimensiune || '-',
        codDot: p.anvelopa?.codDot || '-',
        pozitieAx: p.pozitieDestCod,
        pretAchizitie: Number(cost.toFixed(2)),
        valoareContor: p.valoareContor,
        operator: p.operator || 'Atelier',
        observatii: p.observatii,
        provenienta: 'Harta Axe (Montaj Nou din Stoc)',
      });
    });

    // B. Prelucrare Comenzi de Lucru & Elemente
    comenzi.forEach((c) => {
      let cmdPiese = 0;
      let cmdManopera = 0;
      let cmdAnvelope = 0;
      let cmdFluide = 0;
      const lKey = getLunaKey(new Date(c.dataDeschidere));

      if (!evolutieMap[lKey]) {
        evolutieMap[lKey] = { luna: lKey, piese: 0, manopera: 0, anvelope: 0, fluide: 0, total: 0 };
      }

      if (vehiculeMap[c.vehiculId]) {
        vehiculeMap[c.vehiculId].numarComenzi += 1;
      }

      c.elementeComanda.forEach((el) => {
        const cost = Number(el.costTotal || (el.cantitate * el.pretUnitar) || 0);
        const cant = Number(el.cantitate || 1);
        const isManopera = el.pilonCost === 'MANOPERA_INTERNA' || el.pilonCost === 'PRESTATIE_EXTERNA';
        const isAnvelopa = /\b(\d{2,3}\/\d{2,3}\s*R\s*\d{2}(?:\.5)?|anvelop|cauciuc|pneu)\b/i.test(el.descriere);
        const explicitTip = (el as any).tipLichid || el.articolStoc?.tipLichid || null;
        const isFluid = isActualFluidItem(
          el.descriere,
          el.categorie || el.articolStoc?.categorie,
          el.subcategorie || el.articolStoc?.subcategorie,
          explicitTip,
        );

        if (isManopera) {
          cmdManopera += cost;
          totalManopera += cost;
          evolutieMap[lKey].manopera += cost;
          evolutieMap[lKey].total += cost;
          if (vehiculeMap[c.vehiculId]) {
            vehiculeMap[c.vehiculId].costManopera += cost;
            vehiculeMap[c.vehiculId].totalCost += cost;
          }
        } else if (isAnvelopa) {
          cmdAnvelope += cost;
          totalAnvelope += cost;
          evolutieMap[lKey].anvelope += cost;
          evolutieMap[lKey].total += cost;
          if (vehiculeMap[c.vehiculId]) {
            vehiculeMap[c.vehiculId].costAnvelope += cost;
            if (cost >= 0) vehiculeMap[c.vehiculId].numarAnvelope += cant;
            vehiculeMap[c.vehiculId].totalCost += cost;
          }
          anvelopeMontate.push({
            id: el.id,
            anvelopaId: null,
            data: c.dataDeschidere,
            vehiculId: c.vehiculId,
            vehicul: c.vehicul,
            serieAnvelopa: el.serieUnicaPiesa || '-',
            marca: el.descriere,
            model: el.articolStoc?.denumire || '-',
            dimensiune: '-',
            codDot: '-',
            pozitieAx: 'Montaj Comandă Lucru',
            pretAchizitie: Number(cost.toFixed(2)),
            valoareContor: c.valoareContorLaExecutie,
            operator: c.mecanicResponsabil || 'Atelier',
            observatii: el.descriere,
            provenienta: `Comandă Lucru ${c.numarComanda}`,
          });
        } else if (isFluid) {
          // Ulei / Fluid consumat pe comanda de lucru (volum real în litri)
          const fluidLiters = cost >= 0 ? computeElementFluidLiters(el) : 0;
          const isTopUpCmd = /completare|top[- ]?up/i.test(`${el.descriere || ''} ${el.observatiiIntern || ''}`) && !/schimb|revizie/i.test(`${el.descriere || ''} ${el.observatiiIntern || ''}`);
          cmdFluide += cost;
          totalFluide += cost;
          if (cost >= 0) {
            totalVolumFluideLitri += fluidLiters;
            if (isTopUpCmd) totalFluidePotlasLitri += fluidLiters;
            else totalFluideCsereLitri += fluidLiters;
          }
          if (isTopUpCmd) totalFluidePotlasCost += cost;
          else totalFluideCsereCost += cost;

          const catInfo = mapFluidCategory(
            el.descriere,
            detectTipLichidFromText(
              el.descriere,
              el.categorie || el.articolStoc?.categorie,
              el.subcategorie || el.articolStoc?.subcategorie,
              'ULEI_MOTOR',
              explicitTip,
            ),
          );
          if (fluideTipuriMap[catInfo.key]) {
            if (cost >= 0) {
              fluideTipuriMap[catInfo.key].totalLitri += fluidLiters;
              if (isTopUpCmd) fluideTipuriMap[catInfo.key].potlasLitri += fluidLiters;
              else fluideTipuriMap[catInfo.key].csereLitri += fluidLiters;
            }
            fluideTipuriMap[catInfo.key].totalCost += cost;
            if (isTopUpCmd) fluideTipuriMap[catInfo.key].potlasCost += cost;
            else fluideTipuriMap[catInfo.key].csereCost += cost;
          }

          evolutieMap[lKey].fluide += cost;
          evolutieMap[lKey].total += cost;

          if (vehiculeMap[c.vehiculId]) {
            vehiculeMap[c.vehiculId].costFluide += cost;
            if (isTopUpCmd) vehiculeMap[c.vehiculId].costFluidePotlas += cost;
            else vehiculeMap[c.vehiculId].costFluideCsere += cost;
            if (cost >= 0) {
              vehiculeMap[c.vehiculId].volumFluideLitri += fluidLiters;
              if (isTopUpCmd) vehiculeMap[c.vehiculId].volumPotlasLitri += fluidLiters;
              else vehiculeMap[c.vehiculId].volumCsereLitri += fluidLiters;
            }
            vehiculeMap[c.vehiculId].totalCost += cost;
          }

          completariPrelucrate.push({
            id: el.id,
            vehiculId: c.vehiculId,
            vehicul: c.vehicul,
            tipLichid: catInfo.key,
            tipOperatiune: isTopUpCmd ? 'COMPLETARE_ULEI' : 'SCHIMB_ULEI',
            marcaUlei: el.descriere,
            cantitateLitri: fluidLiters,
            pretPerLitru: fluidLiters > 0 ? Number((cost / fluidLiters).toFixed(2)) : Number(el.pretUnitar || 0),
            costTotal: Number(cost.toFixed(2)),
            valoareContor: c.valoareContorLaExecutie,
            dataCompletare: c.dataDeschidere,
            mecanic: c.mecanicResponsabil || 'Atelier',
            observatii: `Revizie / Comanda ${c.numarComanda}`,
            alertaScurgereGenerata: false,
            articolStocId: el.articolStocId,
            articolDenumire: el.articolStoc?.denumire || el.descriere,
            articolCod: el.articolStoc?.codArticol || null,
            provenienta: `Comandă Lucru ${c.numarComanda}`,
          });
        } else {
          // Piesă normală
          cmdPiese += cost;
          totalPiese += cost;
          evolutieMap[lKey].piese += cost;
          evolutieMap[lKey].total += cost;

          if (vehiculeMap[c.vehiculId]) {
            vehiculeMap[c.vehiculId].costPiese += cost;
            vehiculeMap[c.vehiculId].totalCost += cost;
          }

          pieseConsumate.push({
            id: el.id,
            comandaLucruId: c.id,
            numarComanda: c.numarComanda,
            data: c.dataDeschidere,
            vehicul: c.vehicul,
            pilonCost: el.pilonCost,
            descriere: el.descriere,
            cantitate: el.cantitate,
            pretUnitar: el.pretUnitar,
            costTotal: Number(cost.toFixed(2)),
            provenienta: el.provenienta,
            articolStocId: el.articolStocId,
            articolDenumire: el.articolStoc?.denumire || null,
            articolCod: el.articolStoc?.codArticol || null,
            furnizor: el.furnizor,
            numarFactura: el.numarFactura,
          });
        }
      });

      const cmdTotal = cmdPiese + cmdManopera + cmdAnvelope + cmdFluide;
      comenziPrelucrate.push({
        id: c.id,
        numarComanda: c.numarComanda,
        dataDeschidere: c.dataDeschidere,
        dataFinalizare: c.dataFinalizare,
        stare: c.stare,
        mecanicResponsabil: c.mecanicResponsabil,
        valoareContorLaExecutie: c.valoareContorLaExecutie,
        observatii: c.observatii,
        vehicul: c.vehicul,
        costPiese: Number(cmdPiese.toFixed(2)),
        costManopera: Number(cmdManopera.toFixed(2)),
        costAnvelope: Number(cmdAnvelope.toFixed(2)),
        costFluide: Number(cmdFluide.toFixed(2)),
        costTotal: Number(cmdTotal.toFixed(2)),
        elementeCount: c.elementeComanda.length,
        elemente: c.elementeComanda,
      });
    });

    // C. Prelucrare Completări / Schimburi Fluide directe (excludem intrările deja numărate din ComenziLucru!)
    completari.forEach((f) => {
      if (f.comandaLucruId) return;
      const cost = Number(f.costTotal || (f.cantitateLitri * f.pretPerLitru) || 0);
      const litri = Number(f.cantitateLitri || 0);
      const isCsere = f.tipOperatiune && f.tipOperatiune.toUpperCase().includes('SCHIMB');

      totalFluide += cost;
      totalVolumFluideLitri += litri;

      if (isCsere) {
        totalFluideCsereLitri += litri;
        totalFluideCsereCost += cost;
      } else {
        totalFluidePotlasLitri += litri;
        totalFluidePotlasCost += cost;
      }

      const catInfo = mapFluidCategory(f.marcaUlei || f.articolStoc?.denumire || '', f.tipLichid);
      if (fluideTipuriMap[catInfo.key]) {
        fluideTipuriMap[catInfo.key].totalLitri += litri;
        fluideTipuriMap[catInfo.key].totalCost += cost;
        if (isCsere) {
          fluideTipuriMap[catInfo.key].csereLitri += litri;
          fluideTipuriMap[catInfo.key].csereCost += cost;
        } else {
          fluideTipuriMap[catInfo.key].potlasLitri += litri;
          fluideTipuriMap[catInfo.key].potlasCost += cost;
        }
      }

      const lKey = getLunaKey(new Date(f.dataCompletare));
      if (!evolutieMap[lKey]) {
        evolutieMap[lKey] = { luna: lKey, piese: 0, manopera: 0, anvelope: 0, fluide: 0, total: 0 };
      }
      evolutieMap[lKey].fluide += cost;
      evolutieMap[lKey].total += cost;

      if (vehiculeMap[f.vehiculId]) {
        vehiculeMap[f.vehiculId].costFluide += cost;
        vehiculeMap[f.vehiculId].volumFluideLitri += litri;
        if (isCsere) {
          vehiculeMap[f.vehiculId].costFluideCsere += cost;
          vehiculeMap[f.vehiculId].volumCsereLitri += litri;
        } else {
          vehiculeMap[f.vehiculId].costFluidePotlas += cost;
          vehiculeMap[f.vehiculId].volumPotlasLitri += litri;
        }
        vehiculeMap[f.vehiculId].totalCost += cost;
      }

      completariPrelucrate.push({
        id: f.id,
        vehiculId: f.vehiculId,
        vehicul: f.vehicul,
        tipLichid: f.tipLichid,
        tipOperatiune: f.tipOperatiune,
        marcaUlei: f.marcaUlei,
        cantitateLitri: litri,
        pretPerLitru: f.pretPerLitru,
        costTotal: Number(cost.toFixed(2)),
        valoareContor: f.valoareContor,
        dataCompletare: f.dataCompletare,
        mecanic: f.mecanic,
        observatii: f.observatii,
        alertaScurgereGenerata: f.alertaScurgereGenerata,
        articolStocId: f.articolStocId,
        articolDenumire: f.articolStoc?.denumire || null,
        articolCod: f.articolStoc?.codArticol || null,
        provenienta: 'Meniu Fluide (Completare / Schimb)',
      });
    });

    const totalGeneral = Number((totalPiese + totalManopera + totalAnvelope + totalFluide).toFixed(2));

    // D. Statistici categorii vehicule
    const categoriiMap: Record<string, {
      categorie: string;
      numarVehicule: number;
      totalCost: number;
      costPiese: number;
      costManopera: number;
      costAnvelope: number;
      costFluide: number;
      costFluideCsere: number;
      costFluidePotlas: number;
      volumFluideLitri: number;
    }> = {};

    Object.values(vehiculeMap).forEach((v) => {
      const c = v.categorieEnum || 'ALTELE';
      if (!categoriiMap[c]) {
        categoriiMap[c] = {
          categorie: c,
          numarVehicule: 0,
          totalCost: 0,
          costPiese: 0,
          costManopera: 0,
          costAnvelope: 0,
          costFluide: 0,
          costFluideCsere: 0,
          costFluidePotlas: 0,
          volumFluideLitri: 0,
        };
      }
      categoriiMap[c].numarVehicule += 1;
      categoriiMap[c].totalCost += v.totalCost;
      categoriiMap[c].costPiese += v.costPiese;
      categoriiMap[c].costManopera += v.costManopera;
      categoriiMap[c].costAnvelope += v.costAnvelope;
      categoriiMap[c].costFluide += v.costFluide;
      categoriiMap[c].costFluideCsere += v.costFluideCsere;
      categoriiMap[c].costFluidePotlas += v.costFluidePotlas;
      categoriiMap[c].volumFluideLitri += v.volumFluideLitri;
    });

    const statisticiCategorii = Object.values(categoriiMap)
      .map((cat) => ({
        ...cat,
        totalCost: Number(cat.totalCost.toFixed(2)),
        costPiese: Number(cat.costPiese.toFixed(2)),
        costManopera: Number(cat.costManopera.toFixed(2)),
        costAnvelope: Number(cat.costAnvelope.toFixed(2)),
        costFluide: Number(cat.costFluide.toFixed(2)),
        costFluideCsere: Number(cat.costFluideCsere.toFixed(2)),
        costFluidePotlas: Number(cat.costFluidePotlas.toFixed(2)),
        volumFluideLitri: Number(cat.volumFluideLitri.toFixed(1)),
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    const statisticiVehicule = Object.values(vehiculeMap)
      .map((v) => ({
        ...v,
        totalCost: Number(v.totalCost.toFixed(2)),
        costPiese: Number(v.costPiese.toFixed(2)),
        costManopera: Number(v.costManopera.toFixed(2)),
        costAnvelope: Number(v.costAnvelope.toFixed(2)),
        costFluide: Number(v.costFluide.toFixed(2)),
        costFluideCsere: Number(v.costFluideCsere.toFixed(2)),
        costFluidePotlas: Number(v.costFluidePotlas.toFixed(2)),
        volumFluideLitri: Number(v.volumFluideLitri.toFixed(1)),
        volumCsereLitri: Number(v.volumCsereLitri.toFixed(1)),
        volumPotlasLitri: Number(v.volumPotlasLitri.toFixed(1)),
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // E. Formatare listă fluide pe tipuri
    const fluidePeTipuri = Object.values(fluideTipuriMap)
      .map((t) => ({
        ...t,
        totalLitri: Number(t.totalLitri.toFixed(1)),
        totalCost: Number(t.totalCost.toFixed(2)),
        csereLitri: Number(t.csereLitri.toFixed(1)),
        csereCost: Number(t.csereCost.toFixed(2)),
        potlasLitri: Number(t.potlasLitri.toFixed(1)),
        potlasCost: Number(t.potlasCost.toFixed(2)),
        pretMediuPerLitru: t.totalLitri > 0 ? Number((t.totalCost / t.totalLitri).toFixed(2)) : 0,
      }))
      .filter((t) => t.totalLitri > 0 || t.totalCost > 0);

    // Sortare evoluție lunară cronologic
    const evolutieLunara = Object.values(evolutieMap).sort((a, b) => a.luna.localeCompare(b.luna));

    // F. Raport 1: Fajlagos Költség Riport / Cost Unitar & Eficiență Exploatare
    // Mapare contor per vehicul
    const contorPerVehicul: Record<string, number[]> = {};
    istoContoare.forEach((c) => {
      if (!contorPerVehicul[c.vehiculId]) contorPerVehicul[c.vehiculId] = [];
      contorPerVehicul[c.vehiculId].push(c.valoareContor);
    });
    comenziPrelucrate.forEach((c) => {
      if (c.valoareContorLaExecutie && c.valoareContorLaExecutie > 0) {
        if (!contorPerVehicul[c.vehicul.id]) contorPerVehicul[c.vehicul.id] = [];
        contorPerVehicul[c.vehicul.id].push(c.valoareContorLaExecutie);
      }
    });
    completariPrelucrate.forEach((f) => {
      if (f.valoareContor && f.valoareContor > 0) {
        if (!contorPerVehicul[f.vehiculId]) contorPerVehicul[f.vehiculId] = [];
        contorPerVehicul[f.vehiculId].push(f.valoareContor);
      }
    });

    const eficientaCostUnitar = vehicule.map((v) => {
      const vCost = vehiculeMap[v.id] || { totalCost: 0, costPiese: 0, costManopera: 0, costAnvelope: 0, costFluide: 0 };
      const puncte = (contorPerVehicul[v.id] || []).filter((val) => typeof val === 'number' && !isNaN(val) && val > 0);
      
      let deltaRulaj = 0;
      let minContor = 0;
      let maxContor = v.valoareContorCurent || 0;

      if (puncte.length >= 2) {
        minContor = Math.min(...puncte);
        maxContor = Math.max(...puncte);
        deltaRulaj = Math.max(0, maxContor - minContor);
      } else if (puncte.length === 1) {
        minContor = puncte[0];
        deltaRulaj = Math.max(0, (v.valoareContorCurent || 0) - minContor);
      } else {
        minContor = v.valoareContorInitial || 0;
        deltaRulaj = Math.max(0, (v.valoareContorCurent || 0) - (v.valoareContorInitial || 0));
      }

      const isKm = v.tipMasurare === 'KM';
      const costTotal = vCost.totalCost || 0;

      let costPer100Km: number | null = null;
      let costPerKm: number | null = null;
      let costPerOra: number | null = null;
      let statusEficienta = 'FARA_RULAJ';

      if (deltaRulaj > 0) {
        if (isKm) {
          costPer100Km = Number(((costTotal / deltaRulaj) * 100).toFixed(2));
          costPerKm = Number((costTotal / deltaRulaj).toFixed(3));
          if (costPer100Km < 35) statusEficienta = 'OPTIM';
          else if (costPer100Km <= 85) statusEficienta = 'MODERAT';
          else statusEficienta = 'RIDICAT';
        } else {
          costPerOra = Number((costTotal / deltaRulaj).toFixed(2));
          if (costPerOra < 30) statusEficienta = 'OPTIM';
          else if (costPerOra <= 75) statusEficienta = 'MODERAT';
          else statusEficienta = 'RIDICAT';
        }
      }

      return {
        vehiculId: v.id,
        numarIntern: v.numarIntern,
        numarInmatriculare: v.numarInmatriculare,
        marca: v.marca,
        model: v.model,
        categorieEnum: v.categorieEnum,
        tipMasurare: v.tipMasurare,
        contorStart: minContor,
        contorEnd: maxContor,
        deltaRulaj: Math.round(deltaRulaj),
        costTotal: Number(costTotal.toFixed(2)),
        costPiese: Number((vCost.costPiese || 0).toFixed(2)),
        costManopera: Number((vCost.costManopera || 0).toFixed(2)),
        costAnvelope: Number((vCost.costAnvelope || 0).toFixed(2)),
        costFluide: Number((vCost.costFluide || 0).toFixed(2)),
        costPer100Km,
        costPerKm,
        costPerOra,
        statusEficienta,
      };
    }).sort((a, b) => b.costTotal - a.costTotal);

    // G. Raport 2: Consum Excesiv de Ulei & Scurgeri
    const analizaConsumUlei = vehicule.map((v) => {
      const vStat = vehiculeMap[v.id] || { volumPotlasLitri: 0, costFluidePotlas: 0, volumCsereLitri: 0, costFluideCsere: 0 };
      const operatiuniVehicul = completariPrelucrate.filter((f) => f.vehiculId === v.id);
      const completariTopup = operatiuniVehicul.filter((f) => !f.tipOperatiune?.toUpperCase().includes('SCHIMB'));
      const alerteScurgere = operatiuniVehicul.filter((f) => f.alertaScurgereGenerata);

      const ef = eficientaCostUnitar.find((e) => e.vehiculId === v.id);
      const deltaRulaj = ef ? ef.deltaRulaj : 0;
      const isKm = v.tipMasurare === 'KM';

      let rataConsumPer1000Km: number | null = null;
      let rataConsumPer100Ore: number | null = null;
      let statusConsum = 'NORMAL';

      if (vStat.volumPotlasLitri > 0 && deltaRulaj > 0) {
        if (isKm) {
          rataConsumPer1000Km = Number(((vStat.volumPotlasLitri / deltaRulaj) * 1000).toFixed(2));
          if (rataConsumPer1000Km >= 1.0 || alerteScurgere.length > 0) statusConsum = 'CRITIC';
          else if (rataConsumPer1000Km >= 0.45) statusConsum = 'ATENTIE';
          else statusConsum = 'NORMAL';
        } else {
          rataConsumPer100Ore = Number(((vStat.volumPotlasLitri / deltaRulaj) * 100).toFixed(2));
          if (rataConsumPer100Ore >= 1.5 || alerteScurgere.length > 0) statusConsum = 'CRITIC';
          else if (rataConsumPer100Ore >= 0.75) statusConsum = 'ATENTIE';
          else statusConsum = 'NORMAL';
        }
      } else if (alerteScurgere.length > 0) {
        statusConsum = 'CRITIC';
      }

      return {
        vehiculId: v.id,
        numarIntern: v.numarIntern,
        numarInmatriculare: v.numarInmatriculare,
        marca: v.marca,
        model: v.model,
        categorieEnum: v.categorieEnum,
        tipMasurare: v.tipMasurare,
        deltaRulaj,
        litriPotlas: Number(vStat.volumPotlasLitri.toFixed(1)),
        costPotlas: Number(vStat.costFluidePotlas.toFixed(2)),
        litriCsere: Number(vStat.volumCsereLitri.toFixed(1)),
        costCsere: Number(vStat.costFluideCsere.toFixed(2)),
        numarCompletari: completariTopup.length,
        numarAlerteScurgeri: alerteScurgere.length,
        rataConsumPer1000Km,
        rataConsumPer100Ore,
        statusConsum,
        completariRecente: completariTopup.slice(0, 5),
      };
    }).sort((a, b) => {
      // Prioritizează CRITIC și ATENȚIE, apoi litri completați descrescător
      const score = (s: string) => (s === 'CRITIC' ? 3 : s === 'ATENTIE' ? 2 : 1);
      if (score(b.statusConsum) !== score(a.statusConsum)) {
        return score(b.statusConsum) - score(a.statusConsum);
      }
      return b.litriPotlas - a.litriPotlas;
    });

    // H. Raport 3: Achiziții Furnizori ANAF e-Factura & Piese Procesate (Exclusiv intrate în stoc sau montate direct pe vehicule)
    const furnizoriMap: Record<string, {
      cif: string;
      nume: string;
      numarFacturi: number;
      valoareTotalaRON: number;
      valoareFaraTVARON: number;
      facturi: any[];
    }> = {};

    let totalGeneralFacturiRON = 0;
    let totalGeneralFacturiFaraTVARON = 0;

    const isDistributedIntoTarget = (obs?: string | null): boolean => {
      if (!obs) return false;
      return obs.startsWith('Repartizat pe ') || obs.startsWith('Reducere aplicată pe ');
    };

    facturiEFactura.forEach((f) => {
      const cif = (f.cifVanzator || '').replace(/^RO/i, '').trim();
      const nume = f.numeVanzator || 'Furnizor Necunoscut';
      const key = cif || nume;
      if (!furnizoriMap[key]) {
        furnizoriMap[key] = {
          cif: f.cifVanzator || '-',
          nume,
          numarFacturi: 0,
          valoareTotalaRON: 0,
          valoareFaraTVARON: 0,
          facturi: [],
        };
      }

      // Sume calculate strict pe baza articolelor procesate (evitând dublarea liniilor deja repartizate pe piese)
      let factCuTVA = 0;
      let factFaraTVA = 0;
      (f.articole || []).forEach((item) => {
        if (isDistributedIntoTarget(item.observatiiIntern)) return;
        const cant = Number(item.cantitate || 1);
        const pretUnit = Number(item.pretUnitar || 0);
        let vFara = Number(item.valoareFaraTVA || 0);
        if (vFara === 0 && pretUnit !== 0) vFara = Number((cant * pretUnit).toFixed(2));
        const hasTva = item.valoareTVA !== null && item.valoareTVA !== undefined;
        let vCu = Number((hasTva ? (vFara + Number(item.valoareTVA)) : (vFara * (1 + Number(item.cotaTVA ?? 19) / 100))).toFixed(2));
        factCuTVA += vCu;
        factFaraTVA += vFara;
      });

      if (factCuTVA !== 0 || factFaraTVA !== 0) {
        furnizoriMap[key].numarFacturi += 1;
        furnizoriMap[key].valoareTotalaRON += factCuTVA;
        furnizoriMap[key].valoareFaraTVARON += factFaraTVA;
        totalGeneralFacturiRON += factCuTVA;
        totalGeneralFacturiFaraTVARON += factFaraTVA;
        if (furnizoriMap[key].facturi.length < 10) {
          furnizoriMap[key].facturi.push({
            numarFactura: f.numarFactura,
            dataFactura: f.dataFactura,
            valoareTotala: Number(factCuTVA.toFixed(2)),
            valoareFaraTVA: Number(factFaraTVA.toFixed(2)),
            stare: f.stare,
            numarArticoleProcesate: f.articole.length,
          });
        }
      }
    });

    const achizitiiFurnizori = Object.values(furnizoriMap)
      .map((fn) => ({
        cif: fn.cif,
        nume: fn.nume,
        numarFacturi: fn.numarFacturi,
        valoareTotalaRON: Number(fn.valoareTotalaRON.toFixed(2)),
        valoareFaraTVARON: Number(fn.valoareFaraTVARON.toFixed(2)),
        procentDinTotal: totalGeneralFacturiRON > 0 ? Number(((fn.valoareTotalaRON / totalGeneralFacturiRON) * 100).toFixed(1)) : 0,
        facturiRecente: fn.facturi,
      }))
      .sort((a, b) => b.valoareTotalaRON - a.valoareTotalaRON);

    // H2. Raport Achiziții: Categorii & Destinație (Depozite vs Direct pe Utilaje)
    const categoriiAchizitiiMap: Record<string, {
      categorie: string;
      valoareTotalaRON: number;
      valoareFaraTVARON: number;
      cantitateTotala: number;
      numarPozitii: number;
      facturiSet: Set<string>;
      furnizoriSet: Record<string, number>;
      subcategoriiMap: Record<string, {
        subcategorie: string;
        valoareTotalaRON: number;
        valoareFaraTVARON: number;
        cantitateTotala: number;
        unitateMasura: string;
        numarPozitii: number;
        articoleRecente: any[];
      }>;
    }> = {};

    let totalCategoriiRON = 0;
    let totalCategoriiFaraTVARON = 0;
    let totalInStocRON = 0;
    let totalInStocFaraTVARON = 0;
    let totalDirectVehiculeRON = 0;
    let totalDirectVehiculeFaraTVARON = 0;
    let totalLiniiPozitii = 0;

    facturiEFactura.forEach((f) => {
      const furnizor = f.numeVanzator || 'Furnizor Necunoscut';
      const items = f.articole || [];

      items.forEach((item) => {
        if (isDistributedIntoTarget(item.observatiiIntern)) return;
        const cant = Number(item.cantitate || 1);
        const pretUnit = Number(item.pretUnitar || 0);
        let vFaraTVA = Number(item.valoareFaraTVA || 0);
        if (vFaraTVA === 0 && pretUnit !== 0) {
          vFaraTVA = Number((cant * pretUnit).toFixed(2));
        }
        const hasTva = item.valoareTVA !== null && item.valoareTVA !== undefined;
        let vCuTVA = Number((hasTva ? (vFaraTVA + Number(item.valoareTVA)) : (vFaraTVA * (1 + Number(item.cotaTVA ?? 19) / 100))).toFixed(2));

        const linkedArticol = item.articolStocId ? articoleStocMap.get(item.articolStocId) : null;
        const cl = item.comandaLucruId ? comenziDirecteMap.get(item.comandaLucruId) : null;

        // Filtru opțional de vehicul dacă a fost selectat unul specific
        if (vehiculIds.length === 1 && (query.vehiculId && query.vehiculId !== 'ALL')) {
          if (cl && cl.vehiculId !== vehiculIds[0]) return;
        }

        let destinatie: 'DEPOZIT' | 'DIRECT_VEHICUL' = 'DEPOZIT';
        let destinatieNume = 'Depozit Central Atelier';
        let vehiculNumar: string | null = null;
        let vehiculCategorie: string | null = null;
        let depozitNume: string | null = null;

        if (cl && cl.vehicul) {
          destinatie = 'DIRECT_VEHICUL';
          vehiculNumar = cl.vehicul.numarInmatriculare;
          vehiculCategorie = cl.vehicul.categorieEnum;
          destinatieNume = `Montat pe ${vehiculNumar} (${vehiculCategorie})`;
          totalDirectVehiculeRON += vCuTVA;
          totalDirectVehiculeFaraTVARON += vFaraTVA;
        } else {
          destinatie = 'DEPOZIT';
          depozitNume = linkedArticol?.depozit?.nume || 'Depozit Central Atelier';
          destinatieNume = `În Depozit: ${depozitNume}`;
          totalInStocRON += vCuTVA;
          totalInStocFaraTVARON += vFaraTVA;
        }

        // Mapare categorie
        let catName = 'Alte Piese & Materiale';
        let subName = 'Diverse';

        if (linkedArticol && linkedArticol.categorie && linkedArticol.categorie.toUpperCase() !== 'PIESE_AUTO') {
          catName = linkedArticol.categorie.trim();
          if (catName.toLowerCase() === 'piese statie de sortare') catName = 'Piese Stație de Sortare';
          subName = linkedArticol.subcategorie?.trim() || 'General';
        } else if (vFaraTVA < 0) {
          catName = 'Reduceri & Storno';
          subName = cl ? 'Reduceri aplicate pe Vehicule' : 'Reduceri Comerciale Furnizori';
        } else {
          const mapped = categorizeInvoiceItem(item.descrierePiesa, item.codArticolFurnizor, linkedArticol);
          catName = mapped.categorie;
          subName = mapped.subcategorie;
        }

        const um = item.unitateMasura || linkedArticol?.unitateMasura || 'buc';

        if (!categoriiAchizitiiMap[catName]) {
          categoriiAchizitiiMap[catName] = {
            categorie: catName,
            valoareTotalaRON: 0,
            valoareFaraTVARON: 0,
            cantitateTotala: 0,
            numarPozitii: 0,
            facturiSet: new Set(),
            furnizoriSet: {},
            subcategoriiMap: {},
          };
        }
        const cObj = categoriiAchizitiiMap[catName];
        cObj.valoareTotalaRON += vCuTVA;
        cObj.valoareFaraTVARON += vFaraTVA;
        cObj.cantitateTotala += cant;
        cObj.numarPozitii += 1;
        cObj.facturiSet.add(f.numarFactura);
        cObj.furnizoriSet[furnizor] = (cObj.furnizoriSet[furnizor] || 0) + vCuTVA;

        if (!cObj.subcategoriiMap[subName]) {
          cObj.subcategoriiMap[subName] = {
            subcategorie: subName,
            valoareTotalaRON: 0,
            valoareFaraTVARON: 0,
            cantitateTotala: 0,
            unitateMasura: um,
            numarPozitii: 0,
            articoleRecente: [],
          };
        }
        const sObj = cObj.subcategoriiMap[subName];
        sObj.valoareTotalaRON += vCuTVA;
        sObj.valoareFaraTVARON += vFaraTVA;
        sObj.cantitateTotala += cant;
        sObj.numarPozitii += 1;
        if (sObj.articoleRecente.length < 50) {
          sObj.articoleRecente.push({
            id: item.id,
            descriere: item.descrierePiesa,
            codArticol: item.codArticolFurnizor || linkedArticol?.codArticol || '-',
            furnizor,
            numarFactura: f.numarFactura,
            dataFactura: f.dataFactura,
            cantitate: cant,
            unitateMasura: um,
            pretUnitar: pretUnit,
            valoareFaraTVA: vFaraTVA,
            valoareTotala: vCuTVA,
            stare: item.stare,
            destinatie,
            destinatieNume,
            vehiculNumar,
            vehiculCategorie,
            depozitNume,
            numarComanda: cl?.numarComanda || null,
          });
        }

        totalCategoriiRON += vCuTVA;
        totalCategoriiFaraTVARON += vFaraTVA;
        totalLiniiPozitii += 1;
      });
    });

    const achizitiiCategorii = Object.values(categoriiAchizitiiMap)
      .map((cat) => {
        const catRON = Number(cat.valoareTotalaRON.toFixed(2));
        const catFaraTVARON = Number(cat.valoareFaraTVARON.toFixed(2));
        const procentDinTotal = totalCategoriiRON > 0 ? Number(((catRON / totalCategoriiRON) * 100).toFixed(1)) : 0;

        const subcategorii = Object.values(cat.subcategoriiMap)
          .map((sub) => {
            const subRON = Number(sub.valoareTotalaRON.toFixed(2));
            const subFaraTVARON = Number(sub.valoareFaraTVARON.toFixed(2));
            const procentDinCategorie = catRON > 0 ? Number(((subRON / catRON) * 100).toFixed(1)) : 0;
            const procentSubDinTotal = totalCategoriiRON > 0 ? Number(((subRON / totalCategoriiRON) * 100).toFixed(1)) : 0;

            return {
              subcategorie: sub.subcategorie,
              cantitateTotala: Number(sub.cantitateTotala.toFixed(1)),
              unitateMasura: sub.unitateMasura,
              numarPozitii: sub.numarPozitii,
              valoareTotalaRON: subRON,
              valoareFaraTVARON: subFaraTVARON,
              procentDinCategorie,
              procentDinTotal: procentSubDinTotal,
              articoleRecente: sub.articoleRecente,
            };
          })
          .sort((a, b) => b.valoareTotalaRON - a.valoareTotalaRON);

        const furnizoriPrincipali = Object.entries(cat.furnizoriSet)
          .map(([nume, val]) => ({ nume, valoareRON: Number(val.toFixed(2)) }))
          .sort((a, b) => b.valoareRON - a.valoareRON)
          .slice(0, 3);

        return {
          categorie: cat.categorie,
          valoareTotalaRON: catRON,
          valoareFaraTVARON: catFaraTVARON,
          cantitateTotala: Number(cat.cantitateTotala.toFixed(1)),
          numarPozitii: cat.numarPozitii,
          numarFacturi: cat.facturiSet.size,
          procentDinTotal,
          furnizoriPrincipali,
          subcategorii,
        };
      })
      .sort((a, b) => b.valoareTotalaRON - a.valoareTotalaRON);

    const numarSubcategorii = achizitiiCategorii.reduce((acc, c) => acc + c.subcategorii.length, 0);

    // I. Raport 4: Scadențar Mentenanță & Documente (Următoarele 30-60 Zile)
    const now = new Date();
    const documenteScadente = documenteVehicule
      .map((d) => {
        const expDate = new Date(d.dataExpirare);
        const zileRamase = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let status = 'NORMAL';
        if (zileRamase < 0) status = 'EXPIRAT';
        else if (zileRamase <= 15) status = 'CRITIC';
        else if (zileRamase <= 30) status = 'URGENT';
        else if (zileRamase <= 60) status = 'ATENTIE';

        return {
          id: d.id,
          vehiculId: d.vehiculId,
          vehicul: d.vehicul,
          tipDocument: d.tipDocument,
          serieDocument: d.serieDocument || '-',
          emitent: d.emitent || '-',
          cost: d.cost || 0,
          dataExpirare: d.dataExpirare,
          zileRamase,
          status,
        };
      })
      .filter((d) => d.zileRamase <= 60)
      .sort((a, b) => a.zileRamase - b.zileRamase);

    // Revizii și schimburi ulei preconizate
    const reviziiPreconizate: any[] = [];
    configurariUlei.forEach((cfg) => {
      if (!cfg.vehicul) return;
      const currentContor = cfg.vehicul.valoareContorCurent || 0;
      const lastContor = cfg.ultimulSchimbContor || 0;
      const isKm = cfg.vehicul.tipMasurare === 'KM';
      const interval = isKm ? (cfg.intervalKm || 30000) : (cfg.intervalMth || 500);
      const nextDue = lastContor + interval;
      const ramase = nextDue - currentContor;
      const pragAvertizare = isKm ? (cfg.pragAvertizareKm || 2500) : (cfg.pragAvertizareMth || 50);

      if (ramase <= pragAvertizare) {
        reviziiPreconizate.push({
          vehiculId: cfg.vehicul.id,
          vehicul: cfg.vehicul,
          tipLichid: cfg.tipLichid,
          interval,
          ultimulSchimbContor: lastContor,
          contorCurent: currentContor,
          contorScadent: nextDue,
          unitate: cfg.vehicul.tipMasurare,
          ramase,
          status: ramase <= 0 ? 'DEPASIT' : (ramase <= pragAvertizare / 2 ? 'CRITIC' : 'ATENTIE'),
        });
      }
    });
    reviziiPreconizate.sort((a, b) => a.ramase - b.ramase);

    return {
      filtru: {
        vehiculId: query.vehiculId || 'TOATE',
        categorie: query.categorie || 'TOATE',
        dataStart: query.dataStart || null,
        dataEnd: query.dataEnd || null,
      },
      totale: {
        totalGeneral,
        totalPiese: Number(totalPiese.toFixed(2)),
        totalManopera: Number(totalManopera.toFixed(2)),
        totalAnvelope: Number(totalAnvelope.toFixed(2)),
        totalAnvelopeBuc: anvelopeMontate.length,
        totalFluide: Number(totalFluide.toFixed(2)),
        totalVolumFluideLitri: Number(totalVolumFluideLitri.toFixed(1)),
        totalFluideCsereLitri: Number(totalFluideCsereLitri.toFixed(1)),
        totalFluideCsereCost: Number(totalFluideCsereCost.toFixed(2)),
        totalFluidePotlasLitri: Number(totalFluidePotlasLitri.toFixed(1)),
        totalFluidePotlasCost: Number(totalFluidePotlasCost.toFixed(2)),
        numarComenziLucru: comenzi.length,
        numarPieseConsumate: pieseConsumate.length,
        numarAnvelopeMontate: anvelopeMontate.length,
        numarCompletariFluide: completariPrelucrate.length,
        totalVehiculeAfectate: vehicule.length,
        totalAchizitiiEFacturaRON: Number(totalGeneralFacturiRON.toFixed(2)),
        totalAchizitiiCategoriiRON: Number(totalCategoriiRON.toFixed(2)),
        totalAchizitiiFaraTVARON: Number(totalCategoriiFaraTVARON.toFixed(2)),
        totalInStocRON: Number(totalInStocRON.toFixed(2)),
        totalInStocFaraTVARON: Number(totalInStocFaraTVARON.toFixed(2)),
        totalDirectVehiculeRON: Number(totalDirectVehiculeRON.toFixed(2)),
        totalDirectVehiculeFaraTVARON: Number(totalDirectVehiculeFaraTVARON.toFixed(2)),
        numarCategoriiAchizitii: achizitiiCategorii.length,
        numarSubcategoriiAchizitii: numarSubcategorii,
        numarPozitiiFacturate: totalLiniiPozitii,
        numarFacturiEFactura: facturiEFactura.length,
        numarDocumenteScadente: documenteScadente.length,
        numarReviziiPreconizate: reviziiPreconizate.length,
      },
      vehicule,
      statisticiVehicule,
      statisticiCategorii,
      fluidePeTipuri,
      anvelopeMontate,
      comenziLucru: comenziPrelucrate,
      pieseConsumate,
      completariFluide: completariPrelucrate,
      evolutieLunara,
      eficientaCostUnitar,
      analizaConsumUlei,
      achizitiiFurnizori,
      achizitiiCategorii,
      scadentarMentenanta: {
        documenteScadente,
        reviziiPreconizate,
      },
    };
  }

  // =========================================================================
  // JURNAL COMENZI & NOTE ATELIER (ȘEF ATELIER)
  // =========================================================================

  private normalizeChecklistJson(checklist: any): string | null {
    if (!checklist) return null;
    if (typeof checklist === 'string') {
      try {
        const parsed = JSON.parse(checklist);
        return Array.isArray(parsed) && parsed.length > 0 ? JSON.stringify(parsed) : null;
      } catch {
        return null;
      }
    }
    if (Array.isArray(checklist)) {
      const clean = checklist
        .map((it: any, idx: number) => ({
          id: String(it?.id || `item-${Date.now()}-${idx}`),
          text: String(it?.text || '').trim(),
          done: Boolean(it?.done),
          cantitate: it?.cantitate ? String(it.cantitate).trim() : undefined,
        }))
        .filter((it) => it.text.length > 0);
      return clean.length > 0 ? JSON.stringify(clean) : null;
    }
    return null;
  }

  private readonly notaVehiculSelect = {
    id: true,
    numarIntern: true,
    numarInmatriculare: true,
    marca: true,
    model: true,
    categorieEnum: true,
    tipMasurare: true,
    valoareContorCurent: true,
  };

  async getNoteAtelier(filters?: { status?: string; categorie?: string; vehiculId?: string; search?: string }) {
    const where: any = {};
    if (filters?.status && filters.status !== 'TOATE') {
      where.status = filters.status;
    }
    if (filters?.categorie && filters.categorie !== 'TOATE') {
      where.categorie = filters.categorie;
    }
    if (filters?.vehiculId) {
      where.vehiculId = filters.vehiculId === 'FARA_VEHICUL' ? null : filters.vehiculId;
    }

    const notes = await this.prisma.notaAtelier.findMany({
      where,
      include: {
        vehicul: { select: this.notaVehiculSelect },
      },
      orderBy: [{ pinuit: 'desc' }, { createdAt: 'desc' }],
    });

    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      return notes.filter((n) =>
        [
          n.titlu,
          n.descriere,
          n.checklistJson,
          n.mecanicAsignat,
          n.creatDe,
          n.comandaLucruNumar,
          n.vehicul?.numarIntern,
          n.vehicul?.numarInmatriculare,
          n.vehicul?.marca,
          n.vehicul?.model,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q)),
      );
    }

    return notes;
  }

  async createNotaAtelier(data: {
    titlu: string;
    descriere?: string;
    categorie?: string;
    status?: string;
    prioritate?: string;
    pinuit?: boolean;
    vehiculId?: string | null;
    mecanicAsignat?: string | null;
    creatDe?: string | null;
    checklist?: any;
    checklistJson?: string | null;
    termenLimita?: string | null;
  }) {
    if (!data.titlu || !data.titlu.trim()) {
      throw new BadRequestException('Titlul notei este obligatoriu.');
    }

    const parsedTermen =
      data.termenLimita && String(data.termenLimita).trim() !== ''
        ? new Date(data.termenLimita)
        : null;
    const rawStatus = (data.status || '').trim();
    const resolvedStatus =
      rawStatus || (parsedTermen ? 'TERMEN_LIMITA' : 'DE_REZOLVAT');

    return this.prisma.notaAtelier.create({
      data: {
        titlu: data.titlu.trim(),
        descriere: data.descriere?.trim() || null,
        categorie: (data.categorie || 'PROBLEMA').trim(),
        status: resolvedStatus,
        prioritate: (data.prioritate || 'NORMAL').trim(),
        pinuit: Boolean(data.pinuit),
        vehiculId: data.vehiculId && String(data.vehiculId).trim() !== '' ? data.vehiculId : null,
        mecanicAsignat: data.mecanicAsignat?.trim() || null,
        creatDe: data.creatDe?.trim() || null,
        checklistJson: this.normalizeChecklistJson(data.checklist ?? data.checklistJson),
        termenLimita: parsedTermen,
        dataFinalizare: resolvedStatus === 'REZOLVAT' ? new Date() : null,
      },
      include: {
        vehicul: { select: this.notaVehiculSelect },
      },
    });
  }

  async updateNotaAtelier(
    id: string,
    data: {
      titlu?: string;
      descriere?: string | null;
      categorie?: string;
      status?: string;
      prioritate?: string;
      pinuit?: boolean;
      vehiculId?: string | null;
      mecanicAsignat?: string | null;
      checklist?: any;
      checklistJson?: string | null;
      termenLimita?: string | null;
    },
  ) {
    const existing = await this.prisma.notaAtelier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Nota de atelier nu există.');

    const updateData: any = {};
    if (data.titlu !== undefined) updateData.titlu = data.titlu.trim() || existing.titlu;
    if (data.descriere !== undefined) updateData.descriere = data.descriere ? data.descriere.trim() : null;
    if (data.categorie !== undefined) updateData.categorie = data.categorie.trim();
    if (data.prioritate !== undefined) updateData.prioritate = data.prioritate.trim();
    if (data.pinuit !== undefined) updateData.pinuit = Boolean(data.pinuit);
    if (data.vehiculId !== undefined) {
      updateData.vehiculId = data.vehiculId && String(data.vehiculId).trim() !== '' ? data.vehiculId : null;
    }
    if (data.mecanicAsignat !== undefined) {
      updateData.mecanicAsignat = data.mecanicAsignat ? data.mecanicAsignat.trim() : null;
    }
    if (data.checklist !== undefined || data.checklistJson !== undefined) {
      updateData.checklistJson = this.normalizeChecklistJson(data.checklist ?? data.checklistJson);
    }
    if (data.termenLimita !== undefined) {
      updateData.termenLimita =
        data.termenLimita && String(data.termenLimita).trim() !== ''
          ? new Date(data.termenLimita)
          : null;
    }
    if (data.status !== undefined) {
      const nextStatus = data.status.trim();
      updateData.status = nextStatus;
      if (nextStatus === 'REZOLVAT' && existing.status !== 'REZOLVAT') {
        updateData.dataFinalizare = new Date();
      } else if (nextStatus !== 'REZOLVAT' && existing.status === 'REZOLVAT') {
        updateData.dataFinalizare = null;
      }
    }

    return this.prisma.notaAtelier.update({
      where: { id },
      data: updateData,
      include: {
        vehicul: { select: this.notaVehiculSelect },
      },
    });
  }

  async creeazaDevizDinNota(id: string, body?: { mecanicResponsabil?: string; dataDeschidere?: string | Date }) {
    const nota = await this.prisma.notaAtelier.findUnique({
      where: { id },
      include: { vehicul: true },
    });
    if (!nota) throw new NotFoundException('Nota de atelier nu există.');
    if (!nota.vehiculId) {
      throw new BadRequestException('Pentru a deschide un Deviz de Lucru, asociați mai întâi un vehicul acestei note.');
    }

    if (nota.comandaLucruId) {
      const existingComanda = await this.prisma.comandaLucru.findUnique({ where: { id: nota.comandaLucruId } });
      if (existingComanda) {
        return { nota, comanda: existingComanda, alreadyExists: true };
      }
    }

    let checklistSummary = '';
    if (nota.checklistJson) {
      try {
        const items = JSON.parse(nota.checklistJson);
        if (Array.isArray(items) && items.length > 0) {
          checklistSummary =
            '\nLista elemente: ' +
            items.map((it: any) => `${it.cantitate ? `${it.cantitate}x ` : ''}${it.text}`).join(', ');
        }
      } catch {
        // ignore invalid json
      }
    }

    const observatii = `[Din Comandă Atelier] ${nota.titlu}${nota.descriere ? `\n${nota.descriere}` : ''}${checklistSummary}`.trim();

    const comanda = await this.createComandaLucru({
      vehiculId: nota.vehiculId,
      mecanicResponsabil: body?.mecanicResponsabil || nota.mecanicAsignat || 'Atelier Intern',
      dataDeschidere: body?.dataDeschidere,
      observatii,
      elemente: [],
    });

    const updatedNota = await this.prisma.notaAtelier.update({
      where: { id },
      data: {
        comandaLucruId: comanda.id,
        comandaLucruNumar: comanda.numarComanda,
        status: nota.status === 'REZOLVAT' ? 'REZOLVAT' : 'IN_PROGRES',
      },
      include: {
        vehicul: { select: this.notaVehiculSelect },
      },
    });

    return { nota: updatedNota, comanda, alreadyExists: false };
  }

  async deleteNotaAtelier(id: string) {
    const existing = await this.prisma.notaAtelier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Nota de atelier nu există.');
    await this.prisma.notaAtelier.delete({ where: { id } });
    return { success: true };
  }
}
