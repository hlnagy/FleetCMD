import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EFacturaService } from './efactura.service';

@Injectable()
export class EFacturaCronService {
  private readonly logger = new Logger(EFacturaCronService.name);

  constructor(private readonly efacturaService: EFacturaService) {}

  // 1. Cron Job Háttérfolyamat: Óránként futó szinkronizáció
  @Cron(CronExpression.EVERY_HOUR)
  async handleHourlySyncCron() {
    this.logger.log(' Execuție Cron Job orar: Verificare și sincronizare e-Factura ANAF...');
    try {
      const cfg = await this.efacturaService.getConfig();
      if (!cfg.stareCronAuto) {
        this.logger.log('Cron Job-ul automat e-Factura este DEZACTIVAT în setări. Omiteri.');
        return;
      }

      if (!cfg.accessToken) {
        this.logger.warn('Token OAuth2 neconfigurat. Cron-ul e-Factura nu poate rula.');
        return;
      }

      // Verificare & Auto-refresh Token 48h înainte de expirare
      await this.efacturaService.refreshOAuthTokenIfNeeded();

      // Sincronizare mesaje pe intervalul stabilit (default 15 zile)
      const days = cfg.intervalZileSyncAuto || 15;
      await this.efacturaService.syncFacturi(days);
    } catch (err: any) {
      this.logger.error(`Eroare în Cron Job-ul orar e-Factura: ${err?.message || err}`);
    }
  }

  // 2. Cron Job Zilnic: Auto-refresh Token 48h înainte de 90 zile
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyTokenRefreshCheck() {
    this.logger.log(' Verificare zilnică valabilitate Token OAuth2 ANAF...');
    try {
      await this.efacturaService.refreshOAuthTokenIfNeeded();
    } catch (err: any) {
      this.logger.error(`Eroare la verificarea zilnică a token-ului ANAF: ${err?.message}`);
    }
  }
}
