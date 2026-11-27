import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  cleanFileToken,
  generateAnalizaPdf,
  generateBonuriPdf,
  generateRaportLunarPdf,
} from './combustibil.pdf';

const COMPANY_RULES: Record<string, string[]> = {
  VINATI: [
    'EX.KOM002', 'EXC.KOM 04', 'EX.KOM05', 'BUL.KOM', 'CV06BRY', 'CV06PCR', 'CV06PIV',
    'B15MBR', 'CV06LBF', 'CV62ENE', 'CV06BRY B', 'CV06PCR B', 'CV06PIV B', 'EX.KOM06 B',
  ],
  'PETROIL-IMPEX': ['EX.LIB003', 'V.LIB004', 'CV04ETB', 'CV05KRU', 'CV02VBR', 'CV14ZRO'],
  'TRANSGAT-SORT': ['VOL.LIE001', 'V.KOM002', 'V.LIB003', 'EX.KOM06', 'BOBCAT'],
};

const BASIS_LABELS: Record<string, string> = {
  mc_exploatati: 'TOTAL BALAST EXPLOATAȚI',
  mc_balast_sortati: 'TOTAL BALAST SORTAT',
  mc_stoc_statie: 'STOC TOTAL BALAST STAȚIE',
  mc_cap_tractor: 'TRANSP. CAP TRACTOR',
  total_mc_vanduti: 'TOTAL VÂNDUȚI SORT + BALAST',
  mc_balast: 'TOTAL BALAST VÂNDUT',
  mc_sorturi_vanduti: 'TOTAL SORTURI VÂNDUȚI',
  nisip_exploatat_ghidfalau: 'NISIP EXPLOATAT GHIDFALĂU',
  nisip_transportat_budila: 'NISIP TRANSPORTAT LA BUDILA',
};

const COMPANY_COLOR_MAP: Record<string, { color: string; hex: string }> = {
  'TRANSGAT-SORT': { color: 'blue', hex: '#2563eb' },
  'TRANSGAT-SORT SRL': { color: 'blue', hex: '#2563eb' },
  VINATI: { color: 'purple', hex: '#7c3aed' },
  'VINATI SRL': { color: 'purple', hex: '#7c3aed' },
  'PETROIL-IMPEX': { color: 'emerald', hex: '#059669' },
  'PETROIL-IMPEX SRL': { color: 'emerald', hex: '#059669' },
  'TRANSGAT-TIR': { color: 'cyan', hex: '#0891b2' },
  'TRANSGAT-TIR SRL': { color: 'cyan', hex: '#0891b2' },
};

const FALLBACK_PALETTE = [
  { color: 'amber', hex: '#d97706' },
  { color: 'teal', hex: '#0d9488' },
  { color: 'rose', hex: '#e11d48' },
  { color: 'indigo', hex: '#4f46e5' },
  { color: 'emerald', hex: '#059669' },
  { color: 'blue', hex: '#2563eb' },
];

export function getCompanyVisual(name: string, id: number) {
  const upper = String(name || '').trim().toUpperCase();
  if (COMPANY_COLOR_MAP[upper]) return COMPANY_COLOR_MAP[upper];
  return FALLBACK_PALETTE[Math.abs(id) % FALLBACK_PALETTE.length];
}

function normalizePlateForFleet(plate: string): string {
  return String(plate || '')
    .trim()
    .toUpperCase()
    .replace(/\s+B$/i, '')
    .replace(/B$/i, (m, offset, str) => (str.length >= 8 && /\d/.test(str) ? '' : m))
    .replace(/[^A-Z0-9]/g, '');
}

