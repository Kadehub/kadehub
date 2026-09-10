import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationController } from './quotation.controller';
import { QuotationService } from './quotation.service';
import { Quotation } from '../../database/entities/quotation.entity';
import { Package } from '../../database/entities/package.entity';
import { EmailService } from '../../common/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, Package])],
  controllers: [QuotationController],
  providers: [QuotationService, EmailService],
  exports: [QuotationService],
})
export class QuotationModule {}
