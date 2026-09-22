import { Controller, Post, Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service.js';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('session')
  createSession(@Body() body: { applicationId: string, hasConsent: boolean }) {
    return this.verificationService.createSession(body.applicationId, body.hasConsent);
  }

  @Post('session/:id/process')
  processFaceImage(@Param('id') id: string, @Body('documentId') documentId: string) {
    return this.verificationService.processFaceImage(id, documentId);
  }

  @Get('queue')
  getManualReviewQueue() {
    return this.verificationService.getManualReviewQueue();
  }

  @Patch('session/:id/resolve')
  resolveManualReview(@Param('id') id: string, @Body() body: { status: string, notes?: string }) {
    return this.verificationService.resolveManualReview(id, body.status, body.notes);
  }
}
