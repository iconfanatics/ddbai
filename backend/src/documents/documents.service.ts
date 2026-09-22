import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DocumentsService implements OnModuleInit {
  private s3Client: S3Client;
  private bucketName = 'visasync-documents';

  constructor(private prisma: PrismaService) {
    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
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
}
