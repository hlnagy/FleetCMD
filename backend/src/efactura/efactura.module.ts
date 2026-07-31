import { Module } from '@nestjs/common';
import { EFacturaService } from './efactura.service';
import { EFacturaController } from './efactura.controller';
import { EFacturaCronService } from './efactura-cron.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EFacturaController],
  providers: [EFacturaService, EFacturaCronService],
  exports: [EFacturaService],
})
export class EFacturaModule {}
