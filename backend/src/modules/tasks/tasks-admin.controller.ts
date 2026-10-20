import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UsePipes, ValidationPipe, ParseIntPipe,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CategoryDto, HideDto } from './tasks.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/** Marketplace moderation for the super admin. RolesGuard reads handler metadata, so @Roles is on each route. */
@Controller('tasks/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TasksAdminController {
  constructor(private svc: TasksService) {}

  @Get('stats') @Roles('SUPER_ADMIN')
  stats() { return this.svc.adminStats(); }

  @Get('tasks') @Roles('SUPER_ADMIN')
  tasks(@Query('q') q?: string, @Query('status') status?: string, @Query('hidden') hidden?: string, @Query('page') page?: string) {
    return this.svc.adminTasks(q, status, hidden, page);
  }

  @Post('tasks/:id/hidden') @Roles('SUPER_ADMIN')
  setHidden(@Param('id', ParseIntPipe) id: number, @Body() dto: HideDto) { return this.svc.adminSetHidden(id, dto.hidden); }

  @Post('tasks/:id/cancel') @Roles('SUPER_ADMIN')
  cancel(@Param('id', ParseIntPipe) id: number) { return this.svc.adminCancel(id); }

  @Get('reports') @Roles('SUPER_ADMIN')
  reports(@Query('status') status?: string) { return this.svc.adminReports(status); }

  @Post('reports/:id/resolve') @Roles('SUPER_ADMIN')
  resolve(@Param('id', ParseIntPipe) id: number) { return this.svc.adminResolveReport(id); }

  @Get('categories') @Roles('SUPER_ADMIN')
  categories() { return this.svc.adminCategories(); }

  @Post('categories') @Roles('SUPER_ADMIN')
  createCategory(@Body() dto: CategoryDto) { return this.svc.adminSaveCategory(dto); }

  @Patch('categories/:id') @Roles('SUPER_ADMIN')
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: CategoryDto) { return this.svc.adminSaveCategory(dto, id); }

  @Delete('categories/:id') @Roles('SUPER_ADMIN')
  deleteCategory(@Param('id', ParseIntPipe) id: number) { return this.svc.adminDeleteCategory(id); }
}
