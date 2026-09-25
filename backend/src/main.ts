import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

import { PrismaClient } from '@prisma/client';

async function ensureSuperAdmin() {
  const prisma = new PrismaClient();
  try {
    let saRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!saRole) {
      saRole = await prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
    }
    const admin = await prisma.user.findUnique({ where: { email: 'admin@visasync.com' } });
    if (admin) {
      const mem = await prisma.organizationMembership.findFirst({
        where: { userId: admin.id, roleId: saRole.id }
      });
      if (!mem) {
        let org = await prisma.organization.findFirst();
        if (!org) {
          org = await prisma.organization.create({ data: { name: 'VisaSync Global' } });
        }
        await prisma.organizationMembership.create({
          data: {
            userId: admin.id,
            organizationId: org.id,
            roleId: saRole.id
          }
        });
        console.log("Automatically assigned SUPER_ADMIN to admin@visasync.com");
      }
    }
  } catch(e) {
    console.error("Failed to ensure SUPER_ADMIN:", e);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  await ensureSuperAdmin();
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for production (allow frontend origin)
  app.enableCors({
    origin: '*', // In real prod, this should be the specific frontend domain
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
