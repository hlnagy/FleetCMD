import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StocuriGarantiiService } from '../stocuri-garantii/stocuri-garantii.service';
import * as fs from 'fs';
import * as path from 'path';
const AdmZip = require('adm-zip');
const { XMLParser } = require('fast-xml-parser');

@Injectable()
export class AnomaliiService {
  constructor(
    private prisma: PrismaService,
    private stocuriGarantiiService: StocuriGarantiiService,
  ) {}

  getTipuriUleiStandard() {
    return [
      { id: 'ULEI_MOTOR', nume: 'Ulei Motor (10W-40 / 15W-40 / 5W-30)' },
      { id: 'ULEI_HIDRAULIC', nume: 'Ulei Hidraulic (HLP 46 / HVLP 46)' },
      { id: 'ULEI_TRANSMISIE', nume: 'Ulei Transmisie & Diferențial (80W-90 / 75W-90)' },
      { id: 'ANTIGEL_G12', nume: 'Antigel G12+ (Lichid Răcire Roz / Organic)' },
      { id: 'ANTIGEL_G11', nume: 'Antigel G11 (Lichid Răcire Albastru / Clasic)' },
      { id: 'ADBLUE', nume: 'AdBlue (Soluție Uree 32.5%)' },
      { id: 'ULEI_LIEBHERR_PUNTE', nume: 'Ulei - Liebherr Punte față + spate' },
      { id: 'ULEI_LIEBHERR_CUTIE', nume: 'Ulei - Liebherr Cutie Viteze' },
      { id: 'ULEI_CUTIE_MANUALA', nume: 'Ulei Cutie Manuală' },
      { id: 'ULEI_CUTIE_AUTOMATA', nume: 'Ulei Cutie Automată' },
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
          { AND: [{ categorie: { contains: 'Ulei' } }, { denumire: { contains: data.marcaUlei } }] },
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
          categorie: 'Ulei Motor',
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
        cantitateRamasa: cantitate,
        pretUnitar: pretPerLitru,
        pretTotal: pretTotal,
        observatii: data.observatii,
      },
    });

    return {
      mesaj: `Intrare în stoc recepționată cu succes! S-au adăugat ${cantitate}L ${denumire} (${pretPerLitru} RON/L) la stocul curent (${articol.stocCurent}L total). Factură: ${data.numarFactura}`,
      articol,
      intrare,
      pretPerLitru,
    };
  }

  // 2. IESIRI ULEI & FLUIDE (Consum FIFO din depozit)
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

    const isSchimb = data.tipOperatiune.includes('SCHIMB');
    const sursaOp = isSchimb ? 'SCHIMB_ULEI' : 'COMPLETARE_ULEI';

    await this.prisma.istoricContorVehicul.create({
      data: {
        vehiculId: vehicul.id,
        valoareContor,
        dataInregistrare: dataOp,
        sursa: sursaOp,
        operator: data.mecanic,
        observatii: `Înregistrat la ${data.tipOperatiune}: ${cantitate}L ${data.tipLichid} (${data.marcaUlei || ''})`,
      },
    });

    if (valoareContor > vehicul.valoareContorCurent) {
      if (vehicul.categorieEnum === 'CAP_TRACTOR') {
        const delta = valoareContor - vehicul.valoareContorCurent;
        const activeCoupling = await this.prisma.istoricCuplare.findFirst({
          where: { capTractorId: vehicul.id, esteActiv: true },
          include: { semiremorca: true },
        });

        if (activeCoupling && activeCoupling.semiremorca) {
          const valNouaSemi = Number((activeCoupling.semiremorca.valoareContorCurent + delta).toFixed(2));
          await this.prisma.vehicul.update({
            where: { id: activeCoupling.semiremorca.id },
            data: { valoareContorCurent: valNouaSemi, dataInregistrareContor: dataOp },
          });

          await this.prisma.istoricContorVehicul.create({
            data: {
              vehiculId: activeCoupling.semiremorca.id,
              valoareContor: valNouaSemi,
              dataInregistrare: dataOp,
              sursa: 'CUPLARE_CAP_TRACTOR',
              operator: 'Sistem Cuplare Dinamică',
              observatii: `Rulaj acumulat automat la ${data.tipOperatiune} Cap Tractor ${vehicul.numarIntern}: +${delta} KM`,
            },
          });
        }
      }

      await this.prisma.vehicul.update({
        where: { id: vehicul.id },
        data: { valoareContorCurent: valoareContor, dataInregistrareContor: dataOp },
      });
    }

    let pretPerLitru = 25;
    let costTotal = cantitate * pretPerLitru;
    let articolUlei = null;
    let fifoResult = null;

    if (data.articolStocId) {
      articolUlei = await this.prisma.articolStoc.findUnique({ where: { id: data.articolStocId } });
    } else {
      // Căutare inteligentă articol în funcție de tipLichid
      const tipLower = data.tipLichid.toLowerCase();
      articolUlei = await this.prisma.articolStoc.findFirst({
        where: {
          OR: [
            { categorie: { contains: tipLower.includes('hidraulic') ? 'Hidraulic' : tipLower.includes('antigel') ? 'Antigel' : tipLower.includes('adblue') ? 'AdBlue' : 'Motor' } },
            { denumire: { contains: data.marcaUlei || 'Ulei' } },
          ],
        },
      });
    }

    if (articolUlei) {
      try {
        fifoResult = await this.stocuriGarantiiService.consumaStocFIFO(articolUlei.id, cantitate);
        costTotal = fifoResult.costTotal;
        pretPerLitru = fifoResult.pretUnitarMediu;
      } catch (err) {
        // Fallback dacă stocul din loturi nu este complet
        pretPerLitru = articolUlei.pretUnitar || 25;
        costTotal = Number((cantitate * pretPerLitru).toFixed(2));
        if (articolUlei.stocCurent >= cantitate) {
          await this.prisma.articolStoc.update({
            where: { id: articolUlei.id },
            data: { stocCurent: Math.max(0, articolUlei.stocCurent - cantitate) },
          });
        }
      }
    }

    const completare = await this.prisma.completareLichid.create({
      data: {
        vehiculId: vehicul.id,
        articolStocId: articolUlei ? articolUlei.id : null,
        tipLichid: data.tipLichid,
        tipOperatiune: data.tipOperatiune,
        marcaUlei: data.marcaUlei || (articolUlei ? (articolUlei.marcaUlei || articolUlei.denumire) : 'Standard'),
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

    if (isSchimb) {
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
    if (!isSchimb) {
      verificareScurgere = await this.verificaAnomalieScurgere(vehicul.id, data.tipLichid);
      if (verificareScurgere.esteAnomalie) {
        await this.prisma.completareLichid.update({
          where: { id: completare.id },
          data: { alertaScurgereGenerata: true },
        });
      }
    }

    const operatiuneNume = isSchimb ? 'SCHIMB COMPLET' : 'COMPLETARE';
    return {
      mesaj: isSchimb
        ? ` ${operatiuneNume} ÎNREGISTRAT! Contorul pentru ${data.tipLichid} a fost RESETAT la ${valoareContor} ${vehicul.tipMasurare}.${articolUlei ? ` (Consumat FIFO: ${cantitate}L din ${articolUlei.denumire}, Preț FIFO: ${pretPerLitru} RON/L, Cost total: ${costTotal} RON)` : ''}`
        : `Completare ${cantitate}L ${data.tipLichid} înregistrată. Cost FIFO: ${costTotal} RON (${pretPerLitru} RON/L).${articolUlei ? ` (Stoc dedus din ${articolUlei.denumire})` : ''}`,
      completare,
      anomalie: verificareScurgere,
      fifoResult,
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

  async rezolvaAlerta(data: any, solutieFallback?: string) {
    let payload: {
      dbId: string;
      categorieAlert?: string;
      vehiculId?: string;
      solutie?: string;
      dataExpirareNoua?: string;
    };

    if (typeof data === 'string') {
      payload = {
        dbId: data,
        categorieAlert: 'SCURGERI_ULEI',
        solutie: solutieFallback,
      };
    } else {
      payload = data;
    }

    const { dbId, categorieAlert, vehiculId, solutie } = payload;

    // 1. Scurgeri Ulei
    if (categorieAlert === 'SCURGERI_ULEI' || !categorieAlert) {
      try {
        return await this.prisma.completareLichid.update({
          where: { id: dbId },
          data: {
            stareAlerta: 'REZOLVATA',
            alertaScurgereGenerata: false,
            solutieRezolvare: solutie || 'Constatare și reparație efectuate',
            dataRezolvare: new Date(),
          },
        });
      } catch (err) {
        // If not found in completareLichid, continue checking other types
      }
    }

    // 2. Mentenanță & Consumabile (Reguli de alertă per vehicul)
    if (categorieAlert === 'MENTENANTA_CONSUMABIL') {
      if (!vehiculId) throw new BadRequestException('Vehicul ID este necesar.');
      const vehicul = await this.prisma.vehicul.findUnique({ where: { id: vehiculId } });
      if (!vehicul) throw new NotFoundException('Vehiculul nu a fost găsit.');

      return this.prisma.executieRegulaVehicul.upsert({
        where: {
          vehiculId_regulaAlertaId: {
            vehiculId: vehicul.id,
            regulaAlertaId: dbId,
          },
        },
        update: {
          ultimulSchimbContor: Number(vehicul.valoareContorCurent || 0),
          ultimulSchimbData: new Date(),
          observatii: solutie || 'Rezolvat și confirmat din Centrul de Alerte',
        },
        create: {
          vehiculId: vehicul.id,
          regulaAlertaId: dbId,
          ultimulSchimbContor: Number(vehicul.valoareContorCurent || 0),
          ultimulSchimbData: new Date(),
          observatii: solutie || 'Rezolvat și confirmat din Centrul de Alerte',
        },
      });
    }

    // 3. Documente Legale Flotă (ITP, RCA, etc.)
    if (categorieAlert === 'DOCUMENTE_FLOTA') {
      const doc = await this.prisma.documentVehicul.findUnique({ where: { id: dbId } });
      if (!doc) throw new NotFoundException('Documentul nu a fost găsit.');

      let nextExp = new Date();
      nextExp.setFullYear(nextExp.getFullYear() + 1);
      if (payload.dataExpirareNoua) {
        nextExp = new Date(payload.dataExpirareNoua);
      }

      return this.prisma.documentVehicul.update({
        where: { id: dbId },
        data: {
          dataExpirare: nextExp,
          observatii: solutie ? `${doc.observatii ? doc.observatii + ' | ' : ''}${solutie}` : doc.observatii,
        },
      });
    }

    // 4. Licențe & Atestate Firmă
    if (categorieAlert === 'LICENTE_CUSTOM') {
      return this.prisma.alertaPersonalizata.update({
        where: { id: dbId },
        data: {
          stare: 'REZOLVAT',
          observatii: solutie || 'Confirmat și rezolvat din Centrul de Alerte',
        },
      });
    }

    return { mesaj: 'Alerta a fost confirmată și rezolvată cu succes!' };
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
  // DOCUMENTE VEHICULE (ITP, RCA, ROVINIETA, TAHOGRAF, COPIE CONFORMA, CASCO)
  // ==========================================

  async getDocumenteVehicule(query?: {
    vehiculId?: string;
    tipDocument?: string;
    stare?: string;
    expirareStatus?: string; // 'EXPIRAT' | 'CRITIC' | 'AVERTIZARE' | 'OPTIM'
    search?: string;
  }) {
    const where: any = {};
    if (query?.vehiculId) where.vehiculId = query.vehiculId;
    if (query?.tipDocument && query.tipDocument !== 'TOATE') where.tipDocument = query.tipDocument;
    if (query?.stare && query.stare !== 'TOATE') where.stare = query.stare;

    let docs = await this.prisma.documentVehicul.findMany({
      where,
      include: { vehicul: true },
      orderBy: { dataExpirare: 'asc' },
    });

    const acum = new Date();

    // Map remaining days and dynamic status
    let mapped = docs.map((doc) => {
      const dataExp = new Date(doc.dataExpirare);
      const diffMs = dataExp.getTime() - acum.getTime();
      const zileRamase = Math.ceil(diffMs / (1000 * 3600 * 24));
      const esteExpirat = zileRamase <= 0;
      const esteInAvertizare = !esteExpirat && zileRamase <= doc.zileAvertizareInainte;

      let statusCalculat: 'EXPIRAT' | 'CRITIC' | 'AVERTIZARE' | 'OPTIM' = 'OPTIM';
      if (esteExpirat) statusCalculat = 'EXPIRAT';
      else if (zileRamase <= 7) statusCalculat = 'CRITIC';
      else if (esteInAvertizare) statusCalculat = 'AVERTIZARE';

      return {
        ...doc,
        zileRamase,
        statusCalculat,
        esteExpirat,
        esteInAvertizare,
      };
    });

    if (query?.expirareStatus && query.expirareStatus !== 'TOATE') {
      if (query.expirareStatus === 'EXPIRATE') {
        mapped = mapped.filter((d) => d.esteExpirat);
      } else if (query.expirareStatus === 'AVERTIZARE') {
        mapped = mapped.filter((d) => d.esteInAvertizare || d.statusCalculat === 'CRITIC');
      } else if (query.expirareStatus === 'OPTIM') {
        mapped = mapped.filter((d) => d.statusCalculat === 'OPTIM');
      }
    }

    if (query?.search?.trim()) {
      const s = query.search.toLowerCase().trim();
      mapped = mapped.filter((d) => {
        const vNum = (d.vehicul?.numarIntern || '').toLowerCase();
        const vInm = (d.vehicul?.numarInmatriculare || '').toLowerCase();
        const tip = (d.tipDocument || '').toLowerCase();
        const serie = (d.serieDocument || '').toLowerCase();
        const emit = (d.emitent || '').toLowerCase();
        const obs = (d.observatii || '').toLowerCase();
        return vNum.includes(s) || vInm.includes(s) || tip.includes(s) || serie.includes(s) || emit.includes(s) || obs.includes(s);
      });
    }

    return mapped;
  }

  async upsertDocumentVehicul(data: {
    vehiculId: string;
    tipDocument: string;
    dataEmitere?: string | Date;
    dataExpirare: string | Date;
    zileAvertizareInainte?: number;
    serieDocument?: string;
    emitent?: string;
    cost?: number;
    observatii?: string;
    fisierUrl?: string;
    fisierNume?: string;
    fisierMarime?: number;
    stare?: string;
  }) {
    if (!data.vehiculId || !data.tipDocument) throw new BadRequestException('Vehiculul și tipul documentului sunt obligatorii.');

    const dataExp = new Date(data.dataExpirare);
    const dataEm = data.dataEmitere ? new Date(data.dataEmitere) : null;
    const zile = data.zileAvertizareInainte !== undefined ? Number(data.zileAvertizareInainte) : 30;
    const cost = data.cost !== undefined ? Number(data.cost) : null;
    const stare = data.stare || (dataExp < new Date() ? 'EXPIRAT' : 'ACTIV');

    return this.prisma.documentVehicul.upsert({
      where: { vehiculId_tipDocument: { vehiculId: data.vehiculId, tipDocument: data.tipDocument } },
      update: {
        dataEmitere: dataEm,
        dataExpirare: dataExp,
        zileAvertizareInainte: zile,
        serieDocument: data.serieDocument || null,
        emitent: data.emitent || null,
        cost,
        observatii: data.observatii || null,
        fisierUrl: data.fisierUrl !== undefined ? data.fisierUrl : undefined,
        fisierNume: data.fisierNume !== undefined ? data.fisierNume : undefined,
        fisierMarime: data.fisierMarime !== undefined ? data.fisierMarime : undefined,
        stare,
      },
      create: {
        vehiculId: data.vehiculId,
        tipDocument: data.tipDocument,
        dataEmitere: dataEm,
        dataExpirare: dataExp,
        zileAvertizareInainte: zile,
        serieDocument: data.serieDocument || null,
        emitent: data.emitent || null,
        cost,
        observatii: data.observatii || null,
        fisierUrl: data.fisierUrl || null,
        fisierNume: data.fisierNume || null,
        fisierMarime: data.fisierMarime || null,
        stare,
      },
    });
  }

  async updateDocumentVehicul(id: string, data: any) {
    const updateData: any = {};
    if (data.tipDocument) updateData.tipDocument = data.tipDocument;
    if (data.dataExpirare) updateData.dataExpirare = new Date(data.dataExpirare);
    if (data.dataEmitere !== undefined) updateData.dataEmitere = data.dataEmitere ? new Date(data.dataEmitere) : null;
    if (data.zileAvertizareInainte !== undefined) updateData.zileAvertizareInainte = Number(data.zileAvertizareInainte);
    if (data.serieDocument !== undefined) updateData.serieDocument = data.serieDocument || null;
    if (data.emitent !== undefined) updateData.emitent = data.emitent || null;
    if (data.cost !== undefined) updateData.cost = data.cost ? Number(data.cost) : null;
    if (data.observatii !== undefined) updateData.observatii = data.observatii || null;
    if (data.fisierUrl !== undefined) updateData.fisierUrl = data.fisierUrl || null;
    if (data.fisierNume !== undefined) updateData.fisierNume = data.fisierNume || null;
    if (data.fisierMarime !== undefined) updateData.fisierMarime = data.fisierMarime ? Number(data.fisierMarime) : null;
    if (data.stare) updateData.stare = data.stare;

    return this.prisma.documentVehicul.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteDocumentVehicul(id: string) {
    return this.prisma.documentVehicul.delete({ where: { id } });
  }

  // ==========================================
  // IMPORT AUTOMAT DIN VALABILITATE ACTE MASINI (ODS)
  // ==========================================

  async importOdsDocumente(customPath?: string) {
    const defaultPath = path.resolve(process.env.USERPROFILE || 'C:\\Users\\user', 'Downloads', 'Valabilitate acte masini 2025.ods');
    const targetFile = customPath || defaultPath;

    if (!fs.existsSync(targetFile)) {
      throw new NotFoundException(`Fișierul ODS nu a fost găsit la calea: ${targetFile}`);
    }

    return this.processOdsFile(targetFile);
  }

  async processOdsFile(filePathOrBuffer: string | Buffer) {
    const zip = new AdmZip(filePathOrBuffer);
    const contentXml = zip.readAsText('content.xml');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(contentXml);

    const spreadsheet = parsed['office:document-content']?.['office:body']?.['office:spreadsheet'];
    if (!spreadsheet) {
      throw new BadRequestException('Structură fișier ODS invalidă.');
    }

    const tables = Array.isArray(spreadsheet['table:table']) ? spreadsheet['table:table'] : [spreadsheet['table:table']];

    // Pre-încărcăm vehiculele existente și categoriile
    const vehiculeExistente = await this.prisma.vehicul.findMany();
    const vehiculeMap = new Map<string, any>();
    for (const v of vehiculeExistente) {
      vehiculeMap.set(this.normalizeReg(v.numarInmatriculare), v);
      vehiculeMap.set(this.normalizeReg(v.numarIntern), v);
    }

    const categories = await this.prisma.categorieVehicul.findMany();
    const validCats = new Set(categories.map((c) => c.nume));

    let createdVehicles = 0;
    let importedDocs = 0;
    let updatedDocs = 0;
    const errors: string[] = [];

    for (const table of tables) {
      const sheetName = table['@_table:name'] || '';
      if (sheetName === 'HOME') continue;

      const rows = Array.isArray(table['table:table-row']) ? table['table:table-row'] : [table['table:table-row']];

      for (const row of rows) {
        if (!row || !row['table:table-cell']) continue;
        const cells = Array.isArray(row['table:table-cell']) ? row['table:table-cell'] : [row['table:table-cell']];

        const rowValues: string[] = [];
        for (const cell of cells) {
          const repeated = parseInt(cell['@_table:number-columns-repeated'] || '1', 10);
          let text = '';
          if (cell['text:p']) {
            if (Array.isArray(cell['text:p'])) {
              text = cell['text:p'].map((p: any) => (typeof p === 'object' ? (p['#text'] || '') : String(p))).join(' ');
            } else if (typeof cell['text:p'] === 'object') {
              text = cell['text:p']['#text'] || '';
            } else {
              text = String(cell['text:p']);
            }
          }
          text = text.trim();
          if (repeated > 20 && !text) continue;
          const count = Math.min(repeated, 50);
          for (let i = 0; i < count; i++) {
            rowValues.push(text);
          }
        }

        if (rowValues.length >= 3) {
          const rawVeh = (rowValues[0] || '').trim();
          const rawDoc = (rowValues[1] || '').trim();
          const rawExp = (rowValues[2] || '').trim();
          const rawObs = (rowValues[5] || '').trim();

          if (!rawVeh || !rawDoc || !rawExp) continue;
          if (['CAMION', 'SEMIREMORCA', 'DENUMIRE DOCUMENT', 'SCHIMBATI DATA', 'MENIU'].includes(rawVeh)) continue;
          if (['DENUMIRE DOCUMENT'].includes(rawDoc)) continue;

          // Parsare dată expirare
          const dateExp = this.parseDateRo(rawExp);
          if (!dateExp) {
            errors.push(`Dată invalidă pentru ${rawVeh} - ${rawDoc}: ${rawExp}`);
            continue;
          }

          // Mapare tip document
          const tipDoc = this.mapTipDocument(rawDoc);

          // Căutare sau creare vehicul
          const normReg = this.normalizeReg(rawVeh);
          let vehicul = vehiculeMap.get(normReg);

          if (!vehicul) {
            let cat = 'CAP_TRACTOR';
            if (sheetName.includes('SEMIREMORCI') || rawObs.toUpperCase().includes('SEMIREMORCA')) {
              cat = 'SEMIREMORCA';
            } else if (rawObs.toUpperCase().includes('BASCULA')) {
              cat = 'BASCULANTA';
            }
            if (!validCats.has(cat)) {
              cat = categories[0]?.nume || 'CAP_TRACTOR';
            }

            try {
              vehicul = await this.prisma.vehicul.create({
                data: {
                  numarIntern: rawVeh,
                  numarInmatriculare: rawVeh,
                  marca: 'Auto',
                  model: rawObs || (cat === 'SEMIREMORCA' ? 'Semiremorcă Flotă' : 'Cap Tractor'),
                  anFabricatie: 2020,
                  categorieEnum: cat,
                  tipMasurare: 'KM',
                  stare: 'ACTIV',
                },
              });
              vehiculeMap.set(normReg, vehicul);
              createdVehicles++;
            } catch (e: any) {
              const existing = await this.prisma.vehicul.findFirst({
                where: { OR: [{ numarIntern: rawVeh }, { numarInmatriculare: rawVeh }] },
              });
              if (existing) {
                vehicul = existing;
                vehiculeMap.set(normReg, vehicul);
              } else {
                errors.push(`Eroare creare vehicul ${rawVeh}: ${e.message}`);
                continue;
              }
            }
          }

          // Upsert DocumentVehicul
          try {
            const existingDoc = await this.prisma.documentVehicul.findUnique({
              where: {
                vehiculId_tipDocument: {
                  vehiculId: vehicul.id,
                  tipDocument: tipDoc,
                },
              },
            });

            if (existingDoc) {
              await this.prisma.documentVehicul.update({
                where: { id: existingDoc.id },
                data: {
                  dataExpirare: dateExp,
                  observatii: rawObs || existingDoc.observatii,
                  stare: dateExp < new Date() ? 'EXPIRAT' : 'ACTIV',
                },
              });
              updatedDocs++;
            } else {
              await this.prisma.documentVehicul.create({
                data: {
                  vehiculId: vehicul.id,
                  tipDocument: tipDoc,
                  dataExpirare: dateExp,
                  zileAvertizareInainte: 30,
                  observatii: rawObs || null,
                  stare: dateExp < new Date() ? 'EXPIRAT' : 'ACTIV',
                },
              });
              importedDocs++;
            }
          } catch (e: any) {
            errors.push(`Eroare salvare document ${rawVeh} ${tipDoc}: ${e.message}`);
          }
        }
      }
    }

    return {
      succes: true,
      vehiculeNoiCreate: createdVehicles,
      documenteNoiImportate: importedDocs,
      documenteActualizate: updatedDocs,
      totalProcesate: importedDocs + updatedDocs,
      erori: errors,
    };
  }

  private normalizeReg(reg: string): string {
    return (reg || '').toUpperCase().replace(/[\s\-_.]/g, '');
  }

  private parseDateRo(dateStr: string): Date | null {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 1990 && year <= 2100) {
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
      }
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  private mapTipDocument(docStr: string): string {
    const d = docStr.toUpperCase().trim();
    if (d.includes('I.T.P') || d.includes('ITP')) return 'ITP';
    if (d.includes('ASIG') || d.includes('RCA')) return 'RCA';
    if (d.includes('ROVIN')) return 'ROVINIETA';
    if (d.includes('COPIE') || d.includes('CONF')) return 'COPIE_CONFORMA';
    if (d.includes('TAHO')) return 'VERIFICARE_TAHOGRAF';
    if (d.includes('CASCO')) return 'CASCO';
    return d.replace(/[\s\.]/g, '_');
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
      if (regula.tipTrigger === 'KM' || regula.tipTrigger === 'MTH' || regula.tipTrigger === 'mTH' || regula.tipTrigger === 'ORE') {
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
        categorieText: 'Detector Scurgere Ulei',
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
        if (regula.tipTrigger === 'KM' || regula.tipTrigger === 'MTH' || regula.tipTrigger === 'mTH' || regula.tipTrigger === 'ORE') {
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
            categorieText: 'Consumabile & Mentenanță',
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

    // 3. Alerte Documente Legale Flotă (ITP, RCA, Rovinietă, Tahograf, Copie Conformă, CASCO)
    const documente = await this.prisma.documentVehicul.findMany({
      include: { vehicul: true },
    });

    const docLabels: Record<string, string> = {
      ITP: 'I.T.P.',
      RCA: 'Asigurare RCA',
      ROVINIETA: 'Rovinietă',
      COPIE_CONFORMA: 'Copie Conformă',
      VERIFICARE_TAHOGRAF: 'Verificare Tahograf',
      CASCO: 'Poliță CASCO',
    };

    documente.forEach((doc) => {
      const dataExp = new Date(doc.dataExpirare);
      const diffMs = dataExp.getTime() - acum.getTime();
      const zileRamase = Math.ceil(diffMs / (1000 * 3600 * 24));

      if (zileRamase <= doc.zileAvertizareInainte) {
        const esteExpirat = zileRamase <= 0;
        const docLabel = docLabels[doc.tipDocument] || doc.tipDocument;
        listaAlerte.push({
          id: `doc-${doc.id}`,
          dbId: doc.id,
          categorieAlert: 'DOCUMENTE_FLOTA',
          categorieText: 'Documente Legale Flotă',
          titlu: `${docLabel} - ${doc.vehicul?.numarIntern} (${doc.vehicul?.numarInmatriculare})`,
          vehiculId: doc.vehiculId,
          vehiculNumar: doc.vehicul?.numarIntern,
          urgenta: (esteExpirat || zileRamase <= 7) ? 'CRITIC' : 'AVERTIZARE',
          mesaj: esteExpirat
            ? `EXPIRAT! ${docLabel} a expirat pe data de ${dataExp.toLocaleDateString('ro-RO')} (depășit cu ${Math.abs(zileRamase)} zile)`
            : `Atenție: ${docLabel} expiră în ${zileRamase} zile (Dată expirare: ${dataExp.toLocaleDateString('ro-RO')})`,
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
          categorieText: 'Licențe & Atestate Firmă',
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

    // 5. Alerte Stoc Critic & Aprovizionare Piese / Uleiuri
    const articoleStoc = await this.prisma.articolStoc.findMany({
      include: { depozit: true },
    });

    articoleStoc.forEach((art) => {
      if (art.stocCurent <= art.stocMinim) {
        const esteEpuizat = art.stocCurent <= 0;
        const lipsa = Math.max(0, art.stocMinim - art.stocCurent);
        listaAlerte.push({
          id: `stoc-critic-${art.id}`,
          dbId: art.id,
          categorieAlert: 'STOC_CRITIC',
          categorieText: 'Stoc Critic',
          titlu: `Stoc critic: ${art.denumire} (${art.codArticol})`,
          vehiculId: null,
          vehiculNumar: art.depozit?.nume || 'Depozit Central',
          urgenta: esteEpuizat ? 'CRITIC' : 'AVERTIZARE',
          mesaj: esteEpuizat
            ? `STOC EPUIZAT! Cantitate disponibilă: 0 ${art.unitateMasura} (Limita minimă: ${art.stocMinim} ${art.unitateMasura}) în ${art.depozit?.nume || 'Depozit'}`
            : `Stoc sub limita minimă! Disponibil: ${art.stocCurent} ${art.unitateMasura} (Limita minimă: ${art.stocMinim} ${art.unitateMasura}, necesar: +${lipsa} ${art.unitateMasura})`,
          dataReferinta: art.updatedAt || art.createdAt,
          modCalcul: `Depozit: ${art.depozit?.nume || 'Depozit Central'} • Preț: ${art.pretUnitar} RON/${art.unitateMasura}`,
          linkDirect: '/stocuri?tab=stoc',
        });
      }
    });

    return listaAlerte.sort((a, b) => (a.urgenta === 'CRITIC' ? -1 : 1));
  }
}
