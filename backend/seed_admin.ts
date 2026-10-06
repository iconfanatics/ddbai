import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@visasync.com';
  const password = 'password123';
  
  const hashedPassword = await bcrypt.hash(password, 10);

  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Admin',
      },
    });
    console.log(`Created admin user: ${email} / ${password}`);
  } else {
    console.log(`Admin user already exists: ${email}`);
  }

  // Ensure organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'VisaSync Global' } });
    console.log(`Created organization: ${org.name}`);
  }

  // Ensure SUPER_ADMIN role
  let saRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (!saRole) {
    saRole = await prisma.role.create({ data: { name: 'SUPER_ADMIN', description: 'Super Administrator' } });
    console.log(`Created role: SUPER_ADMIN`);
  }

  // Ensure membership
  const mem = await prisma.organizationMembership.findFirst({
    where: { userId: user.id, roleId: saRole.id }
  });
  if (!mem) {
    await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        roleId: saRole.id
      }
    });
    console.log(`Assigned SUPER_ADMIN role to ${email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
