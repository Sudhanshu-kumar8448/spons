import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard, RoleGuard } from '../common/guards';
import { Roles, CurrentUser } from '../common/decorators';
import type { JwtPayloadWithClaims } from '../auth/interfaces';
import { BlogService } from './blog.service';
import {
  CreateBlogDto, UpdateBlogDto, ListBlogsQueryDto, PublicBlogsQueryDto,
  CreateCategoryDto, UpdateCategoryDto,
  CreateTagDto, UpdateTagDto,
  CreateAuthorDto, UpdateAuthorDto,
} from './dto';

// ════════════════════════════════════════════════════════════════════
// MANAGER BLOG CONTROLLER (authenticated)
// ════════════════════════════════════════════════════════════════════

@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // ─── POSTS ────────────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async create(
    @Body() dto: CreateBlogDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.blogService.create(dto, user.sub);
  }

  @Get()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAll(@Query() query: ListBlogsQueryDto) {
    return this.blogService.findAll(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogService.findById(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogDto,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.blogService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    await this.blogService.delete(id, user.sub);
    return { success: true };
  }

  // ─── STATUS CONTROLS ─────────────────────────────────────

  @Post(':id/publish')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.blogService.publish(id, user.sub);
  }

  @Post(':id/unpublish')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.blogService.unpublish(id, user.sub);
  }

  @Post(':id/feature')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async feature(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { featured: boolean },
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.blogService.feature(id, body.featured ?? true, user.sub);
  }

  @Post(':id/pin')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async pin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { pinned: boolean },
    @CurrentUser() user: JwtPayloadWithClaims,
  ) {
    return this.blogService.pin(id, body.pinned ?? true, user.sub);
  }

  @Post('reorder')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async reorder(
    @Body() body: { items: Array<{ id: string; sortOrder: number }> },
  ) {
    return this.blogService.reorder(body.items);
  }

  // ─── CATEGORIES ───────────────────────────────────────────

  @Post('categories')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.blogService.createCategory(dto);
  }

  @Get('meta/categories')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAllCategories() {
    return this.blogService.findAllCategories();
  }

  @Patch('categories/:id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.blogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    await this.blogService.deleteCategory(id);
    return { success: true };
  }

  // ─── TAGS ─────────────────────────────────────────────────

  @Post('tags')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async createTag(@Body() dto: CreateTagDto) {
    return this.blogService.createTag(dto);
  }

  @Get('meta/tags')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAllTags() {
    return this.blogService.findAllTags();
  }

  @Patch('tags/:id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async updateTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.blogService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async deleteTag(@Param('id', ParseUUIDPipe) id: string) {
    await this.blogService.deleteTag(id);
    return { success: true };
  }

  // ─── AUTHORS ──────────────────────────────────────────────

  @Post('authors')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async createAuthor(@Body() dto: CreateAuthorDto) {
    return this.blogService.createAuthor(dto);
  }

  @Get('meta/authors')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async findAllAuthors() {
    return this.blogService.findAllAuthors();
  }

  @Patch('authors/:id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async updateAuthor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAuthorDto,
  ) {
    return this.blogService.updateAuthor(id, dto);
  }

  @Delete('authors/:id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.MANAGER, Role.ADMIN, Role.SUPER_ADMIN)
  async deleteAuthor(@Param('id', ParseUUIDPipe) id: string) {
    await this.blogService.deleteAuthor(id);
    return { success: true };
  }
}

// ════════════════════════════════════════════════════════════════════
// PUBLIC BLOG CONTROLLER (no auth required)
// ════════════════════════════════════════════════════════════════════

@Controller('public/blogs')
export class PublicBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  async findPublished(@Query() query: PublicBlogsQueryDto) {
    return this.blogService.findPublished(query);
  }

  @Get('categories')
  async findAllCategories() {
    return this.blogService.findAllCategories();
  }

  @Get('tags')
  async findAllTags() {
    return this.blogService.findAllTags();
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const post = await this.blogService.findBySlug(slug);
    // Increment view count asynchronously
    this.blogService.incrementViewCount(slug).catch(() => {});
    return post;
  }

  @Get(':slug/related')
  async findRelated(@Param('slug') slug: string) {
    const post = await this.blogService.findBySlug(slug);
    return this.blogService.findRelated(post.id);
  }
}
