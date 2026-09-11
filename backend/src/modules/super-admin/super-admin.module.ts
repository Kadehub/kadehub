import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { Package } from '../../database/entities/package.entity';
import { Coupon } from '../../database/entities/coupon.entity';
import { Announcement } from '../../database/entities/announcement.entity';
import { ApiLog } from '../../database/entities/api-log.entity';
import { CompanyProfile } from '../../database/entities/company-profile.entity';
import { EmailService } from '../../common/email.service';
import { CloudflareService } from '../../common/cloudflare.service';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Subscription, PaymentTransaction, Package, Coupon, Announcement, ApiLog, CompanyProfile]),
    ScheduleModule.forRoot(),
    BillingModule,
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, EmailService, CloudflareService],
  exports: [EmailService],
})
export class SuperAdminModule {}
