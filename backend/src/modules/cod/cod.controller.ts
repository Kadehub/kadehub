import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, UseGuards, UsePipes, ValidationPipe,
  UseInterceptors, UploadedFile, BadRequestException, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductGuard, Product } from '../../common/guards/product.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { uploadToCloudinary } from '../../common/cloudinary';
import { CodService } from './cod.service';
import { CodAccountService } from './cod-account.service';
import { isRangeKey } from './cod-analytics';
import {
  SaveCodItemDto, CreateCodOrderDto, UpdateCodOrderStatusDto, BulkCodOrderStatusDto,
  UpdateCodBusinessDto, ChangePasswordDto,
} from './cod.dto';

const imageUpload = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) return cb(new BadRequestException('Only image files are allowed'), false);
    cb(null, true);
  },
});

/** Public COD endpoints for the cod.kadehub.com landing page (no sign-in). */
@Controller('cod/public')
export class CodPublicController {
  constructor(private account: CodAccountService) {}

  /** Plans with prices, limits and feature bullets — the same data /cod/plans returns. */
  @Get('plans')
  plans() {
    return this.account.plans();
  }
}

/**
 * Account-level COD endpoints. No ProductGuard: they must keep working after the trial or plan
 * has lapsed (the billing and settings pages stay reachable, like CODPlatform's subscription gate).
 */
@Controller('cod')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CodAccountController {
  constructor(private account: CodAccountService) {}

  @Get('me')
  me(@CurrentUser() u: any) {
    return this.account.me(u);
  }

  @Get('plans')
  plans() {
    return this.account.plans();
  }

  @Put('business')
  saveBusiness(@CurrentUser() u: any, @Body() dto: UpdateCodBusinessDto) {
    return this.account.saveBusiness(u.tenant_id, dto);
  }

  @Post('business/logo')
  @UseInterceptors(imageUpload)
  async uploadLogo(@CurrentUser() u: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');
    await this.account.requireEnabled(u.tenant_id);
    const url = await uploadToCloudinary(file.buffer, `kadehub/cod/${u.tenant_id}/logos`, file.originalname);
    return { url };
  }

  @Post('account/password')
  changePassword(@CurrentUser() u: any, @Body() dto: ChangePasswordDto) {
    return this.account.changePassword(u.sub, dto);
  }
}

/** Day-to-day COD data; requires an active COD subscription (402 otherwise). */
@Controller('cod')
@UseGuards(JwtAuthGuard, ProductGuard)
@Product('cod')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CodController {
  constructor(private cod: CodService) {}

  // ── insights ──
  @Get('dashboard')
  dashboard(@CurrentUser() u: any) {
    return this.cod.dashboard(u.tenant_id);
  }

  @Get('reports')
  reports(@CurrentUser() u: any, @Query('range') range?: string) {
    return this.cod.report(u.tenant_id, isRangeKey(range) ? range : 'this_month');
  }

  @Get('units')
  units(@CurrentUser() u: any, @Query('range') range?: string, @Query('q') q?: string) {
    return this.cod.units(u.tenant_id, isRangeKey(range) ? range : 'all', q ?? '');
  }

  // ── items ──
  @Get('items')
  items(@CurrentUser() u: any) {
    return this.cod.listItems(u.tenant_id);
  }

  @Post('items')
  createItem(@CurrentUser() u: any, @Body() dto: SaveCodItemDto) {
    return this.cod.createItem(u.tenant_id, dto);
  }

  @Post('items/image')
  @UseInterceptors(imageUpload)
  async uploadItemImage(@CurrentUser() u: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');
    const url = await uploadToCloudinary(file.buffer, `kadehub/cod/${u.tenant_id}/items`, file.originalname);
    return { url };
  }

  @Patch('items/:id')
  updateItem(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() dto: SaveCodItemDto) {
    return this.cod.updateItem(u.tenant_id, id, dto);
  }

  @Delete('items/:id')
  deleteItem(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.cod.deleteItem(u.tenant_id, id);
  }

  // ── orders ──
  @Get('orders')
  orders(@CurrentUser() u: any) {
    return this.cod.listOrders(u.tenant_id);
  }

  @Post('orders')
  createOrder(@CurrentUser() u: any, @Body() dto: CreateCodOrderDto) {
    return this.cod.createOrder(u.tenant_id, dto);
  }

  @Post('orders/bulk-status')
  bulkStatus(@CurrentUser() u: any, @Body() dto: BulkCodOrderStatusDto) {
    return this.cod.bulkUpdateStatus(u.tenant_id, dto.ids, dto.status);
  }

  @Get('orders/:id')
  order(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.cod.getOrder(u.tenant_id, id);
  }

  @Patch('orders/:id/status')
  orderStatus(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCodOrderStatusDto) {
    return this.cod.updateOrderStatus(u.tenant_id, id, dto.status);
  }

  @Delete('orders/:id')
  deleteOrder(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.cod.deleteOrder(u.tenant_id, id);
  }
}
