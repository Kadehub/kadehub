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
import { CodCreditPayment } from '../../database/entities/cod-credit-payment.entity';
import { CodPublicController, CodAccountController, CodController } from './cod.controller';
import { CodAccountService } from './cod-account.service';
import { CodService } from './cod.service';
import { CodExpensesController } from './cod-expenses.controller';
import { CodExpensesService } from './cod-expenses.service';
import { CodAuditService } from './cod-audit.service';
import { CodCapabilityGuard } from './cod-capabilities';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { CodPersonalExpense } from '../../database/entities/cod-personal-expense.entity';
import { CodPersonalSettings } from '../../database/entities/cod-personal-settings.entity';

/** KadeHub COD (cod.kadehub.com) — cash-on-delivery business manager, ported from CODPlatform. */
@Module({
  imports: [TypeOrmModule.forFeature([
    Subscription, Package, User, Tenant, CodBusiness, CodItem, CodExpense, CodOrder, CodOrderItem, AuditLog,
    CodPersonalExpense, CodPersonalSettings, CodCreditPayment,
  ])],
  controllers: [CodPublicController, CodAccountController, CodController, CodExpensesController],
  // CodExpensesService is exported for the financial summary (listExpenses / listPersonal with a date range)
  exports: [CodExpensesService],
  providers: [CodAccountService, CodService, CodExpensesService, CodAuditService, CodCapabilityGuard],
})
export class CodModule {}
