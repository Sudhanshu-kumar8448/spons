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

// Parse allowed origins from env (comma-separated)
const allowedOrigins =
  appConfig?.corsOrigin?.split(',').map(o => o.trim()) ?? [];

// CSRF Protection: Verify Origin matches allowed domain for mutating requests
app.use((req: any, res: any, next: any) => {
  const method = req.method;

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const origin = req.headers['origin'];

    if (
      allowedOrigins.length > 0 &&
      origin &&
      !allowedOrigins.includes(origin)
    ) {
      return res.status(403).json({
        statusCode: 403,
        message:
          'Cross-Site Request Forgery (CSRF) protection: Origin mismatch',
      });
    }
  }

  next();
});

// Enable dynamic CORS
app.enableCors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true); // allow Postman/server-to-server

    if (allowedOrigins.length === 0) {
      return callback(null, true); // no restriction if not configured
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
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