function parseDateTimeInput(s: string | Date, endOfDay = false): Date {
  if (s instanceof Date) return s;
  const raw = String(s || '').trim();
  if (!raw) return new Date();
  // Format "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm"
  const norm = raw.replace(' ', 'T');
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    return new Date(`${norm}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(norm)) {
    return new Date(`${norm}:00Z`);
  }
  return new Date(norm.endsWith('Z') ? norm : `${norm}Z`);
}

function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result.map((s) => s.trim().replace(/^"|"$/g, '').trim());
}

function adjustOdometerRollover(rawKm: number, curKm: number): { adjustedKm: number; isRollover: boolean; delta: number } {
  if (!curKm || curKm <= 0 || !rawKm || rawKm <= 0) {
    return { adjustedKm: rawKm, isRollover: false, delta: rawKm - (curKm || 0) };
  }
  if (rawKm >= curKm) {
    return { adjustedKm: rawKm, isRollover: false, delta: rawKm - curKm };
  }
  const remainder = rawKm % 1_000_000;
  const currentMillions = Math.floor(curKm / 1_000_000) * 1_000_000;
  if (currentMillions >= 1_000_000) {
    const candidateSame = currentMillions + remainder;
    const deltaSame = candidateSame - curKm;
    if (deltaSame >= 0 && deltaSame <= 60_000) {
      return { adjustedKm: candidateSame, isRollover: true, delta: deltaSame };
    }
  }
  const candidateNext = currentMillions + 1_000_000 + remainder;
  const deltaNext = candidateNext - curKm;
  if (curKm >= 750_000 && deltaNext >= 0 && deltaNext <= 60_000) {
    return { adjustedKm: candidateNext, isRollover: true, delta: deltaNext };
  }
  return { adjustedKm: rawKm, isRollover: false, delta: rawKm - curKm };
}

@Injectable()
export class CombustibilService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. GESTIUNI (PROFILURI)
  // ==========================================

  async ensureDefaultGestiune() {
    let list = await this.prisma.combustibilGestiune.findMany({ orderBy: { id: 'asc' } });
    if (list.length === 0) {
      const def = await this.prisma.combustibilGestiune.create({
        data: {
          nume: 'Budila',
          codPunctLucru: 'BD01',
          tipCombustibil: 'Motorină',
          capacitateBazin: 27000,
          companii: {
            create: [
              { nume: 'TRANSGAT-SORT', codProdus: '0000337' },
              { nume: 'VINATI', codProdus: '0000051' },
              { nume: 'PETROIL-IMPEX', codProdus: '0000035' },
              { nume: 'TRANSGAT-TIR', codProdus: '0000050' },
            ],
          },
        },
      });
      list = [def];
    }
    return list;
  }

  async listGestiuni() {
    const list = await this.ensureDefaultGestiune();
    const counts = await Promise.all(
      list.map(async (g) => {
        const [compCount, vehCount, trCount] = await Promise.all([
          this.prisma.combustibilCompanie.count({ where: { gestiuneId: g.id } }),
          this.prisma.combustibilVehicul.count({ where: { gestiuneId: g.id } }),
          this.prisma.combustibilTranzactie.count({ where: { gestiuneId: g.id } }),
        ]);
        return { ...g, compCount, vehCount, trCount };
      }),
    );
    return counts;
  }

  async resolveGestiuneId(gestiuneId?: number): Promise<number> {
    if (gestiuneId && !isNaN(Number(gestiuneId))) {
      const found = await this.prisma.combustibilGestiune.findUnique({ where: { id: Number(gestiuneId) } });
      if (found) return found.id;
    }
    const list = await this.ensureDefaultGestiune();
    return list[0].id;
  }

  async createGestiune(dto: { nume: string; codPunctLucru?: string; tipCombustibil?: string; capacitateBazin?: number }) {
    const nume = String(dto.nume || '').trim();
    if (!nume) throw new BadRequestException('Numele gestiunii este obligatoriu.');
    return this.prisma.combustibilGestiune.create({
      data: {
        nume,
        codPunctLucru: dto.codPunctLucru?.trim() || null,
        tipCombustibil: dto.tipCombustibil?.trim() || 'Motorină',
        capacitateBazin: Number(dto.capacitateBazin || 27000) || 27000,
      },
    });
  }

  async updateGestiune(
    id: number,
    dto: { nume?: string; codPunctLucru?: string; tipCombustibil?: string; capacitateBazin?: number },
  ) {
    const existing = await this.prisma.combustibilGestiune.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Gestiunea nu a fost găsită.');
    return this.prisma.combustibilGestiune.update({
      where: { id },
      data: {
        nume: dto.nume !== undefined ? dto.nume.trim() : existing.nume,
        codPunctLucru: dto.codPunctLucru !== undefined ? dto.codPunctLucru.trim() || null : existing.codPunctLucru,
        tipCombustibil: dto.tipCombustibil !== undefined ? dto.tipCombustibil.trim() || 'Motorină' : existing.tipCombustibil,
        capacitateBazin: dto.capacitateBazin !== undefined ? Number(dto.capacitateBazin) : existing.capacitateBazin,
      },
    });
  }

  async deleteGestiune(id: number) {
    const count = await this.prisma.combustibilGestiune.count();
    if (count <= 1) {
      throw new BadRequestException('Nu puteți șterge ultima gestiune rămasă.');
    }
    await this.prisma.combustibilGestiune.delete({ where: { id } });
    return { succes: true };
  }

  async updateTankCapacity(gestiuneId: number, capacitateBazin: number) {
    const cap = Number(capacitateBazin);
    if (!cap || cap <= 0) throw new BadRequestException('Capacitatea trebuie să fie mai mare ca 0.');
    const updated = await this.prisma.combustibilGestiune.update({
      where: { id: gestiuneId },
      data: { capacitateBazin: cap },
    });
    await this.prisma.combustibilSetare.upsert({
      where: { cheie_gestiuneId: { cheie: 'tank_capacity', gestiuneId } },
      update: { valoare: String(cap) },
      create: { cheie: 'tank_capacity', valoare: String(cap), gestiuneId },
    });
    return updated;
  }

  // ==========================================
  // 2. PANOU GENERAL (DASHBOARD)
  // ==========================================

  async getDashboard(rawGestiuneId?: number) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    const gestiune = await this.prisma.combustibilGestiune.findUniqueOrThrow({ where: { id: gestiuneId } });

    const [companii, ops, trans] = await Promise.all([
      this.prisma.combustibilCompanie.findMany({ where: { gestiuneId }, orderBy: { id: 'asc' } }),
      this.prisma.combustibilOperatiuneStoc.findMany({ where: { gestiuneId } }),
      this.prisma.combustibilTranzactie.findMany({ where: { gestiuneId } }),
    ]);

    let totalStock = 0;
    let lastUpdate: Date | null = null;
    const considerDate = (d: Date) => {
      if (!lastUpdate || d.getTime() > lastUpdate.getTime()) lastUpdate = d;
    };
    ops.forEach((o) => considerDate(o.data));
    trans.forEach((t) => considerDate(t.data));

    const stocks = companii.map((c) => {
      const cOps = ops.filter((o) => o.companieId === c.id);
      const cTrans = trans.filter((t) => t.companieId === c.id);

      const initial = cOps.filter((o) => o.tip === 'INITIAL').reduce((s, o) => s + o.cantitate, 0);
      const refill = cOps.filter((o) => o.tip === 'IN').reduce((s, o) => s + o.cantitate, 0);
      const manualOut = cOps.filter((o) => o.tip === 'OUT').reduce((s, o) => s + o.cantitate, 0);
      const transSum = cTrans.reduce((s, t) => s + t.cantitate, 0);
      const consumed = manualOut + transSum;
      const current = Number((initial + refill - consumed).toFixed(2));
      totalStock += current;

      let cLast: Date | null = null;
      cOps.forEach((o) => { if (!cLast || o.data > cLast) cLast = o.data; });
      cTrans.forEach((t) => { if (!cLast || t.data > cLast) cLast = t.data; });

      const vis = getCompanyVisual(c.nume, c.id);
      const threshold = c.nume.toUpperCase().includes('TRANSGAT-SORT') ? 3000 : 1000;

      return {
        id: c.id,
        nume: c.nume,
        cui: c.cui,
        codProdus: c.codProdus,
        color: vis.color,
        colorHex: vis.hex,
        initial: Number(initial.toFixed(2)),
        refill: Number(refill.toFixed(2)),
        consumed: Number(consumed.toFixed(2)),
        current,
        threshold,
        isLowStock: current < threshold,
        transCount: cTrans.length,
        lastUpdate: cLast,
      };
    });

    const unallocTrans = trans.filter((t) => t.companieId === null);
    const unallocOps = ops.filter((o) => o.companieId === null);
    const unallocConsumed = Number(
      (
        unallocTrans.reduce((s, t) => s + t.cantitate, 0) +
        unallocOps.filter((o) => o.tip === 'OUT').reduce((s, o) => s + o.cantitate, 0)
      ).toFixed(2),
    );
    let unallocLast: Date | null = null;
    unallocTrans.forEach((t) => { if (!unallocLast || t.data > unallocLast) unallocLast = t.data; });

    totalStock = Number(totalStock.toFixed(2));
    const tankCapacity = Number(gestiune.capacitateBazin || 27000);
    const totalPercent = tankCapacity > 0 ? Number(((totalStock / tankCapacity) * 100).toFixed(1)) : 0;
    const displayPercent = Math.max(0, Math.min(100, totalPercent));
    const isOverloaded = totalStock > tankCapacity;
    const overloadQty = isOverloaded ? Number((totalStock - tankCapacity).toFixed(2)) : 0;
    const freeSpace = Number(Math.max(0, tankCapacity - totalStock).toFixed(2));

    return {
      gestiune,
      tankCapacity,
      totalStock,
      freeSpace,
      totalPercent,
      displayPercent,
      isOverloaded,
      overloadQty,
      lastUpdate,
      stocks,
      unallocated: {
        count: unallocTrans.length + unallocOps.length,
        consumed: unallocConsumed,
        lastUpdate: unallocLast,
      },
    };
  }

  // ==========================================
  // 3. GESTIONARE STOC DETALIAT + UNDO/REDO
  // ==========================================

  private async logHistory(
    tx: any,
    gestiuneId: number,
    tableName: 'StockOperation' | 'Transaction',
    recordId: number,
    actionType: 'CREATE' | 'UPDATE' | 'DELETE',
    dataObj: any,
    preUpdateObj?: any,
  ) {
    // Clear undone redo stack on new mutation
    await tx.combustibilHistoryLog.deleteMany({ where: { gestiuneId, isUndone: true } });
    await tx.combustibilHistoryLog.create({
      data: {
        gestiuneId,
        tableName,
        recordId,
        actionType,
        dataSnapshot: JSON.stringify(dataObj),
        preUpdateSnapshot: preUpdateObj ? JSON.stringify(preUpdateObj) : null,
        isUndone: false,
      },
    });
  }

  async getStockDetails(rawGestiuneId?: number) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    const [companii, ops, trans, vehicule, undoCount, redoCount] = await Promise.all([
      this.prisma.combustibilCompanie.findMany({ where: { gestiuneId }, orderBy: { id: 'asc' } }),
      this.prisma.combustibilOperatiuneStoc.findMany({ where: { gestiuneId }, orderBy: { data: 'desc' } }),
      this.prisma.combustibilTranzactie.findMany({
        where: { gestiuneId },
        include: {
          vehicul: { include: { categorie: true } },
          companie: true,
        },
        orderBy: { data: 'desc' },
      }),
      this.prisma.combustibilVehicul.findMany({
        where: { gestiuneId },
        orderBy: { numarAuto: 'asc' },
        select: { id: true, numarAuto: true, companieId: true },
      }),
      this.prisma.combustibilHistoryLog.count({ where: { gestiuneId, isUndone: false } }),
      this.prisma.combustibilHistoryLog.count({ where: { gestiuneId, isUndone: true } }),
    ]);

    // Detect possible duplicates (same minute + quantity within 0.05L across gestiune)
    const dupBucket = new Map<string, typeof trans>();
    for (const t of trans) {
      const minuteKey = t.data.toISOString().slice(0, 16);
      const qtyKey = (Math.round(t.cantitate * 20) / 20).toFixed(2);
      const key = `${minuteKey}|${qtyKey}`;
      if (!dupBucket.has(key)) dupBucket.set(key, []);
      dupBucket.get(key)!.push(t);
    }
    const dupInfoById = new Map<number, { otherId: number; plate: string; company: string }>();
    for (const list of dupBucket.values()) {
      if (list.length > 1) {
        for (const item of list) {
          const other = list.find((x) => x.id !== item.id)!;
          dupInfoById.set(item.id, {
            otherId: other.id,
            plate: other.vehicul?.numarAuto || 'Necunoscut',
            company: other.companie?.nume || 'Nealocat',
          });
        }
      }
    }

    const buildHistory = (cId: number | null) => {
      const h: Array<{
        kind: 'op' | 'trans';
        id: number;
        date: Date;
        type: string;
        quantity: number;
        description: string;
        category: string | null;
        isUnallocated: boolean;
        duplicateInfo: { otherId: number; plate: string; company: string } | null;
        vehiculId?: number | null;
        companieId: number | null;
      }> = [];

      for (const o of ops.filter((x) => x.companieId === cId)) {
        h.push({
          kind: 'op',
          id: o.id,
          date: o.data,
          type: o.tip,
          quantity: o.cantitate,
          description: o.descriere || '',
          category: null,
          isUnallocated: o.companieId === null,
          duplicateInfo: null,
          companieId: o.companieId,
        });
      }
      for (const t of trans.filter((x) => x.companieId === cId)) {
        h.push({
          kind: 'trans',
          id: t.id,
          date: t.data,
          type: 'TRANSACTION',
          quantity: t.cantitate,
          description: t.vehicul?.numarAuto || 'Necunoscut',
          category: t.vehicul?.categorie?.nume || null,
          isUnallocated: !t.vehicul?.companieId || t.companieId === null,
          duplicateInfo: dupInfoById.get(t.id) || null,
          vehiculId: t.vehiculId,
          companieId: t.companieId,
        });
      }

      h.sort((a, b) => b.date.getTime() - a.date.getTime());

      const initial = h.filter((x) => x.type === 'INITIAL').reduce((s, x) => s + x.quantity, 0);
      const inn = h.filter((x) => x.type === 'IN').reduce((s, x) => s + x.quantity, 0);
      const consumed = h.filter((x) => x.type === 'TRANSACTION' || x.type === 'OUT').reduce((s, x) => s + x.quantity, 0);
      const current = Number((initial + inn - consumed).toFixed(2));
      const lastUpdate = h.length > 0 ? h[0].date : null;

      return {
        initial: Number(initial.toFixed(2)),
        in: Number(inn.toFixed(2)),
        consumed: Number(consumed.toFixed(2)),
        current,
        lastUpdate,
        history: h,
      };
    };

    const companyTabs = companii.map((c) => {
      const vis = getCompanyVisual(c.nume, c.id);
      return {
        id: c.id,
        nume: c.nume,
        cui: c.cui,
        codProdus: c.codProdus,
        color: vis.color,
        colorHex: vis.hex,
        ...buildHistory(c.id),
      };
    });

    const unallocated = buildHistory(null);

    return {
      gestiuneId,
      companies: companyTabs,
      unallocated,
      duplicateCount: dupInfoById.size,
      vehiclesList: vehicule,
      canUndo: undoCount > 0,
      canRedo: redoCount > 0,
    };
  }

  async addStockOperation(dto: {
    gestiuneId: number;
    companieId: number;
    tip: 'INITIAL' | 'IN' | 'OUT';
    cantitate: number;
    data: string;
    descriere?: string;
  }) {
    const qty = Number(dto.cantitate);
    if (!qty || qty <= 0) throw new BadRequestException('Cantitatea trebuie să fie mai mare ca 0.');
    const tip = String(dto.tip || 'IN').toUpperCase();
    if (!['INITIAL', 'IN', 'OUT'].includes(tip)) throw new BadRequestException('Tip operațiune invalid.');

    const comp = await this.prisma.combustibilCompanie.findFirst({
      where: { id: Number(dto.companieId), gestiuneId: Number(dto.gestiuneId) },
    });
    if (!comp) throw new NotFoundException('Compania nu a fost găsită în această gestiune.');

    const dt = parseDateTimeInput(dto.data);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.combustibilOperatiuneStoc.create({
        data: {
          tip,
          cantitate: qty,
          data: dt,
          descriere: dto.descriere?.trim() || null,
          companieId: comp.id,
          gestiuneId: comp.gestiuneId,
        },
      });
      await this.logHistory(tx, comp.gestiuneId, 'StockOperation', created.id, 'CREATE', created);
      return created;
    });
  }

  async updateStockOperation(
    id: number,
    dto: { tip?: string; cantitate?: number; data?: string; descriere?: string; companieId?: number | null },
  ) {
    const existing = await this.prisma.combustibilOperatiuneStoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Operațiunea nu a fost găsită.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.combustibilOperatiuneStoc.update({
        where: { id },
        data: {
          tip: dto.tip ? dto.tip.toUpperCase() : existing.tip,
          cantitate: dto.cantitate !== undefined ? Number(dto.cantitate) : existing.cantitate,
          data: dto.data ? parseDateTimeInput(dto.data) : existing.data,
          descriere: dto.descriere !== undefined ? dto.descriere.trim() || null : existing.descriere,
          companieId: dto.companieId !== undefined ? dto.companieId : existing.companieId,
        },
      });
      await this.logHistory(tx, existing.gestiuneId, 'StockOperation', id, 'UPDATE', updated, existing);
      return updated;
    });
  }

  async deleteStockOperation(id: number) {
    const existing = await this.prisma.combustibilOperatiuneStoc.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Operațiunea nu a fost găsită.');

    return this.prisma.$transaction(async (tx) => {
      await tx.combustibilOperatiuneStoc.delete({ where: { id } });
      await this.logHistory(tx, existing.gestiuneId, 'StockOperation', id, 'DELETE', existing);
      return { succes: true };
    });
  }

  async updateTransaction(
    id: number,
    dto: { cantitate?: number; data?: string; companieId?: number | null; vehiculId?: number | null },
  ) {
    const existing = await this.prisma.combustibilTranzactie.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tranzacția nu a fost găsită.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.combustibilTranzactie.update({
        where: { id },
        data: {
          cantitate: dto.cantitate !== undefined ? Number(dto.cantitate) : existing.cantitate,
          data: dto.data ? parseDateTimeInput(dto.data) : existing.data,
          companieId: dto.companieId !== undefined ? dto.companieId : existing.companieId,
          vehiculId: dto.vehiculId !== undefined ? dto.vehiculId : existing.vehiculId,
        },
      });
      await this.logHistory(tx, existing.gestiuneId, 'Transaction', id, 'UPDATE', updated, existing);
      return updated;
    });
  }

  async deleteTransaction(id: number) {
    const existing = await this.prisma.combustibilTranzactie.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tranzacția nu a fost găsită.');

    return this.prisma.$transaction(async (tx) => {
      await tx.combustibilTranzactie.delete({ where: { id } });
      await this.logHistory(tx, existing.gestiuneId, 'Transaction', id, 'DELETE', existing);
      return { succes: true };
    });
  }

  async bulkDeleteItems(gestiuneId: number, items: Array<{ kind: 'op' | 'trans'; id: number }>) {
    if (!Array.isArray(items) || items.length === 0) return { deleted: 0 };
    let deleted = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const it of items) {
        if (it.kind === 'op') {
          const ex = await tx.combustibilOperatiuneStoc.findFirst({ where: { id: Number(it.id), gestiuneId } });
          if (ex) {
            await tx.combustibilOperatiuneStoc.delete({ where: { id: ex.id } });
            await this.logHistory(tx, gestiuneId, 'StockOperation', ex.id, 'DELETE', ex);
            deleted++;
          }
        } else if (it.kind === 'trans') {
          const ex = await tx.combustibilTranzactie.findFirst({ where: { id: Number(it.id), gestiuneId } });
          if (ex) {
            await tx.combustibilTranzactie.delete({ where: { id: ex.id } });
            await this.logHistory(tx, gestiuneId, 'Transaction', ex.id, 'DELETE', ex);
            deleted++;
          }
        }
      }
    });
    return { deleted };
  }

  async bulkMoveItems(gestiuneId: number, items: Array<{ kind: 'op' | 'trans'; id: number }>, newCompanieId: number) {
    const target = await this.prisma.combustibilCompanie.findFirst({
      where: { id: Number(newCompanieId), gestiuneId },
    });
    if (!target) throw new NotFoundException('Firma destinație nu a fost găsită.');
    let moved = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const it of items) {
        if (it.kind === 'op') {
          const ex = await tx.combustibilOperatiuneStoc.findFirst({ where: { id: Number(it.id), gestiuneId } });
          if (ex) {
            const up = await tx.combustibilOperatiuneStoc.update({
              where: { id: ex.id },
              data: { companieId: target.id },
            });
            await this.logHistory(tx, gestiuneId, 'StockOperation', ex.id, 'UPDATE', up, ex);
            moved++;
          }
        } else if (it.kind === 'trans') {
          const ex = await tx.combustibilTranzactie.findFirst({ where: { id: Number(it.id), gestiuneId } });
          if (ex) {
            const up = await tx.combustibilTranzactie.update({
              where: { id: ex.id },
              data: { companieId: target.id },
            });
            await this.logHistory(tx, gestiuneId, 'Transaction', ex.id, 'UPDATE', up, ex);
            moved++;
          }
        }
      }
    });
    return { moved };
  }

  async undo(rawGestiuneId: number) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    const last = await this.prisma.combustibilHistoryLog.findFirst({
      where: { gestiuneId, isUndone: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    if (!last) return { succes: false, mesaj: 'Nu există acțiuni de anulat.' };

    const snap = JSON.parse(last.dataSnapshot);
    const pre = last.preUpdateSnapshot ? JSON.parse(last.preUpdateSnapshot) : null;

    await this.prisma.$transaction(async (tx) => {
      if (last.tableName === 'StockOperation') {
        if (last.actionType === 'CREATE') {
          await tx.combustibilOperatiuneStoc.deleteMany({ where: { id: last.recordId } });
        } else if (last.actionType === 'DELETE') {
          await tx.combustibilOperatiuneStoc.create({
            data: {
              tip: snap.tip,
              cantitate: Number(snap.cantitate),
              data: new Date(snap.data),
              descriere: snap.descriere ?? null,
              companieId: snap.companieId ?? null,
              gestiuneId,
            },
          });
        } else if (last.actionType === 'UPDATE' && pre) {
          await tx.combustibilOperatiuneStoc.updateMany({
            where: { id: last.recordId },
            data: {
              tip: pre.tip,
              cantitate: Number(pre.cantitate),
              data: new Date(pre.data),
              descriere: pre.descriere ?? null,
              companieId: pre.companieId ?? null,
            },
          });
        }
      } else if (last.tableName === 'Transaction') {
        if (last.actionType === 'CREATE') {
          await tx.combustibilTranzactie.deleteMany({ where: { id: last.recordId } });
        } else if (last.actionType === 'DELETE') {
          await tx.combustibilTranzactie.create({
            data: {
              data: new Date(snap.data),
              vehiculId: snap.vehiculId ?? null,
              companieId: snap.companieId ?? null,
              cantitate: Number(snap.cantitate),
              odometruKm: snap.odometruKm ?? null,
              gestiuneId,
            },
          });
        } else if (last.actionType === 'UPDATE' && pre) {
          await tx.combustibilTranzactie.updateMany({
            where: { id: last.recordId },
            data: {
              data: new Date(pre.data),
              vehiculId: pre.vehiculId ?? null,
              companieId: pre.companieId ?? null,
              cantitate: Number(pre.cantitate),
            },
          });
        }
      }
      await tx.combustibilHistoryLog.update({ where: { id: last.id }, data: { isUndone: true } });
    });

    return { succes: true, mesaj: `Anulare reușită (${last.actionType} • ${last.tableName}).` };
  }

  async redo(rawGestiuneId: number) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    const lastUndone = await this.prisma.combustibilHistoryLog.findFirst({
      where: { gestiuneId, isUndone: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (!lastUndone) return { succes: false, mesaj: 'Nu există acțiuni de refăcut.' };

    const snap = JSON.parse(lastUndone.dataSnapshot);
    await this.prisma.$transaction(async (tx) => {
      if (lastUndone.tableName === 'StockOperation') {
        if (lastUndone.actionType === 'CREATE') {
          const re = await tx.combustibilOperatiuneStoc.create({
            data: {
              tip: snap.tip,
              cantitate: Number(snap.cantitate),
              data: new Date(snap.data),
              descriere: snap.descriere ?? null,
              companieId: snap.companieId ?? null,
              gestiuneId,
            },
          });
          await tx.combustibilHistoryLog.update({ where: { id: lastUndone.id }, data: { recordId: re.id, isUndone: false } });
          return;
        } else if (lastUndone.actionType === 'DELETE') {
          await tx.combustibilOperatiuneStoc.deleteMany({
            where: { gestiuneId, tip: snap.tip, cantitate: Number(snap.cantitate), data: new Date(snap.data) },
          });
        } else if (lastUndone.actionType === 'UPDATE') {
          await tx.combustibilOperatiuneStoc.updateMany({
            where: { id: lastUndone.recordId },
            data: {
              tip: snap.tip,
              cantitate: Number(snap.cantitate),
              data: new Date(snap.data),
              descriere: snap.descriere ?? null,
              companieId: snap.companieId ?? null,
            },
          });
        }
      } else if (lastUndone.tableName === 'Transaction') {
        if (lastUndone.actionType === 'CREATE') {
          const re = await tx.combustibilTranzactie.create({
            data: {
              data: new Date(snap.data),
              vehiculId: snap.vehiculId ?? null,
              companieId: snap.companieId ?? null,
              cantitate: Number(snap.cantitate),
              odometruKm: snap.odometruKm ?? null,
              gestiuneId,
            },
          });
          await tx.combustibilHistoryLog.update({ where: { id: lastUndone.id }, data: { recordId: re.id, isUndone: false } });
          return;
        } else if (lastUndone.actionType === 'DELETE') {
          await tx.combustibilTranzactie.deleteMany({
            where: { gestiuneId, data: new Date(snap.data), cantitate: Number(snap.cantitate) },
          });
        } else if (lastUndone.actionType === 'UPDATE') {
          await tx.combustibilTranzactie.updateMany({
            where: { id: lastUndone.recordId },
            data: {
              data: new Date(snap.data),
              vehiculId: snap.vehiculId ?? null,
              companieId: snap.companieId ?? null,
              cantitate: Number(snap.cantitate),
            },
          });
        }
      }
      await tx.combustibilHistoryLog.update({ where: { id: lastUndone.id }, data: { isUndone: false } });
    });

    return { succes: true, mesaj: `Refacere reușită (${lastUndone.actionType} • ${lastUndone.tableName}).` };
  }

  // ==========================================
  // 4. PARC AUTO (CATEGORII & EFICIENȚĂ)
  // ==========================================

  async getParcAuto(rawGestiuneId?: number) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    const categories = await this.prisma.combustibilCategorieVehicul.findMany({
      where: { gestiuneId },
      include: {
        vehicule: {
          include: {
            companie: true,
            tranzactii: { orderBy: { data: 'desc' } },
          },
          orderBy: { numarAuto: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    return categories.map((cat) => {
      let totalQty = 0;
      const allTrans: Array<{
        id: number;
        data: Date;
        cantitate: number;
        numarAuto: string;
        companieNume: string | null;
        companieColorHex: string | null;
      }> = [];

      for (const v of cat.vehicule) {
        const vis = v.companie ? getCompanyVisual(v.companie.nume, v.companie.id) : null;
        for (const t of v.tranzactii) {
          totalQty += t.cantitate;
          allTrans.push({
            id: t.id,
            data: t.data,
            cantitate: t.cantitate,
            numarAuto: v.numarAuto,
            companieNume: v.companie?.nume || null,
            companieColorHex: vis?.hex || null,
          });
        }
      }
      allTrans.sort((a, b) => b.data.getTime() - a.data.getTime());

      return {
        id: cat.id,
        nume: cat.nume,
        descriere: cat.descriere,
        icon: cat.icon,
        vehicleCount: cat.vehicule.length,
        totalQty: Number(totalQty.toFixed(2)),
        recentTransactions: allTrans,
      };
    });
  }

  // ==========================================
  // 5. ANALIZĂ CONSUM & EFICIENȚĂ (MC)
  // ==========================================

  private async getSettingsMap(gestiuneId: number): Promise<Map<string, string>> {
    const rows = await this.prisma.combustibilSetare.findMany({ where: { gestiuneId } });
    return new Map(rows.map((r) => [r.cheie, r.valoare]));
  }

  private async setSetting(gestiuneId: number, cheie: string, valoare: string) {
    await this.prisma.combustibilSetare.upsert({
      where: { cheie_gestiuneId: { cheie, gestiuneId } },
      update: { valoare },
      create: { cheie, valoare, gestiuneId },
    });
  }

  async getAnaliza(rawGestiuneId?: number, startParam?: string, endParam?: string) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    const gestiune = await this.prisma.combustibilGestiune.findUniqueOrThrow({ where: { id: gestiuneId } });
    const settings = await this.getSettingsMap(gestiuneId);

    const now = new Date();
    const defaultStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01T00:00`;
    const defaultEnd = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T23:59`;

    const startStr = startParam || settings.get('analysis_last_start') || defaultStart;
    const endStr = endParam || settings.get('analysis_last_end') || defaultEnd;

    if (startParam) await this.setSetting(gestiuneId, 'analysis_last_start', startStr);
    if (endParam) await this.setSetting(gestiuneId, 'analysis_last_end', endStr);

    const startDate = parseDateTimeInput(startStr, false);
    const endDate = parseDateTimeInput(endStr, true);

    const [categories, trans] = await Promise.all([
      this.prisma.combustibilCategorieVehicul.findMany({ where: { gestiuneId }, orderBy: { id: 'asc' } }),
      this.prisma.combustibilTranzactie.findMany({
        where: { gestiuneId, data: { gte: startDate, lte: endDate } },
        include: { vehicul: { include: { categorie: true } } },
      }),
    ]);

    const numSetting = (k: string, def = 0) => {
      const v = parseFloat(settings.get(k) || '');
      return isNaN(v) ? def : v;
    };

    const mcExploatati = numSetting('analysis_mc_exploatati');
    const mcBalastSortati = numSetting('analysis_mc_balast_sortati');
    const mcStocStatie = Number((mcExploatati - mcBalastSortati).toFixed(2));
    const toCapTractor = numSetting('analysis_to_cap_tractor');
    const mcCapTractor = toCapTractor > 0 ? Number((toCapTractor / 1.5).toFixed(2)) : numSetting('analysis_mc_cap_tractor');
    const totalMcVanduti = numSetting('analysis_total_mc_vanduti');
    const mcBalast = numSetting('analysis_mc_balast');
    const mcSorturiVanduti = Number((totalMcVanduti - mcBalast).toFixed(2));
    const consumExtra8x4 = numSetting('analysis_consum_extra_8x4');
    const nisipExploatatGhidfalau = numSetting('analysis_nisip_exploatat_ghidfalau');
    const nisipTransportatBudila = numSetting('analysis_nisip_transportat_budila');
    const consumExtraGhidfalau = numSetting('analysis_consum_extra_ghidfalau');

    const mcValues: Record<string, number> = {
      mc_exploatati: mcExploatati,
      mc_balast_sortati: mcBalastSortati,
      mc_stoc_statie: mcStocStatie,
      to_cap_tractor: toCapTractor,
      mc_cap_tractor: mcCapTractor,
      total_mc_vanduti: totalMcVanduti,
      mc_balast: mcBalast,
      mc_sorturi_vanduti: mcSorturiVanduti,
      consum_extra_8x4: consumExtra8x4,
      nisip_exploatat_ghidfalau: nisipExploatatGhidfalau,
      nisip_transportat_budila: nisipTransportatBudila,
      consum_extra_ghidfalau: consumExtraGhidfalau,
    };

    let visibleCategories: string[] = categories.map((c) => c.nume);
    const visRaw = settings.get('analysis_visible_categories');
    if (visRaw) {
      try {
        const parsed = JSON.parse(visRaw);
        if (Array.isArray(parsed) && parsed.length > 0) visibleCategories = parsed;
      } catch {}
    }
    const excludeHidden = settings.get('analysis_exclude_hidden') === '1';

    const fuelByCat = new Map<string, number>();
    for (const t of trans) {
      const catName = t.vehicul?.categorie?.nume || 'Necategorizat';
      fuelByCat.set(catName, (fuelByCat.get(catName) || 0) + t.cantitate);
    }

    const defaultBasis = settings.get('analysis_calculation_basis') || 'total_mc_vanduti';
    const isGhidfalauCat = (name: string) => name.toLowerCase().includes('ghidfal');

    const budilaData: any[] = [];
    const ghidfalauData: any[] = [];
    let totalBudilaFuel = 0;
    let totalGhidfalauFuel = 0;

    for (const cat of categories) {
      const fuel = Number((fuelByCat.get(cat.nume) || 0).toFixed(2));
      const isVisible = visibleCategories.includes(cat.nume);
      const isGhid = isGhidfalauCat(cat.nume);
      const savedBasis =
        settings.get(`analysis_basis_cat_${cat.nume}`) ||
        (isGhid ? 'nisip_exploatat_ghidfalau' : defaultBasis);
      const mcVal = mcValues[savedBasis] || 0;
      const efficiency = mcVal > 0 ? Number((fuel / mcVal).toFixed(4)) : 0;

      if (!excludeHidden || isVisible) {
        if (isGhid) totalGhidfalauFuel += fuel;
        else totalBudilaFuel += fuel;
      }

      if (isVisible) {
        const entry = {
          id: cat.id,
          category: cat.nume,
          icon: cat.icon,
          fuel,
          basis: savedBasis,
          basisLabel: BASIS_LABELS[savedBasis] || savedBasis,
          mcVal,
          efficiency,
        };
        if (isGhid) ghidfalauData.push(entry);
        else budilaData.push(entry);
      }
    }

    totalBudilaFuel = Number(totalBudilaFuel.toFixed(2));
    totalGhidfalauFuel = Number(totalGhidfalauFuel.toFixed(2));
    const netBudilaFuel = Number(Math.max(0, totalBudilaFuel - consumExtra8x4).toFixed(2));
    const netGhidfalauFuel = Number(Math.max(0, totalGhidfalauFuel - consumExtraGhidfalau).toFixed(2));

    return {
      gestiune,
      startDate: startStr,
      endDate: endStr,
      mcValues,
      basisLabels: BASIS_LABELS,
      allCategories: categories.map((c) => ({ id: c.id, nume: c.nume, icon: c.icon })),
      visibleCategories,
      excludeHidden,
      totalEngineFuel: totalBudilaFuel,
      netEngineFuel: netBudilaFuel,
      ghidfalauTotalFuel: totalGhidfalauFuel,
      ghidfalauNetFuel: netGhidfalauFuel,
      budilaData,
      ghidfalauData,
      scores: {
        vanduti: totalMcVanduti > 0 ? Number((netBudilaFuel / totalMcVanduti).toFixed(4)) : 0,
        sortati: mcBalastSortati > 0 ? Number((netBudilaFuel / mcBalastSortati).toFixed(4)) : 0,
        ghidfalau: nisipExploatatGhidfalau > 0 ? Number((netGhidfalauFuel / nisipExploatatGhidfalau).toFixed(4)) : 0,
      },
    };
  }

  async saveAnalizaProduction(gestiuneId: number, body: Record<string, any>) {
    const keys: Array<[string, string]> = [
      ['mc_exploatati', 'analysis_mc_exploatati'],
      ['mc_balast_sortati', 'analysis_mc_balast_sortati'],
      ['to_cap_tractor', 'analysis_to_cap_tractor'],
      ['total_mc_vanduti', 'analysis_total_mc_vanduti'],
      ['mc_balast', 'analysis_mc_balast'],
      ['consum_extra_8x4', 'analysis_consum_extra_8x4'],
      ['nisip_exploatat_ghidfalau', 'analysis_nisip_exploatat_ghidfalau'],
      ['nisip_transportat_budila', 'analysis_nisip_transportat_budila'],
      ['consum_extra_ghidfalau', 'analysis_consum_extra_ghidfalau'],
    ];
    for (const [field, settingKey] of keys) {
      if (body[field] !== undefined) {
        const val = parseFloat(String(body[field]));
        await this.setSetting(gestiuneId, settingKey, String(isNaN(val) ? 0 : val));
      }
    }
    const expl = parseFloat(String(body.mc_exploatati ?? 0)) || 0;
    const sort = parseFloat(String(body.mc_balast_sortati ?? 0)) || 0;
    await this.setSetting(gestiuneId, 'analysis_mc_stoc_statie', String(Number((expl - sort).toFixed(2))));

    if (body.to_cap_tractor !== undefined) {
      const to = parseFloat(String(body.to_cap_tractor)) || 0;
      await this.setSetting(gestiuneId, 'analysis_mc_cap_tractor', String(Number((to / 1.5).toFixed(2))));
    }
    return { succes: true };
  }

  async saveAnalizaSettings(gestiuneId: number, visibleCategories: string[], excludeHidden: boolean) {
    await this.setSetting(gestiuneId, 'analysis_visible_categories', JSON.stringify(visibleCategories || []));
    await this.setSetting(gestiuneId, 'analysis_exclude_hidden', excludeHidden ? '1' : '0');
    return { succes: true };
  }

  async saveAnalizaCategoryBasis(gestiuneId: number, category: string, basis: string) {
    if (!category || !basis) throw new BadRequestException('Categoria și baza de calcul sunt obligatorii.');
    await this.setSetting(gestiuneId, `analysis_basis_cat_${category}`, basis);
    return { succes: true };
  }

  // ==========================================
  // 6. IMPORT CSV (SELER) + OPTIONAL FLEETCMD KM SYNC
  // ==========================================

  private findRuleCompanyName(plate: string): string | null {
    const up = plate.toUpperCase().trim();
    const norm = normalizePlateForFleet(up);
    for (const [compName, plates] of Object.entries(COMPANY_RULES)) {
      if (plates.some((p) => p.toUpperCase() === up || normalizePlateForFleet(p) === norm)) {
        return compName;
      }
    }
    return null;
  }

  async importSelerCsv(
    rawGestiuneId: number,
    csvText: string,
    syncFleetKm = false,
    operatorName = 'Import CSV Combustibil',
  ) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    if (!csvText || !csvText.trim()) throw new BadRequestException('Fișierul CSV este gol.');

    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) throw new BadRequestException('Nu s-au găsit rânduri valide în CSV.');

    // Auto-detect delimiter (comma vs semicolon)
    const sample = lines[0];
    const commaCnt = (sample.match(/,/g) || []).length;
    const semiCnt = (sample.match(/;/g) || []).length;
    const sep = semiCnt > commaCnt ? ';' : ',';

    const companii = await this.prisma.combustibilCompanie.findMany({ where: { gestiuneId } });
    const compByName = new Map(companii.map((c) => [c.nume.toUpperCase().trim(), c]));

    const vehicule = await this.prisma.combustibilVehicul.findMany({
      where: { gestiuneId },
      include: { companie: true },
    });
    const vehByPlate = new Map(vehicule.map((v) => [v.numarAuto.toUpperCase().trim(), v]));

    // Existing transactions for fast duplicate checks
    const existingTrans = await this.prisma.combustibilTranzactie.findMany({ where: { gestiuneId } });

    let importedCount = 0;
    let skippedCount = 0;
    const newVehicles: string[] = [];
    const duplicates: Array<{
      rowNumber: number;
      date: string;
      time: string;
      plate: string;
      quantity: number;
      company: string;
      companyId: number | null;
      existingId: number;
    }> = [];

    // Collect highest KM per plate for optional FleetCMD KM Sync
    const maxKmByNormPlate = new Map<string, { rawPlate: string; km: number; dt: Date; litri: number }>();

    for (let idx = 0; idx < lines.length; idx++) {
      const cols = parseCsvLine(lines[idx], sep);
      if (cols.length < 14) continue;

      const plate = String(cols[15] || '').trim().toUpperCase();
      const dateVal = String(cols[10] || '').trim();
      let timeVal = String(cols[11] || '').trim();

      if (plate.length <= 1 || plate === 'NAN') continue;
      if (!dateVal || dateVal.toLowerCase() === 'date') continue;
      if (!timeVal || timeVal.length < 3) timeVal = '00:00';

      // Parse DD.MM.YYYY HH:MM
      const dm = dateVal.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (!dm) continue;
      const tm = timeVal.match(/^(\d{1,2}):(\d{2})/);
      const hh = tm ? tm[1].padStart(2, '0') : '00';
      const mi = tm ? tm[2] : '00';
      const isoStr = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}T${hh}:${mi}:00Z`;
      const dt = new Date(isoStr);
      if (isNaN(dt.getTime())) continue;

      // Parse quantity (exact FuelManager v6.2.1 thousand-dot fix!)
      const raw14 = String(cols[14] || '').trim();
      const raw16 = cols.length > 16 ? String(cols[16] || '').trim() : '';

      let val16 = 0;
      if (raw16) {
        const clean16 = raw16.replace(/\./g, '').replace(/,/g, '').trim();
        val16 = parseFloat(clean16) || 0;
      }
      const val14 = parseFloat(raw14.replace(',', '.')) || 0;

      let qty = 0;
      if (val16 > 0) {
        qty = Number((val16 / 100).toFixed(2));
      } else if (val14 > 0) {
        qty = Number(val14.toFixed(2));
      } else if (cols.length > 13 && cols[13]) {
        const val13 = parseFloat(String(cols[13]).replace(',', '.')) || 0;
        if (val13 > 0) qty = Number(val13.toFixed(2));
      }

      if (qty <= 0) continue;

      // Extract Odometer KM from col 14 when col 16 holds the fuel quantity (Seler standard layout: "62.365" -> 62365 km)
      let odometerKm: number | null = null;
      if (val16 > 0 && raw14) {
        const cleanedOdo = raw14.replace(/\./g, '').replace(/,/g, '').trim();
        const odoNum = parseInt(cleanedOdo, 10);
        if (!isNaN(odoNum) && odoNum > 100 && odoNum < 5_000_000) {
          odometerKm = odoNum;
        }
      }

      // Resolve vehicle & company
      let veh = vehByPlate.get(plate);
      const ruleCompName = this.findRuleCompanyName(plate);
      const ruleComp = ruleCompName ? compByName.get(ruleCompName) || null : null;

      let transComp = ruleComp;
      if (!transComp && veh?.companie) {
        if (veh.companie.nume.toUpperCase() === 'TRANSGAT-SORT' && !veh.categorieId) {
          transComp = null;
        } else {
          transComp = veh.companie;
        }
      }

      if (!veh) {
        veh = await this.prisma.combustibilVehicul.create({
          data: {
            numarAuto: plate,
            companieId: ruleComp ? ruleComp.id : null,
            gestiuneId,
          },
          include: { companie: true },
        });
        vehByPlate.set(plate, veh);
        newVehicles.push(plate);
      } else if (!veh.companieId && ruleComp) {
        veh = await this.prisma.combustibilVehicul.update({
          where: { id: veh.id },
          data: { companieId: ruleComp.id },
          include: { companie: true },
        });
        vehByPlate.set(plate, veh);
      }

      // Track max KM for FleetCMD sync
      if (syncFleetKm && odometerKm && odometerKm > 0) {
        const normP = normalizePlateForFleet(plate);
        const prev = maxKmByNormPlate.get(normP);
        if (!prev || dt.getTime() > prev.dt.getTime() || (dt.getTime() === prev.dt.getTime() && odometerKm > prev.km)) {
          maxKmByNormPlate.set(normP, { rawPlate: plate, km: odometerKm, dt, litri: qty });
        }
      }

      // Duplicate check (exact + minute/qty within 0.05L in same gestiune)
      const dtMs = dt.getTime();
      const dup = existingTrans.find(
        (e) =>
          (e.data.getTime() === dtMs && e.vehiculId === veh!.id && Math.abs(e.cantitate - qty) < 0.01) ||
          (e.data.getTime() === dtMs && Math.abs(e.cantitate - qty) < 0.05),
      );

      if (!dup) {
        const created = await this.prisma.combustibilTranzactie.create({
          data: {
            data: dt,
            vehiculId: veh.id,
            companieId: transComp ? transComp.id : null,
            cantitate: qty,
            odometruKm: odometerKm,
            gestiuneId,
          },
        });
        existingTrans.push(created);
        importedCount++;
      } else {
        skippedCount++;
        duplicates.push({
          rowNumber: idx + 1,
          date: isoStr.slice(0, 10),
          time: `${hh}:${mi}`,
          plate,
          quantity: qty,
          company: transComp?.nume || 'Nealocat',
          companyId: transComp?.id || null,
          existingId: dup.id,
        });
      }
    }

    // Optional FleetCMD KM Sync (A3!)
    const kmSyncSummary: {
      enabled: boolean;
      updatedCount: number;
      skippedCount: number;
      updatedVehicles: Array<{ numarIntern: string; oldKm: number; newKm: number; delta: number; rollover: boolean }>;
    } = { enabled: syncFleetKm, updatedCount: 0, skippedCount: 0, updatedVehicles: [] };

    if (syncFleetKm && maxKmByNormPlate.size > 0) {
      const fleetVehs = await this.prisma.vehicul.findMany({
        where: { tipMasurare: 'KM', stare: { notIn: ['CASAT', 'VANDUT'] } },
      });
      const fleetByNorm = new Map<string, typeof fleetVehs[0]>();
      for (const fv of fleetVehs) {
        fleetByNorm.set(normalizePlateForFleet(fv.numarInmatriculare), fv);
        fleetByNorm.set(normalizePlateForFleet(fv.numarIntern), fv);
      }

      for (const [normP, entry] of maxKmByNormPlate.entries()) {
        const fv = fleetByNorm.get(normP);
        if (!fv) {
          kmSyncSummary.skippedCount++;
          continue;
        }
        const curKm = Number(fv.valoareContorCurent || 0);
        const { adjustedKm, isRollover, delta } = adjustOdometerRollover(entry.km, curKm);
        // Only apply realistic forward progress (delta > 0 and delta <= 30000 km per sync)
        if (delta <= 0 || (curKm > 0 && delta > 30_000)) {
          kmSyncSummary.skippedCount++;
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.vehicul.update({
            where: { id: fv.id },
            data: { valoareContorCurent: adjustedKm, dataInregistrareContor: entry.dt },
          });
          await tx.istoricContorVehicul.create({
            data: {
              vehiculId: fv.id,
              tipContor: 'KM',
              valoareContor: adjustedKm,
              dataInregistrare: entry.dt,
              sursa: 'ALIMENTARE',
              operator: operatorName,
              observatii: `Sincronizat din Import CSV Combustibil (${entry.litri} L${isRollover ? ', corecție rollover 1M' : ''})`,
            },
          });

          // Propagate KM to coupled semiremorca if CAP_TRACTOR
          if (fv.categorieEnum === 'CAP_TRACTOR') {
            const activeCoupling = await tx.istoricCuplare.findFirst({
              where: { capTractorId: fv.id, esteActiv: true },
              include: { semiremorca: true },
            });
            if (activeCoupling?.semiremorca) {
              const semiNew = Number((activeCoupling.semiremorca.valoareContorCurent + delta).toFixed(2));
              await tx.vehicul.update({
                where: { id: activeCoupling.semiremorca.id },
                data: { valoareContorCurent: semiNew, dataInregistrareContor: entry.dt },
              });
              await tx.istoricContorVehicul.create({
                data: {
                  vehiculId: activeCoupling.semiremorca.id,
                  tipContor: 'KM',
                  valoareContor: semiNew,
                  dataInregistrare: entry.dt,
                  sursa: 'CUPLARE_CAP_TRACTOR',
                  operator: 'Sistem Cuplare Dinamică',
                  observatii: `Rulaj acumulat automat la alimentare Cap Tractor ${fv.numarIntern}: +${delta} KM`,
                },
              });
            }
          }
        });

        kmSyncSummary.updatedCount++;
        kmSyncSummary.updatedVehicles.push({
          numarIntern: fv.numarIntern,
          oldKm: curKm,
          newKm: adjustedKm,
          delta,
          rollover: isRollover,
        });
      }
    }

    return {
      succes: true,
      mesaj: `Importate: ${importedCount} alimentări. Duplicate sărite: ${skippedCount}.${
        syncFleetKm ? ` Contoare KM sincronizate: ${kmSyncSummary.updatedCount} vehicule.` : ''
      }`,
      importedCount,
      skippedCount,
      newVehicles,
      duplicates,
      kmSyncSummary,
    };
  }

  // ==========================================
  // 7. RAPOARTE & GENERARE PDF
  // ==========================================

  async getReportStats(rawGestiuneId?: number, companyId?: number, startStr?: string, endStr?: string) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    let companyLastStart: string | null = null;
    let companyLastEnd: string | null = null;
    let hasSavedDates = false;

    if (companyId) {
      const c = await this.prisma.combustibilCompanie.findFirst({
        where: { id: Number(companyId), gestiuneId },
      });
      if (c && c.lastReportStart && c.lastReportEnd) {
        hasSavedDates = true;
        companyLastStart = c.lastReportStart.toISOString().slice(0, 16);
        companyLastEnd = c.lastReportEnd.toISOString().slice(0, 16);
      }
    }

    let totalLiters = 0;
    let count = 0;
    if (startStr && endStr) {
      const startDate = parseDateTimeInput(startStr, false);
      const endDate = parseDateTimeInput(endStr, true);
      const where: any = { gestiuneId, data: { gte: startDate, lte: endDate } };
      if (companyId) where.companieId = Number(companyId);
      const agg = await this.prisma.combustibilTranzactie.aggregate({
        where,
        _sum: { cantitate: true },
        _count: true,
      });
      totalLiters = Number((agg._sum.cantitate || 0).toFixed(2));
      count = agg._count;
    }

    return { totalLiters, count, hasSavedDates, companyLastStart, companyLastEnd };
  }

  async buildBonuriPdf(dto: {
    gestiuneId?: number;
    startDate: string;
    endDate: string;
    companyId?: number | null;
    bonNumber?: string;
  }) {
    const gestiuneId = await this.resolveGestiuneId(dto.gestiuneId);
    const gestiune = await this.prisma.combustibilGestiune.findUniqueOrThrow({ where: { id: gestiuneId } });
    const startDate = parseDateTimeInput(dto.startDate, false);
    const endDate = parseDateTimeInput(dto.endDate, true);

    const where: any = { gestiuneId, data: { gte: startDate, lte: endDate } };
    let companyName = 'Toate_Firmele';

    if (dto.companyId) {
      const comp = await this.prisma.combustibilCompanie.findFirst({
        where: { id: Number(dto.companyId), gestiuneId },
      });
      if (!comp) throw new NotFoundException('Compania nu a fost găsită.');
      where.companieId = comp.id;
      companyName = comp.nume;

      await this.prisma.combustibilCompanie.update({
        where: { id: comp.id },
        data: { lastReportStart: startDate, lastReportEnd: endDate },
      });
    }

    const trans = await this.prisma.combustibilTranzactie.findMany({
      where,
      include: { vehicul: true, companie: true },
      orderBy: { data: 'asc' },
    });

    if (trans.length === 0) {
      throw new BadRequestException('Nu s-au găsit alimentări în perioada selectată.');
    }

    const buffer = await generateBonuriPdf({
      gestiuneNume: gestiune.nume,
      tipCombustibil: gestiune.tipCombustibil || 'Motorină',
      bonNumber: dto.bonNumber || '—',
      transactions: trans.map((t) => ({
        id: t.id,
        data: t.data,
        cantitate: t.cantitate,
        numarAuto: t.vehicul?.numarAuto || 'N/A',
        companieNume: t.companie?.nume || 'NECUNOSCUT',
        companieCui: t.companie?.cui,
        companieAdresa: t.companie?.adresa,
        codProdus: t.companie?.codProdus,
      })),
    });

    const fmtPeriod = (d: Date) =>
      `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
    const filename = `${cleanFileToken(companyName) || 'Firma'}_${fmtPeriod(startDate)}-${fmtPeriod(endDate)}_${cleanFileToken(dto.bonNumber || '') || 'Bon'}.pdf`;

    return { buffer, filename };
  }

  async buildMonthlyReportPdf(dto: {
    gestiuneId?: number;
    startDate: string;
    endDate: string;
    initialSeries: number;
    finalSeries: number;
  }) {
    const gestiuneId = await this.resolveGestiuneId(dto.gestiuneId);
    const gestiune = await this.prisma.combustibilGestiune.findUniqueOrThrow({ where: { id: gestiuneId } });
    const startDate = parseDateTimeInput(dto.startDate, false);
    const endDate = parseDateTimeInput(dto.endDate, true);

    const [companii, allOps, allTrans] = await Promise.all([
      this.prisma.combustibilCompanie.findMany({ where: { gestiuneId }, orderBy: { id: 'asc' } }),
      this.prisma.combustibilOperatiuneStoc.findMany({
        where: { gestiuneId, data: { lte: endDate } },
        include: { companie: true },
        orderBy: { data: 'asc' },
      }),
      this.prisma.combustibilTranzactie.findMany({
        where: { gestiuneId, data: { lte: endDate } },
        include: { companie: true, vehicul: true },
        orderBy: { data: 'asc' },
      }),
    ]);

    const summaryRows = companii.map((c) => {
      const cOps = allOps.filter((o) => o.companieId === c.id);
      const cTrans = allTrans.filter((t) => t.companieId === c.id);

      const opsBefore = cOps.filter((o) => o.data < startDate);
      const transBefore = cTrans.filter((t) => t.data < startDate);
      const opsInPeriod = cOps.filter((o) => o.data >= startDate && o.data <= endDate);
      const transInPeriod = cTrans.filter((t) => t.data >= startDate && t.data <= endDate);

      const initFromBefore =
        opsBefore.filter((o) => o.tip === 'INITIAL' || o.tip === 'IN').reduce((s, o) => s + o.cantitate, 0) -
        opsBefore.filter((o) => o.tip === 'OUT').reduce((s, o) => s + o.cantitate, 0) -
        transBefore.reduce((s, t) => s + t.cantitate, 0);
      const initOpsInPeriod = opsInPeriod.filter((o) => o.tip === 'INITIAL').reduce((s, o) => s + o.cantitate, 0);

      const stocInitial = Number((initFromBefore + initOpsInPeriod).toFixed(2));
      const totalIntrat = Number(opsInPeriod.filter((o) => o.tip === 'IN').reduce((s, o) => s + o.cantitate, 0).toFixed(2));
      const totalIesit = Number(
        (
          opsInPeriod.filter((o) => o.tip === 'OUT').reduce((s, o) => s + o.cantitate, 0) +
          transInPeriod.reduce((s, t) => s + t.cantitate, 0)
        ).toFixed(2),
      );
      const stocFinal = Number((stocInitial + totalIntrat - totalIesit).toFixed(2));

      return { firma: c.nume, stocInitial, totalIntrat, totalIesit, stocFinal };
    });

    const totals = summaryRows.reduce(
      (acc, r) => ({
        stocInitial: Number((acc.stocInitial + r.stocInitial).toFixed(2)),
        totalIntrat: Number((acc.totalIntrat + r.totalIntrat).toFixed(2)),
        totalIesit: Number((acc.totalIesit + r.totalIesit).toFixed(2)),
        stocFinal: Number((acc.stocFinal + r.stocFinal).toFixed(2)),
      }),
      { stocInitial: 0, totalIntrat: 0, totalIesit: 0, stocFinal: 0 },
    );

    const chronological = [
      ...allOps
        .filter((o) => o.data >= startDate && o.data <= endDate)
        .map((o) => ({
          data: o.data,
          tip: o.tip,
          firma: o.companie?.nume || 'Nealocat',
          detalii: o.descriere || o.tip,
          cantitate: o.cantitate,
        })),
      ...allTrans
        .filter((t) => t.data >= startDate && t.data <= endDate)
        .map((t) => ({
          data: t.data,
          tip: 'CONSUM',
          firma: t.companie?.nume || 'Nealocat',
          detalii: t.vehicul?.numarAuto || 'Necunoscut',
          cantitate: t.cantitate,
        })),
    ].sort((a, b) => a.data.getTime() - b.data.getTime());

    const buffer = await generateRaportLunarPdf({
      gestiuneNume: gestiune.nume,
      startDate,
      endDate,
      initialSeries: Number(dto.initialSeries || 0),
      finalSeries: Number(dto.finalSeries || 0),
      summaryRows,
      totals,
      chronological,
    });

    const stamp = endDate.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `Raport_Lunar_${cleanFileToken(gestiune.nume) || 'Gestiune'}_${stamp}.pdf`;
    return { buffer, filename };
  }

  async buildAnalizaPdf(rawGestiuneId?: number, startStr?: string, endStr?: string) {
    const data = await this.getAnaliza(rawGestiuneId, startStr, endStr);
    const buffer = await generateAnalizaPdf({
      gestiuneNume: data.gestiune.nume,
      startDate: data.startDate,
      endDate: data.endDate,
      netFuelBudila: data.netEngineFuel,
      mcVanduti: data.mcValues.total_mc_vanduti,
      mcSortati: data.mcValues.mc_balast_sortati,
      effVanduti: data.scores.vanduti,
      effSortati: data.scores.sortati,
      budilaRows: data.budilaData,
      ghidfalauNetFuel: data.ghidfalauNetFuel,
      mcGhidfalau: data.mcValues.nisip_exploatat_ghidfalau,
      effGhidfalau: data.scores.ghidfalau,
      ghidfalauRows: data.ghidfalauData,
    });
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `${cleanFileToken(data.gestiune.nume) || 'Gestiune'}_Analiza_${stamp}.pdf`;
    return { buffer, filename };
  }

  // ==========================================
  // 8. ADMINISTRARE (COMPANII, VEHICULE, CATEGORII)
  // ==========================================

  async getAdminData(rawGestiuneId?: number) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    const [companii, categorii, allVehicule] = await Promise.all([
      this.prisma.combustibilCompanie.findMany({
        where: { gestiuneId },
        include: {
          vehicule: {
            include: { categorie: true },
            orderBy: { numarAuto: 'asc' },
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.combustibilCategorieVehicul.findMany({
        where: { gestiuneId },
        include: {
          vehicule: {
            include: { companie: true },
            orderBy: { numarAuto: 'asc' },
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.combustibilVehicul.findMany({
        where: { gestiuneId },
        include: { companie: true, categorie: true },
        orderBy: { numarAuto: 'asc' },
      }),
    ]);

    return {
      gestiuneId,
      companies: companii.map((c) => ({
        ...c,
        ...getCompanyVisual(c.nume, c.id),
      })),
      categories: categorii,
      unallocatedVehicles: allVehicule.filter((v) => v.companieId === null),
      uncategorizedVehicles: allVehicule.filter((v) => v.categorieId === null),
      allVehicles: allVehicule,
    };
  }

  async createCompanie(dto: { gestiuneId: number; nume: string; cui?: string; adresa?: string; codProdus?: string }) {
    const nume = String(dto.nume || '').trim();
    if (!nume) throw new BadRequestException('Numele companiei este obligatoriu.');
    return this.prisma.combustibilCompanie.create({
      data: {
        gestiuneId: Number(dto.gestiuneId),
        nume,
        cui: dto.cui?.trim() || null,
        adresa: dto.adresa?.trim() || null,
        codProdus: dto.codProdus?.trim() || null,
      },
    });
  }

  async updateCompanie(id: number, dto: { nume?: string; cui?: string; adresa?: string; codProdus?: string }) {
    const ex = await this.prisma.combustibilCompanie.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException('Compania nu a fost găsită.');
    return this.prisma.combustibilCompanie.update({
      where: { id },
      data: {
        nume: dto.nume !== undefined ? dto.nume.trim() : ex.nume,
        cui: dto.cui !== undefined ? dto.cui.trim() || null : ex.cui,
        adresa: dto.adresa !== undefined ? dto.adresa.trim() || null : ex.adresa,
        codProdus: dto.codProdus !== undefined ? dto.codProdus.trim() || null : ex.codProdus,
      },
    });
  }

  async deleteCompanie(id: number) {
    await this.prisma.combustibilCompanie.delete({ where: { id } });
    return { succes: true };
  }

  async createCategorie(dto: { gestiuneId: number; nume: string; descriere?: string; icon?: string }) {
    const nume = String(dto.nume || '').trim();
    if (!nume) throw new BadRequestException('Numele categoriei este obligatoriu.');
    return this.prisma.combustibilCategorieVehicul.create({
      data: {
        gestiuneId: Number(dto.gestiuneId),
        nume,
        descriere: dto.descriere?.trim() || null,
        icon: dto.icon?.trim() || 'truck',
      },
    });
  }

  async updateCategorie(id: number, dto: { nume?: string; descriere?: string; icon?: string }) {
    const ex = await this.prisma.combustibilCategorieVehicul.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException('Categoria nu a fost găsită.');
    return this.prisma.combustibilCategorieVehicul.update({
      where: { id },
      data: {
        nume: dto.nume !== undefined ? dto.nume.trim() : ex.nume,
        descriere: dto.descriere !== undefined ? dto.descriere.trim() || null : ex.descriere,
        icon: dto.icon !== undefined ? dto.icon.trim() || 'truck' : ex.icon,
      },
    });
  }

  async deleteCategorie(id: number) {
    await this.prisma.combustibilCategorieVehicul.delete({ where: { id } });
    return { succes: true };
  }

  async createVehicul(dto: { gestiuneId: number; numarAuto: string; companieId?: number | null; categorieId?: number | null }) {
    const numarAuto = String(dto.numarAuto || '').trim().toUpperCase();
    if (!numarAuto) throw new BadRequestException('Numărul auto este obligatoriu.');
    const exists = await this.prisma.combustibilVehicul.findUnique({
      where: { numarAuto_gestiuneId: { numarAuto, gestiuneId: Number(dto.gestiuneId) } },
    });
    if (exists) throw new BadRequestException(`Vehiculul ${numarAuto} există deja în această gestiune!`);
    return this.prisma.combustibilVehicul.create({
      data: {
        numarAuto,
        companieId: dto.companieId ? Number(dto.companieId) : null,
        categorieId: dto.categorieId ? Number(dto.categorieId) : null,
        gestiuneId: Number(dto.gestiuneId),
      },
    });
  }

  async updateVehicul(
    id: number,
    dto: { numarAuto?: string; companieId?: number | null; categorieId?: number | null },
  ) {
    const ex = await this.prisma.combustibilVehicul.findUnique({ where: { id } });
    if (!ex) throw new NotFoundException('Vehiculul nu a fost găsit.');
    return this.prisma.combustibilVehicul.update({
      where: { id },
      data: {
        numarAuto: dto.numarAuto !== undefined ? dto.numarAuto.trim().toUpperCase() : ex.numarAuto,
        companieId: dto.companieId !== undefined ? (dto.companieId ? Number(dto.companieId) : null) : ex.companieId,
        categorieId: dto.categorieId !== undefined ? (dto.categorieId ? Number(dto.categorieId) : null) : ex.categorieId,
      },
    });
  }

  async deleteVehicul(id: number) {
    await this.prisma.combustibilVehicul.delete({ where: { id } });
    return { succes: true };
  }

  async bulkSetVehicleCategory(gestiuneId: number, vehicleIds: number[], categorieId: number | null) {
    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) return { updated: 0 };
    const res = await this.prisma.combustibilVehicul.updateMany({
      where: { id: { in: vehicleIds.map(Number) }, gestiuneId },
      data: { categorieId: categorieId ? Number(categorieId) : null },
    });
    return { updated: res.count };
  }

  async bulkAssignVehicleCompany(gestiuneId: number, vehicleIds: number[], companieId: number | null) {
    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) return { updated: 0 };
    const res = await this.prisma.combustibilVehicul.updateMany({
      where: { id: { in: vehicleIds.map(Number) }, gestiuneId },
      data: { companieId: companieId ? Number(companieId) : null },
    });
    return { updated: res.count };
  }

  async exportGestiuneBackupJson(rawGestiuneId?: number) {
    const gestiuneId = await this.resolveGestiuneId(rawGestiuneId);
    const [gestiune, companii, categorii, vehicule, operatiuniStoc, tranzactii, setari] = await Promise.all([
      this.prisma.combustibilGestiune.findUniqueOrThrow({ where: { id: gestiuneId } }),
      this.prisma.combustibilCompanie.findMany({ where: { gestiuneId } }),
      this.prisma.combustibilCategorieVehicul.findMany({ where: { gestiuneId } }),
      this.prisma.combustibilVehicul.findMany({ where: { gestiuneId } }),
      this.prisma.combustibilOperatiuneStoc.findMany({ where: { gestiuneId } }),
      this.prisma.combustibilTranzactie.findMany({ where: { gestiuneId } }),
      this.prisma.combustibilSetare.findMany({ where: { gestiuneId } }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      source: 'FleetCMD Combustibil (Fuel Manager v6.2.1)',
      gestiune,
      companii,
      categorii,
      vehicule,
      operatiuniStoc,
      tranzactii,
      setari,
    };
  }
}
