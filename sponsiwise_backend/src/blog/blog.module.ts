import { Module } from '@nestjs/common';
import { BlogController, PublicBlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogRepository } from './blog.repository';
import { BlogMetaRepository } from './blog-meta.repository';
import { PrismaService } from '../common/providers';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [BlogController, PublicBlogController],
  providers: [BlogService, BlogRepository, BlogMetaRepository, PrismaService],
  exports: [BlogService],
})
export class BlogModule {}
