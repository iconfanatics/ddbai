import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import { ApplicationsController } from './applications.controller.js';
import { PublicController } from './public.controller.js';
import { DocumentsModule } from '../documents/documents.module.js';

import { PrismaModule } from '../prisma/prisma.module.js';
import { VfsAutomationModule } from '../vfs-automation/vfs-automation.module.js';

@Module({
  imports: [PrismaModule, DocumentsModule, VfsAutomationModule],
  providers: [ApplicationsService],
  controllers: [ApplicationsController, PublicController]
})
export class ApplicationsModule {}
