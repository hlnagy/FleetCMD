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
          create: elementeData.map((el) => ({
            sarcinaMentenantaId: el.sarcinaMentenantaId || null,
            pilonCost: el.pilonCost,
            descriere: el.descriere,
            cantitate: Number(el.cantitate || 1),
            pretUnitar: Number(el.pretUnitar || 0),
            costTotal: Number(el.cantitate || 1) * Number(el.pretUnitar || 0),
            provenienta: el.provenienta || (el.pilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : 'Standard'),
            articolStocId: el.articolStocId || null,
            serieUnicaPiesa: el.serieUnicaPiesa || null,
            furnizor: el.furnizor || null,
            numarFactura: el.numarFactura || null,
          })),
        },
      },
      include: { elementeComanda: true, vehicul: true },
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

    return this.prisma.elementComandaLucru.create({
      data: {
        comandaLucruId: comandaId,
        sarcinaMentenantaId: el.sarcinaMentenantaId || null,
        pilonCost: el.pilonCost,
        descriere: el.descriere,
        cantitate: Number(el.cantitate || 1),
        pretUnitar: Number(el.pretUnitar || 0),
        costTotal: Number(el.cantitate || 1) * Number(el.pretUnitar || 0),
        provenienta: el.provenienta || (el.pilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : 'Stoc Intern'),
        articolStocId: el.articolStocId || null,
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
            await this.prisma.elementComandaLucru.update({
              where: { id: elem.id },
              data: {
                costTotal: fifoRes.costTotal,
                pretUnitar: fifoRes.pretUnitarMediu,
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
      await this.prisma.elementComandaLucru.createMany({
        data: data.elementeComanda.map((el) => ({
          comandaLucruId: comandaId,
          pilonCost: el.pilonCost,
          descriere: el.descriere,
          cantitate: Number(el.cantitate || 1),
          pretUnitar: Number(el.pretUnitar || 0),
          costTotal: Number(el.cantitate || 1) * Number(el.pretUnitar || 0),
          provenienta: el.pilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : 'Stoc Intern',
          articolStocId: el.articolStocId || null,
        })),
      });
    }

    return this.prisma.comandaLucru.findUnique({
      where: { id: comandaId },
      include: { elementeComanda: true },
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
    };
  }
}
