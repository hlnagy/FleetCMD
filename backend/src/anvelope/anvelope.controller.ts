import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { AnvelopeService } from './anvelope.service';

@Controller('anvelope')
export class AnvelopeController {
  constructor(private readonly anvelopeService: AnvelopeService) {}

  @Get('stoc')
  getAnvelopeStoc() {
    return this.anvelopeService.getAnvelopeStoc();
  }

  @Get('depozit-stoc')
  getDepozitStoc() {
    return this.anvelopeService.getDepozitStoc();
  }

  @Get('flota-anvelope')
  getFlotaAnvelope() {
    return this.anvelopeService.getFlotaAnvelope();
  }

  @Get('harta-axe/:vehiculId')
  getHartaAxeVehicul(@Param('vehiculId') vehiculId: string) {
    return this.anvelopeService.getHartaAxeVehicul(vehiculId);
  }

  @Post('inregistreaza-anvelopa')
  inregistreazaAnvelopaNoua(@Body() body: any) {
    return this.anvelopeService.inregistreazaAnvelopaNoua(body);
  }

  @Post('adauga-stoc-serializat')
  adaugaAnvelopeSerializateStoc(@Body() body: any) {
    return this.anvelopeService.adaugaAnvelopeSerializateStoc(body);
  }

  @Patch(':id')
  updateAnvelopa(@Param('id') id: string, @Body() body: any) {
    return this.anvelopeService.updateAnvelopa(id, body);
  }

  @Delete(':id')
  deleteAnvelopa(@Param('id') id: string) {
    return this.anvelopeService.deleteAnvelopa(id);
  }

  @Post('masurare')
  inregistreazaMasurare(@Body() body: any) {
    return this.anvelopeService.inregistreazaMasurare(body);
  }

  @Post('monteaza')
  monteazaAnvelopa(@Body() body: any) {
    return this.anvelopeService.monteazaAnvelopa(body);
  }

  @Post('permuta')
  permutaAnvelopa(@Body() body: any) {
    return this.anvelopeService.permutaAnvelopa(body);
  }

  @Post('permuta-doua-pozitii')
  executaPermutareIntrePozitii(@Body() body: any) {
    return this.anvelopeService.executaPermutareIntrePozitii(body);
  }

  @Post('demonteaza-in-stoc/:anvelopaId')
  demonteazaInStoc(@Param('anvelopaId') anvelopaId: string, @Body() body: any) {
    return this.anvelopeService.demonteazaInStoc(anvelopaId, body);
  }

  @Get(':id/istoric-complet')
  getIstoricCompletAnvelopa(@Param('id') id: string) {
    return this.anvelopeService.getIstoricCompletAnvelopa(id);
  }

  @Get('istoric-permutari')
  getIstoricPermutari(@Query('vehiculId') vehiculId?: string) {
    return this.anvelopeService.getIstoricPermutari(vehiculId);
  }

  @Get('analitica-casari')
  getAnaliticaCasariAnvelope() {
    return this.anvelopeService.getAnaliticaCasariAnvelope();
  }

  @Get('comparatie-tco')
  getComparatieMarcireTCO() {
    return this.anvelopeService.getComparatieMarcireTCO();
  }
}
