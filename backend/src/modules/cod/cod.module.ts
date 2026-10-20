import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from '../../database/entities/subscription.entity';
import { Package } from '../../database/entities/package.entity';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { CodBusiness } from '../../database/entities/cod-business.entity';
import { CodItem } from '../../database/entities/cod-item.entity';
import { CodExpense } from '../../database/entities/cod-expense.entity';
import { CodOrder } from '../../database/entities/cod-order.entity';
import { CodOrderItem } from '../../database/entities/cod-order-item.entity';
import { CodPublicController, CodAccountController, CodController } from './cod.controller';
import { CodAccountService } from './cod-account.service';
import { CodService } from './cod.service';

/** KadeHub COD (cod.kadehub.com) — cash-on-delivery business manager, ported from CODPlatform. */
@Module({
  imports: [TypeOrmModule.forFeature([
    Subscription, Package, User, Tenant, CodBusiness, CodItem, CodExpense, CodOrder, CodOrderItem,
  ])],
  controllers: [CodPublicController, CodAccountController, CodController],
  providers: [CodAccountService, CodService],
})
export class CodModule {}
