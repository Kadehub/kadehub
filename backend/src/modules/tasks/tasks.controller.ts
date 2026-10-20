import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards, UsePipes, ValidationPipe,
  ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as jwt from 'jsonwebtoken';
import { TasksService, Viewer } from './tasks.service';
import { TasksNotifierService } from './tasks-notifier.service';
import {
  CreateTaskDto, UpdateTaskDto, QuestionDto, OfferDto, MessageDto, ReviewDto, ProfileDto, ReportDto, ListTasksQuery,
  SL_DISTRICTS,
} from './tasks.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { uploadToCloudinary } from '../../common/cloudinary';

/** Public routes show more to signed-in users (their own offer amounts, etc.) without requiring a login. */
function optionalViewer(req: any): Viewer | null {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET) as any;
  } catch {
    return null;
  }
}

const imageUpload = FileInterceptor('image', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|webp|gif)$/)) return cb(new BadRequestException('Only image files are allowed'), false);
    cb(null, true);
  },
});

@Controller('tasks')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TasksController {
  constructor(private svc: TasksService, private notifier: TasksNotifierService) {}

  // ── public ──
  @Get('categories') categories() {
    return this.svc.categories();
  }

  @Get('districts') districts() {
    return SL_DISTRICTS;
  }

  @Get('users/:id') profile(@Param('id', ParseIntPipe) id: number) {
    return this.svc.publicProfile(id);
  }

  // ── signed-in "me" routes ──
  @Get('me/posted') @UseGuards(JwtAuthGuard)
  myPosted(@CurrentUser() u: Viewer) { return this.svc.myPosted(u); }

  @Get('me/offers') @UseGuards(JwtAuthGuard)
  myOffers(@CurrentUser() u: Viewer) { return this.svc.myOffers(u); }

  @Get('me/threads') @UseGuards(JwtAuthGuard)
  threads(@CurrentUser() u: Viewer) { return this.svc.threads(u); }

  @Get('me/profile') @UseGuards(JwtAuthGuard)
  myProfile(@CurrentUser() u: Viewer) { return this.svc.myProfile(u); }

  @Put('me/profile') @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() u: Viewer, @Body() dto: ProfileDto) { return this.svc.updateProfile(u, dto); }

  @Get('me/notifications') @UseGuards(JwtAuthGuard)
  notifications(@CurrentUser() u: Viewer, @Query('page') page?: string) {
    return this.notifier.list(u.sub, Math.max(1, parseInt(page || '1') || 1));
  }

  @Get('me/notifications/unread-count') @UseGuards(JwtAuthGuard)
  unread(@CurrentUser() u: Viewer) { return this.notifier.unreadCount(u.sub); }

  @Post('me/notifications/read-all') @UseGuards(JwtAuthGuard)
  readAll(@CurrentUser() u: Viewer) { return this.notifier.markRead(u.sub); }

  @Post('me/notifications/:id/read') @UseGuards(JwtAuthGuard)
  readOne(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number) { return this.notifier.markRead(u.sub, id); }

  @Post('reports') @UseGuards(JwtAuthGuard)
  report(@CurrentUser() u: Viewer, @Body() dto: ReportDto) { return this.svc.report(u, dto); }

  // ── offers ──
  @Post('offers/:offerId/withdraw') @UseGuards(JwtAuthGuard)
  withdraw(@CurrentUser() u: Viewer, @Param('offerId', ParseIntPipe) offerId: number) { return this.svc.withdrawOffer(u, offerId); }

  @Post('offers/:offerId/accept') @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() u: Viewer, @Param('offerId', ParseIntPipe) offerId: number) { return this.svc.acceptOffer(u, offerId); }

  // ── tasks ──
  @Get() list(@Query() query: ListTasksQuery) {
    return this.svc.list(query);
  }

  @Post() @UseGuards(JwtAuthGuard)
  create(@CurrentUser() u: Viewer, @Body() dto: CreateTaskDto) { return this.svc.create(u, dto); }

  @Get(':id') detail(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.svc.detail(id, optionalViewer(req));
  }

  @Patch(':id') @UseGuards(JwtAuthGuard)
  update(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaskDto) {
    return this.svc.update(u, id, dto);
  }

  @Post(':id/attachments') @UseGuards(JwtAuthGuard) @UseInterceptors(imageUpload)
  async addAttachment(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Attach an image');
    await this.svc.assertCanAttach(u, id);
    const url = await uploadToCloudinary(file.buffer, 'kadehub/tasks', file.originalname);
    return this.svc.addAttachment(u, id, url);
  }

  @Delete(':id/attachments/:attachmentId') @UseGuards(JwtAuthGuard)
  removeAttachment(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number, @Param('attachmentId', ParseIntPipe) aid: number) {
    return this.svc.removeAttachment(u, id, aid);
  }

  @Post(':id/cancel') @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number) { return this.svc.cancel(u, id); }

  @Post(':id/questions') @UseGuards(JwtAuthGuard)
  ask(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number, @Body() dto: QuestionDto) { return this.svc.ask(u, id, dto); }

  @Post(':id/offers') @UseGuards(JwtAuthGuard)
  offer(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number, @Body() dto: OfferDto) { return this.svc.makeOffer(u, id, dto); }

  @Post(':id/complete') @UseGuards(JwtAuthGuard)
  complete(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number) { return this.svc.markComplete(u, id); }

  @Post(':id/confirm') @UseGuards(JwtAuthGuard)
  confirm(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number) { return this.svc.confirm(u, id); }

  @Post(':id/reviews') @UseGuards(JwtAuthGuard)
  review(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewDto) { return this.svc.review(u, id, dto); }

  @Get(':id/messages') @UseGuards(JwtAuthGuard)
  messages(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number) { return this.svc.messages(u, id); }

  @Post(':id/messages') @UseGuards(JwtAuthGuard)
  send(@CurrentUser() u: Viewer, @Param('id', ParseIntPipe) id: number, @Body() dto: MessageDto) { return this.svc.sendMessage(u, id, dto); }
}
