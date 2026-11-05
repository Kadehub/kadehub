import {
  Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, UseGuards, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ProductGuard, Product } from '../../common/guards/product.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CodCap, CodCapabilityGuard } from './cod-capabilities';
import { CodCouriersService } from './cod-couriers.service';
import { CodAuditService } from './cod-audit.service';
import { CodCourierSyncService } from './cod-courier-sync.service';
import { CodSettlementsService } from './cod-settlements.service';
import {
  ConnectCourierDto, CreateCourierDto, PreviewSettlementDto, RecordSettlementDto, UpdateCourierDto, UpdateSharedCourierDto,
} from './cod.dto';

/** The couriers a business can pick from, and its own private ones. */
@Controller('cod/couriers')
@UseGuards(JwtAuthGuard, ProductGuard, CodCapabilityGuard)
@Product('cod')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CodCouriersController {
  constructor(private couriers: CodCouriersService, private audit: CodAuditService, private sync: CodCourierSyncService) {}

  @Get()
  @CodCap('orders_create', 'orders_status', 'couriers')
  list(@CurrentUser() u: any) {
    return this.couriers.listForTenant(u.tenant_id);
  }

  // ── automatic tracking: the owner connects a courier with their own API key ──
  @Get('connections')
  @CodCap('couriers')
  connections(@CurrentUser() u: any) {
    return this.sync.connections(u.tenant_id);
  }

  @Put(':id/connection')
  @CodCap('couriers')
  async connect(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ConnectCourierDto) {
    const result = await this.sync.connect(u, id, dto.api_key);
    await this.audit.log(u, 'updated', 'cod_courier', id, `courier ${id} connected`);
    return result;
  }

  @Delete(':id/connection')
  @CodCap('couriers')
  async disconnect(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    const result = await this.sync.disconnect(u.tenant_id, id);
    await this.audit.log(u, 'updated', 'cod_courier', id, `courier ${id} disconnected`);
    return result;
  }

  @Post('sync-order/:orderId')
  @CodCap('orders_status')
  syncOrder(@CurrentUser() u: any, @Param('orderId', ParseIntPipe) orderId: number) {
    return this.sync.syncOrderNow(u, orderId);
  }

  /** Staff taking an order can add a courier that isn't listed; renaming and removing are for the owner. */
  @Post()
  @CodCap('orders_create', 'orders_status', 'couriers')
  async create(@CurrentUser() u: any, @Body() dto: CreateCourierDto) {
    const courier = await this.couriers.addCustom(u.tenant_id, dto);
    await this.audit.log(u, 'created', 'cod_courier', courier.id, courier.name);
    return courier;
  }

  @Patch(':id')
  @CodCap('couriers')
  async update(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourierDto) {
    const courier = await this.couriers.updateCustom(u.tenant_id, id, dto);
    await this.audit.log(u, 'updated', 'cod_courier', id, courier.name);
    return courier;
  }

  @Delete(':id')
  @CodCap('couriers')
  async remove(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    const result = await this.couriers.archiveCustom(u.tenant_id, id);
    await this.audit.log(u, 'deleted', 'cod_courier', id, `courier ${id}`);
    return result;
  }
}

/** Cash the couriers hold and the payments that settle it: money, so owner only (`reports`). */
@Controller('cod/settlements')
@UseGuards(JwtAuthGuard, ProductGuard, CodCapabilityGuard)
@Product('cod')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CodSettlementsController {
  constructor(private settlements: CodSettlementsService) {}

  @Get()
  @CodCap('reports')
  overview(@CurrentUser() u: any) {
    return this.settlements.overview(u.tenant_id);
  }

  @Get('mapping/:courierId')
  @CodCap('reports')
  mapping(@CurrentUser() u: any, @Param('courierId', ParseIntPipe) courierId: number) {
    return this.settlements.mapping(u.tenant_id, courierId);
  }

  @Post('preview')
  @HttpCode(200)
  @CodCap('reports')
  preview(@CurrentUser() u: any, @Body() dto: PreviewSettlementDto) {
    return this.settlements.preview(u.tenant_id, dto.courier_id, dto.rows);
  }

  @Post()
  @CodCap('reports')
  record(@CurrentUser() u: any, @Body() dto: RecordSettlementDto) {
    return this.settlements.record(u, dto);
  }

  @Get(':id')
  @CodCap('reports')
  detail(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.settlements.detail(u.tenant_id, id);
  }

  @Delete(':id')
  @CodCap('reports')
  remove(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number) {
    return this.settlements.remove(u, id);
  }
}

/** The shared list every COD business sees. */
@Controller('super-admin/cod-couriers')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CodCouriersAdminController {
  constructor(private couriers: CodCouriersService, private audit: CodAuditService) {}

  private guard(user: any) {
    if (user.role !== 'SUPER_ADMIN') throw new ForbiddenException('Super admin only');
  }

  @Get()
  list(@CurrentUser() u: any) {
    this.guard(u);
    return this.couriers.listShared();
  }

  @Post()
  async create(@CurrentUser() u: any, @Body() dto: CreateCourierDto) {
    this.guard(u);
    const courier = await this.couriers.createShared(dto);
    await this.audit.log(u, 'created', 'cod_courier', courier.id, courier.name);
    return courier;
  }

  @Patch(':id')
  async update(@CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSharedCourierDto) {
    this.guard(u);
    const courier = await this.couriers.updateShared(id, dto);
    await this.audit.log(u, 'updated', 'cod_courier', id, `${courier.name} ${courier.is_active ? 'active' : 'hidden'}`);
    return courier;
  }
}
