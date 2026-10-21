import { EntityManager, In, Not } from 'typeorm';
import { Task } from '../../database/entities/task.entity';
import { TaskAttachment } from '../../database/entities/task-attachment.entity';
import { TaskQuestion } from '../../database/entities/task-question.entity';
import { TaskOffer } from '../../database/entities/task-offer.entity';
import { TaskMessage } from '../../database/entities/task-message.entity';
import { TaskReview } from '../../database/entities/task-review.entity';
import { TaskNotification } from '../../database/entities/task-notification.entity';
import { TaskReport } from '../../database/entities/task-report.entity';
import { TaskerProfile } from '../../database/entities/tasker-profile.entity';

/**
 * Removes everything these people did on KadeHub Tasks. The Tasks tables have no foreign keys to `user`, so
 * deleting an account would otherwise leave its tasks, offers and messages behind with no owner.
 * Tasks they were hired for (and hadn't finished) go back to open so the poster can hire someone else.
 */
export async function deleteTasksDataForUsers(em: EntityManager, userIds: number[]) {
  if (!userIds.length) return;
  const ids = In(userIds);

  // Their own tasks, with everything hanging off them
  const posted = (await em.find(Task, { where: { poster_id: ids }, select: ['id'] })).map(t => t.id);
  if (posted.length) {
    const onPosted = In(posted);
    for (const entity of [TaskAttachment, TaskQuestion, TaskOffer, TaskMessage, TaskReview, TaskNotification, TaskReport]) {
      await em.delete(entity, { task_id: onPosted });
    }
    await em.delete(Task, { id: onPosted });
  }

  // Other people's tasks they were hired for → open again
  await em.update(Task, { assigned_tasker_id: ids, status: In(['assigned', 'completed']) }, {
    status: 'open', assigned_tasker_id: null, assigned_offer_id: null, agreed_amount: null,
  } as any);

  // Their offers, questions, messages, reviews, reports and profile on everyone else's tasks
  const offeredOn = [...new Set((await em.find(TaskOffer, { where: { tasker_id: ids }, select: ['task_id'] })).map(o => o.task_id))];
  await em.delete(TaskOffer, { tasker_id: ids });
  await em.delete(TaskQuestion, { user_id: ids });
  await em.delete(TaskMessage, { sender_id: ids });
  await em.delete(TaskReview, { reviewer_id: ids });
  await em.delete(TaskReview, { reviewee_id: ids });
  await em.delete(TaskNotification, { user_id: ids });
  await em.delete(TaskReport, { reporter_id: ids });
  await em.delete(TaskReport, { reported_user_id: ids });
  await em.delete(TaskerProfile, { user_id: ids });

  for (const taskId of offeredOn) {
    const count = await em.count(TaskOffer, { where: { task_id: taskId, status: Not('withdrawn') } });
    await em.update(Task, { id: taskId }, { offers_count: count });
  }
}
