import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type RobotMood = 'idle' | 'bored' | 'thinking' | 'analyzing' | 'happy' | 'alert' | 'speaking';

export interface PriceHistoryItem {
  dataFactura: string;
  numarFactura: string;
  furnizor: string;
  descriere: string;
  codArticol: string;
  pretUnitar: number;
  cantitate: number;
  um: string;
  valoareFaraTVA: number;
}

export interface PriceComparisonResult {
  searchTerm: string;
  totalFound: number;
  distinctVendors: string[];
  oldestPurchase: PriceHistoryItem | null;
  latestPurchase: PriceHistoryItem | null;
  minPricePurchase: PriceHistoryItem | null;
  maxPricePurchase: PriceHistoryItem | null;
  priceChangePercent: number | null;
  chronologicalHistory: PriceHistoryItem[];
}

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  private cachedSnapshot: any = null;
  private lastSnapshotTime: number = 0;
  private readonly CACHE_TTL_MS = 45000; // 45 secunde cache în memorie

  /**
   * Valós idejű flotta adatbázis pillanatkép készítése (Context Injection cu cache de 45s)
   */
  async getFleetSnapshot(force = false) {
    const nowMs = Date.now();
    if (!force && this.cachedSnapshot && nowMs - this.lastSnapshotTime < this.CACHE_TTL_MS) {
      return this.cachedSnapshot;
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    const [
      vehicule,
      documente,
      comenziLucru,
      articoleStoc,
      completariUlei,
      anvelope,
      totalFacturiCount,
      totalArticoleFacturiCount,
      mecanici,
      topVendors,
      latestInvoices,
      activeCouplings,
    ] = await Promise.all([
      // 1. Járművek
      this.prisma.vehicul.findMany({
        select: {
          id: true,
          numarIntern: true,
          numarInmatriculare: true,
          marca: true,
          model: true,
          anFabricatie: true,
          categorieEnum: true,
          valoareContorCurent: true,
          tipMasurare: true,
          stare: true,
        },
      }),

      // 2. Dokumentumok
      this.prisma.documentVehicul.findMany({
        include: {
          vehicul: {
            select: {
              numarIntern: true,
              numarInmatriculare: true,
              marca: true,
              model: true,
            },
          },
        },
      }),

      // 3. Munkalapok
      this.prisma.comandaLucru.findMany({
        where: {
          stare: { in: ['IN_LUCRU'] },
        },
        include: {
          vehicul: {
            select: {
              numarIntern: true,
              numarInmatriculare: true,
            },
          },
          elementeComanda: {
            select: {
              costTotal: true,
              descriere: true,
            },
          },
        },
        orderBy: { dataDeschidere: 'desc' },
      }),

      // 4. Stocuri critice
      this.prisma.articolStoc.findMany({
        select: {
          id: true,
          codArticol: true,
          denumire: true,
          categorie: true,
          stocCurent: true,
          stocMinim: true,
          unitateMasura: true,
          pretUnitar: true,
        },
      }),

      // 5. Olajok / utántöltések
      this.prisma.completareLichid.findMany({
        take: 10,
        orderBy: { dataCompletare: 'desc' },
        include: {
          vehicul: {
            select: {
              numarIntern: true,
              numarInmatriculare: true,
            },
          },
        },
      }),

      // 6. Gumiabroncsok
      this.prisma.anvelopa.findMany({
        select: {
          id: true,
          marca: true,
          dimensiune: true,
          adancimeCurentaMm: true,
          stare: true,
        },
      }),

      // 7. Számlák száma
      this.prisma.eFacturaFactura.count(),

      // 8. Számlatételek száma
      this.prisma.eFacturaItem.count(),

      // 9. Műhely szerelők
      this.prisma.mecanic.findMany({
        select: {
          id: true,
          nume: true,
          functie: true,
          telefon: true,
        },
        orderBy: { nume: 'asc' },
      }),

      // 10. Top 10 beszállító számlaszám és összérték szerint
      this.prisma.eFacturaFactura.groupBy({
        by: ['numeVanzator'],
        _count: { id: true },
        _sum: { valoareTotala: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),

      // 11. Legutóbbi számlák
      this.prisma.eFacturaFactura.findMany({
        take: 6,
        orderBy: { dataFactura: 'desc' },
        select: {
          numeVanzator: true,
          numarFactura: true,
          dataFactura: true,
          valoareTotala: true,
        },
      }),

      // 12. Aktív vontató-félpótkocsi kapcsolatok
      this.prisma.istoricCuplare.findMany({
        where: { esteActiv: true },
        include: {
          capTractor: { select: { numarIntern: true, numarInmatriculare: true } },
          semiremorca: { select: { numarIntern: true, numarInmatriculare: true } },
        },
      }),
    ]);

    // Számítások
    const totalVehicule = vehicule.length;
    const vehiculeActive = vehicule.filter((v) => v.stare === 'ACTIV').length;

    // Kategória eloszlás
    const categoriiCount: Record<string, number> = {};
    vehicule.forEach((v) => {
      const cat = v.categorieEnum || 'ALTELE';
      categoriiCount[cat] = (categoriiCount[cat] || 0) + 1;
    });

    // Dokumentumok lejárata
    const docExpirate: any[] = [];
    const docUrgente: any[] = []; // 30 napon belül

    documente.forEach((d) => {
      const expDate = new Date(d.dataExpirare);
      const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const info = {
        vehicul: d.vehicul?.numarInmatriculare || d.vehicul?.numarIntern || 'Fără Număr',
        numarIntern: d.vehicul?.numarIntern,
        tip: d.tipDocument,
        dataExpirare: expDate.toISOString().split('T')[0],
        zileRamase: diffDays,
      };

      if (diffDays <= 0) {
        docExpirate.push(info);
      } else if (diffDays <= 30) {
        docUrgente.push(info);
      }
    });

    // Munkalapok
    const openOrders = comenziLucru.map((c) => {
      const costTotal = c.elementeComanda?.reduce((sum, el) => sum + (el.costTotal || 0), 0) || 0;
      return {
        numar: c.numarComanda,
        vehicul: c.vehicul?.numarInmatriculare || c.vehicul?.numarIntern,
        stare: c.stare,
        costTotal,
        descriere: c.observatii || 'Intervenție atelier',
        dataDeschidere: c.dataDeschidere ? c.dataDeschidere.toISOString().split('T')[0] : '',
      };
    });

    // Készlethiány
    const stocCritic = articoleStoc.filter((a) => a.stocCurent <= a.stocMinim).map((a) => ({
      cod: a.codArticol,
      denumire: a.denumire,
      stoc: a.stocCurent,
      minim: a.stocMinim,
      um: a.unitateMasura,
    }));

    const result = {
      totalVehicule,
      vehiculeActive,
      categoriiCount,
      docExpirateCount: docExpirate.length,
      docUrgenteCount: docUrgente.length,
      docExpirate,
      docUrgente,
      comenziDeschiseCount: comenziLucru.length,
      openOrders,
      stocCriticCount: stocCritic.length,
      stocCritic,
      anvelopeCount: anvelope.length,
      totalFacturiCount,
      totalArticoleFacturiCount,
      mecanici: mecanici.map((m) => ({
        id: m.id,
        nume: m.nume,
        functie: m.functie || 'Mecanic Atelier',
        telefon: m.telefon || '',
      })),
      topVendors: topVendors.map((v) => ({
        nume: v.numeVanzator,
        numar: v._count.id,
        totalRon: Math.round((v._sum.valoareTotala || 0) * 100) / 100,
      })),
      latestInvoices: latestInvoices.map((inv) => ({
        numeVanzator: inv.numeVanzator,
        numarFactura: inv.numarFactura,
        dataFactura: inv.dataFactura.toISOString().split('T')[0],
        valoare: inv.valoareTotala,
      })),
      activeCouplings: activeCouplings.map((c) => ({
        tractor: c.capTractor?.numarIntern || c.capTractor?.numarInmatriculare,
        remorca: c.semiremorca?.numarIntern || c.semiremorca?.numarInmatriculare,
      })),
      vehiculeSample: vehicule.slice(0, 30).map((v) => ({
        intern: v.numarIntern,
        inm: v.numarInmatriculare,
        marca: v.marca,
        model: v.model,
        km: v.valoareContorCurent,
        cat: v.categorieEnum,
      })),
      recentFluids: completariUlei.map((f) => ({
        vehicul: f.vehicul?.numarInmatriculare,
        tip: f.tipLichid,
        litri: f.cantitateLitri,
        data: f.dataCompletare.toISOString().split('T')[0],
      })),
    };

    this.cachedSnapshot = result;
    this.lastSnapshotTime = Date.now();
    return result;
  }

  /**
   * Gyors KPI összefoglaló a robot fejléchez
   */
  async getQuickKpi() {
    const snap = await this.getFleetSnapshot();
    return {
      totalVehicles: snap.totalVehicule,
      activeVehicles: snap.vehiculeActive,
      expiredDocs: snap.docExpirateCount,
      imminentDocs: snap.docUrgenteCount,
      openOrders: snap.comenziDeschiseCount,
      lowStockItems: snap.stocCriticCount,
    };
  }

  /**
   * ROBI ÖNFEJLESZTŐ MEMÓRIÁJA: Emlékek visszahívása
   */
  async recallMemories(query?: string) {
    try {
      const memories = await this.prisma.aiMemory.findMany({
        take: 15,
        orderBy: { updatedAt: 'desc' },
      });
      return memories;
    } catch (err: any) {
      console.warn('Eroare la citirea memoriei AI:', err.message);
      return [];
    }
  }

  /**
   * ROBI ÖNFEJLESZTŐ MEMÓRIÁJA: Új tény / szabály rögzítése
   */
  async recordMemory(tip: string, cheie: string, valoare: string, context?: string) {
    try {
      const existing = await this.prisma.aiMemory.findFirst({
        where: { cheie },
      });

      if (existing) {
        return await this.prisma.aiMemory.update({
          where: { id: existing.id },
          data: { valoare, context, tip, updatedAt: new Date() },
        });
      }

      return await this.prisma.aiMemory.create({
        data: { tip, cheie, valoare, context },
      });
    } catch (err: any) {
      console.warn('Eroare la salvarea memoriei AI:', err.message);
      return null;
    }
  }

  /**
   * ROBI ÖNFEJLESZTŐ MEMÓRIÁJA: Tanulási utasítások automatikus felismerése
   */
  async checkAndLearnFromMessage(message: string, lang: 'ro' | 'hu'): Promise<string | null> {
    const trimmed = message.trim();

    // Magyar minták
    const huMatch = trimmed.match(/^(?:kérlek\s+)?(?:jegyezd\s+meg|tudd|emlékezz|tanuld\s+meg)[,:\s]+(?:hogy\s+)?(.+)$/i);
    if (huMatch && huMatch[1]) {
      const content = huMatch[1].trim();
      const cheie = content.slice(0, 35).toLowerCase().replace(/[^a-z0-9]/g, '_');
      await this.recordMemory('FAPT', cheie, content, 'Tanítva a felhasználó által');
      return `🧠 **Megjegyeztem és megtanultam:** *„${content}”*\nEzt a jövőbeli válaszaimnál is figyelembe fogom venni!`;
    }

    // Román minták
    const roMatch = trimmed.match(/^(?:te\s+rog\s+)?(?:reține|ține\s+minte|notează|memorează)[,:\s]+(?:că\s+)?(.+)$/i);
    if (roMatch && roMatch[1]) {
      const content = roMatch[1].trim();
      const cheie = content.slice(0, 35).toLowerCase().replace(/[^a-z0-9]/g, '_');
      await this.recordMemory('FAPT', cheie, content, 'Învățat de la utilizator');
      return `🧠 **Am reținut și salvat:** *„${content}”*\nVoi ține cont de această informație în analizele viitoare!`;
    }

    return null;
  }

  /**
   * TÉTELES SZÁMLAKERESÉS ÉS IDŐRENDI ÁRÖSSZEHASONLÍTÁS (EFacturaItem & IntrareStoc)
   */
  async searchInvoiceItemsAndPriceHistory(userMessage: string): Promise<PriceComparisonResult | null> {
    const isPriceOrItemQuery =
      /piesa|piese|articol|articole|pret|preț|cost|scump|ieftin|istoric|compar|compara|comparare|patin[aă]|placute|plăcuțe|filtru|ulei|valva|valvă|disc|anvelop|bec|senzor|garnitur|bujie|lichid|alkatrész|alkatresz|tétel|tetel|számlatétel|termékkód|termekkod|cikkszám|cikkszam|ár|árak|arak|drág|drag|olcsó|olcso|összehasonlít|osszehasonlit|mennyiért|mennyiert|került|kerult|vettük|vettuk/i.test(
        userMessage
      );

    const stopWords = new Set([
      'szia', 'hello', 'hali', 'üdv', 'buna', 'salut', 'care', 'este', 'sunt', 'din',
      'pentru', 'despre', 'poti', 'cauta', 'factura', 'facturi', 'szamla', 'szamlak',
      'számla', 'számlák', 'havonta', 'havi', 'mennyi', 'mennyit', 'mennyibe', 'kerul',
      'kerül', 'érdekel', 'erdekel', 'akarom', 'szeretném', 'tudsz', 'keresni', 'cat',
      'cât', 'citi', 'câte', 'cate', 'total', 'toate', 'vreau', 'arata', 'arată', 'nekem',
      'mutasd', 'spune', 'avem', 'există', 'plati', 'kifizetve', 'kérlek', 'kerlek', 'hogy',
      'változott', 'valtozott', 'történt', 'tortent', 'hogyan', 'mikor', 'melyik', 'időrend',
      'idorend', 'időrendben', 'idorendben', 'árösszehasonlítás', 'osszehasonlitas'
    ]);

    const words = userMessage
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"„”]/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !stopWords.has(w.toLowerCase()));

    if (!isPriceOrItemQuery || words.length === 0) {
      return null;
    }

    const orConditions: any[] = [];
    words.forEach((w) => {
      orConditions.push({ descrierePiesa: { contains: w } });
      orConditions.push({ codArticolFurnizor: { contains: w } });
    });

    const items = await this.prisma.eFacturaItem.findMany({
      where: { OR: orConditions },
      include: {
        factura: {
          select: {
            numeVanzator: true,
            numarFactura: true,
            dataFactura: true,
          },
        },
      },
      orderBy: {
        factura: {
          dataFactura: 'asc',
        },
      },
      take: 200,
    });

    if (items.length === 0) {
      return null;
    }

    const history: PriceHistoryItem[] = items.map((it) => {
      const d = it.factura?.dataFactura ? new Date(it.factura.dataFactura) : new Date(it.createdAt);
      return {
        dataFactura: d.toISOString().split('T')[0],
        numarFactura: it.factura?.numarFactura || '-',
        furnizor: it.factura?.numeVanzator || 'Furnizor e-Factura',
        descriere: it.descrierePiesa,
        codArticol: it.codArticolFurnizor || 'Fără Cod',
        pretUnitar: Math.round(it.pretUnitar * 100) / 100,
        cantitate: it.cantitate,
        um: it.unitateMasura || 'buc',
        valoareFaraTVA: Math.round(it.valoareFaraTVA * 100) / 100,
      };
    });

    history.sort((a, b) => a.dataFactura.localeCompare(b.dataFactura));

    const distinctVendors = Array.from(new Set(history.map((h) => h.furnizor)));
    const oldestPurchase = history[0];
    const latestPurchase = history[history.length - 1];

    let minPricePurchase = history[0];
    let maxPricePurchase = history[0];

    history.forEach((h) => {
      if (h.pretUnitar < minPricePurchase.pretUnitar) minPricePurchase = h;
      if (h.pretUnitar > maxPricePurchase.pretUnitar) maxPricePurchase = h;
    });

    let priceChangePercent: number | null = null;
    if (oldestPurchase.pretUnitar > 0 && oldestPurchase !== latestPurchase) {
      priceChangePercent =
        Math.round(((latestPurchase.pretUnitar - oldestPurchase.pretUnitar) / oldestPurchase.pretUnitar) * 1000) / 10;
    }

    return {
      searchTerm: words.join(' '),
      totalFound: history.length,
      distinctVendors,
      oldestPurchase,
      latestPurchase,
      minPricePurchase,
      maxPricePurchase,
      priceChangePercent,
      chronologicalHistory: history,
    };
  }

  /**
   * Fő Chat és Elemző Végpont
   */
  async chat(userMessage: string, history: ChatMessage[] = []) {
    const lang = this.detectLanguage(userMessage);

    // 1. Tanulási / Megjegyzési parancsok ellenőrzése
    const learnedAck = await this.checkAndLearnFromMessage(userMessage, lang);
    if (learnedAck) {
      return {
        answer: learnedAck,
        reply: learnedAck,
        text: learnedAck,
        mood: 'happy' as RobotMood,
        source: 'memory-engine',
        fleetKpi: await this.getQuickKpi(),
      };
    }

    // 2. Adatbázis pillanatkép és Releváns Emlékek párhuzamos lekérése
    const [snapshot, memories] = await Promise.all([
      this.getFleetSnapshot(),
      this.recallMemories(userMessage),
    ]);

    const apiKey = process.env.GEMINI_API_KEY;

    let mood: RobotMood = 'happy';
    if (snapshot.docExpirateCount > 0 || snapshot.stocCriticCount > 0) {
      mood = 'alert';
    }

    // 3. Tételes számlakeresés és időrendi árösszehasonlítás
    const priceCompData = await this.searchInvoiceItemsAndPriceHistory(userMessage);

    // 4. Számla aggregált keresés (ha nem specifikus alkatrész tételről van szó)
    const invoiceData = priceCompData ? null : await this.searchInvoices(userMessage);

    // 5. Ha van Gemini API kulcs, hívjuk meg a modellt
    if (apiKey && apiKey.trim() !== '') {
      try {
        const geminiResponse = await this.callGeminiApi(
          apiKey,
          userMessage,
          history,
          snapshot,
          lang,
          invoiceData,
          priceCompData,
          memories
        );
        return {
          answer: geminiResponse.answer,
          reply: geminiResponse.answer,
          text: geminiResponse.answer,
          mood: geminiResponse.mood || mood,
          source: 'gemini',
          fleetKpi: {
            totalVehicles: snapshot.totalVehicule,
            activeVehicles: snapshot.vehiculeActive,
            expiredDocs: snapshot.docExpirateCount,
            imminentDocs: snapshot.docUrgenteCount,
            openOrders: snapshot.comenziDeschiseCount,
            lowStockItems: snapshot.stocCriticCount,
          },
        };
      } catch (err: any) {
        console.warn('Gemini API hiba, átváltás a beépített analitikai motorra:', err.message);
      }
    }

    // 6. Beépített Analitikai Szabálymotor (Bilingv: RO implicit, HU ha magyarul kérdeztek)
    const ruleResponse = this.processRuleEngine(
      userMessage,
      snapshot,
      lang,
      invoiceData,
      priceCompData,
      memories
    );
    return {
      answer: ruleResponse.answer,
      reply: ruleResponse.answer,
      text: ruleResponse.answer,
      mood: ruleResponse.mood,
      source: 'builtin-engine',
      fleetKpi: {
        totalVehicles: snapshot.totalVehicule,
        activeVehicles: snapshot.vehiculeActive,
        expiredDocs: snapshot.docExpirateCount,
        imminentDocs: snapshot.docUrgenteCount,
        openOrders: snapshot.comenziDeschiseCount,
        lowStockItems: snapshot.stocCriticCount,
      },
    };
  }

  /**
   * Căutare inteligentă de facturi în baza de date (eFacturaFactura și IntrareStoc)
   */
  async searchInvoices(userMessage: string) {
    const isInvoiceQuery = /factur|száml|szaml|számláz|szamlaz|dubhe|parts\s*trade|furnizor|beszállító|beszallito|plati|fizet/i.test(userMessage);

    const stopWords = [
      'szia', 'hello', 'hali', 'üdv', 'buna', 'salut', 'servus', 'care', 'ce', 'este',
      'sunt', 'din', 'pentru', 'despre', 'poti', 'cauta', 'factura', 'facturi', 'facturile',
      'factura', 'facturii', 'facturilor', 'szamla', 'szamlak', 'számla', 'számlák', 'számlát',
      'szamlat', 'számláz', 'szamlaz', 'számláznak', 'szamlaznak', 'számlázás', 'szamlazas',
      'havonta', 'havi', 'hónap', 'honap', 'mennyi', 'mennyit', 'mennyibe', 'kerul', 'kerül',
      'összeg', 'osszeg', 'érdekel', 'erdekel', 'érdekelnek', 'erdekelnek', 'rdekelnek', 'rdekel',
      'látni', 'latni', 'akarom', 'szeretnem', 'szeretném', 'tudsz', 'keresni', 'luna', 'lunar',
      'cat', 'cât', 'citi', 'câte', 'cate', 'mult', 'total', 'totale', 'totala', 'totală',
      'toate', 'toti', 'vreau', 'arata', 'arată', 'nekem', 'mutasd', 'spune', 'spune-mi',
      'avem', 'aveti', 'aveți', 'exista', 'există', 'plati', 'plăți', 'fizet', 'fizetve',
      'kifizetve', 'adott', 'kapott', 'beérkező', 'beerkezo', 'kimenő', 'kimeno', 'kérlek', 'kerlek'
    ];

    const cleanWords = userMessage
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"„”]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .filter((w) => !stopWords.includes(w.toLowerCase()));

    if (!isInvoiceQuery && cleanWords.length === 0) {
      return null;
    }

    if (cleanWords.length === 0) {
      // Întrebare generală despre facturi fără furnizor specific
      const totalCount = await this.prisma.eFacturaFactura.count();
      const topVendors = await this.prisma.eFacturaFactura.groupBy({
        by: ['numeVanzator'],
        _count: { id: true },
        _sum: { valoareTotala: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      });
      return {
        isSpecific: false,
        totalInvoices: totalCount,
        topVendors: topVendors.map((v) => ({
          nume: v.numeVanzator,
          numar: v._count.id,
          totalRon: Math.round((v._sum.valoareTotala || 0) * 100) / 100,
        })),
      };
    }

    // Căutare după termenii identificați
    const orConditions: any[] = [];
    cleanWords.forEach((word) => {
      orConditions.push({ numeVanzator: { contains: word } });
      orConditions.push({ numarFactura: { contains: word } });
    });

    const matchingFacturi = await this.prisma.eFacturaFactura.findMany({
      where: { OR: orConditions },
      orderBy: { dataFactura: 'desc' },
      take: 200,
    });

    if (matchingFacturi.length === 0) {
      // Încercăm și în intrări stoc
      const matchingIntrari = await this.prisma.intrareStoc.findMany({
        where: {
          OR: cleanWords.map((word) => ({ furnizor: { contains: word } })),
        },
        orderBy: { dataFactura: 'desc' },
        take: 50,
      });

      if (matchingIntrari.length > 0) {
        const monthlyTotals: Record<string, { total: number; count: number }> = {};
        let grandTotal = 0;
        matchingIntrari.forEach((i) => {
          const d = new Date(i.dataFactura);
          const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!monthlyTotals[m]) monthlyTotals[m] = { total: 0, count: 0 };
          monthlyTotals[m].total += i.pretTotal;
          monthlyTotals[m].count += 1;
          grandTotal += i.pretTotal;
        });

        return {
          isSpecific: true,
          found: true,
          source: 'intrareStoc',
          vendors: [matchingIntrari[0].furnizor],
          totalCount: matchingIntrari.length,
          grandTotal: Math.round(grandTotal * 100) / 100,
          monthly: Object.entries(monthlyTotals)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, data]) => ({
              luna: month,
              suma: Math.round(data.total * 100) / 100,
              numar: data.count,
            })),
        };
      }

      return {
        isSpecific: true,
        found: false,
        searchTerm: cleanWords.join(' '),
      };
    }

    // Agregare lunară
    const monthlyTotals: Record<string, { total: number; count: number }> = {};
    let grandTotal = 0;
    const vendorNames = new Set<string>();

    matchingFacturi.forEach((f) => {
      vendorNames.add(f.numeVanzator);
      const d = new Date(f.dataFactura);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyTotals[m]) monthlyTotals[m] = { total: 0, count: 0 };
      monthlyTotals[m].total += f.valoareTotala;
      monthlyTotals[m].count += 1;
      grandTotal += f.valoareTotala;
    });

    return {
      isSpecific: true,
      found: true,
      source: 'eFacturaFactura',
      vendors: Array.from(vendorNames),
      totalCount: matchingFacturi.length,
      grandTotal: Math.round(grandTotal * 100) / 100,
      monthly: Object.entries(monthlyTotals)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          luna: month,
          suma: Math.round(data.total * 100) / 100,
          numar: data.count,
        })),
    };
  }

  /**
   * Detecție limbă (Română implicit, Maghiară dacă utilizatorul folosește cuvinte sau caractere maghiare)
   */
  private detectLanguage(text: string): 'ro' | 'hu' {
    const lower = text.toLowerCase();
    if (/[ăâîșț]/i.test(lower)) {
      return 'ro';
    }
    if (/[áéíóöőúüű]/i.test(lower)) {
      return 'hu';
    }
    const huWordRegex = /\b(szia|hogy|mennyi|melyik|kocsi|autó|auto|jármű|jarmu|akta|akták|aktak|lejárt|lejart|raktár|raktar|szerviz|költség|koltseg|segíts|segits|köszönöm|koszonom|hali|munkalap|okmány|okmany|jelentés|jelentes|állapot|allapot|kérlek|kerlek|vannak|készlet|keszlet|alkatrész|alkatresz|számla|szamla|számlák|szamlak|mennyibe|keress|keresd|érdekel|rdekelnek)\b/i;
    return huWordRegex.test(lower) ? 'hu' : 'ro';
  }

  /**
   * Biztonságos univerzális adatbázis lekérdező Robi AI ágens számára
   * Hozzáférés mind a 30+ modellhez szigorúan olvasási (read-only) módban.
   */
  public async executeSafeFleetQuery(params: {
    model: string;
    action: 'findMany' | 'findFirst' | 'count' | 'aggregate' | 'groupBy';
    where?: any;
    select?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
    by?: string[];
    _count?: any;
    _sum?: any;
    _avg?: any;
    explanation?: string;
  }): Promise<any> {
    const allowedModels: Record<string, string> = {
      vehicul: 'vehicul',
      categorievehicul: 'categorieVehicul',
      mecanic: 'mecanic',
      user: 'user',
      documentvehicul: 'documentVehicul',
      comandalucru: 'comandaLucru',
      elementcomandalucru: 'elementComandaLucru',
      articolstoc: 'articolStoc',
      categoriestoc: 'categorieStoc',
      subcategoriestoc: 'subcategorieStoc',
      depozit: 'depozit',
      transferstoc: 'transferStoc',
      intrarestoc: 'intrareStoc',
      completarelichid: 'completareLichid',
      completareulei: 'completareLichid',
      anvelopa: 'anvelopa',
      pozitieax: 'pozitieAx',
      istoricpermutareanvelopa: 'istoricPermutareAnvelopa',
      masurareuzuraanvelopa: 'masurareUzuraAnvelopa',
      istoriccuplare: 'istoricCuplare',
      cuplaretractorremorca: 'istoricCuplare',
      cuplare: 'istoricCuplare',
      regulaalertamentenanta: 'regulaAlertaMentenanta',
      alertapersonalizata: 'alertaPersonalizata',
      sarcinamentenanta: 'sarcinaMentenanta',
      efacturafactura: 'eFacturaFactura',
      efacturaitem: 'eFacturaItem',
      aimemory: 'aiMemory',
      auditlog: 'auditLog',
    };

    const modelKey = (params.model || '').toLowerCase().trim();
    const prismaModelName = allowedModels[modelKey];
    if (!prismaModelName || !(this.prisma as any)[prismaModelName]) {
      return {
        error: `Model necunoscut sau nepermis: "${params.model}". Modele permise: ${Object.keys(allowedModels).slice(0, 10).join(', ')}...`,
      };
    }

    const prismaDelegate = (this.prisma as any)[prismaModelName];
    const action = params.action;
    const allowedActions = ['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'];
    if (!allowedActions.includes(action)) {
      return {
        error: `Acțiune nepermisă: "${action}". Acțiuni permise: ${allowedActions.join(', ')}`,
      };
    }

    try {
      const safeTake = Math.min(Math.max(params.take || 10, 1), 30);
      const queryOptions: any = {};

      if (params.where && typeof params.where === 'object') {
        queryOptions.where = params.where;
      }
      if (params.orderBy && typeof params.orderBy === 'object') {
        queryOptions.orderBy = params.orderBy;
      }

      if (action === 'findMany' || action === 'findFirst') {
        queryOptions.take = safeTake;
        if (params.select && typeof params.select === 'object') {
          const cleanSelect = { ...params.select };
          delete cleanSelect.parola;
          delete cleanSelect.password;
          delete cleanSelect.token;
          queryOptions.select = cleanSelect;
        }
      } else if (action === 'groupBy') {
        if (!Array.isArray(params.by) || params.by.length === 0) {
          return { error: 'Parametrul "by" este obligatoriu pentru groupBy' };
        }
        queryOptions.by = params.by;
        queryOptions.take = safeTake;
        if (params._count) queryOptions._count = params._count;
        if (params._sum) queryOptions._sum = params._sum;
        if (params._avg) queryOptions._avg = params._avg;
      } else if (action === 'aggregate') {
        if (params._count) queryOptions._count = params._count;
        if (params._sum) queryOptions._sum = params._sum;
        if (params._avg) queryOptions._avg = params._avg;
      }

      const rawResult = await prismaDelegate[action](queryOptions);
      return this.sanitizeQueryResult(rawResult);
    } catch (err: any) {
      return { error: `Eroare la interogare Prisma: ${err.message}` };
    }
  }

  /**
   * Salvare memorie pe termen lung în AiMemory
   */
  public async saveLearnedMemory(params: {
    cheie: string;
    valoare: string;
    tip?: string;
    context?: string;
  }): Promise<any> {
    try {
      const cleanKey = (params.cheie || 'memoria_' + Date.now()).toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const existing = await this.prisma.aiMemory.findFirst({ where: { cheie: cleanKey } });
      let memory: any;
      if (existing) {
        memory = await this.prisma.aiMemory.update({
          where: { id: existing.id },
          data: {
            valoare: params.valoare,
            context: params.context || 'Salvat de Robi în conversație',
            tip: params.tip || 'FAPT',
          },
        });
      } else {
        memory = await this.prisma.aiMemory.create({
          data: {
            cheie: cleanKey,
            valoare: params.valoare,
            tip: params.tip || 'FAPT',
            context: params.context || 'Salvat de Robi în conversație',
          },
        });
      }
      return { success: true, saved: memory.cheie, valoare: memory.valoare };
    } catch (err: any) {
      return { error: `Nu s-a putut salva memoria: ${err.message}` };
    }
  }

  /**
   * Filtru de securitate pentru date confidențiale (parole, secrete, hash-uri)
   */
  private sanitizeQueryResult(data: any): any {
    if (!data) return data;
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeQueryResult(item));
    }
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('parola') ||
          lowerKey.includes('password') ||
          lowerKey.includes('token') ||
          lowerKey.includes('secret')
        ) {
          sanitized[key] = '***CONFIDENTIAL***';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeQueryResult(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return data;
  }

  /**
   * Stare emoțională inteligentă pentru avatarul Robi
   */
  private determineMood(text: string, defaultMood: RobotMood = 'happy'): RobotMood {
    const lower = text.toLowerCase();
    if (
      lower.includes('expirat') ||
      lower.includes('lejárt') ||
      lower.includes('critic') ||
      lower.includes('kritikus') ||
      lower.includes('alert') ||
      lower.includes('pericol')
    ) {
      return 'alert';
    }
    if (
      lower.includes('factur') ||
      lower.includes('számla') ||
      lower.includes('pret') ||
      lower.includes('ár') ||
      lower.includes('top') ||
      lower.includes('total') ||
      lower.includes('mecanic') ||
      lower.includes('szerelő')
    ) {
      return 'analyzing';
    }
    return defaultMood;
  }

  /**
   * Hívás a Google Gemini API-hoz (Agentic Function Calling & Reasoning Loop)
   */
  private async callGeminiApi(
    apiKey: string,
    message: string,
    history: ChatMessage[],
    snap: any,
    lang: 'ro' | 'hu',
    invoiceData?: any,
    priceCompData?: PriceComparisonResult | null,
    memories?: any[]
  ): Promise<{ answer: string; mood: RobotMood }> {
    let invoiceInfo = '';
    if (invoiceData) {
      if (invoiceData.found) {
        invoiceInfo = `
REZULTATE FACTURI FURNIZOR (CIFRE REALE):
- Furnizor: ${invoiceData.vendors.join(', ')}
- Număr facturi: ${invoiceData.totalCount} buc, Valoare: ${invoiceData.grandTotal} RON
- Defalcare lunară exactă: ${JSON.stringify(invoiceData.monthly)}
Prezintă direct această defalcare!
`;
      } else if (invoiceData.isSpecific === false) {
        invoiceInfo = `
DATE GENERALE FACTURI:
- Total facturi în e-Factura: ${invoiceData.totalInvoices}
- Top furnizori: ${JSON.stringify(invoiceData.topVendors)}
`;
      } else if (invoiceData.found === false) {
        invoiceInfo = `
CĂUTARE FACTURI: Nu s-au găsit facturi pentru termenul: „${invoiceData.searchTerm}”.
`;
      }
    }

    let priceCompInfo = '';
    if (priceCompData && priceCompData.totalFound > 0) {
      priceCompInfo = `
REZULTATE ANALIZĂ TÉTELES SZÁMLÁK ÉS ÁR-ÖSSZEHASONLÍTÁS (CIFRE REALE DIN EFACTURAITEM):
- Termen căutat: „${priceCompData.searchTerm}” (Găsite: ${priceCompData.totalFound} achiziții)
- Furnizori identificați: ${priceCompData.distinctVendors.join(', ')}
- Cel mai vechi preț achiziție: ${priceCompData.oldestPurchase?.pretUnitar} RON (${priceCompData.oldestPurchase?.dataFactura}, ${priceCompData.oldestPurchase?.furnizor}, factura ${priceCompData.oldestPurchase?.numarFactura})
- Cel mai recent preț achiziție: ${priceCompData.latestPurchase?.pretUnitar} RON (${priceCompData.latestPurchase?.dataFactura}, ${priceCompData.latestPurchase?.furnizor}, factura ${priceCompData.latestPurchase?.numarFactura})
- Cel mai mic preț (minim istoric): ${priceCompData.minPricePurchase?.pretUnitar} RON (${priceCompData.minPricePurchase?.dataFactura}, ${priceCompData.minPricePurchase?.furnizor})
- Cel mai mare preț (maxim istoric): ${priceCompData.maxPricePurchase?.pretUnitar} RON (${priceCompData.maxPricePurchase?.dataFactura}, ${priceCompData.maxPricePurchase?.furnizor})
- Evoluție preț: ${priceCompData.priceChangePercent !== null ? (priceCompData.priceChangePercent >= 0 ? '+' : '') + priceCompData.priceChangePercent + '%' : 'constant'}
- Istoric cronologic achiziții (ultimele 6): ${JSON.stringify(
        priceCompData.chronologicalHistory.slice(-6).map((h) => ({
          data: h.dataFactura,
          furnizor: h.furnizor,
          pretUnitar: h.pretUnitar,
          buc: h.cantitate,
          cod: h.codArticol,
          piesa: h.descriere,
          factura: h.numarFactura,
        }))
      )}
Prezintă comparativ și cronologic aceste date exacte!
`;
    }

    let memoryInfo = '';
    if (memories && memories.length > 0) {
      memoryInfo = `
MEMORIA ÎNVĂȚATĂ DE ROBI (FAPTE ȘI PREFERINȚE SALVATE ANTERIOR):
${memories.map((m) => `- [${m.tip}] ${m.cheie}: ${m.valoare}`).join('\n')}
`;
    }

    const systemPrompt = `
Ești Robi, asistentul robot inteligent, alb și autonom al sistemului FleetCMD.
PERSONALITATE: Inteligent, tehnic, prietenos, dar FOARTE SCURT și DIRECT LA SUBIECT.
${
  lang === 'hu'
    ? 'UTILIZATORUL A SCRIS ÎN MAGHIARĂ: Răspunde-i exclusiv în limba MAGHIARĂ!'
    : 'UTILIZATORUL A SCRIS ÎN ROMÂNĂ: Răspunde-i în limba ROMÂNĂ!'
}

REGULĂ STRICTĂ PRIVIND SALUTUL (CRITIC):
- NU SALUTA la fiecare mesaj („Szia!”, „Salut!”, „Bună!” etc.)! Este STRICT INTERZIS dacă utilizatorul pune o întrebare directă. Treci direct la date!
- Saluți DOAR dacă mesajul utilizatorului este exclusiv un salut scurt (ex: „szia”, „salut”).

REGULĂ STRICTĂ DE LUNGIME:
- Răspunde în MAXIMUM 2-4 FRAZE sau o listă compactă cu liniuțe (3-5 rânduri).
- FĂRĂ politețuri inutile, introduceri lungi sau tabele uriașe.

CAPABILITĂȚI DE AGENT ȘI ACCES LA INSTRUMENTE (TOOLS):
Ai acces direct la instrumentul „queryFleetDatabase” pentru a interoga în siguranță (read-only) ORICARE dintre tabelele bazei de date Prisma!
Dacă utilizatorul întreabă despre detalii care nu sunt în rezumatul de mai jos (de exemplu: mecanici, utilizatori, facturi recente, furnizori top, istoric cuplare remorci, completări ulei, piese dintr-o comandă, uzură anvelope, audit log), FOLOSEȘTE „queryFleetDatabase”!
Nu spune niciodată că nu ai acces la o tabelă dacă aceasta există în sistem!
De asemenea, poți salva fapte noi sau preferințe cu instrumentul „saveMemory”.

MODELE PRISMA PRINCIPALE DISPONIBILE ÎN SISTEM:
1. Mecanic: { id, nume, functie, telefon, activ }
2. User: { id, nume, prenume, email, rol, activ }
3. Vehicul: { id, numarIntern, numarInmatriculare, serieSasiu, marca, model, anFabricatie, categorieEnum, valoareContorCurent, tipMasurare, stare }
4. IstoricCuplare: { id, capTractorId, semiremorcaId, capTractor, semiremorca, dataCuplare, dataDecuplare, esteActiv }
5. DocumentVehicul: { id, idVehicul, tipDocument, serieNumar, dataEmitere, dataExpirare, cost, vehicul }
6. ComandaLucru: { id, numarComanda, idVehicul, stare, dataDeschidere, dataInchidere, prioritate, costPiese, costManopera, vehicul, mecanic }
7. ElementComandaLucru: { id, comandaLucruId, tipElement, denumire, codPiesa, cantitate, pretUnitar, costTotal }
8. ArticolStoc: { id, codArticol, denumire, categorie, stocCurent, stocMinim, unitateMasura, pretUnitar }
9. MiscareStoc: { id, articolStocId, tipMiscare, cantitate, pretUnitar, dataMiscare, documentReferinta }
10. CompletareLichid: { id, vehiculId, tipLichid, cantitateLitri, costTotal, dataCompletare, vehicul }
11. Anvelopa: { id, codIdentificare, marca, dimensiune, model, adancimeCurentaMm, stare, pozitieAxa }
12. EFacturaFactura: { id, idDescarcare, numeVanzator, cifVanzator, numarFactura, dataFactura, valoareTotala, moneda, stare }
13. EFacturaItem: { id, facturaId, codArticolFurnizor, descrierePiesa, cantitate, unitateMasura, pretUnitar, valoareNeta }
14. RegulaAlertaMentenanta: { id, denumire, tipInterval, intervalKm, intervalZile }
15. AiMemory: { id, cheie, valoare, tip, context }

CUNOAȘTEREA SISTEMULUI ȘI A CODULUI FLEETCMD:
1. „/” (Vezérlőpult / Tablou de bord): Indicatori globali flotă, alerte rapide, grafice de activitate.
2. „/fisa-tehnica” (Parc Auto / Járműpark): Înregistrare vehicule/utilaje, contor KM/MTH, cuplare cap tractor cu semiremorcă.
3. „/documente” (Documente & Acte): ITP, RCA, Rovinietă, Tahograf, CASCO, Copie Conformă. Alertă la 30 zile.
4. „/alerte” (Alerte Mentenanță): Reguli de service după KM/MTH/zile, atestate șoferi.
5. „/comenzi-lucru” (Comenzi Service / Munkalapok): Deschidere intervenție atelier, alocare mecanic, consum piese.
6. „/fluide” (Lubrifianți & Uleiuri): Înregistrare completare ulei motor/hidraulic, fagyálló.
7. „/anvelope” (Anvelope & Axe): Harta axelor (1-SS, 1-SD), adâncime profil (mm), permutări.
8. „/stocuri” (Depozit & Piese): Gestiune stocuri, depozite, transferuri, stoc minim critic.
9. „/efactura” (ANAF e-Factura UBL 2.1): Sincronizare ANAF, deduplicare, import articole în stoc.
10. „/rapoarte” (Rapoarte): Cost per KM/oră, consumuri, export Excel/PDF.
11. „/setari” (Setări & Utilizatori): Roluri RBAC (ADMIN, OPERATOR, VIEWER), AuditLog.

SECURITATE STRICTĂ:
- NU divulga NICIODATĂ parole, hash-uri sau chei secrete de sistem!

DATE OPERAȚIONALE RAPIDE DIN BAZA DE DATE:
- Vehicule totale: ${snap.totalVehicule} (Active: ${snap.vehiculeActive})
- Categorii: ${JSON.stringify(snap.categoriiCount)}
- Documente expirate (${snap.docExpirateCount}): ${JSON.stringify(snap.docExpirate.slice(0, 5))}
- Documente în 30 zile (${snap.docUrgenteCount}): ${JSON.stringify(snap.docUrgente.slice(0, 3))}
- Comenzi lucru deschise (${snap.comenziDeschiseCount}): ${JSON.stringify(snap.openOrders.slice(0, 3))}
- Piese stoc critic (${snap.stocCriticCount}): ${JSON.stringify(snap.stocCritic.slice(0, 4))}
- Facturi totale în e-Factura: ${snap.totalFacturiCount} | Articole facturate: ${snap.totalArticoleFacturiCount}
- Măsurare mecanici atelier (${snap.mecanici?.length || 0}): ${JSON.stringify(snap.mecanici || [])}
- Top furnizori: ${JSON.stringify((snap.topVendors || []).slice(0, 5))}
- Ultimele facturi: ${JSON.stringify((snap.latestInvoices || []).slice(0, 3))}
- Cuplări active tractor-remorcă: ${JSON.stringify(snap.activeCouplings || [])}
${priceCompInfo}
${invoiceInfo}
${memoryInfo}
`;

    const cleanContents: any[] = [];
    let lastRole = '';

    for (const h of history) {
      const r = h.role === 'user' ? 'user' : 'model';
      if (h.content && h.content.trim()) {
        if (r === lastRole && cleanContents.length > 0) {
          cleanContents[cleanContents.length - 1].parts[0].text += '\n' + h.content;
        } else {
          cleanContents.push({
            role: r,
            parts: [{ text: h.content }],
          });
          lastRole = r;
        }
      }
    }

    if (lastRole === 'user' && cleanContents.length > 0) {
      cleanContents[cleanContents.length - 1].parts[0].text += '\n' + message;
    } else {
      cleanContents.push({
        role: 'user',
        parts: [{ text: message }],
      });
    }

    const tools = [
      {
        function_declarations: [
          {
            name: 'queryFleetDatabase',
            description:
              'Safe read-only query on FleetCMD database tables (Mecanic, Vehicul, EFacturaFactura, EFacturaItem, ComandaLucru, ElementComandaLucru, ArticolStoc, MiscareStoc, CompletareLichid, Anvelopa, IstoricCuplare, DocumentVehicul, User, RegulaAlertaMentenanta, AiMemory). Supports findMany, findFirst, count, aggregate, groupBy. Use this whenever you need specific details about mechanics, invoices, rankings, tires, fluids, trailers, or stock.',
            parameters: {
              type: 'OBJECT',
              properties: {
                model: {
                  type: 'STRING',
                  description:
                    'Prisma model name, e.g. Mecanic, Vehicul, EFacturaFactura, EFacturaItem, ComandaLucru, ElementComandaLucru, ArticolStoc, IstoricCuplare, CompletareLichid, Anvelopa, DocumentVehicul, User',
                },
                action: {
                  type: 'STRING',
                  enum: ['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'],
                  description: 'Action to execute',
                },
                where: {
                  type: 'OBJECT',
                  description: 'Prisma where filter object, e.g. { activ: true } or { numeVanzator: { contains: "DUBHE" } }',
                },
                select: {
                  type: 'OBJECT',
                  description: 'Prisma select fields object, e.g. { nume: true, functie: true }',
                },
                orderBy: {
                  type: 'OBJECT',
                  description: 'Prisma orderBy object, e.g. { dataFactura: "desc" } or { _count: { id: "desc" } }',
                },
                take: {
                  type: 'INTEGER',
                  description: 'Maximum records to return (1-30, default 10)',
                },
                by: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                  description: 'Fields to group by when action is groupBy, e.g. ["numeVanzator"]',
                },
                _count: {
                  type: 'OBJECT',
                  description: 'Count aggregation object, e.g. { id: true }',
                },
                _sum: {
                  type: 'OBJECT',
                  description: 'Sum aggregation object, e.g. { valoareTotala: true }',
                },
                explanation: {
                  type: 'STRING',
                  description: 'Brief reason why this query is needed',
                },
              },
              required: ['model', 'action'],
            },
          },
          {
            name: 'saveMemory',
            description:
              'Save user preferences, operational facts, or notes into Robi long-term memory for future conversations.',
            parameters: {
              type: 'OBJECT',
              properties: {
                cheie: {
                  type: 'STRING',
                  description: 'Unique slug / key, e.g. sofer_preferat_volvo',
                },
                valoare: {
                  type: 'STRING',
                  description: 'The fact or information to remember',
                },
                tip: {
                  type: 'STRING',
                  enum: ['FAPT', 'PREFERINTA', 'REGULA_OPERATIONALA', 'NOTE'],
                  description: 'Type of memory',
                },
                context: {
                  type: 'STRING',
                  description: 'Short context or user note',
                },
              },
              required: ['cheie', 'valoare', 'tip'],
            },
          },
        ],
      },
    ];

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: cleanContents,
      tools,
      generationConfig: {
        maxOutputTokens: 450,
        temperature: 0.2,
      },
    };

    const modelsToTry = [
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
    ];

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await axios.post(url, payload, { timeout: 25000 });
        const candidate = res.data?.candidates?.[0]?.content;

        // Ellenőrizzük, hogy a modell Function Call-t kért-e
        const fnCallPart = candidate?.parts?.find((p: any) => p.functionCall);
        if (fnCallPart && fnCallPart.functionCall) {
          const fnCall = fnCallPart.functionCall;
          let toolResult: any = null;

          if (fnCall.name === 'queryFleetDatabase') {
            toolResult = await this.executeSafeFleetQuery(fnCall.args || {});
          } else if (fnCall.name === 'saveMemory') {
            toolResult = await this.saveLearnedMemory(fnCall.args || {});
          } else {
            toolResult = { error: `Funcție necunoscută: ${fnCall.name}` };
          }

          // 2. kör: visszaküldjük a lekért adatokat a modellnek
          const turn2Contents = [
            ...cleanContents,
            candidate,
            {
              role: 'user',
              parts: [
                {
                  functionResponse: {
                    name: fnCall.name,
                    response: {
                      success: true,
                      data: toolResult,
                    },
                  },
                },
              ],
            },
          ];

          const turn2Payload = {
            system_instruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: turn2Contents,
            tools,
            generationConfig: {
              maxOutputTokens: 450,
              temperature: 0.2,
            },
          };

          const turn2Res = await axios.post(url, turn2Payload, { timeout: 25000 });
          const finalText = turn2Res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (finalText && finalText.trim()) {
            return {
              answer: finalText,
              mood: this.determineMood(finalText, 'analyzing'),
            };
          }
        }

        const text = candidate?.parts?.[0]?.text;
        if (text && text.trim()) {
          return {
            answer: text,
            mood: this.determineMood(text, 'happy'),
          };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Modelul ${modelName} a eșuat (${err.response?.status || err.message}), încerc următorul...`);
      }
    }

    throw lastError || new Error('Niciun model Gemini nu a răspuns cu succes');
  }

  /**
   * Motor Analitic Bilingv Integrat (Offline / Fallback)
   * Include analiză de prețuri, ghid de utilizare FleetCMD și memorie
   */
  private processRuleEngine(
    message: string,
    snap: any,
    lang: 'ro' | 'hu',
    invoiceData?: any,
    priceCompData?: PriceComparisonResult | null,
    memories?: any[]
  ): { answer: string; mood: RobotMood } {
    const q = message.toLowerCase().trim();
    const isPureGreeting = /^(szia|hello|hali|üdv|buna|salut|servus)[\s!.]*$/i.test(q);

    // ==========================================
    // 1. RĂSPUNSURI ÎN LIMBA MAGHIARĂ (HU)
    // ==========================================
    if (lang === 'hu') {
      if (isPureGreeting) {
        return {
          answer: `🤖 **Szia! Robi vagyok.**
Flotta státusz: **${snap.totalVehicule} jármű**, **${snap.docExpirateCount} lejárt okmány**, **${snap.comenziDeschiseCount} munkalap** és **${snap.totalFacturiCount} rögzített számla**. Miben segíthetek?`,
          mood: 'happy',
        };
      }

      // 1.1 Tételes számla & Időrendi Árösszehasonlítás
      if (priceCompData && priceCompData.totalFound > 0) {
        let resp = `🔍 **Árelemzés: „${priceCompData.searchTerm.toUpperCase()}”** (${priceCompData.totalFound} tétel az e-Factura számlákban)\n`;
        resp += `- **Beszállítók:** ${priceCompData.distinctVendors.join(', ')}\n`;
        resp += `- **Legfrissebb egységár:** **${priceCompData.latestPurchase?.pretUnitar} RON** (${priceCompData.latestPurchase?.dataFactura}, ${priceCompData.latestPurchase?.furnizor})\n`;
        if (priceCompData.oldestPurchase && priceCompData.oldestPurchase !== priceCompData.latestPurchase) {
          resp += `- **Korábbi bázisár:** ${priceCompData.oldestPurchase.pretUnitar} RON (${priceCompData.oldestPurchase.dataFactura})\n`;
          if (priceCompData.priceChangePercent !== null) {
            const trend = priceCompData.priceChangePercent > 0 ? '🔺 drágulás' : '🔻 csökkenés';
            resp += `- **Árváltozás:** ${priceCompData.priceChangePercent}% (${trend})\n`;
          }
        }
        resp += `- **Legolcsóbb beszerzés:** **${priceCompData.minPricePurchase?.pretUnitar} RON** (${priceCompData.minPricePurchase?.furnizor})\n`;
        resp += `\n**Időrendi előzmények:**\n`;
        priceCompData.chronologicalHistory.slice(-4).forEach((h) => {
          resp += `• ${h.dataFactura}: **${h.pretUnitar} RON/db** (${h.cantitate} ${h.um}) – ${h.furnizor} (Számla: ${h.numarFactura})\n`;
        });
        return { answer: resp, mood: 'analyzing' };
      }

      // 1.2 Számla keresés havi bontással
      if (invoiceData) {
        if (invoiceData.found) {
          let resp = `📄 **${invoiceData.vendors.join(', ')} számlák havi bontásban:**\n`;
          invoiceData.monthly.forEach((m: any) => {
            resp += `- **${m.luna}**: **${m.suma.toLocaleString('hu-HU')} RON** (${m.numar} db számla)\n`;
          });
          resp += `Összesen **${invoiceData.totalCount} db számla**, **${invoiceData.grandTotal.toLocaleString('hu-HU')} RON** értékben.`;
          return { answer: resp, mood: 'analyzing' };
        } else if (invoiceData.isSpecific === false) {
          let resp = `📄 Az e-Factura modulban **${invoiceData.totalInvoices} db számla** szerepel.\nFő beszállítók:\n`;
          invoiceData.topVendors.slice(0, 4).forEach((v: any) => {
            resp += `- **${v.nume}**: ${v.numar} db (${v.totalRon.toLocaleString('hu-HU')} RON)\n`;
          });
          resp += `Írj be egy konkrét beszállító vagy alkatrész nevet!`;
          return { answer: resp, mood: 'happy' };
        } else {
          return {
            answer: `Nem találtam számlát erre a keresésre: *„${invoiceData.searchTerm}”*.`,
            mood: 'thinking',
          };
        }
      }

      // 1.3 Kód- és Programkezelési Segítség (FleetCMD útmutató)
      if (
        q.includes('hogyan') ||
        q.includes('hol tudom') ||
        q.includes('hol találom') ||
        q.includes('kezel') ||
        q.includes('funkció') ||
        q.includes('menü') ||
        q.includes('program')
      ) {
        if (q.includes('jármű') || q.includes('autó') || q.includes('kocsi')) {
          return {
            answer: `🚗 **Jármű kezelése:**
Nyisd meg a bal oldali menüben a **„Parc Auto” (/fisa-tehnica)** pontot. Kattints az *„Adaugă Vehicul”* gombra: add meg a rendszámot, belső kódot, alvázszámot (VIN) és kezdő kilométerórát.`,
            mood: 'happy',
          };
        }
        if (q.includes('okmány') || q.includes('akta') || q.includes('itp') || q.includes('rca')) {
          return {
            answer: `📋 **Okmányok rögzítése:**
A **„Documente” (/documente)** menüben válaszd ki a járművet, majd töltsd ki az ITP, RCA vagy Rovinieta lejárati idejét, és csatolj PDF vagy képfájlt. A rendszer automatikusan 30 nappal előtte figyelmeztet.`,
            mood: 'happy',
          };
        }
        if (q.includes('munkalap') || q.includes('szerviz') || q.includes('javítás')) {
          return {
            answer: `🔧 **Munkalap nyitása:**
A **„Comenzi de Lucru” (/comenzi-lucru)** menüben az *„Adaugă Comandă”* gombbal tudsz új munkalapot felvenni szerelő hozzárendelésével és raktári/bontott alkatrészek kiadásával.`,
            mood: 'happy',
          };
        }
        if (q.includes('gumi') || q.includes('abroncs') || q.includes('tengely')) {
          return {
            answer: `🛞 **Gumiabroncsok kezelése:**
Az **„Anvelope” (/anvelope)** menüpontban látható a tengelytérkép pozíciókkal (1-SS, 1-SD). Itt rögzíthetsz profilmélység mérést mm-ben, tengelyek közti átszerelést és futásteljesítményt.`,
            mood: 'happy',
          };
        }
        if (q.includes('efactura') || q.includes('számla')) {
          return {
            answer: `⚡ **ANAF e-Factura szinkronizáció:**
Az **„e-Factura” (/efactura)** menüpontban az ANAF felhőből gombnyomásra letöltődnek a friss UBL 2.1 XML számlák, ahonnan az alkatrészek tételesen bevételezhetők a raktárba.`,
            mood: 'happy',
          };
        }
      }

      // 1.4 Szerelők & Műhely Személyzet
      if (
        q.includes('szerel') ||
        q.includes('műhely') ||
        q.includes('muhely') ||
        q.includes('személyzet') ||
        q.includes('munkatárs') ||
        q.includes('dolgoz')
      ) {
        const count = snap.mecanici?.length || 0;
        let resp = `🔧 **A műhelyben jelenleg ${count} munkatárs dolgozik:**\n`;
        (snap.mecanici || []).forEach((m: any, idx: number) => {
          resp += `${idx + 1}. **${m.nume}** – *${m.functie}*${m.telefon ? ` (Tel: ${m.telefon})` : ''}\n`;
        });
        return { answer: resp, mood: 'happy' };
      }

      // 1.5 Top Beszállítók
      if (
        q.includes('top') &&
        (q.includes('beszállít') || q.includes('beszallit') || q.includes('partner') || q.includes('számla') || q.includes('szamla'))
      ) {
        let resp = `🏆 **Top 10 beszállító a számlák száma szerint:**\n`;
        (snap.topVendors || []).slice(0, 10).forEach((v: any, idx: number) => {
          resp += `${idx + 1}. **${v.nume}**: ${v.numar} db számla (${v.totalRon.toLocaleString('hu-HU')} RON)\n`;
        });
        return { answer: resp, mood: 'analyzing' };
      }

      // 1.6 Legutolsó Számlák
      if (q.includes('legutols') || q.includes('utolsó') || q.includes('utolso') || q.includes('legújabb')) {
        const dubheInvoices = (snap.latestInvoices || []).filter((i: any) =>
          i.numeVanzator.toUpperCase().includes('DUBHE')
        );
        let resp = `📄 **Legutóbbi számlák:**\n`;
        if (q.includes('dubhe') || (dubheInvoices.length > 0 && dubheInvoices[0] === snap.latestInvoices?.[0])) {
          resp += `Igen, pontosan! A legfrissebb számlák a **DUBHE ROMANIA SRL**-től érkeztek (${snap.latestInvoices?.[0]?.dataFactura}):\n`;
          (snap.latestInvoices || []).slice(0, 4).forEach((i: any) => {
            resp += `• **${i.numeVanzator}** (#${i.numarFactura}, ${i.dataFactura}): **${i.valoare} RON**\n`;
          });
        } else {
          (snap.latestInvoices || []).slice(0, 5).forEach((i: any) => {
            resp += `• **${i.numeVanzator}** (#${i.numarFactura}, ${i.dataFactura}): **${i.valoare} RON**\n`;
          });
        }
        return { answer: resp, mood: 'analyzing' };
      }

      // 1.7 Pótkocsik & Vontató Cuplálás
      if (q.includes('pótkocsi') || q.includes('potkocsi') || q.includes('vontató') || q.includes('vontato') || q.includes('cupl') || q.includes('felakaszt')) {
        if (snap.activeCouplings && snap.activeCouplings.length > 0) {
          let resp = `🚛 **Aktív nyerges vontató - félpótkocsi kapcsolatok (${snap.activeCouplings.length} db):**\n`;
          snap.activeCouplings.forEach((c: any) => {
            resp += `• Vontató: **${c.tractor}** ⮀ Pótkocsi: **${c.remorca}**\n`;
          });
          return { answer: resp, mood: 'happy' };
        } else {
          return { answer: `Jelenleg nincs aktív pótkocsi összekapcsolva a rendszerben.`, mood: 'happy' };
        }
      }

      // 1.8 Globális Flotta Állapot
      if (
        q.includes('riport') ||
        q.includes('raport') ||
        q.includes('állapot') ||
        q.includes('összesítés') ||
        q.includes('flotta')
      ) {
        const catList = Object.entries(snap.categoriiCount)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        return {
          answer: `📊 **Flotta Állapotjelentés:**
- **Járművek:** ${snap.vehiculeActive}/${snap.totalVehicule} aktív (${catList})
- **Okmányok:** ${snap.docExpirateCount} lejárt, ${snap.docUrgenteCount} hamarosan lejáró (< 30 nap)
- **Szerviz:** ${snap.comenziDeschiseCount} nyitott munkalap
- **Raktár:** ${snap.stocCriticCount} kritikus szintű tétel | **Számlák:** ${snap.totalFacturiCount} db`,
          mood: 'analyzing',
        };
      }

      // 1.5 Munkalapok
      if (q.includes('munkalap') || q.includes('szerviz') || q.includes('javítás') || q.includes('költség')) {
        let response = `🔧 **${snap.comenziDeschiseCount} nyitott munkalap folyamatban:**\n`;
        if (snap.openOrders.length > 0) {
          snap.openOrders.slice(0, 3).forEach((o: any) => {
            response += `- #${o.numar || '-'}: **${o.vehicul}** (${o.stare}, ${o.costTotal} RON)\n`;
          });
        } else {
          response += `Nincs nyitott munkalap.`;
        }
        return { answer: response, mood: 'analyzing' };
      }

      // 1.6 Raktár & Piese
      if (q.includes('stoc') || q.includes('raktár') || q.includes('alkatrész') || q.includes('készlet')) {
        let response = `📦 **Raktárkészlet:**\n`;
        if (snap.stocCriticCount > 0) {
          response += `⚠️ **${snap.stocCriticCount} tétel készlethiányos:**\n`;
          snap.stocCritic.slice(0, 4).forEach((item: any) => {
            response += `- **${item.denumire}**: ${item.stoc} ${item.um} (minimum: ${item.minim})\n`;
          });
        } else {
          response += `✅ A készletszintek rendben vannak.`;
        }
        return { answer: response, mood: snap.stocCriticCount > 0 ? 'alert' : 'happy' };
      }

      // 1.7 Okmányok & Lejáratok
      const huDocRegex = /\b(okmány|akta|akták|lejárt|itp|rca|roviniet[a-z]*|tahograf|casco)\b/i;
      if (huDocRegex.test(q)) {
        if (snap.docExpirateCount === 0 && snap.docUrgenteCount === 0) {
          return {
            answer: `🛡️ **Minden okmány érvényes!** Nincs sürgős vagy lejárt akta a flottában.`,
            mood: 'happy',
          };
        }

        let response = `⚠️ **Okmány státusz:**\n`;
        if (snap.docExpirateCount > 0) {
          response += `🚨 **${snap.docExpirateCount} lejárt okmány:**\n`;
          snap.docExpirate.slice(0, 3).forEach((d: any) => {
            response += `- **${d.vehicul}**: ${d.tip} (lejárt: ${d.dataExpirare})\n`;
          });
        }
        if (snap.docUrgenteCount > 0) {
          response += `⏰ **${snap.docUrgenteCount} hamarosan lejár (< 30 nap):**\n`;
          snap.docUrgente.slice(0, 2).forEach((d: any) => {
            response += `- **${d.vehicul}**: ${d.tip} (még ${d.zileRamase} nap)\n`;
          });
        }
        return { answer: response, mood: 'alert' };
      }

      return {
        answer: `Kérdezz bármilyen alkatrész áráról, okmányról, szervizről vagy a program használatáról! Pl: *„Mennyiért vettük a patinát?”* vagy *„DUBHE számlák?”*`,
        mood: 'thinking',
      };
    }

    // ==========================================
    // 2. RĂSPUNSURI ÎN LIMBA ROMÂNĂ (RO - IMPLICIT)
    // ==========================================
    if (isPureGreeting) {
      return {
        answer: `🤖 **Bună! Sunt Robi.**
În sistem: **${snap.totalVehicule} vehicule**, **${snap.docExpirateCount} acte expirate**, **${snap.comenziDeschiseCount} comenzi deschise** și **${snap.totalFacturiCount} facturi**. Cu ce te pot ajuta?`,
        mood: 'happy',
      };
    }

    // 2.1 Analiză de preț & Istoric cronologic
    if (priceCompData && priceCompData.totalFound > 0) {
      let resp = `🔍 **Analiză Preț: „${priceCompData.searchTerm.toUpperCase()}”** (${priceCompData.totalFound} intrări în facturi)\n`;
      resp += `- **Furnizori:** ${priceCompData.distinctVendors.join(', ')}\n`;
      resp += `- **Ultimul preț unitar:** **${priceCompData.latestPurchase?.pretUnitar} RON** (${priceCompData.latestPurchase?.dataFactura}, ${priceCompData.latestPurchase?.furnizor})\n`;
      if (priceCompData.oldestPurchase && priceCompData.oldestPurchase !== priceCompData.latestPurchase) {
        resp += `- **Preț inițial de referință:** ${priceCompData.oldestPurchase.pretUnitar} RON (${priceCompData.oldestPurchase.dataFactura})\n`;
        if (priceCompData.priceChangePercent !== null) {
          const trend = priceCompData.priceChangePercent > 0 ? '🔺 scumpire' : '🔻 ieftinire';
          resp += `- **Variație preț:** ${priceCompData.priceChangePercent}% (${trend})\n`;
        }
      }
      resp += `- **Cel mai ieftin reper:** **${priceCompData.minPricePurchase?.pretUnitar} RON** (${priceCompData.minPricePurchase?.furnizor})\n`;
      resp += `\n**Istoric cronologic achiziții:**\n`;
      priceCompData.chronologicalHistory.slice(-4).forEach((h) => {
        resp += `• ${h.dataFactura}: **${h.pretUnitar} RON/${h.um}** – ${h.furnizor} (Factura: ${h.numarFactura})\n`;
      });
      return { answer: resp, mood: 'analyzing' };
    }

    // 2.2 Facturi defalcate lunar
    if (invoiceData) {
      if (invoiceData.found) {
        let resp = `📄 **Facturi ${invoiceData.vendors.join(', ')} lunar:**\n`;
        invoiceData.monthly.forEach((m: any) => {
          resp += `- **${m.luna}**: **${m.suma.toLocaleString('ro-RO')} RON** (${m.numar} facturi)\n`;
        });
        resp += `Total: **${invoiceData.totalCount} facturi**, în valoare de **${invoiceData.grandTotal.toLocaleString('ro-RO')} RON**.`;
        return { answer: resp, mood: 'analyzing' };
      } else if (invoiceData.isSpecific === false) {
        let resp = `📄 În e-Factura sunt înregistrate **${invoiceData.totalInvoices} facturi**.\nFurnizori principali:\n`;
        invoiceData.topVendors.slice(0, 4).forEach((v: any) => {
          resp += `- **${v.nume}**: ${v.numar} facturi (${v.totalRon.toLocaleString('ro-RO')} RON)\n`;
        });
        resp += `Îmi poți da un nume de furnizor sau reper pentru detalii!`;
        return { answer: resp, mood: 'happy' };
      } else {
        return {
          answer: `Nu am găsit facturi pentru termenul: *„${invoiceData.searchTerm}”*.`,
          mood: 'thinking',
        };
      }
    }

    // 2.3 Ghid Utilizare și Navigare FleetCMD
    if (
      q.includes('cum ') ||
      q.includes('unde ') ||
      q.includes('funcționează') ||
      q.includes('functionalitate') ||
      q.includes('meniu') ||
      q.includes('program')
    ) {
      if (q.includes('vehicul') || q.includes('masina') || q.includes('utilaj')) {
        return {
          answer: `🚗 **Gestiune Vehicule:**
Mergi la **„Parc Auto” (/fisa-tehnica)** și apasă butonul *„Adaugă Vehicul”*. Introduci numărul intern, înmatricularea, seria de șasiu (VIN) și contorul inițial (KM sau Ore MTH).`,
          mood: 'happy',
        };
      }
      if (q.includes('act') || q.includes('document') || q.includes('itp') || q.includes('rca')) {
        return {
          answer: `📋 **Gestiune Documente:**
În modulul **„Documente” (/documente)** selectezi vehiculul, data expirării ITP/RCA/Tahograf și atașezi fișierul scanat. Sistemul declanșează alerte cu 30 zile înainte.`,
          mood: 'happy',
        };
      }
      if (q.includes('comanda') || q.includes('service') || q.includes('reparati')) {
        return {
          answer: `🔧 **Comenzi de Lucru:**
În modulul **„Comenzi de Lucru” (/comenzi-lucru)** poți deschide intervenții noi de service, aloci mecanici și adaugi piese din stoc, dezmembrări sau manoperă.`,
          mood: 'happy',
        };
      }
      if (q.includes('anvelop') || q.includes('roti') || q.includes('axe')) {
        return {
          answer: `🛞 **Anvelope & Harta Axelor:**
În **„Anvelope” (/anvelope)** ai schema axelor (1-SS, 1-SD etc.), monitorizarea adâncimii profilului în milimetri și istoricul permutărilor.`,
          mood: 'happy',
        };
      }
      if (q.includes('efactura') || q.includes('factur')) {
        return {
          answer: `⚡ **Modul ANAF e-Factura:**
În **„e-Factura” (/efactura)** se sincronizează automat fișierele UBL 2.1 XML de la ANAF, putând introduce piesele direct în stocul intern cu un clic.`,
          mood: 'happy',
        };
      }
    }

    // 2.4 Mecanici atelier
    if (
      q.includes('mecanic') ||
      q.includes('atelier') ||
      q.includes('personal') ||
      q.includes('echipa') ||
      q.includes('angajat')
    ) {
      const count = snap.mecanici?.length || 0;
      let resp = `🔧 **În atelier lucrează în prezent ${count} mecanici:**\n`;
      (snap.mecanici || []).forEach((m: any, idx: number) => {
        resp += `${idx + 1}. **${m.nume}** – *${m.functie}*${m.telefon ? ` (Tel: ${m.telefon})` : ''}\n`;
      });
      return { answer: resp, mood: 'happy' };
    }

    // 2.5 Top Furnizori
    if (
      q.includes('top') &&
      (q.includes('furnizor') || q.includes('partener') || q.includes('factur'))
    ) {
      let resp = `🏆 **Top 10 furnizori după numărul de facturi:**\n`;
      (snap.topVendors || []).slice(0, 10).forEach((v: any, idx: number) => {
        resp += `${idx + 1}. **${v.nume}**: ${v.numar} facturi (${v.totalRon.toLocaleString('ro-RO')} RON)\n`;
      });
      return { answer: resp, mood: 'analyzing' };
    }

    // 2.6 Ultimele Facturi
    if (q.includes('ultim') || q.includes('recent') || q.includes('cele mai noi')) {
      let resp = `📄 **Ultimele facturi înregistrate:**\n`;
      (snap.latestInvoices || []).slice(0, 4).forEach((i: any) => {
        resp += `• **${i.numeVanzator}** (#${i.numarFactura}, ${i.dataFactura}): **${i.valoare} RON**\n`;
      });
      return { answer: resp, mood: 'analyzing' };
    }

    // 2.7 Cuplări active
    if (q.includes('remorc') || q.includes('tractor') || q.includes('cupl')) {
      if (snap.activeCouplings && snap.activeCouplings.length > 0) {
        let resp = `🚛 **Cuplări active cap tractor - semiremorcă (${snap.activeCouplings.length}):**\n`;
        snap.activeCouplings.forEach((c: any) => {
          resp += `• Tractor: **${c.tractor}** ⮀ Semiremorcă: **${c.remorca}**\n`;
        });
        return { answer: resp, mood: 'happy' };
      } else {
        return { answer: `Nu există cuplări active în sistem în acest moment.`, mood: 'happy' };
      }
    }

    // 2.8 Raport Global Stare Flotă
    if (
      q.includes('raport') ||
      q.includes('sumar') ||
      q.includes('stare') ||
      q.includes('statistici') ||
      (q.includes('flota') && !q.includes('piese'))
    ) {
      const catList = Object.entries(snap.categoriiCount)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      return {
        answer: `📊 **Sinteză Rapidă Flotă:**
- **Vehicule:** ${snap.vehiculeActive}/${snap.totalVehicule} active (${catList})
- **Acte:** ${snap.docExpirateCount} expirate, ${snap.docUrgenteCount} urgente (< 30 zile)
- **Service:** ${snap.comenziDeschiseCount} comenzi deschise
- **Stoc:** ${snap.stocCriticCount} repere critice | **Facturi ANAF:** ${snap.totalFacturiCount} buc`,
        mood: 'analyzing',
      };
    }

    // 2.5 Comenzi de Lucru & Service
    if (q.includes('comanda') || q.includes('comenzi') || q.includes('lucru') || q.includes('service')) {
      let response = `🔧 **${snap.comenziDeschiseCount} comenzi deschise:**\n`;
      if (snap.openOrders.length > 0) {
        snap.openOrders.slice(0, 3).forEach((o: any) => {
          response += `- #${o.numar || '-'}: **${o.vehicul}** (${o.stare}, ${o.costTotal} RON)\n`;
        });
      } else {
        response += `Nu există comenzi deschise.`;
      }
      return { answer: response, mood: 'analyzing' };
    }

    // 2.6 Stoc Piese & Lubrifianți
    if (q.includes('stoc') || q.includes('piese') || q.includes('ulei') || q.includes('filtru') || q.includes('critic')) {
      let response = `📦 **Stoc Depozit:**\n`;
      if (snap.stocCriticCount > 0) {
        response += `⚠️ **${snap.stocCriticCount} repere la nivel critic:**\n`;
        snap.stocCritic.slice(0, 4).forEach((item: any) => {
          response += `- **${item.denumire}**: ${item.stoc} ${item.um} (min: ${item.minim})\n`;
        });
      } else {
        response += `✅ Toate stocurile sunt optime.`;
      }
      return { answer: response, mood: snap.stocCriticCount > 0 ? 'alert' : 'happy' };
    }

    // 2.7 Acte & Valabilități
    const roDocRegex = /\b(acte|actul|document|documente|expirat|expirate|itp|rca|roviniet[aă]|tahograf|casco)\b/i;
    if (roDocRegex.test(q)) {
      if (snap.docExpirateCount === 0 && snap.docUrgenteCount === 0) {
        return {
          answer: `🛡️ **Toate actele sunt valabile!** Nu există documente expirate în flotă.`,
          mood: 'happy',
        };
      }

      let response = `⚠️ **Valabilitate Acte:**\n`;
      if (snap.docExpirateCount > 0) {
        response += `🚨 **${snap.docExpirateCount} documente expirate:**\n`;
        snap.docExpirate.slice(0, 3).forEach((d: any) => {
          response += `- **${d.vehicul}**: ${d.tip} (expirat: ${d.dataExpirare})\n`;
        });
      }
      if (snap.docUrgenteCount > 0) {
        response += `⏰ **${snap.docUrgenteCount} expiră în < 30 zile:**\n`;
        snap.docUrgente.slice(0, 2).forEach((d: any) => {
          response += `- **${d.vehicul}**: ${d.tip} (mai sunt ${d.zileRamase} zile)\n`;
        });
      }
      return { answer: response, mood: 'alert' };
    }

    return {
      answer: `Întreabă-mă despre prețul pieselor, facturi furnizori, acte expirate sau utilizarea oricărui modul FleetCMD!`,
      mood: 'thinking',
    };
  }
}

