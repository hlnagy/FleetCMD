import { Controller, Get, Post, Patch, Delete, Body, Query, Param } from '@nestjs/common';
import { StocuriGarantiiService } from './stocuri-garantii.service';

@Controller('stocuri-garantii')
export class StocuriGarantiiController {
  constructor(private readonly stocuriGarantiiService: StocuriGarantiiService) {}

  // Depozite
  @Get('depozite')
  getDepozite() {
    return this.stocuriGarantiiService.getDepozite();
  }

  @Post('depozite')
  createDepozit(@Body() body: { nume: string; adresa?: string; responsabil?: string }) {
    return this.stocuriGarantiiService.createDepozit(body);
  }

  @Patch('depozite/:id')
  updateDepozit(@Param('id') id: string, @Body() body: { nume?: string; adresa?: string; responsabil?: string }) {
    return this.stocuriGarantiiService.updateDepozit(id, body);
  }

  @Delete('depozite/:id')
  deleteDepozit(@Param('id') id: string) {
    return this.stocuriGarantiiService.deleteDepozit(id);
  }

  // Transfer Parțial Între Depozite
  @Post('transfer-stoc')
  transferStocParcial(@Body() body: { articolStocId: string; depozitDestinatieId: string; cantitate: number; operator?: string; observatii?: string }) {
    return this.stocuriGarantiiService.transferStocParcial(body);
  }

  @Get('istoric-transferuri')
  getIstoricTransferuri() {
    return this.stocuriGarantiiService.getIstoricTransferuri();
  }

  // Categorii & Subcategorii Stoc
  @Get('categorii')
  getCategorii() {
    return this.stocuriGarantiiService.getCategorii();
  }

  @Post('categorii')
  createCategorie(@Body() body: { nume: string; descriere?: string; stocMinimImplicit?: number }) {
    return this.stocuriGarantiiService.createCategorie(body);
  }

  @Post('subcategorii')
  createSubcategorie(@Body() body: { categorieStocId?: string; categorieNume?: string; nume: string; descriere?: string }) {
    return this.stocuriGarantiiService.createSubcategorie(body);
  }

  // Avertisment Stoc Critic
  @Get('stocuri-critice')
  getStocuriCritice() {
    return this.stocuriGarantiiService.getStocuriCritice();
  }

  // Gestiune Stocuri cu Filtrare & Căutare Multi-criteriu
  @Get('stocuri')
  getStocuri(
    @Query('categorie') categorie?: string,
    @Query('subcategorie') subcategorie?: string,
    @Query('depozitId') depozitId?: string,
    @Query('statusStoc') statusStoc?: string,
    @Query('cautare') cautare?: string,
  ) {
    return this.stocuriGarantiiService.getStocuri({ categorie, subcategorie, depozitId, statusStoc, cautare });
  }

  @Post('stocuri')
  createArticolStoc(@Body() body: any) {
    return this.stocuriGarantiiService.createArticolStoc(body);
  }

  @Patch('stocuri/:id')
  updateArticolStoc(@Param('id') id: string, @Body() body: any) {
    return this.stocuriGarantiiService.updateArticolStoc(id, body);
  }

  @Delete('stocuri/:id')
  deleteArticolStoc(@Param('id') id: string) {
    return this.stocuriGarantiiService.deleteArticolStoc(id);
  }

  // Recepție Marfă pe Factură (Purchasing Invoices incl. Oils & Parts)
  @Post('intrare-stoc')
  adaugaIntrareStoc(@Body() body: any) {
    return this.stocuriGarantiiService.adaugaIntrareStoc(body);
  }

  @Get('intrare-stoc')
  getIstoricIntrari(@Query('cautare') cautare?: string) {
    return this.stocuriGarantiiService.getIstoricIntrari(cautare);
  }

  // Componente Serializate & Garanții
  @Get('componente-serializate')
  getComponenteSerializate() {
    return this.stocuriGarantiiService.getComponenteSerializate();
  }

  @Post('demonteaza-componenta')
  demonteazaComponenta(@Body() body: { serieUnica: string; mecanic: string; motivDemontare: string }) {
    return this.stocuriGarantiiService.demonteazaComponenta(body.serieUnica, body.mecanic, body.motivDemontare);
  }
}
