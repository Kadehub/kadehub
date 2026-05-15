import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CloudflareService } from '../../common/cloudflare.service';
import { User } from '../../database/entities/user.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { Subscription } from '../../database/entities/subscription.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, Subscription]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, CloudflareService],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
