import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(data: {
    userId?: string;
    userEmail?: string;
    userNume?: string;
    userRol?: string;
    actiune: string;
    modul: string;
    entitateTip?: string;
    entitateId?: string;
    detalii?: string;
    ipAdresa?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          userEmail: data.userEmail || null,
          userNume: data.userNume || 'Anonim / Sistem',
          userRol: data.userRol || 'OPERATOR',
          actiune: data.actiune,
          modul: data.modul,
          entitateTip: data.entitateTip || null,
          entitateId: data.entitateId || null,
          detalii: data.detalii || null,
          ipAdresa: data.ipAdresa || null,
        },
      });
    } catch (e) {
      console.error('Failed to write audit log:', e);
      return null;
    }
  }

  async getLogs(query: {
    limit?: number;
    offset?: number;
    modul?: string;
    actiune?: string;
    search?: string;
    userId?: string;
  }) {
    const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
    const offset = Math.max(0, Number(query.offset || 0));

    const where: any = {};

    if (query.modul && query.modul !== 'TOATE') {
      where.modul = query.modul;
    }

    if (query.actiune && query.actiune !== 'TOATE') {
      where.actiune = query.actiune;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { userNume: { contains: s } },
        { userEmail: { contains: s } },
        { detalii: { contains: s } },
        { actiune: { contains: s } },
        { entitateTip: { contains: s } },
        { entitateId: { contains: s } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
    };
  }
}
