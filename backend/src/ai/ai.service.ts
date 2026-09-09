import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type RobotMood = 'idle' | 'bored' | 'thinking' | 'analyzing' | 'happy' | 'alert' | 'speaking';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valós idejű flotta adatbázis pillanatkép készítése (Context Injection)
   */
  async getFleetSnapshot() {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

    const [
      vehicule,
      documente,
      comenziLucru,
      articoleStoc,
      completariUlei,
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

    return {
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
  }

  /**
   * Gyors KPI összefoglaló a robot fejléchez
   */
  async getQuickKpi() {
    const snap = await this.getFleetSnapshot();
    return {
      totalVehicule: snap.totalVehicule,
      vehiculeActive: snap.vehiculeActive,
      expirateDocs: snap.docExpirateCount,
      urgenteDocs: snap.docUrgenteCount,
      comenziDeschise: snap.comenziDeschiseCount,
      stocCritic: snap.stocCriticCount,
    };
  }

  /**
   * Fő Chat és Elemző Végpont
   */
  async chat(userMessage: string, history: ChatMessage[] = []) {
    const snapshot = await this.getFleetSnapshot();
    const apiKey = process.env.GEMINI_API_KEY;

    let mood: RobotMood = 'happy';
    if (snapshot.docExpirateCount > 0 || snapshot.stocCriticCount > 0) {
      mood = 'alert';
    }

    // Ha van érvényes Gemini API kulcs, hívjuk meg a modellt valós kontextussal
    if (apiKey && apiKey.trim() !== '') {
      try {
        const geminiResponse = await this.callGeminiApi(apiKey, userMessage, history, snapshot);
        return {
          answer: geminiResponse.answer,
          mood: geminiResponse.mood || mood,
          source: 'gemini',
          fleetKpi: {
            totalVehicule: snapshot.totalVehicule,
            expirate: snapshot.docExpirateCount,
            urgente: snapshot.docUrgenteCount,
            comenzi: snapshot.comenziDeschiseCount,
          },
        };
      } catch (err: any) {
        console.warn('Gemini API hiba, átváltás a beépített analitikai motorra:', err.message);
      }
    }

    // Beépített Offline Analitikai Szabálymotor (Zero API key needed)
    const ruleResponse = this.processRuleEngine(userMessage, snapshot);
    return {
      answer: ruleResponse.answer,
      mood: ruleResponse.mood,
      source: 'builtin-engine',
      fleetKpi: {
        totalVehicule: snapshot.totalVehicule,
        expirate: snapshot.docExpirateCount,
        urgente: snapshot.docUrgenteCount,
        comenzi: snapshot.comenziDeschiseCount,
      },
    };
  }

  /**
   * Hívás a Google Gemini API-hoz
   */
  private async callGeminiApi(
    apiKey: string,
    message: string,
    history: ChatMessage[],
    snap: any
  ): Promise<{ answer: string; mood: RobotMood }> {
    const systemPrompt = `
Te Robi vagy, a FleetCMD intelligens AI Robot Asszisztense, egy futurisztikus, barátságos, közvetlen, precíz és profi mérnök-robot.
A célod, hogy a flotta adatait elemezd és tökéletesen értsd. Válaszolj magyarul, közvetlen, segítőkész és mérnöki pontosságú stílusban! Robi néven mutatkozz be, ha kérdezik a neved!
Használj szép Markdown formázást, kiemeléseket (**félkövér**), pontokba szedett listákat és szükség esetén táblázatokat.

Íme a flotta VALÓS, ÉLŐ ADATBÁZIS PILLANATKÉPE a kérdés pillanatában:
- Összes jármű: ${snap.totalVehicule} db (ebből aktív: ${snap.vehiculeActive} db)
- Járműkategóriák: ${JSON.stringify(snap.categoriiCount)}
- Lejárt dokumentumok (${snap.docExpirateCount} db): ${JSON.stringify(snap.docExpirate)}
- 30 napon belül lejáró akták (${snap.docUrgenteCount} db): ${JSON.stringify(snap.docUrgente)}
- Nyitott munkalapok (${snap.comenziDeschiseCount} db): ${JSON.stringify(snap.openOrders)}
- Kritikus készlethiány (${snap.stocCriticCount} tétel): ${JSON.stringify(snap.stocCritic)}
- Jármű minta (rendszám, típus, km): ${JSON.stringify(snap.vehiculeSample.slice(0, 15))}

A válaszod végén javasolj 1-2 releváns, gyors további kérdést vagy műveletet!
`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      ...history.map((h) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await axios.post(url, { contents }, { timeout: 12000 });

    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Üres válasz érkezett a Gemini API-tól');

    let mood: RobotMood = 'happy';
    const lower = text.toLowerCase();
    if (lower.includes('lejárt') || lower.includes('kritikus') || lower.includes('figyelem') || lower.includes('hiány')) {
      mood = 'alert';
    } else if (lower.includes('statisztika') || lower.includes('összesítés') || lower.includes('riport')) {
      mood = 'analyzing';
    }

    return { answer: text, mood };
  }

  /**
   * Intelligens Helyi Flotta Analitikai Motor (Ha nincs API kulcs)
   */
  private processRuleEngine(message: string, snap: any): { answer: string; mood: RobotMood } {
    const q = message.toLowerCase().trim();

    // 1. Általános köszönés vagy bemutatkozás / név
    if (q.includes('szia') || q.includes('hello') || q.includes('üdv') || q.includes('ki vagy') || q.includes('neved') || q.includes('hívnak') || q.includes('robi')) {
      return {
        answer: `### 🤖 Szia! Robi vagyok, a FleetCMD flottaasszisztens robotja!
Valós időben látom és elemzem a cég teljes adatbázisát:
- **${snap.totalVehicule} járművet és gépet** a flottában
- **${snap.docExpirateCount} lejárt** és **${snap.docUrgenteCount} sürgős** dokumentumot
- **${snap.comenziDeschiseCount} nyitott munkalapot** a szervizben
- **${snap.stocCriticCount} készlethiányos alkatrészt** a raktárban

Miben segíthetek ma? Kérhetsz állapotjelentést, lejárati listát vagy alkatrész-elemzést!`,
        mood: 'happy',
      };
    }

    // 2. Dokumentumok & Lejáratok (ITP, RCA, Rovinieta, Tahograf, Casco)
    if (q.includes('okmány') || q.includes('akta') || q.includes('dokument') || q.includes('lejárt') || q.includes('itp') || q.includes('rca') || q.includes('roviniet') || q.includes('tahograf')) {
      if (snap.docExpirateCount === 0 && snap.docUrgenteCount === 0) {
        return {
          answer: `### 🛡️ Dokumentum Státusz: Minden rendben!
Átnéztem az összes jármű okmányait:
- **0 db lejárt akta** található a flottában.
- **0 db sürgős lejáró okmány** a következő 30 napban.

Minden gép és teherautó rendelkezik érvényes ITP-vel, RCA-val és Rovinietával.`,
          mood: 'happy',
        };
      }

      let response = `### ⚠️ Dokumentum Lejárati Elemzés\n\n`;
      if (snap.docExpirateCount > 0) {
        response += `🚨 **Kritikus: ${snap.docExpirateCount} db dokumentum már lejárt!**\n\n`;
        response += `| Jármű / Rendszám | Típus | Lejárat Dátuma | Státusz |\n| :--- | :--- | :--- | :--- |\n`;
        snap.docExpirate.slice(0, 10).forEach((d: any) => {
          response += `| **${d.vehicul}** | ${d.tip} | ${d.dataExpirare} | <span style="color:#ef4444">Lejárt (${Math.abs(d.zileRamase)} napja)</span> |\n`;
        });
        if (snap.docExpirate.length > 10) {
          response += `\n*...és további ${snap.docExpirate.length - 10} db dokumentum.*\n`;
        }
      }

      if (snap.docUrgenteCount > 0) {
        response += `\n⏰ **Figyelem: ${snap.docUrgenteCount} db dokumentum hamarosan (< 30 nap) lejár:**\n\n`;
        snap.docUrgente.slice(0, 6).forEach((d: any) => {
          response += `- **${d.vehicul}**: ${d.tip} (Lejárat: ${d.dataExpirare}, még **${d.zileRamase} nap**)\n`;
        });
      }

      response += `\n💡 *Javaslat: Látogass el a bal oldali **Valabilitate Acte** menübe a megújítások rögzítéséhez!*`;
      return { answer: response, mood: 'alert' };
    }

    // 3. Munkalapok & Karbantartás
    if (q.includes('munkalap') || q.includes('szerviz') || q.includes('javítás') || q.includes('comand') || q.includes('karbantart')) {
      let response = `### 🔧 Karbantartási & Munkalap Elemzés\n\n`;
      response += `Jelenleg **${snap.comenziDeschiseCount} db nyitott munkalap** van folyamatban a szervizben.\n\n`;

      if (snap.openOrders.length > 0) {
        response += `| Munkalap | Jármű | Státusz | Költség | Nyitva tartás |\n| :--- | :--- | :--- | :--- | :--- |\n`;
        snap.openOrders.slice(0, 5).forEach((o: any) => {
          response += `| **#${o.numar || '-'}** | ${o.vehicul || 'Flotta'} | ${o.stare} | **${o.costTotal} RON** | ${o.dataDeschidere} |\n`;
        });
      } else {
        response += `Nincsenek aktív szervizfeladatok rögzítve a rendszerben. Minden gép üzemkész.`;
      }

      return { answer: response, mood: 'analyzing' };
    }

    // 4. Raktárkészlet, Alkatrészek & Olajok
    if (q.includes('stoc') || q.includes('raktár') || q.includes('alkatrész') || q.includes('olaj') || q.includes('szűrő') || q.includes('hiány')) {
      let response = `### 📦 Raktárkészlet & Kenőanyag Elemzés\n\n`;
      if (snap.stocCriticCount > 0) {
        response += `⚠️ **${snap.stocCriticCount} db tétel érte el a minimális készletszintet:**\n\n`;
        response += `| Cikkszám | Megnevezés | Jelenlegi Készlet | Min. Készlet |\n| :--- | :--- | :--- | :--- |\n`;
        snap.stocCritic.slice(0, 8).forEach((item: any) => {
          response += `| \`${item.cod || '-'}\` | **${item.denumire}** | <span style="color:#ef4444; font-weight:bold">${item.stoc} ${item.um}</span> | ${item.minim} ${item.um} |\n`;
        });
        response += `\n🛒 *Javaslat: Generálj beszerzési listát az e-Factura vagy a Stocuri modulban!*`;
      } else {
        response += `✅ **A raktárkészlet optimális!** Nincs minimális szint alá esett alkatrész vagy kenőanyag.`;
      }

      return { answer: response, mood: snap.stocCriticCount > 0 ? 'alert' : 'happy' };
    }

    // 5. Teljes Flotta Állapotjelentés / Statisztika
    if (q.includes('flotta') || q.includes('riport') || q.includes('statisztika') || q.includes('összesítés') || q.includes('jelentés') || q.includes('állapot')) {
      let catList = Object.entries(snap.categoriiCount)
        .map(([k, v]) => `\`${k}\`: **${v} db**`)
        .join(', ');

      return {
        answer: `### 📊 FleetCMD Globális Flotta Állapotjelentés
- **Géppark mérete:** Összesen **${snap.totalVehicule} db** jármű és nehézgép regisztrálva.
- **Üzemkész arány:** **${snap.vehiculeActive} db (${Math.round((snap.vehiculeActive / (snap.totalVehicule || 1)) * 100)}%)** aktív üzemben.
- **Megoszlás:** ${catList}

#### 📋 Üzemeltetési Diagnosztika:
1. **Okmányok (Valabilitate):**
   - Lejárt akták: **${snap.docExpirateCount} db** ${snap.docExpirateCount > 0 ? '❌ *(Azonnali megújítás szükséges)*' : '✅'}
   - Hamarosan lejár (< 30 nap): **${snap.docUrgenteCount} db** ⚠️
2. **Karbantartás (CMMS):**
   - Folyamatban lévő munkalapok: **${snap.comenziDeschiseCount} db** 🔧
3. **Anyaggazdálkodás (Stoc):**
   - Utánrendelésre váró tételek: **${snap.stocCriticCount} db** 📦

Melyik terület részleteire vagy kíváncsi?`,
        mood: 'analyzing',
      };
    }

    // Alapértelmezett intelligens válasz
    return {
      answer: `### 🤖 Értem a kérdésedet!
A flotta adatbázisában jelenleg **${snap.totalVehicule} járművet**, **${snap.comenziDeschiseCount} nyitott munkalapot** és **${snap.docExpirateCount} lejárt okmányt** tartok számon.

Ha szeretnéd, hogy részletes elemzést adjak, próbáld ki az alábbi kérdések egyikét:
- *"Melyik dokumentumok járnak le a héten?"*
- *"Adj egy állapotjelentést a basculantákról!"*
- *"Milyen alkatrészekből van hiány a raktárban?"*
- *"Mekkora költségnél járnak a nyitott munkalapok?"*`,
      mood: 'thinking',
    };
  }
}
