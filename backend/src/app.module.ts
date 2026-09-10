import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as dotenv from 'dotenv';
dotenv.config(); // must run before any decorator reads process.env
import { ApiLoggerMiddleware } from './common/middleware/api-logger.middleware';
import { ApiLog } from './database/entities/api-log.entity';
import { Coupon } from './database/entities/coupon.entity';
import { Announcement } from './database/entities/announcement.entity';
import { JwtModule } from '@nestjs/jwt';
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
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { QuotationModule } from './modules/quotation/quotation.module';
import { EmailService } from './common/email.service';

@Module({
  imports: [
    JwtModule.register({ 
      global: true, 
      secret: (() => {
        const s = process.env.JWT_SECRET;
        if (!s) throw new Error('JWT_SECRET environment variable is required');
        if (process.env.NODE_ENV === 'production' && s === 'your_super_secret_jwt_key_change_in_production')
          throw new Error('JWT_SECRET must be changed from the default value in production');
        return s;
      })(),
      signOptions: { expiresIn: '7d' } 
    }),
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
    SuperAdminModule,
    QuotationModule,
    TypeOrmModule.forFeature([ApiLog, Coupon, Announcement]),
  ],
  providers: [EmailService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiLoggerMiddleware).forRoutes('*');
  }
}
