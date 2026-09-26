const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.application.findMany({
    include: { processingRun: true }
  });
  console.log(`Found ${apps.length} total applications.`);
  
  for (const app of apps) {
    if (app.processingRun) {
      console.log(`App ID: ${app.id}, Status: ${app.status}, ProcessingRun ID: ${app.processingRun.id}`);
    } else {
      console.log(`App ID: ${app.id}, Status: ${app.status}, NO processing run`);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
