import { Module } from '@nestjs/common';
import { AnomaliiService } from './anomalii.service';
import { AnomaliiController } from './anomalii.controller';

@Module({
  controllers: [AnomaliiController],
  providers: [AnomaliiService],
  exports: [AnomaliiService],
})
export class AnomaliiModule {}
