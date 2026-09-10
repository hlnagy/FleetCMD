import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { AnomaliiService } from './anomalii.service';
import { Public } from '../auth/public.decorator';

function getUploadDir(): string {
  if (fs.existsSync(path.resolve(process.cwd(), 'uploads', 'documente'))) {
    return path.resolve(process.cwd(), 'uploads', 'documente');
  }
  if (fs.existsSync(path.resolve(process.cwd(), 'backend', 'uploads', 'documente'))) {
    return path.resolve(process.cwd(), 'backend', 'uploads', 'documente');
  }
  if (fs.existsSync(path.resolve(process.cwd(), 'backend'))) {
    const p = path.resolve(process.cwd(), 'backend', 'uploads', 'documente');
    fs.mkdirSync(p, { recursive: true });
    return p;
  }
  const defaultP = path.resolve(process.cwd(), 'uploads', 'documente');
  fs.mkdirSync(defaultP, { recursive: true });
  return defaultP;
}

function findUploadedFile(filename: string): string | null {
  const clean = path.basename(filename);
  const candidates = [
    path.resolve(process.cwd(), 'uploads', 'documente', clean),
    path.resolve(process.cwd(), 'backend', 'uploads', 'documente', clean),
    path.resolve(__dirname, '..', '..', 'uploads', 'documente', clean),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

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

  // Documente Vehicule (ITP, RCA, Rovinietă, Tahograf, Copie Conformă, CASCO)
  @Get('documente-vehicule')
  getDocumenteVehicule(@Query() query: any) {
    return this.anomaliiService.getDocumenteVehicule(query);
  }

  @Post('documente-vehicule')
  upsertDocumentVehicul(@Body() body: any) {
    return this.anomaliiService.upsertDocumentVehicul(body);
  }

  @Patch('documente-vehicule/:id')
  updateDocumentVehicul(@Param('id') id: string, @Body() body: any) {
    return this.anomaliiService.updateDocumentVehicul(id, body);
  }

  @Delete('documente-vehicule/:id')
  deleteDocumentVehicul(@Param('id') id: string) {
    return this.anomaliiService.deleteDocumentVehicul(id);
  }

  // Ștergere fișier scanat atașat unui document
  @Delete('documente-vehicule/:id/fisier')
  stergeFisierDocumentVehicul(@Param('id') id: string) {
    return this.anomaliiService.stergeFisierDocument(id);
  }

  // Upload fișier scanat / poză document
  @Public()
  @Post('documente-vehicule/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, getUploadDir());
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname).toLowerCase();
          const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
          cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
    }),
  )
  uploadDocumentFisier(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Niciun fișier nu a fost încărcat.');
    return {
      fisierUrl: `/anomalii/documente-vehicule/fisier/${file.filename}`,
      fisierNume: file.originalname,
      fisierMarime: file.size,
      mimetype: file.mimetype,
    };
  }

  // Descărcare / Afișare fișier scanat atașat (acces public pentru preview inline în browser / iframe / img)
  @Public()
  @Get('documente-vehicule/fisier/:filename')
  descarcaFisierDocument(@Param('filename') filename: string, @Res() res: Response) {
    const cleanFilename = path.basename(filename);
    const filePath = findUploadedFile(cleanFilename);
    if (!filePath) {
      throw new NotFoundException('Fișierul căutat nu există pe server.');
    }

    const ext = path.extname(cleanFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Disposition', `inline; filename="${cleanFilename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  }

  // Import automat din ODS local sau cale specificată
  @Post('documente-vehicule/import-ods')
  importOdsDocumente(@Body() body: { filepath?: string }) {
    return this.anomaliiService.importOdsDocumente(body?.filepath);
  }

  // Upload fișier ODS și import direct
  @Post('documente-vehicule/upload-ods')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSiImportOds(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vă rugăm să selectați fișierul ODS.');
    return this.anomaliiService.processOdsFile(file.buffer);
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
