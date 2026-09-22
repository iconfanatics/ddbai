import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(applicationId: string, amount: number) {
    return this.prisma.invoice.create({
      data: { applicationId, amount }
    });
  }

  async processSimulatedPayment(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error('Invoice not found');

    await this.prisma.payment.create({
      data: { invoiceId, amount: invoice.amount, status: 'SUCCESS' }
    });

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID' }
    });
  }

  async getAgentWallet(agentId: string) {
    return this.prisma.agentWallet.upsert({
      where: { agentId },
      update: {},
      create: { agentId, balance: 1000.0 } // Start with 1000 balance for MVP test
    });
  }

  async addFunds(agentId: string, amount: number) {
    const wallet = await this.getAgentWallet(agentId);
    
    await this.prisma.transaction.create({
      data: { walletId: wallet.id, amount, type: 'CREDIT', description: 'Manual Topup' }
    });

    return this.prisma.agentWallet.update({
      where: { agentId },
      data: { balance: wallet.balance + amount }
    });
  }
}
