import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { Sale } from '../../database/entities/sale.entity';
import { SaleItem } from '../../database/entities/sale-item.entity';
import { CreditSale } from '../../database/entities/credit-sale.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, CreditSale]), AuthModule],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
