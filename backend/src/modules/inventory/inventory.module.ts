import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Product } from '../../database/entities/product.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TrialGuard } from '../../common/guards/trial.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Inventory, Subscription]), AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService, TrialGuard, SubscriptionGuard],
  exports: [InventoryService],
})
export class InventoryModule {}
