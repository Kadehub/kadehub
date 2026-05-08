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
import { EmailService } from '../../common/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, Subscription, PaymentTransaction, Package, Coupon, Announcement, ApiLog]),
    ScheduleModule.forRoot(),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, EmailService],
  exports: [EmailService],
})
export class SuperAdminModule {}
