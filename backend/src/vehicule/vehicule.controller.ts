import { Controller, Get, Post, Patch, Delete, Body, Query, Param, Headers } from '@nestjs/common';
import { VehiculeService } from './vehicule.service';
import { Public } from '../auth/public.decorator';

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

  @Patch('categorii/:id')
  updateCategorie(@Param('id') id: string, @Body() body: { nume: string; descriere?: string }) {
    return this.vehiculeService.updateCategorieVehicul(id, body.nume, body.descriere);
  }

  @Delete('categorii/:id')
  deleteCategorie(@Param('id') id: string) {
    return this.vehiculeService.deleteCategorieVehicul(id);
  }

  @Get()
  getAllVehicule(@Query('categorie') categorie?: string) {
    return this.vehiculeService.getAllVehicule(categorie);
  }

  @Post()
  createVehicul(@Body() body: any) {
    return this.vehiculeService.createVehicul(body);
  }

  // ==========================================
  // ORE DE FUNCȚIONARE MTH (GPS)
  // ==========================================

  @Public()
  @Get('ore-functionare/utilaje')
  getUtilajeMth(@Query('all') all?: string) {
    return this.vehiculeService.getUtilajeMth(all === 'true');
  }

  @Public()
  @Get('ore-functionare/perioade')
  getPerioadeMth(@Query('vehiculId') vehiculId: string) {
    return this.vehiculeService.getPerioadeMth(vehiculId);
  }

  @Public()
  @Post('ore-functionare/verifica-continuitate')
  verificaContinuitateMth(@Body() body: any) {
    return this.vehiculeService.verificaContinuitateMth(body);
  }

  @Public()
  @Post('ore-functionare/inregistrare')
  inregistreazaPerioadaMth(@Body() body: any) {
    return this.vehiculeService.inregistreazaPerioadaMth(body);
  }

  @Public()
  @Post('ore-functionare/baza-initiala')
  setBazaInitialaContorMth(@Body() body: { vehiculId: string; valoareBaza: number; dataInitiala?: string }) {
    return this.vehiculeService.setBazaInitialaContorMth(body);
  }

  @Public()
  @Patch('ore-functionare/perioada/:id')
  actualizeazaPerioadaMth(@Param('id') id: string, @Body() body: any) {
    return this.vehiculeService.actualizeazaPerioadaMth(id, body);
  }

  @Public()
  @Delete('ore-functionare/perioada/:id')
  stergePerioadaMth(@Param('id') id: string) {
    return this.vehiculeService.stergePerioadaMth(id);
  }

  @Patch(':id')
  updateVehicul(@Param('id') id: string, @Body() body: any) {
    return this.vehiculeService.updateVehicul(id, body);
  }

  @Delete(':id')
  deleteVehicul(@Param('id') id: string) {
    return this.vehiculeService.deleteVehicul(id);
  }

  @Get('cuplari-active')
  getCuplariActive() {
    return this.vehiculeService.getCuplariActive();
  }

  @Get('istoric-cuplari')
  getIstoricCuplari(@Query('vehiculId') vehiculId?: string) {
    return this.vehiculeService.getIstoricCuplari(vehiculId);
  }

  @Post('cuplare')
  cupleazaAnsamblu(@Body() body: { capTractorId: string; semiremorcaId: string }) {
    return this.vehiculeService.cupleazaAnsamblu(body.capTractorId, body.semiremorcaId);
  }

  @Post('decuplare')
  decupleazaAnsamblu(@Body() body: { cuplareId?: string; capTractorId?: string; semiremorcaId?: string }) {
    return this.vehiculeService.decupleazaAnsamblu(body);
  }

  @Get(':id/stare-cuplare')
  getStareCuplareVehicul(@Param('id') id: string) {
    return this.vehiculeService.getStareCuplareVehicul(id);
  }

  @Get(':id/fisa-tehnica')
  getFisaTehnica(@Param('id') id: string) {
    return this.vehiculeService.getFisaTehnicaDigitala(id);
  }

  @Get('istoric-contoare')
  getIstoricContoare(@Query('vehiculId') vehiculId?: string) {
    return this.vehiculeService.getIstoricContoare(vehiculId);
  }

  @Patch('istoric-contoare/:id')
  updateIstoricContor(@Param('id') id: string, @Body() body: any) {
    return this.vehiculeService.updateIstoricContor(id, body);
  }

  @Delete('istoric-contoare/:id')
  deleteIstoricContor(@Param('id') id: string) {
    return this.vehiculeService.deleteIstoricContor(id);
  }

  @Post('inregistrare-contor')
  inregistreazaContor(@Body() body: any) {
    return this.vehiculeService.inregistreazaContorManual(body);
  }

  @Post('inregistrare-contoare-batch')
  inregistreazaContoareBatch(@Body() body: { entries: any[] }) {
    return this.vehiculeService.inregistreazaContoareBatch(body.entries || []);
  }

  @Post('import-gps')
  importDataGps(@Body() body: { records: any[] }) {
    return this.vehiculeService.importDataGps(body.records || []);
  }

  @Public()
  @Post('import-km-pompa/preview')
  previewCsvPompa(@Body() body: { csvContent: string; selectedCategories?: string[] }) {
    return this.vehiculeService.previewCsvPompa(body.csvContent, body.selectedCategories);
  }

  @Public()
  @Post('import-km-pompa/apply')
  applyCsvPompa(
    @Body() body: {
      entries: Array<{
        vehiculId: string;
        valoareKm: number;
        data: string;
        ora?: string;
        observatii?: string;
        alimentari?: Array<{ valoareKm: number; data: string; ora?: string; litri?: number }>;
      }>;
    },
    @Headers('x-user-id') actorUserId?: string,
  ) {
    return this.vehiculeService.applyCsvPompa(body.entries, actorUserId);
  }

  @Patch(':id/contor')
  updateContor(@Param('id') id: string, @Body('valoareContorCurent') valoareContorCurent: number) {
    return this.vehiculeService.updateVehicul(id, { valoareContorCurent });
  }
}
