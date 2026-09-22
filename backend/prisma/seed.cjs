const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample data...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@visasync.com' },
    update: {},
    create: {
      email: 'admin@visasync.com',
      password: passwordHash,
      firstName: 'Main',
      lastName: 'Admin'
    }
  });

  const org = await prisma.organization.create({
    data: {
      name: 'VisaSync Global',
    }
  });

  const branch = await prisma.branch.create({
    data: {
      name: 'Dhaka HQ',
      organizationId: org.id
    }
  });

  const route = await prisma.visaRoute.create({
    data: {
      country: 'UAE',
      category: 'Tourist',
      routeName: 'Dubai 30 Days Tourist',
      servicePackage: 'Standard',
      price: 150.00
    }
  });

  const center = await prisma.visaCenter.create({
    data: {
      name: 'Dubai VFS Dhaka',
      location: 'Gulshan 1, Dhaka'
    }
  });

  console.log('Sample data seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
