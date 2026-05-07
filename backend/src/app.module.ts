import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './config/database.config';
import { EventsModule } from './common/events/events.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PosModule } from './modules/pos/pos.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SupplierModule } from './modules/supplier/supplier.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { DiscountModule } from './modules/discount/discount.module';
import { CreditModule } from './modules/credit/credit.module';
import { BatchModule } from './modules/batch/batch.module';
import { StaffModule } from './modules/staff/staff.module';
import { BillingModule } from './modules/billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: databaseConfig }),
    EventsModule,
    AuthModule,
    TenantModule,
    InventoryModule,
    PosModule,
    CustomerModule,
    AnalyticsModule,
    SupplierModule,
    ExpenseModule,
    DiscountModule,
    CreditModule,
    BatchModule,
    StaffModule,
    BillingModule,
  ],
})
export class AppModule {}
