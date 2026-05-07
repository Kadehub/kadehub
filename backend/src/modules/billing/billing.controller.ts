import {
  Controller, Get, Post, Patch, Body, UseGuards,
  UsePipes, ValidationPipe, UseInterceptors, UploadedFile, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BillingService } from './billing.service';
import { UpdateCompanyDto, CreateSubscriptionDto } from './billing.dto';
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
  getPackages() {
    return this.billingService.getPackages();
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
}
