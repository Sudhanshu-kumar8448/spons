import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaService } from '../common/providers/prisma.service';

/**
 * PublicModule — provides unauthenticated, read-only endpoints
 * for the public-facing pages (landing, explore events, company profile).
 *
 * PrismaService is injected directly because CacheModule is @Global.
 */
@Module({
  controllers: [PublicController],
  providers: [PublicService, PrismaService],
})
export class PublicModule {}
