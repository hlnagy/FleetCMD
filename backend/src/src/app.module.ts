import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VehiculeModule } from './vehicule/vehicule.module';
import { MentenantaModule } from './mentenanta/mentenanta.module';
import { AnomaliiModule } from './anomalii/anomalii.module';
import { AnvelopeModule } from './anvelope/anvelope.module';
import { StocuriGarantiiModule } from './stocuri-garantii/stocuri-garantii.module';

@Module({
  imports: [
    PrismaModule,
    VehiculeModule,
    MentenantaModule,
    AnomaliiModule,
    AnvelopeModule,
    StocuriGarantiiModule,
  ],
})
export class AppModule {}
