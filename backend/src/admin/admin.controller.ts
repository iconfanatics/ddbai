import { Controller, Get, Post, Body, UseGuards, Patch, Delete, Param } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('SUPER_ADMIN')
  @Get('organizations')
  getOrganizations() {
    return this.adminService.getOrganizations();
  }

  @Roles('SUPER_ADMIN')
  @Post('organizations')
  createOrganization(@Body() body: { name: string }) {
    return this.adminService.createOrganization(body.name);
  }

  @Roles('SUPER_ADMIN')
  @Get('agents')
  getAgents() {
    return this.adminService.getAgents();
  }

  @Roles('SUPER_ADMIN')
  @Post('agents/invite')
  inviteAgent(@Body() body: { email: string, orgId: string }) {
    return this.adminService.inviteAgent(body.email, body.orgId);
  }

  @Roles('SUPER_ADMIN')
  @Patch('organizations/:id')
  updateOrganization(@Param('id') id: string, @Body() body: { name?: string, isActive?: boolean }) {
    return this.adminService.updateOrganization(id, body.name, body.isActive);
  }

  @Roles('SUPER_ADMIN')
  @Delete('organizations/:id')
  deleteOrganization(@Param('id') id: string) {
    return this.adminService.deleteOrganization(id);
  }

  @Roles('SUPER_ADMIN')
  @Patch('agents/:id')
  updateAgentStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.updateAgentStatus(id, body.isActive);
  }

  @Roles('SUPER_ADMIN')
  @Delete('agents/:id')
  deleteAgent(@Param('id') id: string) {
    return this.adminService.deleteAgent(id);
  }

  // --- Configured Routes ---

  @Roles('SUPER_ADMIN')
  @Get('configured-routes')
  getConfiguredRoutes() {
    return this.adminService.getConfiguredRoutes();
  }

  @Roles('SUPER_ADMIN')
  @Post('configured-routes')
  createConfiguredRoute(@Body() body: any) {
    return this.adminService.createConfiguredRoute(body);
  }

  @Roles('SUPER_ADMIN')
  @Patch('configured-routes/:id')
  updateConfiguredRoute(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateConfiguredRoute(id, body);
  }

  @Roles('SUPER_ADMIN')
  @Delete('configured-routes/:id')
  deleteConfiguredRoute(@Param('id') id: string) {
    return this.adminService.deleteConfiguredRoute(id);
  }
}
