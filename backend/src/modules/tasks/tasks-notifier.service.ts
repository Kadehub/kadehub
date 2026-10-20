import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TaskNotification } from '../../database/entities/task-notification.entity';
import { User } from '../../database/entities/user.entity';
import { EmailService } from '../../common/email.service';

export type NotificationType =
  | 'offer_received' | 'question_received' | 'question_answered' | 'offer_accepted' | 'offer_rejected'
  | 'task_completed' | 'task_closed' | 'task_cancelled' | 'review_received' | 'message_received';

function esc(s: string) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** In-app notification rows + a best-effort email for each marketplace event. */
@Injectable()
export class TasksNotifierService {
  constructor(
    @InjectRepository(TaskNotification) private notifRepo: Repository<TaskNotification>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private email: EmailService,
  ) {}

  private tasksUrl(path: string) {
    const base = process.env.TASKS_URL || `https://tasks.${process.env.CLOUDFLARE_BASE_DOMAIN || 'kadehub.com'}`;
    return `${base.replace(/\/$/, '')}${path}`;
  }

  async notify(userId: number, type: NotificationType, title: string, body: string, taskId?: number) {
    await this.notifRepo.save(this.notifRepo.create({ user_id: userId, type, title, body, task_id: taskId ?? null }));

    // Email never blocks or fails the request
    this.userRepo.findOne({ where: { id: userId }, select: ['id', 'email', 'name'] }).then(user => {
      if (!user?.email) return;
      const link = taskId ? this.tasksUrl(type === 'message_received' ? `/messages/${taskId}` : `/t/${taskId}`) : this.tasksUrl('/notifications');
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#0F172A">
          <h2 style="color:#F59E0B;margin-bottom:4px">KadeHub Tasks</h2>
          <p>Hi ${esc(user.name)},</p>
          <p style="font-size:16px;font-weight:bold">${esc(title)}</p>
          <p style="color:#475569">${esc(body)}</p>
          <p><a href="${link}" style="display:inline-block;background:#F59E0B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open in KadeHub Tasks</a></p>
        </div>`;
      return this.email.send(user.email, `${title} — KadeHub Tasks`, html);
    }).catch(() => {});
  }

  list(userId: number, page = 1, limit = 30) {
    return this.notifRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async unreadCount(userId: number) {
    const count = await this.notifRepo.count({ where: { user_id: userId, read_at: IsNull() } });
    return { count };
  }

  async markRead(userId: number, id?: number) {
    await this.notifRepo.update(
      id ? { id, user_id: userId, read_at: IsNull() } : { user_id: userId, read_at: IsNull() },
      { read_at: new Date() },
    );
    return this.unreadCount(userId);
  }
}
