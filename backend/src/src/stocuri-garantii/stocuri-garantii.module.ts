import { Module } from '@nestjs/common';
import { StocuriGarantiiService } from './stocuri-garantii.service';
import { StocuriGarantiiController } from './stocuri-garantii.controller';

@Module({
  controllers: [StocuriGarantiiController],
  providers: [StocuriGarantiiService],
  exports: [StocuriGarantiiService],
})
export class StocuriGarantiiModule {}
