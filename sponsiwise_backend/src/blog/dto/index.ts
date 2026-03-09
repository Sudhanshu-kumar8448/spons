import {
  IsOptional, IsString, IsInt, Min, Max, IsEnum, IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BlogPostStatus } from '@prisma/client';

// ─── Query DTOs ─────────────────────────────────────────────────────

export class ListBlogsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;

  @IsOptional() @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @IsOptional() @IsUUID()
  categoryId?: string;

  @IsOptional() @IsUUID()
  tagId?: string;

  @IsOptional() @IsUUID()
  authorId?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPinned?: boolean;
}

export class PublicBlogsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;

  @IsOptional() @IsString()
  category?: string; // slug

  @IsOptional() @IsString()
  tag?: string; // slug

  @IsOptional() @IsString()
  search?: string;
}

// ─── Create / Update DTOs ───────────────────────────────────────────

export class CreateBlogDto {
  @IsString()
  title!: string;

  @IsOptional() @IsString()
  slug?: string; // auto-generated if omitted

  @IsOptional() @IsString()
  excerpt?: string;

  @IsString()
  content!: string; // TipTap JSON string

  @IsOptional() @IsString()
  featuredImage?: string;

  @IsUUID()
  authorId!: string;

  @IsOptional() @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @IsOptional() @IsString()
  scheduledAt?: string; // ISO date

  @IsOptional() @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional() @Type(() => Number) @IsInt()
  sortOrder?: number;

  // SEO
  @IsOptional() @IsString()
  metaTitle?: string;

  @IsOptional() @IsString()
  metaDescription?: string;

  @IsOptional() @IsString()
  keywords?: string;

  @IsOptional() @IsString()
  canonicalUrl?: string;

  // Relations
  @IsOptional() @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional() @IsUUID('4', { each: true })
  tagIds?: string[];
}

export class UpdateBlogDto {
  @IsOptional() @IsString()
  title?: string;

  @IsOptional() @IsString()
  slug?: string;

  @IsOptional() @IsString()
  excerpt?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString()
  featuredImage?: string;

  @IsOptional() @IsUUID()
  authorId?: string;

  @IsOptional() @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @IsOptional() @IsString()
  scheduledAt?: string;

  @IsOptional() @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional() @Type(() => Number) @IsInt()
  sortOrder?: number;

  // SEO
  @IsOptional() @IsString()
  metaTitle?: string;

  @IsOptional() @IsString()
  metaDescription?: string;

  @IsOptional() @IsString()
  keywords?: string;

  @IsOptional() @IsString()
  canonicalUrl?: string;

  // Relations
  @IsOptional() @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional() @IsUUID('4', { each: true })
  tagIds?: string[];
}

// ─── Category / Tag / Author DTOs ───────────────────────────────────

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString()
  slug?: string;

  @IsOptional() @IsString()
  description?: string;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  slug?: string;

  @IsOptional() @IsString()
  description?: string;
}

export class CreateTagDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString()
  slug?: string;
}

export class UpdateTagDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  slug?: string;
}

export class CreateAuthorDto {
  @IsString()
  name!: string;

  @IsOptional() @IsString()
  bio?: string;

  @IsOptional() @IsString()
  avatar?: string;
}

export class UpdateAuthorDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  bio?: string;

  @IsOptional() @IsString()
  avatar?: string;
}
