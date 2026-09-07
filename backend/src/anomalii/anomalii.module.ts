import { Module } from '@nestjs/common';
import { AnomaliiService } from './anomalii.service';
import { AnomaliiController } from './anomalii.controller';
import { StocuriGarantiiModule } from '../stocuri-garantii/stocuri-garantii.module';

@Module({
  imports: [StocuriGarantiiModule],
  controllers: [AnomaliiController],
  providers: [AnomaliiService],
  exports: [AnomaliiService],
})
export class AnomaliiModule {}
