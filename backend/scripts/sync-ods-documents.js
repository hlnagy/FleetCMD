const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function normPlate(p) {
  if (!p) return '';
  return p.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function main() {
  console.log('=== PORNIRE ACTUALIZARE DATE VALABILITATE DOCUMENTE FLOTĂ ===');
  console.log('Fișier sursă: C:\\Users\\user\\Downloads\\Valabilitate acte masini 2025.ods\n');

  const jsonPath = path.resolve('C:\\Users\\user\\.gemini\\antigravity\\brain\\f8a14a83-62ac-4c5c-9dd4-b5092be5593b\\scratch\\ods_documents.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Fișierul JSON procesat nu există la calea: ${jsonPath}`);
  }

  const odsDocs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Încărcat ${odsDocs.length} înregistrări documente din fișierul ODS.`);

  // 1. Verificare categorii vehicule în baza de date
  const categorii = await prisma.categorieVehicul.findMany();
  const catNames = new Set(categorii.map(c => c.nume));
  console.log('Categorii vehicule disponibile în BD:', Array.from(catNames));

  let semiremorcaCat = Array.from(catNames).find(c => c.toUpperCase().includes('SEMIREMORC')) || 'SEMIREMORCA';
  if (!catNames.has(semiremorcaCat)) {
    semiremorcaCat = categorii[0]?.nume || 'AUTOUTILITARA';
  }

  // 2. Încărcare vehicule din PostgreSQL
  let liveVehicles = await prisma.vehicul.findMany();
  console.log(`Vehicule active în baza de date PostgreSQL: ${liveVehicles.length}`);

  const vehMap = new Map();
  for (const v of liveVehicles) {
    const p1 = normPlate(v.numarInmatriculare);
    const p2 = normPlate(v.numarIntern);
    if (p1) vehMap.set(p1, v);
    if (p2) vehMap.set(p2, v);
  }

  // 3. Creare B 03 RLX dacă lipsește
  const rlxNorm = normPlate('B 03 RLX');
  if (!vehMap.has(rlxNorm)) {
    console.log(`Vehiculul 'B 03 RLX' lipsește din baza live. Se creează ca ${semiremorcaCat}...`);
    const newVeh = await prisma.vehicul.create({
      data: {
        numarInmatriculare: 'B 03 RLX',
        numarIntern: 'B 03 RLX',
        marca: 'SCHMITZ',
        model: 'Semiremorcă',
        anFabricatie: 2021,
        categorieEnum: semiremorcaCat,
        tipMasurare: 'KM',
        stare: 'ACTIV',
      }
    });
    console.log(`Vehicul creat cu succes: ID=${newVeh.id}, Inmatriculare=${newVeh.numarInmatriculare}`);
    vehMap.set(rlxNorm, newVeh);
    liveVehicles.push(newVeh);
  }

  // 4. Sincronizare în PostgreSQL (Supabase)
  console.log('\n--- Sincronizare Documente în Supabase PostgreSQL ---');
  let createdPg = 0;
  let updatedPg = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const changesLog = [];

  for (const doc of odsDocs) {
    const pNorm = normPlate(doc.rawVeh);
    const targetVeh = vehMap.get(pNorm);

    if (!targetVeh) {
      console.warn(`[AVERTISMENT] Vehicul negăsit: ${doc.rawVeh}`);
      continue;
    }

    const expDate = new Date(`${doc.dataExpirare}T00:00:00.000Z`);
    const stare = expDate < today ? 'EXPIRAT' : 'ACTIV';

    // Verifică document existent
    const existing = await prisma.documentVehicul.findUnique({
      where: {
        vehiculId_tipDocument: {
          vehiculId: targetVeh.id,
          tipDocument: doc.tipDocument,
        }
      }
    });

    if (existing) {
      const oldExp = existing.dataExpirare ? existing.dataExpirare.toISOString().split('T')[0] : 'N/A';
      const isDateChanged = oldExp !== doc.dataExpirare;
      const isStareChanged = existing.stare !== stare;

      await prisma.documentVehicul.update({
        where: { id: existing.id },
        data: {
          dataExpirare: expDate,
          stare: stare,
          observatii: existing.observatii ? `${existing.observatii}; ${doc.observatii}` : doc.observatii,
        }
      });
      updatedPg++;
      if (isDateChanged || isStareChanged) {
        changesLog.push({
          vehicul: targetVeh.numarInmatriculare,
          tip: doc.tipDocument,
          action: 'MODIFICAT',
          oldExp,
          newExp: doc.dataExpirare,
          stare,
        });
      }
    } else {
      await prisma.documentVehicul.create({
        data: {
          vehiculId: targetVeh.id,
          tipDocument: doc.tipDocument,
          dataExpirare: expDate,
          zileAvertizareInainte: 30,
          stare: stare,
          observatii: doc.observatii,
        }
      });
      createdPg++;
      changesLog.push({
        vehicul: targetVeh.numarInmatriculare,
        tip: doc.tipDocument,
        action: 'CREAT',
        oldExp: '—',
        newExp: doc.dataExpirare,
        stare,
      });
    }
  }

  console.log(`\nPostgreSQL Sincronizare completă:`);
  console.log(` - Documente actualizate: ${updatedPg}`);
  console.log(` - Documente noi create: ${createdPg}`);
  console.log(` - Total documente procesate din ODS: ${updatedPg + createdPg}`);

  // 5. Raport rezumat modificări

  // 6. Raport rezumat modificări
  console.log(`\n======================================================`);
  console.log(`REZUMAT FINAL: ${changesLog.length} ACTUALIZĂRI DE TERMENE EXECUTATE`);
  console.log(`======================================================`);
  console.log('Primele 20 de termene actualizate/înregistrate:');
  for (const c of changesLog.slice(0, 20)) {
    console.log(`  [${c.action}] ${c.vehicul.padEnd(12)} | ${c.tip.padEnd(18)} | Expirare: ${c.oldExp} -> ${c.newExp} (${c.stare})`);
  }
}

main()
  .catch((err) => {
    console.error('EROARE LA SINCRONIZARE:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
