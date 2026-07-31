import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnomaliiService {
  constructor(private prisma: PrismaService) {}

  getTipuriUleiStandard() {
    return [
      { id: 'ULEI_MOTOR', nume: 'Ulei motor' },
      { id: 'ULEI_HIDRAULIC', nume: 'Ulei hidraulic' },
      { id: 'ULEI_LIEBHERR_PUNTE', nume: 'Ulei - Liebherr Punte faţă + spate' },
      { id: 'ULEI_LIEBHERR_CUTIE', nume: 'Ulei - Liebherr Cutie Viteze' },
      { id: 'ULEI_CUTIE_MANUALA', nume: 'Ulei cutie manuală' },
      { id: 'ULEI_CUTIE_AUTOMATA', nume: 'Ulei cutie automată' },
    ];
  }

  // 1. INTRARI ULEI (Oil Stock Reception)
  async adaugaIntrareUlei(data: {
    tipLichid: string;
    marcaUlei: string;
    cantitateLitri: number;
    pretTotal: number;
    furnizor: string;
    numarFactura: string;
    dataFactura?: string;
    observatii?: string;
  }) {
    const cantitate = Number(data.cantitateLitri);
    const pretTotal = Number(data.pretTotal);
    if (cantitate <= 0) throw new BadRequestException('Cantitatea trebuie să fie mai mare ca 0.');

    const pretPerLitru = Number((pretTotal / cantitate).toFixed(2));
    const codArticol = `OIL-${data.tipLichid.replace(/_/g, '-')}-${data.marcaUlei.toUpperCase().replace(/\s+/g, '')}`;
    const denumire = `${data.tipLichid.replace(/_/g, ' ')} ${data.marcaUlei}`;

    let articol = await this.prisma.articolStoc.findFirst({
      where: {
        OR: [
          { codArticol },
          { AND: [{ categorie: 'Lubrifianți' }, { denumire: { contains: data.marcaUlei } }] },
        ],
      },
    });

    if (articol) {
      articol = await this.prisma.articolStoc.update({
        where: { id: articol.id },
        data: {
          stocCurent: articol.stocCurent + cantitate,
          pretUnitar: pretPerLitru,
          marcaUlei: data.marcaUlei,
        },
      });
    } else {
      articol = await this.prisma.articolStoc.create({
        data: {
          codArticol,
          denumire,
          categorie: 'Lubrifianți',
          marcaUlei: data.marcaUlei,
          stocCurent: cantitate,
          stocMinim: 20,
          pretUnitar: pretPerLitru,
          unitateMasura: 'L',
        },
      });
    }

    const intrare = await this.prisma.intrareStoc.create({
      data: {
        articolStocId: articol.id,
        tipLichid: data.tipLichid,
        marcaUlei: data.marcaUlei,
        furnizor: data.furnizor,
        numarFactura: data.numarFactura,
        dataFactura: data.dataFactura ? new Date(data.dataFactura) : new Date(),
        cantitateIntrata: cantitate,
        pretUnitar: pretPerLitru,
        pretTotal: pretTotal,
        observatii: data.observatii,
      },
    });

    return {
      mesaj: `Bevételezés sikeres! Hozzáadva ${cantitate}L ${denumire} (${pretPerLitru} RON/L) a stocul curent (${articol.stocCurent}L total). Számla: ${data.numarFactura}`,
      articol,
      intrare,
      pretPerLitru,
    };
  }

  // 2. IESIRI ULEI (With automatic warehouse stock deduction)
  async adaugaIesireUlei(data: {
    vehiculId: string;
    tipLichid: string;
    tipOperatiune: string;
    marcaUlei?: string;
    articolStocId?: string;
    cantitateLitri: number;
    valoareContor: number;
    dataOperatiune?: string;
    mecanic: string;
    observatii?: string;
  }) {
    const vehicul = await this.prisma.vehicul.findUnique({ where: { id: data.vehiculId } });
    if (!vehicul) throw new NotFoundException('Vehiculul nu a fost găsit.');

    const cantitate = Number(data.cantitateLitri);
    const valoareContor = Number(data.valoareContor);
    const dataOp = data.dataOperatiune ? new Date(data.dataOperatiune) : new Date();

    if (valoareContor > vehicul.valoareContorCurent) {
      await this.prisma.vehicul.update({
        where: { id: vehicul.id },
        data: { valoareContorCurent: valoareContor },
      });

      await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: vehicul.id,
          valoareContor,
          dataInregistrare: dataOp,
          sursa: 'SERVICE',
          operator: data.mecanic,
          observatii: `Înregistrat la ${data.tipOperatiune}: ${cantitate}L ${data.tipLichid}`,
        },
      });
    }

    let pretPerLitru = 25;
    let articolUlei = null;

    if (data.articolStocId) {
      articolUlei = await this.prisma.articolStoc.findUnique({ where: { id: data.articolStocId } });
    } else {
      articolUlei = await this.prisma.articolStoc.findFirst({
        where: {
          OR: [
            { categorie: 'Lubrifianți' },
            { denumire: { contains: 'Ulei' } },
          ],
        },
      });
    }

    if (articolUlei) {
      pretPerLitru = articolUlei.pretUnitar || 25;
      if (articolUlei.stocCurent >= cantitate) {
        await this.prisma.articolStoc.update({
          where: { id: articolUlei.id },
          data: { stocCurent: articolUlei.stocCurent - cantitate },
        });
      }
    }

    const costTotal = cantitate * pretPerLitru;

    const completare = await this.prisma.completareLichid.create({
      data: {
        vehiculId: vehicul.id,
        tipLichid: data.tipLichid,
        tipOperatiune: data.tipOperatiune,
        marcaUlei: data.marcaUlei || (articolUlei ? articolUlei.marcaUlei : 'Mobil'),
        cantitateLitri: cantitate,
        pretPerLitru,
        costTotal,
        valoareContor,
        dataCompletare: dataOp,
        mecanic: data.mecanic,
        observatii: data.observatii,
        stareAlerta: 'NOUA',
      },
    });

    if (data.tipOperatiune === 'SCHIMB_ULEI') {
      await this.prisma.configurareUleiVehicul.upsert({
        where: { vehiculId_tipLichid: { vehiculId: vehicul.id, tipLichid: data.tipLichid } },
        update: {
          ultimulSchimbContor: valoareContor,
          ultimulSchimbData: dataOp,
        },
        create: {
          vehiculId: vehicul.id,
          tipLichid: data.tipLichid,
          ultimulSchimbContor: valoareContor,
          ultimulSchimbData: dataOp,
          intervalMth: vehicul.tipMasurare === 'MTH' ? 250 : null,
          intervalKm: vehicul.tipMasurare === 'KM' ? 15000 : null,
          intervalLuni: 12,
        },
      });
    }

    let verificareScurgere = null;
    if (data.tipOperatiune === 'COMPLETARE_ULEI') {
      verificareScurgere = await this.verificaAnomalieScurgere(vehicul.id, data.tipLichid);
      if (verificareScurgere.esteAnomalie) {
        await this.prisma.completareLichid.update({
          where: { id: completare.id },
          data: { alertaScurgereGenerata: true },
        });
      }
    }

    return {
      mesaj: data.tipOperatiune === 'SCHIMB_ULEI'
        ? `✅ SCHIMB ULEI ÎNREGISTRAT! Contorul pentru ${data.tipLichid} a fost RESETAT la ${valoareContor} ${vehicul.tipMasurare}.${articolUlei ? ` (Stoc scos: ${cantitate}L din ${articolUlei.denumire})` : ''}`
        : `Completare ${cantitate}L ${data.tipLichid} înregistrată. Cost: ${costTotal} RON.${articolUlei ? ` (Stoc scos: ${cantitate}L din ${articolUlei.denumire})` : ''}`,
      completare,
      anomalie: verificareScurgere,
    };
  }

  // 3. CENTRALIZATOR MATRICE FLOTA FLUIDE
  async getToateFluideleFlota() {
    const vehicule = await this.prisma.vehicul.findMany({
      include: { configurariUlei: true, completariLichid: { orderBy: { dataCompletare: 'desc' }, take: 5 } },
      orderBy: { numarIntern: 'asc' },
    });

    const rez: any[] = [];
    for (const v of vehicule) {
      const status = await this.getStatusSchimburiUleiVehicul(v.id);
      for (const st of status) {
        rez.push({
          vehiculId: v.id,
          vehiculNumarIntern: v.numarIntern,
          vehiculInmatriculare: v.numarInmatriculare,
          vehiculMarca: v.marca,
          vehiculModel: v.model,
          valoareContorCurent: v.valoareContorCurent,
          tipMasurare: v.tipMasurare,
          ...st,
        });
      }
    }
    return rez;
  }

  async salveazaConfigurareUlei(data: {
    vehiculId: string;
    tipLichid: string;
    intervalKm?: number;
    intervalMth?: number;
    intervalLuni?: number;
    pragAvertizareKm?: number;
    pragAvertizareMth?: number;
    pragAvertizareLuni?: number;
  }) {
    return this.prisma.configurareUleiVehicul.upsert({
      where: { vehiculId_tipLichid: { vehiculId: data.vehiculId, tipLichid: data.tipLichid } },
      update: {
        intervalKm: data.intervalKm !== undefined ? Number(data.intervalKm) : undefined,
        intervalMth: data.intervalMth !== undefined ? Number(data.intervalMth) : undefined,
        intervalLuni: data.intervalLuni !== undefined ? Number(data.intervalLuni) : undefined,
        pragAvertizareKm: data.pragAvertizareKm !== undefined ? Number(data.pragAvertizareKm) : undefined,
        pragAvertizareMth: data.pragAvertizareMth !== undefined ? Number(data.pragAvertizareMth) : undefined,
        pragAvertizareLuni: data.pragAvertizareLuni !== undefined ? Number(data.pragAvertizareLuni) : undefined,
      },
      create: {
        vehiculId: data.vehiculId,
        tipLichid: data.tipLichid,
        intervalKm: data.intervalKm ? Number(data.intervalKm) : null,
        intervalMth: data.intervalMth ? Number(data.intervalMth) : null,
        intervalLuni: data.intervalLuni ? Number(data.intervalLuni) : null,
        pragAvertizareKm: data.pragAvertizareKm ? Number(data.pragAvertizareKm) : 1000,
        pragAvertizareMth: data.pragAvertizareMth ? Number(data.pragAvertizareMth) : 50,
        pragAvertizareLuni: data.pragAvertizareLuni ? Number(data.pragAvertizareLuni) : 1,
      },
    });
  }

  async getStatusSchimburiUleiVehicul(vehiculId: string) {
    const vehicul = await this.prisma.vehicul.findUnique({
      where: { id: vehiculId },
      include: { configurariUlei: true, completariLichid: { orderBy: { dataCompletare: 'desc' } } },
    });

    if (!vehicul) throw new NotFoundException('Vehicul negăsit');

    const acum = new Date();
    const configurari = await this.prisma.configurareUleiVehicul.findMany({
      where: { vehiculId },
    });

    return configurari.map((cfg) => {
      const rulajEfectiv = Math.max(0, vehicul.valoareContorCurent - cfg.ultimulSchimbContor);
      const diffTime = Math.abs(acum.getTime() - new Date(cfg.ultimulSchimbData).getTime());
      const luniTrecute = Number((diffTime / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1));

      let esteDepasit = false;
      let esteInPragAvertizare = false;
      let motivAvertisment = '';

      if (cfg.intervalMth && vehicul.tipMasurare === 'MTH') {
        const mthRamase = cfg.intervalMth - rulajEfectiv;
        if (mthRamase <= 0) {
          esteDepasit = true;
          motivAvertisment = `DEPAȘIT cu ${Math.abs(mthRamase)} mTH! (Prag: ${cfg.intervalMth} mTH)`;
        } else if (mthRamase <= (cfg.pragAvertizareMth || 50)) {
          esteInPragAvertizare = true;
          motivAvertisment = `Avertisment: Au rămas doar ${mthRamase} mTH până la schimb!`;
        }
      }

      if (cfg.intervalKm && vehicul.tipMasurare === 'KM') {
        const kmRamasi = cfg.intervalKm - rulajEfectiv;
        if (kmRamasi <= 0) {
          esteDepasit = true;
          motivAvertisment = `DEPAȘIT cu ${Math.abs(kmRamasi)} KM! (Prag: ${cfg.intervalKm} KM)`;
        } else if (kmRamasi <= (cfg.pragAvertizareKm || 1000)) {
          esteInPragAvertizare = true;
          motivAvertisment = `Avertisment: Au rămas doar ${kmRamasi} KM până la schimb!`;
        }
      }

      if (cfg.intervalLuni) {
        const luniRamase = cfg.intervalLuni - luniTrecute;
        if (luniRamase <= 0 && !esteDepasit) {
          esteDepasit = true;
          motivAvertisment = `DEPAȘIT ca timp! S-au scurs ${luniTrecute} luni din maxim ${cfg.intervalLuni} luni.`;
        } else if (luniRamase <= (cfg.pragAvertizareLuni || 1) && !esteDepasit && !esteInPragAvertizare) {
          esteInPragAvertizare = true;
          motivAvertisment = `Avertisment: Au rămas doar ${luniRamase.toFixed(1)} luni până la schimb!`;
        }
      }

      return {
        ...cfg,
        rulajEfectiv,
        luniTrecute,
        esteDepasit,
        esteInPragAvertizare,
        motivAvertisment,
      };
    });
  }

  async adaugaInregistrareContorManual(data: {
    vehiculId: string;
    valoareContor: number;
    dataInregistrare?: string;
    operator?: string;
    observatii?: string;
  }) {
    const vehicul = await this.prisma.vehicul.findUnique({ where: { id: data.vehiculId } });
    if (!vehicul) throw new NotFoundException('Vehicul negăsit.');

    const valoare = Number(data.valoareContor);
    const dataReg = data.dataInregistrare ? new Date(data.dataInregistrare) : new Date();

    const inregistrare = await this.prisma.istoricContorVehicul.create({
      data: {
        vehiculId: vehicul.id,
        valoareContor: valoare,
        dataInregistrare: dataReg,
        sursa: 'MANUAL',
        operator: data.operator || 'Mecanic / Dispecer',
        observatii: data.observatii,
      },
    });

    if (valoare > vehicul.valoareContorCurent) {
      await this.prisma.vehicul.update({
        where: { id: vehicul.id },
        data: { valoareContorCurent: valoare },
      });
    }

    return inregistrare;
  }

  async verificaAnomalieScurgere(vehiculId: string, tipLichid: string) {
    const vehicul = await this.prisma.vehicul.findUnique({ where: { id: vehiculId } });
    if (!vehicul) throw new NotFoundException('Vehicul negăsit');

    const fereastraContor = vehicul.tipMasurare === 'MTH' ? 100 : 2000;
    const contorMinim = Math.max(0, vehicul.valoareContorCurent - fereastraContor);

    const completari = await this.prisma.completareLichid.findMany({
      where: {
        vehiculId,
        tipLichid,
        valoareContor: { gte: contorMinim },
        tipOperatiune: 'COMPLETARE_ULEI',
      },
    });

    const totalLitri = completari.reduce((sum, c) => sum + c.cantitateLitri, 0);

    const pragAdmis = 5.0;
    const esteAnomalie = totalLitri > pragAdmis;

    return {
      vehiculNumar: vehicul.numarInmatriculare || vehicul.numarIntern,
      tipLichid,
      totalLitri,
      pragAdmis,
      esteAnomalie,
      mesaj: esteAnomalie
        ? `Atenție: Posibilă scurgere de ${tipLichid} pe utilajul ${vehicul.numarIntern} (${vehicul.numarInmatriculare})! S-au înregistrat ${totalLitri}L completări în ultimele ${fereastraContor} ${vehicul.tipMasurare}.`
        : `Nivel completare în limite normale (${totalLitri}L / max ${pragAdmis}L).`,
    };
  }

  async rezolvaAlerta(alertaId: string, solutie: string) {
    return this.prisma.completareLichid.update({
      where: { id: alertaId },
      data: {
        stareAlerta: 'REZOLVATA',
        alertaScurgereGenerata: false,
        solutieRezolvare: solutie || 'Constatare și reparație efectuate',
        dataRezolvare: new Date(),
      },
    });
  }

  async getAlerteActive() {
    return this.getAlerteCentralizate();
  }

  // ==========================================
  // REGULI ALERTE MENTENANȚĂ & CONSUMABILE
  // ==========================================

  async getReguliMentenanta() {
    let reguli = await this.prisma.regulaAlertaMentenanta.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (reguli.length === 0) {
      const implicite = [
        {
          denumireOperatiune: 'Schimb ulei motor',
          categorieUtilaj: 'CAP_TRACTOR',
          tipTrigger: 'KM',
          valoareMaxima: 30000,
          avertizareInainte: 2000,
          stare: 'ACTIV',
        },
        {
          denumireOperatiune: 'Schimb ulei motor',
          categorieUtilaj: 'INCARCATOR_FRONTAL',
          tipTrigger: 'MTH',
          valoareMaxima: 1000,
          avertizareInainte: 100,
          stare: 'ACTIV',
        },
        {
          denumireOperatiune: 'Suflare filtru aer',
          categorieUtilaj: 'TOATE',
          tipTrigger: 'ZILE',
          valoareMaxima: 45,
          avertizareInainte: 5,
          stare: 'ACTIV',
        },
      ];

      for (const r of implicite) {
        await this.prisma.regulaAlertaMentenanta.create({ data: r });
      }

      reguli = await this.prisma.regulaAlertaMentenanta.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return reguli;
  }

  async createRegulaMentenanta(data: {
    denumireOperatiune: string;
    categorieUtilaj?: string;
    tipTrigger: string;
    valoareMaxima: number;
    avertizareInainte: number;
    stare?: string;
  }) {
    if (!data.denumireOperatiune) throw new BadRequestException('Denumirea operațiunii este obligatorie.');
    return this.prisma.regulaAlertaMentenanta.create({
      data: {
        denumireOperatiune: data.denumireOperatiune,
        categorieUtilaj: data.categorieUtilaj || 'TOATE',
        tipTrigger: data.tipTrigger || 'KM',
        valoareMaxima: Number(data.valoareMaxima || 0),
        avertizareInainte: Number(data.avertizareInainte || 0),
        stare: data.stare || 'ACTIV',
      },
    });
  }

  async updateRegulaMentenanta(id: string, data: any) {
    return this.prisma.regulaAlertaMentenanta.update({
      where: { id },
      data: {
        ...(data.denumireOperatiune ? { denumireOperatiune: data.denumireOperatiune } : {}),
        ...(data.categorieUtilaj ? { categorieUtilaj: data.categorieUtilaj } : {}),
        ...(data.tipTrigger ? { tipTrigger: data.tipTrigger } : {}),
        ...(data.valoareMaxima !== undefined ? { valoareMaxima: Number(data.valoareMaxima) } : {}),
        ...(data.avertizareInainte !== undefined ? { avertizareInainte: Number(data.avertizareInainte) } : {}),
        ...(data.stare ? { stare: data.stare } : {}),
      },
    });
  }

  async deleteRegulaMentenanta(id: string) {
    return this.prisma.regulaAlertaMentenanta.delete({ where: { id } });
  }

  // ==========================================
  // DOCUMENTE VEHICULE (ITP, RCA, ROVINIETA, TAHOGRAF, COPIE CONFORMA)
  // ==========================================

  async getDocumenteVehicule(vehiculId?: string) {
    const where: any = {};
    if (vehiculId) where.vehiculId = vehiculId;
    return this.prisma.documentVehicul.findMany({
      where,
      include: { vehicul: true },
      orderBy: { dataExpirare: 'asc' },
    });
  }

  async upsertDocumentVehicul(data: {
    vehiculId: string;
    tipDocument: string;
    dataExpirare: string | Date;
    zileAvertizareInainte?: number;
    serieDocument?: string;
    emitent?: string;
    observatii?: string;
  }) {
    if (!data.vehiculId || !data.tipDocument) throw new BadRequestException('Vehiculul și tipul documentului sunt obligatorii.');

    const dataExp = new Date(data.dataExpirare);
    const zile = data.zileAvertizareInainte !== undefined ? Number(data.zileAvertizareInainte) : 30;

    return this.prisma.documentVehicul.upsert({
      where: { vehiculId_tipDocument: { vehiculId: data.vehiculId, tipDocument: data.tipDocument } },
      update: {
        dataExpirare: dataExp,
        zileAvertizareInainte: zile,
        serieDocument: data.serieDocument || null,
        emitent: data.emitent || null,
        observatii: data.observatii || null,
      },
      create: {
        vehiculId: data.vehiculId,
        tipDocument: data.tipDocument,
        dataExpirare: dataExp,
        zileAvertizareInainte: zile,
        serieDocument: data.serieDocument || null,
        emitent: data.emitent || null,
        observatii: data.observatii || null,
      },
    });
  }

  async deleteDocumentVehicul(id: string) {
    return this.prisma.documentVehicul.delete({ where: { id } });
  }

  // ==========================================
  // ALERTE PERSONALIZATE & LICENȚE FIRMĂ
  // ==========================================

  async getAlertePersonalizate() {
    let alerte = await this.prisma.alertaPersonalizata.findMany({
      orderBy: { dataExpirare: 'asc' },
    });

    if (alerte.length === 0) {
      const implicite = [
        {
          titlu: 'Licență Firmă Transport',
          categorie: 'LICENTA_FIRMA',
          dataExpirare: new Date('2026-12-31'),
          zileAvertizareInainte: 30,
          responsabil: 'Brașoveanu Virgil',
          observatii: 'Licență de transport marfă generală valabilă până la sf. anului 2026',
        },
        {
          titlu: 'Atestat Profesional Șofer (Popescu I.)',
          categorie: 'ATESTAT_SOFER',
          dataExpirare: new Date('2026-12-31'),
          zileAvertizareInainte: 30,
          responsabil: 'Dispecerat Atelier',
          observatii: 'Atestat marfă șofer vehicule grele',
        },
      ];

      for (const a of implicite) {
        await this.prisma.alertaPersonalizata.create({ data: a });
      }

      alerte = await this.prisma.alertaPersonalizata.findMany({
        orderBy: { dataExpirare: 'asc' },
      });
    }

    return alerte;
  }

  async createAlertaPersonalizata(data: {
    titlu: string;
    categorie?: string;
    dataExpirare: string | Date;
    zileAvertizareInainte?: number;
    responsabil?: string;
    observatii?: string;
  }) {
    if (!data.titlu || !data.dataExpirare) throw new BadRequestException('Titlul și data de expirare sunt obligatorii.');

    return this.prisma.alertaPersonalizata.create({
      data: {
        titlu: data.titlu,
        categorie: data.categorie || 'LICENTA_FIRMA',
        dataExpirare: new Date(data.dataExpirare),
        zileAvertizareInainte: data.zileAvertizareInainte !== undefined ? Number(data.zileAvertizareInainte) : 30,
        responsabil: data.responsabil || null,
        observatii: data.observatii || null,
      },
    });
  }

  async updateAlertaPersonalizata(id: string, data: any) {
    return this.prisma.alertaPersonalizata.update({
      where: { id },
      data: {
        ...(data.titlu ? { titlu: data.titlu } : {}),
        ...(data.categorie ? { categorie: data.categorie } : {}),
        ...(data.dataExpirare ? { dataExpirare: new Date(data.dataExpirare) } : {}),
        ...(data.zileAvertizareInainte !== undefined ? { zileAvertizareInainte: Number(data.zileAvertizareInainte) } : {}),
        ...(data.responsabil !== undefined ? { responsabil: data.responsabil } : {}),
        ...(data.observatii !== undefined ? { observatii: data.observatii } : {}),
        ...(data.stare ? { stare: data.stare } : {}),
      },
    });
  }

  async deleteAlertaPersonalizata(id: string) {
    return this.prisma.alertaPersonalizata.delete({ where: { id } });
  }

  // ==========================================
  // CENTRALIZATOR INTEGRAL ALERTE ACTIVE MULTI-CATEGORIE
  // ==========================================

  // ==========================================
  // BASELINE DATA PER VEHICUL (VALOARE DE BAZĂ ALERTE)
  // ==========================================

  async getBaselinesVehicul(vehiculId: string) {
    const vehicul = await this.prisma.vehicul.findUnique({
      where: { id: vehiculId },
      include: { executiiReguli: { include: { regulaAlerta: true } } },
    });
    if (!vehicul) throw new NotFoundException('Vehicul negăsit.');

    const toateRegulile = await this.getReguliMentenanta();
    const reguliAplicabile = toateRegulile.filter(
      (r) => r.categorieUtilaj === 'TOATE' || r.categorieUtilaj === vehicul.categorieEnum
    );

    const acum = new Date();

    return reguliAplicabile.map((regula) => {
      const executie = vehicul.executiiReguli.find((e) => e.regulaAlertaId === regula.id);
      const ultimulSchimbContor = executie ? executie.ultimulSchimbContor : 0;
      const ultimulSchimbData = executie ? executie.ultimulSchimbData : vehicul.createdAt;

      let rulajEfectiv = 0;
      if (regula.tipTrigger === 'KM' || regula.tipTrigger === 'MTH') {
        rulajEfectiv = Math.max(0, vehicul.valoareContorCurent - ultimulSchimbContor);
      } else if (regula.tipTrigger === 'ZILE') {
        const diffMs = Math.abs(acum.getTime() - new Date(ultimulSchimbData).getTime());
        rulajEfectiv = Math.floor(diffMs / (1000 * 3600 * 24));
      }

      const ramase = regula.valoareMaxima - rulajEfectiv;
      const pragAvertizare = regula.valoareMaxima - regula.avertizareInainte;
      const esteDepasit = rulajEfectiv >= regula.valoareMaxima;
      const esteInPrag = !esteDepasit && rulajEfectiv >= pragAvertizare;

      return {
        regulaId: regula.id,
        denumireOperatiune: regula.denumireOperatiune,
        categorieUtilaj: regula.categorieUtilaj,
        tipTrigger: regula.tipTrigger,
        valoareMaxima: regula.valoareMaxima,
        avertizareInainte: regula.avertizareInainte,
        ultimulSchimbContor,
        ultimulSchimbData,
        valoareContorCurent: vehicul.valoareContorCurent,
        tipMasurareVehicul: vehicul.tipMasurare,
        rulajEfectiv,
        ramase,
        esteDepasit,
        esteInPrag,
        statusBadge: esteDepasit ? 'CRITIC' : esteInPrag ? 'AVERTIZARE' : 'OK',
      };
    });
  }

  async setBaselineVehicul(data: {
    vehiculId: string;
    regulaAlertaId: string;
    ultimulSchimbContor: number;
    ultimulSchimbData?: string | Date;
    observatii?: string;
  }) {
    const dataSchimb = data.ultimulSchimbData ? new Date(data.ultimulSchimbData) : new Date();

    return this.prisma.executieRegulaVehicul.upsert({
      where: {
        vehiculId_regulaAlertaId: {
          vehiculId: data.vehiculId,
          regulaAlertaId: data.regulaAlertaId,
        },
      },
      update: {
        ultimulSchimbContor: Number(data.ultimulSchimbContor || 0),
        ultimulSchimbData: dataSchimb,
        observatii: data.observatii || null,
      },
      create: {
        vehiculId: data.vehiculId,
        regulaAlertaId: data.regulaAlertaId,
        ultimulSchimbContor: Number(data.ultimulSchimbContor || 0),
        ultimulSchimbData: dataSchimb,
        observatii: data.observatii || null,
      },
    });
  }

  // ==========================================
  // CENTRALIZATOR INTEGRAL ALERTE ACTIVE MULTI-CATEGORIE
  // ==========================================

  async getAlerteCentralizate() {
    const listaAlerte: any[] = [];
    const acum = new Date();

    // 1. Alerte Scurgeri Ulei
    const scurgeri = await this.prisma.completareLichid.findMany({
      where: { alertaScurgereGenerata: true, stareAlerta: { not: 'REZOLVATA' } },
      include: { vehicul: true },
    });

    scurgeri.forEach((c) => {
      listaAlerte.push({
        id: `scurgere-${c.id}`,
        dbId: c.id,
        categorieAlert: 'SCURGERI_ULEI',
        categorieText: '💧 Detector Scurgere Ulei',
        titlu: `Anomalie Nivel Ulei pe ${c.vehicul?.numarIntern}`,
        vehiculId: c.vehiculId,
        vehiculNumar: c.vehicul?.numarIntern,
        urgenta: 'CRITIC',
        mesaj: `S-au adăugat ${c.cantitateLitri}L ${c.tipLichid} în sub 100 mTH / 2000 KM! Scurgere pe șantier.`,
        dataReferinta: c.dataCompletare,
        modCalcul: `${c.cantitateLitri} Litri adăugați de ${c.mecanic}`,
      });
    });

    // 2. Alerte Reguli Mentenanță & Consumabile (KM, mTH, Zile) - Bazate pe executiiReguli baseline!
    const reguliMentenanta = await this.getReguliMentenanta();
    const vehicule = await this.prisma.vehicul.findMany({
      include: { executiiReguli: true },
    });

    reguliMentenanta.forEach((regula) => {
      if (regula.stare !== 'ACTIV') return;

      vehicule.forEach((v) => {
        if (regula.categorieUtilaj !== 'TOATE' && v.categorieEnum !== regula.categorieUtilaj) return;

        const executie = v.executiiReguli.find((e) => e.regulaAlertaId === regula.id);
        const ultimulContor = executie ? executie.ultimulSchimbContor : 0;
        const ultimaData = executie ? executie.ultimulSchimbData : v.createdAt;

        let rulajEfectiv = 0;
        if (regula.tipTrigger === 'KM' || regula.tipTrigger === 'MTH') {
          rulajEfectiv = Math.max(0, v.valoareContorCurent - ultimulContor);
        } else if (regula.tipTrigger === 'ZILE') {
          const diffMs = Math.abs(acum.getTime() - new Date(ultimaData).getTime());
          rulajEfectiv = Math.floor(diffMs / (1000 * 3600 * 24));
        }

        const pragAvertizare = regula.valoareMaxima - regula.avertizareInainte;
        if (rulajEfectiv >= pragAvertizare) {
          const esteDepasit = rulajEfectiv >= regula.valoareMaxima;
          listaAlerte.push({
            id: `regula-${regula.id}-${v.id}`,
            dbId: regula.id,
            categorieAlert: 'MENTENANTA_CONSUMABIL',
            categorieText: '🛠️ Consumabile & Mentenanță',
            titlu: `${regula.denumireOperatiune} - ${v.numarIntern}`,
            vehiculId: v.id,
            vehiculNumar: v.numarIntern,
            urgenta: esteDepasit ? 'CRITIC' : 'AVERTIZARE',
            mesaj: esteDepasit
              ? `DEPAȘIT cu ${rulajEfectiv - regula.valoareMaxima} ${regula.tipTrigger}! Rulaj de la ultimul schimb: ${rulajEfectiv} ${regula.tipTrigger} (Maxim: ${regula.valoareMaxima} ${regula.tipTrigger})`
              : `Avertizare în prealabil: Au trecut ${rulajEfectiv} ${regula.tipTrigger} de la ultimul schimb (Avertizare cu ${regula.avertizareInainte} ${regula.tipTrigger} înainte de limita ${regula.valoareMaxima})`,
            dataReferinta: ultimaData,
            modCalcul: `Ultimul schimb: ${ultimulContor} ${regula.tipTrigger} la ${new Date(ultimaData).toLocaleDateString('ro-RO')}`,
          });
        }
      });
    });

    // 3. Alerte Documente Legale Flotă (ITP, RCA, Rovinietă, Tahograf, Copie Conformă)
    const documente = await this.prisma.documentVehicul.findMany({
      include: { vehicul: true },
    });

    documente.forEach((doc) => {
      const dataExp = new Date(doc.dataExpirare);
      const diffMs = dataExp.getTime() - acum.getTime();
      const zileRamase = Math.ceil(diffMs / (1000 * 3600 * 24));

      if (zileRamase <= doc.zileAvertizareInainte) {
        const esteExpirat = zileRamase <= 0;
        listaAlerte.push({
          id: `doc-${doc.id}`,
          dbId: doc.id,
          categorieAlert: 'DOCUMENTE_FLOTA',
          categorieText: '📄 Documente Legale Flotă',
          titlu: `Document ${doc.tipDocument} - ${doc.vehicul?.numarIntern} (${doc.vehicul?.numarInmatriculare})`,
          vehiculId: doc.vehiculId,
          vehiculNumar: doc.vehicul?.numarIntern,
          urgenta: esteExpirat ? 'CRITIC' : 'AVERTIZARE',
          mesaj: esteExpirat
            ? `EXPIRAT! Documentul ${doc.tipDocument} a expirat pe data de ${dataExp.toLocaleDateString('ro-RO')}`
            : `Atenție: Documentul ${doc.tipDocument} expiră în ${zileRamase} zile (Dată expirare: ${dataExp.toLocaleDateString('ro-RO')})`,
          dataReferinta: dataExp,
          modCalcul: `Notificare setată cu ${doc.zileAvertizareInainte} zile înainte`,
        });
      }
    });

    // 4. Alerte Personalizate / Licențe & Atestate Firmă
    const alerteCust = await this.prisma.alertaPersonalizata.findMany({
      where: { stare: 'ACTIV' },
    });

    alerteCust.forEach((ac) => {
      const dataExp = new Date(ac.dataExpirare);
      const diffMs = dataExp.getTime() - acum.getTime();
      const zileRamase = Math.ceil(diffMs / (1000 * 3600 * 24));

      if (zileRamase <= ac.zileAvertizareInainte) {
        const esteExpirat = zileRamase <= 0;
        listaAlerte.push({
          id: `custom-${ac.id}`,
          dbId: ac.id,
          categorieAlert: 'LICENTE_CUSTOM',
          categorieText: '🔏 Licențe & Atestate Firmă',
          titlu: `${ac.titlu}`,
          vehiculId: null,
          vehiculNumar: ac.responsabil || 'Firmă',
          urgenta: esteExpirat ? 'CRITIC' : 'AVERTIZARE',
          mesaj: esteExpirat
            ? `EXPIRAT! ${ac.titlu} a expirat pe data de ${dataExp.toLocaleDateString('ro-RO')}`
            : `Atenție: ${ac.titlu} expiră în ${zileRamase} zile! Dată expirare: ${dataExp.toLocaleDateString('ro-RO')}`,
          dataReferinta: dataExp,
          modCalcul: `Notificare setată cu ${ac.zileAvertizareInainte} zile înainte`,
        });
      }
    });

    return listaAlerte.sort((a, b) => (a.urgenta === 'CRITIC' ? -1 : 1));
  }
}
