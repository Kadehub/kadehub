import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discount } from '../../database/entities/discount.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TrialGuard } from '../../common/guards/trial.guard';
import { SubscriptionGuard } from '../../common/guards/subscription.guard';
import { DiscountService } from './discount.service';
import { DiscountController } from './discount.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Discount, Subscription]), AuthModule],
  providers: [DiscountService, TrialGuard, SubscriptionGuard],
  controllers: [DiscountController],
})
export class DiscountModule {}
