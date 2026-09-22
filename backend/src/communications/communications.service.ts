import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(private prisma: PrismaService) {}

  async sendEmail(userId: string, subject: string, message: string) {
    this.logger.log(`Mock Sending EMAIL to User ${userId}: [${subject}] ${message}`);
    return this.prisma.notification.create({
      data: { userId, type: 'EMAIL', subject, message, status: 'SENT' }
    });
  }

  async sendSMS(userId: string, message: string) {
    this.logger.log(`Mock Sending SMS to User ${userId}: ${message}`);
    return this.prisma.notification.create({
      data: { userId, type: 'SMS', message, status: 'SENT' }
    });
  }
}
