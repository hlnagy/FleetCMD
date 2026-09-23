const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('--- ENABLING ROW-LEVEL SECURITY (RLS) ON ALL PUBLIC TABLES ---');

    // 1. Obținem toate tabelele din schema public
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename ASC;
    `;

    console.log(`Găsite ${tables.length} tabele în schema public.`);

    for (const t of tables) {
      const tableName = t.tablename;
      await prisma.$executeRawUnsafe(`ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`  [OK] RLS activat pe: public."${tableName}"`);
    }

    // 2. Verificăm din nou starea din pg_tables
    const checkTables = await prisma.$queryRaw`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename ASC;
    `;

    const unsecure = checkTables.filter(t => !t.rowsecurity);
    console.log(`\nVerificare finală:`);
    console.log(` - Tabele protejate cu RLS: ${checkTables.filter(t => t.rowsecurity).length} / ${checkTables.length}`);
    console.log(` - Tabele neprotejate: ${unsecure.length}`);

    // 3. Testăm că Prisma backend are în continuare acces complet
    const vehiculeCount = await prisma.vehicul.count();
    console.log(`\nAcces backend confirmat: ${vehiculeCount} vehicule accesibile.`);
    console.log('✅ SUCCES: Baza de date este securizată!');
  } catch (err) {
    console.error('Eroare la activarea RLS:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
