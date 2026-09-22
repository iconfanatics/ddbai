import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SlotsService implements OnModuleInit {
  private readonly logger = new Logger(SlotsService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Simulated Cron Job every 30 seconds
    setInterval(() => this.runSimulatedMonitoring(), 30000);
  }

  async runSimulatedMonitoring() {
    try {
      const activeJobs = await this.prisma.slotMonitorJob.findMany({ where: { isActive: true } });
      if (activeJobs.length === 0) return;

      this.logger.log(`Running simulated slot monitoring for ${activeJobs.length} jobs`);
      
      for (const job of activeJobs) {
        // Random chance to find a slot
        if (Math.random() > 0.5) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);

          await this.prisma.slotAvailability.create({
            data: {
              visaRouteId: job.visaRouteId,
              visaCenterId: job.visaCenterId,
              date: futureDate,
              status: 'AVAILABLE'
            }
          });
          this.logger.log(`Found simulated slot for Route ${job.visaRouteId} at ${futureDate}`);
        }
      }
    } catch (e) {
      this.logger.error('Error running simulated slot monitor', e);
    }
  }

  async createMonitorJob(data: any) {
    return this.prisma.slotMonitorJob.create({ data });
  }

  async getMonitorJobs() {
    return this.prisma.slotMonitorJob.findMany({
      include: { visaRoute: true, visaCenter: true }
    });
  }

  async getAvailability() {
    return this.prisma.slotAvailability.findMany({
      where: { date: { gte: new Date() } },
      include: { visaRoute: true, visaCenter: true },
      orderBy: { date: 'asc' }
    });
  }
}
