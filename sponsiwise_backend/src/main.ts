import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './common/config';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app');
  const logger = new Logger('Bootstrap');

  // Security Headers
  app.use(helmet());

  // Parse cookies so @Req().cookies works
  app.use(cookieParser());

  // CSRF Protection: Verify Origin matches allowed domain for mutating requests
  app.use((req: any, res: any, next: any) => {
    const method = req.method;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const origin = req.headers['origin'];
      const allowedOrigin = appConfig?.corsOrigin;

      // Only enforce if allowedOrigin is configured (Production)
      if (allowedOrigin && origin && origin !== allowedOrigin) {
        return res.status(403).json({
          statusCode: 403,
          message: 'Cross-Site Request Forgery (CSRF) protection: Origin mismatch'
        });
      }
    }
    next();
  });

  // Enable CORS with strict origin
  app.enableCors({
    origin: appConfig?.corsOrigin, // Strict: undefined if not set, no hardcoded fallback
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error for unknown properties
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Global Exception Filter
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const port = process.env.PORT ?? 3000;

  // Enable graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`Application running on port ${port}`);
}
bootstrap();

