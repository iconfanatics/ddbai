import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async createRoute(data: any) {
    return this.prisma.visaRoute.create({ data });
  }

  async getRoutes() {
    return this.prisma.visaRoute.findMany();
  }

  async createCenter(data: any) {
    return this.prisma.visaCenter.create({ data });
  }

  async getCenters() {
    return this.prisma.visaCenter.findMany();
  }
}
