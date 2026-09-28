import { Controller, Post, Body, Get, Param, BadRequestException } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { DocumentsService } from '../documents/documents.service.js';

@Controller('public')
export class PublicController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly documentsService: DocumentsService
  ) {}

  @Get('verification/:token')
  async getVerificationDetails(@Param('token') token: string) {
    return this.applicationsService.getVerificationDetails(token);
  }

  @Post('webhook/face-verification')
  handleFaceVerificationWebhook(@Body() body: { token: string, status: string, mediaData?: any, notes?: string }) {
    return this.applicationsService.handleFaceVerificationWebhook(body);
  }

  @Post('webhook/face-verification/upload-url')
  async getVerificationUploadUrl(@Body() body: { token: string, filename: string }) {
    return this.documentsService.generateVerificationMediaUploadUrl(body.token, body.filename);
  }
}
