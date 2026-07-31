import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { AnomaliiService } from './anomalii.service';

@Controller('anomalii')
export class AnomaliiController {
  constructor(private readonly anomaliiService: AnomaliiService) {}

  @Get('tipuri-ulei')
  getTipuriUlei() {
    return this.anomaliiService.getTipuriUleiStandard();
  }

  @Get('flota-fluide')
  getToateFluideleFlota() {
    return this.anomaliiService.getToateFluideleFlota();
  }

  @Post('intrare-ulei')
  intrareUlei(@Body() body: any) {
    return this.anomaliiService.adaugaIntrareUlei(body);
  }

  @Post('iesire-ulei')
  iesireUlei(@Body() body: any) {
    return this.anomaliiService.adaugaIesireUlei(body);
  }

  @Post('configurare-ulei')
  salveazaConfigurare(@Body() body: any) {
    return this.anomaliiService.salveazaConfigurareUlei(body);
  }

  @Get('status-schimburi/:vehiculId')
  getStatusSchimburi(@Param('vehiculId') vehiculId: string) {
    return this.anomaliiService.getStatusSchimburiUleiVehicul(vehiculId);
  }

  @Post('inregistrare-contor-manual')
  inregistrareContorManual(@Body() body: any) {
    return this.anomaliiService.adaugaInregistrareContorManual(body);
  }

  @Get('alerte')
  getAlerte() {
    return this.anomaliiService.getAlerteActive();
  }

  @Patch('alerte/:id/rezolva')
  rezolvaAlerta(@Param('id') id: string, @Body() body: { solutie: string }) {
    return this.anomaliiService.rezolvaAlerta(id, body.solutie);
  }
}
