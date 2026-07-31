import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { MentenantaService } from './mentenanta.service';

@Controller('mentenanta')
export class MentenantaController {
  constructor(private readonly mentenantaService: MentenantaService) {}

  // Mecanici & Echipă Atelier
  @Get('mecanici')
  getMecanici() {
    return this.mentenantaService.getMecanici();
  }

  @Post('mecanici')
  createMecanic(@Body() body: { nume: string; functie?: string; telefon?: string }) {
    return this.mentenantaService.createMecanic(body);
  }

  @Get('istoric-servicii-mecanic')
  getIstoricServiciiMecanic(@Query('mecanic') mecanic?: string) {
    return this.mentenantaService.getIstoricServiciiMecanic(mecanic);
  }

  // Centralizator Complet Sarcini Mentenanță Flotă
  @Get('flota-sarcini')
  getToateSarcinileFlota() {
    return this.mentenantaService.getToateSarcinileFlota();
  }

  @Patch('sarcina/:id/finalizeaza-direct')
  finalizeazaSarcinaDirect(@Param('id') id: string) {
    return this.mentenantaService.finalizeazaSarcinaDirect(id);
  }

  @Get('profile')
  getProfile() {
    return this.mentenantaService.getProfileMentenanta();
  }

  @Post('profile')
  createProfil(@Body() body: any) {
    return this.mentenantaService.createProfilMentenanta(body);
  }

  @Post('sarcina')
  createSarcina(@Body() body: any) {
    return this.mentenantaService.createSarcinaMentenanta(body);
  }

  @Get('vehicul/:vehiculId')
  getSarciniPerVehicul(@Param('vehiculId') vehiculId: string) {
    return this.mentenantaService.getSarciniPerVehicul(vehiculId);
  }

  @Post('comanda-lucru')
  createComandaLucru(@Body() body: any) {
    return this.mentenantaService.createComandaLucru(body);
  }

  @Post('comanda-lucru/:id/adauga-element')
  adaugaElementComanda(@Param('id') id: string, @Body() body: any) {
    return this.mentenantaService.adaugaElementComanda(id, body);
  }

  @Patch('comanda-lucru/:id/finalizeaza')
  finalizeazaComandaLucru(@Param('id') id: string) {
    return this.mentenantaService.finalizeazaComandaLucru(id);
  }

  @Patch('comanda-lucru/:id/anuleaza')
  anuleazaComandaLucru(@Param('id') id: string) {
    return this.mentenantaService.anuleazaSauStergeComanda(id);
  }

  @Post('sarcina/:sarcinaId/escaladeaza')
  escaladeazaSarcina(@Param('sarcinaId') sarcinaId: string, @Body() body: any) {
    return this.mentenantaService.escaladeazaSarcinaInAtelier(sarcinaId, body);
  }
}
