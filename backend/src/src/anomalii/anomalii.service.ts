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
    const completariAnormale = await this.prisma.completareLichid.findMany({
      where: { alertaScurgereGenerata: true, stareAlerta: { not: 'REZOLVATA' } },
      include: { vehicul: true },
      orderBy: { dataCompletare: 'desc' },
    });

    return completariAnormale.map((c) => ({
      id: c.id,
      vehicul: `${c.vehicul?.marca || 'Utilaj'} ${c.vehicul?.model || ''} (${c.vehicul?.numarIntern || ''})`,
      tipLichid: c.tipLichid,
      cantitateLitri: c.cantitateLitri,
      valoareContor: c.valoareContor,
      data: c.dataCompletare,
      stareAlerta: c.stareAlerta,
      mesaj: `Atenție: Posibilă scurgere de ${c.tipLichid} pe utilajul ${c.vehicul?.numarIntern || ''}! (${c.cantitateLitri}L adăugați de ${c.mecanic})`,
    }));
  }
}
