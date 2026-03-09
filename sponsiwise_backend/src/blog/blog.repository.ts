import { Injectable } from '@nestjs/common';
import type { BlogPost, BlogPostStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/providers/prisma.service';

// Full blog post with all relations
const BLOG_FULL_INCLUDE = {
  author: true,
  seo: true,
  categories: { include: { category: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.BlogPostInclude;

export type BlogPostFull = Prisma.BlogPostGetPayload<{
  include: typeof BLOG_FULL_INCLUDE;
}>;

@Injectable()
export class BlogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE ───────────────────────────────────────────────

  async create(
    data: Prisma.BlogPostCreateInput,
    seo?: { metaTitle?: string; metaDescription?: string; keywords?: string; canonicalUrl?: string },
    categoryIds?: string[],
    tagIds?: string[],
  ): Promise<BlogPostFull> {
    return this.prisma.blogPost.create({
      data: {
        ...data,
        ...(seo && {
          seo: {
            create: {
              metaTitle: seo.metaTitle,
              metaDescription: seo.metaDescription,
              keywords: seo.keywords,
              canonicalUrl: seo.canonicalUrl,
            },
          },
        }),
        ...(categoryIds && categoryIds.length > 0 && {
          categories: {
            create: categoryIds.map((id) => ({ categoryId: id })),
          },
        }),
        ...(tagIds && tagIds.length > 0 && {
          tags: {
            create: tagIds.map((id) => ({ tagId: id })),
          },
        }),
      },
      include: BLOG_FULL_INCLUDE,
    });
  }

  // ─── READ ─────────────────────────────────────────────────

  async findById(id: string): Promise<BlogPostFull | null> {
    return this.prisma.blogPost.findUnique({
      where: { id },
      include: BLOG_FULL_INCLUDE,
    });
  }

  async findBySlug(slug: string): Promise<BlogPostFull | null> {
    return this.prisma.blogPost.findUnique({
      where: { slug },
      include: BLOG_FULL_INCLUDE,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    status?: BlogPostStatus;
    categoryId?: string;
    tagId?: string;
    authorId?: string;
    search?: string;
    isFeatured?: boolean;
    isPinned?: boolean;
    isActive?: boolean;
  }): Promise<{ data: BlogPostFull[]; total: number }> {
    const where: Prisma.BlogPostWhereInput = {
      ...(params.status !== undefined && { status: params.status }),
      ...(params.authorId !== undefined && { authorId: params.authorId }),
      ...(params.isFeatured !== undefined && { isFeatured: params.isFeatured }),
      ...(params.isPinned !== undefined && { isPinned: params.isPinned }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.categoryId && {
        categories: { some: { categoryId: params.categoryId } },
      }),
      ...(params.tagId && {
        tags: { some: { tagId: params.tagId } },
      }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { excerpt: { contains: params.search, mode: 'insensitive' } },
          { content: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [
          { isPinned: 'desc' },
          { isFeatured: 'desc' },
          { sortOrder: 'asc' },
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        include: BLOG_FULL_INCLUDE,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { data, total };
  }

  // Public listing — only published + active
  async findPublished(params: {
    skip?: number;
    take?: number;
    categorySlug?: string;
    tagSlug?: string;
    search?: string;
  }): Promise<{ data: BlogPostFull[]; total: number }> {
    const where: Prisma.BlogPostWhereInput = {
      status: 'PUBLISHED',
      isActive: true,
      publishedAt: { lte: new Date() },
      ...(params.categorySlug && {
        categories: { some: { category: { slug: params.categorySlug } } },
      }),
      ...(params.tagSlug && {
        tags: { some: { tag: { slug: params.tagSlug } } },
      }),
      ...(params.search && {
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { excerpt: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [
          { isPinned: 'desc' },
          { isFeatured: 'desc' },
          { sortOrder: 'asc' },
          { publishedAt: 'desc' },
        ],
        include: BLOG_FULL_INCLUDE,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { data, total };
  }

  // ─── UPDATE ───────────────────────────────────────────────

  async updateById(
    id: string,
    data: Prisma.BlogPostUpdateInput,
    seo?: { metaTitle?: string; metaDescription?: string; keywords?: string; canonicalUrl?: string },
    categoryIds?: string[],
    tagIds?: string[],
  ): Promise<BlogPostFull> {
    // Use transaction for atomic update of relations
    return this.prisma.$transaction(async (tx) => {
      // Update categories if provided
      if (categoryIds !== undefined) {
        await tx.blogPostCategory.deleteMany({ where: { blogId: id } });
        if (categoryIds.length > 0) {
          await tx.blogPostCategory.createMany({
            data: categoryIds.map((categoryId) => ({ blogId: id, categoryId })),
          });
        }
      }

      // Update tags if provided
      if (tagIds !== undefined) {
        await tx.blogPostTag.deleteMany({ where: { blogId: id } });
        if (tagIds.length > 0) {
          await tx.blogPostTag.createMany({
            data: tagIds.map((tagId) => ({ blogId: id, tagId })),
          });
        }
      }

      // Update SEO if provided
      if (seo) {
        await tx.blogSEO.upsert({
          where: { blogId: id },
          create: { blogId: id, ...seo },
          update: seo,
        });
      }

      // Update the post itself
      return tx.blogPost.update({
        where: { id },
        data,
        include: BLOG_FULL_INCLUDE,
      });
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.blogPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async batchUpdateSortOrder(items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.blogPost.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.blogPost.delete({ where: { id } });
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    });
    return !!post;
  }

  // ─── RELATED POSTS ───────────────────────────────────────

  async findScheduledDue(): Promise<BlogPostFull[]> {
    return this.prisma.blogPost.findMany({
      where: {
        status: 'SCHEDULED',
        isActive: true,
        scheduledAt: { lte: new Date() },
      },
      include: BLOG_FULL_INCLUDE,
    });
  }

  async findRelated(postId: string, limit = 3): Promise<BlogPostFull[]> {
    // Get post categories & tags
    const post = await this.prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        categories: { select: { categoryId: true } },
        tags: { select: { tagId: true } },
      },
    });

    if (!post) return [];

    const categoryIds = post.categories.map((c) => c.categoryId);
    const tagIds = post.tags.map((t) => t.tagId);

    return this.prisma.blogPost.findMany({
      where: {
        id: { not: postId },
        status: 'PUBLISHED',
        isActive: true,
        publishedAt: { lte: new Date() },
        OR: [
          ...(categoryIds.length > 0
            ? [{ categories: { some: { categoryId: { in: categoryIds } } } }]
            : []),
          ...(tagIds.length > 0
            ? [{ tags: { some: { tagId: { in: tagIds } } } }]
            : []),
        ],
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: BLOG_FULL_INCLUDE,
    });
  }
}
