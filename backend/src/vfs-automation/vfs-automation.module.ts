import { PrismaModule } from "../prisma/prisma.module.js";
import { Module } from '@nestjs/common';
import { VfsAutomationService } from './vfs-automation.service.js';

@Module({
  imports: [PrismaModule],
  providers: [VfsAutomationService],
  exports: [VfsAutomationService]
})
export class VfsAutomationModule {}
