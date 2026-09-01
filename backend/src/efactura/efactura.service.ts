import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XMLParser } from 'fast-xml-parser';
import * as AdmZip from 'adm-zip';
import axios from 'axios';

export function normalizeUnitateMasura(rawUnit?: string): string {
  if (!rawUnit) return 'buc';
  const u = String(rawUnit).trim().toUpperCase();
  switch (u) {
    case 'H87': // Piece / bucată
    case 'C62': // One / unit
    case 'PCE': // Piece
    case 'EA':  // Each
    case 'NAR': // Number of articles
    case 'XPP': // Piece
    case 'ZZ':  // Mutually defined
    case 'BUC':
    case 'BUC.':
    case 'BUCATI':
    case 'BUCĂȚI':
      return 'buc';
    case 'LTR':
    case 'L':
    case 'LITRU':
    case 'LITRI':
      return 'L';
    case 'KGM':
    case 'KG':
    case 'KILOGRAM':
    case 'KILOGRAME':
      return 'kg';
    case 'MTR':
    case 'M':
    case 'METRU':
    case 'METRI':
    case 'LM':
    case 'ML':
      return 'm';
    case 'MTK':
    case 'M2':
    case 'MP':
      return 'mp';
    case 'MTQ':
    case 'M3':
    case 'MC':
      return 'mc';
    case 'SET':
    case 'SETURI':
      return 'set';
    default:
      return String(rawUnit).toLowerCase();
  }
}

