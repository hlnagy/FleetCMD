import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { EFacturaService } from './efactura.service';

@Controller('efactura')
export class EFacturaController {
  constructor(private readonly efacturaService: EFacturaService) {}

  @Get('config')
  async getConfig() {
    return this.efacturaService.getConfig();
  }

  @Patch('config')
  async updateConfig(@Body() body: any) {
    return this.efacturaService.updateConfig(body);
  }

  // GENERARE URL AUTORIZARE OAUTH2 ANAF (Pasul 2)
  @Get('oauth/authorize-url')
  async getAuthorizeUrl() {
    return this.efacturaService.generateAuthorizeUrl();
  }

  // BEVÁLTÁS: EXCHANGE CODE FOR TOKENS (Pasul 3)
  @Post('oauth/exchange-code')
  async exchangeCode(@Body() body: { code: string }) {
    return this.efacturaService.exchangeCodeForToken(body.code);
  }

  // MANUÁLIS SZINKRONIZÁLÁS (FORCE SYNC) - Max 60 zile
  @Post('sync')
  async forceSync(@Body() body: { zile?: number }) {
    const zile = body?.zile || 15;
    return this.efacturaService.syncFacturi(zile);
  }

  @Get('facturi')
  async getFacturi(@Query('stare') stare?: string) {
    return this.efacturaService.getFacturi(stare);
  }

  @Get('facturi/:id')
  async getFacturaById(@Param('id') id: string) {
    return this.efacturaService.getFacturaById(id);
  }

  // IMPORT TÉTELENKÉNT RAKTÁRBA
  @Post('items/:itemId/importa')
  async importaItemInStoc(
    @Param('itemId') itemId: string,
    @Body() body: { depozitId?: string; categorieNume?: string; subcategorieNume?: string; codArticolCalculat?: string }
  ) {
    return this.efacturaService.importaItemInStoc(itemId, body);
  }

  // ELVET TÉTEL (REZSI / SERVICII)
  @Post('items/:itemId/elimina')
  async eliminaItem(@Param('itemId') itemId: string) {
    return this.efacturaService.eliminaItem(itemId);
  }
}
