import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../database/entities/purchase-order-item.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TrialGuard } from '../../common/guards/trial.guard';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, PurchaseOrder, PurchaseOrderItem, Inventory, Subscription]), AuthModule],
  providers: [SupplierService, TrialGuard],
  controllers: [SupplierController],
})
export class SupplierModule {}
