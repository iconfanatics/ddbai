import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { Response } from 'express';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles('SuperAdmin', 'MainAdmin')
  @Get('summary')
  getSummary() {
    return this.reportsService.getSummary();
  }

  @Roles('SuperAdmin', 'MainAdmin')
  @Get('export/applications.csv')
  async exportApplications(@Res() res: Response) {
    const csv = await this.reportsService.getExportCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="applications.csv"');
    res.send(csv);
  }
}
