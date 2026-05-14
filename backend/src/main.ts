import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { ensurePublicBucket } from './common/cloudinary';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(s => s.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some(pattern => {
        if (pattern.startsWith('*.')) {
          const base = pattern.slice(2);
          return origin === `https://${base}` || origin.endsWith(`.${base}`);
        }
        return origin === pattern;
      });
      if (allowed) callback(null, true);
      else callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  await ensurePublicBucket();
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`KadeHub API running on port ${port}`);
}
bootstrap();
