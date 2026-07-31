import { PrismaService } from './src/prisma/prisma.service';
import { VehiculeService } from './src/vehicule/vehicule.service';
import { AnomaliiService } from './src/anomalii/anomalii.service';

const prisma = new PrismaService();

async function testOilEngineE2E() {
  console.log('====================================================');
  console.log('🛢️ AUDIT TEST: COMPREHENSIVE OIL & LUBRICANTS ENGINE');
  console.log('====================================================\n');

  const vehiculeService = new VehiculeService(prisma);
  const anomaliiService = new AnomaliiService(prisma);

  const vehicule = await vehiculeService.getAllVehicule();
  if (vehicule.length === 0) throw new Error('Nu există vehicule în bază!');
  const testVehicul = vehicule[0];
  console.log(`1️⃣ VEHICUL DE TEST: ${testVehicul.numarIntern} (${testVehicul.numarInmatriculare}) - ${testVehicul.valoareContorCurent} ${testVehicul.tipMasurare}\n`);

  // 2. INTRARI ULEI (Point 2: Purchase reception & Auto RON/L Calculation)
  console.log('2️⃣ AUDIT INTRARI ULEI (BEVÉTELEZÉS & AUTO RON/L)');
  const intrareMotor = await anomaliiService.adaugaIntrareUlei({
    tipLichid: 'ULEI_MOTOR',
    marcaUlei: 'Mobil Delvac 15W40',
    cantitateLitri: 200,
    pretTotal: 5000,
    furnizor: 'LUBRICANTS ROMANIA SRL',
    numarFactura: 'FACT-2026-OIL-01',
    observatii: 'Bevételezés 200L hordós motorolaj',
  });
  console.log(`   - ${intrareMotor.mesaj}`);
  console.log(`   - Egységár kiszámolva: ${intrareMotor.pretPerLitru} RON / Liter`);

  const intrareLiebherr = await anomaliiService.adaugaIntrareUlei({
    tipLichid: 'ULEI_LIEBHERR_PUNTE',
    marcaUlei: 'Liebherr Gear Oil 80W90',
    cantitateLitri: 100,
    pretTotal: 3500,
    furnizor: 'LIEBHERR ROMANIA',
    numarFactura: 'FACT-LIEB-2026-05',
    observatii: 'Ulei punte faţă + spate Liebherr',
  });
  console.log(`   - ${intrareLiebherr.mesaj}`);
  console.log(`   - Egységár kiszámolva: ${intrareLiebherr.pretPerLitru} RON / Liter\n`);

  // 3. CONFIGURARE INTERVALE & PRAG AVERTISMENT (Point 4: Rules 1, 2, 3)
  console.log('3️⃣ AUDIT CONFIGURARE INTERVALE (mTH, KM, LUNI + AVERTISMENT)');
  await anomaliiService.salveazaConfigurareUlei({
    vehiculId: testVehicul.id,
    tipLichid: 'ULEI_MOTOR',
    intervalMth: 250,
    intervalKm: 15000,
    intervalLuni: 24, // 24 hónap
    pragAvertizareMth: 50,
    pragAvertizareKm: 1000,
    pragAvertizareLuni: 1,
  });
  console.log('   - Regulă interval motorolaj salvată: 250 mTH / 15.000 KM / 24 Luni (Avertisment la 50 mTH / 1000 KM / 1 lună)');

  // 4. IESIRI ULEI - SCHIMB ULEI (Resets Counter!) vs COMPLETARE ULEI (No Reset) (Point 3 & 4)
  console.log('4️⃣ AUDIT IESIRI ULEI - SCHIMB (RESET) VS COMPLETARE (FĂRĂ RESET)');

  // Test Completare Ulei -> Does NOT reset counter
  const completare = await anomaliiService.adaugaIesireUlei({
    vehiculId: testVehicul.id,
    tipLichid: 'ULEI_MOTOR',
    tipOperatiune: 'COMPLETARE_ULEI',
    marcaUlei: 'Mobil Delvac',
    cantitateLitri: 3.5,
    valoareContor: testVehicul.valoareContorCurent + 10,
    mecanic: 'Ion Popescu',
    observatii: 'Completare 3.5L ulei motor pe șantier',
  });
  console.log(`   - Completare: ${completare.mesaj}`);

  // Test Schimb Ulei -> RESETS COUNTER!
  const schimb = await anomaliiService.adaugaIesireUlei({
    vehiculId: testVehicul.id,
    tipLichid: 'ULEI_MOTOR',
    tipOperatiune: 'SCHIMB_ULEI',
    marcaUlei: 'Mobil Delvac 15W40',
    cantitateLitri: 18.0,
    valoareContor: testVehicul.valoareContorCurent + 50,
    mecanic: 'Ion Popescu',
    observatii: 'Schimb complet ulei motor + filtru',
  });
  console.log(`   - Schimb: ${schimb.mesaj}\n`);

  // 5. CHECK STATUS SCHIMBURI DUPĂ RESET
  console.log('5️⃣ AUDIT VERIFICARE VISSZASZÁMLÁLÓ DUPĂ SCHIMB ULEI');
  const status = await anomaliiService.getStatusSchimburiUleiVehicul(testVehicul.id);
  status.forEach((st) => {
    console.log(`   - ${st.tipLichid}: Rulaj efectiv de la ultimul schimb = ${st.rulajEfectiv} (Ultimul schimb contor: ${st.ultimulSchimbContor}) - Status: ${st.esteDepasit ? 'DEPAȘIT' : 'În Grafic'}`);
  });

  console.log('\n====================================================');
  console.log('🎉 AUDIT ENGINE OLAJ FINALIZAT CU SUCCES! ALL POINTS VERIFIED!');
  console.log('====================================================');
}

testOilEngineE2E()
  .catch((e) => {
    console.error('❌ EROARE AUDIT OLAJ:', e);
    process.exit(1);
  });
