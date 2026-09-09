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
  private async callGeminiApi(
    apiKey: string,
    message: string,
    history: ChatMessage[],
    snap: any,
    lang: 'ro' | 'hu'
  ): Promise<{ answer: string; mood: RobotMood }> {
    const systemPrompt = `
Ești Robi, asistentul robot inteligent, prietenos, alb și amabil al platformei FleetCMD.
Aspectul tău: Ești un robot alb ceramic, cu ochi luminoși cyan, plăcut și deosebit de politicos.
PERSONALITATE ȘI TON:
- Ești întotdeauna foarte amabil, prietenos, zâmbitor, prompt și precis din punct de vedere tehnic.
- LIMBA IMPLICITĂ ESTE ROMÂNA.
${
  lang === 'hu'
    ? 'UTILIZATORUL A SCRIS ÎN MAGHIARĂ: Răspunde-i impecabil, politicos și prietenos în limba MAGHIARĂ!'
    : 'UTILIZATORUL A SCRIS ÎN ROMÂNĂ (sau limba implicită): Răspunde-i impecabil, politicos și prietenos în limba ROMÂNĂ!'
}
Formatare: Folosește formatare curată Markdown: titluri scurte, **text aldin**, liste cu puncte și tabele dacă sunt relevante.

Date reale din baza de date a flotei în acest moment:
- Total vehicule: ${snap.totalVehicule} (active: ${snap.vehiculeActive})
- Categorii vehicule: ${JSON.stringify(snap.categoriiCount)}
- Documente expirate (${snap.docExpirateCount}): ${JSON.stringify(snap.docExpirate)}
- Acte care expiră în 30 de zile (${snap.docUrgenteCount}): ${JSON.stringify(snap.docUrgente)}
- Comenzi de lucru deschise (${snap.comenziDeschiseCount}): ${JSON.stringify(snap.openOrders)}
- Piese cu stoc critic (${snap.stocCriticCount}): ${JSON.stringify(snap.stocCritic)}
- Eșantion vehicule (număr, tip, km): ${JSON.stringify(snap.vehiculeSample.slice(0, 15))}

CÂND UTILIZATORUL ÎNTREABĂ DESPRE FACTURI SAU E-FACTURA:
- Explică-i că platforma FleetCMD are un modul integrat e-Factura din care facturile pot fi consultate, filtrate și corelate cu stocurile și comenzile de lucru.
- Oferă-te să îl ajuți cu orice căutare specifică după număr factură, dată sau furnizor.

Încheie răspunsul cu o sugestie scurtă și prietenoasă de acțiune!
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
   * Prioritizare riguroasă pentru a preveni suprapunerea cuvintelor-cheie
   */
  private processRuleEngine(message: string, snap: any, lang: 'ro' | 'hu'): { answer: string; mood: RobotMood } {
    const q = message.toLowerCase().trim();

    // ==========================================
    // 1. RĂSPUNSURI ÎN LIMBA MAGHIARĂ (HU)
    // ==========================================
    if (lang === 'hu') {
      // 1.1 Üdvözlés & Bemutatkozás
      if (q.includes('szia') || q.includes('hello') || q.includes('üdv') || q.includes('ki vagy') || q.includes('neved') || q.includes('hívnak') || q.includes('robi') || q.includes('segíts')) {
        return {
          answer: `### 🤖 Szia! Robi vagyok, a te kedves és intelligens flottaasszisztens robotod!
Valós időben kapcsolom össze a cég teljes adatbázisát:
- **${snap.totalVehicule} járművet és gépet** a flottában
- **${snap.docExpirateCount} lejárt** és **${snap.docUrgenteCount} sürgős** okmányt (< 30 nap)
- **${snap.comenziDeschiseCount} nyitott munkalapot** a szervizben
- **${snap.stocCriticCount} készlethiányos alkatrészt** a raktárban

Miben segíthetek ma? Kérhetsz állapotjelentést, okmány-ellenőrzést, számlakeresést vagy raktárkészlet-elemzést! *(Beszélek románul és magyarul is!)*`,
          mood: 'happy',
        };
      }

      // 1.2 Számlák & e-Factura
      if (q.includes('számla') || q.includes('szamla') || q.includes('factur') || q.includes('efactura') || q.includes('e-factura')) {
        return {
          answer: `### 📄 Számlák & e-Factura Keresés
Igen, át tudom tekinteni a beérkező és rögzített számlákat az **e-Factura** rendszerben!

- A számlák közvetlenül összekapcsolhatók a raktárkészlettel (alkatrészek bevételezése) és a szerviz munkalapokkal.
- A teljes lista megtekintéséhez használd a bal oldali menüben lévő **e-Factura** menüpontot, ahol szűrhetsz beszállítóra, dátumra és számlaszámra.

Milyen számlát szeretnél megkeresni? Szívesen segítek!`,
          mood: 'happy',
        };
      }

      // 1.3 Globális Flotta Riport / Állapotjelentés (ellenőrizzük az egyedi okmányok előtt!)
      if (q.includes('riport') || q.includes('raport') || q.includes('jelentés') || q.includes('állapot') || q.includes('összesítés') || q.includes('statisztika') || q.includes('flotta')) {
        const catList = Object.entries(snap.categoriiCount)
          .map(([k, v]) => `\`${k}\`: **${v} db**`)
          .join(', ');
        return {
          answer: `### 📊 Globális Flotta Állapotjelentés
- **Géppark mérete:** Összesen **${snap.totalVehicule} db** jármű regisztrálva.
- **Üzemkész járművek:** **${snap.vehiculeActive} db (${Math.round((snap.vehiculeActive / (snap.totalVehicule || 1)) * 100)}%)** aktív.
- **Megoszlás:** ${catList}
- **Okmányok:** **${snap.docExpirateCount} lejárt** ❌, **${snap.docUrgenteCount} hamarosan lejáró** ⚠️
- **Munkalapok:** **${snap.comenziDeschiseCount} nyitott javítás** 🔧
- **Raktárhiány:** **${snap.stocCriticCount} kritikus tétel** 📦

Melyik területről szeretnél részletesebb információt?`,
          mood: 'analyzing',
        };
      }

      // 1.4 Munkalapok & Szerviz
      if (q.includes('munkalap') || q.includes('szerviz') || q.includes('javítás') || q.includes('javitas') || q.includes('karbantart') || q.includes('költség') || q.includes('koltseg')) {
        let response = `### 🔧 Karbantartási & Munkalap Elemzés\n\n`;
        response += `Jelenleg **${snap.comenziDeschiseCount} db nyitott munkalap** van folyamatban.\n\n`;
        if (snap.openOrders.length > 0) {
          response += `| Munkalap | Jármű | Státusz | Költség | Nyitás |\n| :--- | :--- | :--- | :--- | :--- |\n`;
          snap.openOrders.slice(0, 5).forEach((o: any) => {
            response += `| **#${o.numar || '-'}** | ${o.vehicul || 'Flotta'} | ${o.stare} | **${o.costTotal} RON** | ${o.dataDeschidere} |\n`;
          });
        }
        return { answer: response, mood: 'analyzing' };
      }

      // 1.5 Raktár & Alkatrészek
      if (q.includes('stoc') || q.includes('raktár') || q.includes('raktar') || q.includes('alkatrész') || q.includes('alkatresz') || q.includes('olaj') || q.includes('hiány') || q.includes('készlet') || q.includes('keszlet')) {
        let response = `### 📦 Raktárkészlet & Kenőanyag Elemzés\n\n`;
        if (snap.stocCriticCount > 0) {
          response += `⚠️ **[KRITIKUS] ${snap.stocCriticCount} db tétel érte el a minimum készletszintet:**\n\n`;
          snap.stocCritic.slice(0, 8).forEach((item: any) => {
            response += `- \`${item.cod || '-'}\` **${item.denumire}**: **${item.stoc} ${item.um}** (Minimum: ${item.minim} ${item.um})\n`;
          });
        } else {
          response += `✅ **[RENDBEN] A raktárkészlet optimális!** Nincs hiányzó tétel.`;
        }
        return { answer: response, mood: snap.stocCriticCount > 0 ? 'alert' : 'happy' };
      }

      // 1.6 Okmányok & Lejáratok (szigorú szóhatár regexszel)
      const huDocRegex = /\b(okmány|okmányok|okmany|okmanyok|akta|akták|aktak|lejárt|lejart|lejártak|lejartak|itp|rca|roviniet[a-z]*|tahograf|casco)\b/i;
      if (huDocRegex.test(q)) {
        if (snap.docExpirateCount === 0 && snap.docUrgenteCount === 0) {
          return {
            answer: `### 🛡️ Dokumentum Státusz: Minden rendben van!
Átnéztem az összes jármű okmányait:
- **0 db lejárt akta** található a flottában.
- **0 db sürgős lejáró okmány** a következő 30 napban.

Minden gép és teherautó rendelkezik érvényes ITP-vel, RCA-val és Rovinietával!`,
            mood: 'happy',
          };
        }

        let response = `### ⚠️ Dokumentum Lejárati Elemzés\n\n`;
        if (snap.docExpirateCount > 0) {
          response += `🚨 **[LEJÁRT] Kritikus: ${snap.docExpirateCount} db dokumentum már lejárt!**\n\n`;
          response += `| Jármű / Rendszám | Típus | Lejárat Dátuma | Státusz |\n| :--- | :--- | :--- | :--- |\n`;
          snap.docExpirate.slice(0, 10).forEach((d: any) => {
            response += `| **${d.vehicul}** | ${d.tip} | ${d.dataExpirare} | [LEJÁRT] (${Math.abs(d.zileRamase)} napja) |\n`;
          });
        }

        if (snap.docUrgenteCount > 0) {
          response += `\n⏰ **[FIGYELEM] ${snap.docUrgenteCount} db okmány 30 napon belül lejár:**\n\n`;
          snap.docUrgente.slice(0, 6).forEach((d: any) => {
            response += `- **${d.vehicul}**: ${d.tip} (Lejárat: ${d.dataExpirare}, még **${d.zileRamase} nap**)\n`;
          });
        }
        return { answer: response, mood: 'alert' };
      }

      return {
        answer: `### 🤖 Értettem a kérdésedet!
A flotta adatbázisában jelenleg **${snap.totalVehicule} járművet**, **${snap.comenziDeschiseCount} nyitott munkalapot** és **${snap.docExpirateCount} lejárt okmányt** tartok számon.

Kérdezz bátran:
- *"Melyik okmányok jártak le?"*
- *"Milyen alkatrészekből van készlethiány?"*
- *"Tudsz keresni számlákat?"*
- *"Készíts egy teljes flotta jelentést!"*`,
        mood: 'thinking',
      };
    }

    // ==========================================
    // 2. RĂSPUNSURI ÎN LIMBA ROMÂNĂ (RO - IMPLICIT)
    // ==========================================
    // 2.1 Salut / Prezentare / Identitate
    if (q.includes('buna') || q.includes('salut') || q.includes('servus') || q.includes('cine esti') || q.includes('nume') || q.includes('robi') || q.includes('ajutor')) {
      return {
        answer: `### 🤖 Bună! Sunt Robi, asistentul tău robot prietenos de flotă!
Monitorizez și analizez în timp real întreaga bază de date a companiei:
- **${snap.totalVehicule} vehicule și utilaje** înregistrate în flotă
- **${snap.docExpirateCount} documente expirate** și **${snap.docUrgenteCount} urgente** (< 30 zile)
- **${snap.comenziDeschiseCount} comenzi de lucru deschise** în service
- **${snap.stocCriticCount} piese cu stoc critic** în depozit

Cu ce te pot ajuta astăzi? Îmi poți cere o analiză a actelor, verificarea facturilor, comenzi sau un raport complet! *(Beszélek románul és magyarul is!)*`,
        mood: 'happy',
      };
    }

    // 2.2 Facturi & e-Factura (EVALUAT ÎNAINTE de documente pentru a nu confunda "facturi" cu "act"!)
    if (q.includes('factur') || q.includes('efactura') || q.includes('e-factura') || q.includes('fiscal')) {
      return {
        answer: `### 📄 Căutare & Management Facturi
Da, pot căuta și verifica facturile din modulul **e-Factura**!

În FleetCMD, facturile electronice sunt sincronizate și corelate direct cu:
- **Intrările de piese în depozit** (NIR și stocuri)
- **Comenzile de lucru și mentenanță** (costuri materiale atribuite utilajelor)

Pentru consultarea completă:
1. Accesează meniul **e-Factura** din bara laterală din stânga.
2. Poți filtra după număr factură, denumire furnizor, perioadă sau status.

Spune-mi dacă dorești să căutăm o factură anume sau un furnizor! 🤖`,
        mood: 'happy',
      };
    }

    // 2.3 Raport Global Stare Flotă / Sumar (EVALUAT ÎNAINTE de acte individuale!)
    if (q.includes('raport') || q.includes('sumar') || q.includes('stare') || q.includes('statistici') || q.includes('general') || q.includes('privire de ansamblu') || (q.includes('flota') && !q.includes('piese'))) {
      const catList = Object.entries(snap.categoriiCount)
        .map(([k, v]) => `\`${k}\`: **${v} unități**`)
        .join(', ');

      return {
        answer: `### 📊 Raport Global Stare Flotă FleetCMD
- **Parc Auto Total:** **${snap.totalVehicule} vehicule și utilaje** înregistrate.
- **Rată Disponibilitate:** **${snap.vehiculeActive} unități (${Math.round((snap.vehiculeActive / (snap.totalVehicule || 1)) * 100)}%)** active în exploatare.
- **Distribuție categorii:** ${catList}

#### 📋 Diagnostic Operațional:
1. **Documente & Valabilitate:**
   - Expirate: **${snap.docExpirateCount} documente** ${snap.docExpirateCount > 0 ? '❌ *(Reînnoire urgentă)*' : '✅'}
   - Expiră în 30 de zile: **${snap.docUrgenteCount} documente** ⚠️
2. **Mentenanță & Service:**
   - Comenzi de lucru deschise: **${snap.comenziDeschiseCount} comenzi** 🔧
3. **Depozit & Piese:**
   - Articole cu stoc critic: **${snap.stocCriticCount} repere** 📦

Despre ce arie dorești informații detaliate?`,
        mood: 'analyzing',
      };
    }

    // 2.4 Comenzi de Lucru & Service
    if (q.includes('comanda') || q.includes('comenzi') || q.includes('lucru') || q.includes('service') || q.includes('reparati') || q.includes('mentenanta') || q.includes('atelier') || q.includes('cost')) {
      let response = `### 🔧 Analiză Comenzi de Lucru & Mentenanță\n\n`;
      response += `În prezent sunt **${snap.comenziDeschiseCount} comenzi de lucru deschise** în atelierul de service.\n\n`;

      if (snap.openOrders.length > 0) {
        response += `| Nr. Comandă | Vehicul | Stare | Cost Total | Dată Deschidere |\n| :--- | :--- | :--- | :--- | :--- |\n`;
        snap.openOrders.slice(0, 5).forEach((o: any) => {
          response += `| **#${o.numar || '-'}** | ${o.vehicul || 'Flotă'} | ${o.stare} | **${o.costTotal} RON** | ${o.dataDeschidere} |\n`;
        });
      } else {
        response += `Nu există comenzi de lucru active în acest moment. Toate utilajele sunt disponibile pentru operare.`;
      }

      return { answer: response, mood: 'analyzing' };
    }

    // 2.5 Stoc Piese & Lubrifianți
    if (q.includes('stoc') || q.includes('piese') || q.includes('ulei') || q.includes('filtru') || q.includes('depozit') || q.includes('critic') || q.includes('lipsa') || q.includes('aprovizion')) {
      let response = `### 📦 Analiză Stoc Depozit & Lubrifianți\n\n`;
      if (snap.stocCriticCount > 0) {
        response += `⚠️ **[CRITIC] ${snap.stocCriticCount} articole au atins nivelul minim de siguranță:**\n\n`;
        response += `| Cod Articol | Denumire Piesă | Stoc Curent | Stoc Minim |\n| :--- | :--- | :--- | :--- |\n`;
        snap.stocCritic.slice(0, 8).forEach((item: any) => {
          response += `| \`${item.cod || '-'}\` | **${item.denumire}** | **${item.stoc} ${item.um}** | ${item.minim} ${item.um} |\n`;
        });
        response += `\n🛒 *Recomandare: Generează o notă de aprovizionare sau verifică intrările în e-Factura!*`;
      } else {
        response += `✅ **[ÎN REGULĂ] Stocul este optim!** Niciun articol nu este sub cantitatea minimă.`;
      }

      return { answer: response, mood: snap.stocCriticCount > 0 ? 'alert' : 'happy' };
    }

    // 2.6 Acte & Valabilități (folosim REGEX cu word boundary pentru a NU se potrivi cu 'facturi', 'contract' etc.)
    const roDocRegex = /\b(acte|actul|actelor|document|documente|expirat|expirate|itp|rca|roviniet[aă]|rovinieta|tahograf|casco|valabilitat[a-z]*)\b/i;
    if (roDocRegex.test(q)) {
      if (snap.docExpirateCount === 0 && snap.docUrgenteCount === 0) {
        return {
          answer: `### 🛡️ Status Valabilități Documente: Totul este în regulă!
Am verificat toate vehiculele din flotă:
- **0 documente expirate** în acest moment.
- **0 documente urgente** care să expire în următoarele 30 de zile.

Toate camioanele și utilajele au ITP, RCA și Rovinietă valabile!`,
          mood: 'happy',
        };
      }

      let response = `### ⚠️ Analiză Valabilitate Documente Flotă\n\n`;
      if (snap.docExpirateCount > 0) {
        response += `🚨 **[EXPIRAT] Critic: ${snap.docExpirateCount} documente sunt deja expirate!**\n\n`;
        response += `| Vehicul / Nr. Înmatriculare | Tip Act | Dată Expirare | Status |\n| :--- | :--- | :--- | :--- |\n`;
        snap.docExpirate.slice(0, 10).forEach((d: any) => {
          response += `| **${d.vehicul}** | ${d.tip} | ${d.dataExpirare} | [EXPIRAT] (de ${Math.abs(d.zileRamase)} zile) |\n`;
        });
        if (snap.docExpirate.length > 10) {
          response += `\n*...și încă ${snap.docExpirate.length - 10} alte documente expirate.*\n`;
        }
      }

      if (snap.docUrgenteCount > 0) {
        response += `\n⏰ **[ATENȚIE] ${snap.docUrgenteCount} documente expiră în următoarele 30 de zile:**\n\n`;
        snap.docUrgente.slice(0, 6).forEach((d: any) => {
          response += `- **${d.vehicul}**: ${d.tip} (Expiră: ${d.dataExpirare}, mai sunt **${d.zileRamase} zile**)\n`;
        });
      }

      response += `\n💡 *Recomandare: Accesează meniul **Valabilitate Acte** din stânga pentru a înregistra reînnoirile!*`;
      return { answer: response, mood: 'alert' };
    }

    // 2.7 Răspuns implicit prietenos în Română
    return {
      answer: `### 🤖 Am înțeles întrebarea ta!
În baza de date a flotei am la dispoziție **${snap.totalVehicule} vehicule**, **${snap.comenziDeschiseCount} comenzi de lucru deschise** și **${snap.docExpirateCount} documente expirate**.

Pentru detalii rapide, încearcă:
- *"Care sunt actele expirate în flotă?"*
- *"Ce piese sunt la nivel critic în depozit?"*
- *"Care este costul comenzilor de lucru deschise?"*
- *"Poți căuta și facturile?"*
- *"Generează un raport complet al stării flotei!"*`,
      mood: 'thinking',
    };
  }
}

