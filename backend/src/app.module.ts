import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
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
    VehiculeModule,
    MentenantaModule,
    AnomaliiModule,
    AnvelopeModule,
    StocuriGarantiiModule,
    EFacturaModule,
  ],
})
export class AppModule {}
