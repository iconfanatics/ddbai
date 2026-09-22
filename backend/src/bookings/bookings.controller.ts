import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service.js';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('request')
  requestBooking(@Body('applicationId') applicationId: string) {
    return this.bookingsService.requestBooking(applicationId);
  }

  @Get('queue')
  getQueue() {
    return this.bookingsService.getQueue();
  }

  @Post(':id/retry')
  retryBooking(@Param('id') id: string) {
    return this.bookingsService.retryBooking(id);
  }
}
