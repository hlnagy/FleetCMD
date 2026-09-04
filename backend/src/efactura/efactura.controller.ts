import { Controller, Get, Post, Patch, Body, Param, Query, Headers, ForbiddenException } from '@nestjs/common';
import { EFacturaService } from './efactura.service';
import { Roles } from '../auth/roles.decorator';

@Roles('ADMIN', 'OPERATOR')
@Controller('efactura')
export class EFacturaController {
  constructor(private readonly efacturaService: EFacturaService) {}

  @Get('config')
  async getConfig(@Headers('x-user-role') role?: string) {
    if (role === 'VIEWER') {
      throw new ForbiddenException('Acces restricționat: Rolul de Vizitator nu are permisiunea de a accesa configurația facturilor.');
    }
    const isAdmin = role === 'ADMIN';
    return this.efacturaService.getConfig(isAdmin);
  }

  @Roles('ADMIN')
  @Patch('config')
  async updateConfig(@Body() body: any, @Headers('x-user-role') role?: string) {
    if (role && role !== 'ADMIN') {
      throw new ForbiddenException('Doar administratorul are permisiunea de a modifica configurația OAuth2 ANAF.');
    }
    return this.efacturaService.updateConfig(body);
  }

  // GENERARE URL AUTORIZARE OAUTH2 ANAF (Pasul 2)
  @Roles('ADMIN')
  @Get('oauth/authorize-url')
  async getAuthorizeUrl(@Headers('x-user-role') role?: string) {
    if (role && role !== 'ADMIN') {
      throw new ForbiddenException('Doar administratorul poate iniția autorizarea OAuth2 ANAF.');
    }
    return this.efacturaService.generateAuthorizeUrl();
  }

  // SCHIMB COD PENTRU TOKEN-URI JWT (Pasul 3)
  @Roles('ADMIN')
  @Post('oauth/exchange-code')
  async exchangeCode(@Body() body: { code: string }, @Headers('x-user-role') role?: string) {
    if (role && role !== 'ADMIN') {
      throw new ForbiddenException('Doar administratorul poate schimba codul OAuth2 ANAF.');
    }
    return this.efacturaService.exchangeCodeForToken(body.code);
  }

  // SINCRONIZARE MANUALĂ (FORCE SYNC) - Max 60 zile
  @Post('sync')
  async forceSync(@Body() body: { zile?: number }) {
    const zile = body?.zile || 15;
    return this.efacturaService.syncFacturi(zile);
  }

  // STATUS SINCRONIZARE ÎN FUNDAL
  @Get('sync/status')
  async getSyncStatus() {
    return this.efacturaService.getSyncStatus();
  }

  // ÎNCĂRCARE DIRECTĂ FIȘIERE XML / ZIP DIN SPV
  @Post('upload')
  async uploadFiles(@Body() body: { files: Array<{ numeFisier: string; continutBase64: string }> }) {
    return this.efacturaService.incarcaFisiereXmlSauZip(body.files || []);
  }

  @Get('facturi')
  async getFacturi(@Query('stare') stare?: string, @Headers('x-user-role') role?: string) {
    if (role === 'VIEWER') {
      throw new ForbiddenException('Acces restricționat: Rolul de Vizitator nu are permisiunea de a accesa facturile fiscale.');
    }
    return this.efacturaService.getFacturi(stare);
  }

  @Get('facturi/:id')
  async getFacturaById(@Param('id') id: string, @Headers('x-user-role') role?: string) {
    if (role === 'VIEWER') {
      throw new ForbiddenException('Acces restricționat: Rolul de Vizitator nu are permisiunea de a accesa facturile fiscale.');
    }
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

  // EXCLUDE TOATĂ FACTURA (SERVICII / REZSHI PE TOT DOCUMENTUL)
  @Post('facturi/:id/elimina-tot')
  async eliminaToataFactura(@Param('id') id: string) {
    return this.efacturaService.eliminaToataFactura(id);
  }

  // TÖMEGES FACTURA KIIKTATÁS (BULK EXCLUDE FACTURI)
  @Post('facturi/bulk-elimina')
  async bulkEliminaFacturi(@Body() body: { facturaIds: string[] }) {
    return this.efacturaService.bulkEliminaFacturi(body.facturaIds || []);
  }

  // TÖMEGES TÉTEL KIIKTATÁS (BULK EXCLUDE ITEMS)
  @Post('items/bulk-elimina')
  async bulkEliminaItems(@Body() body: { itemIds: string[] }) {
    return this.efacturaService.bulkEliminaItems(body.itemIds || []);
  }
}
