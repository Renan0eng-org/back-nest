// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { MenuPermissionGuard } from './auth/menu-permission.guard';

// Carrega variáveis de ambiente do arquivo .env (se existir)
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  // Suporta uma ou várias origens separadas por vírgula na variável CORS
  const corsEnv = process.env.CORS;
  const defaultOrigin = 'https://prefeitura.renannardi.com';

  const allowedOrigins = corsEnv
    ? corsEnv.split(',').map((s) => s.trim()).filter(Boolean)
    : [defaultOrigin];

  console.log('CORS allowed origins:', allowedOrigins);

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // requests sem origin (ex.: ferramentas de teste ou same-origin) são permitidos
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error('Blocked by CORS'));
    },
    credentials: true,
  });

  app.use(cookieParser());

  // Register menu permission guard globally so routes annotated with @Menu(...) are enforced.
  // The guard will skip routes marked with @Public()
  const menuGuard = app.get(MenuPermissionGuard);
  app.useGlobalGuards(menuGuard);

  await app.listen(process.env.PORT || 4000);
}
bootstrap();