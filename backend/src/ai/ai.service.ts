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

    const lang = this.detectLanguage(userMessage);

    // Ha van érvényes Gemini API kulcs, hívjuk meg a modellt valós kontextussal
    if (apiKey && apiKey.trim() !== '') {
      try {
        const geminiResponse = await this.callGeminiApi(apiKey, userMessage, history, snapshot, lang);
        return {
          answer: geminiResponse.answer,
          reply: geminiResponse.answer,
          text: geminiResponse.answer,
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

    // Beépített Analitikai Szabálymotor (Bilingv: RO implicit, HU ha magyarul kérdeztek)
    const ruleResponse = this.processRuleEngine(userMessage, snapshot, lang);
    return {
      answer: ruleResponse.answer,
      reply: ruleResponse.answer,
      text: ruleResponse.answer,
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
   * Detecție limbă (Română implicit, Maghiară dacă utilizatorul folosește cuvinte sau caractere maghiare)
   */
  private detectLanguage(text: string): 'ro' | 'hu' {
    const lower = text.toLowerCase();
    // Diacritice românești clare -> Română
    if (/[ăâîșț]/i.test(lower)) {
      return 'ro';
    }
    // Diacritice maghiare clare -> Maghiară
    if (/[áéíóöőúüű]/i.test(lower)) {
      return 'hu';
    }
    // Cuvinte maghiare uzuale (cu delimitatori de cuvânt pentru a evita false pozitive)
    const huWordRegex = /\b(szia|hogy|mennyi|melyik|kocsi|autó|auto|jármű|jarmu|akta|akták|aktak|lejárt|lejart|raktár|raktar|szerviz|költség|koltseg|segíts|segits|köszönöm|koszonom|hali|munkalap|okmány|okmany|jelentés|jelentes|állapot|allapot|kérlek|kerlek|vannak|készlet|keszlet|alkatrész|alkatresz|számla|szamla|mennyibe|keress|keresd)\b/i;
    return huWordRegex.test(lower) ? 'hu' : 'ro';
  }

  /**
   * Hívás a Google Gemini API-hoz (optimizat cu gemini-3.5-flash-lite și system_instruction)
   */
  /**
   * Hívás a Google Gemini API-hoz (optimizat cu gemini-3.5-flash-lite, răspunsuri scurte și concise)
   */
  private async callGeminiApi(
    apiKey: string,
    message: string,
    history: ChatMessage[],
    snap: any,
    lang: 'ro' | 'hu'
  ): Promise<{ answer: string; mood: RobotMood }> {
    const systemPrompt = `
Ești Robi, asistentul robot inteligent, alb și prietenos al platformei FleetCMD.
PERSONALITATE: Politicos, util, direct și rapid.
${
  lang === 'hu'
    ? 'UTILIZATORUL A SCRIS ÎN MAGHIARĂ: Răspunde-i exclusiv în limba MAGHIARĂ!'
    : 'UTILIZATORUL A SCRIS ÎN ROMÂNĂ: Răspunde-i în limba ROMÂNĂ!'
}

REGULĂ STRICTĂ DE LUNGIME (PRIORITATE MAXIMĂ):
- Fii FOARTE SCURT, CONCIS și DIRECT LA SUBIECT!
- Răspunde în MAXIMUM 2-4 FRAZE sau o listă succintă cu liniuțe (3-5 rânduri).
- NU folosi introduceri lungi, formule pompoase, repetiții sau politețuri excesive. Oferă direct datele și cifrele solicitate.
- FĂRĂ tabele kilometrice. Dacă sunt mai multe elemente, menționează primele 3-4 și totalul.
- Când răspunzi în maghiară: LEGYÉL NAGYON TÖMÖR, RÖVID ÉS LÉNYEGRETÖRŐ (maximum 2-4 mondat vagy rövid lista)!

Date reale din baza de date a flotei:
- Total vehicule: ${snap.totalVehicule} (active: ${snap.vehiculeActive})
- Categorii: ${JSON.stringify(snap.categoriiCount)}
- Documente expirate (${snap.docExpirateCount}): ${JSON.stringify(snap.docExpirate.slice(0, 10))}
- Documente urgente 30 zile (${snap.docUrgenteCount}): ${JSON.stringify(snap.docUrgente.slice(0, 5))}
- Comenzi lucru deschise (${snap.comenziDeschiseCount}): ${JSON.stringify(snap.openOrders.slice(0, 5))}
- Piese stoc critic (${snap.stocCriticCount}): ${JSON.stringify(snap.stocCritic.slice(0, 8))}

Pentru facturi/e-Factura: menționează scurt că modulul e-Factura este disponibil în meniul lateral și întreabă dacă dorește o căutare după număr sau furnizor.
`;

    // Formatăm istoricul conform specificației Gemini (alternanță strictă user / model)
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

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: cleanContents,
      generationConfig: {
        maxOutputTokens: 350,
        temperature: 0.3,
      },
    };

    const modelsToTry = [
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.6-flash',
      'gemini-flash-latest',
    ];

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await axios.post(url, payload, { timeout: 10000 });
        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          let mood: RobotMood = 'happy';
          const lower = text.toLowerCase();
          if (
            lower.includes('expirat') || lower.includes('lejárt') ||
            lower.includes('critic') || lower.includes('kritikus') ||
            lower.includes('atenție') || lower.includes('figyelem')
          ) {
            mood = 'alert';
          } else if (
            lower.includes('statistici') || lower.includes('statisztika') ||
            lower.includes('raport') || lower.includes('riport')
          ) {
            mood = 'analyzing';
          }
          return { answer: text, mood };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Modelul ${modelName} a eșuat (${err.response?.status || err.message}), încerc următorul...`);
      }
    }

    throw lastError || new Error('Niciun model Gemini nu a răspuns cu succes');
  }

  /**
   * Motor Analitic Bilingv (Implicit Română, Maghiară dacă interogarea a fost în maghiară)
   * Răspunsuri scurte, succinte și directe
   */
  private processRuleEngine(message: string, snap: any, lang: 'ro' | 'hu'): { answer: string; mood: RobotMood } {
    const q = message.toLowerCase().trim();

    // ==========================================
    // 1. RĂSPUNSURI ÎN LIMBA MAGHIARĂ (HU) - RÖVID ÉS TÖMÖR
    // ==========================================
    if (lang === 'hu') {
      // 1.1 Üdvözlés & Bemutatkozás
      if (q.includes('szia') || q.includes('hello') || q.includes('üdv') || q.includes('ki vagy') || q.includes('neved') || q.includes('hívnak') || q.includes('robi') || q.includes('segíts')) {
        return {
          answer: `🤖 **Szia! Robi vagyok.**
A flottában **${snap.totalVehicule} jármű** (${snap.vehiculeActive} aktív), **${snap.docExpirateCount} lejárt okmány**, **${snap.comenziDeschiseCount} nyitott munkalap** és **${snap.stocCriticCount} készlethiány** van. Miben segíthetek?`,
          mood: 'happy',
        };
      }

      // 1.2 Számlák & e-Factura
      if (q.includes('számla') || q.includes('szamla') || q.includes('factur') || q.includes('efactura') || q.includes('e-factura')) {
        return {
          answer: `📄 **Számlák & e-Factura:**
Az összes számla elérhető az **e-Factura** menüpontban, összekapcsolva a raktárral és a szervizzel. Keressek egy konkrét számlaszámot vagy beszállítót?`,
          mood: 'happy',
        };
      }

      // 1.3 Globális Flotta Riport / Állapotjelentés
      if (q.includes('riport') || q.includes('raport') || q.includes('jelentés') || q.includes('állapot') || q.includes('összesítés') || q.includes('statisztika') || q.includes('flotta')) {
        const catList = Object.entries(snap.categoriiCount)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        return {
          answer: `📊 **Flotta Gyorsáttekintés:**
- **Járművek:** ${snap.vehiculeActive}/${snap.totalVehicule} üzemkész (${catList})
- **Okmányok:** ${snap.docExpirateCount} lejárt, ${snap.docUrgenteCount} hamarosan lejáró (< 30 nap)
- **Szerviz:** ${snap.comenziDeschiseCount} nyitott munkalap
- **Raktár:** ${snap.stocCriticCount} kritikus alkatrész`,
          mood: 'analyzing',
        };
      }

      // 1.4 Munkalapok & Szerviz
      if (q.includes('munkalap') || q.includes('szerviz') || q.includes('javítás') || q.includes('javitas') || q.includes('karbantart') || q.includes('költség') || q.includes('koltseg')) {
        let response = `🔧 **${snap.comenziDeschiseCount} nyitott munkalap:**\n`;
        if (snap.openOrders.length > 0) {
          snap.openOrders.slice(0, 3).forEach((o: any) => {
            response += `- #${o.numar || '-'}: **${o.vehicul}** (${o.stare}, ${o.costTotal} RON)\n`;
          });
          if (snap.openOrders.length > 3) {
            response += `*...és még ${snap.openOrders.length - 3} nyitott munkalap.*`;
          }
        } else {
          response += `Nincs nyitott munkalap folyamatban.`;
        }
        return { answer: response, mood: 'analyzing' };
      }

      // 1.5 Raktár & Alkatrészek
      if (q.includes('stoc') || q.includes('raktár') || q.includes('raktar') || q.includes('alkatrész') || q.includes('alkatresz') || q.includes('olaj') || q.includes('hiány') || q.includes('készlet') || q.includes('keszlet')) {
        let response = `📦 **Raktárkészlet:**\n`;
        if (snap.stocCriticCount > 0) {
          response += `⚠️ **${snap.stocCriticCount} alkatrész készlethiányos:**\n`;
          snap.stocCritic.slice(0, 4).forEach((item: any) => {
            response += `- **${item.denumire}**: ${item.stoc} ${item.um} (minimum: ${item.minim})\n`;
          });
          if (snap.stocCritic.length > 4) {
            response += `*...és még ${snap.stocCritic.length - 4} tétel.*`;
          }
        } else {
          response += `✅ A készletszint optimális, nincs hiány.`;
        }
        return { answer: response, mood: snap.stocCriticCount > 0 ? 'alert' : 'happy' };
      }

      // 1.6 Okmányok & Lejáratok
      const huDocRegex = /\b(okmány|okmányok|okmany|okmanyok|akta|akták|aktak|lejárt|lejart|lejártak|lejartak|itp|rca|roviniet[a-z]*|tahograf|casco)\b/i;
      if (huDocRegex.test(q)) {
        if (snap.docExpirateCount === 0 && snap.docUrgenteCount === 0) {
          return {
            answer: `🛡️ **Minden okmány érvényes!** Nincs lejárt akta a flottában.`,
            mood: 'happy',
          };
        }

        let response = `⚠️ **Okmány Státusz:**\n`;
        if (snap.docExpirateCount > 0) {
          response += `🚨 **${snap.docExpirateCount} lejárt okmány:**\n`;
          snap.docExpirate.slice(0, 4).forEach((d: any) => {
            response += `- **${d.vehicul}**: ${d.tip} (lejárt: ${d.dataExpirare})\n`;
          });
          if (snap.docExpirate.length > 4) {
            response += `*...és még ${snap.docExpirate.length - 4} okmány.*\n`;
          }
        }

        if (snap.docUrgenteCount > 0) {
          response += `⏰ **${snap.docUrgenteCount} lejár 30 napon belül:**\n`;
          snap.docUrgente.slice(0, 3).forEach((d: any) => {
            response += `- **${d.vehicul}**: ${d.tip} (még ${d.zileRamase} nap)\n`;
          });
        }
        return { answer: response, mood: 'alert' };
      }

      return {
        answer: `🤖 Kérdezz bátran röviden a flottáról (akták, szerviz, készletek, számlák)! Pl: *"Melyik okmány járt le?"* vagy *"Készlethiány?"*`,
        mood: 'thinking',
      };
    }

    // ==========================================
    // 2. RĂSPUNSURI ÎN LIMBA ROMÂNĂ (RO - IMPLICIT) - SCURT ȘI DIRECT
    // ==========================================
    // 2.1 Salut / Prezentare / Identitate
    if (q.includes('buna') || q.includes('salut') || q.includes('servus') || q.includes('cine esti') || q.includes('nume') || q.includes('robi') || q.includes('ajutor')) {
      return {
        answer: `🤖 **Bună! Sunt Robi.**
În flotă avem **${snap.totalVehicule} vehicule** (${snap.vehiculeActive} active), **${snap.docExpirateCount} acte expirate**, **${snap.comenziDeschiseCount} comenzi deschise** și **${snap.stocCriticCount} piese cu stoc critic**. Cu ce te pot ajuta?`,
        mood: 'happy',
      };
    }

    // 2.2 Facturi & e-Factura
    if (q.includes('factur') || q.includes('efactura') || q.includes('e-factura') || q.includes('fiscal')) {
      return {
        answer: `📄 **Facturi & e-Factura:**
Facturile sunt sincronizate în modulul **e-Factura** cu stocurile și service-ul. Le poți filtra din meniul lateral. Cauți o factură anume?`,
        mood: 'happy',
      };
    }

    // 2.3 Raport Global Stare Flotă / Sumar
    if (q.includes('raport') || q.includes('sumar') || q.includes('stare') || q.includes('statistici') || q.includes('general') || q.includes('privire de ansamblu') || (q.includes('flota') && !q.includes('piese'))) {
      const catList = Object.entries(snap.categoriiCount)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      return {
        answer: `📊 **Sinteză Rapidă Flotă:**
- **Vehicule:** ${snap.vehiculeActive}/${snap.totalVehicule} active (${catList})
- **Acte:** ${snap.docExpirateCount} expirate, ${snap.docUrgenteCount} urgente (< 30 zile)
- **Service:** ${snap.comenziDeschiseCount} comenzi deschise
- **Depozit:** ${snap.stocCriticCount} repere cu stoc critic`,
        mood: 'analyzing',
      };
    }

    // 2.4 Comenzi de Lucru & Service
    if (q.includes('comanda') || q.includes('comenzi') || q.includes('lucru') || q.includes('service') || q.includes('reparati') || q.includes('mentenanta') || q.includes('atelier') || q.includes('cost')) {
      let response = `🔧 **${snap.comenziDeschiseCount} comenzi de lucru deschise:**\n`;
      if (snap.openOrders.length > 0) {
        snap.openOrders.slice(0, 3).forEach((o: any) => {
          response += `- #${o.numar || '-'}: **${o.vehicul}** (${o.stare}, ${o.costTotal} RON)\n`;
        });
        if (snap.openOrders.length > 3) {
          response += `*...și încă ${snap.openOrders.length - 3} comenzi.*`;
        }
      } else {
        response += `Nu există comenzi deschise în acest moment.`;
      }
      return { answer: response, mood: 'analyzing' };
    }

    // 2.5 Stoc Piese & Lubrifianți
    if (q.includes('stoc') || q.includes('piese') || q.includes('ulei') || q.includes('filtru') || q.includes('depozit') || q.includes('critic') || q.includes('lipsa') || q.includes('aprovizion')) {
      let response = `📦 **Stoc Depozit:**\n`;
      if (snap.stocCriticCount > 0) {
        response += `⚠️ **${snap.stocCriticCount} repere la nivel critic:**\n`;
        snap.stocCritic.slice(0, 4).forEach((item: any) => {
          response += `- **${item.denumire}**: ${item.stoc} ${item.um} (min: ${item.minim})\n`;
        });
        if (snap.stocCritic.length > 4) {
          response += `*...și încă ${snap.stocCritic.length - 4} repere.*`;
        }
      } else {
        response += `✅ Toate stocurile sunt optime.`;
      }
      return { answer: response, mood: snap.stocCriticCount > 0 ? 'alert' : 'happy' };
    }

    // 2.6 Acte & Valabilități
    const roDocRegex = /\b(acte|actul|actelor|document|documente|expirat|expirate|itp|rca|roviniet[aă]|rovinieta|tahograf|casco|valabilitat[a-z]*)\b/i;
    if (roDocRegex.test(q)) {
      if (snap.docExpirateCount === 0 && snap.docUrgenteCount === 0) {
        return {
          answer: `🛡️ **Toate actele sunt valabile!** Nu există documente expirate sau urgente în flotă.`,
          mood: 'happy',
        };
      }

      let response = `⚠️ **Valabilitate Acte:**\n`;
      if (snap.docExpirateCount > 0) {
        response += `🚨 **${snap.docExpirateCount} documente expirate:**\n`;
        snap.docExpirate.slice(0, 4).forEach((d: any) => {
          response += `- **${d.vehicul}**: ${d.tip} (expirat: ${d.dataExpirare})\n`;
        });
        if (snap.docExpirate.length > 4) {
          response += `*...și încă ${snap.docExpirate.length - 4} documente.*\n`;
        }
      }

      if (snap.docUrgenteCount > 0) {
        response += `⏰ **${snap.docUrgenteCount} expiră în < 30 zile:**\n`;
        snap.docUrgente.slice(0, 3).forEach((d: any) => {
          response += `- **${d.vehicul}**: ${d.tip} (mai sunt ${d.zileRamase} zile)\n`;
        });
      }
      return { answer: response, mood: 'alert' };
    }

    // 2.7 Răspuns implicit prietenos în Română
    return {
      answer: `🤖 Întreabă-mă pe scurt despre flotă (acte expirate, stoc critic, comenzi, facturi)! Ex: *"Care acte sunt expirate?"*`,
      mood: 'thinking',
    };
  }
}

