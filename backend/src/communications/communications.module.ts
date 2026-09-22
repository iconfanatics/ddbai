import { Module } from '@nestjs/common';
import { CommunicationsService } from './communications.service.js';

import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [CommunicationsService]
})
export class CommunicationsModule {}
