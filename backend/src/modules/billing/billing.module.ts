import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InvoiceService } from './invoice.service';
import { EmailService } from '../../common/email.service';
import { Package } from '../../database/entities/package.entity';
import { PackageModule } from '../../database/entities/package-module.entity';
import { CompanyProfile } from '../../database/entities/company-profile.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Package, PackageModule, CompanyProfile, Subscription, PaymentTransaction, Tenant, Invoice, User])],
  controllers: [BillingController],
  providers: [BillingService, InvoiceService, EmailService],
  exports: [BillingService, InvoiceService],
})
export class BillingModule {}
