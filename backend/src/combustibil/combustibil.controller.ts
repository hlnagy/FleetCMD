import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { CombustibilService } from './combustibil.service';

@Controller('combustibil')
export class CombustibilController {
  constructor(private readonly service: CombustibilService) {}

  // --- GESTIUNI ---
  @Get('gestiuni')
  listGestiuni() {
    return this.service.listGestiuni();
  }

  @Post('gestiuni')
  createGestiune(@Body() body: any) {
    return this.service.createGestiune(body);
  }

  @Put('gestiuni/:id')
  updateGestiune(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateGestiune(id, body);
  }

  @Delete('gestiuni/:id')
  deleteGestiune(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteGestiune(id);
  }

  @Put('gestiuni/:id/capacitate')
  updateTankCapacity(@Param('id', ParseIntPipe) id: number, @Body() body: { capacitateBazin: number }) {
    return this.service.updateTankCapacity(id, body.capacitateBazin);
  }

  // --- DASHBOARD ---
  @Get('dashboard')
  getDashboard(@Query('gestiuneId') gestiuneId?: string) {
    return this.service.getDashboard(gestiuneId ? Number(gestiuneId) : undefined);
  }

  // --- STOC DETALIAT + OPERATIUNI + TRANZACTII + UNDO/REDO ---
  @Get('stoc')
  getStockDetails(@Query('gestiuneId') gestiuneId?: string) {
    return this.service.getStockDetails(gestiuneId ? Number(gestiuneId) : undefined);
  }

  @Post('stoc/operatiuni')
  addStockOperation(@Body() body: any) {
    return this.service.addStockOperation(body);
  }

  @Put('stoc/operatiuni/:id')
  updateStockOperation(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateStockOperation(id, body);
  }

  @Delete('stoc/operatiuni/:id')
  deleteStockOperation(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteStockOperation(id);
  }

  @Put('stoc/tranzactii/:id')
  updateTransaction(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateTransaction(id, body);
  }

  @Delete('stoc/tranzactii/:id')
  deleteTransaction(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteTransaction(id);
  }

  @Post('stoc/bulk-delete')
  bulkDelete(@Body() body: { gestiuneId: number; items: Array<{ kind: 'op' | 'trans'; id: number }> }) {
    return this.service.bulkDeleteItems(Number(body.gestiuneId), body.items);
  }

  @Post('stoc/bulk-move')
  bulkMove(@Body() body: { gestiuneId: number; items: Array<{ kind: 'op' | 'trans'; id: number }>; newCompanieId: number }) {
    return this.service.bulkMoveItems(Number(body.gestiuneId), body.items, Number(body.newCompanieId));
  }

  @Post('stoc/undo')
  undo(@Body() body: { gestiuneId: number }) {
    return this.service.undo(Number(body.gestiuneId));
  }

  @Post('stoc/redo')
  redo(@Body() body: { gestiuneId: number }) {
    return this.service.redo(Number(body.gestiuneId));
  }

  // --- PARC AUTO ---
  @Get('parc-auto')
  getParcAuto(@Query('gestiuneId') gestiuneId?: string) {
    return this.service.getParcAuto(gestiuneId ? Number(gestiuneId) : undefined);
  }

  // --- ANALIZA CONSUM & EFICIENTA ---
  @Get('analiza')
  getAnaliza(
    @Query('gestiuneId') gestiuneId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.getAnaliza(gestiuneId ? Number(gestiuneId) : undefined, start, end);
  }

  @Post('analiza/productie')
  saveAnalizaProduction(@Body() body: any) {
    return this.service.saveAnalizaProduction(Number(body.gestiuneId), body);
  }

  @Post('analiza/setari')
  saveAnalizaSettings(@Body() body: { gestiuneId: number; visibleCategories: string[]; excludeHidden: boolean }) {
    return this.service.saveAnalizaSettings(Number(body.gestiuneId), body.visibleCategories, Boolean(body.excludeHidden));
  }

  @Post('analiza/baza-categorie')
  saveAnalizaCategoryBasis(@Body() body: { gestiuneId: number; category: string; basis: string }) {
    return this.service.saveAnalizaCategoryBasis(Number(body.gestiuneId), body.category, body.basis);
  }

