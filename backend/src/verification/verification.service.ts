import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  async createSession(applicationId: string, hasConsent: boolean) {
    if (!hasConsent) throw new BadRequestException('Consent required for biometric processing');
    
    return this.prisma.verificationSession.create({
      data: {
        applicationId,
        hasConsent,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expires in 30 minutes
      }
    });
  }

  async processFaceImage(sessionId: string, documentId: string) {
    const session = await this.prisma.verificationSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.expiresAt < new Date()) throw new BadRequestException('Verification session expired');

    // Simulate calling an external Mock Provider
    const statuses = ['PASSED', 'FAILED', 'MANUAL_REVIEW'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const score = Math.floor(Math.random() * 100);

    return this.prisma.verificationSession.update({
      where: { id: sessionId },
      data: {
        status: randomStatus,
        score,
        notes: `Simulated Mock Provider Result. Document Ref: ${documentId}`,
      }
    });
  }

  async getManualReviewQueue() {
    return this.prisma.verificationSession.findMany({
      where: { status: 'MANUAL_REVIEW' },
      include: { application: true }
    });
  }

  async resolveManualReview(sessionId: string, status: string, notes?: string) {
    if (!['PASSED', 'FAILED'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.prisma.verificationSession.update({
      where: { id: sessionId },
      data: { status, notes }
    });
  }
}
