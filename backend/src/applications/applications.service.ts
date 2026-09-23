import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  /** Global passport check — searches ALL CustomerProfiles across all agents */
  async checkPassport(passportNumber: string) {
    const existing = await this.prisma.customerProfile.findUnique({
      where: { passportNumber },
    });
    if (existing) {
      return { available: false, message: 'Already Added' };
    }
    return { available: true, message: 'Passport Available' };
  }

  /** Create a client — also enforces uniqueness at the backend */
  async createClient(data: { passportNumber: string; targetCountry: string; fromCountry?: string }) {
    // Server-side duplicate check (protects against race conditions)
    const existing = await this.prisma.customerProfile.findUnique({
      where: { passportNumber: data.passportNumber.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException('A client with this passport number already exists');
    }

    // Create a system user record for this client
    const clientUser = await this.prisma.user.create({
      data: {
        email: `client_${data.passportNumber.toLowerCase()}_${Date.now()}@system.local`,
        password: 'N/A', // system-managed, no login
        firstName: data.passportNumber.toUpperCase(),
        lastName: 'Client',
      },
    });

    // Create the CustomerProfile with passport
    const profile = await this.prisma.customerProfile.create({
      data: {
        userId: clientUser.id,
        passportNumber: data.passportNumber.toUpperCase(),
        nationality: data.fromCountry || null,
      },
    });

    // Create an initial application
    const application = await this.prisma.application.create({
      data: {
        customerId: profile.id,
        status: 'DRAFT',
        notes: `Target: ${data.targetCountry}`,
      },
    });

    return { profile, application, message: 'Client created successfully' };
  }

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
