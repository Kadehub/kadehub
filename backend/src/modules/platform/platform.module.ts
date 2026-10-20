import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { ProductAccessService } from './product-access.service';
import { ProductGuard } from '../../common/guards/product.guard';
import { Subscription } from '../../database/entities/subscription.entity';
import { Package } from '../../database/entities/package.entity';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { BillingModule } from '../billing/billing.module';

// Global so every product module can use ProductGuard / ProductAccessService without importing this module
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Package, User, Tenant]), BillingModule],
  controllers: [PlatformController],
  providers: [PlatformService, ProductAccessService, ProductGuard],
  exports: [ProductAccessService, ProductGuard],
})
export class PlatformModule {}
