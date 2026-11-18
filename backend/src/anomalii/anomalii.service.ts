import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StocuriGarantiiService } from '../stocuri-garantii/stocuri-garantii.service';
import {
  DEFAULT_TIPURI_FLUIDE,
  TIP_LICHID_LABELS,
  isMthTipMasurare,
} from '../common/fluid.utils';
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

  private parsePresetsJson(raw?: string | null, fallback: number[] = []): number[] {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0)
        : fallback;
    } catch {
      return fallback;
    }
  }

  private formatTipFluid(row: any) {
    return {
      id: row.cod,
      dbId: row.id,
      cod: row.cod,
      nume: row.nume,
      descriere: row.descriere || '',
      accentColor: row.accentColor || 'amber',
      recomandat: row.recomandat || '',
      presetKm: this.parsePresetsJson(row.presetKmJson, [15000, 30000]),
      presetMth: this.parsePresetsJson(row.presetMthJson, [250, 500]),
      esteStandard: Boolean(row.esteStandard),
      ordine: Number(row.ordine || 0),
      activ: row.activ !== false,
    };
  }

  private async asiguraTipuriFluideStandard() {
    const count = await this.prisma.tipFluid.count();
    if (count === 0) {
      for (const f of DEFAULT_TIPURI_FLUIDE) {
        await this.prisma.tipFluid.upsert({
          where: { cod: f.cod },
          update: {},
          create: {
            cod: f.cod,
            nume: f.nume,
            descriere: f.descriere,
            accentColor: f.accentColor,
            recomandat: f.recomandat,
            presetKmJson: JSON.stringify(f.presetKm),
            presetMthJson: JSON.stringify(f.presetMth),
            esteStandard: true,
            ordine: f.ordine,
            activ: true,
          },
        });
      }
    }
  }

  async getTipFluidLabelsMap(): Promise<Record<string, string>> {
    await this.asiguraTipuriFluideStandard();
    const rows = await this.prisma.tipFluid.findMany({
      select: { cod: true, nume: true },
    });
    const map: Record<string, string> = { ...TIP_LICHID_LABELS };
    for (const r of rows) {
      if (r.cod && r.nume) map[r.cod] = r.nume;
    }
    return map;
  }

  async getTipuriUleiStandard() {
    await this.asiguraTipuriFluideStandard();
    const rows = await this.prisma.tipFluid.findMany({
      where: { activ: true },
      orderBy: [{ ordine: 'asc' }, { nume: 'asc' }],
    });
    return rows.map((r) => this.formatTipFluid(r));
  }

  async createTipFluid(data: {
    cod?: string;
    nume: string;
    descriere?: string;
    accentColor?: string;
    recomandat?: string;
    presetKm?: number[];
    presetMth?: number[];
  }) {
    await this.asiguraTipuriFluideStandard();
    const cleanNume = String(data.nume || '').trim();
    if (!cleanNume) {
      throw new BadRequestException('Denumirea tipului de lubrifiant este obligatorie.');
    }

    const toSlugCod = (txt: string) =>
      txt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48);

    const hasExplicitCod = Boolean(data.cod && data.cod.trim());
    let cod = toSlugCod(hasExplicitCod ? data.cod! : cleanNume);
    if (!cod) cod = `FLUID_${Date.now().toString().slice(-6)}`;

    if (hasExplicitCod) {
      const exists = await this.prisma.tipFluid.findUnique({ where: { cod } });
      if (exists) {
        throw new BadRequestException(`Există deja un tip de lubrifiant cu codul "${cod}".`);
      }
    } else {
      let candidate = cod;
      let idx = 2;
      while (await this.prisma.tipFluid.findUnique({ where: { cod: candidate } })) {
        candidate = `${cod}_${idx}`;
        idx++;
      }
      cod = candidate;
    }

    const maxAgg = await this.prisma.tipFluid.aggregate({ _max: { ordine: true } });
    const presetKm = Array.isArray(data.presetKm) && data.presetKm.length > 0
      ? data.presetKm.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [15000, 30000, 50000];
    const presetMth = Array.isArray(data.presetMth) && data.presetMth.length > 0
      ? data.presetMth.map(Number).filter((n) => Number.isFinite(n) && n > 0)
      : [250, 500, 1000];

    const created = await this.prisma.tipFluid.create({
      data: {
        cod,
        nume: cleanNume,
        descriere: data.descriere?.trim() || null,
        accentColor: data.accentColor?.trim() || 'amber',
        recomandat: data.recomandat?.trim() || null,
        presetKmJson: JSON.stringify(presetKm),
        presetMthJson: JSON.stringify(presetMth),
        esteStandard: false,
        ordine: Number(maxAgg._max.ordine || 10) + 1,
        activ: true,
      },
    });

    return this.formatTipFluid(created);
  }

  async updateTipFluid(
    idOrCod: string,
    data: {
      nume?: string;
      descriere?: string;
      accentColor?: string;
      recomandat?: string;
      presetKm?: number[];
      presetMth?: number[];
      activ?: boolean;
    },
  ) {
    const existing = await this.prisma.tipFluid.findFirst({
      where: { OR: [{ id: idOrCod }, { cod: idOrCod }] },
    });
    if (!existing) {
      throw new NotFoundException('Tipul de lubrifiant nu a fost găsit.');
    }

    const cleanNume = data.nume !== undefined ? String(data.nume).trim() : undefined;
    if (cleanNume !== undefined && !cleanNume) {
      throw new BadRequestException('Denumirea tipului de lubrifiant nu poate fi empty.');
    }

    const updated = await this.prisma.tipFluid.update({
      where: { id: existing.id },
      data: {
        nume: cleanNume,
        descriere: data.descriere !== undefined ? (data.descriere?.trim() || null) : undefined,
        accentColor: data.accentColor !== undefined ? (data.accentColor?.trim() || 'amber') : undefined,
        recomandat: data.recomandat !== undefined ? (data.recomandat?.trim() || null) : undefined,
        presetKmJson:
          Array.isArray(data.presetKm)
            ? JSON.stringify(data.presetKm.map(Number).filter((n) => Number.isFinite(n) && n > 0))
            : undefined,
        presetMthJson:
          Array.isArray(data.presetMth)
            ? JSON.stringify(data.presetMth.map(Number).filter((n) => Number.isFinite(n) && n > 0))
            : undefined,
        activ: data.activ !== undefined ? Boolean(data.activ) : undefined,
      },
    });

    return this.formatTipFluid(updated);
  }

  async deleteTipFluid(idOrCod: string) {
    const existing = await this.prisma.tipFluid.findFirst({
      where: { OR: [{ id: idOrCod }, { cod: idOrCod }] },
    });
    if (!existing) {
      throw new NotFoundException('Tipul de lubrifiant nu a fost găsit.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.configurareUleiCategorie.deleteMany({ where: { tipLichid: existing.cod } });
      await tx.configurareUleiVehicul.deleteMany({ where: { tipLichid: existing.cod } });
      await tx.subcategorieStoc.updateMany({ where: { tipLichid: existing.cod }, data: { tipLichid: null } });
      await tx.articolStoc.updateMany({ where: { tipLichid: existing.cod }, data: { tipLichid: null } });
      await tx.tipFluid.delete({ where: { id: existing.id } });
    });

    return { succes: true, cod: existing.cod, nume: existing.nume };
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
          tipLichid: data.tipLichid || articol.tipLichid,
        },
      });
    } else {
      articol = await this.prisma.articolStoc.create({
        data: {
          codArticol,
          denumire,
          categorie: 'Ulei Motor',
          tipLichid: data.tipLichid || null,
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

  // Helper partajat pentru calculul stării normelor de fluide ale unui vehicul (KM, mTH, Luni)
  private computeVehicleFluidStatuses(
    vehicul: any,
    catNorme: any[],
    acum: Date = new Date(),
  ) {
    const isMth = isMthTipMasurare(vehicul.tipMasurare);
    const unitateMasura = isMth ? 'mTH' : 'KM';
    const configurari = [...(vehicul.configurariUlei || [])];

    for (const cn of catNorme) {
      if (!configurari.some((c) => c.tipLichid === cn.tipLichid)) {
        configurari.push({
          id: `cat-${cn.id}`,
          vehiculId: vehicul.id,
          tipLichid: cn.tipLichid,
          intervalKm: cn.intervalKm,
          intervalMth: cn.intervalMth,
          intervalLuni: cn.intervalLuni,
          pragAvertizareKm: cn.pragAvertizareKm,
          pragAvertizareMth: cn.pragAvertizareMth,
          pragAvertizareLuni: cn.pragAvertizareLuni,
          ultimulSchimbContor: vehicul.valoareContorInitial || vehicul.valoareContorCurent || 0,
          ultimulSchimbData: vehicul.createdAt || acum,
        });
      }
    }

    const completariList: any[] = vehicul.completariLichid || [];

    return configurari.map((cfg) => {
      const rulajEfectiv = Math.max(0, Number(vehicul.valoareContorCurent || 0) - Number(cfg.ultimulSchimbContor || 0));
      const diffTime = Math.max(0, acum.getTime() - new Date(cfg.ultimulSchimbData).getTime());
      const luniTrecute = Number((diffTime / (1000 * 60 * 60 * 24 * 30.44)).toFixed(1));

      let esteDepasit = false;
      let esteInPragAvertizare = false;
      let motivAvertisment = '';

      const intervalPrincipal = isMth ? cfg.intervalMth : cfg.intervalKm;
      const pragPrincipal = isMth ? (cfg.pragAvertizareMth || 50) : (cfg.pragAvertizareKm || 1000);
      const rulajRamas = intervalPrincipal ? Number((intervalPrincipal - rulajEfectiv).toFixed(1)) : null;
      const procentConsum = intervalPrincipal && intervalPrincipal > 0
        ? Math.min(150, Math.round((rulajEfectiv / intervalPrincipal) * 100))
        : null;

      if (intervalPrincipal) {
        if (rulajRamas !== null && rulajRamas <= 0) {
          esteDepasit = true;
          motivAvertisment = `DEPĂȘIT cu ${Math.abs(rulajRamas)} ${unitateMasura}! (Normă: ${intervalPrincipal} ${unitateMasura})`;
        } else if (rulajRamas !== null && rulajRamas <= pragPrincipal) {
          esteInPragAvertizare = true;
          motivAvertisment = `Avertizare: Au rămas ${rulajRamas} ${unitateMasura} până la schimb!`;
        }
      }

      const luniRamase = cfg.intervalLuni ? Number((cfg.intervalLuni - luniTrecute).toFixed(1)) : null;
      if (cfg.intervalLuni && luniRamase !== null) {
        if (luniRamase <= 0 && !esteDepasit) {
          esteDepasit = true;
          motivAvertisment = `DEPĂȘIT ca timp! S-au scurs ${luniTrecute} luni din maxim ${cfg.intervalLuni} luni.`;
        } else if (luniRamase <= (cfg.pragAvertizareLuni || 1) && !esteDepasit && !esteInPragAvertizare) {
          esteInPragAvertizare = true;
          motivAvertisment = `Avertizare: Au rămas ${Math.max(0, luniRamase).toFixed(1)} luni până la schimb!`;
        }
      }

      const matchingLogs = completariList.filter((c) => c.tipLichid === cfg.tipLichid);
      const ultimaCompletare = matchingLogs[0] || null;
      const totalLitriCompletati = Number(
        matchingLogs
          .filter((c) => !String(c.tipOperatiune || '').toUpperCase().includes('SCHIMB'))
          .reduce((sum, c) => sum + Number(c.cantitateLitri || 0), 0)
          .toFixed(1),
      );

      return {
        ...cfg,
        unitateMasura,
        rulajEfectiv,
        rulajRamas,
        intervalPrincipal,
        pragPrincipal,
        procentConsum,
        luniTrecute,
        luniRamase,
        esteDepasit,
        esteInPragAvertizare,
        motivAvertisment,
        ultimaCompletareData: ultimaCompletare?.dataCompletare || null,
        ultimaCompletareLitri: ultimaCompletare?.cantitateLitri || null,
        totalLitriCompletati,
      };
    });
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
    faraDeducereStoc?: boolean;
  }) {
    const vehicul = await this.prisma.vehicul.findUnique({ where: { id: data.vehiculId } });
    if (!vehicul) throw new NotFoundException('Vehiculul nu a fost găsit.');

    const cantitate = Number(data.cantitateLitri);
    if (!cantitate || cantitate <= 0) {
      throw new BadRequestException('Cantitatea trebuie să fie mai mare ca 0.');
    }

    const inputContor = Number(data.valoareContor || 0);
    const effectiveContor = inputContor > 0 ? inputContor : Number(vehicul.valoareContorCurent || 0);
    const isMth = isMthTipMasurare(vehicul.tipMasurare);

    let dataOp = new Date();
    if (data.dataOperatiune) {
      if (typeof data.dataOperatiune === 'string' && data.dataOperatiune.includes('-')) {
        const parts = data.dataOperatiune.split('-');
        if (parts.length === 3) {
          dataOp = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        } else {
          dataOp = new Date(data.dataOperatiune);
        }
      } else {
        dataOp = new Date(data.dataOperatiune);
      }
    }

    const isSchimb = String(data.tipOperatiune || '').toUpperCase().includes('SCHIMB');
    const sursaOp = isSchimb ? 'SCHIMB_ULEI' : 'COMPLETARE_ULEI';

    let pretPerLitru = 0;
    let costTotal = 0;
    let articolUlei: any = null;
    let fifoResult: any = null;

    if (!data.faraDeducereStoc && data.articolStocId && String(data.articolStocId).trim() !== '') {
      articolUlei = await this.prisma.articolStoc.findUnique({ where: { id: data.articolStocId } });
      if (!articolUlei) {
        throw new NotFoundException('Articolul de fluid selectat nu a fost găsit în depozit.');
      }
      if (Number(articolUlei.stocCurent || 0) < cantitate) {
        throw new BadRequestException(
          `Stoc insuficient pentru "${articolUlei.denumire}": disponibil ${articolUlei.stocCurent} ${articolUlei.unitateMasura || 'L'}, solicitat ${cantitate} L.`
        );
      }

      try {
        fifoResult = await this.stocuriGarantiiService.consumaStocFIFO(articolUlei.id, cantitate);
        costTotal = fifoResult.costTotal;
        pretPerLitru = fifoResult.pretUnitarMediu;
      } catch (err) {
        // Fallback doar când stocul fizic >= cantitate dar lipsesc loturi de intrare istorice
        pretPerLitru = Number(articolUlei.pretUnitar || 0);
        costTotal = Number((cantitate * pretPerLitru).toFixed(2));
        await this.prisma.articolStoc.update({
          where: { id: articolUlei.id },
          data: { stocCurent: Math.max(0, Number((articolUlei.stocCurent - cantitate).toFixed(2))) },
        });
      }
    }

    if (inputContor > 0) {
      await this.prisma.istoricContorVehicul.create({
        data: {
          vehiculId: vehicul.id,
          valoareContor: inputContor,
          dataInregistrare: dataOp,
          sursa: sursaOp,
          operator: data.mecanic,
          observatii: `Înregistrat la ${data.tipOperatiune}: ${cantitate}L ${data.tipLichid} (${data.marcaUlei || articolUlei?.denumire || ''})`,
        },
      });

      if (inputContor > vehicul.valoareContorCurent) {
        if (vehicul.categorieEnum === 'CAP_TRACTOR') {
          const delta = inputContor - vehicul.valoareContorCurent;
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
          data: { valoareContorCurent: inputContor, dataInregistrareContor: dataOp },
        });
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
        valoareContor: effectiveContor,
        dataCompletare: dataOp,
        mecanic: data.mecanic || 'Atelier',
        observatii: data.observatii,
        stareAlerta: 'NOUA',
      },
    });

    if (isSchimb) {
      await this.prisma.configurareUleiVehicul.upsert({
        where: { vehiculId_tipLichid: { vehiculId: vehicul.id, tipLichid: data.tipLichid } },
        update: {
          ultimulSchimbContor: effectiveContor,
          ultimulSchimbData: dataOp,
        },
        create: {
          vehiculId: vehicul.id,
          tipLichid: data.tipLichid,
          ultimulSchimbContor: effectiveContor,
          ultimulSchimbData: dataOp,
          intervalMth: isMth ? 250 : null,
          intervalKm: !isMth ? 15000 : null,
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

    const labelsMap = await this.getTipFluidLabelsMap();
    const tipLabel = labelsMap[data.tipLichid] || data.tipLichid;
    const operatiuneNume = isSchimb ? 'SCHIMB COMPLET' : 'COMPLETARE';
    return {
      mesaj: isSchimb
        ? `${operatiuneNume} ÎNREGISTRAT! Contorul pentru ${tipLabel} a fost RESETAT la ${effectiveContor} ${vehicul.tipMasurare}.${articolUlei ? ` (Consumat FIFO: ${cantitate}L din ${articolUlei.denumire}, Preț FIFO: ${pretPerLitru} RON/L, Cost total: ${costTotal} RON)` : ''}`
        : `Completare ${cantitate}L ${tipLabel} înregistrată.${articolUlei ? ` Cost FIFO: ${costTotal} RON (${pretPerLitru} RON/L) · Stoc dedus din ${articolUlei.denumire}` : ''}`,
      completare,
      anomalie: verificareScurgere,
      fifoResult,
    };
  }

  // Anulare / ștergere intervenție fluid de sine stătătoare (doar fără comandă de lucru asociată)
  async stergeCompletareLichid(id: string) {
    const rec = await this.prisma.completareLichid.findUnique({
      where: { id },
      include: { articolStoc: true },
    });
    if (!rec) throw new NotFoundException('Înregistrarea de fluid nu a fost găsită.');
    if (rec.comandaLucruId) {
      throw new BadRequestException(
        'Această intervenție provine dintr-o Comandă de Lucru. Devalidați sau anulați comanda de lucru pentru a o elimina în siguranță.'
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (rec.articolStocId) {
        await tx.articolStoc.update({
          where: { id: rec.articolStocId },
          data: { stocCurent: { increment: rec.cantitateLitri } },
        });
      }
      await tx.completareLichid.delete({ where: { id } });

      if (String(rec.tipOperatiune || '').toUpperCase().includes('SCHIMB')) {
        const prevSchimb = await tx.completareLichid.findFirst({
          where: {
            vehiculId: rec.vehiculId,
            tipLichid: rec.tipLichid,
            tipOperatiune: { contains: 'SCHIMB' },
          },
          orderBy: { dataCompletare: 'desc' },
        });
        if (prevSchimb) {
          await tx.configurareUleiVehicul.updateMany({
            where: { vehiculId: rec.vehiculId, tipLichid: rec.tipLichid },
            data: {
              ultimulSchimbContor: prevSchimb.valoareContor,
              ultimulSchimbData: prevSchimb.dataCompletare,
            },
          });
        }
      }
    });

    return {
      succes: true,
      mesaj: 'Înregistrarea de fluid a fost eliminată și stocul restaurat.',
    };
  }

  // 3. CENTRALIZATOR MATRICE FLOTA FLUIDE (optimizat, zero N+1)
  async getToateFluideleFlota() {
    const [vehicule, allCatNorme] = await Promise.all([
      this.prisma.vehicul.findMany({
        where: { stare: { notIn: ['CASAT', 'VANDUT'] } },
        include: {
          configurariUlei: true,
          completariLichid: { orderBy: { dataCompletare: 'desc' }, take: 25 },
        },
        orderBy: { numarIntern: 'asc' },
      }),
      this.prisma.configurareUleiCategorie.findMany(),
    ]);

    const catMap = new Map<string, any[]>();
    for (const cn of allCatNorme) {
      if (!catMap.has(cn.categorieEnum)) catMap.set(cn.categorieEnum, []);
      catMap.get(cn.categorieEnum)!.push(cn);
    }

    const acum = new Date();
    const rez: any[] = [];
    for (const v of vehicule) {
      const catNorme = v.categorieEnum ? (catMap.get(v.categorieEnum) || []) : [];
      const statuses = this.computeVehicleFluidStatuses(v, catNorme, acum);
      for (const st of statuses) {
        rez.push({
          vehiculId: v.id,
          vehiculNumarIntern: v.numarIntern,
          vehiculInmatriculare: v.numarInmatriculare,
          vehiculCategorie: v.categorieEnum,
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

  async getConfigurariUleiCategorii() {
    const categorii = await this.prisma.categorieVehicul.findMany({
      include: {
        configurariUlei: {
          orderBy: { tipLichid: 'asc' },
        },
        vehicule: {
          select: { id: true, tipMasurare: true, stare: true },
        },
      },
      orderBy: { nume: 'asc' },
    });

    return categorii.map((c) => {
      const activeVehicule = c.vehicule.filter((v) => v.stare !== 'CASAT');
      const mthCount = activeVehicule.filter((v) => (v.tipMasurare || '').toUpperCase() === 'MTH').length;
      const kmCount = activeVehicule.filter((v) => (v.tipMasurare || '').toUpperCase() === 'KM').length;
      
      // Dacă categoria are utilaje MTH sau implicitul este MTH
      let tipMasurare = c.tipMasurareImplicit || 'KM';
      if (mthCount > kmCount) {
        tipMasurare = 'MTH';
      }

      return {
        id: c.id,
        nume: c.nume,
        descriere: c.descriere,
        tipMasurareImplicit: tipMasurare,
        totalVehicule: c.vehicule.length,
        vehiculeActive: activeVehicule.length,
        norme: c.configurariUlei,
      };
    });
  }

  async salveazaConfigurareUleiCategorie(data: {
    categorieEnum: string;
    tipLichid: string;
    intervalKm?: number;
    intervalMth?: number;
    intervalLuni?: number;
    pragAvertizareKm?: number;
    pragAvertizareMth?: number;
    pragAvertizareLuni?: number;
  }) {
    if (!data.categorieEnum || !data.tipLichid) {
      throw new BadRequestException('Categoria și tipul de fluid sunt obligatorii.');
    }

    const catNorma = await this.prisma.configurareUleiCategorie.upsert({
      where: {
        categorieEnum_tipLichid: {
          categorieEnum: data.categorieEnum,
          tipLichid: data.tipLichid,
        },
      },
      update: {
        intervalKm: data.intervalKm !== undefined ? (data.intervalKm ? Number(data.intervalKm) : null) : undefined,
        intervalMth: data.intervalMth !== undefined ? (data.intervalMth ? Number(data.intervalMth) : null) : undefined,
        intervalLuni: data.intervalLuni !== undefined ? (data.intervalLuni ? Number(data.intervalLuni) : null) : undefined,
        pragAvertizareKm: data.pragAvertizareKm !== undefined ? (data.pragAvertizareKm ? Number(data.pragAvertizareKm) : null) : undefined,
        pragAvertizareMth: data.pragAvertizareMth !== undefined ? (data.pragAvertizareMth ? Number(data.pragAvertizareMth) : null) : undefined,
        pragAvertizareLuni: data.pragAvertizareLuni !== undefined ? (data.pragAvertizareLuni ? Number(data.pragAvertizareLuni) : null) : undefined,
      },
      create: {
        categorieEnum: data.categorieEnum,
        tipLichid: data.tipLichid,
        intervalKm: data.intervalKm ? Number(data.intervalKm) : null,
        intervalMth: data.intervalMth ? Number(data.intervalMth) : null,
        intervalLuni: data.intervalLuni ? Number(data.intervalLuni) : null,
        pragAvertizareKm: data.pragAvertizareKm ? Number(data.pragAvertizareKm) : (data.intervalKm ? 1000 : null),
        pragAvertizareMth: data.pragAvertizareMth ? Number(data.pragAvertizareMth) : (data.intervalMth ? 50 : null),
        pragAvertizareLuni: data.pragAvertizareLuni ? Number(data.pragAvertizareLuni) : 1,
      },
    });

    // Propagăm norma pe toate vehiculele din această categorie
    const vehicule = await this.prisma.vehicul.findMany({
      where: { categorieEnum: data.categorieEnum },
    });

    for (const v of vehicule) {
      await this.prisma.configurareUleiVehicul.upsert({
        where: { vehiculId_tipLichid: { vehiculId: v.id, tipLichid: data.tipLichid } },
        update: {
          intervalKm: data.intervalKm ? Number(data.intervalKm) : null,
          intervalMth: data.intervalMth ? Number(data.intervalMth) : null,
          intervalLuni: data.intervalLuni ? Number(data.intervalLuni) : null,
          pragAvertizareKm: data.pragAvertizareKm ? Number(data.pragAvertizareKm) : null,
          pragAvertizareMth: data.pragAvertizareMth ? Number(data.pragAvertizareMth) : null,
          pragAvertizareLuni: data.pragAvertizareLuni ? Number(data.pragAvertizareLuni) : null,
        },
        create: {
          vehiculId: v.id,
          tipLichid: data.tipLichid,
          intervalKm: data.intervalKm ? Number(data.intervalKm) : null,
          intervalMth: data.intervalMth ? Number(data.intervalMth) : null,
          intervalLuni: data.intervalLuni ? Number(data.intervalLuni) : null,
          pragAvertizareKm: data.pragAvertizareKm ? Number(data.pragAvertizareKm) : (data.intervalKm ? 1000 : null),
          pragAvertizareMth: data.pragAvertizareMth ? Number(data.pragAvertizareMth) : (data.intervalMth ? 50 : null),
          pragAvertizareLuni: data.pragAvertizareLuni ? Number(data.pragAvertizareLuni) : 1,
          ultimulSchimbContor: v.valoareContorCurent || 0,
          ultimulSchimbData: new Date(),
        },
      });
    }

    return {
      succes: true,
      mesaj: `Norma pentru "${data.tipLichid}" a fost salvată pe categoria "${data.categorieEnum}" și aplicată pe ${vehicule.length} utilaje.`,
      numarVehiculeAfectate: vehicule.length,
      norma: catNorma,
    };
  }

  async stergeConfigurareUleiCategorie(id: string) {
    const norma = await this.prisma.configurareUleiCategorie.findUnique({
      where: { id },
    });
    if (!norma) {
      throw new NotFoundException('Norma de categorie nu a fost găsită.');
    }

    // Ștergem și configurările individuale propagate pe vehiculele din această categorie
    if (norma.categorieEnum && norma.tipLichid) {
      const vehicule = await this.prisma.vehicul.findMany({
        where: { categorieEnum: norma.categorieEnum },
        select: { id: true },
      });
      const vIds = vehicule.map((v) => v.id);
      if (vIds.length > 0) {
        await this.prisma.configurareUleiVehicul.deleteMany({
          where: {
            vehiculId: { in: vIds },
            tipLichid: norma.tipLichid,
          },
        });
      }
    }

    await this.prisma.configurareUleiCategorie.delete({ where: { id } });
    return { succes: true, mesaj: 'Norma a fost ștearsă cu succes.' };
  }

  async stergeNormaCategorieDupaTip(categorieEnum: string, tipLichid: string) {
    const norma = await this.prisma.configurareUleiCategorie.findUnique({
      where: {
        categorieEnum_tipLichid: { categorieEnum, tipLichid },
      },
    });

    if (norma) {
      await this.prisma.configurareUleiCategorie.delete({
        where: { id: norma.id },
      });
    }

    const vehicule = await this.prisma.vehicul.findMany({
      where: { categorieEnum },
      select: { id: true },
    });
    const vIds = vehicule.map((v) => v.id);
    if (vIds.length > 0) {
      await this.prisma.configurareUleiVehicul.deleteMany({
        where: {
          vehiculId: { in: vIds },
          tipLichid,
        },
      });
    }

    return {
      succes: true,
      mesaj: `Norma pentru "${tipLichid}" a fost ștearsă / dezactivată de pe categoria "${categorieEnum}".`,
    };
  }

  async getStatusSchimburiUleiVehicul(vehiculId: string) {
    const vehicul = await this.prisma.vehicul.findUnique({
      where: { id: vehiculId },
      include: {
        configurariUlei: true,
        completariLichid: { orderBy: { dataCompletare: 'desc' }, take: 25 },
      },
    });

    if (!vehicul) throw new NotFoundException('Vehicul negăsit');

    const catNorme = vehicul.categorieEnum
      ? await this.prisma.configurareUleiCategorie.findMany({
          where: { categorieEnum: vehicul.categorieEnum },
        })
      : [];

    return this.computeVehicleFluidStatuses(vehicul, catNorme, new Date());
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

    const isMth = isMthTipMasurare(vehicul.tipMasurare);
    const unitLabel = isMth ? 'mTH' : 'KM';
    const fereastraContor = isMth ? 100 : 2000;
    const contorMinim = Math.max(0, vehicul.valoareContorCurent - fereastraContor);

    const completari = await this.prisma.completareLichid.findMany({
      where: {
        vehiculId,
        tipLichid,
        valoareContor: { gte: contorMinim },
        tipOperatiune: { startsWith: 'COMPLETARE' },
      },
    });

    const totalLitri = completari.reduce((sum, c) => sum + c.cantitateLitri, 0);

    const pragAdmis = 5.0;
    const esteAnomalie = totalLitri > pragAdmis;

    const labelsMap = await this.getTipFluidLabelsMap();
    const tipLabel = labelsMap[tipLichid] || tipLichid;
    return {
      vehiculNumar: vehicul.numarInmatriculare || vehicul.numarIntern,
      tipLichid,
      totalLitri,
      pragAdmis,
      esteAnomalie,
      mesaj: esteAnomalie
        ? `Atenție: Posibilă scurgere de ${tipLabel} pe utilajul ${vehicul.numarIntern} (${vehicul.numarInmatriculare})! S-au înregistrat ${totalLitri}L completări în ultimele ${fereastraContor} ${unitLabel}.`
        : `Nivel completare în limite normale (${totalLitri}L / max ${pragAdmis}L).`,
    };
  }

  async rezolvaAlerta(data: any, solutieFallback?: string) {
    let payload: {
      dbId: string;
      categorieAlert?: string;
      vehiculId?: string;
      tipLichid?: string;
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

    const { dbId, categorieAlert, vehiculId, tipLichid, solutie } = payload;

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

    // 1b. Normă Schimb Ulei / Fluid (Resetare contor la intervenție realizată)
    if (categorieAlert === 'SCHIMB_ULEI') {
      const targetVehId = vehiculId || (String(dbId || '').includes('::') ? String(dbId).split('::')[0] : '');
      const targetTip = tipLichid || (String(dbId || '').includes('::') ? String(dbId).split('::')[1] : 'ULEI_MOTOR');
      if (!targetVehId) throw new BadRequestException('Vehicul ID este necesar pentru resetarea normei.');
      const vehicul = await this.prisma.vehicul.findUnique({ where: { id: targetVehId } });
      if (!vehicul) throw new NotFoundException('Vehiculul nu a fost găsit.');
      const isMth = isMthTipMasurare(vehicul.tipMasurare);

      return this.prisma.configurareUleiVehicul.upsert({
        where: { vehiculId_tipLichid: { vehiculId: vehicul.id, tipLichid: targetTip } },
        update: {
          ultimulSchimbContor: Number(vehicul.valoareContorCurent || 0),
          ultimulSchimbData: new Date(),
        },
        create: {
          vehiculId: vehicul.id,
          tipLichid: targetTip,
          ultimulSchimbContor: Number(vehicul.valoareContorCurent || 0),
          ultimulSchimbData: new Date(),
          intervalMth: isMth ? 250 : null,
          intervalKm: !isMth ? 15000 : null,
          intervalLuni: 12,
        },
      });
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

  async salveazaDocumentFisierInDb(data: {
    filename: string;
    nume: string;
    mimetype: string;
    marime: number;
    filePath?: string;
    buffer?: Buffer;
  }) {
    try {
      let buf = data.buffer;
      if (!buf && data.filePath && fs.existsSync(data.filePath)) {
        buf = fs.readFileSync(data.filePath);
      }
      if (!buf) return null;

      return await this.prisma.documentFisier.upsert({
        where: { filename: data.filename },
        update: {
          nume: data.nume,
          mimetype: data.mimetype,
          marime: data.marime,
          continut: buf,
        },
        create: {
          filename: data.filename,
          nume: data.nume,
          mimetype: data.mimetype,
          marime: data.marime,
          continut: buf,
        },
      });
    } catch (e) {
      console.error('Eroare la salvarea fișierului în baza de date Oracle:', e);
      return null;
    }
  }

  async getDocumentFisierDinDb(filename: string) {
    return this.prisma.documentFisier.findUnique({
      where: { filename },
    });
  }

  async stergeDocumentFisierDinDb(fisierUrl?: string | null) {
    if (!fisierUrl) return;
    const cleanFilename = path.basename(fisierUrl);
    try {
      await this.prisma.documentFisier.deleteMany({
        where: { filename: cleanFilename },
      });
    } catch (e) {
      // Ignorăm eroarea dacă nu exista în DB
    }
  }

  private unlinkDocumentFile(fisierUrl?: string | null) {
    if (!fisierUrl) return;
    const cleanFilename = path.basename(fisierUrl);
    this.stergeDocumentFisierDinDb(fisierUrl);

    const candidates = [
      path.resolve(process.cwd(), 'uploads', 'documente', cleanFilename),
      path.resolve(process.cwd(), 'backend', 'uploads', 'documente', cleanFilename),
      path.resolve(__dirname, '..', '..', 'uploads', 'documente', cleanFilename),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        try {
          fs.unlinkSync(candidate);
        } catch (e) {
          console.error('Eroare la ștergerea fișierului de pe disc:', e);
        }
        break;
      }
    }
  }

  async stergeFisierDocument(id: string) {
    const doc = await this.prisma.documentVehicul.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documentul nu a fost găsit.');

    this.unlinkDocumentFile(doc.fisierUrl);

    return this.prisma.documentVehicul.update({
      where: { id },
      data: {
        fisierUrl: null,
        fisierNume: null,
        fisierMarime: null,
      },
    });
  }

  async deleteDocumentVehicul(id: string) {
    const doc = await this.prisma.documentVehicul.findUnique({ where: { id } });
    if (doc?.fisierUrl) {
      this.unlinkDocumentFile(doc.fisierUrl);
    }
    return this.prisma.documentVehicul.delete({ where: { id } });
  }

  // ==========================================
  // CATALOG TIPURI DOCUMENTE & CONFIGURARE
  // ==========================================

  public static readonly STANDARD_TIPURI_DOCUMENTE = [
    {
      cod: 'ITP',
      label: 'Inspecție Tehnică Periodică (ITP)',
      zileAvertizare: 30,
      descriere: 'Inspecție tehnică periodică obligatorie la stațiile autorizate RAR',
      categorii: ['TOATE'],
      esteStandard: true,
      culoare: 'emerald',
    },
    {
      cod: 'RCA',
      label: 'Asigurare Obligatorie (RCA)',
      zileAvertizare: 30,
      descriere: 'Poliță de asigurare de răspundere civilă auto obligatorie',
      categorii: ['TOATE'],
      esteStandard: true,
      culoare: 'blue',
    },
    {
      cod: 'ROVINIETA',
      label: 'Rovinietă (Taxă de Drum Național)',
      zileAvertizare: 30,
      descriere: 'Tarif de utilizare a rețelei de drumuri naționale din România (CNAIR)',
      categorii: ['CAP_TRACTOR', 'CAMION_8X4', 'BASCULANTA', 'AUTOUTILITARA', 'AUTOTURISM'],
      esteStandard: true,
      culoare: 'amber',
    },
    {
      cod: 'COPIE_CONFORMA',
      label: 'Copie Conformă Licență Transport',
      zileAvertizare: 30,
      descriere: 'Copie conformă a licenței comunitare pentru transport rutier de mărfuri (ARR)',
      categorii: ['CAP_TRACTOR', 'CAMION_8X4', 'BASCULANTA', 'AUTOUTILITARA'],
      esteStandard: true,
      culoare: 'purple',
    },
    {
      cod: 'VERIFICARE_TAHOGRAF',
      label: 'Verificare Periodică Tahograf',
      zileAvertizare: 30,
      descriere: 'Dovadă verificare tahograf digital / analog și limitator viteză (valabil 2 ani)',
      categorii: ['CAP_TRACTOR', 'CAMION_8X4', 'BASCULANTA'],
      esteStandard: true,
      culoare: 'cyan',
    },
    {
      cod: 'CASCO',
      label: 'Asigurare Facultativă (CASCO)',
      zileAvertizare: 30,
      descriere: 'Poliță de asigurare facultativă pentru avarii accidentale, furt sau calamități',
      categorii: ['TOATE'],
      esteStandard: true,
      culoare: 'indigo',
    },
  ];

  private async readSavedTipuriDocumente(): Promise<{ memoryId: string | null; entries: any[] }> {
    const memory = await this.prisma.aiMemory.findFirst({
      where: { cheie: 'TIPURI_DOCUMENTE_VEHICULE' },
    });

    let entries: any[] = [];
    if (memory && memory.valoare) {
      try {
        const parsed = JSON.parse(memory.valoare);
        if (Array.isArray(parsed)) entries = parsed;
      } catch {
        entries = [];
      }
    }

    return { memoryId: memory?.id || null, entries };
  }

  private async writeSavedTipuriDocumente(memoryId: string | null, entries: any[]): Promise<void> {
    if (memoryId) {
      await this.prisma.aiMemory.update({
        where: { id: memoryId },
        data: { valoare: JSON.stringify(entries) },
      });
    } else {
      await this.prisma.aiMemory.create({
        data: {
          tip: 'CONFIG',
          cheie: 'TIPURI_DOCUMENTE_VEHICULE',
          valoare: JSON.stringify(entries),
          context: 'Configurare Nomenclator Tipuri Documente',
        },
      });
    }
  }

  private normalizeDocumentCategorii(categorii?: string[], defaultToAll = true): string[] {
    if (!Array.isArray(categorii)) {
      return defaultToAll ? ['TOATE'] : [];
    }
    const clean = Array.from(
      new Set(
        categorii
          .map((c) => String(c || '').trim().toUpperCase())
          .filter(Boolean),
      ),
    );
    return clean.includes('TOATE') ? ['TOATE'] : clean;
  }

  async getTipuriDocumente() {
    const { entries: savedEntries } = await this.readSavedTipuriDocumente();
    const savedMap = new Map<string, any>();
    for (const item of savedEntries) {
      if (item?.cod) {
        savedMap.set(String(item.cod).toUpperCase().trim(), item);
      }
    }

    const standardCodes = new Set(AnomaliiService.STANDARD_TIPURI_DOCUMENTE.map((s) => s.cod));
    const mergedStandard = AnomaliiService.STANDARD_TIPURI_DOCUMENTE.map((std) => {
      const override = savedMap.get(std.cod);
      if (!override) return std;
      return {
        ...std,
        label: override.label || std.label,
        zileAvertizare: override.zileAvertizare !== undefined ? Number(override.zileAvertizare) : std.zileAvertizare,
        descriere: override.descriere !== undefined ? override.descriere : std.descriere,
        categorii: Array.isArray(override.categorii) ? this.normalizeDocumentCategorii(override.categorii, false) : std.categorii,
        culoare: override.culoare || std.culoare,
        esteStandard: true,
      };
    });

    const customTypes = savedEntries.filter((c: any) => c?.cod && !standardCodes.has(String(c.cod).toUpperCase().trim()));
    const customCodes = new Set(customTypes.map((c: any) => String(c.cod).toUpperCase().trim()));

    // Include automat și orice tip existent în baza de date
    const distinctDocs = await this.prisma.documentVehicul.findMany({
      select: { tipDocument: true },
      distinct: ['tipDocument'],
    });

    for (const d of distinctDocs) {
      const docCod = d.tipDocument ? String(d.tipDocument).toUpperCase().trim() : '';
      if (docCod && !standardCodes.has(docCod) && !customCodes.has(docCod)) {
        customTypes.push({
          cod: docCod,
          label: docCod.replace(/_/g, ' '),
          zileAvertizare: 30,
          descriere: 'Tip document activ în flotă',
          categorii: ['TOATE'],
          esteStandard: false,
          culoare: 'slate',
        });
        customCodes.add(docCod);
      }
    }

    return [...mergedStandard, ...customTypes];
  }

  async addTipDocument(data: { cod: string; label: string; zileAvertizare?: number; descriere?: string; categorii?: string[]; culoare?: string }) {
    if (!data.cod || !data.label) {
      throw new BadRequestException('Codul și denumirea tipului de document sunt obligatorii.');
    }

    const codClean = data.cod.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_');
    const existingList = await this.getTipuriDocumente();
    if (existingList.some((t: any) => t.cod === codClean)) {
      throw new BadRequestException(`Tipul de document cu codul "${codClean}" există deja.`);
    }

    const { memoryId, entries } = await this.readSavedTipuriDocumente();
    entries.push({
      cod: codClean,
      label: data.label.trim(),
      zileAvertizare: Number(data.zileAvertizare) || 30,
      descriere: data.descriere?.trim() || '',
      categorii: this.normalizeDocumentCategorii(data.categorii, true),
      esteStandard: false,
      culoare: data.culoare || 'indigo',
    });

    await this.writeSavedTipuriDocumente(memoryId, entries);
    return this.getTipuriDocumente();
  }

  async updateTipDocument(
    cod: string,
    data: { label?: string; zileAvertizare?: number; descriere?: string; categorii?: string[]; culoare?: string },
  ) {
    const codUpper = cod.toUpperCase().trim();
    const allTypes = await this.getTipuriDocumente();
    const current = allTypes.find((t: any) => t.cod === codUpper);
    if (!current) {
      throw new NotFoundException(`Tipul de document "${codUpper}" nu a fost găsit.`);
    }

    const { memoryId, entries } = await this.readSavedTipuriDocumente();
    const updatedItem = {
      cod: codUpper,
      label: data.label !== undefined && data.label.trim() ? data.label.trim() : current.label,
      zileAvertizare: data.zileAvertizare !== undefined ? Number(data.zileAvertizare) || 30 : current.zileAvertizare,
      descriere: data.descriere !== undefined ? data.descriere.trim() : current.descriere || '',
      categorii:
        data.categorii !== undefined
          ? this.normalizeDocumentCategorii(data.categorii, false)
          : current.categorii || ['TOATE'],
      esteStandard: Boolean(current.esteStandard),
      culoare: data.culoare || current.culoare || 'indigo',
    };

    const idx = entries.findIndex((item: any) => String(item?.cod || '').toUpperCase().trim() === codUpper);
    if (idx >= 0) {
      entries[idx] = updatedItem;
    } else {
      entries.push(updatedItem);
    }

    await this.writeSavedTipuriDocumente(memoryId, entries);
    return this.getTipuriDocumente();
  }

  async deleteTipDocument(cod: string) {
    const codUpper = cod.toUpperCase().trim();
    if (AnomaliiService.STANDARD_TIPURI_DOCUMENTE.some((s) => s.cod === codUpper)) {
      throw new BadRequestException('Tipurile standard de sistem (ITP, RCA, etc.) nu pot fi șterse.');
    }

    const { memoryId, entries } = await this.readSavedTipuriDocumente();
    if (memoryId) {
      const filtered = entries.filter((c: any) => String(c?.cod || '').toUpperCase().trim() !== codUpper);
      await this.writeSavedTipuriDocumente(memoryId, filtered);
    }

    return this.getTipuriDocumente();
  }

  async initializareDocumenteRapida(body?: { vehiculId?: string }) {
    const where: any = { stare: 'ACTIV' };
    if (body?.vehiculId) where.id = body.vehiculId;

    const vehicule = await this.prisma.vehicul.findMany({ where });
    const tipuri = await this.getTipuriDocumente();

    let createdCount = 0;
    const now = new Date();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    for (const v of vehicule) {
      const vCat = (v.categorieEnum || '').trim().toUpperCase();

      const applicable = tipuri.filter((t: any) => {
        if (!Array.isArray(t.categorii)) return true;
        if (t.categorii.includes('TOATE')) return true;
        return t.categorii.some((c: string) => String(c || '').trim().toUpperCase() === vCat);
      });

      for (const t of applicable) {
        const existing = await this.prisma.documentVehicul.findUnique({
          where: {
            vehiculId_tipDocument: {
              vehiculId: v.id,
              tipDocument: t.cod,
            },
          },
        });

        if (!existing) {
          await this.prisma.documentVehicul.create({
            data: {
              vehiculId: v.id,
              tipDocument: t.cod,
              dataExpirare: oneYearLater,
              zileAvertizareInainte: t.zileAvertizare || 30,
              stare: 'ACTIV',
              observatii: `Inițializat automat conform categoriei ${v.categorieEnum}`,
            },
          });
          createdCount++;
        }
      }
    }

    return {
      success: true,
      message: `Au fost inițializate ${createdCount} documente pentru vehiculele selectate.`,
      createdCount,
    };
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

    // 1b. Alerte Norme Schimb Uleiuri & Fluide (ConfigurareUleiVehicul & Categorii)
    const [vehiculeFluide, normeCategorii, tipLabelsMap] = await Promise.all([
      this.prisma.vehicul.findMany({
        where: { stare: { notIn: ['CASAT', 'VANDUT'] } },
        include: {
          configurariUlei: true,
          completariLichid: { orderBy: { dataCompletare: 'desc' }, take: 15 },
        },
      }),
      this.prisma.configurareUleiCategorie.findMany(),
      this.getTipFluidLabelsMap(),
    ]);

    const normeCatMap = new Map<string, any[]>();
    for (const nc of normeCategorii) {
      if (!normeCatMap.has(nc.categorieEnum)) normeCatMap.set(nc.categorieEnum, []);
      normeCatMap.get(nc.categorieEnum)!.push(nc);
    }

    for (const v of vehiculeFluide) {
      const catNorme = v.categorieEnum ? (normeCatMap.get(v.categorieEnum) || []) : [];
      const statuses = this.computeVehicleFluidStatuses(v, catNorme, acum);
      for (const st of statuses) {
        if (!st.esteDepasit && !st.esteInPragAvertizare) continue;
        const labelLichid = tipLabelsMap[st.tipLichid] || st.tipLichid.replace(/_/g, ' ');
        listaAlerte.push({
          id: `ulei-${v.id}-${st.tipLichid}`,
          dbId: `${v.id}::${st.tipLichid}`,
          categorieAlert: 'SCHIMB_ULEI',
          categorieText: 'Schimb Ulei / Fluid',
          titlu: `Schimb ${labelLichid} — ${v.numarIntern}`,
          tipLichid: st.tipLichid,
          vehiculId: v.id,
          vehiculNumar: v.numarIntern,
          urgenta: st.esteDepasit ? 'CRITIC' : 'AVERTIZARE',
          mesaj: st.motivAvertisment,
          dataReferinta: st.ultimulSchimbData,
          modCalcul: `Ultimul schimb la ${Number(st.ultimulSchimbContor || 0).toLocaleString('ro-RO')} ${st.unitateMasura} (${new Date(st.ultimulSchimbData).toLocaleDateString('ro-RO')}) · Contor curent: ${Number(v.valoareContorCurent || 0).toLocaleString('ro-RO')} ${st.unitateMasura}`,
          linkDirect: '/fluide?tab=flota',
        });
      }
    }

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
      const min = Number(art.stocMinim) || 0;
      // Alertă de stoc critic se generează DOAR dacă există un prag minim definit (> 0) și stocul scade sub acest prag!
      // Dacă stocMinim este 0, monitorizarea este dezactivată.
      // Dacă stocul este egal cu stocMinim, cantitatea este optimă (nu este sub limită).
      if (min > 0 && art.stocCurent < min) {
        const esteEpuizat = art.stocCurent <= 0;
        const lipsa = Math.max(0, min - art.stocCurent);
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
            ? `STOC EPUIZAT! Cantitate disponibilă: 0 ${art.unitateMasura} (Limita minimă: ${min} ${art.unitateMasura}) în ${art.depozit?.nume || 'Depozit'}`
            : `Stoc sub limita minimă! Disponibil: ${art.stocCurent} ${art.unitateMasura} (Limita minimă: ${min} ${art.unitateMasura}, necesar: +${lipsa} ${art.unitateMasura})`,
          dataReferinta: art.updatedAt || art.createdAt,
          modCalcul: `Depozit: ${art.depozit?.nume || 'Depozit Central'} • Preț: ${art.pretUnitar} RON/${art.unitateMasura}`,
          linkDirect: '/stocuri?tab=stoc',
        });
      }
    });

    return listaAlerte.sort((a, b) => (a.urgenta === 'CRITIC' ? -1 : 1));
  }

  // ==========================================
  // ISTORIC COMPLETĂRI & SCHIMBURI FLUIDE
  // ==========================================
  async getIstoricCompletariFluide(limit = 150) {
    const records = await this.prisma.completareLichid.findMany({
      include: {
        vehicul: true,
        articolStoc: {
          include: { depozit: true },
        },
      },
      orderBy: { dataCompletare: 'desc' },
      take: limit,
    });

    const clIds = Array.from(
      new Set(records.map((r) => r.comandaLucruId).filter((id): id is string => Boolean(id))),
    );
    const comenzi = clIds.length > 0
      ? await this.prisma.comandaLucru.findMany({
          where: { id: { in: clIds } },
          select: { id: true, numarComanda: true },
        })
      : [];
    const clMap = new Map(comenzi.map((c) => [c.id, c.numarComanda]));

    return records.map((r) => ({
      ...r,
      comandaNumar: r.comandaLucruId ? clMap.get(r.comandaLucruId) || null : null,
    }));
  }
}
