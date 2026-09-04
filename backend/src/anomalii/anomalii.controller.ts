import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
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

  @Get('alerte-centralizate')
  getAlerteCentralizate() {
    return this.anomaliiService.getAlerteCentralizate();
  }

  @Post('alerte/rezolva')
  rezolvaAlertaCentralizata(@Body() body: any) {
    return this.anomaliiService.rezolvaAlerta(body);
  }

  @Patch('alerte/:id/rezolva')
  rezolvaAlerta(@Param('id') id: string, @Body() body: any) {
    return this.anomaliiService.rezolvaAlerta({
      dbId: id,
      ...body,
    });
  }

  // Reguli Alerte Mentenanță
  @Get('reguli-mentenanta')
  getReguliMentenanta() {
    return this.anomaliiService.getReguliMentenanta();
  }

  @Post('reguli-mentenanta')
  createRegulaMentenanta(@Body() body: any) {
    return this.anomaliiService.createRegulaMentenanta(body);
  }

  @Patch('reguli-mentenanta/:id')
  updateRegulaMentenanta(@Param('id') id: string, @Body() body: any) {
    return this.anomaliiService.updateRegulaMentenanta(id, body);
  }

  @Delete('reguli-mentenanta/:id')
  deleteRegulaMentenanta(@Param('id') id: string) {
    return this.anomaliiService.deleteRegulaMentenanta(id);
  }

  // Documente Vehicule (ITP, RCA, Rovinietă, Tahograf, Copie Conformă)
  @Get('documente-vehicule')
  getDocumenteVehicule() {
    return this.anomaliiService.getDocumenteVehicule();
  }

  @Post('documente-vehicule')
  upsertDocumentVehicul(@Body() body: any) {
    return this.anomaliiService.upsertDocumentVehicul(body);
  }

  @Delete('documente-vehicule/:id')
  deleteDocumentVehicul(@Param('id') id: string) {
    return this.anomaliiService.deleteDocumentVehicul(id);
  }

  // Alerte Personalizate & Licențe Firmă
  @Get('alerte-personalizate')
  getAlertePersonalizate() {
    return this.anomaliiService.getAlertePersonalizate();
  }

  @Post('alerte-personalizate')
  createAlertaPersonalizata(@Body() body: any) {
    return this.anomaliiService.createAlertaPersonalizata(body);
  }

  @Patch('alerte-personalizate/:id')
  updateAlertaPersonalizata(@Param('id') id: string, @Body() body: any) {
    return this.anomaliiService.updateAlertaPersonalizata(id, body);
  }

  @Delete('alerte-personalizate/:id')
  deleteAlertaPersonalizata(@Param('id') id: string) {
    return this.anomaliiService.deleteAlertaPersonalizata(id);
  }

  // Baseline execution data per vehicle
  @Get('baselines-vehicul/:vehiculId')
  getBaselinesVehicul(@Param('vehiculId') vehiculId: string) {
    return this.anomaliiService.getBaselinesVehicul(vehiculId);
  }

  @Post('setare-baseline-vehicul')
  setBaselineVehicul(@Body() body: any) {
    return this.anomaliiService.setBaselineVehicul(body);
  }
}
