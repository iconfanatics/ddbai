const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing admin role...');
  
  // Create SUPER_ADMIN role if not exists
  let role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (!role) {
    role = await prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
  }

  // Get admin user
  const admin = await prisma.user.findUnique({ where: { email: 'admin@visasync.com' } });
  
  // Get an org
  const org = await prisma.organization.findFirst();

  // Create membership
  await prisma.organizationMembership.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: org.id
      }
    },
    update: { roleId: role.id },
    create: {
      userId: admin.id,
      organizationId: org.id,
      roleId: role.id
    }
  });

  console.log('Admin is now SUPER_ADMIN!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

