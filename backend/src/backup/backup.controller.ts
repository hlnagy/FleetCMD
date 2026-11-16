import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Response } from 'express';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { BackupActor, BackupService } from './backup.service';

@Roles('ADMIN')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  private extractActor(req: any): BackupActor {
    return {
      id: req?.user?.sub,
      nume: req?.user?.nume || req?.user?.username || 'Administrator',
      email: req?.headers?.['x-user-email'],
      ip:
        (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req?.ip ||
        undefined,
    };
  }

  private verifyCronSecret(provided?: string) {
    const configured = process.env.CRON_SECRET?.trim();
    if (!configured || configured.length < 8) {
      throw new ForbiddenException('CRON_SECRET nu este configurat pe server.');
    }
    const candidate = (provided || '').trim();
    const bufA = Buffer.from(configured, 'utf8');
    const bufB = Buffer.from(candidate, 'utf8');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      throw new ForbiddenException('Acces cron interzis: secret invalid.');
    }
  }

  @Get('stats')
  getDatabaseStats() {
    return this.backupService.getDatabaseStats();
  }

  @Get('daily-status')
  getDailyStatus() {
    return this.backupService.getDailyStatus();
  }

  @Post('daily-run')
  async runDailyBackupNow(@Req() req: any) {
    const log = await this.backupService.runDailyBackup('MANUAL', this.extractActor(req));
    return {
      success: true,
      backup: {
        ...log,
        filePath: undefined,
      },
    };
  }

  @Public()
  @Post('cron-trigger')
  async triggerCronBackup(@Headers('x-cron-secret') headerSecret?: string) {
    this.verifyCronSecret(headerSecret);
    const log = await this.backupService.runDailyBackup('CRON');
    return {
      success: true,
      backupDate: log.backupDate,
      filename: log.filename,
      sizeBytes: log.sizeBytes,
      encrypted: log.encrypted,
      sha256: log.sha256,
    };
  }

  @Get('daily-download')
  async downloadDailyBackup(
    @Query('date') date: string | undefined,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const payload = await this.backupService.prepareDailyDownload(date, this.extractActor(req));

    res.setHeader('Content-Type', payload.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${payload.filename}"`);
    res.setHeader('X-Backup-Filename', payload.filename);
    res.setHeader('X-Backup-Sha256', payload.sha256);
    res.setHeader('X-Backup-Encrypted', String(payload.encrypted));
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Disposition, X-Backup-Filename, X-Backup-Sha256, X-Backup-Encrypted',
    );
    return res.send(payload.buffer);
  }

  @Get('download')
  async downloadBackup(@Req() req: any, @Res() res: Response) {
    const backup = await this.backupService.generateFullBackup(this.extractActor(req));

    const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `fleetcmd_backup_${nowStr}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(backup, null, 2));
  }
}
