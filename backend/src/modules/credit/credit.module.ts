import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditSale } from '../../database/entities/credit-sale.entity';
import { CreditPayment } from '../../database/entities/credit-payment.entity';
import { CreditService } from './credit.service';
import { CreditController } from './credit.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CreditSale, CreditPayment]), AuthModule],
  providers: [CreditService],
  controllers: [CreditController],
})
export class CreditModule {}
