import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XMLParser } from 'fast-xml-parser';
import * as AdmZip from 'adm-zip';
import axios from 'axios';

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
    const redirectUri = cfg.redirectUri || 'https://fleet-cmd.vercel.app/efactura';
    const authorizeUrl = `https://logincert.anaf.ro/anaf-oauth2/v1/authorize?response_type=code&client_id=${cfg.clientId}&redirect_uri=${redirectUri}&token_content_type=jwt`;

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

    // API ANAF Lista Mesaje: /rest/listaMesajePaginatieFactura?zile=X&cif=Y
    const url = `https://api.anaf.ro/prod/FCTEL/rest/listaMesajePaginatieFactura?zile=${safeZile}&cif=${cif}`;

    let mesajeData: any = null;
    try {
      const response = await this.executeWithRetry(() =>
        axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      mesajeData = response.data;
    } catch (err: any) {
      this.logger.error(`Eroare la interogarea listei de mesaje ANAF: ${err?.message}`);
      throw new BadRequestException(`Eroare comunicare ANAF SPV: ${err?.response?.data?.message || err?.message}`);
    }

    const mesajeList = mesajeData?.mesaje || mesajeData?.lista_mesaje || [];
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
              dataMesaj: msg.data_creare ? new Date(msg.data_creare) : new Date(),
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

    const numarFactura = invoice.ID || `FAC-${msgMeta.id_descarcare || Date.now()}`;
    const dataFacturaRaw = invoice.IssueDate || invoice.TaxPointDate;
    const dataFactura = dataFacturaRaw ? new Date(dataFacturaRaw) : new Date();

    // Furnizor / Vanzator
    const supplierParty = invoice.AccountingSupplierParty?.Party || {};
    const numeVanzator =
      supplierParty.PartyName?.Name ||
      supplierParty.PartyLegalEntity?.RegistrationName ||
      msgMeta.detalii ||
      'Furnizor Nespecificat';

    const cifVanzator =
      supplierParty.PartyTaxScheme?.CompanyID ||
      supplierParty.PartyIdentification?.ID ||
      msgMeta.cif_emitent ||
      'N/A';

    // Cumpărător
    const customerParty = invoice.AccountingCustomerParty?.Party || {};
    const cifCumparator =
      customerParty.PartyTaxScheme?.CompanyID ||
      customerParty.PartyIdentification?.ID ||
      'N/A';

    // Totaluri
    const monetaryTotal = invoice.LegalMonetaryTotal || {};
    const valoareTotala = Number(monetaryTotal.PayableAmount?.['#text'] || monetaryTotal.PayableAmount || msgMeta.valoare || 0);
    const moneda = monetaryTotal.PayableAmount?.['@_currencyID'] || 'RON';

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

    linesArray.forEach((line: any) => {
      if (!line) return;
      const itemNode = line.Item || {};
      const descrierePiesa = itemNode.Name || itemNode.Description || 'Articol Nespecificat';
      const codArticolFurnizor = itemNode.SellersItemIdentification?.ID || itemNode.StandardItemIdentification?.ID || null;

      const qtyNode = line.InvoicedQuantity || line.CreditedQuantity || { '#text': 1 };
      const cantitate = Number(qtyNode['#text'] || qtyNode || 1);
      const unitateMasura = qtyNode['@_unitCode'] || 'buc';

      const lineAmountNode = line.LineExtensionAmount || {};
      const valoareFaraTVA = Number(lineAmountNode['#text'] || lineAmountNode || 0);

      const priceNode = line.Price?.PriceAmount || {};
      const pretUnitar = Number(priceNode['#text'] || priceNode || (cantitate > 0 ? valoareFaraTVA / cantitate : 0));

      const taxCategory = itemNode.ClassifiedTaxCategory || line.TaxTotal?.TaxSubtotal?.TaxCategory || {};
      const cotaTVA = Number(taxCategory.Percent || 19);
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
  }) {
    const item = await this.prisma.eFacturaItem.findUnique({
      where: { id: itemId },
      include: { factura: true },
    });

    if (!item) throw new NotFoundException('Tétel nu a fost găsit.');
    if (item.stare === 'IMPORTAT') throw new BadRequestException('Acest tétel a fost deja importat în raktár.');

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
          pretUnitar: item.pretUnitar > 0 ? item.pretUnitar : articol.pretUnitar,
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
          pretUnitar: item.pretUnitar,
          unitateMasura: item.unitateMasura || 'buc',
          depozitId: targetDepozitId,
        },
      });
    }

    // 3. Înregistrare Recepție IntrareStoc
    await this.prisma.intrareStoc.create({
      data: {
        articolStocId: articol.id,
        depozitId: targetDepozitId,
        furnizor: item.factura.numeVanzator,
        numarFactura: item.factura.numarFactura,
        dataFactura: item.factura.dataFactura,
        cantitateIntrata: item.cantitate,
        pretUnitar: item.pretUnitar,
        pretTotal: item.valoareFaraTVA,
        observatii: `Importat automat din ANAF e-Factura (ID descarcare: ${item.factura.idDescarcare})`,
      },
    });

    // 4. Actualizare stare EFacturaItem & Parent EFacturaFactura
    const updatedItem = await this.prisma.eFacturaItem.update({
      where: { id: itemId },
      data: {
        stare: 'IMPORTAT',
        articolStocId: articol.id,
      },
    });

    await this.recalculeazaStareFactura(item.facturaId);

    return {
      mesaj: `📦 Articolul "${item.descrierePiesa}" (${item.cantitate} ${item.unitateMasura}) a fost importat cu succes în raktár!`,
      item: updatedItem,
      articolStoc: articol,
    };
  }

  // ELIMINARE TÉTEL (REZSI / SERVICII / ELVET)
  async eliminaItem(itemId: string) {
    const item = await this.prisma.eFacturaItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Tétel nu a fost găsit.');

    const updated = await this.prisma.eFacturaItem.update({
      where: { id: itemId },
      data: { stare: 'ELIMINAT' },
    });

    await this.recalculeazaStareFactura(item.facturaId);

    return { mesaj: `🗑️ Linia "${item.descrierePiesa}" a fost marcată ca ELVET / ELIMINAT.`, item: updated };
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
