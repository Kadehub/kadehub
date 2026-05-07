import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(s => s.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some(pattern => {
        if (pattern === '*') return true;
        if (pattern.startsWith('*.')) return origin.endsWith(pattern.slice(1));
        return origin === pattern;
      });
      if (allowed) callback(null, true);
      else callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`KadeHub API running on port ${port}`);
}
bootstrap();
