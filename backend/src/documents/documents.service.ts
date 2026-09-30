import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DocumentsService implements OnModuleInit {
  private s3Client: S3Client;
  private bucketName = 'visasync-documents';

  constructor(private prisma: PrismaService) {
    const rawEndpoint = process.env.MINIO_ENDPOINT || 'minio';
    // Ensure endpoint always has http:// and port
    const endpoint = rawEndpoint.startsWith('http') 
      ? rawEndpoint 
      : `http://${rawEndpoint}:${process.env.MINIO_PORT || 9000}`;
    
    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint,
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || 'minioadmin',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
      console.log(`Bucket ${this.bucketName} created successfully.`);
    } catch (error: any) {
      if (error.name !== 'BucketAlreadyOwnedByYou' && error.name !== 'BucketAlreadyExists') {
        console.error('Error creating bucket:', error);
      }
    }
  }

  async generateUploadUrl(applicationId: string, filename: string) {
    const key = `applications/${applicationId}/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    
    // Create a pending document record
    const doc = await this.prisma.document.create({
      data: {
        applicationId,
        fileUrl: key,
        status: 'PENDING'
      }
    });

    return { uploadUrl, documentId: doc.id, key };
  }


  async uploadVerificationMedia(token: string, filename: string, buffer: Buffer, contentType: string): Promise<string> {
    const session = await this.prisma.verificationSession.findUnique({ where: { id: token } });
    if (!session) throw new Error('Invalid token');

    const key = `verification/${session.id}/${Date.now()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    
    await this.s3Client.send(command);
    return key;
  }


  async getDownloadUrl(documentId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: doc.fileUrl,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return { downloadUrl };
  }

  async updateStatus(documentId: string, status: string, rejectionNote?: string) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { status, rejectionNote }
    });
  }

  async getVerificationMediaDownloadUrl(key: string): Promise<{ downloadUrl: string }> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return { downloadUrl };
  }

  async getVerificationMediaStream(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const response = await this.s3Client.send(command);
    return {
      stream: response.Body as NodeJS.ReadableStream,
      contentType: response.ContentType
    };
  }
}
