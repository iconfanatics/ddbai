import { Controller, Get, Post, Body, Param, Patch, Query, ConflictException, BadRequestException, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /** Global passport duplicate check — searches across ALL agents */
  @Get('check-passport')
  async checkPassport(@Query('passport') passport: string) {
    if (!passport || passport.trim() === '') {
      throw new BadRequestException('Passport number is required');
    }
    return this.applicationsService.checkPassport(passport.trim().toUpperCase());
  }

  /** Create a new client (or multiple applicants) with server-side duplicate guard */
  @Post('create-client')
  async createClient(@Body() body: any) {
    if (!body.targetCountry || !body.applicants || !Array.isArray(body.applicants) || body.applicants.length === 0) {
      throw new BadRequestException('targetCountry and at least one applicant are required');
    }
    // Basic validation for the first applicant's passport (since it's the primary one used in Step 1)
    if (!body.applicants[0].passportNumber) {
      throw new BadRequestException('Primary applicant must have a passport number');
    }
    return this.applicationsService.createClient(body);
  }

  @Post()
  create(@Body() body: { customerId: string, routeId?: string }) {
    return this.applicationsService.create(body);
  }

  @Get()
  findAll() {
    return this.applicationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string, notes?: string }) {
    return this.applicationsService.updateStatus(id, body.status, body.notes);
  }
}
