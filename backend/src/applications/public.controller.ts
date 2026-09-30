import { Controller, Post, Body, Get, Param, Req, Query, Res } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import type { Request, Response } from 'express';

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

  @Get('verification-media')
  async getVerificationMediaStream(@Query('key') key: string, @Res() res: Response) {
    if (!key || !key.includes('verification/')) {
      return res.status(403).send('Forbidden');
    }
    try {
      const { stream, contentType } = await this.documentsService.getVerificationMediaStream(key);
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      stream.pipe(res);
    } catch (err) {
      res.status(404).send('Not found');
    }
  }

  @Post('webhook/face-verification')
  handleFaceVerificationWebhook(@Body() body: { token: string, status: string, mediaData?: any, notes?: string }) {
    return this.applicationsService.handleFaceVerificationWebhook(body);
  }

  // Direct upload: frontend sends binary file body, backend stores in Minio
  @Post('webhook/face-verification/upload')
  async uploadVerificationMedia(
    @Req() req: Request,
    @Body() body: any
  ) {
    const token = req.headers['x-verification-token'] as string;
    const filename = req.headers['x-filename'] as string;
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    if (!token || !filename) {
      return { error: 'Missing token or filename' };
    }

    // Read raw body as buffer
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const buffer = Buffer.concat(chunks);

    const s3Key = await this.documentsService.uploadVerificationMedia(token, filename, buffer, contentType);
    return { key: s3Key, success: true };
  }
}

