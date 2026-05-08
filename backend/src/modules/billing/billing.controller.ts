import {
  Controller, Get, Post, Patch, Body, UseGuards,
  UsePipes, ValidationPipe, UseInterceptors, UploadedFile, Req, Param, HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BillingService } from './billing.service';
import { UpdateCompanyDto, CreateSubscriptionDto, InitiateOnepayDto } from './billing.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const logoStorage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => cb(null, `logo-${Date.now()}${extname(file.originalname)}`),
});

@Controller('billing')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class BillingController {
  constructor(private billingService: BillingService) {}

  // Public — no auth needed to view packages
  @Get('packages')
  getPackages(@Req() req: any) {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.ip;
    return this.billingService.getPackagesWithCurrency(ip);
  }

  // Protected routes below
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return this.billingService.getProfile(user.tenant_id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateCompanyDto) {
    return this.billingService.updateProfile(user.tenant_id, dto);
  }

  @Post('profile/logo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo', {
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // CWE-400: cap at 2MB to prevent DoS
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp|svg\+xml)$/)) return cb(new Error('Images only'), false);
      cb(null, true);
    },
  }))
  async uploadLogo(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    return this.billingService.uploadLogo(user.tenant_id, url);
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  getSubscriptions(@CurrentUser() user: any) {
    return this.billingService.getActiveSubscriptions(user.tenant_id);
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(@CurrentUser() user: any, @Body() dto: CreateSubscriptionDto) {
    return this.billingService.subscribe(user.tenant_id, dto);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  getTransactions(@CurrentUser() user: any) {
    return this.billingService.getTransactions(user.tenant_id);
  }

  // ── OnePay endpoints ──

  /** Step 1: Create OnePay transaction, get redirect URL */
  @Post('onepay/initiate')
  @UseGuards(JwtAuthGuard)
  initiateOnepay(@CurrentUser() user: any, @Body() dto: InitiateOnepayDto) {
    return this.billingService.initiateOnepay(user.tenant_id, dto);
  }

  /** Step 2: Verify payment after user returns from OnePay */
  @Get('onepay/verify/:ref')
  @UseGuards(JwtAuthGuard)
  verifyOnepay(@CurrentUser() user: any, @Param('ref') ref: string) {
    return this.billingService.verifyOnepayReturn(ref, user.tenant_id);
  }

  /** Webhook: OnePay calls this when payment status changes (no auth) */
  @Post('onepay/webhook')
  @HttpCode(200)
  onepayWebhook(@Body() body: any) {
    return this.billingService.handleOnepayWebhook(body);
  }
}
