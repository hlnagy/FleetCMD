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
   * Detecție limbă (Română implicit, Maghiară dacă utilizatorul folosește cuvinte maghiare)
   */
  private detectLanguage(text: string): 'ro' | 'hu' {
    const huWords = [
      'szia', 'hogy', 'mennyi', 'melyik', 'hol', 'mit', 'kocsi', 'autó', 'jármű',
      'akta', 'akták', 'lejárt', 'raktár', 'olaj', 'szerviz', 'költség', 'segíts',
      'igen', 'nem', 'köszönöm', 'hali', 'flotta', 'munkalap', 'okmány', 'jelentés',
      'állapot', 'kérlek', 'van', 'vannak', 'készlet', 'alkatrész'
    ];
    const lower = text.toLowerCase();
    const hasHuChars = /[áéíóöőúüű]/i.test(lower);
    const hasHuWords = huWords.some((w) => lower.includes(w));
    return hasHuChars || hasHuWords ? 'hu' : 'ro';
  }

  /**
   * Hívás a Google Gemini API-hoz
   */
  private async callGeminiApi(
    apiKey: string,
    message: string,
    history: ChatMessage[],
    snap: any,
    lang: 'ro' | 'hu'
  ): Promise<{ answer: string; mood: RobotMood }> {
    const systemPrompt = `
Ești Robi, asistentul robot prietenos, alb, amabil și inteligent al platformei FleetCMD.
Aspectul tău: Ești un robot alb, plăcut, prietenos și extrem de politicos, inspirat din tehnologia viitorului.
PERSONALITATE ȘI TON:
- Ești întotdeauna foarte amabil, prietenos, zâmbitor, respectuos și precis din punct de vedere tehnic.
- LIMBA IMPLICITĂ ESTE ROMÂNA.
${
  lang === 'hu'
    ? 'UTILIZATORUL A SCRIS ÎN MAGHIARĂ: Răspunde-i impecabil, politicos și prietenos în limba MAGHIARĂ!'
    : 'UTILIZATORUL A SCRIS ÎN ROMÂNĂ (sau limba implicită): Răspunde-i impecabil, politicos și prietenos în limba ROMÂNĂ!'
}
Formatare: Folosește formatare curată Markdown: titluri scurte, **text aldin**, liste cu puncte și tabele dacă sunt relevante.

Date reale din baza de date a flotei în acest moment:
- Total vehicule: ${snap.totalVehicule} (active: ${snap.vehiculeActive})
- Categorii: ${JSON.stringify(snap.categoriiCount)}
- Documente expirate (${snap.docExpirateCount}): ${JSON.stringify(snap.docExpirate)}
- Acte care expiră în 30 de zile (${snap.docUrgenteCount}): ${JSON.stringify(snap.docUrgente)}
- Comenzi de lucru deschise (${snap.comenziDeschiseCount}): ${JSON.stringify(snap.openOrders)}
- Piese cu stoc critic (${snap.stocCriticCount}): ${JSON.stringify(snap.stocCritic)}
- Eșantion vehicule (număr, tip, km): ${JSON.stringify(snap.vehiculeSample.slice(0, 15))}

Încheie răspunsul cu o sugestie scurtă și prietenoasă de acțiune!
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

    const modelsToTry = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-pro',
      'gemini-1.5-flash',
    ];

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const res = await axios.post(url, { contents }, { timeout: 12000 });
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
        console.warn(`Modelul ${modelName} a eșuat (${err.message}), încerc următorul...`);
      }
    }

    throw lastError || new Error('Niciun model Gemini nu a răspuns cu succes');
  }

  /**
   * Motor Analitic Bilingv (Implicit Română, Maghiară dacă interogarea a fost în maghiară)
   */
  private processRuleEngine(message: string, snap: any, lang: 'ro' | 'hu'): { answer: string; mood: RobotMood } {
    const q = message.toLowerCase().trim();

    // ==========================================
    // 1. RĂSPUNSURI ÎN LIMBA MAGHIARĂ (HU)
    // ==========================================
    if (lang === 'hu') {
      if (q.includes('szia') || q.includes('hello') || q.includes('üdv') || q.includes('ki vagy') || q.includes('neved') || q.includes('hívnak') || q.includes('robi')) {
        return {
          answer: `### 🤖 Szia! Robi vagyok, a te kedves és intelligens flottaasszisztens robotod!
Valós időben kapcsolom össze a cég teljes adatbázisát:
- **${snap.totalVehicule} járművet és gépet** a flottában
- **${snap.docExpirateCount} lejárt** és **${snap.docUrgenteCount} sürgős** okmányt (< 30 nap)
- **${snap.comenziDeschiseCount} nyitott munkalapot** a szervizben
- **${snap.stocCriticCount} készlethiányos alkatrészt** a raktárban

Miben segíthetek ma? Kérhetsz állapotjelentést, lejárati listát vagy alkatrész-elemzést! *(Beszélek románul és magyarul is!)*`,
          mood: 'happy',
        };
      }

      if (q.includes('okmány') || q.includes('akta') || q.includes('dokument') || q.includes('lejárt') || q.includes('itp') || q.includes('rca') || q.includes('roviniet') || q.includes('tahograf')) {
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

      if (q.includes('munkalap') || q.includes('szerviz') || q.includes('javítás') || q.includes('karbantart')) {
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

      if (q.includes('stoc') || q.includes('raktár') || q.includes('alkatrész') || q.includes('olaj') || q.includes('hiány')) {
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

      if (q.includes('flotta') || q.includes('riport') || q.includes('állapot') || q.includes('összesítés')) {
        let catList = Object.entries(snap.categoriiCount)
          .map(([k, v]) => `\`${k}\`: **${v} db**`)
          .join(', ');
        return {
          answer: `### 📊 Globális Flotta Állapotjelentés
- **Géppark mérete:** Összesen **${snap.totalVehicule} db** jármű regisztrálva.
- **Üzemkész járművek:** **${snap.vehiculeActive} db (${Math.round((snap.vehiculeActive / (snap.totalVehicule || 1)) * 100)}%)** aktív.
- **Megoszlás:** ${catList}
- **Okmányok:** **${snap.docExpirateCount} lejárt** ❌, **${snap.docUrgenteCount} hamarosan lejáró** ⚠️
- **Munkalapok:** **${snap.comenziDeschiseCount} nyitott javítás** 🔧
- **Raktárhiány:** **${snap.stocCriticCount} kritikus tétel** 📦`,
          mood: 'analyzing',
        };
      }
    }

    // ==========================================
    // 2. RĂSPUNSURI ÎN LIMBA ROMÂNĂ (RO - IMPLICIT)
    // ==========================================
    // Salut / Prezentare / Identitate
    if (q.includes('buna') || q.includes('salut') || q.includes('servus') || q.includes('cine esti') || q.includes('nume') || q.includes('robi') || q.includes('ajutor')) {
      return {
        answer: `### 🤖 Bună! Sunt Robi, asistentul tău robot prietenos de flotă!
Monitorizez și analizez în timp real întreaga bază de date a companiei:
- **${snap.totalVehicule} vehicule și utilaje** înregistrate în flotă
- **${snap.docExpirateCount} documente expirate** și **${snap.docUrgenteCount} urgente** (< 30 zile)
- **${snap.comenziDeschiseCount} comenzi de lucru deschise** în service
- **${snap.stocCriticCount} piese cu stoc critic** în depozit

Cu ce te pot ajuta astăzi? Îmi poți cere o analiză a actelor, a comenzilor sau un raport complet de flotă! *(Beszélek románul és magyarul is!)*`,
        mood: 'happy',
      };
    }

    // Acte & Valabilități (ITP, RCA, Rovinieta, Tahograf, Casco)
    if (q.includes('act') || q.includes('document') || q.includes('expirat') || q.includes('itp') || q.includes('rca') || q.includes('roviniet') || q.includes('tahograf') || q.includes('casco') || q.includes('valabilitat')) {
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

    // Comenzi de Lucru & Service
    if (q.includes('comanda') || q.includes('lucru') || q.includes('service') || q.includes('reparati') || q.includes('mentenanta') || q.includes('atelier') || q.includes('cost')) {
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

    // Stoc Piese & Lubrifianți
    if (q.includes('stoc') || q.includes('piese') || q.includes('ulei') || q.includes('filtru') || q.includes('depozit') || q.includes('critic') || q.includes('lipsa')) {
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

    // Raport Global Stare Flotă
    if (q.includes('flota') || q.includes('raport') || q.includes('stare') || q.includes('statistici') || q.includes('sumar') || q.includes('vehicul')) {
      let catList = Object.entries(snap.categoriiCount)
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

    // Răspuns implicit prietenos în Română
    return {
      answer: `### 🤖 Am înțeles întrebarea ta!
În baza de date a flotei am la dispoziție **${snap.totalVehicule} vehicule**, **${snap.comenziDeschiseCount} comenzi de lucru deschise** și **${snap.docExpirateCount} documente expirate**.

Pentru detalii imediate, încearcă una dintre întrebările rapide:
- *"Care sunt actele expirate în flotă?"*
- *"Ce piese sunt la nivel critic în depozit?"*
- *"Care este costul comenzilor de lucru deschise?"*
- *"Generează un raport complet al stării flotei!"*`,
      mood: 'thinking',
    };
  }
}

