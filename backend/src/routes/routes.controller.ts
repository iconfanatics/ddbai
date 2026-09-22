import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { RoutesService } from './routes.service.js';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Roles('SuperAdmin', 'MainAdmin')
  @Post()
  createRoute(@Body() body: any) {
    return this.routesService.createRoute(body);
  }

  @Get()
  getRoutes() {
    return this.routesService.getRoutes();
  }

  @Roles('SuperAdmin', 'MainAdmin')
  @Post('centers')
  createCenter(@Body() body: any) {
    return this.routesService.createCenter(body);
  }

  @Get('centers')
  getCenters() {
    return this.routesService.getCenters();
  }
}
