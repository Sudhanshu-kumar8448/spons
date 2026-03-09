import { Injectable } from '@nestjs/common';
import type { BlogCategory, BlogTag, BlogAuthor, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

@Injectable()
export class BlogMetaRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CATEGORIES ───────────────────────────────────────────

  async createCategory(data: { name: string; slug: string; description?: string }): Promise<BlogCategory> {
    return this.prisma.blogCategory.create({ data });
  }

  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string }): Promise<BlogCategory> {
    return this.prisma.blogCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.prisma.blogCategory.delete({ where: { id } });
  }

  async findAllCategories(): Promise<BlogCategory[]> {
    return this.prisma.blogCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findCategoryBySlug(slug: string): Promise<BlogCategory | null> {
    return this.prisma.blogCategory.findUnique({ where: { slug } });
  }

  // ─── TAGS ─────────────────────────────────────────────────

  async createTag(data: { name: string; slug: string }): Promise<BlogTag> {
    return this.prisma.blogTag.create({ data });
  }

  async updateTag(id: string, data: { name?: string; slug?: string }): Promise<BlogTag> {
    return this.prisma.blogTag.update({ where: { id }, data });
  }

  async deleteTag(id: string): Promise<void> {
    await this.prisma.blogTag.delete({ where: { id } });
  }

  async findAllTags(): Promise<BlogTag[]> {
    return this.prisma.blogTag.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findTagBySlug(slug: string): Promise<BlogTag | null> {
    return this.prisma.blogTag.findUnique({ where: { slug } });
  }

  // ─── AUTHORS ──────────────────────────────────────────────

  async createAuthor(data: { name: string; bio?: string; avatar?: string }): Promise<BlogAuthor> {
    return this.prisma.blogAuthor.create({ data });
  }

  async updateAuthor(id: string, data: { name?: string; bio?: string; avatar?: string }): Promise<BlogAuthor> {
    return this.prisma.blogAuthor.update({ where: { id }, data });
  }

  async deleteAuthor(id: string): Promise<void> {
    await this.prisma.blogAuthor.delete({ where: { id } });
  }

  async findAllAuthors(): Promise<BlogAuthor[]> {
    return this.prisma.blogAuthor.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAuthorById(id: string): Promise<BlogAuthor | null> {
    return this.prisma.blogAuthor.findUnique({ where: { id } });
  }
}
