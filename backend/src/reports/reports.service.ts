import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const totalApps = await this.prisma.application.count();
    const approvedApps = await this.prisma.application.count({ where: { status: 'APPROVED' } });
    
    const invoices = await this.prisma.invoice.findMany({ where: { status: 'PAID' } });
    const revenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);

    const agents = await this.prisma.user.count({
      where: { memberships: { some: { role: { name: 'Agent' } } } }
    });

    return {
      totalApplications: totalApps,
      approvedApplications: approvedApps,
      totalRevenue: revenue,
      activeAgents: agents
    };
  }

  async getExportCSV() {
    const apps = await this.prisma.application.findMany({
      include: { customer: true }
    });

    let csv = 'Application ID,Customer ID,Status,Created At\n';
    for (const app of apps) {
      csv += `"${app.id}","${app.customerId}","${app.status}","${app.createdAt.toISOString()}"\n`;
    }
    return csv;
  }
}
