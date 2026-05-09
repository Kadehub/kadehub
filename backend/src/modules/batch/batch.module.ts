import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from '../../database/entities/batch.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TrialGuard } from '../../common/guards/trial.guard';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, Subscription]), AuthModule],
  providers: [BatchService, TrialGuard],
  controllers: [BatchController],
})
export class BatchModule {}
