import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from '../../database/entities/batch.entity';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Batch]), AuthModule],
  providers: [BatchService],
  controllers: [BatchController],
})
export class BatchModule {}
