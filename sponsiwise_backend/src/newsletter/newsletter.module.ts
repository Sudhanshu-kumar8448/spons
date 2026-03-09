import { Module } from '@nestjs/common';
import { NewsletterController, PublicNewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { NewsletterRepository } from './newsletter.repository';
import { PrismaService } from '../common/providers/prisma.service';

@Module({
  controllers: [NewsletterController, PublicNewsletterController],
  providers: [NewsletterService, NewsletterRepository, PrismaService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
