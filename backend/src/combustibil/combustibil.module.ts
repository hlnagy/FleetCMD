import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CombustibilController } from './combustibil.controller';
import { CombustibilService } from './combustibil.service';

@Module({
  imports: [PrismaModule],
  controllers: [CombustibilController],
  providers: [CombustibilService],
  exports: [CombustibilService],
})
export class CombustibilModule {}
