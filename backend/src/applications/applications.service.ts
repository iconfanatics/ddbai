
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentsService } from '../documents/documents.service.js';

@Injectable()
export class ApplicationsService {
  async tempFixDb() {
    const res1 = await this.prisma.application.updateMany({
      where: { targetCountry: 'Portugal' },
      data: { faceVerificationRequired: true }
    });
    const res2 = await this.prisma.processingRun.updateMany({
      where: { application: { targetCountry: 'Portugal' } },
      data: { sourcePage: 'PAGE_03' }
    });
    return { res1, res2 };
  }

  constructor(private prisma: PrismaService, private documentsService: DocumentsService) {}

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
        // Find configured route to determine face verification
        const configuredRoute = await tx.configuredRoute.findFirst({
          where: {
            fromCountry: data.fromCountry,
            toCountry: data.targetCountry,
            visaCenter: data.applicationCenter,
            visaCategory: data.category,
            subCategory: data.subCategory
          }
        });

        // Force automatic face verification for Portugal as requested by the user
        let faceVerificationRequired = false;
        if (configuredRoute) {
          faceVerificationRequired = configuredRoute.faceVerificationRequired;
        }
        if (data.targetCountry === 'Portugal') {
          faceVerificationRequired = true; // Always true for Portugal to avoid confusion
        }

