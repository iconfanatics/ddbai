import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { FinanceService } from './finance.service.js';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('invoices')
  createInvoice(@Body() body: { applicationId: string, amount: number }) {
    return this.financeService.createInvoice(body.applicationId, body.amount);
  }

  @Post('invoices/:id/pay')
  payInvoice(@Param('id') id: string) {
    return this.financeService.processSimulatedPayment(id);
  }

  @Get('wallet')
  getWallet(@Req() req: any) {
    return this.financeService.getAgentWallet(req.user.userId);
  }

  @Post('wallet/topup')
  topupWallet(@Req() req: any, @Body('amount') amount: number) {
    return this.financeService.addFunds(req.user.userId, amount);
  }
}
