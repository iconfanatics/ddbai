import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  /** Global passport check — searches ALL CustomerProfiles across all agents.
   *  Normalizes the passport number (uppercase + trim) before comparison.
   */
  async checkPassport(passportNumber: string) {
    const normalized = passportNumber.trim().toUpperCase();
    try {
      const existing = await this.prisma.customerProfile.findUnique({
        where: { passportNumber: normalized },
      });
      if (existing) {
        return { available: false, status: 'ALREADY_ADDED' };
      }
      return { available: true, status: 'AVAILABLE' };
    } catch {
      return { success: false, status: 'ERROR', message: 'Unable to check passport' };
    }
  }

  /** Create a client — enforces uniqueness at the backend inside a transaction
   *  so two concurrent requests for the same passport cannot both succeed.
   */
  async createClient(data: { passportNumber: string; targetCountry: string; fromCountry?: string }) {
    const normalized = data.passportNumber.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      // Re-check inside transaction — protects against concurrent duplicate creation
      const existing = await tx.customerProfile.findUnique({
        where: { passportNumber: normalized },
      });
      if (existing) {
        throw new ConflictException('This passport is already registered and cannot be added again.');
      }

      // Create system user for this client
      const clientUser = await tx.user.create({
        data: {
          email: `client_${normalized.toLowerCase()}_${Date.now()}@system.local`,
          password: 'N/A',
          firstName: normalized,
          lastName: 'Client',
        },
      });

      // Create CustomerProfile with normalized passport
      const profile = await tx.customerProfile.create({
        data: {
          userId: clientUser.id,
          passportNumber: normalized,
          nationality: data.fromCountry || null,
        },
      });

      // Create initial application
      const application = await tx.application.create({
        data: {
          customerId: profile.id,
          status: 'DRAFT',
          notes: `Target: ${data.targetCountry}`,
        },
      });

      return { profile, application, message: 'Client created successfully' };
    });
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
