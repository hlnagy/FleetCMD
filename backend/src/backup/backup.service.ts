import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDatabaseStats() {
    try {
      const [
        vehicule,
        documenteVehicul,
        categoriiVehicul,
        mecanici,
        depozite,
        articoleStoc,
        anvelope,
        comenziLucru,
        efacturi,
        utilizatori,
        auditLogs,
      ] = await Promise.all([
        this.prisma.vehicul.count(),
        this.prisma.documentVehicul.count(),
        this.prisma.categorieVehicul.count(),
        this.prisma.mecanic.count(),
        this.prisma.depozit.count(),
        this.prisma.articolStoc.count(),
        this.prisma.anvelopa.count(),
        this.prisma.comandaLucru.count(),
        this.prisma.eFacturaFactura.count(),
        this.prisma.user.count(),
        this.prisma.auditLog.count(),
      ]);

      return {
        status: 'ONLINE',
        provider: 'Oracle Cloud Infrastructure (Always Free Tier)',
        engine: 'PostgreSQL 17',
        region: 'Frankfurt (eu-central-1)',
        host: '130.61.136.204:5432',
        counts: {
          vehicule,
          documenteVehicul,
          categoriiVehicul,
          mecanici,
          depozite,
          articoleStoc,
          anvelope,
          comenziLucru,
          efacturi,
          utilizatori,
          auditLogs,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get database stats', error);
      return {
        status: 'ERROR',
        message: error.message,
      };
    }
  }

  async generateFullBackup(actorUser?: { id: string; email?: string; nume?: string }) {
    this.logger.log(`Generating full database backup requested by ${actorUser?.email || 'Admin'}`);

    const [
      vehicule,
      documenteVehicul,
      categoriiVehicul,
      mecanici,
      depozite,
      articoleStoc,
      categoriiStoc,
      subcategoriiStoc,
      intrariStoc,
      transferuriStoc,
      anvelope,
      pozitiiAxe,
      istoricPermutari,
      masuratoriUzura,
      comenziLucru,
      elementeComanda,
      reguliMentenanta,
      profileMentenanta,
      profileVehicule,
      sarciniMentenanta,
      efacturaFacturi,
      efacturaItemi,
      efacturaConfig,
      efacturaExclusi,
      utilizatori,
      auditLogs,
      aiMemories,
    ] = await Promise.all([
      this.prisma.vehicul.findMany(),
      this.prisma.documentVehicul.findMany(),
      this.prisma.categorieVehicul.findMany(),
      this.prisma.mecanic.findMany(),
      this.prisma.depozit.findMany(),
      this.prisma.articolStoc.findMany(),
      this.prisma.categorieStoc.findMany(),
      this.prisma.subcategorieStoc.findMany(),
      this.prisma.intrareStoc.findMany(),
      this.prisma.transferStoc.findMany(),
      this.prisma.anvelopa.findMany(),
      this.prisma.pozitieAx.findMany(),
      this.prisma.istoricPermutareAnvelopa.findMany(),
      this.prisma.masurareUzuraAnvelopa.findMany(),
      this.prisma.comandaLucru.findMany(),
      this.prisma.elementComandaLucru.findMany(),
      this.prisma.regulaAlertaMentenanta.findMany(),
      this.prisma.profilMentenanta.findMany(),
      this.prisma.profilMentenantaVehicul.findMany(),
      this.prisma.sarcinaMentenanta.findMany(),
      this.prisma.eFacturaFactura.findMany(),
      this.prisma.eFacturaItem.findMany(),
      this.prisma.eFacturaConfig.findMany(),
      this.prisma.eFacturaFurnizorExclus.findMany(),
      this.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          nume: true,
          email: true,
          rol: true,
          activ: true,
          functie: true,
          telefon: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.auditLog.findMany({ take: 2000, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiMemory.findMany(),
    ]);

    // Înregistrăm acțiunea de export în jurnalul de audit
    try {
      await this.prisma.auditLog.create({
        data: {
          actiune: 'EXPORT_BACKUP',
          modul: 'BACKUP_BAZA_DATE',
          entitateTip: 'DATABASE',
          detalii: `Descărcare copie de siguranță completă (${vehicule.length} vehicule, ${documenteVehicul.length} documente, ${articoleStoc.length} stocuri)`,
          userId: actorUser?.id,
          userEmail: actorUser?.email,
          userNume: actorUser?.nume,
        },
      });
    } catch (e) {
      this.logger.warn('Could not record backup in audit log', e);
    }

    return {
      metadata: {
        app: 'FleetCMD Enterprise CMMS',
        version: '2.0.0',
        tip: 'FULL_BACKUP',
        timestamp: new Date().toISOString(),
        generatDe: actorUser?.nume || actorUser?.email || 'Administrator',
        serverHost: 'Oracle Cloud Infrastructure (PostgreSQL 17)',
        totalEntitati: {
          vehicule: vehicule.length,
          documenteVehicul: documenteVehicul.length,
          categoriiVehicul: categoriiVehicul.length,
          mecanici: mecanici.length,
          depozite: depozite.length,
          articoleStoc: articoleStoc.length,
          categoriiStoc: categoriiStoc.length,
          subcategoriiStoc: subcategoriiStoc.length,
          anvelope: anvelope.length,
          comenziLucru: comenziLucru.length,
          efacturi: efacturaFacturi.length,
          utilizatori: utilizatori.length,
          auditLogs: auditLogs.length,
        },
      },
      data: {
        vehicule,
        documenteVehicul,
        categoriiVehicul,
        mecanici,
        depozite,
        articoleStoc,
        categoriiStoc,
        subcategoriiStoc,
        intrariStoc,
        transferuriStoc,
        anvelope,
        pozitiiAxe,
        istoricPermutari,
        masuratoriUzura,
        comenziLucru,
        elementeComanda,
        reguliMentenanta,
        profileMentenanta,
        profileVehicule,
        sarciniMentenanta,
        efacturaFacturi,
        efacturaItemi,
        efacturaConfig,
        efacturaExclusi,
        utilizatori,
        auditLogs,
        aiMemories,
      },
    };
  }
}
