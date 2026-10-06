import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'agent@visasync.com';
  const password = 'password123';
  
  const hashedPassword = await bcrypt.hash(password, 10);

  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'Agent',
      },
    });
    console.log(`Created agent user: ${email} / ${password}`);
  } else {
    console.log(`Agent user already exists: ${email}`);
  }

  // Ensure organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'VisaSync Global' } });
  }

  // Ensure AGENT role
  let agentRole = await prisma.role.findUnique({ where: { name: 'AGENT' } });
  if (!agentRole) {
    agentRole = await prisma.role.create({ data: { name: 'AGENT' } });
    console.log(`Created role: AGENT`);
  }

  // Ensure membership
  const mem = await prisma.organizationMembership.findFirst({
    where: { userId: user.id, roleId: agentRole.id }
  });
  if (!mem) {
    await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        roleId: agentRole.id
      }
    });
    console.log(`Assigned AGENT role to ${email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
