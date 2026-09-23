import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BookingsService implements OnModuleInit {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Simulated Queue Worker
    setInterval(() => this.processQueue(), 15000);
  }

  async requestBooking(applicationId: string) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { verificationSessions: true }
    });

    if (!app) throw new BadRequestException('Application not found');
    if (app.status !== 'APPROVED') {
      throw new BadRequestException('Application is not approved yet.');
    }

    const passedVerification = app.verificationSessions.some(v => v.status === 'PASSED');
    if (!passedVerification) {
      throw new BadRequestException('Face verification must be passed before booking.');
    }

    return this.prisma.bookingRequest.create({
      data: { applicationId, status: 'PENDING' }
    });
  }

  async getQueue() {
    return this.prisma.bookingRequest.findMany({
      include: {
        application: {
          include: {
            customer: {
              include: {
                user: true
              }
            }
          }
        },
        attempts: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async processQueue() {
    try {
      const pendingRequests = await this.prisma.bookingRequest.findMany({
        where: { status: 'PENDING' },
        take: 5
      });

      for (const req of pendingRequests) {
        this.logger.log(`Processing Booking Request: ${req.id}`);
        await this.prisma.bookingRequest.update({
          where: { id: req.id },
          data: { status: 'PROCESSING' }
        });

        // Simulate random success/failure
        const isSuccess = Math.random() > 0.3;
        
        await this.prisma.bookingAttempt.create({
          data: {
            bookingRequestId: req.id,
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            errorMessage: isSuccess ? null : 'Simulated booking failure'
          }
        });

        await this.prisma.bookingRequest.update({
          where: { id: req.id },
          data: {
            status: isSuccess ? 'CONFIRMED' : 'FAILED',
            referenceNumber: isSuccess ? `REF-${Math.floor(Math.random() * 1000000)}` : null
          }
        });
      }
    } catch (e) {
      this.logger.error('Error processing booking queue', e);
    }
  }

  async retryBooking(bookingId: string) {
    return this.prisma.bookingRequest.update({
      where: { id: bookingId },
      data: { status: 'PENDING' }
    });
  }
}
