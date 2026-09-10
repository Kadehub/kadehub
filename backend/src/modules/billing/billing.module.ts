import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InvoiceService } from './invoice.service';
import { Package } from '../../database/entities/package.entity';
import { PackageModule } from '../../database/entities/package-module.entity';
import { CompanyProfile } from '../../database/entities/company-profile.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { PaymentTransaction } from '../../database/entities/payment-transaction.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Tenant } from '../../database/entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Package, PackageModule, CompanyProfile, Subscription, PaymentTransaction, Tenant, Invoice])],
  controllers: [BillingController],
  providers: [BillingService, InvoiceService],
  exports: [BillingService, InvoiceService],
})
export class BillingModule {}
