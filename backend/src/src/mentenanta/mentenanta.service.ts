import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MentenantaService {
  constructor(private prisma: PrismaService) {}

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
          { nume: 'Mihai Popa (Șef Atelier)', functie: 'Șef Atelier', telefon: '0744333444' },
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
        detalii: `Mutare de pe poz. ${p.pozitieSursaCod} ➔ ${p.pozitieDestCod}. Contor: ${p.valoareContor}`,
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
      mesaj: `✅ Inspecție/Manoperă finalizată! Contorul a fost resetat la ${valoareContor} ${sarcina.tipMasurare}.`,
      valoareContor,
    };
  }

  // ==========================================
  // COMENZI DE LUCRU CU MULTIPLE ELEMENTE & CICLU DE VIAȚĂ
  // ==========================================

  async createComandaLucru(data: {
    vehiculId: string;
    mecanicResponsabil: string;
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

    const count = await this.prisma.comandaLucru.count();
    const numarComanda = `CL-${(count + 1).toString().padStart(5, '0')}`;

    const elementeData = data.elemente || [];

    const comanda = await this.prisma.comandaLucru.create({
      data: {
        numarComanda,
        vehiculId: data.vehiculId,
        mecanicResponsabil: data.mecanicResponsabil,
        observatii: data.observatii,
        valoareContorLaExecutie: vehicul.valoareContorCurent,
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
      include: { elementeComanda: true },
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
          await this.prisma.articolStoc.update({
            where: { id: elem.articolStocId },
            data: { stocCurent: articol.stocCurent - elem.cantitate },
          });
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
        descriere: `Execuție szerviz: ${sarcina.nume}`,
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
      observatii: data.observatii || `Deschidere Munkalap: ${sarcina.nume}`,
      elemente,
    });

    return {
      mesaj: `✅ Comandă de Lucru ${comanda.numarComanda} deschisă cu succes (Stare: ÎN LUCRU)! Puteți adăuga piese suplimentare și o puteți finaliza din Munkalapok.`,
      comanda,
    };
  }
}
