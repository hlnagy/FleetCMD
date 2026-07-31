import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Curățare bază de date și populare cu date demonstrative...');

  // Ștergere date vechi
  await prisma.fisaReclamatieGarantie.deleteMany();
  await prisma.componentaSerializata.deleteMany();
  await prisma.intrareStoc.deleteMany();
  await prisma.elementComandaLucru.deleteMany();
  await prisma.comandaLucru.deleteMany();
  await prisma.sarcinaMentenanta.deleteMany();
  await prisma.profilMentenantaVehicul.deleteMany();
  await prisma.profilMentenanta.deleteMany();
  await prisma.masurareUzuraAnvelopa.deleteMany();
  await prisma.anvelopa.deleteMany();
  await prisma.pozitieAx.deleteMany();
  await prisma.completareLichid.deleteMany();
  await prisma.configurareUleiVehicul.deleteMany();
  await prisma.istoricContorVehicul.deleteMany();
  await prisma.vehicul.deleteMany();
  await prisma.categoriePersonalizata.deleteMany();
  await prisma.categorieStoc.deleteMany();
  await prisma.articolStoc.deleteMany();

  // 1. Categorie Personalizată
  const catForaj = await prisma.categoriePersonalizata.create({
    data: {
      nume: 'Utilaje Foraj Greu',
      descriere: 'Garnituri și foreze de adâncime',
    },
  });

  // 2. Vehicule Flotă Demonstrativă
  const volvo = await prisma.vehicul.create({
    data: {
      numarIntern: 'UTIL-01',
      numarInmatriculare: 'B-101-VLV',
      vin: 'YV2V1234567890VOLVO',
      marca: 'VOLVO',
      model: 'A40G (Basculantă Articulată)',
      anFabricatie: 2021,
      categorieEnum: 'BASCULANTA',
      tipMasurare: 'MTH',
      valoareContorCurent: 3450,
      valoareContorInitial: 3000,
      dataContorInitial: new Date('2025-01-10'),
      tarifOrarManopera: 150,
    },
  });

  const cat = await prisma.vehicul.create({
    data: {
      numarIntern: 'EXC-02',
      numarInmatriculare: 'B-202-CAT',
      vin: 'CAT330DL123456789',
      marca: 'CATERPILLAR',
      model: 'CAT 330 (Excavator Pe Senile)',
      anFabricatie: 2020,
      categorieEnum: 'EXCAVATOR',
      tipMasurare: 'MTH',
      valoareContorCurent: 5200,
      valoareContorInitial: 4800,
      dataContorInitial: new Date('2024-11-15'),
      tarifOrarManopera: 160,
    },
  });

  const man = await prisma.vehicul.create({
    data: {
      numarIntern: 'CAM-03',
      numarInmatriculare: 'B-303-MAN',
      vin: 'WMA123456789MAN8X4',
      marca: 'MAN',
      model: 'TGS 41.480 8x4 (Basculantă)',
      anFabricatie: 2022,
      categorieEnum: 'BASCULANTA',
      tipMasurare: 'KM',
      valoareContorCurent: 142500,
      valoareContorInitial: 120000,
      dataContorInitial: new Date('2024-06-01'),
      tarifOrarManopera: 140,
    },
  });

  // 3. Profil Mentenanță Preventivă & Sarcini (Superseding Logic)
  const profilBasculante = await prisma.profilMentenanta.create({
    data: {
      nume: 'Plan Standard Basculante Grele 8x4 & Articulate',
      categorieEnum: 'BASCULANTA',
      sarcini: {
        create: [
          {
            nume: 'Schimb Filtru Aer Motor & Ulei',
            tipSarcina: 'SCHIMB_PIESA',
            tipMasurare: 'MTH',
            intervalRulaj: 500,
            ultimulRulajExecutie: 4400,
          },
        ],
      },
    },
  });

  const sarcinaSchimb = await prisma.sarcinaMentenanta.findFirst({
    where: { nume: 'Schimb Filtru Aer Motor & Ulei' },
  });

  if (sarcinaSchimb) {
    await prisma.sarcinaMentenanta.create({
      data: {
        nume: 'Suflare Filtru Aer & Gresare Articulații',
        tipSarcina: 'INSPECTIE_MANOPERA',
        tipMasurare: 'MTH',
        intervalRulaj: 50,
        ultimulRulajExecutie: 4400,
        sarcinSuperioaraId: sarcinaSchimb.id, // Legătură ierarhică
        vehiculId: man.id,
      },
    });
  }

  // 4. Configurare Olaj & Lubrifianți
  await prisma.configurareUleiVehicul.create({
    data: {
      vehiculId: volvo.id,
      tipLichid: 'ULEI_MOTOR',
      intervalMth: 250,
      intervalLuni: 12,
      ultimulSchimbContor: 3300,
      ultimulSchimbData: new Date('2026-03-01'),
    },
  });

  await prisma.configurareUleiVehicul.create({
    data: {
      vehiculId: volvo.id,
      tipLichid: 'ULEI_HIDRAULIC',
      intervalMth: 500,
      intervalLuni: 24,
      ultimulSchimbContor: 3000,
      ultimulSchimbData: new Date('2025-06-01'),
    },
  });

  // 5. Stocuri & Componente Serializate
  const filtruAer = await prisma.articolStoc.create({
    data: {
      codArticol: 'FLT-AIR-VOLVO',
      denumire: 'Filtru Aer Motor High Performance Volvo A40G',
      categorie: 'Filtre',
      stocCurent: 12,
      stocMinim: 3,
      pretUnitar: 450,
      unitateMasura: 'buc',
    },
  });

  const uleiHidraulic = await prisma.articolStoc.create({
    data: {
      codArticol: 'OIL-HID-MOBIL',
      denumire: 'Ulei Hidraulic Mobil DTE 25 HLP 46',
      categorie: 'Lubrifianți',
      marcaUlei: 'Mobil',
      stocCurent: 400,
      stocMinim: 50,
      pretUnitar: 25,
      unitateMasura: 'L',
    },
  });

  const turbinaGarett = await prisma.articolStoc.create({
    data: {
      codArticol: 'TRB-GAR-CAT',
      denumire: 'Turbosuflantă Garrett GT3582R',
      categorie: 'Componente Motor Majore',
      stocCurent: 2,
      stocMinim: 1,
      pretUnitar: 4200,
      unitateMasura: 'buc',
      esteSerializat: true,
    },
  });

  // Instanță Componentă Serializată Montată pe CAT 330
  await prisma.componentaSerializata.create({
    data: {
      articolStocId: turbinaGarett.id,
      serieUnica: 'SN-GARRETT-99882211',
      furnizor: 'GARRETT TURBO ROMANIA',
      numarFactura: 'FACT-2025-0099',
      pretAchizitie: 4200,
      vehiculId: cat.id,
      dataMontat: new Date('2025-02-01'),
      valoareContorMontat: 4800,
      garantieProducatorKm: 2000, // 2000 mTH garanție
      garantieProducatorLuni: 24,
      inGarantie: true,
    },
  });

  // 6. Anvelope & Pozitii Axe pentru MAN 8x4
  const anvelopaSS1 = await prisma.anvelopa.create({
    data: {
      codDot: 'DOT-2024-MICHELIN-01',
      marca: 'MICHELIN',
      model: 'X-WORKS D',
      dimensiune: '315/80 R22.5',
      adancimeInitialaMm: 18.0,
      adancimeCurentaMm: 14.0,
      pretAchizitie: 2200,
      stare: 'MONTATA',
      vehiculId: man.id,
      kilometrajMontare: 120000,
      rulajTotalKm: 22500,
    },
  });

  const anvelopaDS1 = await prisma.anvelopa.create({
    data: {
      codDot: 'DOT-2024-MICHELIN-02',
      marca: 'MICHELIN',
      model: 'X-WORKS D',
      dimensiune: '315/80 R22.5',
      adancimeInitialaMm: 18.0,
      adancimeCurentaMm: 9.0, // Differenta uzura >30% -> Directie defectuoasa warning!
      pretAchizitie: 2200,
      stare: 'MONTATA',
      vehiculId: man.id,
      kilometrajMontare: 120000,
      rulajTotalKm: 22500,
    },
  });

  const ax1 = await prisma.pozitieAx.findUnique({
    where: { vehiculId_codPozitie: { vehiculId: man.id, codPozitie: 'T1-SS' } },
  });
  if (ax1) await prisma.anvelopa.update({ where: { id: anvelopaSS1.id }, data: { pozitieAxId: ax1.id } });

  const ax2 = await prisma.pozitieAx.findUnique({
    where: { vehiculId_codPozitie: { vehiculId: man.id, codPozitie: 'T1-DS' } },
  });
  if (ax2) await prisma.anvelopa.update({ where: { id: anvelopaDS1.id }, data: { pozitieAxId: ax2.id } });

  // 7. Scurgere de ulei simulată pe Volvo A40G
  await prisma.completareLichid.create({
    data: {
      vehiculId: volvo.id,
      tipLichid: 'ULEI_HIDRAULIC',
      cantitateLitri: 7.5,
      valoareContor: 3420,
      mecanic: 'Ion Popescu (Atelier)',
      observatii: 'S-a completat peste pragul de 5L în <100mTH. Posibilă scurgere pe șantier!',
      alertaScurgereGenerata: true,
      stareAlerta: 'NOUA',
    },
  });

  console.log('✅ Populare cu succes! Baza de date conține flotă, stocuri, anvelope és olajbevételezések.');
}

main()
  .catch((e) => {
    console.error('❌ Eroare la seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
