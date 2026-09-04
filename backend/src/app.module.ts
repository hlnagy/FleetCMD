import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { VehiculeModule } from './vehicule/vehicule.module';
import { MentenantaModule } from './mentenanta/mentenanta.module';
import { AnomaliiModule } from './anomalii/anomalii.module';
import { AnvelopeModule } from './anvelope/anvelope.module';
import { StocuriGarantiiModule } from './stocuri-garantii/stocuri-garantii.module';
import { EFacturaModule } from './efactura/efactura.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    AuditModule,
    VehiculeModule,
    MentenantaModule,
    AnomaliiModule,
    AnvelopeModule,
    StocuriGarantiiModule,
    EFacturaModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