export function parseAnafDataCreare(raw: string | number | undefined): Date {
  if (!raw) return new Date();
  const s = String(raw).trim();
  // Format YYYYMMDDHHmm or YYYYMMDDHHmmss (ex: "202608171155")
  if (/^\d{12,14}$/.test(s)) {
    const year = parseInt(s.substring(0, 4), 10);
    const month = parseInt(s.substring(4, 6), 10) - 1;
    const day = parseInt(s.substring(6, 8), 10);
    const hour = parseInt(s.substring(8, 10), 10);
    const min = parseInt(s.substring(10, 12), 10);
    const sec = s.length >= 14 ? parseInt(s.substring(12, 14), 10) : 0;
    const d = new Date(Date.UTC(year, month, day, hour, min, sec));
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function parseDimensiune(desc: string): string {
  const match = desc.match(/\b\d{2,3}\/\d{2,3}\s*R\s*\d{2}(?:\.5)?\b/i);
  return match ? match[0].replace(/\s+/g, '') : '315/80R22.5';
}

export function parseMarca(desc: string): string {
  const d = desc.toUpperCase();
  if (d.includes('MICHELIN')) return 'MICHELIN';
  if (d.includes('BRIDGESTONE')) return 'BRIDGESTONE';
  if (d.includes('CONTINENTAL')) return 'CONTINENTAL';
  if (d.includes('GOODYEAR')) return 'GOODYEAR';
  if (d.includes('PIRELLI')) return 'PIRELLI';
  if (d.includes('BENCHMARK')) return 'BENCHMARK';
  if (d.includes('INFINITY')) return 'INFINITY';
  if (d.includes('HANKOOK')) return 'HANKOOK';
  if (d.includes('SAVA')) return 'SAVA';
  if (d.includes('KORMORAN')) return 'KORMORAN';
  if (d.includes('BARUM')) return 'BARUM';
  if (d.includes('MATADOR')) return 'MATADOR';
  if (d.includes('TRIANGLE')) return 'TRIANGLE';
  if (d.includes('WESTLAKE')) return 'WESTLAKE';
  return 'GENERICĂ';
}

export function parseModel(desc: string): string {
  const d = desc.replace(/\b\d{2,3}\/\d{2,3}\s*R\s*\d{2}(?:\.5)?\b/gi, '').trim();
  return d.length > 45 ? d.substring(0, 45) : d || 'Standard';
}

@Injectable()
export class EFacturaService {
  private readonly logger = new Logger(EFacturaService.name);

  // Rate Limiting: Minimum delay of 500ms between requests (max 2 requests / sec)
  private lastRequestTime = 0;

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // CONFIG & OAUTH2 TOKEN MANAGEMENT
  // -------------------------------------------------------------------------
  async getConfig() {
    let cfg = await this.prisma.eFacturaConfig.findUnique({ where: { id: 'default' } });
    if (!cfg) {
      cfg = await this.prisma.eFacturaConfig.create({
        data: {
          id: 'default',
          cifFirma: 'RO12345678',
          stareCronAuto: true,
          intervalZileSyncAuto: 15,
        },
      });
    }
    return cfg;
  }

  async updateConfig(data: {
    cifFirma?: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: string | Date;
    refreshTokenExpiresAt?: string | Date;
    stareCronAuto?: boolean;
    intervalZileSyncAuto?: number;
  }) {
    const existing = await this.getConfig();

    return this.prisma.eFacturaConfig.update({
      where: { id: 'default' },
      data: {
        ...(data.cifFirma ? { cifFirma: data.cifFirma.trim().toUpperCase() } : {}),
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.clientSecret !== undefined ? { clientSecret: data.clientSecret } : {}),
        ...(data.redirectUri !== undefined ? { redirectUri: data.redirectUri } : {}),
        ...(data.accessToken !== undefined ? { accessToken: data.accessToken } : {}),
        ...(data.refreshToken !== undefined ? { refreshToken: data.refreshToken } : {}),
        ...(data.accessTokenExpiresAt ? { accessTokenExpiresAt: new Date(data.accessTokenExpiresAt) } : {}),
        ...(data.refreshTokenExpiresAt ? { refreshTokenExpiresAt: new Date(data.refreshTokenExpiresAt) } : {}),
        ...(data.stareCronAuto !== undefined ? { stareCronAuto: data.stareCronAuto } : {}),
        ...(data.intervalZileSyncAuto !== undefined ? { intervalZileSyncAuto: Number(data.intervalZileSyncAuto) } : {}),
      },
    });
  }

  // GENERARE URL AUTORIZARE ANAF OAUTH2 (Pasul 2)
  async generateAuthorizeUrl(): Promise<{ url: string; redirectUri: string }> {
    const cfg = await this.getConfig();
    if (!cfg.clientId) {
      throw new BadRequestException('Vă rugăm să introduceți mai întâi Client ID în configurația ANAF.');
    }
    const redirectUri = (cfg.redirectUri || 'https://fleet-cmd.vercel.app/efactura').trim();
    const authorizeUrl = `https://logincert.anaf.ro/anaf-oauth2/v1/authorize?response_type=code&client_id=${cfg.clientId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&token_content_type=jwt`;

    return { url: authorizeUrl, redirectUri };
  }

  // BEVÁLTÁS: EXCHANGE AUTHORIZATION CODE FOR JWT ACCESS & REFRESH TOKENS (Pasul 3)
  async exchangeCodeForToken(code: string) {
    if (!code) throw new BadRequestException('Codul de autorizare este obligatoriu.');
    const cfg = await this.getConfig();
    if (!cfg.clientId || !cfg.clientSecret) {
      throw new BadRequestException('Client ID și Client Secret sunt obligatorii pentru schimbul de token-uri.');
    }

    const redirectUri = cfg.redirectUri || 'https://fleet-cmd.vercel.app/efactura';
    const cleanCode = code.trim();

    this.logger.log(`Schimbare Cod Autorizare ANAF (${cleanCode.substring(0, 10)}...) pe token-uri JWT...`);

    const authHeader = 'Basic ' + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: cleanCode,
      redirect_uri: redirectUri,
      token_content_type: 'jwt',
    });

    try {
      const response = await this.executeWithRetry(() =>
        axios.post('https://logincert.anaf.ro/anaf-oauth2/v1/token', params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: authHeader,
          },
        })
      );

      if (response.data && response.data.access_token) {
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        const expiresInSec = response.data.expires_in || 7776000; // 90 zile default
        const refreshExpiresInSec = response.data.refresh_token_expires_in || 31536000; // 365 zile default

        const accessTokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);
        const refreshTokenExpiresAt = new Date(Date.now() + refreshExpiresInSec * 1000);

        const updatedConfig = await this.prisma.eFacturaConfig.update({
          where: { id: 'default' },
          data: {
            accessToken,
            refreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt,
          },
        });

        this.logger.log(`✅ Token-urile JWT ANAF au fost generate și salvate cu succes! Expiră la: ${accessTokenExpiresAt.toISOString()}`);
        return {
          mesaj: '🔑 Token-urile OAuth2 ANAF au fost obținute și salvate cu succes în baza de date!',
          accessTokenExpiresAt,
          refreshTokenExpiresAt,
          config: updatedConfig,
        };
      } else {
        throw new BadRequestException('Răspunsul de la ANAF nu a inclus un access_token valid.');
      }
    } catch (err: any) {
      this.logger.error(`Eroare la schimbul de cod ANAF: ${err?.response?.data?.error_description || err?.message || err}`);
      throw new BadRequestException(`Eroare autorizare ANAF: ${err?.response?.data?.error_description || err?.response?.data?.error || err?.message}`);
    }
  }

  // Auto-refresh OAuth2 token 48h before 90-day expiration
  async refreshOAuthTokenIfNeeded(): Promise<string | null> {
    const cfg = await this.getConfig();
    if (!cfg.accessToken) {
      this.logger.warn('Access Token ANAF e-Factura nu este configurat.');
      return null;
    }

    const now = new Date();
    const expiresAt = cfg.accessTokenExpiresAt ? new Date(cfg.accessTokenExpiresAt) : null;
    const hoursLeft = expiresAt ? (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60) : 0;

    // Refresh if expiring in less than 48 hours and refresh token is available
    if (expiresAt && hoursLeft < 48 && cfg.refreshToken) {
      this.logger.log(`AccessToken ANAF expiră în ${hoursLeft.toFixed(1)} ore. Inițiere auto-refresh token...`);
      try {
        const response = await this.executeWithRetry(() =>
          axios.post('https://loginservice.anaf.ro/gonaf/oauth2/v1/token', new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: cfg.refreshToken!,
            client_id: cfg.clientId || '',
            client_secret: cfg.clientSecret || '',
          }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
        );

        if (response.data && response.data.access_token) {
          const newAccess = response.data.access_token;
          const newRefresh = response.data.refresh_token || cfg.refreshToken;
          const expiresInSec = response.data.expires_in || 7776000; // 90 days default
          const newExpiresAt = new Date(Date.now() + expiresInSec * 1000);

          await this.prisma.eFacturaConfig.update({
            where: { id: 'default' },
            data: {
              accessToken: newAccess,
              refreshToken: newRefresh,
              accessTokenExpiresAt: newExpiresAt,
            },
          });

          this.logger.log(`✅ Token OAuth2 ANAF reînnoit automat cu succes! Expiră la: ${newExpiresAt.toISOString()}`);
          return newAccess;
        }
      } catch (err: any) {
        this.logger.error(`Eroare la auto-refresh token ANAF: ${err?.message || err}`);
      }
    }

    return cfg.accessToken;
  }

  // -------------------------------------------------------------------------
  // RATE LIMITER & EXPONENTIAL BACKOFF WITH JITTER
  // -------------------------------------------------------------------------
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    const minIntervalMs = 500; // Max 2 requests / sec

    if (timeSinceLast < minIntervalMs) {
      const waitTime = minIntervalMs - timeSinceLast;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  public async executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      await this.enforceRateLimit();
      try {
        return await fn();
      } catch (error: any) {
        attempt++;
        const statusCode = error?.response?.status;
        const isTransient = [429, 502, 503, 504].includes(statusCode) || error.code === 'ECONNRESET';

        if (attempt > maxRetries || !isTransient) {
          this.logger.error(`Apel ANAF eșuat definitiv după ${attempt} încercări (Status HTTP ${statusCode || 'UNKNOWN'}).`);
          throw error;
        }

        // Exponential Backoff: T_wait = 2^attempt * 5000ms + random_jitter (0-1000ms)
        const baseWait = Math.pow(2, attempt) * 5000;
        const jitter = Math.floor(Math.random() * 1000);
        const waitMs = Math.min(baseWait + jitter, 60000);

        this.logger.warn(`Încercare ANAF #${attempt} eșuată (HTTP ${statusCode}). Reîncercare peste ${Math.round(waitMs / 1000)}s...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    throw new BadRequestException('Eroare conexiune ANAF.');
  }

  // -------------------------------------------------------------------------
  // HYBRID SYNC: FETCH MESSAGES & DEDUPLICATE & DOWNLOAD UBL 2.1 XML
  // -------------------------------------------------------------------------
  async syncFacturi(zile = 15) {
    const safeZile = Math.min(Math.max(1, Number(zile) || 15), 60); // Max 60 zile
    const cfg = await this.getConfig();
    const token = await this.refreshOAuthTokenIfNeeded();

    if (!token) {
      throw new BadRequestException('Vă rugăm să configurați Token-ul OAuth2 ANAF e-Factura în Setări.');
    }

    const cif = cfg.cifFirma.replace(/[^0-9]/g, ''); // CUI fără RO pentru API ANAF
    this.logger.log(`Inițiere sincronizare e-Factura pentru CUI ${cif} pe ultimele ${safeZile} zile...`);

    // ANAF listaMesajePaginatieFactura: startTime, endTime (milisecunde), cif, pagina
    // Setăm endTime cu 60 secunde în trecut pentru a preveni deviațiile de ceas cu serverele ANAF
    const nowMs = Date.now() - 60000;
    const startMs = nowMs - safeZile * 24 * 60 * 60 * 1000;

    const mesajeList: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages) {
      const url = `https://api.anaf.ro/prod/FCTEL/rest/listaMesajePaginatieFactura?startTime=${startMs}&endTime=${nowMs}&cif=${cif}&pagina=${currentPage}`;
      try {
        const response = await this.executeWithRetry(() =>
          axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
          })
        );
        const pageData = response.data;
        const pageMessages = pageData?.mesaje || pageData?.lista_mesaje || [];
        mesajeList.push(...pageMessages);

        totalPages = pageData?.numar_total_pagini ? Number(pageData.numar_total_pagini) : 1;
        this.logger.log(`Pagină e-Factura ${currentPage}/${totalPages} descărcată (${pageMessages.length} mesaje).`);
        currentPage++;
      } catch (err: any) {
        this.logger.error(`Eroare la interogarea paginii ${currentPage} ANAF: ${err?.message}`);
        break;
      }
    }

    if (mesajeList.length === 0) {
      this.logger.log(`Nu au fost găsite mesaje e-Factura noi pentru CUI ${cif} pe ultimele ${safeZile} zile.`);
    }
    let descarcateCount = 0;
    let omiseDuplicateCount = 0;

    for (const msg of mesajeList) {
      const idDescarcare = msg.id_descarcare || msg.id;
      if (!idDescarcare) continue;

      // 1. DEDUPLICARE STRICTĂ: Verificare dacă idDescarcare există deja în DB
      const exist = await this.prisma.eFacturaFactura.findUnique({
        where: { idDescarcare: String(idDescarcare) },
      });

      if (exist) {
        omiseDuplicateCount++;
        continue;
      }

      // 2. DESCĂRCARE ARCHIVĂ ZIP DUPĂ ID_DESCARCARE
      try {
        const downloadUrl = `https://api.anaf.ro/prod/FCTEL/rest/descarcare?id=${idDescarcare}`;
        const zipResponse = await this.executeWithRetry(() =>
          axios.get(downloadUrl, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'arraybuffer',
          })
        );

        const zipBuffer = Buffer.from(zipResponse.data);
        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();

        let xmlRawContent: string | null = null;
        for (const entry of zipEntries) {
          if (entry.entryName.endsWith('.xml') && !entry.entryName.includes('semnatura')) {
            xmlRawContent = entry.getData().toString('utf8');
            break;
          }
        }

        if (!xmlRawContent && zipEntries.length > 0) {
          xmlRawContent = zipEntries[0].getData().toString('utf8');
        }

        if (xmlRawContent) {
          // 3. PARSARE UBL 2.1 XML FACTURĂ
          const parsedInvoice = this.parseUBL21Xml(xmlRawContent, msg);

          // 4. PERSISTENȚĂ ÎN BAZA DE DATE PRISMA
          await this.prisma.eFacturaFactura.create({
            data: {
              idDescarcare: String(idDescarcare),
              numarInregistrare: String(msg.numar_solicitare || msg.id || ''),
              cifVanzator: parsedInvoice.cifVanzator || msg.cif_emitent || 'N/A',
              numeVanzator: parsedInvoice.numeVanzator || msg.detalii || 'Furnizor Nespecificat',
              cifCumparator: parsedInvoice.cifCumparator || cfg.cifFirma,
              numarFactura: parsedInvoice.numarFactura || `FAC-${idDescarcare}`,
              dataFactura: parsedInvoice.dataFactura || new Date(),
              dataMesaj: parseAnafDataCreare(msg.data_creare),
              valoareTotala: parsedInvoice.valoareTotala || Number(msg.valoare || 0),
              moneda: parsedInvoice.moneda || 'RON',
              tipFactura: parsedInvoice.tipFactura || 'FACTURA',
              xmlRawContent: xmlRawContent,
              articole: {
                create: parsedInvoice.items.map((item, idx) => ({
                  numarLinie: idx + 1,
                  descrierePiesa: item.descrierePiesa,
                  codArticolFurnizor: item.codArticolFurnizor,
                  cantitate: item.cantitate,
                  unitateMasura: item.unitateMasura,
                  pretUnitar: item.pretUnitar,
                  valoareFaraTVA: item.valoareFaraTVA,
                  valoareTVA: item.valoareTVA,
                  cotaTVA: item.cotaTVA,
                  stare: 'NEPROCESAT',
                })),
              },
            },
          });
          descarcateCount++;
        }
      } catch (err: any) {
        this.logger.error(`Eroare la descărcarea/parsarea facturii idDescarcare ${idDescarcare}: ${err?.message}`);
      }
    }

    await this.prisma.eFacturaConfig.update({
      where: { id: 'default' },
      data: { ultimulSyncSucces: new Date() },
    });

    const rez = {
      mesaj: `✅ Sincronizare e-Factura finalizată! ${descarcateCount} facturi noi descărcate și parsate, ${omiseDuplicateCount} facturi existente omise (deduplicate).`,
      descarcateCount,
      omiseDuplicateCount,
      totalMesajeAnalizate: mesajeList.length,
      ultimulSync: new Date(),
    };

    this.logger.log(rez.mesaj);
    return rez;
  }

  // -------------------------------------------------------------------------
  // UBL 2.1 XML PARSER (INVOICE, SUPPLIER, LINES, ITEMS)
  // -------------------------------------------------------------------------
  private parseUBL21Xml(xmlContent: string, msgMeta: any) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true, // Elimină namespace-urile cbc:, cac: etc. pentru parsare curată
    });

    const parsed = parser.parse(xmlContent);
    const invoice = parsed.Invoice || parsed.CreditNote || {};

    const extractText = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') {
        return String(val['#text'] ?? val['text'] ?? val['value'] ?? '').trim();
      }
      const s = String(val).trim();
      return s === '[object Object]' ? '' : s;
    };

    const numarFactura = extractText(invoice.ID) || `FAC-${msgMeta.id_descarcare || Date.now()}`;
    const dataFacturaRaw = extractText(invoice.IssueDate) || extractText(invoice.TaxPointDate);
    const dataFactura = dataFacturaRaw ? new Date(dataFacturaRaw) : new Date();

    // Furnizor / Vanzator
    const supplierParty = invoice.AccountingSupplierParty?.Party || {};
    const numeVanzator =
      extractText(supplierParty.PartyName?.Name) ||
      extractText(supplierParty.PartyLegalEntity?.RegistrationName) ||
      extractText(msgMeta.detalii) ||
      'Furnizor Nespecificat';

    const cifVanzator =
      extractText(supplierParty.PartyTaxScheme?.CompanyID) ||
      extractText(supplierParty.PartyIdentification?.ID) ||
      extractText(msgMeta.cif_emitent) ||
      'N/A';

    // Cumpărător
    const customerParty = invoice.AccountingCustomerParty?.Party || {};
    const cifCumparator =
      extractText(customerParty.PartyTaxScheme?.CompanyID) ||
      extractText(customerParty.PartyIdentification?.ID) ||
      'N/A';

    // Totaluri (Prioritizăm TaxInclusiveAmount pentru că PayableAmount este 0 la achizițiile plătite pe loc / POS / bon / avans)
    const monetaryTotal = invoice.LegalMonetaryTotal || {};
    let valoareTotala = Number(
      monetaryTotal.TaxInclusiveAmount?.['#text'] ??
      monetaryTotal.TaxInclusiveAmount ??
      monetaryTotal.PayableAmount?.['#text'] ??
      monetaryTotal.PayableAmount ??
      msgMeta.valoare ??
      0
    );
    const moneda =
      monetaryTotal.TaxInclusiveAmount?.['@_currencyID'] ||
      monetaryTotal.PayableAmount?.['@_currencyID'] ||
      extractText(invoice.DocumentCurrencyCode) ||
      'RON';

    // Linii Factură (InvoiceLine)
    const rawLines = invoice.InvoiceLine || invoice.CreditNoteLine || [];
    const linesArray = Array.isArray(rawLines) ? rawLines : [rawLines];

    const items: Array<{
      descrierePiesa: string;
      codArticolFurnizor?: string;
      cantitate: number;
      unitateMasura: string;
      pretUnitar: number;
      valoareFaraTVA: number;
      valoareTVA: number;
      cotaTVA: number;
    }> = [];

    const cleanCifVanzatorDigits = (cifVanzator || '').replace(/[^0-9]/g, '') || 'ART';

    linesArray.forEach((line: any, idx: number) => {
      if (!line) return;
      const itemNode = line.Item || {};
      const rawName = extractText(itemNode.Name);
      const rawDesc = extractText(itemNode.Description);
      
      let descrierePiesa = rawName || rawDesc || 'Articol Nespecificat';
      if (rawName && rawDesc && rawName.toLowerCase() !== rawDesc.toLowerCase()) {
        descrierePiesa = `${rawName} (${rawDesc})`;
      }

      const sellersId = extractText(itemNode.SellersItemIdentification?.ID);
      const standardId = extractText(itemNode.StandardItemIdentification?.ID);
      const classificationId = extractText(itemNode.CommodityClassification?.ItemClassificationCode);
      
      // Dacă furnizorul nu a specificat un cod de articol în XML, generăm automat: CUI Furnizor + "-" + Număr Linie (ex: 55358546-1)
      const generatedDefaultCode = `${cleanCifVanzatorDigits}-${idx + 1}`;
      const codArticolFurnizor = sellersId || standardId || (classificationId && classificationId.length > 3 ? classificationId : generatedDefaultCode);

      const qtyNode = line.InvoicedQuantity || line.CreditedQuantity || { '#text': 1 };
      const cantitate = Number(qtyNode['#text'] ?? qtyNode ?? 1);
      const unitateMasura = normalizeUnitateMasura(qtyNode['@_unitCode'] || 'buc');

      const lineAmountNode = line.LineExtensionAmount || {};
      const valoareFaraTVA = Number((Number(lineAmountNode['#text'] ?? lineAmountNode ?? 0)).toFixed(2));

      const priceNode = line.Price?.PriceAmount || {};
      const pretUnitar = Number((Number(priceNode['#text'] ?? priceNode ?? (cantitate > 0 ? valoareFaraTVA / cantitate : 0))).toFixed(2));

      const taxCategory = itemNode.ClassifiedTaxCategory || line.TaxTotal?.TaxSubtotal?.TaxCategory || {};
      const cotaTVA = Number(taxCategory.Percent ?? 19);
      const valoareTVA = Number((valoareFaraTVA * (cotaTVA / 100)).toFixed(2));

      items.push({
        descrierePiesa: String(descrierePiesa),
        codArticolFurnizor: codArticolFurnizor ? String(codArticolFurnizor) : undefined,
        cantitate: isNaN(cantitate) ? 1 : cantitate,
        unitateMasura: String(unitateMasura),
        pretUnitar: isNaN(pretUnitar) ? 0 : pretUnitar,
        valoareFaraTVA: isNaN(valoareFaraTVA) ? 0 : valoareFaraTVA,
        valoareTVA,
        cotaTVA,
      });
    });

    // Dacă valoareTotala a rezultat 0 (de ex. la facturi cu plată integrală pe loc / bon / card), calculăm din liniile facturii
    if ((isNaN(valoareTotala) || valoareTotala === 0) && items.length > 0) {
      const sumLinii = items.reduce((acc, it) => acc + (it.valoareFaraTVA + it.valoareTVA), 0);
      if (sumLinii > 0) {
        valoareTotala = Number(sumLinii.toFixed(2));
      }
    } else {
      valoareTotala = Number(valoareTotala.toFixed(2));
    }

    return {
      numarFactura: String(numarFactura),
      dataFactura,
      numeVanzator: String(numeVanzator),
      cifVanzator: String(cifVanzator),
      cifCumparator: String(cifCumparator),
      valoareTotala: isNaN(valoareTotala) ? 0 : valoareTotala,
      moneda: String(moneda),
      tipFactura: invoice.CreditNote ? 'STORNO' : 'FACTURA',
      items,
    };
  }

  // -------------------------------------------------------------------------
  // ÎNCĂRCARE DIRECTĂ FIȘIERE XML / ZIP (DIN SPV)
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // ÎNCĂRCARE DIRECTĂ FIȘIERE XML / ZIP (DIN SPV) CU DEDUPLICARE AVANSATĂ
  // -------------------------------------------------------------------------
  async incarcaFisiereXmlSauZip(files: Array<{ numeFisier: string; continutBase64: string }>) {
    const cfg = await this.getConfig();
    let procesateCount = 0;
    let duplicateCount = 0;
    let eroriCount = 0;
    const facturiSalvate: any[] = [];
    const seenInBatch = new Set<string>();

    for (const f of files) {
      try {
        const buffer = Buffer.from(f.continutBase64, 'base64');
        const xmlStrings: Array<{ xml: string; nume: string }> = [];

        if (f.numeFisier.toLowerCase().endsWith('.zip')) {
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();
          for (const entry of zipEntries) {
            if (entry.entryName.toLowerCase().endsWith('.xml') && !entry.entryName.toLowerCase().includes('semnatura')) {
              xmlStrings.push({ xml: entry.getData().toString('utf8'), nume: entry.entryName });
            }
          }
        } else {
          // Direct XML
          xmlStrings.push({ xml: buffer.toString('utf8'), nume: f.numeFisier });
        }

        for (const item of xmlStrings) {
          const parsed = this.parseUBL21Xml(item.xml, { id_descarcare: Date.now() });
          
          const cleanNumar = (parsed.numarFactura || '').trim();
          const cleanCif = (parsed.cifVanzator || '').replace(/[^0-9]/g, '');
          const batchKey = `${cleanNumar.toLowerCase()}_${cleanCif}`;

          // Verificare duplicat în cadrul aceluiași lot de fișiere
          if (seenInBatch.has(batchKey)) {
            duplicateCount++;
            continue;
          }
          seenInBatch.add(batchKey);

          const idDescarcare = `UPLOAD-${cleanNumar}-${cleanCif}`.replace(/[^a-zA-Z0-9_-]/g, '_');

          // 1. Verificare dacă factura există deja după idDescarcare
          let exist = await this.prisma.eFacturaFactura.findUnique({
            where: { idDescarcare },
          });

          // 2. Verificare dacă factura a fost deja importată după Număr Factură + CIF Vânzător (ex. din SPV sync sau alte încărcări)
          if (!exist && cleanNumar) {
            const potentialDuplicates = await this.prisma.eFacturaFactura.findMany({
              where: {
                numarFactura: cleanNumar,
              },
            });

            exist = potentialDuplicates.find((p) => {
              const pCif = (p.cifVanzator || '').replace(/[^0-9]/g, '');
              return pCif && cleanCif && (pCif === cleanCif || pCif.includes(cleanCif) || cleanCif.includes(pCif));
            }) || null;
          }

          if (exist) {
            duplicateCount++;
            continue;
          }

          const savedFactura = await this.prisma.eFacturaFactura.create({
            data: {
              idDescarcare,
              numarInregistrare: `UPLOAD-${Date.now()}`,
              cifVanzator: parsed.cifVanzator || 'N/A',
              numeVanzator: parsed.numeVanzator || 'Furnizor Nespecificat',
              cifCumparator: parsed.cifCumparator || cfg.cifFirma,
              numarFactura: parsed.numarFactura,
              dataFactura: parsed.dataFactura,
              dataMesaj: new Date(),
              valoareTotala: parsed.valoareTotala,
              moneda: parsed.moneda,
              tipFactura: parsed.tipFactura,
              xmlRawContent: item.xml,
              articole: {
                create: parsed.items.map((it, idx) => ({
                  numarLinie: idx + 1,
                  descrierePiesa: it.descrierePiesa,
                  codArticolFurnizor: it.codArticolFurnizor,
                  cantitate: it.cantitate,
                  unitateMasura: it.unitateMasura,
                  pretUnitar: it.pretUnitar,
                  valoareFaraTVA: it.valoareFaraTVA,
                  valoareTVA: it.valoareTVA,
                  cotaTVA: it.cotaTVA,
                  stare: 'NEPROCESAT',
                })),
              },
            },
            include: { articole: true },
          });

          facturiSalvate.push(savedFactura);
          procesateCount++;
        }
      } catch (err: any) {
        this.logger.error(`Eroare la procesarea fișierului ${f.numeFisier}: ${err.message}`);
        eroriCount++;
      }
    }

    const mesaj = duplicateCount > 0
      ? `✅ Au fost importate ${procesateCount} facturi noi! (${duplicateCount} facturi duplicate deja existente au fost ignorate automat).`
      : `✅ Au fost procesate și importate cu succes ${procesateCount} facturi din fișierele încărcate!`;

    return {
      mesaj,
      procesateCount,
      duplicateCount,
      eroriCount,
      facturi: facturiSalvate,
    };
  }

  // -------------------------------------------------------------------------
  // QUERIES & STOCK INTEGRATION (IMPORT TO DEPOZITFLOTA VS DISCARD)
  // -------------------------------------------------------------------------
  async getFacturi(stare?: string) {
    const where: any = {};
    if (stare) where.stare = stare;

    return this.prisma.eFacturaFactura.findMany({
      where,
      include: {
        articole: true,
      },
      orderBy: { dataFactura: 'desc' },
    });
  }

  async getFacturaById(id: string) {
    const factura = await this.prisma.eFacturaFactura.findUnique({
      where: { id },
      include: { articole: true },
    });

    if (!factura) throw new NotFoundException('Factura e-Factura nu a fost găsită.');
    return factura;
  }

  // IMPORT TÉTELENKÉNT RAKTÁRBA (StocuriGarantiiModule Integration)
  async importaItemInStoc(itemId: string, data: {
    depozitId?: string;
    categorieNume?: string;
    subcategorieNume?: string;
    codArticolCalculat?: string;
    pretUnitarCustom?: number;
    areGarantie?: boolean;
    luniGarantie?: number;
    kilometriGarantie?: number;
    oreGarantie?: number;
    serieUnica?: string;
    esteAnvelopa?: boolean;
    codDot?: string;
    seriiIndividuale?: Array<{
      serie: string;
      dot?: string;
      dimensiune?: string;
      marca?: string;
      model?: string;
    }>;
  }) {
    const item = await this.prisma.eFacturaItem.findUnique({
      where: { id: itemId },
      include: { factura: true },
    });

    if (!item) throw new NotFoundException('Articolul din factură nu a fost găsit.');
    if (item.stare === 'IMPORTAT') throw new BadRequestException('Acest articol a fost deja importat în stoc.');

    // 1. Identificare sau Creare Depozit target
    let targetDepozitId = data.depozitId;
    if (!targetDepozitId) {
      const depPrim = await this.prisma.depozit.findFirst();
      if (depPrim) {
        targetDepozitId = depPrim.id;
      } else {
        const nDep = await this.prisma.depozit.create({
          data: { nume: 'Depozit Central Flotă', adresa: 'Atelier Central' },
        });
        targetDepozitId = nDep.id;
      }
    }

    const codArticol = data.codArticolCalculat || item.codArticolFurnizor || `ART-${Math.floor(1000 + Math.random() * 9000)}`;
    const catName = data.categorieNume || 'PIESE_AUTO';
    const rawPretUnitar = typeof data.pretUnitarCustom === 'number' ? data.pretUnitarCustom : item.pretUnitar;
    const effectivePretUnitar = Number(Number(rawPretUnitar || 0).toFixed(2));
    const effectivePretTotal = Number((effectivePretUnitar * item.cantitate).toFixed(2));

    // 2. Căutare sau Creare ArticolStoc în Depozit
    let articol = await this.prisma.articolStoc.findFirst({
      where: {
        OR: [
          { codArticol: codArticol },
          { denumire: item.descrierePiesa, depozitId: targetDepozitId },
        ],
      },
    });

    if (articol) {
      articol = await this.prisma.articolStoc.update({
        where: { id: articol.id },
        data: {
          stocCurent: articol.stocCurent + item.cantitate,
          pretUnitar: effectivePretUnitar > 0 ? effectivePretUnitar : articol.pretUnitar,
          esteSerializat: data.areGarantie ? true : articol.esteSerializat,
        },
      });
    } else {
      articol = await this.prisma.articolStoc.create({
        data: {
          codArticol,
          denumire: item.descrierePiesa,
          categorie: catName,
          subcategorie: data.subcategorieNume || null,
          stocCurent: item.cantitate,
          stocMinim: 5,
          pretUnitar: effectivePretUnitar,
          unitateMasura: normalizeUnitateMasura(item.unitateMasura || 'buc'),
          esteSerializat: !!data.areGarantie,
          depozitId: targetDepozitId,
        },
      });
    }

    // 3. Înregistrare Recepție IntrareStoc (Recepție e-Factura)
    await this.prisma.intrareStoc.create({
      data: {
        articolStocId: articol.id,
        depozitId: targetDepozitId,
        furnizor: item.factura.numeVanzator,
        numarFactura: item.factura.numarFactura,
        dataFactura: item.factura.dataFactura,
        cantitateIntrata: item.cantitate,
        pretUnitar: effectivePretUnitar,
        pretTotal: effectivePretTotal,
        observatii: `Importat automat din ANAF e-Factura (ID descarcare: ${item.factura.idDescarcare})${data.areGarantie ? ' 🛡️ Înregistrat în Garanții Componente' : ''}`,
      },
    });

    // 4. Înregistrare Serii Individuale (pentru anvelope sau componente serializate)
    const esteAnvelopa =
      data.esteAnvelopa === true ||
      catName.toLowerCase().includes('anvelop') ||
      item.descrierePiesa.toLowerCase().includes('anvelop') ||
      item.descrierePiesa.toLowerCase().includes('r22.5') ||
      item.descrierePiesa.toLowerCase().includes('r17.5') ||
      item.descrierePiesa.toLowerCase().includes('r20') ||
      item.descrierePiesa.toLowerCase().includes('cauciuc') ||
      (codArticol || '').toUpperCase().startsWith('ANV');

    if (Array.isArray(data.seriiIndividuale) && data.seriiIndividuale.length > 0) {
      for (const s of data.seriiIndividuale) {
        const serieText = String(s.serie || '').trim();
        if (!serieText) continue;

        if (esteAnvelopa) {
          const dim = s.dimensiune || parseDimensiune(item.descrierePiesa);
          const mrc = s.marca || parseMarca(item.descrierePiesa);
          const mdl = s.model || parseModel(item.descrierePiesa);
          const dot = s.dot || data.codDot || 'DOT-2026';

          await this.prisma.anvelopa.create({
            data: {
              serieAnvelopa: serieText,
              codDot: dot,
              marca: mrc,
              model: mdl,
              dimensiune: dim,
              adancimeInitialaMm: 16,
              adancimeCurentaMm: 16,
              pretAchizitie: effectivePretUnitar,
              stare: 'IN_STOC',
              depozitId: targetDepozitId,
            },
          });
        }

        // De asemenea înregistrare în ComponentaSerializata pentru trasabilitate și garanții
        await this.prisma.componentaSerializata.upsert({
          where: { serieUnica: serieText },
          update: {
            luniGarantie: data.luniGarantie ? Number(data.luniGarantie) : 24,
            kilometriGarantie: data.kilometriGarantie ? Number(data.kilometriGarantie) : 2000,
            dataAchizitie: item.factura?.dataFactura ? new Date(item.factura.dataFactura) : new Date(),
            stare: 'IN_STOC',
          },
          create: {
            articolStocId: articol.id,
            serieUnica: serieText,
            luniGarantie: data.luniGarantie ? Number(data.luniGarantie) : 24,
            kilometriGarantie: data.kilometriGarantie ? Number(data.kilometriGarantie) : 2000,
            dataAchizitie: item.factura?.dataFactura ? new Date(item.factura.dataFactura) : new Date(),
            stare: 'IN_STOC',
          },
        });
      }
    } else if (data.areGarantie) {
      const cleanNumar = (item.factura?.numarFactura || '').replace(/[^a-zA-Z0-9]/g, '');
      const serieUnicaFinal =
        data.serieUnica?.trim() ||
        `SN-${codArticol}-${cleanNumar}-${item.numarLinie || 1}`;

      await this.prisma.componentaSerializata.upsert({
        where: { serieUnica: serieUnicaFinal },
        update: {
          luniGarantie: data.luniGarantie ? Number(data.luniGarantie) : 24,
          kilometriGarantie: data.kilometriGarantie ? Number(data.kilometriGarantie) : 2000,
          oreGarantie: data.oreGarantie ? Number(data.oreGarantie) : null,
          dataAchizitie: item.factura?.dataFactura ? new Date(item.factura.dataFactura) : new Date(),
          stare: 'IN_STOC',
        },
        create: {
          articolStocId: articol.id,
          serieUnica: serieUnicaFinal,
          luniGarantie: data.luniGarantie ? Number(data.luniGarantie) : 24,
          kilometriGarantie: data.kilometriGarantie ? Number(data.kilometriGarantie) : 2000,
          oreGarantie: data.oreGarantie ? Number(data.oreGarantie) : null,
          dataAchizitie: item.factura?.dataFactura ? new Date(item.factura.dataFactura) : new Date(),
          stare: 'IN_STOC',
        },
      });
    }

    // 5. Actualizare stare EFacturaItem
    const updatedItem = await this.prisma.eFacturaItem.update({
      where: { id: itemId },
      data: {
        stare: 'IMPORTAT',
        articolStocId: articol.id,
      },
    });

    // 6. Închidere automată a liniilor de reducere / garanție financiară dacă s-a importat garanție gratuită (0 RON)
    if (effectivePretUnitar === 0 || (item.factura && item.factura.valoareTotala === 0)) {
      const remainingItems = await this.prisma.eFacturaItem.findMany({
        where: { facturaId: item.facturaId, stare: 'NEPROCESAT' },
      });

      for (const rem of remainingItems) {
        const isReducere =
          rem.cantitate < 0 ||
          rem.valoareFaraTVA < 0 ||
          /reducere|discount|discont|storno|bonificatie|garantie/i.test(rem.descrierePiesa);
        if (isReducere) {
          await this.prisma.eFacturaItem.update({
            where: { id: rem.id },
            data: { stare: 'ELIMINAT' },
          });
        }
      }
    }

    await this.recalculeazaStareFactura(item.facturaId);

    return {
      mesaj: `📦 Articolul "${item.descrierePiesa}" (${item.cantitate} ${item.unitateMasura}) a fost importat cu succes în stoc!${data.areGarantie ? ' 🛡️ Înregistrat în Garanții Componente!' : ''}`,
      item: updatedItem,
      articolStoc: articol,
    };
  }

  // ELIMINARE ARTICOL INDIVIDUAL (SERVICII / CHELTUIALĂ OPERAȚIONALĂ)
  async eliminaItem(itemId: string) {
    const item = await this.prisma.eFacturaItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Articolul nu a fost găsit.');

    const updated = await this.prisma.eFacturaItem.update({
      where: { id: itemId },
      data: { stare: 'ELIMINAT' },
    });

    await this.recalculeazaStareFactura(item.facturaId);

    return { mesaj: `🗑️ Linia "${item.descrierePiesa}" a fost marcată ca exclusă (servicii).`, item: updated };
  }

  // ELIMINARE TOATĂ FACTURA (SERVICII / CHELTUIELI OPERAȚIONALE)
  async eliminaToataFactura(facturaId: string) {
    const factura = await this.prisma.eFacturaFactura.findUnique({
      where: { id: facturaId },
      include: { articole: true },
    });

    if (!factura) throw new NotFoundException('Factura nu a fost găsită.');

    // Marcăm toate articolele care nu sunt deja IMPORTAT ca ELIMINAT
    await this.prisma.eFacturaItem.updateMany({
      where: {
        facturaId,
        stare: { not: 'IMPORTAT' },
      },
      data: { stare: 'ELIMINAT' },
    });

    await this.recalculeazaStareFactura(facturaId);

    const updatedFactura = await this.prisma.eFacturaFactura.findUnique({
      where: { id: facturaId },
      include: { articole: true },
    });

    return {
      mesaj: `🗑️ Factura "${factura.numarFactura} - ${factura.numeVanzator}" (${factura.articole.length} linii) a fost exclusă complet (marcată ca Servicii / Cheltuială operațională).`,
      factura: updatedFactura,
    };
  }

  // EXCLUDE BULK FACTURI (TÖMEGES SZÁMLA KIIKTATÁS)
  async bulkEliminaFacturi(facturaIds: string[]) {
    if (!facturaIds || facturaIds.length === 0) {
      throw new BadRequestException('Nu au fost specificate facturi pentru excludere.');
    }

    await this.prisma.eFacturaItem.updateMany({
      where: {
        facturaId: { in: facturaIds },
        stare: { not: 'IMPORTAT' },
      },
      data: { stare: 'ELIMINAT' },
    });

    for (const fId of facturaIds) {
      await this.recalculeazaStareFactura(fId);
    }

    return {
      mesaj: `🗑️ ${facturaIds.length} facturi au fost excluse cu succes (marcate ca Servicii / Cheltuieli operaționale).`,
      count: facturaIds.length,
    };
  }

  // EXCLUDE BULK ITEMS (TÖMEGES TÉTEL KIIKTATÁS EGY VAGY TÖBB SZÁMLÁN BELÜL)
  async bulkEliminaItems(itemIds: string[]) {
    if (!itemIds || itemIds.length === 0) {
      throw new BadRequestException('Nu au fost specificate linii pentru excludere.');
    }

    const items = await this.prisma.eFacturaItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, facturaId: true },
    });

    await this.prisma.eFacturaItem.updateMany({
      where: {
        id: { in: itemIds },
        stare: { not: 'IMPORTAT' },
      },
      data: { stare: 'ELIMINAT' },
    });

    const uniqueFacturaIds = Array.from(new Set(items.map((i) => i.facturaId)));
    for (const fId of uniqueFacturaIds) {
      await this.recalculeazaStareFactura(fId);
    }

    return {
      mesaj: `🗑️ ${itemIds.length} linii au fost excluse cu succes.`,
      count: itemIds.length,
    };
  }

  private async recalculeazaStareFactura(facturaId: string) {
    const articole = await this.prisma.eFacturaItem.findMany({ where: { facturaId } });
    const importate = articole.filter((a) => a.stare === 'IMPORTAT').length;
    const eliminate = articole.filter((a) => a.stare === 'ELIMINAT').length;
    const total = articole.length;

    let stareFinala = 'NEPROCESAT';
    if (importate + eliminate === total && total > 0) {
      stareFinala = importate > 0 ? 'IMPORTAT_TOTAL' : 'ELIMINAT';
    } else if (importate > 0 || eliminate > 0) {
      stareFinala = 'IMPORTAT_PARȚIAL';
    }

    await this.prisma.eFacturaFactura.update({
      where: { id: facturaId },
      data: { stare: stareFinala },
    });
  }
}
