import { Controller, Get, Post, Body, Query, Headers } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../auth/roles.decorator';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles('ADMIN')
  @Get('logs')
  getLogs(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('modul') modul?: string,
    @Query('actiune') actiune?: string,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditService.getLogs({
      limit,
      offset,
      modul,
      actiune,
      search,
      userId,
    });
  }

  @Post('log')
  createManualLog(
    @Body() body: {
      actiune: string;
      modul: string;
      entitateTip?: string;
      entitateId?: string;
      detalii?: string;
    },
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-email') userEmail?: string,
    @Headers('x-user-name') userNume?: string,
    @Headers('x-user-role') userRol?: string,
  ) {
    return this.auditService.logAction({
      userId,
      userEmail,
      userNume,
      userRol,
      ...body,
    });
  }
}
