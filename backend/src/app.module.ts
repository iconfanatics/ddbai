import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { RoutesModule } from './routes/routes.module.js';
import { SlotsModule } from './slots/slots.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { CommunicationsModule } from './communications/communications.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, OrganizationsModule, ApplicationsModule, DocumentsModule, VerificationModule, RoutesModule, SlotsModule, BookingsModule, FinanceModule, CommunicationsModule, ReportsModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
