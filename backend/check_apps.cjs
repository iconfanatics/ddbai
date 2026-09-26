const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.application.findMany();
  console.log(apps.map(a => ({ id: a.id, route: `${a.fromCountry} -> ${a.targetCountry}`, faceReq: a.faceVerificationRequired })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
