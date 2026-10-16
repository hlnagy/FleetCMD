import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StocuriGarantiiService } from '../stocuri-garantii/stocuri-garantii.service';

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
      servicii.push({
        id: `CL-${c.id}`,
        tip: 'COMANDA_LUCRU',
        titlu: `Comandă de Lucru: ${c.numarComanda}`,
        mecanic: c.mecanicResponsabil,
        vehicul: c.vehicul ? `${c.vehicul.numarIntern} (${c.vehicul.numarInmatriculare})` : '-',
        data: c.dataDeschidere,
        stare: c.stare,
        detalii: `${c.elementeComanda.length} elemente piese/manoperă. Contor: ${c.valoareContorLaExecutie}`,
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

  async createComandaLucru(data: {
    vehiculId: string;
    mecanicResponsabil: string;
    valoareContorLaExecutie?: number;
    valoareContor?: number;
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

    const contorVal = Number(data.valoareContorLaExecutie ?? data.valoareContor ?? vehicul.valoareContorCurent);

    // Update vehicle's current odometer if new value is provided and valid
    if (contorVal > 0) {
      await this.prisma.vehicul.update({
        where: { id: data.vehiculId },
        data: {
          valoareContorCurent: Math.max(vehicul.valoareContorCurent, contorVal),
          dataInregistrareContor: new Date(),
        },
      });

      await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: data.vehiculId,
          valoareContor: contorVal,
          dataInregistrare: new Date(),
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
        dataDeschidere: new Date(),
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

      if (elem.sarcinaMentenanta) {
        const sarcina = elem.sarcinaMentenanta;

        await this.prisma.sarcinaMentenanta.update({
          where: { id: sarcina.id },
          data: { ultimulRulajExecutie: comanda.valoareContorLaExecutie },
        });

        if (sarcina.tipSarcina === 'SCHIMB_PIESA' && sarcina.sarciniSubordonate.length > 0) {
          for (const subordonata of sarcina.sarciniSubordonate) {
            await this.prisma.sarcinaMentenanta.update({
              where: { id: subordonata.id },
              data: { ultimulRulajExecutie: comanda.valoareContorLaExecutie },
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
          await this.prisma.executieRegulaVehicul.upsert({
            where: {
              vehiculId_regulaAlertaId: {
                vehiculId: comanda.vehiculId,
                regulaAlertaId: reg.id,
              },
            },
            update: {
              ultimulSchimbContor: comanda.valoareContorLaExecutie,
              ultimulSchimbData: new Date(),
              observatii: `Resetat automat prin finalizare Comandă de Lucru ${comanda.numarComanda}`,
            },
            create: {
              vehiculId: comanda.vehiculId,
              regulaAlertaId: reg.id,
              ultimulSchimbContor: comanda.valoareContorLaExecutie,
              ultimulSchimbData: new Date(),
              observatii: `Resetat automat prin finalizare Comandă de Lucru ${comanda.numarComanda}`,
            },
          });
        }
      }
    }

    return this.prisma.comandaLucru.update({
      where: { id: comandaId },
      data: {
        stare: 'FINALIZAT',
        dataFinalizare: new Date(),
      },
    });
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
          const articol = await this.prisma.articolStoc.findUnique({ where: { id: elem.articolStocId } });
          if (articol) {
            await this.prisma.articolStoc.update({
              where: { id: elem.articolStocId },
              data: { stocCurent: articol.stocCurent + elem.cantitate },
            });
          }
        }
      }
    }

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
          const articol = await this.prisma.articolStoc.findUnique({ where: { id: elem.articolStocId } });
          if (articol) {
            await this.prisma.articolStoc.update({
              where: { id: elem.articolStocId },
              data: { stocCurent: articol.stocCurent + elem.cantitate },
            });
          }
        }
      }
    }

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
          const articol = await this.prisma.articolStoc.findUnique({ where: { id: elem.articolStocId } });
          if (articol) {
            await this.prisma.articolStoc.update({
              where: { id: elem.articolStocId },
              data: { stocCurent: articol.stocCurent + elem.cantitate },
            });
          }
        }
      }
    }

    return this.prisma.comandaLucru.update({
      where: { id: comandaId },
      data: {
        stare: 'DEVALIDAT',
        dataFinalizare: null,
      },
    });
  }

  // UPDATE COMANDĂ DE LUCRU: Editare (mecanic, observații, elemente)
  async updateComandaLucru(comandaId: string, data: {
    mecanicResponsabil?: string;
    observatii?: string;
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
    if (comanda.stare === 'FINALIZAT') {
      throw new BadRequestException('Comanda finalizată trebuie mai întâi DEVALIDATĂ pentru a putea fi editată!');
    }

    if (data.mecanicResponsabil || data.observatii !== undefined) {
      await this.prisma.comandaLucru.update({
        where: { id: comandaId },
        data: {
          ...(data.mecanicResponsabil ? { mecanicResponsabil: data.mecanicResponsabil } : {}),
          ...(data.observatii !== undefined ? { observatii: data.observatii } : {}),
        },
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
            comandaLucruId: comandaId,
            pilonCost: el.pilonCost,
            descriere: el.descriere,
            cantitate: Number(el.cantitate || 1),
            pretUnitar,
            costTotal: Number(el.cantitate || 1) * pretUnitar,
            provenienta: el.provenienta || (el.pilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : el.pilonCost === 'PIESA_DIRECTA' ? 'Achiziție Directă' : 'Stoc Intern'),
            articolStocId: el.articolStocId || null,
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

    const facturiEFactura = await this.prisma.eFacturaFactura.findMany({
      where: {
        ...dateFilterEFactura,
        tipFactura: 'FACTURA',
      },
      select: {
        id: true,
        cifVanzator: true,
        numeVanzator: true,
        numarFactura: true,
        dataFactura: true,
        valoareTotala: true,
        stare: true,
        articole: {
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
            articolStocId: true,
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
      },
    });
    const articoleStocMap = new Map<string, (typeof articoleStocCatalog)[0]>();
    articoleStocCatalog.forEach((a) => {
      if (a.id) articoleStocMap.set(a.id, a);
      if (a.codArticol) articoleStocMap.set(a.codArticol.toUpperCase().trim(), a);
    });

    // Helper mapare categorie fluid
    const mapFluidCategory = (desc: string, tipRaw?: string): { key: string; label: string } => {
      const t = (tipRaw || '').toUpperCase();
      const d = (desc || '').toLowerCase();
      if (t.includes('MOTOR') || /motor|10w40|15w40|5w30|5w40/i.test(d)) {
        return { key: 'ULEI_MOTOR', label: 'Ulei Motor' };
      }
      if (t.includes('HIDRAUL') || /hidraul/i.test(d)) {
        return { key: 'ULEI_HIDRAULIC', label: 'Ulei Hidraulic' };
      }
      if (t.includes('TRANSMIS') || /transmis|cutie|punte|80w90|75w90|atf/i.test(d)) {
        return { key: 'ULEI_TRANSMISIE', label: 'Ulei Transmisie / Cutie' };
      }
      if (t.includes('ANTIGEL') || /antigel|g11|g12|racire/i.test(d)) {
        return { key: 'ANTIGEL', label: 'Antigel / Hűtőfolyadék' };
      }
      if (t.includes('VASELIN') || /vaselin|unsoare|grease/i.test(d)) {
        return { key: 'VASELINA', label: 'Vaselină / Zsír' };
      }
      if (t.includes('ADBLUE') || /adblue|uree/i.test(d)) {
        return { key: 'ADBLUE', label: 'AdBlue' };
      }
      return { key: 'ALTE', label: 'Alte Fluide' };
    };

    // Helper mapare Főkategória & Alkategória pentru articole facturate
    const categorizeInvoiceItem = (
      descriere: string,
      codArticol?: string | null,
      articolStoc?: { categorie?: string | null; subcategorie?: string | null; unitateMasura?: string | null } | null
    ): { categorie: string; subcategorie: string; unitateMasura: string } => {
      // 1. Dacă articolul este deja salvat/asociat cu un ArticolStoc din baza de date
      if (articolStoc && articolStoc.categorie) {
        return {
          categorie: articolStoc.categorie.trim(),
          subcategorie: articolStoc.subcategorie?.trim() || 'General',
          unitateMasura: articolStoc.unitateMasura || 'buc',
        };
      }

      const d = (descriere || '').toLowerCase();
      const cod = (codArticol || '').toUpperCase();

      // 2. Anvelope & Camere
      const matchAnvelopaDim = descriere.match(/\b\d{2,3}\/\d{2,3}\s*R\s*\d{2}(?:\.5)?\b/i);
      if (matchAnvelopaDim || /anvelop|cauciuc|pneu/i.test(d) || cod.startsWith('ANV')) {
        const dim = matchAnvelopaDim ? matchAnvelopaDim[0].replace(/\s+/g, '') : 'Diverse Anvelope';
        return { categorie: 'Anvelope', subcategorie: dim, unitateMasura: 'buc' };
      }

      // 3. Uleiuri & Lubrifianți
      if (/ulei|oil|lubrifiant|unsoare|vaselin|10w40|15w40|5w30|5w40|hlp|tellus|rimula|spirax/i.test(d)) {
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

      // 4. Antigel & Răcire
      if (/antigel|coolant|racire|g11|g12|g13|demineraliz/i.test(d)) {
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

      // 5. AdBlue & Fluide Speciale
      if (/adblue|uree|frana|dot\s*4|parbriz|spalare/i.test(d)) {
        if (/adblue|uree/i.test(d)) {
          return { categorie: 'AdBlue & Chimice', subcategorie: 'AdBlue (Soluție Uree)', unitateMasura: 'L' };
        }
        if (/frana|dot\s*4/i.test(d)) {
          return { categorie: 'AdBlue & Chimice', subcategorie: 'Lichid Frână DOT 4', unitateMasura: 'L' };
        }
        if (/parbriz|spalare/i.test(d)) {
          return { categorie: 'AdBlue & Chimice', subcategorie: 'Lichid Spălare Parbriz', unitateMasura: 'L' };
        }
        return { categorie: 'AdBlue & Chimice', subcategorie: 'Fluide Speciale', unitateMasura: 'L' };
      }

      // 6. Filtre
      if (/filtr|cartus\s*filtr/i.test(d)) {
        if (/ulei/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Ulei Motor', unitateMasura: 'buc' };
        if (/aer/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Aer', unitateMasura: 'buc' };
        if (/combustibil|motorina|carburant/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Combustibil', unitateMasura: 'buc' };
        if (/hidraul/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Hidraulic', unitateMasura: 'buc' };
        if (/uscator|desiccant/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Uscător Aer', unitateMasura: 'buc' };
        if (/habitaclu|polen/i.test(d)) return { categorie: 'Filtre', subcategorie: 'Filtru Habitaclu', unitateMasura: 'buc' };
        return { categorie: 'Filtre', subcategorie: 'Filtre Diverse', unitateMasura: 'buc' };
      }

      // 7. Sistem Frânare
      if (/placute|placuta|disc\s*frana|frana|tambur|sabot|etrier/i.test(d)) {
        if (/placut/i.test(d)) return { categorie: 'Sistem Frânare', subcategorie: 'Plăcuțe Frână', unitateMasura: 'set' };
        if (/disc/i.test(d)) return { categorie: 'Sistem Frânare', subcategorie: 'Discuri Frână', unitateMasura: 'buc' };
        if (/tambur|sabot/i.test(d)) return { categorie: 'Sistem Frânare', subcategorie: 'Saboți & Tamburi Frână', unitateMasura: 'set' };
        if (/etrier|cilindru/i.test(d)) return { categorie: 'Sistem Frânare', subcategorie: 'Etrieri & Cilindri Frână', unitateMasura: 'buc' };
        return { categorie: 'Sistem Frânare', subcategorie: 'Componente Frânare', unitateMasura: 'buc' };
      }

      // 8. Piese Mecanice & Direcție
      if (/pivot|bucsa|bara|amortizor|perna|curea|intinzator|rola|turbo|turbosuflanta|ambreiaj|rulment|pompa\s*apa|termostat/i.test(d)) {
        if (/amortizor|perna/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Suspensie & Amortizoare', unitateMasura: 'buc' };
        if (/pivot|bucsa|bara/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Articulații & Direcție', unitateMasura: 'buc' };
        if (/curea|intinzator|rola/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Curele & Transmisie Auxiliară', unitateMasura: 'buc' };
        if (/turbo|turbosufl/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Turbosuflante & Turbo', unitateMasura: 'buc' };
        if (/ambreiaj|volanta/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Kit Ambreiaj & Volantă', unitateMasura: 'buc' };
        if (/pompa\s*apa|termostat/i.test(d)) return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Pompă Apă & Termostat', unitateMasura: 'buc' };
        return { categorie: 'Piese Mecanice & Direcție', subcategorie: 'Piese Mecanice Generale', unitateMasura: 'buc' };
      }

      // 9. Electrice & Acumulatori
      if (/baterie|acumulator|alternator|electromotor|demaror|far|bec|led|lampa|senzor|cablu|releu/i.test(d)) {
        if (/baterie|acumulator/i.test(d)) return { categorie: 'Sisteme Electrice', subcategorie: 'Baterii & Acumulatori', unitateMasura: 'buc' };
        if (/alternator|electromotor|demaror/i.test(d)) return { categorie: 'Sisteme Electrice', subcategorie: 'Alternatoare & Demaroare', unitateMasura: 'buc' };
        if (/far|bec|led|lampa|stop/i.test(d)) return { categorie: 'Sisteme Electrice', subcategorie: 'Iluminare & Semnalizare', unitateMasura: 'buc' };
        return { categorie: 'Sisteme Electrice', subcategorie: 'Cablaje & Senzori', unitateMasura: 'buc' };
      }

      // 10. Consumabile & Atelier
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
      ANTIGEL: { key: 'ANTIGEL', label: 'Antigel / Hűtőfolyadék', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
      VASELINA: { key: 'VASELINA', label: 'Vaselină / Zsír', totalLitri: 0, totalCost: 0, csereLitri: 0, csereCost: 0, potlasLitri: 0, potlasCost: 0 },
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
        const isFluid = /\b(ulei|oil|antigel|adblue|vaselin|lichid|atf)\b/i.test(el.descriere);

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
            vehiculeMap[c.vehiculId].numarAnvelope += cant;
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
          // Ulei / Fluid consumat pe comanda de lucru = Csere (Schimb Revizie)
          cmdFluide += cost;
          totalFluide += cost;
          totalVolumFluideLitri += cant;
          totalFluideCsereLitri += cant;
          totalFluideCsereCost += cost;

          const catInfo = mapFluidCategory(el.descriere);
          if (fluideTipuriMap[catInfo.key]) {
            fluideTipuriMap[catInfo.key].totalLitri += cant;
            fluideTipuriMap[catInfo.key].totalCost += cost;
            fluideTipuriMap[catInfo.key].csereLitri += cant;
            fluideTipuriMap[catInfo.key].csereCost += cost;
          }

          evolutieMap[lKey].fluide += cost;
          evolutieMap[lKey].total += cost;

          if (vehiculeMap[c.vehiculId]) {
            vehiculeMap[c.vehiculId].costFluide += cost;
            vehiculeMap[c.vehiculId].costFluideCsere += cost;
            vehiculeMap[c.vehiculId].volumFluideLitri += cant;
            vehiculeMap[c.vehiculId].volumCsereLitri += cant;
            vehiculeMap[c.vehiculId].totalCost += cost;
          }

          completariPrelucrate.push({
            id: el.id,
            vehiculId: c.vehiculId,
            vehicul: c.vehicul,
            tipLichid: catInfo.key,
            tipOperatiune: 'SCHIMB_ULEI',
            marcaUlei: el.descriere,
            cantitateLitri: cant,
            pretPerLitru: Number(el.pretUnitar || 0),
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

    // C. Prelucrare Completări / Schimburi Fluide directe
    completari.forEach((f) => {
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

    // H. Raport 3: Achiziții Furnizori ANAF e-Factura
    const furnizoriMap: Record<string, {
      cif: string;
      nume: string;
      numarFacturi: number;
      valoareTotalaRON: number;
      facturi: any[];
    }> = {};

    let totalGeneralFacturiRON = 0;
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
          facturi: [],
        };
      }
      furnizoriMap[key].numarFacturi += 1;
      furnizoriMap[key].valoareTotalaRON += f.valoareTotala;
      totalGeneralFacturiRON += f.valoareTotala;
      if (furnizoriMap[key].facturi.length < 5) {
        furnizoriMap[key].facturi.push({
          numarFactura: f.numarFactura,
          dataFactura: f.dataFactura,
          valoareTotala: Number(f.valoareTotala.toFixed(2)),
          stare: f.stare,
        });
      }
    });

    const achizitiiFurnizori = Object.values(furnizoriMap)
      .map((fn) => ({
        cif: fn.cif,
        nume: fn.nume,
        numarFacturi: fn.numarFacturi,
        valoareTotalaRON: Number(fn.valoareTotalaRON.toFixed(2)),
        procentDinTotal: totalGeneralFacturiRON > 0 ? Number(((fn.valoareTotalaRON / totalGeneralFacturiRON) * 100).toFixed(1)) : 0,
        facturiRecente: fn.facturi,
      }))
      .sort((a, b) => b.valoareTotalaRON - a.valoareTotalaRON);

    // H2. Raport Achiziții: Főkategóriák & Alkategóriák (Defalcare ierarhică piese facturate)
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
    let totalLiniiPozitii = 0;

    facturiEFactura.forEach((f) => {
      if (f.stare === 'ELIMINAT') return;

      const furnizor = f.numeVanzator || 'Furnizor Necunoscut';
      const items = f.articole || [];

      if (items.length === 0) {
        const catName = 'Alte Piese & Materiale';
        const subName = 'Factură Nedetaliată';
        const vCuTVA = Number(f.valoareTotala || 0);
        const vFaraTVA = Number((vCuTVA / 1.19).toFixed(2));

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
        cObj.cantitateTotala += 1;
        cObj.numarPozitii += 1;
        cObj.facturiSet.add(f.numarFactura);
        cObj.furnizoriSet[furnizor] = (cObj.furnizoriSet[furnizor] || 0) + vCuTVA;

        if (!cObj.subcategoriiMap[subName]) {
          cObj.subcategoriiMap[subName] = {
            subcategorie: subName,
            valoareTotalaRON: 0,
            valoareFaraTVARON: 0,
            cantitateTotala: 0,
            unitateMasura: 'buc',
            numarPozitii: 0,
            articoleRecente: [],
          };
        }
        const sObj = cObj.subcategoriiMap[subName];
        sObj.valoareTotalaRON += vCuTVA;
        sObj.valoareFaraTVARON += vFaraTVA;
        sObj.cantitateTotala += 1;
        sObj.numarPozitii += 1;
        if (sObj.articoleRecente.length < 10) {
          sObj.articoleRecente.push({
            id: f.id,
            descriere: `Factura ${f.numarFactura} (${furnizor})`,
            codArticol: '-',
            furnizor,
            numarFactura: f.numarFactura,
            dataFactura: f.dataFactura,
            cantitate: 1,
            unitateMasura: 'buc',
            pretUnitar: vCuTVA,
            valoareFaraTVA: vFaraTVA,
            valoareTotala: vCuTVA,
            stare: f.stare,
          });
        }

        totalCategoriiRON += vCuTVA;
        totalCategoriiFaraTVARON += vFaraTVA;
        totalLiniiPozitii += 1;
      } else {
        items.forEach((item) => {
          const cant = Number(item.cantitate || 1);
          const pretUnit = Number(item.pretUnitar || 0);
          let vFaraTVA = Number(item.valoareFaraTVA || 0);
          if (vFaraTVA === 0 && pretUnit > 0) {
            vFaraTVA = Number((cant * pretUnit).toFixed(2));
          }
          let vCuTVA = Number(item.valoareTVA ? (vFaraTVA + item.valoareTVA) : (vFaraTVA * 1.19));
          vCuTVA = Number(vCuTVA.toFixed(2));

          const linkedArticol = item.articolStocId
            ? articoleStocMap.get(item.articolStocId)
            : item.codArticolFurnizor
            ? articoleStocMap.get(item.codArticolFurnizor.toUpperCase().trim())
            : null;
          const mapped = categorizeInvoiceItem(item.descrierePiesa, item.codArticolFurnizor, linkedArticol);
          const catName = mapped.categorie;
          const subName = mapped.subcategorie;
          const um = item.unitateMasura || mapped.unitateMasura || 'buc';

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
          if (sObj.articoleRecente.length < 10) {
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
            });
          }

          totalCategoriiRON += vCuTVA;
          totalCategoriiFaraTVARON += vFaraTVA;
          totalLiniiPozitii += 1;
        });
      }
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
              valoareTotalaRON: subRON,
              valoareFaraTVARON: subFaraTVARON,
              cantitateTotala: Number(sub.cantitateTotala.toFixed(2)),
              unitateMasura: sub.unitateMasura,
              numarPozitii: sub.numarPozitii,
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
          cantitateTotala: Number(cat.cantitateTotala.toFixed(2)),
          numarPozitii: cat.numarPozitii,
          numarFacturi: cat.facturiSet.size,
          procentDinTotal,
          subcategorii,
          furnizoriPrincipali,
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
}
