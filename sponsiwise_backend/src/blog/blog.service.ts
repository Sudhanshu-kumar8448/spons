import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BlogRepository, BlogPostFull } from './blog.repository';
import { BlogMetaRepository } from './blog-meta.repository';
import { AuditLogService } from '../audit-logs/audit-log.service';
import {
  CreateBlogDto, UpdateBlogDto, ListBlogsQueryDto, PublicBlogsQueryDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateTagDto, UpdateTagDto,
  CreateAuthorDto, UpdateAuthorDto,
} from './dto';

// ─── Helpers ───────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

function estimateReadingTime(content: string): number {
  // Strip HTML/JSON and count words
  const text = content.replace(/<[^>]*>|[{}[\]"]/g, ' ');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private readonly blogRepo: BlogRepository,
    private readonly metaRepo: BlogMetaRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ════════════════════════════════════════════════════════════
  // BLOG POSTS
  // ════════════════════════════════════════════════════════════

  async create(dto: CreateBlogDto, userId: string): Promise<BlogPostFull> {
    let slug = dto.slug ? slugify(dto.slug) : slugify(dto.title);

    // Ensure unique slug
    let counter = 0;
    let candidateSlug = slug;
    while (await this.blogRepo.slugExists(candidateSlug)) {
      counter++;
      candidateSlug = `${slug}-${counter}`;
    }
    slug = candidateSlug;

    const readingTime = estimateReadingTime(dto.content);

    const post = await this.blogRepo.create(
      {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        featuredImage: dto.featuredImage,
        author: { connect: { id: dto.authorId } },
        status: dto.status ?? 'DRAFT',
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        isFeatured: dto.isFeatured ?? false,
        isPinned: dto.isPinned ?? false,
        sortOrder: dto.sortOrder ?? 0,
        readingTime,
      },
      // SEO
      (dto.metaTitle || dto.metaDescription || dto.keywords || dto.canonicalUrl)
        ? {
          metaTitle: dto.metaTitle,
          metaDescription: dto.metaDescription,
          keywords: dto.keywords,
          canonicalUrl: dto.canonicalUrl,
        }
        : undefined,
      dto.categoryIds,
      dto.tagIds,
    );

    await this.auditLogService.log({
      action: 'blog_post.created',
      actorId: userId,
      actorRole: 'MANAGER',
      entityType: 'BlogPost',
      entityId: post.id,
      metadata: { title: post.title, slug: post.slug, status: post.status },
    });

    this.logger.log(`Blog post created: ${post.title} [${post.id}]`);
    return post;
  }

  async update(id: string, dto: UpdateBlogDto, userId: string): Promise<BlogPostFull> {
    const existing = await this.blogRepo.findById(id);
    if (!existing) throw new NotFoundException('Blog post not found');

    // Handle slug change
    let slug = dto.slug !== undefined ? slugify(dto.slug) : undefined;
    if (slug && slug !== existing.slug) {
      let counter = 0;
      let candidateSlug = slug;
      while (await this.blogRepo.slugExists(candidateSlug, id)) {
        counter++;
        candidateSlug = `${slug}-${counter}`;
      }
      slug = candidateSlug;
    }

    const readingTime = dto.content ? estimateReadingTime(dto.content) : undefined;

    const updateData: any = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(slug !== undefined && { slug }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.featuredImage !== undefined && { featuredImage: dto.featuredImage }),
      ...(dto.authorId !== undefined && { author: { connect: { id: dto.authorId } } }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.isFeatured !== undefined && { isFeatured: dto.isFeatured }),
      ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(readingTime !== undefined && { readingTime }),
      ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
    };

    // If publishing, set publishedAt
    if (dto.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    const seo = (dto.metaTitle !== undefined || dto.metaDescription !== undefined || dto.keywords !== undefined || dto.canonicalUrl !== undefined)
      ? {
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        keywords: dto.keywords,
        canonicalUrl: dto.canonicalUrl,
      }
      : undefined;

    const post = await this.blogRepo.updateById(id, updateData, seo, dto.categoryIds, dto.tagIds);

    await this.auditLogService.log({
      action: 'blog_post.updated',
      actorId: userId,
      actorRole: 'MANAGER',
      entityType: 'BlogPost',
      entityId: post.id,
      metadata: { title: post.title, slug: post.slug, status: post.status },
    });

    return post;
  }

  async findById(id: string): Promise<BlogPostFull> {
    const post = await this.blogRepo.findById(id);
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async findBySlug(slug: string): Promise<BlogPostFull> {
    const post = await this.blogRepo.findBySlug(slug);
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async findAll(query: ListBlogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const result = await this.blogRepo.findAll({
      skip,
      take: limit,
      status: query.status,
      categoryId: query.categoryId,
      tagId: query.tagId,
      authorId: query.authorId,
      search: query.search,
      isFeatured: query.isFeatured,
      isPinned: query.isPinned,
    });

    return { ...result, page, limit };
  }

  async findPublished(query: PublicBlogsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const result = await this.blogRepo.findPublished({
      skip,
      take: limit,
      categorySlug: query.category,
      tagSlug: query.tag,
      search: query.search,
    });

    return { ...result, page, limit };
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.blogRepo.findById(id);
    if (!existing) throw new NotFoundException('Blog post not found');

    await this.blogRepo.deleteById(id);

    await this.auditLogService.log({
      action: 'blog_post.deleted',
      actorId: userId,
      actorRole: 'MANAGER',
      entityType: 'BlogPost',
      entityId: id,
      metadata: { title: existing.title },
    });
  }

  // ─── Status controls ─────────────────────────────────────

  async publish(id: string, userId: string): Promise<BlogPostFull> {
    return this.update(id, { status: 'PUBLISHED' }, userId);
  }

  async unpublish(id: string, userId: string): Promise<BlogPostFull> {
    return this.update(id, { status: 'DRAFT' }, userId);
  }

  async feature(id: string, featured: boolean, userId: string): Promise<BlogPostFull> {
    return this.update(id, { isFeatured: featured }, userId);
  }

  async pin(id: string, pinned: boolean, userId: string): Promise<BlogPostFull> {
    return this.update(id, { isPinned: pinned }, userId);
  }

  async reorder(items: Array<{ id: string; sortOrder: number }>): Promise<{ success: true }> {
    await this.blogRepo.batchUpdateSortOrder(items);
    this.logger.log(`Reordered ${items.length} blog posts`);
    return { success: true };
  }

  // ─── Public helpers ──────────────────────────────────────

  async incrementViewCount(slug: string): Promise<void> {
    const post = await this.blogRepo.findBySlug(slug);
    if (post) await this.blogRepo.incrementViewCount(post.id);
  }

  async findRelated(postId: string, limit = 3): Promise<BlogPostFull[]> {
    return this.blogRepo.findRelated(postId, limit);
  }

  // ════════════════════════════════════════════════════════════
  // CATEGORIES
  // ════════════════════════════════════════════════════════════

  async createCategory(dto: CreateCategoryDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    return this.metaRepo.createCategory({ name: dto.name, slug, description: dto.description });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const slug = dto.slug ? slugify(dto.slug) : dto.name ? slugify(dto.name) : undefined;
    return this.metaRepo.updateCategory(id, { name: dto.name, slug, description: dto.description });
  }

  async deleteCategory(id: string) {
    return this.metaRepo.deleteCategory(id);
  }

  async findAllCategories() {
    return this.metaRepo.findAllCategories();
  }

  // ════════════════════════════════════════════════════════════
  // TAGS
  // ════════════════════════════════════════════════════════════

  async createTag(dto: CreateTagDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    return this.metaRepo.createTag({ name: dto.name, slug });
  }

  async updateTag(id: string, dto: UpdateTagDto) {
    const slug = dto.slug ? slugify(dto.slug) : dto.name ? slugify(dto.name) : undefined;
    return this.metaRepo.updateTag(id, { name: dto.name, slug });
  }

  async deleteTag(id: string) {
    return this.metaRepo.deleteTag(id);
  }

  async findAllTags() {
    return this.metaRepo.findAllTags();
  }

  // ════════════════════════════════════════════════════════════
  // AUTHORS
  // ════════════════════════════════════════════════════════════

  async createAuthor(dto: CreateAuthorDto) {
    return this.metaRepo.createAuthor({ name: dto.name, bio: dto.bio, avatar: dto.avatar });
  }

  async updateAuthor(id: string, dto: UpdateAuthorDto) {
    return this.metaRepo.updateAuthor(id, dto);
  }

  async deleteAuthor(id: string) {
    return this.metaRepo.deleteAuthor(id);
  }

  async findAllAuthors() {
    return this.metaRepo.findAllAuthors();
  }

  // ════════════════════════════════════════════════════════════
  // SCHEDULED POST PUBLISHING (runs every minute)
  // ════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledPosts(): Promise<void> {
    const scheduled = await this.blogRepo.findScheduledDue();
    for (const post of scheduled) {
      try {
        await this.blogRepo.updateById(post.id, {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        });
        this.logger.log(`Auto-published scheduled post: ${post.title} [${post.id}]`);
      } catch (err) {
        this.logger.error(`Failed to auto-publish post ${post.id}: ${err}`);
      }
    }
  }
}
