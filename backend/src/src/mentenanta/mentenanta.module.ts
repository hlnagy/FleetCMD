import { Module } from '@nestjs/common';
import { MentenantaService } from './mentenanta.service';
import { MentenantaController } from './mentenanta.controller';

@Module({
  controllers: [MentenantaController],
  providers: [MentenantaService],
  exports: [MentenantaService],
})
export class MentenantaModule {}
