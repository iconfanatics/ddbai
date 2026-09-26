const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const routes = await prisma.configuredRoute.findMany();
  console.log("Routes:", routes.map(r => ({ id: r.id, from: r.fromCountry, to: r.toCountry, center: r.visaCenter, face: r.faceVerificationRequired })));
  
  const apps = await prisma.application.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { customer: { include: { user: true } } }
  });
  console.log("Recent Apps:", apps.map(a => ({ name: a.customer.user.firstName, from: a.fromCountry, to: a.targetCountry, center: a.applicationCenter, face: a.faceVerificationRequired })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
