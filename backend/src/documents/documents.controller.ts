import { Controller, Post, Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-url')
  async getUploadUrl(@Body() body: { applicationId: string, filename: string }) {
    return this.documentsService.generateUploadUrl(body.applicationId, body.filename);
  }

  @Get(':id/download-url')
  async getDownloadUrl(@Param('id') id: string) {
    return this.documentsService.getDownloadUrl(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string, rejectionNote?: string }) {
    return this.documentsService.updateStatus(id, body.status, body.rejectionNote);
  }
}
