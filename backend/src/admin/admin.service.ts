import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        branches: true,
      },
    });
  }

  async createOrganization(name: string) {
    if (!name) throw new BadRequestException('Organization name is required');
    return this.prisma.organization.create({
      data: { name },
    });
  }

  async getAgents() {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { role: { name: 'AGENT' } },
      include: {
        user: true,
        organization: true,
        branch: true,
      }
    });
    // Format to match frontend expectations
    return memberships.map(m => ({
      id: m.user.id,
      email: m.user.email,
      org: m.organization.name,
      status: m.user.isActive ? 'Active' : 'Inactive'
    }));
  }

  async inviteAgent(email: string, orgId: string) {
    if (!email || !orgId) throw new BadRequestException('Email and orgId are required');

    // Make sure org exists
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { branches: true }
    });

    if (!org) throw new BadRequestException('Organization not found');

    let branchId = org.branches[0]?.id;
    if (!branchId) {
      const newBranch = await this.prisma.branch.create({
        data: { name: 'Main Branch', organizationId: org.id }
      });
      branchId = newBranch.id;
    }

    let role = await this.prisma.role.findUnique({ where: { name: 'AGENT' } });
    if (!role) {
      role = await this.prisma.role.create({ data: { name: 'AGENT' } });
    }

    const passwordHash = await bcrypt.hash('agent123', 10);

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: passwordHash,
        firstName: 'Invited',
        lastName: 'Agent',
      }
    });

    await this.prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        branchId,
        roleId: role.id
      }
    });

    return { message: 'Agent invited successfully (Password: agent123)' };
  }

  async updateOrganization(id: string, name?: string, isActive?: boolean) {
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(isActive !== undefined && { isActive })
      }
    });
  }

  async deleteOrganization(id: string) {
    // Delete branches first
    await this.prisma.branch.deleteMany({ where: { organizationId: id } });
    // Delete memberships
    await this.prisma.organizationMembership.deleteMany({ where: { organizationId: id } });
    // Delete org
    return this.prisma.organization.delete({ where: { id } });
  }

  async updateAgentStatus(id: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive }
    });
  }

  async deleteAgent(id: string) {
    await this.prisma.organizationMembership.deleteMany({ where: { userId: id } });
    return this.prisma.user.delete({ where: { id } });
  }

  // --- Configured Routes ---

  async getConfiguredRoutes() {
    return this.prisma.configuredRoute.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createConfiguredRoute(data: any) {
    return this.prisma.configuredRoute.create({
      data: {
        fromCountry: data.fromCountry,
        toCountry: data.toCountry,
        visaCenter: data.visaCenter,
        visaCategory: data.visaCategory,
        subCategory: data.subCategory,
        scheduleDate: data.scheduleDate,
        scheduleTime: data.scheduleTime,
        status: data.status || 'READY'
      }
    });
  }

  async updateConfiguredRoute(id: string, data: any) {
    return this.prisma.configuredRoute.update({
      where: { id },
      data
    });
  }

  async deleteConfiguredRoute(id: string) {
    return this.prisma.configuredRoute.delete({
      where: { id }
    });
  }
}