        const application = await tx.application.create({
          data: {
            customerId: profile.id,
            status: 'READY',
            fromCountry: data.fromCountry || null,
            targetCountry: data.targetCountry || null,
            applicationCenter: data.applicationCenter || null,
            category: data.category || null,
            subCategory: data.subCategory || null,
            faceVerificationRequired: faceVerificationRequired,
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
        verificationSessions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
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
    if (status === 'READY') {
      await this.prisma.processingRun.deleteMany({
        where: { applicationId: id }
      });
    }
    return this.prisma.application.update({
      where: { id },
      data: { status, notes },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id },
        include: { customer: { include: { user: true } } }
      });
      if (!app) throw new Error('Application not found');

      // Update Application Route Details
      await tx.application.update({
        where: { id },
        data: {
          applicationCenter: data.applicationCenter !== undefined ? data.applicationCenter : app.applicationCenter,
          category: data.category !== undefined ? data.category : app.category,
          subCategory: data.subCategory !== undefined ? data.subCategory : app.subCategory,
        }
      });

      // Update Customer Profile
      await tx.customerProfile.update({
        where: { id: app.customerId },
        data: {
          passportNumber: data.passportNumber !== undefined ? data.passportNumber : app.customer.passportNumber,
          passportExpiry: data.passportExpiry ? new Date(data.passportExpiry) : app.customer.passportExpiry,
          nationality: data.nationality !== undefined ? data.nationality : app.customer.nationality,
          gender: data.gender !== undefined ? data.gender : app.customer.gender,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : app.customer.dateOfBirth,
          gapDays: data.gapDays !== undefined ? data.gapDays : app.customer.gapDays,
          addressLine1: data.addressLine1 !== undefined ? data.addressLine1 : app.customer.addressLine1,
          addressLine2: data.addressLine2 !== undefined ? data.addressLine2 : app.customer.addressLine2,
          state: data.state !== undefined ? data.state : app.customer.state,
          postalCode: data.postalCode !== undefined ? data.postalCode : app.customer.postalCode,
          city: data.city !== undefined ? data.city : app.customer.city,
        }
      });

      // Update User Name
      if (data.firstName !== undefined || data.lastName !== undefined) {
        await tx.user.update({
          where: { id: app.customer.userId },
          data: {
            firstName: data.firstName !== undefined ? data.firstName : app.customer.user.firstName,
            lastName: data.lastName !== undefined ? data.lastName : app.customer.user.lastName,
          }
        });
      }

      return { success: true };
    });
  }

  async updateNotes(id: string, notes: string) {
    return this.prisma.application.update({
      where: { id },
      data: { notes },
    });
  }

  async runApplication(id: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { processingRun: true }
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.processingRun) {
      if (application.status === 'RUNNING') {
        throw new BadRequestException('Application is already running');
      } else {
        // Orphaned run, let's delete it so we can run again
        await this.prisma.processingRun.delete({
          where: { id: application.processingRun.id }
        });
      }
    }

    if (application.faceVerificationRequired && application.faceVerificationStatus !== 'VERIFIED') {
      throw new BadRequestException('Face verification must be completed before running');
    }

    // Determine the source page destination for the run
    const sourcePage = application.faceVerificationRequired ? 'PAGE_03' : 'PAGE_02';

    // Move state to running (Processing / Ready -> Running)
    await this.prisma.application.update({
      where: { id },
      data: { status: 'RUNNING' }
    });

    return this.prisma.processingRun.create({
      data: {
        applicationId: id,
        sourcePage: sourcePage,
        status: 'RUNNING'
      }
    });
  }

  
  async getVerificationDetails(token: string) {
    const session = await this.prisma.verificationSession.findUnique({
      where: { id: token },
      include: {
        application: {
          include: { customer: { include: { user: true } } }
        }
      }
    });

    if (!session) {
      throw new ConflictException('Invalid or expired token');
    }

    // Identify primary applicant
    // Actually, name/passport is stored in `CustomerProfile` user OR applicant
    // If it's the customer profile:
    const firstName = session.application.customer.user.firstName;
    const lastName = session.application.customer.user.lastName;
    const passportNumber = session.application.customer.passportNumber || "NOT_PROVIDED";

    return {
      status: session.status,
      clientName: `${firstName} ${lastName}`,
      passportNumber: passportNumber
    };
  }

  async handleFaceVerificationWebhook(body: { token: string, status: string, matchScore?: number, notes?: string, mediaData?: any }) {
    const session = await this.prisma.verificationSession.findFirst({
      where: { id: body.token }
    });
    if (!session) {
      throw new NotFoundException('Verification session not found');
    }

    await this.prisma.verificationSession.update({
      where: { id: session.id },
      data: {
        status: body.status,
        score: body.matchScore,
        notes: body.notes,
        ...(body.mediaData ? { mediaData: body.mediaData } : {})
      }
    });

    if (body.status === 'VERIFIED' || body.status === 'COMPLETED' || body.status === 'PASSED') {
      await this.prisma.application.update({
        where: { id: session.applicationId },
        data: {
          faceVerificationStatus: 'VERIFIED',
          status: 'READY'
        }
      });
    } else {
      await this.prisma.application.update({
        where: { id: session.applicationId },
        data: {
          faceVerificationStatus: body.status
        }
      });
    }

    return { success: true };
  }

  async retryVerification(id: string) {
    // 1. Delete old verification sessions to completely remove old passport/selfie/video data
    await this.prisma.verificationSession.deleteMany({
      where: { applicationId: id }
    });

    // 2. Create a new session
    const session = await this.prisma.verificationSession.create({
      data: {
        applicationId: id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }
    });

    const url = `/verify/${session.id}`;
    
    await this.prisma.verificationSession.update({
      where: { id: session.id },
      data: { verificationUrl: url }
    });

    // 3. Reset application face verification status to PENDING and main status to PROCESSING
    await this.prisma.application.update({
      where: { id },
      data: { 
        faceVerificationStatus: 'PENDING',
        status: 'PROCESSING'
      }
    });

    return { url, session };
  }

  async generateVerificationLink(id: string) {
    const session = await this.prisma.verificationSession.create({
      data: {
        applicationId: id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }
    });

    const url = `/verify/${session.id}`;
    
    await this.prisma.verificationSession.update({
      where: { id: session.id },
      data: { verificationUrl: url }
    });

    await this.prisma.application.update({
      where: { id },
      data: { faceVerificationStatus: 'PENDING' }
    });

    return { url, session };
  }

  async bulkDelete(ids: string[]) {
    return this.prisma.$transaction(async (tx) => {
      // First delete dependent verification sessions, documents, etc if needed.
      // Assuming Prisma takes care of it via cascading, or we manually delete.
      await tx.verificationSession.deleteMany({ where: { applicationId: { in: ids } } });
      const result = await tx.application.deleteMany({
        where: { id: { in: ids } }
      });
      return { count: result.count };
    });
  }

  async bulkResetVerification(ids: string[]) {
    // Delete all verification sessions for these applications
    await this.prisma.verificationSession.deleteMany({
      where: { applicationId: { in: ids } }
    });
    return { count: ids.length };
  }

  async getVerificationMediaDownloadUrl(key: string) {
    return this.documentsService.getVerificationMediaDownloadUrl(key);
  }

  async getVerificationMediaStream(key: string) {
    return this.documentsService.getVerificationMediaStream(key);
  }
}
