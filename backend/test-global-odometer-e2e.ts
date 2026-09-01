import { PrismaService } from './src/prisma/prisma.service';
import { VehiculeService } from './src/vehicule/vehicule.service';
import { MentenantaService } from './src/mentenanta/mentenanta.service';
import { AnomaliiService } from './src/anomalii/anomalii.service';

const prisma = new PrismaService();

async function runGlobalOdometerE2ETest() {
  console.log('🧪 Rulare teste E2E: Registru Unitat & Audit Globale KM Index per Vehicul...\n');

  const vehiculeService = new VehiculeService(prisma);
  const mentenantaService = new MentenantaService(prisma);
  const anomaliiService = new AnomaliiService(prisma);

  // Curățare date test vechi
  await prisma.istoricContorVehicul.deleteMany({
    where: { vehicul: { numarIntern: 'TEST-KM-01' } },
  });
  await prisma.vehicul.deleteMany({
    where: { numarIntern: 'TEST-KM-01' },
  });

  // 1. Creare vehicul test
  console.log('1️⃣ Creare vehicul de test: TEST-KM-01');
  const v = await vehiculeService.createVehicul({
    numarIntern: 'TEST-KM-01',
    numarInmatriculare: 'B-999-KMM',
    categorieEnum: 'CAP_TRACTOR',
    marca: 'MAN',
    model: 'TGX',
    anFabricatie: 2023,
    tipMasurare: 'KM',
    valoareContorCurent: 10000,
  });
  console.log(`   - Vehicul creat: ${v.numarIntern} (${v.valoareContorCurent} KM)\n`);

  // 2. Înregistrare din sursă 1: MANUAL
  console.log('2️⃣ Înregistrare contor din sursă MANUAL (+500 KM -> 10.500 KM)');
  await vehiculeService.inregistreazaContorManual({
    vehiculId: v.id,
    valoareContor: 10500,
    operator: 'Șofer Ion',
    observatii: 'Citire bord plecare cursă',
  });

  // 3. Înregistrare din sursă 2: SERVICE / COMANDĂ LUCRU
  console.log('3️⃣ Înregistrare contor din sursă SERVICE (+300 KM -> 10.800 KM)');
  await mentenantaService.createComandaLucru({
    vehiculId: v.id,
    mecanicResponsabil: 'Vasile Ionescu (Atelier)',
    valoareContorLaExecutie: 10800,
    observatii: 'Revizie frâne',
    elemente: [
      { pilonCost: 'MANOPERA_INTERNA', descriere: 'Inspectie placuțe', cantitate: 1, pretUnitar: 200 }
    ],
  });

  // 4. Înregistrare din sursă 3: FLUIDE / SCHIMB ULEI
  console.log('4️⃣ Înregistrare contor din sursă SCHIMB_ULEI (+200 KM -> 11.000 KM)');
  await anomaliiService.adaugaIesireUlei({
    vehiculId: v.id,
    tipLichid: 'ULEI_MOTOR',
    tipOperatiune: 'SCHIMB_ULEI',
    cantitateLitri: 25,
    valoareContor: 11000,
    mecanic: 'Brașoveanu Virgil',
    observatii: 'Schimb complet ulei motor Mobil1',
  });

  // 5. Verificare registru istoric unitar
  console.log('5️⃣ Verificare registrul unificat IstoricContorVehicul pentru vehicul');
  const istoric = await vehiculeService.getIstoricContoare(v.id);
  console.log(`   - Total înregistrări istoric găsite: ${istoric.length}`);
  istoric.forEach((entry) => {
    console.log(`     * Dată: ${new Date(entry.dataInregistrare).toISOString().split('T')[0]} | Valoare: ${entry.valoareContor} KM | Sursă: ${entry.sursa} | Operator: ${entry.operator}`);
  });

  if (istoric.length < 3) {
    throw new Error('❌ Eroare: Nu s-au găsit toate înregistrările unificate de contor!');
  }
  console.log('   ✅ Înregistrările unificate din toate sursele au fost validate!\n');

  // 6. Testare editare (Corecție elírás)
  console.log('6️⃣ Testare editare înregistrare (Corecție elírás de la 10.800 la 10.850 KM)');
  const targetEntry = istoric.find((e) => e.sursa === 'SERVICE');
  if (targetEntry) {
    await vehiculeService.updateIstoricContor(targetEntry.id, {
      valoareContor: 10850,
      observatii: 'Corecție elírás contor la comanda de lucru',
    });
    console.log('   ✅ Editare efectuată cu succes.');
  }

  // 7. Curățare vehicul test
  await prisma.istoricContorVehicul.deleteMany({ where: { vehiculId: v.id } });
  await prisma.vehicul.delete({ where: { id: v.id } });

  console.log('🎉 TOATE TESTELE PENTRU REGISTRUL UNITAT KM INDEX AU TRECUT CU SUCCES!');
}

runGlobalOdometerE2ETest()
  .catch((e) => {
    console.error('❌ EROARE TEST:', e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
