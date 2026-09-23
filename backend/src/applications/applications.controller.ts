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

  /** Create a new client with server-side duplicate guard */
  @Post('create-client')
  async createClient(@Body() body: { passportNumber: string; targetCountry: string; fromCountry?: string }) {
    if (!body.passportNumber || !body.targetCountry) {
      throw new BadRequestException('passportNumber and targetCountry are required');
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
