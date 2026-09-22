import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: { customerId: string, routeId?: string }) {
    // Ensure customer profile exists, or create a dummy one if it doesn't
    let profile = await this.prisma.customerProfile.findUnique({ where: { userId: data.customerId } });
    if (!profile) {
      profile = await this.prisma.customerProfile.create({
        data: { userId: data.customerId }
      });
    }

    return this.prisma.application.create({
      data: {
        customerId: profile.id,
        routeId: data.routeId,
        status: 'DRAFT',
      },
    });
  }

  async findAll() {
    return this.prisma.application.findMany({
      include: {
        customer: true,
        documents: true,
      },
    });
  }

  async findOne(id: string) {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: { customer: true, documents: true }
    });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async updateStatus(id: string, status: string, notes?: string) {
    return this.prisma.application.update({
      where: { id },
      data: { status, notes },
    });
  }
}
