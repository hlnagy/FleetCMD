import { PrismaService } from './src/prisma/prisma.service';
import { VehiculeService } from './src/vehicule/vehicule.service';

const prisma = new PrismaService();

async function runCouplingE2ETests() {
  console.log('🧪 Rulare teste E2E: Management Cuplare Cap Tractor - Semiremorcă & Calcul Dinamic KM...\n');

  const vehiculeService = new VehiculeService(prisma);

  // Curățare date de test anterioare dacă există
  await prisma.istoricCuplare.deleteMany({
    where: {
      OR: [
        { capTractor: { numarIntern: { in: ['TEST-TR-01', 'TEST-TR-02'] } } },
        { semiremorca: { numarIntern: { in: ['TEST-SEMI-01'] } } },
      ],
    },
  });

  await prisma.istoricContorVehicul.deleteMany({
    where: {
      vehicul: { numarIntern: { in: ['TEST-TR-01', 'TEST-TR-02', 'TEST-SEMI-01'] } },
    },
  });

  await prisma.vehicul.deleteMany({
    where: {
      numarIntern: { in: ['TEST-TR-01', 'TEST-TR-02', 'TEST-SEMI-01'] },
    },
  });

  // 1. Creare vehicule de test
  console.log('1️⃣ Creare vehicule de test: Cap Tractor X, Cap Tractor Y, Semiremorca A');
  
  const capTractorX = await vehiculeService.createVehicul({
    numarIntern: 'TEST-TR-01',
    numarInmatriculare: 'B-100-TRX',
    categorieEnum: 'CAP_TRACTOR',
    marca: 'Volvo',
    model: 'FH16',
    anFabricatie: 2022,
    tipMasurare: 'KM',
    valoareContorCurent: 100000,
  });

  const capTractorY = await vehiculeService.createVehicul({
    numarIntern: 'TEST-TR-02',
    numarInmatriculare: 'B-200-TRY',
    categorieEnum: 'CAP_TRACTOR',
    marca: 'MAN',
    model: 'TGX',
    anFabricatie: 2021,
    tipMasurare: 'KM',
    valoareContorCurent: 200000,
  });

  const semiremorcaA = await vehiculeService.createVehicul({
    numarIntern: 'TEST-SEMI-01',
    numarInmatriculare: 'B-500-SMA',
    categorieEnum: 'SEMIREMORCA',
    marca: 'Schmitz',
    model: 'Cargobull',
    anFabricatie: 2020,
    tipMasurare: 'KM',
    valoareContorCurent: 50000,
  });

  console.log(`   - Cap Tractor X: ${capTractorX.numarInmatriculare} (${capTractorX.valoareContorCurent} KM)`);
  console.log(`   - Cap Tractor Y: ${capTractorY.numarInmatriculare} (${capTractorY.valoareContorCurent} KM)`);
  console.log(`   - Semiremorca A: ${semiremorcaA.numarInmatriculare} (${semiremorcaA.valoareContorCurent} KM)`);
  console.log('   ✅ Vehicule create cu succes.\n');

  // 2. Cuplare Cap Tractor X (100.000 KM) cu Semiremorca A (50.000 KM)
  console.log('2️⃣ Cuplare Cap Tractor X cu Semiremorca A');
  const resCuplare1 = await vehiculeService.cupleazaAnsamblu(capTractorX.id, semiremorcaA.id);
  console.log(`   - ${resCuplare1.mesaj}`);
  console.log(`   - KM început cuplare: ${resCuplare1.cuplare.kmInceputTractor} KM`);

  const activeCouplings1 = await vehiculeService.getCuplariActive();
  console.log(`   - Cuplări active în sistem: ${activeCouplings1.length}`);
  if (activeCouplings1.length !== 1) {
    throw new Error('❌ Eroare: Trebuia să existe exact 1 cuplare activă!');
  }
  console.log('   ✅ Cuplare inițială validată.\n');

  // 3. Cap Tractor X parcurge 2.000 KM (KM nou = 102.000 KM)
  console.log('3️⃣ Înregistrare 2.000 KM parcurși de Cap Tractor X (100.000 -> 102.000 KM)');
  await vehiculeService.inregistreazaContorManual({
    vehiculId: capTractorX.id,
    valoareContor: 102000,
    operator: 'Șofer Vasile',
    observatii: 'Cursă București - Cluj',
  });

  const semiremorcaA_dupa_curs1 = await vehiculeService.getVehiculById(semiremorcaA.id);
  console.log(`   - Verificare Semiremorca A contor nou: ${semiremorcaA_dupa_curs1.valoareContorCurent} KM (Așteptat: 52000 KM)`);
  if (semiremorcaA_dupa_curs1.valoareContorCurent !== 52000) {
    throw new Error(`❌ Eroare: Semiremorca A trebuia să aibă 52.000 KM, dar are ${semiremorcaA_dupa_curs1.valoareContorCurent} KM!`);
  }
  console.log('   ✅ Calcul dinamic KM Semiremorca A validat (+2.000 KM)!\n');

  // 4. Decuplare Semiremorca A și cuplare la Cap Tractor Y (KM = 200.000)
  console.log('4️⃣ Decuplare Semiremorca A și cuplare la Cap Tractor Y');
  const resCuplare2 = await vehiculeService.cupleazaAnsamblu(capTractorY.id, semiremorcaA.id);
  console.log(`   - ${resCuplare2.mesaj}`);

  const activeCouplings2 = await vehiculeService.getCuplariActive();
  console.log(`   - Cuplări active în sistem după schimbare: ${activeCouplings2.length}`);
  if (activeCouplings2.length !== 1) {
    throw new Error('❌ Eroare: Ansamblul anterior trebuia decuplat automat!');
  }
  const istoric = await vehiculeService.getIstoricCuplari(semiremorcaA.id);
  console.log(`   - Istoric cuplări Semiremorca A: ${istoric.length} înregistrări`);
  console.log(`     * Cuplare 1: Tractor X | KM Parcurși Ansamblu: ${istoric[1].kmParcursiAnsa} KM (Activ: ${istoric[1].esteActiv})`);
  console.log(`     * Cuplare 2: Tractor Y | KM Început: ${istoric[0].kmInceputTractor} KM (Activ: ${istoric[0].esteActiv})`);
  console.log('   ✅ Schimbare ansamblu și decuplare automată validată.\n');

  // 5. Cap Tractor Y parcurge 1.500 KM (KM nou = 201.500 KM)
  console.log('5️⃣ Înregistrare 1.500 KM parcurși de Cap Tractor Y (200.000 -> 201.500 KM)');
  await vehiculeService.inregistreazaContorManual({
    vehiculId: capTractorY.id,
    valoareContor: 201500,
    operator: 'Șofer Ion',
    observatii: 'Cursă Timișoara - Arad',
  });

  const semiremorcaA_final = await vehiculeService.getVehiculById(semiremorcaA.id);
  console.log(`   - Verificare Semiremorca A contor final: ${semiremorcaA_final.valoareContorCurent} KM (Așteptat: 53500 KM)`);
  if (semiremorcaA_final.valoareContorCurent !== 53500) {
    throw new Error(`❌ Eroare: Semiremorca A trebuia să aibă 53.500 KM, dar are ${semiremorcaA_final.valoareContorCurent} KM!`);
  }
  console.log('   ✅ Calcul dinamic KM continuu Semiremorca A validat (52.000 + 1.500 = 53.500 KM)!\n');

  // Curățare vehicule de test
  await prisma.istoricCuplare.deleteMany({
    where: {
      OR: [
        { capTractorId: { in: [capTractorX.id, capTractorY.id] } },
        { semiremorcaId: semiremorcaA.id },
      ],
    },
  });
  await prisma.istoricContorVehicul.deleteMany({
    where: { vehiculId: { in: [capTractorX.id, capTractorY.id, semiremorcaA.id] } },
  });
  await prisma.vehicul.deleteMany({
    where: { id: { in: [capTractorX.id, capTractorY.id, semiremorcaA.id] } },
  });

  console.log('🎉 TOATE TESTELE E2E PENTRU MANAGEMENT CUPLARE ȘI KM DINAMICI AU TRECUT CU SUCCES!');
}

runCouplingE2ETests()
  .catch((e) => {
    console.error('❌ EROARE TEST E2E:', e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
