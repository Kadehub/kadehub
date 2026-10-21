import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, In, IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';
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
import { ProductAccessService } from '../platform/product-access.service';
import { TasksNotifierService } from './tasks-notifier.service';
import {
  CreateTaskDto, UpdateTaskDto, QuestionDto, OfferDto, MessageDto, ReviewDto, ProfileDto, ReportDto, ListTasksQuery,
} from './tasks.dto';

export interface Viewer { sub: number; tenant_id: number; role: string; name?: string }

const MAX_OFFERS_PER_DAY = 20;
const MAX_TASKS_PER_DAY = 10;
const MAX_ATTACHMENTS = 6;
const AUTO_CLOSE_DAYS = 7;
const LISTED_STATUSES = ['open', 'assigned', 'completed', 'closed'];

/** Hide phone numbers and emails in public text so deals don't move off the platform before assignment. */
export function maskContacts(text: string): string {
  return String(text ?? '')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[contact hidden]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, m => (m.replace(/\D/g, '').length >= 9 ? '[contact hidden]' : m));
}

export function publicUser(u?: Partial<User> | null) {
  return u ? { id: u.id, name: u.name, photo_url: u.photo_url ?? null } : null;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  /** Tenants already marked as using Tasks, to skip the lookup on every write. */
  private enabledTenants = new Set<number>();

  constructor(
    private ds: DataSource,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(TaskCategory) private categoryRepo: Repository<TaskCategory>,
    @InjectRepository(TaskAttachment) private attachRepo: Repository<TaskAttachment>,
    @InjectRepository(TaskQuestion) private questionRepo: Repository<TaskQuestion>,
    @InjectRepository(TaskOffer) private offerRepo: Repository<TaskOffer>,
    @InjectRepository(TaskMessage) private messageRepo: Repository<TaskMessage>,
    @InjectRepository(TaskReview) private reviewRepo: Repository<TaskReview>,
    @InjectRepository(TaskerProfile) private profileRepo: Repository<TaskerProfile>,
    @InjectRepository(TaskReport) private reportRepo: Repository<TaskReport>,
    @InjectRepository(TaskNotification) private notifRepo: Repository<TaskNotification>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private productAccess: ProductAccessService,
    private notifier: TasksNotifierService,
  ) {}

  // ── helpers ───────────────────────────────────────────────────────────────

  private async ensureEnabled(user: Viewer) {
    if (user.role === 'SUPER_ADMIN' || this.enabledTenants.has(user.tenant_id)) return;
    await this.productAccess.enableProduct(user.tenant_id, 'tasks');
    this.enabledTenants.add(user.tenant_id);
  }

  /** Super admin ban (Tasks only): reading still works, taking part doesn't. */
  private async assertNotBanned(user: Viewer) {
    const u = await this.userRepo.findOne({ where: { id: user.sub }, select: ['id', 'tasks_banned_at'] });
    if (u?.tasks_banned_at) {
      throw new ForbiddenException({ statusCode: 403, code: 'TASKS_BANNED', message: 'Your KadeHub Tasks access has been suspended. Contact support.' });
    }
  }

  private async getTask(id: number) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async getOrCreateProfile(userId: number) {
    let profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    if (!profile) profile = await this.profileRepo.save(this.profileRepo.create({ user_id: userId }));
    return profile;
  }

  private async profilesFor(userIds: number[]) {
    const ids = [...new Set(userIds.filter(Boolean))];
    const rows = ids.length ? await this.profileRepo.find({ where: { user_id: In(ids) } }) : [];
    return new Map(rows.map(p => [p.user_id, p]));
  }

  private stats(p?: TaskerProfile) {
    return { rating_avg: p?.rating_avg ?? 0, rating_count: p?.rating_count ?? 0, completed_count: p?.completed_count ?? 0 };
  }

  private card(t: Task, thumb?: string) {
    return {
      id: t.id, title: t.title, budget: t.budget, agreed_amount: t.agreed_amount, status: t.status,
      location_type: t.location_type, district: t.district, city: t.city, due_date: t.due_date, flexible: t.flexible,
      offers_count: t.offers_count, hidden: t.hidden, created_at: t.created_at,
      category: t.category ? { id: t.category.id, name: t.category.name, slug: t.category.slug, icon: t.category.icon } : null,
      poster: publicUser(t.poster),
      thumbnail: thumb ?? null,
    };
  }

  private async thumbnails(taskIds: number[]) {
    if (!taskIds.length) return new Map<number, string>();
    const rows = await this.attachRepo.find({ where: { task_id: In(taskIds) }, order: { id: 'ASC' } });
    const map = new Map<number, string>();
    for (const r of rows) if (!map.has(r.task_id)) map.set(r.task_id, r.url);
    return map;
  }

  private taskQuery() {
    return this.taskRepo.createQueryBuilder('t')
      .leftJoin('t.category', 'c').addSelect(['c.id', 'c.name', 'c.slug', 'c.icon'])
      .leftJoin('t.poster', 'p').addSelect(['p.id', 'p.name', 'p.photo_url']);
  }

  private async recountOffers(taskId: number) {
    const count = await this.offerRepo.count({ where: { task_id: taskId, status: Not('withdrawn') } });
    await this.taskRepo.update(taskId, { offers_count: count });
  }

  private isParty(task: Task, userId: number) {
    return task.poster_id === userId || task.assigned_tasker_id === userId;
  }

  // ── public ────────────────────────────────────────────────────────────────

  categories() {
    return this.categoryRepo.find({ where: { is_active: true }, order: { sort_order: 'ASC', name: 'ASC' } });
  }

  async list(query: ListTasksQuery) {
    const page = Math.max(1, parseInt(query.page || '1') || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20') || 20));
    const qb = this.taskQuery().where('t.hidden = :hidden', { hidden: false });
    qb.andWhere(`t.poster_id NOT IN ${qb.subQuery().select('bu.id').from(User, 'bu').where('bu.tasks_banned_at IS NOT NULL').getQuery()}`);

    const status = query.status || 'open';
    if (status === 'all') qb.andWhere('t.status IN (:...statuses)', { statuses: LISTED_STATUSES });
    else if (LISTED_STATUSES.includes(status)) qb.andWhere('t.status = :status', { status });
    else qb.andWhere('t.status = :status', { status: 'open' });

    if (query.q?.trim()) {
      qb.andWhere('(LOWER(t.title) LIKE :q OR LOWER(t.description) LIKE :q)', { q: `%${query.q.trim().toLowerCase()}%` });
    }
    if (query.category) qb.andWhere('c.slug = :cat', { cat: query.category });
    if (query.district) qb.andWhere('t.district = :district', { district: query.district });
    if (query.remote === 'true' || query.remote === '1') qb.andWhere('t.location_type = :remote', { remote: 'remote' });
    if (query.remote === 'false' || query.remote === '0') qb.andWhere('t.location_type = :remote', { remote: 'in_person' });
    if (query.min && !isNaN(+query.min)) qb.andWhere('t.budget >= :min', { min: +query.min });
    if (query.max && !isNaN(+query.max)) qb.andWhere('t.budget <= :max', { max: +query.max });

    switch (query.sort) {
      case 'budget_high': qb.orderBy('t.budget', 'DESC'); break;
      case 'budget_low': qb.orderBy('t.budget', 'ASC'); break;
      case 'due_soon': qb.orderBy('t.due_date', 'ASC'); break;
      default: qb.orderBy('t.created_at', 'DESC');
    }
    qb.addOrderBy('t.id', 'DESC').skip((page - 1) * limit).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const thumbs = await this.thumbnails(rows.map(r => r.id));
    return { items: rows.map(t => this.card(t, thumbs.get(t.id))), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async detail(id: number, viewer: Viewer | null) {
    const task = await this.taskQuery()
      .leftJoin('t.assigned_tasker', 'at').addSelect(['at.id', 'at.name', 'at.photo_url'])
      .leftJoinAndSelect('t.attachments', 'a')
      .where('t.id = :id', { id })
      .getOne();
    if (!task) throw new NotFoundException('Task not found');

    const uid = viewer?.sub;
    const isPoster = uid === task.poster_id;
    const isAdmin = viewer?.role === 'SUPER_ADMIN';
    if (task.hidden && !isPoster && !isAdmin) throw new NotFoundException('Task not found');

    const offers = await this.offerRepo.find({ where: { task_id: id }, relations: ['tasker'], order: { created_at: 'ASC' } });
    const questions = await this.questionRepo.find({ where: { task_id: id }, relations: ['user'], order: { created_at: 'ASC' } });
    const reviews = await this.reviewRepo.find({ where: { task_id: id }, relations: ['reviewer'], order: { created_at: 'ASC' } });
    const profiles = await this.profilesFor([task.poster_id, ...offers.map(o => o.tasker_id)]);

    const visibleOffers = offers
      .filter(o => o.status !== 'withdrawn' || o.tasker_id === uid)
      .map(o => ({
        id: o.id,
        status: o.status,
        // The offer's own tasker sees their text as written; everyone else sees contacts masked
        message: o.tasker_id === uid ? o.message : maskContacts(o.message),
        amount: isPoster || isAdmin || o.tasker_id === uid ? o.amount : null,
        created_at: o.created_at,
        tasker: { ...publicUser(o.tasker), ...this.stats(profiles.get(o.tasker_id)) },
      }));

    const top = questions.filter(q => !q.parent_id);
    const qa = top.map(q => ({
      id: q.id, body: maskContacts(q.body), created_at: q.created_at, user: publicUser(q.user),
      replies: questions.filter(r => r.parent_id === q.id).map(r => ({
        id: r.id, body: maskContacts(r.body), created_at: r.created_at, user: publicUser(r.user),
      })),
    }));

    const myOffer = uid ? offers.filter(o => o.tasker_id === uid && o.status !== 'withdrawn').pop() ?? null : null;
    const isTasker = !!uid && uid === task.assigned_tasker_id;
    const reviewed = uid ? reviews.some(r => r.reviewer_id === uid) : false;

    return {
      task: {
        ...this.card(task),
        description: task.description,
        poster: { ...publicUser(task.poster), ...this.stats(profiles.get(task.poster_id)) },
        assigned_tasker: publicUser(task.assigned_tasker),
        attachments: (task.attachments || []).sort((a, b) => a.id - b.id).map(a => ({ id: a.id, url: a.url })),
        completed_at: task.completed_at, closed_at: task.closed_at, cancelled_at: task.cancelled_at,
      },
      offers: visibleOffers,
      questions: qa,
      reviews: reviews.map(r => ({
        id: r.id, rating: r.rating, comment: r.comment, role: r.role, reviewee_id: r.reviewee_id,
        reviewer: publicUser(r.reviewer), created_at: r.created_at,
      })),
      viewer: {
        signed_in: !!uid,
        is_poster: isPoster,
        is_tasker: isTasker,
        my_offer: myOffer ? { id: myOffer.id, amount: myOffer.amount, status: myOffer.status } : null,
        can_offer: !!uid && !isPoster && task.status === 'open' && !myOffer,
        can_review: !!uid && task.status === 'closed' && (isPoster || isTasker) && !reviewed,
      },
    };
  }

  async publicProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'name', 'photo_url', 'created_at'] });
    if (!user) throw new NotFoundException('User not found');
    const profile = await this.profileRepo.findOne({ where: { user_id: userId } });
    const reviews = await this.reviewRepo.find({
      where: { reviewee_id: userId }, relations: ['reviewer', 'task'], order: { created_at: 'DESC' }, take: 50,
    });
    const posted = await this.taskRepo.count({ where: { poster_id: userId, hidden: false } });
    return {
      user: { ...publicUser(user), member_since: user.created_at },
      profile: {
        headline: profile?.headline ?? null, bio: profile?.bio ?? null, district: profile?.district ?? null,
        skills: profile?.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        phone_verified: profile?.phone_verified ?? false,
        ...this.stats(profile),
      },
      tasks_posted: posted,
      reviews: reviews.map(r => ({
        id: r.id, rating: r.rating, comment: r.comment, role: r.role, created_at: r.created_at,
        reviewer: publicUser(r.reviewer), task: r.task ? { id: r.task.id, title: r.task.title } : null,
      })),
    };
  }

  // ── posting ───────────────────────────────────────────────────────────────

  async create(user: Viewer, dto: CreateTaskDto) {
    await this.assertNotBanned(user);
    await this.ensureEnabled(user);
    const since = new Date(Date.now() - 24 * 3600_000);
    if (await this.taskRepo.count({ where: { poster_id: user.sub, created_at: MoreThan(since) } }) >= MAX_TASKS_PER_DAY) {
      throw new HttpException('You can post up to 10 tasks per day', HttpStatus.TOO_MANY_REQUESTS);
    }
    const category = await this.categoryRepo.findOne({ where: { id: dto.category_id, is_active: true } });
    if (!category) throw new BadRequestException('Choose a valid category');
    if (dto.location_type === 'in_person' && !dto.district) throw new BadRequestException('Choose a district for in-person tasks');
    if (dto.due_date && dto.due_date < new Date().toISOString().slice(0, 10)) throw new BadRequestException('Due date cannot be in the past');

    const task = await this.taskRepo.save(this.taskRepo.create({
      poster_id: user.sub,
      category_id: dto.category_id,
      title: dto.title.trim(),
      description: dto.description.trim(),
      location_type: dto.location_type,
      district: dto.location_type === 'in_person' ? dto.district : dto.district ?? null,
      city: dto.city?.trim() || null,
      due_date: dto.due_date || null,
      flexible: !!dto.flexible || !dto.due_date,
      budget: dto.budget,
      status: 'open',
    }));
    return { id: task.id };
  }

  async update(user: Viewer, id: number, dto: UpdateTaskDto) {
    await this.assertNotBanned(user);
    const task = await this.getTask(id);
    if (task.poster_id !== user.sub) throw new ForbiddenException('Only the poster can edit this task');
    if (task.status !== 'open') throw new BadRequestException('Only open tasks can be edited');
    if (dto.category_id && !(await this.categoryRepo.findOne({ where: { id: dto.category_id, is_active: true } }))) {
      throw new BadRequestException('Choose a valid category');
    }
    Object.assign(task, {
      ...dto,
      title: dto.title?.trim() ?? task.title,
      description: dto.description?.trim() ?? task.description,
      city: dto.city !== undefined ? dto.city.trim() || null : task.city,
    });
    if (task.location_type === 'in_person' && !task.district) throw new BadRequestException('Choose a district for in-person tasks');
    await this.taskRepo.save(task);
    return { id: task.id };
  }

  async addAttachment(user: Viewer, id: number, url: string) {
    const task = await this.getTask(id);
    if (task.poster_id !== user.sub) throw new ForbiddenException('Only the poster can add photos');
    if (await this.attachRepo.count({ where: { task_id: id } }) >= MAX_ATTACHMENTS) {
      throw new BadRequestException(`Up to ${MAX_ATTACHMENTS} photos per task`);
    }
    const a = await this.attachRepo.save(this.attachRepo.create({ task_id: id, url }));
    return { id: a.id, url: a.url };
  }

  async assertCanAttach(user: Viewer, id: number) {
    const task = await this.getTask(id);
    if (task.poster_id !== user.sub) throw new ForbiddenException('Only the poster can add photos');
    if (!['open', 'assigned'].includes(task.status)) throw new BadRequestException('This task can no longer be changed');
  }

  async removeAttachment(user: Viewer, id: number, attachmentId: number) {
    const task = await this.getTask(id);
    if (task.poster_id !== user.sub) throw new ForbiddenException();
    await this.attachRepo.delete({ id: attachmentId, task_id: id });
    return { ok: true };
  }

  async cancel(user: Viewer, id: number) {
    const task = await this.getTask(id);
    if (task.poster_id !== user.sub) throw new ForbiddenException('Only the poster can cancel this task');
    if (!['open', 'assigned'].includes(task.status)) throw new BadRequestException('This task can no longer be cancelled');
    await this.cancelTask(task, 'The poster cancelled this task.');
    return { ok: true };
  }

  private async cancelTask(task: Task, reason: string) {
    const pending = await this.offerRepo.find({ where: { task_id: task.id, status: 'pending' } });
    await this.offerRepo.update({ task_id: task.id, status: 'pending' }, { status: 'rejected' });
    await this.taskRepo.update(task.id, { status: 'cancelled', cancelled_at: new Date() });
    const notifyIds = new Set<number>(pending.map(o => o.tasker_id));
    if (task.assigned_tasker_id) notifyIds.add(task.assigned_tasker_id);
    for (const uid of notifyIds) {
      await this.notifier.notify(uid, 'task_cancelled', `Task cancelled: ${task.title}`, reason, task.id);
    }
  }

  // ── questions & offers ────────────────────────────────────────────────────

  async ask(user: Viewer, id: number, dto: QuestionDto) {
    await this.assertNotBanned(user);
    await this.ensureEnabled(user);
    const task = await this.getTask(id);
    if (task.hidden || task.status !== 'open') throw new BadRequestException('Questions are closed for this task');

    let parent: TaskQuestion | null = null;
    if (dto.parent_id) {
      parent = await this.questionRepo.findOne({ where: { id: dto.parent_id, task_id: id } });
      if (!parent || parent.parent_id) throw new BadRequestException('Invalid question to reply to');
      if (user.sub !== task.poster_id && user.sub !== parent.user_id) {
        throw new ForbiddenException('Only the poster or the person who asked can reply');
      }
    }
    const q = await this.questionRepo.save(this.questionRepo.create({
      task_id: id, user_id: user.sub, parent_id: parent?.id ?? null, body: dto.body.trim(),
    }));

    if (!parent && user.sub !== task.poster_id) {
      await this.notifier.notify(task.poster_id, 'question_received', `New question on "${task.title}"`, maskContacts(q.body), id);
    } else if (parent && user.sub === task.poster_id && parent.user_id !== user.sub) {
      await this.notifier.notify(parent.user_id, 'question_answered', `The poster replied on "${task.title}"`, maskContacts(q.body), id);
    }
    return { id: q.id };
  }

  async makeOffer(user: Viewer, id: number, dto: OfferDto) {
    await this.assertNotBanned(user);
    await this.ensureEnabled(user);
    const task = await this.getTask(id);
    if (task.hidden || task.status !== 'open') throw new BadRequestException('This task is no longer accepting offers');
    if (task.poster_id === user.sub) throw new BadRequestException('You cannot make an offer on your own task');
    if (await this.offerRepo.findOne({ where: { task_id: id, tasker_id: user.sub, status: 'pending' } })) {
      throw new BadRequestException('You already have an offer on this task — withdraw it to make a new one');
    }
    const since = new Date(Date.now() - 24 * 3600_000);
    if (await this.offerRepo.count({ where: { tasker_id: user.sub, created_at: MoreThan(since) } }) >= MAX_OFFERS_PER_DAY) {
      throw new HttpException(`You can make up to ${MAX_OFFERS_PER_DAY} offers per day`, HttpStatus.TOO_MANY_REQUESTS);
    }
    const offer = await this.offerRepo.save(this.offerRepo.create({
      task_id: id, tasker_id: user.sub, amount: dto.amount, message: dto.message.trim(), status: 'pending',
    }));
    await this.getOrCreateProfile(user.sub);
    await this.recountOffers(id);
    await this.notifier.notify(task.poster_id, 'offer_received', `New offer on "${task.title}"`,
      `${user.name || 'A tasker'} offered LKR ${Number(dto.amount).toLocaleString('en-LK')}.`, id);
    return { id: offer.id };
  }

  async withdrawOffer(user: Viewer, offerId: number) {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer || offer.tasker_id !== user.sub) throw new NotFoundException('Offer not found');
    if (offer.status !== 'pending') throw new BadRequestException('Only pending offers can be withdrawn');
    await this.offerRepo.update(offerId, { status: 'withdrawn' });
    await this.recountOffers(offer.task_id);
    return { ok: true };
  }

  async acceptOffer(user: Viewer, offerId: number) {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found');
    const task = await this.getTask(offer.task_id);
    if (task.poster_id !== user.sub) throw new ForbiddenException('Only the poster can accept offers');
    if (task.status !== 'open') throw new BadRequestException('This task already has a tasker');
    if (offer.status !== 'pending') throw new BadRequestException('This offer is no longer available');

    const rejected = await this.ds.transaction(async em => {
      // Guarded update: only one acceptance can win if two requests race
      const res = await em.update(Task, { id: task.id, status: 'open' }, {
        status: 'assigned', assigned_offer_id: offer.id, assigned_tasker_id: offer.tasker_id, agreed_amount: offer.amount,
      });
      if (!res.affected) throw new BadRequestException('This task already has a tasker');
      await em.update(TaskOffer, { id: offer.id }, { status: 'accepted' });
      const others = await em.find(TaskOffer, { where: { task_id: task.id, status: 'pending', id: Not(offer.id) } });
      await em.update(TaskOffer, { task_id: task.id, status: 'pending', id: Not(offer.id) }, { status: 'rejected' });
      return others;
    });

    await this.notifier.notify(offer.tasker_id, 'offer_accepted', `Your offer was accepted: "${task.title}"`,
      `Agreed price LKR ${Number(offer.amount).toLocaleString('en-LK')}. Message the poster to arrange the details.`, task.id);
    for (const o of rejected) {
      await this.notifier.notify(o.tasker_id, 'offer_rejected', `Task assigned to someone else`, `"${task.title}" was assigned to another tasker.`, task.id);
    }
    return { ok: true };
  }

  // ── completion & reviews ──────────────────────────────────────────────────

  async markComplete(user: Viewer, id: number) {
    const task = await this.getTask(id);
    if (task.assigned_tasker_id !== user.sub) throw new ForbiddenException('Only the assigned tasker can mark this complete');
    if (task.status !== 'assigned') throw new BadRequestException('This task is not in progress');
    await this.taskRepo.update(id, { status: 'completed', completed_at: new Date() });
    await this.notifier.notify(task.poster_id, 'task_completed', `"${task.title}" is marked complete`,
      `Check the work, then confirm to close the task. It closes automatically after ${AUTO_CLOSE_DAYS} days.`, id);
    return { ok: true };
  }

  async confirm(user: Viewer, id: number) {
    const task = await this.getTask(id);
    if (task.poster_id !== user.sub) throw new ForbiddenException('Only the poster can confirm completion');
    if (!['assigned', 'completed'].includes(task.status)) throw new BadRequestException('This task cannot be closed now');
    await this.closeTask(task);
    return { ok: true };
  }

  private async closeTask(task: Task) {
    const res = await this.taskRepo.update({ id: task.id, status: In(['assigned', 'completed']) }, {
      status: 'closed', closed_at: new Date(), completed_at: task.completed_at ?? new Date(),
    });
    if (!res.affected) return;
    if (task.assigned_tasker_id) {
      const profile = await this.getOrCreateProfile(task.assigned_tasker_id);
      await this.profileRepo.update(profile.id, { completed_count: profile.completed_count + 1 });
      await this.notifier.notify(task.assigned_tasker_id, 'task_closed', `"${task.title}" is closed`, 'Leave a review for the poster.', task.id);
    }
    await this.notifier.notify(task.poster_id, 'task_closed', `"${task.title}" is closed`, 'Leave a review for your tasker.', task.id);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async autoCloseCompleted() {
    const cutoff = new Date(Date.now() - AUTO_CLOSE_DAYS * 24 * 3600_000);
    try {
      const due = await this.taskRepo.find({ where: { status: 'completed', completed_at: LessThan(cutoff) } });
      for (const task of due) await this.closeTask(task);
      if (due.length) this.logger.log(`Auto-closed ${due.length} completed task(s)`);
    } catch (err) {
      // Tables may not exist yet on a fresh DB that skipped migrations
      this.logger.warn(`Auto-close skipped: ${err.message}`);
    }
  }

  async review(user: Viewer, id: number, dto: ReviewDto) {
    await this.assertNotBanned(user);
    const task = await this.getTask(id);
    if (task.status !== 'closed') throw new BadRequestException('Reviews open once the task is closed');
    if (!this.isParty(task, user.sub) || !task.assigned_tasker_id) throw new ForbiddenException('Only the poster and the tasker can review');
    if (await this.reviewRepo.findOne({ where: { task_id: id, reviewer_id: user.sub } })) {
      throw new BadRequestException('You already reviewed this task');
    }
    const revieweeId = user.sub === task.poster_id ? task.assigned_tasker_id : task.poster_id;
    const role = user.sub === task.poster_id ? 'tasker' : 'poster';
    await this.reviewRepo.save(this.reviewRepo.create({
      task_id: id, reviewer_id: user.sub, reviewee_id: revieweeId, role, rating: dto.rating, comment: dto.comment?.trim() || null,
    }));

    const agg = await this.reviewRepo.createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg').addSelect('COUNT(r.id)', 'count')
      .where('r.reviewee_id = :id', { id: revieweeId })
      .getRawOne();
    const profile = await this.getOrCreateProfile(revieweeId);
    await this.profileRepo.update(profile.id, {
      rating_avg: Math.round((parseFloat(agg?.avg) || 0) * 100) / 100,
      rating_count: parseInt(agg?.count) || 0,
    });
    await this.notifier.notify(revieweeId, 'review_received', `You received a ${dto.rating}★ review`, `On "${task.title}".`, id);
    return { ok: true };
  }

  // ── private messages ──────────────────────────────────────────────────────

  async messages(user: Viewer, id: number) {
    const task = await this.taskRepo.findOne({
      where: { id }, relations: ['poster', 'assigned_tasker'],
    });
    if (!task) throw new NotFoundException('Task not found');
    if (!task.assigned_tasker_id || !this.isParty(task, user.sub)) throw new ForbiddenException('Messages are between the poster and the assigned tasker');

    await this.messageRepo.update({ task_id: id, sender_id: Not(user.sub), read_at: IsNull() }, { read_at: new Date() });
    await this.notifRepo.update({ user_id: user.sub, task_id: id, type: 'message_received', read_at: IsNull() }, { read_at: new Date() });
    const rows = await this.messageRepo.find({ where: { task_id: id }, order: { created_at: 'ASC', id: 'ASC' } });
    const other = user.sub === task.poster_id ? task.assigned_tasker : task.poster;
    return {
      task: { id: task.id, title: task.title, status: task.status, agreed_amount: task.agreed_amount, is_poster: user.sub === task.poster_id },
      other: publicUser(other),
      can_send: ['assigned', 'completed', 'closed'].includes(task.status),
      messages: rows.map(m => ({ id: m.id, body: m.body, mine: m.sender_id === user.sub, read_at: m.read_at, created_at: m.created_at })),
    };
  }

  async sendMessage(user: Viewer, id: number, dto: MessageDto) {
    await this.assertNotBanned(user);
    const task = await this.getTask(id);
    if (!task.assigned_tasker_id || !this.isParty(task, user.sub)) throw new ForbiddenException('Messages are between the poster and the assigned tasker');
    if (!['assigned', 'completed', 'closed'].includes(task.status)) throw new BadRequestException('This conversation is closed');
    const msg = await this.messageRepo.save(this.messageRepo.create({ task_id: id, sender_id: user.sub, body: dto.body.trim() }));

    // One notification (and email) per burst: skip while the recipient still has an unread one for this task
    const recipient = user.sub === task.poster_id ? task.assigned_tasker_id : task.poster_id;
    const pending = await this.notifRepo.count({ where: { user_id: recipient, task_id: id, type: 'message_received', read_at: IsNull() } });
    if (!pending) {
      await this.notifier.notify(recipient, 'message_received', `New message from ${user.name || 'KadeHub Tasks'}`, dto.body.trim().slice(0, 140), id);
    }
    return { id: msg.id, body: msg.body, mine: true, read_at: null, created_at: msg.created_at };
  }

  async threads(user: Viewer) {
    const tasks = await this.taskRepo.createQueryBuilder('t')
      .leftJoin('t.poster', 'p').addSelect(['p.id', 'p.name', 'p.photo_url'])
      .leftJoin('t.assigned_tasker', 'at').addSelect(['at.id', 'at.name', 'at.photo_url'])
      .where('t.assigned_tasker_id IS NOT NULL')
      .andWhere('(t.poster_id = :uid OR t.assigned_tasker_id = :uid)', { uid: user.sub })
      .orderBy('t.updated_at', 'DESC')
      .take(100)
      .getMany();

    const result = [];
    for (const t of tasks) {
      const last = await this.messageRepo.findOne({ where: { task_id: t.id }, order: { id: 'DESC' } });
      const unread = await this.messageRepo.count({ where: { task_id: t.id, sender_id: Not(user.sub), read_at: IsNull() } });
      result.push({
        task: { id: t.id, title: t.title, status: t.status },
        other: publicUser(t.poster_id === user.sub ? t.assigned_tasker : t.poster),
        last_message: last ? { body: last.body, mine: last.sender_id === user.sub, created_at: last.created_at } : null,
        unread,
        updated_at: last?.created_at ?? t.updated_at,
      });
    }
    return result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  // ── "my" views ────────────────────────────────────────────────────────────

  async myPosted(user: Viewer) {
    const rows = await this.taskQuery().where('t.poster_id = :uid', { uid: user.sub }).orderBy('t.created_at', 'DESC').getMany();
    const thumbs = await this.thumbnails(rows.map(r => r.id));
    return rows.map(t => this.card(t, thumbs.get(t.id)));
  }

  async myOffers(user: Viewer) {
    const offers = await this.offerRepo.find({ where: { tasker_id: user.sub }, order: { created_at: 'DESC' } });
    if (!offers.length) return [];
    const tasks = await this.taskQuery().where('t.id IN (:...ids)', { ids: [...new Set(offers.map(o => o.task_id))] }).getMany();
    const byId = new Map(tasks.map(t => [t.id, t]));
    const thumbs = await this.thumbnails(tasks.map(t => t.id));
    return offers
      .filter(o => byId.has(o.task_id))
      .map(o => {
        const t = byId.get(o.task_id);
        return {
          offer: { id: o.id, amount: o.amount, status: o.status, created_at: o.created_at },
          task: this.card(t, thumbs.get(t.id)),
          // "Working on" = the offer won the task
          assigned_to_me: t.assigned_tasker_id === user.sub,
        };
      });
  }

  // ── profile & reports ─────────────────────────────────────────────────────

  async myProfile(user: Viewer) {
    const profile = await this.getOrCreateProfile(user.sub);
    return { ...profile, skills: profile.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : [] };
  }

  async updateProfile(user: Viewer, dto: ProfileDto) {
    await this.ensureEnabled(user);
    const profile = await this.getOrCreateProfile(user.sub);
    if (dto.headline !== undefined) profile.headline = dto.headline.trim() || null;
    if (dto.bio !== undefined) profile.bio = dto.bio.trim() || null;
    if (dto.district !== undefined) profile.district = dto.district || null;
    if (dto.skills !== undefined) {
      profile.skills = dto.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20).join(', ') || null;
    }
    await this.profileRepo.save(profile);
    return this.myProfile(user);
  }

  async report(user: Viewer, dto: ReportDto) {
    if (!dto.task_id && !dto.user_id) throw new BadRequestException('Report a task or a user');
    if (dto.task_id) await this.getTask(dto.task_id);
    const r = await this.reportRepo.save(this.reportRepo.create({
      reporter_id: user.sub, task_id: dto.task_id ?? null, reported_user_id: dto.user_id ?? null,
      reason: dto.reason, details: dto.details?.trim() || null,
    }));
    return { id: r.id };
  }

  // ── admin (moderation) ────────────────────────────────────────────────────

  async adminStats() {
    const byStatus = await this.taskRepo.createQueryBuilder('t')
      .select('t.status', 'status').addSelect('COUNT(t.id)', 'count')
      .groupBy('t.status').getRawMany();
    const gmv = await this.taskRepo.createQueryBuilder('t')
      .select('COALESCE(SUM(t.agreed_amount), 0)', 'total')
      .where('t.status = :s', { s: 'closed' }).getRawOne();
    return {
      tasks: Object.fromEntries(byStatus.map(r => [r.status, parseInt(r.count)])),
      total_tasks: byStatus.reduce((s, r) => s + parseInt(r.count), 0),
      hidden_tasks: await this.taskRepo.count({ where: { hidden: true } }),
      offers: await this.offerRepo.count(),
      taskers: await this.profileRepo.count(),
      open_reports: await this.reportRepo.count({ where: { status: 'open' } }),
      closed_value: parseFloat(gmv?.total) || 0,
    };
  }

  async adminTasks(q?: string, status?: string, hidden?: string, pageStr?: string) {
    const page = Math.max(1, parseInt(pageStr || '1') || 1);
    const limit = 25;
    const qb = this.taskQuery();
    if (status) qb.andWhere('t.status = :status', { status });
    if (hidden === 'true') qb.andWhere('t.hidden = :h', { h: true });
    if (q?.trim()) qb.andWhere('LOWER(t.title) LIKE :q', { q: `%${q.trim().toLowerCase()}%` });
    qb.orderBy('t.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    return { items: rows.map(t => this.card(t)), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
  }

  async adminSetHidden(id: number, hidden: boolean) {
    await this.getTask(id);
    await this.taskRepo.update(id, { hidden });
    return { ok: true };
  }

  async adminCancel(id: number) {
    const task = await this.getTask(id);
    if (!['open', 'assigned'].includes(task.status)) throw new BadRequestException('Only open or assigned tasks can be cancelled');
    await this.cancelTask(task, 'KadeHub moderators cancelled this task.');
    await this.notifier.notify(task.poster_id, 'task_cancelled', `Task cancelled: ${task.title}`, 'KadeHub moderators cancelled this task. Contact support if you think this is a mistake.', task.id);
    return { ok: true };
  }

  async adminReports(status?: string) {
    const rows = await this.reportRepo.find({
      where: status ? { status } : {}, relations: ['reporter'], order: { created_at: 'DESC' }, take: 200,
    });
    const taskIds = rows.map(r => r.task_id).filter(Boolean);
    const userIds = rows.map(r => r.reported_user_id).filter(Boolean);
    const tasks = taskIds.length ? await this.taskRepo.find({ where: { id: In(taskIds) }, select: ['id', 'title', 'hidden', 'status'] }) : [];
    const users = userIds.length ? await this.userRepo.find({ where: { id: In(userIds) }, select: ['id', 'name', 'photo_url'] }) : [];
    const tMap = new Map(tasks.map(t => [t.id, t]));
    const uMap = new Map(users.map(u => [u.id, u]));
    return rows.map(r => ({
      id: r.id, reason: r.reason, details: r.details, status: r.status, created_at: r.created_at, resolved_at: r.resolved_at,
      reporter: publicUser(r.reporter),
      task: r.task_id && tMap.get(r.task_id) ? { id: r.task_id, title: tMap.get(r.task_id).title, hidden: tMap.get(r.task_id).hidden, status: tMap.get(r.task_id).status } : null,
      reported_user: r.reported_user_id ? publicUser(uMap.get(r.reported_user_id)) : null,
    }));
  }

  async adminResolveReport(id: number) {
    const res = await this.reportRepo.update(id, { status: 'resolved', resolved_at: new Date() });
    if (!res.affected) throw new NotFoundException('Report not found');
    return { ok: true };
  }

  adminCategories() {
    return this.categoryRepo.find({ order: { sort_order: 'ASC', name: 'ASC' } });
  }

  async adminSaveCategory(dto: { name: string; slug?: string; icon?: string; sort_order?: number; is_active?: boolean }, id?: number) {
    const slug = (dto.slug || dto.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const clash = await this.categoryRepo.findOne({ where: { slug } });
    if (clash && clash.id !== id) throw new BadRequestException('A category with this slug already exists');
    const cat = id ? await this.categoryRepo.findOne({ where: { id } }) : this.categoryRepo.create();
    if (!cat) throw new NotFoundException('Category not found');
    Object.assign(cat, {
      name: dto.name.trim(), slug,
      icon: dto.icon ?? cat.icon ?? 'CircleHelp',
      sort_order: dto.sort_order ?? cat.sort_order ?? 0,
      is_active: dto.is_active ?? cat.is_active ?? true,
    });
    return this.categoryRepo.save(cat);
  }

  async adminDeleteCategory(id: number) {
    const used = await this.taskRepo.count({ where: { category_id: id } });
    if (used) {
      // Keep history intact: deactivate instead of deleting a category tasks still point to
      await this.categoryRepo.update(id, { is_active: false });
      return { ok: true, deactivated: true };
    }
    await this.categoryRepo.delete(id);
    return { ok: true, deleted: true };
  }
}
