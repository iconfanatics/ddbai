const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Adding sample organizations and agents...');

  // Create Organizations
  const org1 = await prisma.organization.create({ data: { name: 'ShareTrip' } });
  const org2 = await prisma.organization.create({ data: { name: 'GoZayaan' } });
  
  const branch1 = await prisma.branch.create({ data: { name: 'Dhaka Main', organizationId: org1.id } });
  const branch2 = await prisma.branch.create({ data: { name: 'Sylhet Branch', organizationId: org2.id } });

  // Get AGENT role
  let agentRole = await prisma.role.findUnique({ where: { name: 'AGENT' } });
  if (!agentRole) agentRole = await prisma.role.create({ data: { name: 'AGENT' } });

  const passwordHash = await bcrypt.hash('agent123', 10);

  // Agent 1
  const a1 = await prisma.user.create({
    data: {
      email: 'sharetrip_agent1@test.com',
      password: passwordHash,
      firstName: 'Rahim',
      lastName: 'Uddin'
    }
  });
  await prisma.organizationMembership.create({
    data: {
      userId: a1.id,
      organizationId: org1.id,
      branchId: branch1.id,
      roleId: agentRole.id
    }
  });

  // Agent 2
  const a2 = await prisma.user.create({
    data: {
      email: 'gozayaan_agent1@test.com',
      password: passwordHash,
      firstName: 'Karim',
      lastName: 'Hasan'
    }
  });
  await prisma.organizationMembership.create({
    data: {
      userId: a2.id,
      organizationId: org2.id,
      branchId: branch2.id,
      roleId: agentRole.id
    }
  });

  console.log('Sample data added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

