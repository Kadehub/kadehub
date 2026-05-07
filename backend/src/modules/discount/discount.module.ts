import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discount } from '../../database/entities/discount.entity';
import { DiscountService } from './discount.service';
import { DiscountController } from './discount.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Discount]), AuthModule],
  providers: [DiscountService],
  controllers: [DiscountController],
})
export class DiscountModule {}
