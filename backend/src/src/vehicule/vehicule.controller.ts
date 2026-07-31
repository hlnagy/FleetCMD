import { Controller, Get, Post, Patch, Delete, Body, Query, Param } from '@nestjs/common';
import { VehiculeService } from './vehicule.service';

@Controller('vehicule')
export class VehiculeController {
  constructor(private readonly vehiculeService: VehiculeService) {}

  @Get('categorii')
  getCategorii() {
    return this.vehiculeService.getCategorii();
  }

  @Post('categorii')
  createCategorie(@Body() body: { nume: string; descriere?: string }) {
    return this.vehiculeService.createCategoriePersonalizata(body.nume, body.descriere);
  }

  @Get()
  getAllVehicule(@Query('categorie') categorie?: string) {
    return this.vehiculeService.getAllVehicule(categorie);
  }

  @Post()
  createVehicul(@Body() body: any) {
    return this.vehiculeService.createVehicul(body);
  }

  @Patch(':id')
  updateVehicul(@Param('id') id: string, @Body() body: any) {
    return this.vehiculeService.updateVehicul(id, body);
  }

  @Delete(':id')
  deleteVehicul(@Param('id') id: string) {
    return this.vehiculeService.deleteVehicul(id);
  }

  @Get(':id/fisa-tehnica')
  getFisaTehnica(@Param('id') id: string) {
    return this.vehiculeService.getFisaTehnicaDigitala(id);
  }

  @Patch(':id/contor')
  updateContor(@Param('id') id: string, @Body('valoareContorCurent') valoareContorCurent: number) {
    return this.vehiculeService.updateVehicul(id, { valoareContorCurent });
  }
}
