import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditSale } from '../../database/entities/credit-sale.entity';
import { CreditPayment } from '../../database/entities/credit-payment.entity';
import { Sale } from '../../database/entities/sale.entity';
import { Customer } from '../../database/entities/customer.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TrialGuard } from '../../common/guards/trial.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CreditSale, CreditPayment, Sale, Customer, Subscription]), AuthModule],
  providers: [CreditService, TrialGuard, SubscriptionGuard],
  controllers: [CreditController],
})
export class CreditModule {}
