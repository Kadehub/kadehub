import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiLog } from '../../database/entities/api-log.entity';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ApiLoggerMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(ApiLog) private logRepo: Repository<ApiLog>,
    private jwtService: JwtService,
  ) {}

  use(req: any, res: any, next: () => void) {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      let tenant_id: number | null = null;
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          const payload: any = this.jwtService.decode(token);
          tenant_id = payload?.tenant_id ?? null;
        }
      } catch {}
      const path: string = req.path || '';
      if (path.startsWith('/api/super-admin') || path.startsWith('/uploads')) return;
      this.logRepo.save(
        this.logRepo.create({ tenant_id, method: req.method, path, status_code: res.statusCode, response_ms: ms }),
      ).catch((err) => console.error('[ApiLogger] Failed to save log:', err?.message));
    });
    next();
  }
}
