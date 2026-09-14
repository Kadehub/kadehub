import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { Customer } from '../../database/entities/customer.entity';
import { Sale } from '../../database/entities/sale.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TrialGuard } from '../../common/guards/trial.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Sale, Subscription]), AuthModule],
  controllers: [CustomerController],
  providers: [CustomerService, TrialGuard, SubscriptionGuard],
})
export class CustomerModule {}
