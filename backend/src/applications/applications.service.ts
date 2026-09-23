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

  /** Create a client (or multiple applicants) — enforces uniqueness at the backend inside a transaction
   *  so two concurrent requests for the same passport cannot both succeed.
   */
  async createClient(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const familyGroupId = data.applicants.length > 1 ? crypto.randomUUID() : null;
      const results = [];

      for (const app of data.applicants) {
        if (!app.passportNumber) continue;
        const normalized = app.passportNumber.trim().toUpperCase();

        // Re-check inside transaction — protects against concurrent duplicate creation
        const existing = await tx.customerProfile.findUnique({
          where: { passportNumber: normalized },
        });
        if (existing) {
          throw new ConflictException(`Passport ${normalized} is already registered.`);
        }

        // Create system user for this client
        const clientUser = await tx.user.create({
          data: {
            email: `client_${normalized.toLowerCase()}_${Date.now()}@system.local`,
            password: 'N/A',
            firstName: app.firstName || normalized,
            lastName: app.lastName || 'Client',
          },
        });

        // Create CustomerProfile with normalized passport and all details
        const profile = await tx.customerProfile.create({
          data: {
            userId: clientUser.id,
            passportNumber: normalized,
            nationality: app.nationality || data.fromCountry || null,
            passportExpiry: app.passportExpiry ? new Date(app.passportExpiry) : null,
            dateOfBirth: app.dateOfBirth ? new Date(app.dateOfBirth) : null,
            gender: app.gender || null,
            gapDays: app.gapDays ? parseInt(app.gapDays, 10) : null,
            addressLine1: app.addressLine1 || null,
            addressLine2: app.addressLine2 || null,
            postalCode: app.postalCode || null,
            city: app.city || null,
            state: app.state || null,
            familyGroupId,
          },
        });

        // Create initial application with configuration
        const application = await tx.application.create({
          data: {
            customerId: profile.id,
            status: 'DRAFT',
            notes: `Target: ${data.targetCountry}`,
            applicationCenter: data.applicationCenter || null,
            category: data.category || null,
            subCategory: data.subCategory || null,
          },
        });

        results.push({ profile, application });
      }

      return { results, message: 'Client(s) created successfully' };
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
        customer: {
          include: {
            user: true
          }
        },
        documents: true,
      },
      orderBy: { createdAt: 'desc' }
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
