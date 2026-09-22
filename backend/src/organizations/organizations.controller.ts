import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Roles('SuperAdmin', 'MainAdmin')
  @Get()
  findAll() {
    return this.organizationsService.findAll();
  }

  @Roles('SuperAdmin', 'MainAdmin')
  @Post()
  create(@Body() createData: { name: string; isActive?: boolean }) {
    return this.organizationsService.create(createData);
  }

  @Roles('SuperAdmin', 'MainAdmin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: { name?: string; isActive?: boolean }) {
    return this.organizationsService.update(id, updateData);
  }

  @Roles('SuperAdmin', 'MainAdmin')
  @Post(':id/branches')
  createBranch(@Param('id') orgId: string, @Body() branchData: { name: string }) {
    return this.organizationsService.createBranch(orgId, branchData);
  }
}
