import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('SuperAdmin', 'MainAdmin')
  @Get('agents')
  findAllAgents() {
    return this.usersService.findAllAgents();
  }

  @Roles('SuperAdmin', 'MainAdmin')
  @Post('agents/invite')
  inviteAgent(@Body() inviteData: any) {
    return this.usersService.inviteAgent(inviteData);
  }

  @Roles('SuperAdmin', 'MainAdmin')
  @Patch('agents/:id/status')
  updateAgentStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.usersService.updateStatus(id, isActive);
  }
}
