import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { PurchaseOrder } from '../../database/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../database/entities/purchase-order-item.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier, PurchaseOrder, PurchaseOrderItem, Inventory])],
  providers: [SupplierService],
  controllers: [SupplierController],
})
export class SupplierModule {}
