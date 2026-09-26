const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const allUsers = await prisma.user.findMany({
    include: {
      organizations: {
        include: { role: true, organization: true }
      }
    }
  });
  console.log(JSON.stringify(allUsers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