  // --- IMPORT CSV ---
  @Post('import-csv')
  importCsv(@Body() body: { gestiuneId: number; csvText: string; syncFleetKm?: boolean }, @Req() req: any) {
    const operator = req?.user?.nume || req?.user?.username || 'Import CSV Combustibil';
    return this.service.importSelerCsv(Number(body.gestiuneId), body.csvText, Boolean(body.syncFleetKm), operator);
  }

  // --- RAPOARTE & PDF ---
  @Get('rapoarte/stats')
  getReportStats(
    @Query('gestiuneId') gestiuneId?: string,
    @Query('companyId') companyId?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.getReportStats(
      gestiuneId ? Number(gestiuneId) : undefined,
      companyId ? Number(companyId) : undefined,
      start,
      end,
    );
  }

  @Post('rapoarte/bonuri-pdf')
  async downloadBonuriPdf(@Body() body: any, @Res() res: Response) {
    const { buffer, filename } = await this.service.buildBonuriPdf({
      gestiuneId: body.gestiuneId ? Number(body.gestiuneId) : undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      companyId: body.companyId ? Number(body.companyId) : null,
      bonNumber: body.bonNumber,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  }

  @Post('rapoarte/lunar-pdf')
  async downloadMonthlyPdf(@Body() body: any, @Res() res: Response) {
    const { buffer, filename } = await this.service.buildMonthlyReportPdf({
      gestiuneId: body.gestiuneId ? Number(body.gestiuneId) : undefined,
      startDate: body.startDate,
      endDate: body.endDate,
      initialSeries: Number(body.initialSeries || 0),
      finalSeries: Number(body.finalSeries || 0),
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  }

  @Post('rapoarte/analiza-pdf')
  async downloadAnalysisPdf(@Body() body: any, @Res() res: Response) {
    const { buffer, filename } = await this.service.buildAnalizaPdf(
      body.gestiuneId ? Number(body.gestiuneId) : undefined,
      body.startDate,
      body.endDate,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  }

  // --- ADMINISTRARE ---
  @Get('admin')
  getAdminData(@Query('gestiuneId') gestiuneId?: string) {
    return this.service.getAdminData(gestiuneId ? Number(gestiuneId) : undefined);
  }

  @Post('admin/companii')
  createCompanie(@Body() body: any) {
    return this.service.createCompanie(body);
  }

  @Put('admin/companii/:id')
  updateCompanie(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateCompanie(id, body);
  }

  @Delete('admin/companii/:id')
  deleteCompanie(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteCompanie(id);
  }

  @Post('admin/categorii')
  createCategorie(@Body() body: any) {
    return this.service.createCategorie(body);
  }

  @Put('admin/categorii/:id')
  updateCategorie(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateCategorie(id, body);
  }

  @Delete('admin/categorii/:id')
  deleteCategorie(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteCategorie(id);
  }

  @Post('admin/vehicule')
  createVehicul(@Body() body: any) {
    return this.service.createVehicul(body);
  }

  @Put('admin/vehicule/:id')
  updateVehicul(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateVehicul(id, body);
  }

  @Delete('admin/vehicule/:id')
  deleteVehicul(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteVehicul(id);
  }

  @Post('admin/vehicule/bulk-category')
  bulkSetCategory(@Body() body: { gestiuneId: number; vehicleIds: number[]; categorieId: number | null }) {
    return this.service.bulkSetVehicleCategory(Number(body.gestiuneId), body.vehicleIds, body.categorieId);
  }

  @Post('admin/vehicule/bulk-company')
  bulkAssignCompany(@Body() body: { gestiuneId: number; vehicleIds: number[]; companieId: number | null }) {
    return this.service.bulkAssignVehicleCompany(Number(body.gestiuneId), body.vehicleIds, body.companieId);
  }

  @Get('backup/export')
  exportBackup(@Query('gestiuneId') gestiuneId?: string) {
    return this.service.exportGestiuneBackupJson(gestiuneId ? Number(gestiuneId) : undefined);
  }
}
