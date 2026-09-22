import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAllAgents() {
    return this.prisma.user.findMany({
      where: {
        memberships: {
          some: { role: { name: 'Agent' } }
        }
      },
      include: {
        memberships: {
          include: { organization: true, branch: true }
        }
      }
    });
  }

  async inviteAgent(data: any) {
    // Basic implementation
    const role = await this.prisma.role.findUnique({ where: { name: 'Agent' } });
    if (!role) throw new NotFoundException('Agent role not found');

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: 'default_temp_password', // Should be auto-generated & emailed
        firstName: data.firstName,
        lastName: data.lastName,
        memberships: {
          create: {
            roleId: role.id,
            organizationId: data.organizationId,
            branchId: data.branchId
          }
        }
      },
      include: { memberships: true }
    });
  }

  async updateStatus(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive }
    });
  }
}
