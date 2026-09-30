import { Controller, Get, Post, Body, Param, Patch, Query, ConflictException, BadRequestException, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('applications')
export class ApplicationsController {
  @Get('temp-fix-db')
  async tempFixDb() {
    return this.applicationsService.tempFixDb();
  }

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

  @Post('webhook/face-verification')
  handleFaceVerificationWebhook(@Body() body: { token: string, status: string, matchScore?: number, notes?: string }) {
    return this.applicationsService.handleFaceVerificationWebhook(body);
  }

  @Post('verification-media-url')
  getVerificationMediaUrl(@Body() body: { key: string }) {
    return this.applicationsService.getVerificationMediaDownloadUrl(body.key);
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

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.applicationsService.update(id, body);
  }

  @Patch(':id/notes')
  updateNotes(@Param('id') id: string, @Body() body: { notes: string }) {
    return this.applicationsService.updateNotes(id, body.notes);
  }

  @Post(':id/run')
  runApplication(@Param('id') id: string) {
    return this.applicationsService.runApplication(id);
  }

  @Post(':id/generate-verification-link')
  generateVerificationLink(@Param('id') id: string) {
    return this.applicationsService.generateVerificationLink(id);
  }

  @Post('bulk-delete')
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.applicationsService.bulkDelete(body.ids);
  }

  @Post('bulk-reset-verification')
  bulkResetVerification(@Body() body: { ids: string[] }) {
    return this.applicationsService.bulkResetVerification(body.ids);
  }
}

