import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import { isUserDisabled } from '../disabled-users';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException();
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new UnauthorizedException('JWT_SECRET not configured');
      request.user = jwt.verify(token, secret);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (isUserDisabled(request.user?.sub)) throw new UnauthorizedException('This account has been disabled. Contact support.');
    return true;
  }
}
