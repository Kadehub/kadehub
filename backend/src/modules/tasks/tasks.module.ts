import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksAdminController } from './tasks-admin.controller';
import { TasksService } from './tasks.service';
import { TasksNotifierService } from './tasks-notifier.service';
import { EmailService } from '../../common/email.service';
import { Task } from '../../database/entities/task.entity';
import { TaskCategory } from '../../database/entities/task-category.entity';
import { TaskAttachment } from '../../database/entities/task-attachment.entity';
import { TaskQuestion } from '../../database/entities/task-question.entity';
import { TaskOffer } from '../../database/entities/task-offer.entity';
import { TaskMessage } from '../../database/entities/task-message.entity';
import { TaskReview } from '../../database/entities/task-review.entity';
import { TaskerProfile } from '../../database/entities/tasker-profile.entity';
import { TaskReport } from '../../database/entities/task-report.entity';
import { TaskNotification } from '../../database/entities/task-notification.entity';
import { User } from '../../database/entities/user.entity';

// KadeHub Tasks: the Airtasker-style marketplace served at tasks.kadehub.com. Users are global (user_id), not tenant-scoped.
@Module({
  imports: [TypeOrmModule.forFeature([
    Task, TaskCategory, TaskAttachment, TaskQuestion, TaskOffer, TaskMessage, TaskReview,
    TaskerProfile, TaskReport, TaskNotification, User,
  ])],
  // Admin controller first so /tasks/admin/* never falls through to /tasks/:id
  controllers: [TasksAdminController, TasksController],
  providers: [TasksService, TasksNotifierService, EmailService],
})
export class TasksModule {}
