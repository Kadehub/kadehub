import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Shift } from '../../database/entities/shift.entity';
import { Sale } from '../../database/entities/sale.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TrialGuard } from '../../common/guards/trial.guard';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, Shift, Sale, Subscription]), AuthModule],
  providers: [StaffService, TrialGuard],
  controllers: [StaffController],
  exports: [StaffService],
})
export class StaffModule {}
