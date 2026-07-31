import { Module } from '@nestjs/common';
import { AnvelopeService } from './anvelope.service';
import { AnvelopeController } from './anvelope.controller';

@Module({
  controllers: [AnvelopeController],
  providers: [AnvelopeService],
  exports: [AnvelopeService],
})
export class AnvelopeModule {}
