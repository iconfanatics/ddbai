import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany({
      include: { branches: true }
    });
  }

  async create(data: { name: string; isActive?: boolean }) {
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: { name?: string; isActive?: boolean }) {
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async createBranch(orgId: string, data: { name: string }) {
    return this.prisma.branch.create({
      data: {
        name: data.name,
        organizationId: orgId
      }
    });
  }
}
