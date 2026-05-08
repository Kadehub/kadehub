import { Controller, Get, Post, Patch, Body, Param, UseGuards, UsePipes, ValidationPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { TenantService, CreateUserDto, UpdateUserDto } from './tenant.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { uploadToCloudinary } from '../../common/cloudinary';

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.tenantService.getTenant(user.tenant_id);
  }

  @Get('subscriptions')
  getSubs(@CurrentUser() user: any) {
    return this.tenantService.getSubscriptions(user.tenant_id);
  }

  @Get('users')
  @Roles('ADMIN')
  getUsers(@CurrentUser() user: any) {
    return this.tenantService.getUsers(user.tenant_id);
  }

  @Post('users')
  @Roles('ADMIN')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createUser(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.tenantService.createUser(user.tenant_id, dto);
  }

  @Patch('users/:id')
  @Roles('ADMIN')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateUser(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.tenantService.updateUser(user.tenant_id, +id, dto);
  }

  @Patch('company/logo')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('logo', {
    storage: memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) return cb(new Error('Images only'), false);
      cb(null, true);
    },
  }))
  async uploadCompanyLogo(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    const logoUrl = await uploadToCloudinary(file.buffer, 'kadehub/logos', file.originalname);
    return this.tenantService.updateCompanyLogo(user.tenant_id, logoUrl);
  }

  @Post('users/:id/photo')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('photo', {
    storage: memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) return cb(new Error('Images only'), false);
      cb(null, true);
    },
  }))
  async uploadPhoto(@CurrentUser() user: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    const photoUrl = await uploadToCloudinary(file.buffer, 'kadehub/staff', file.originalname);
    return this.tenantService.updateUserPhoto(user.tenant_id, +id, photoUrl);
  }
}
