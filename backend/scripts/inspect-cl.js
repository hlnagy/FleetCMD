const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const comenzi = await prisma.comandaLucru.findMany({
    where: { numarComanda: { in: ['CL-00007', 'CL-00008'] } },
    include: {
      vehicul: true,
      elementeComanda: true,
    },
  });

  console.log(JSON.stringify(comenzi.map((c) => ({
    id: c.id,
    numarComanda: c.numarComanda,
    stare: c.stare,
    vehicul: c.vehicul?.numarInmatriculare,
    elemente: c.elementeComanda.map((e) => ({
      id: e.id,
      descriere: e.descriere,
      cantitate: e.cantitate,
      pretUnitar: e.pretUnitar,
      costTotal: e.costTotal,
      pilonCost: e.pilonCost,
      numarFactura: e.numarFactura,
    })),
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
