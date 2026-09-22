import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SlotsService } from './slots.service.js';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post('jobs')
  createJob(@Body() body: any) {
    return this.slotsService.createMonitorJob(body);
  }

  @Get('jobs')
  getJobs() {
    return this.slotsService.getMonitorJobs();
  }

  @Get('availability')
  getAvailability() {
    return this.slotsService.getAvailability();
  }
}
