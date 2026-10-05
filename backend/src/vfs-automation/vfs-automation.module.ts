import { Module } from '@nestjs/common';
import { VfsAutomationService } from './vfs-automation.service.js';

@Module({
  providers: [VfsAutomationService],
  exports: [VfsAutomationService]
})
export class VfsAutomationModule {}
