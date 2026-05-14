import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../../database/entities/expense.entity';
import { ExpenseCategory } from '../../database/entities/expense-category.entity';
import { Subscription } from '../../database/entities/subscription.entity';
import { TrialGuard } from '../../common/guards/trial.guard';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ExpenseCategory, Subscription]), AuthModule],
  providers: [ExpenseService, TrialGuard],
  controllers: [ExpenseController],
})
export class ExpenseModule {}
