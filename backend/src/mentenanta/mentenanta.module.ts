import { Module } from '@nestjs/common';
import { MentenantaService } from './mentenanta.service';
import { MentenantaController } from './mentenanta.controller';
import { StocuriGarantiiModule } from '../stocuri-garantii/stocuri-garantii.module';

@Module({
  imports: [StocuriGarantiiModule],
  controllers: [MentenantaController],
  providers: [MentenantaService],
  exports: [MentenantaService],
})
export class MentenantaModule {}
