import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { computeSha256, encryptBufferAes256Gcm } from './backup-crypto.util';
import { parsePgConnectionUrl, tryCreatePgDump } from './backup-pgdump.util';

export interface BackupActor {
  id?: string;
  email?: string;
  nume?: string;
  ip?: string;
}

const REDACTED_MARKER = '***REDACTED_IN_UNENCRYPTED_BACKUP***';
const TOTAL_DOMAIN_TABLES = 37;

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private tableEnsured = false;
  private activeBackupPromise: Promise<any> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureBackupLogTable();
  }

  /**
   * Ensure BackupLog exists even if `prisma db push` has not yet been run on the VPS.
   */
  private async ensureBackupLogTable(): Promise<void> {
    if (this.tableEnsured) return;
    const statements = [
      `CREATE TABLE IF NOT EXISTS "BackupLog" (
        "id" TEXT NOT NULL,
        "backupDate" TEXT NOT NULL,
        "triggerType" TEXT NOT NULL DEFAULT 'AUTO_NIGHTLY',
        "status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "engine" TEXT NOT NULL DEFAULT 'prisma-repeatable-read',
        "encrypted" BOOLEAN NOT NULL DEFAULT false,
        "filename" TEXT,
        "filePath" TEXT,
        "sizeBytes" INTEGER NOT NULL DEFAULT 0,
        "sha256" TEXT,
        "tableCount" INTEGER NOT NULL DEFAULT 0,
        "recordCount" INTEGER NOT NULL DEFAULT 0,
        "errorMessage" TEXT,
        "downloadedToLocalAt" TIMESTAMP(3),
        "downloadedByUserId" TEXT,
        "downloadedByName" TEXT,
        "downloadedCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BackupLog_backupDate_key" ON "BackupLog"("backupDate");`,
      `CREATE INDEX IF NOT EXISTS "BackupLog_backupDate_idx" ON "BackupLog"("backupDate");`,
      `CREATE INDEX IF NOT EXISTS "BackupLog_status_idx" ON "BackupLog"("status");`,
      `CREATE INDEX IF NOT EXISTS "BackupLog_createdAt_idx" ON "BackupLog"("createdAt");`,
    ];

    try {
      for (const sql of statements) {
        await this.prisma.$executeRawUnsafe(sql);
      }
      try {
        await this.prisma.$executeRawUnsafe(`ALTER TABLE public."BackupLog" ENABLE ROW LEVEL SECURITY;`);
      } catch {
        // Ignore if role lacks ALTER TABLE privilege or non-Supabase PostgreSQL setup
      }
      this.tableEnsured = true;
    } catch (err: any) {
      this.logger.warn(`Could not auto-verify BackupLog table: ${err?.message || err}`);
    }
  }

  getTodayDateRo(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private getEncryptionPassphrase(): string | null {
    const key = process.env.BACKUP_ENCRYPTION_KEY?.trim();
    if (!key || key.length < 8) return null;
    return key;
  }

  getBackupDir(): string {
    let dir: string;
    if (process.env.BACKUP_DIR && process.env.BACKUP_DIR.trim()) {
      dir = path.resolve(process.env.BACKUP_DIR.trim());
    } else if (fs.existsSync(path.resolve(process.cwd(), 'backend', 'package.json'))) {
      dir = path.resolve(process.cwd(), 'backups', 'daily');
    } else if (fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
      dir = path.resolve(process.cwd(), '..', 'backups', 'daily');
    } else {
      dir = path.resolve(__dirname, '..', '..', '..', 'backups', 'daily');
    }
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private getUploadsRootDir(): string | null {
    const candidates = [
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(process.cwd(), 'backend', 'uploads'),
      path.resolve(__dirname, '..', '..', 'uploads'),
      path.resolve(__dirname, '..', '..', '..', 'uploads'),
      path.resolve(__dirname, '..', '..', '..', 'backend', 'uploads'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return null;
  }

  /**
   * Automatic nightly backup at 02:00 Europe/Bucharest time.
   */
  @Cron('0 2 * * *', { timeZone: 'Europe/Bucharest' })
  async handleNightlyBackupCron() {
    this.logger.log('Pornire backup automat nocturn FleetCMD (02:00 Europe/Bucharest)...');
    try {
      await this.runDailyBackup('AUTO_NIGHTLY');
    } catch (err: any) {
      this.logger.error(`Eroare la backup-ul automat nocturn: ${err?.message || err}`);
    }
  }

  async getDatabaseStats() {
    await this.ensureBackupLogTable();

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
        versionRows,
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
        this.prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`,
      ]);

      const conn = parsePgConnectionUrl(process.env.DIRECT_URL || process.env.DATABASE_URL);
      const rawPgVersion = versionRows?.[0]?.version || 'PostgreSQL';
      const pgMatch = rawPgVersion.match(/PostgreSQL\s+[\d.]+/i);
      const engineLabel = pgMatch ? pgMatch[0] : 'PostgreSQL';

      return {
        status: 'ONLINE',
        provider: process.env.VPS_PROVIDER_LABEL || 'Contabo Cloud VPS (NVMe)',
        engine: engineLabel,
        region: process.env.VPS_REGION_LABEL || 'EU / Auto-detectat',
        host: conn ? `${conn.host}:${conn.port}` : 'Localhost',
        database: conn?.database || 'cmms_flota',
        totalTables: TOTAL_DOMAIN_TABLES,
        encryptionConfigured: Boolean(this.getEncryptionPassphrase()),
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
    } catch (error: any) {
      this.logger.error('Failed to get database stats', error);
      return {
        status: 'ERROR',
        message: error?.message || 'Eroare necunoscută',
      };
    }
  }

  /**
   * Collect all 37 domain tables inside a single RepeatableRead PostgreSQL snapshot.
   */
  private async collectFullDatabaseSnapshot(includeSensitiveCredentials: boolean) {
    return this.prisma.$transaction(
      async (tx) => {
        const categoriiVehicul = await tx.categorieVehicul.findMany();
        const vehicule = await tx.vehicul.findMany();
        const istoricCuplari = await tx.istoricCuplare.findMany();
        const istoricContoareVehicule = await tx.istoricContorVehicul.findMany();
        const perioadeFunctionareMth = await tx.perioadaFunctionareMth.findMany();
        const configurariUleiVehicule = await tx.configurareUleiVehicul.findMany();
        const configurariUleiCategorii = await tx.configurareUleiCategorie.findMany();
        const profileMentenanta = await tx.profilMentenanta.findMany();
        const profileVehicule = await tx.profilMentenantaVehicul.findMany();
        const sarciniMentenanta = await tx.sarcinaMentenanta.findMany();
        const comenziLucru = await tx.comandaLucru.findMany();
        const elementeComanda = await tx.elementComandaLucru.findMany();
        const mecanici = await tx.mecanic.findMany();
        const componenteSerializate = await tx.componentaSerializata.findMany();
        const completariLichide = await tx.completareLichid.findMany();
        const anvelope = await tx.anvelopa.findMany();
        const pozitiiAxe = await tx.pozitieAx.findMany();
        const masuratoriUzura = await tx.masurareUzuraAnvelopa.findMany();
        const istoricPermutari = await tx.istoricPermutareAnvelopa.findMany();
        const depozite = await tx.depozit.findMany();
        const categoriiStoc = await tx.categorieStoc.findMany();
        const subcategoriiStoc = await tx.subcategorieStoc.findMany();
        const articoleStoc = await tx.articolStoc.findMany();
        const transferuriStoc = await tx.transferStoc.findMany();
        const intrariStoc = await tx.intrareStoc.findMany();
        const documenteVehicul = await tx.documentVehicul.findMany();
        const rawFisiere = await tx.documentFisier.findMany();
        const reguliMentenanta = await tx.regulaAlertaMentenanta.findMany();
        const alertePersonalizate = await tx.alertaPersonalizata.findMany();
        const executiiReguliVehicule = await tx.executieRegulaVehicul.findMany();
        const rawEfacturaConfig = await tx.eFacturaConfig.findMany();
        const efacturaFacturi = await tx.eFacturaFactura.findMany();
        const efacturaItemi = await tx.eFacturaItem.findMany();
        const efacturaExclusi = await tx.eFacturaFurnizorExclus.findMany();
        const utilizatori = includeSensitiveCredentials
          ? await tx.user.findMany()
          : await tx.user.findMany({
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
            });
        const auditLogs = await tx.auditLog.findMany({ orderBy: { createdAt: 'desc' } });
        const aiMemories = await tx.aiMemory.findMany();

        const documenteFisiere = rawFisiere.map((f) => ({
          ...f,
          continutEncoding: 'base64',
          continut: f.continut ? Buffer.from(f.continut).toString('base64') : null,
        }));

        const efacturaConfig = includeSensitiveCredentials
          ? rawEfacturaConfig
          : rawEfacturaConfig.map((cfg) => ({
              ...cfg,
              clientSecret: cfg.clientSecret ? REDACTED_MARKER : null,
              accessToken: cfg.accessToken ? REDACTED_MARKER : null,
              refreshToken: cfg.refreshToken ? REDACTED_MARKER : null,
            }));

        return {
          categoriiVehicul,
          vehicule,
          istoricCuplari,
          istoricContoareVehicule,
          perioadeFunctionareMth,
          configurariUleiVehicule,
          configurariUleiCategorii,
          profileMentenanta,
          profileVehicule,
          sarciniMentenanta,
          comenziLucru,
          elementeComanda,
          mecanici,
          componenteSerializate,
          completariLichide,
          anvelope,
          pozitiiAxe,
          masuratoriUzura,
          istoricPermutari,
          depozite,
          categoriiStoc,
          subcategoriiStoc,
          articoleStoc,
          transferuriStoc,
          intrariStoc,
          documenteVehicul,
          documenteFisiere,
          reguliMentenanta,
          alertePersonalizate,
          executiiReguliVehicule,
          efacturaConfig,
          efacturaFacturi,
          efacturaItemi,
          efacturaExclusi,
          utilizatori,
          auditLogs,
          aiMemories,
        };
      },
      {
        isolationLevel: 'RepeatableRead',
        maxWait: 10000,
        timeout: 60000,
      },
    );
  }

  private countRecords(data: Record<string, unknown[]>): { tableCount: number; recordCount: number } {
    const keys = Object.keys(data);
    let recordCount = 0;
    for (const k of keys) {
      if (Array.isArray(data[k])) {
        recordCount += data[k].length;
      }
    }
    return { tableCount: keys.length, recordCount };
  }

  /**
   * Legacy JSON backup endpoint (always redacts plaintext passwords and OAuth secrets).
   */
  async generateFullBackup(actorUser?: BackupActor) {
    await this.ensureBackupLogTable();
    this.logger.log(`Generating full JSON backup requested by ${actorUser?.email || actorUser?.nume || 'Admin'}`);

    const data = await this.collectFullDatabaseSnapshot(false);
    const { tableCount, recordCount } = this.countRecords(data);

    await this.recordAudit('EXPORT_BACKUP', `Export JSON complet (${tableCount} tabele, ${recordCount} înregistrări, secrete mascate)`, actorUser);

    return {
      metadata: {
        app: 'FleetCMD Enterprise CMMS',
        version: '2.1.0',
        tip: 'FULL_SNAPSHOT_REDACTED',
        isolationLevel: 'RepeatableRead',
        credentialsRedacted: true,
        timestamp: new Date().toISOString(),
        generatDe: actorUser?.nume || actorUser?.email || 'Administrator',
        tableCount,
        recordCount,
      },
      data,
    };
  }

  /**
   * Generate and persist today's authoritative backup package (mutex-protected).
   */
  async runDailyBackup(
    triggerType: 'AUTO_NIGHTLY' | 'AUTO_CATCHUP' | 'MANUAL' | 'CRON' = 'MANUAL',
    actorUser?: BackupActor,
  ) {
    if (this.activeBackupPromise) {
      return this.activeBackupPromise;
    }

    this.activeBackupPromise = this.executeDailyBackup(triggerType, actorUser).finally(() => {
      this.activeBackupPromise = null;
    });

    return this.activeBackupPromise;
  }

  private async executeDailyBackup(
    triggerType: 'AUTO_NIGHTLY' | 'AUTO_CATCHUP' | 'MANUAL' | 'CRON',
    actorUser?: BackupActor,
  ) {
    await this.ensureBackupLogTable();

    const backupDate = this.getTodayDateRo();
    const passphrase = this.getEncryptionPassphrase();
    const isEncrypted = Boolean(passphrase);
    const backupDir = this.getBackupDir();
    const ext = isEncrypted ? 'fleetbak' : 'zip';
    const filename = `fleetcmd_backup_${backupDate}.${ext}`;
    const finalPath = path.resolve(backupDir, filename);
    const tmpZipPath = `${finalPath}.tmp`;
    const tmpDumpPath = path.join(os.tmpdir(), `fleetcmd_pg_${backupDate}_${Date.now()}.dump`);

    await this.prisma.backupLog.upsert({
      where: { backupDate },
      create: {
        backupDate,
        triggerType,
        status: 'RUNNING',
        encrypted: isEncrypted,
      },
      update: {
        triggerType,
        status: 'RUNNING',
        encrypted: isEncrypted,
        errorMessage: null,
      },
    });

    try {
      // 1. Consistent DB snapshot (full secrets only inside AES-256-GCM encrypted archive)
      const data = await this.collectFullDatabaseSnapshot(isEncrypted);
      const { tableCount, recordCount } = this.countRecords(data);

      // 2. Attempt native or Docker pg_dump when encrypted archive is active
      let engine = 'prisma-repeatable-read';
      let pgDumpBuffer: Buffer | undefined;
      if (isEncrypted) {
        const dumpRes = tryCreatePgDump(tmpDumpPath);
        if (dumpRes.ok && dumpRes.dumpBuffer) {
          pgDumpBuffer = dumpRes.dumpBuffer;
          engine = `pg_dump+prisma (${dumpRes.method})`;
        } else {
          this.logger.log(`pg_dump indisponibil (${dumpRes.reason}) — se folosește snapshot-ul Prisma RepeatableRead.`);
        }
      }

      // 3. Build ZIP bundle
      const zip = new AdmZip();
      const jsonFileName = isEncrypted ? 'database_full.json' : 'database_redacted.json';
      const jsonPayload = Buffer.from(
        JSON.stringify(
          {
            metadata: {
              app: 'FleetCMD Enterprise CMMS',
              version: '2.1.0',
              backupDate,
              triggerType,
              engine,
              encrypted: isEncrypted,
              credentialsRedacted: !isEncrypted,
              timestamp: new Date().toISOString(),
              tableCount,
              recordCount,
            },
            data,
          },
          null,
          2,
        ),
        'utf8',
      );
      zip.addFile(jsonFileName, jsonPayload);

      if (pgDumpBuffer) {
        zip.addFile('database.dump', pgDumpBuffer);
      }

      // Include disk uploads (documents/images) if directory exists
      const uploadsRoot = this.getUploadsRootDir();
      let uploadedFilesCount = 0;
      if (uploadsRoot && fs.existsSync(uploadsRoot)) {
        const files = this.listFilesRecursive(uploadsRoot);
        for (const fullFile of files) {
          const rel = path.relative(uploadsRoot, fullFile).split(path.sep).join('/');
          zip.addFile(`uploads/${rel}`, fs.readFileSync(fullFile));
          uploadedFilesCount++;
        }
      }

      const manifest = {
        app: 'FleetCMD Enterprise CMMS',
        backupDate,
        createdAt: new Date().toISOString(),
        triggerType,
        engine,
        encrypted: isEncrypted,
        credentialsRedacted: !isEncrypted,
        tableCount,
        recordCount,
        uploadedFilesCount,
        includesPgDump: Boolean(pgDumpBuffer),
      };
      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

      const rawZipBuffer = zip.toBuffer();
      const finalBuffer = isEncrypted && passphrase ? encryptBufferAes256Gcm(rawZipBuffer, passphrase) : rawZipBuffer;
      const sha256 = computeSha256(finalBuffer);

      fs.writeFileSync(tmpZipPath, finalBuffer);
      fs.renameSync(tmpZipPath, finalPath);

      // Remove stale alternate extension from the same day if encryption setting changed
      const altPath = path.resolve(backupDir, `fleetcmd_backup_${backupDate}.${isEncrypted ? 'zip' : 'fleetbak'}`);
      if (fs.existsSync(altPath)) {
        try {
          fs.unlinkSync(altPath);
        } catch {
          // ignore
        }
      }

      this.cleanupOldBackups(backupDir);

      const savedLog = await this.prisma.backupLog.update({
        where: { backupDate },
        data: {
          triggerType,
          status: 'SUCCESS',
          engine,
          encrypted: isEncrypted,
          filename,
          filePath: finalPath,
          sizeBytes: finalBuffer.length,
          sha256,
          tableCount,
          recordCount,
          errorMessage: null,
          // New backup version generated -> reset downloaded flag only when a fresh auto/manual run replaces it
          downloadedToLocalAt: null,
          downloadedByUserId: null,
          downloadedByName: null,
        },
      });

      await this.recordAudit(
        triggerType === 'MANUAL' ? 'MANUAL_DAILY_BACKUP' : 'AUTO_DAILY_BACKUP',
        `Backup zilnic creat (${filename}, ${(finalBuffer.length / 1024).toFixed(1)} KB, criptat: ${isEncrypted ? 'DA' : 'NU'}, tabele: ${tableCount})`,
        actorUser,
      );

      return savedLog;
    } catch (err: any) {
      const msg = err?.message || 'Eroare necunoscută la generarea backup-ului';
      this.logger.error(`Daily backup failed (${backupDate}): ${msg}`, err?.stack);
      await this.prisma.backupLog.update({
        where: { backupDate },
        data: {
          status: 'FAILED',
          errorMessage: msg.slice(0, 500),
        },
      });
      throw err;
    } finally {
      if (fs.existsSync(tmpZipPath)) {
        try {
          fs.unlinkSync(tmpZipPath);
        } catch {}
      }
      if (fs.existsSync(tmpDumpPath)) {
        try {
          fs.unlinkSync(tmpDumpPath);
        } catch {}
      }
    }
  }

  private listFilesRecursive(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...this.listFilesRecursive(full));
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
    return out;
  }

  private cleanupOldBackups(backupDir: string): void {
    const retentionDays = Math.max(7, parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10) || 30);
    const nowMs = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
    const monthlyMaxAgeMs = 180 * 24 * 60 * 60 * 1000;

    try {
      for (const name of fs.readdirSync(backupDir)) {
        const match = name.match(/^fleetcmd_backup_(\d{4}-\d{2}-\d{2})\.(fleetbak|zip)$/);
        if (!match) continue;
        const dateStr = match[1];
        const fileDateMs = Date.parse(`${dateStr}T00:00:00Z`);
        if (Number.isNaN(fileDateMs)) continue;

        const ageMs = nowMs - fileDateMs;
        const isFirstOfMonth = dateStr.endsWith('-01');
        const limit = isFirstOfMonth ? monthlyMaxAgeMs : maxAgeMs;
        if (ageMs > limit) {
          fs.unlinkSync(path.resolve(backupDir, name));
          this.logger.log(`Retention cleanup: șters backup vechi ${name}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Retention cleanup warning: ${err?.message || err}`);
    }
  }

  async getDailyStatus() {
    await this.ensureBackupLogTable();

    const todayDate = this.getTodayDateRo();
    let todayLog = await this.prisma.backupLog.findUnique({ where: { backupDate: todayDate } });

    // Catch-up if server was offline at 02:00 AM and no backup exists yet for today
    if (!todayLog && !this.activeBackupPromise) {
      void this.runDailyBackup('AUTO_CATCHUP').catch((err) => {
        this.logger.warn(`Catch-up daily backup failed: ${err?.message || err}`);
      });
      todayLog = await this.prisma.backupLog.findUnique({ where: { backupDate: todayDate } });
    }

    const recentBackups = await this.prisma.backupLog.findMany({
      orderBy: { backupDate: 'desc' },
      take: 14,
      select: {
        id: true,
        backupDate: true,
        triggerType: true,
        status: true,
        engine: true,
        encrypted: true,
        filename: true,
        sizeBytes: true,
        sha256: true,
        tableCount: true,
        recordCount: true,
        errorMessage: true,
        downloadedToLocalAt: true,
        downloadedByName: true,
        downloadedCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const isRunning = Boolean(this.activeBackupPromise) || todayLog?.status === 'RUNNING';
    const needsLocalDownload =
      isRunning ||
      !todayLog ||
      todayLog.status === 'FAILED' ||
      !todayLog.downloadedToLocalAt ||
      !this.doesArchiveExistSafely(todayLog.filename);

    return {
      todayDate,
      encryptionConfigured: Boolean(this.getEncryptionPassphrase()),
      isRunning,
      needsLocalDownload,
      todayBackup: todayLog
        ? {
            ...todayLog,
            filePath: undefined, // never leak server internal paths to frontend
            fileAvailable: this.doesArchiveExistSafely(todayLog.filename),
          }
        : null,
      recentBackups,
    };
  }

  private doesArchiveExistSafely(filename?: string | null): boolean {
    if (!filename) return false;
    const backupDir = this.getBackupDir();
    const clean = path.basename(filename);
    const resolved = path.resolve(backupDir, clean);
    if (!resolved.startsWith(backupDir + path.sep) && resolved !== backupDir) {
      return false;
    }
    return fs.existsSync(resolved);
  }

  async prepareDailyDownload(requestedDate?: string, actorUser?: BackupActor) {
    await this.ensureBackupLogTable();

    const todayDate = this.getTodayDateRo();
    const targetDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : todayDate;

    let logEntry = await this.prisma.backupLog.findUnique({ where: { backupDate: targetDate } });

    if (
      targetDate === todayDate &&
      (!logEntry || logEntry.status !== 'SUCCESS' || !this.doesArchiveExistSafely(logEntry.filename))
    ) {
      logEntry = await this.runDailyBackup('MANUAL', actorUser);
    }

    if (!logEntry || !logEntry.filename || !this.doesArchiveExistSafely(logEntry.filename)) {
      throw new NotFoundException(`Nu există fișier de backup disponibil pe server pentru data ${targetDate}.`);
    }

    const backupDir = this.getBackupDir();
    const cleanName = path.basename(logEntry.filename);
    const resolvedPath = path.resolve(backupDir, cleanName);

    if (!resolvedPath.startsWith(backupDir + path.sep)) {
      throw new NotFoundException('Cale backup invalidă.');
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const sha256 = computeSha256(fileBuffer);

    await this.prisma.backupLog.update({
      where: { backupDate: targetDate },
      data: {
        downloadedToLocalAt: new Date(),
        downloadedByUserId: actorUser?.id || null,
        downloadedByName: actorUser?.nume || actorUser?.email || 'Administrator',
        downloadedCount: { increment: 1 },
      },
    });

    await this.recordAudit(
      'DOWNLOAD_DAILY_BACKUP',
      `Descărcare backup zilnic (${cleanName}, SHA-256: ${sha256.slice(0, 12)}...) pe calculatorul local`,
      actorUser,
    );

    return {
      filename: cleanName,
      encrypted: logEntry.encrypted,
      sha256,
      buffer: fileBuffer,
      contentType: logEntry.encrypted ? 'application/octet-stream' : 'application/zip',
    };
  }

  private async recordAudit(actiune: string, detalii: string, actorUser?: BackupActor) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actiune,
          modul: 'BACKUP_BAZA_DATE',
          entitateTip: 'DATABASE',
          detalii,
          userId: actorUser?.id || null,
          userEmail: actorUser?.email || null,
          userNume: actorUser?.nume || 'SYSTEM',
          userRol: 'ADMIN',
          ipAdresa: actorUser?.ip || null,
        },
      });
    } catch (e) {
      this.logger.warn('Could not record backup event in audit log', e);
    }
  }
}
