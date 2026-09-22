import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

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
