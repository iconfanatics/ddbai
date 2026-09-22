import { Module } from '@nestjs/common';
import { RoutesController } from './routes.controller.js';
import { RoutesService } from './routes.service.js';

import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [RoutesController],
  providers: [RoutesService]
})
export class RoutesModule {}
