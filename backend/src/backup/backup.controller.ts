import { Controller, Get, Headers, Res } from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { Roles } from '../auth/roles.decorator';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Roles('ADMIN')
  @Get('stats')
  getDatabaseStats() {
    return this.backupService.getDatabaseStats();
  }

  @Roles('ADMIN')
  @Get('download')
  async downloadBackup(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-email') userEmail: string,
    @Headers('x-user-name') userNume: string,
    @Res() res: Response,
  ) {
    const backup = await this.backupService.generateFullBackup({
      id: userId,
      email: userEmail,
      nume: userNume,
    });

    const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `fleetcmd_backup_${nowStr}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(backup, null, 2));
  }
}
