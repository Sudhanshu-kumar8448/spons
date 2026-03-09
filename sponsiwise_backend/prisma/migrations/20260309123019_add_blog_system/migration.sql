-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "blog_authors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "bio" TEXT,
    "avatar" VARCHAR(512),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_tags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "slug" VARCHAR(500) NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "featured_image" VARCHAR(512),
    "author_id" UUID NOT NULL,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "reading_time" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_seo" (
    "id" UUID NOT NULL,
    "blog_id" UUID NOT NULL,
    "meta_title" VARCHAR(255),
    "meta_description" VARCHAR(500),
    "keywords" TEXT,
    "canonical_url" VARCHAR(512),

    CONSTRAINT "blog_seo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_categories" (
    "blog_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "blog_post_categories_pkey" PRIMARY KEY ("blog_id","category_id")
);

-- CreateTable
CREATE TABLE "blog_post_tags" (
    "blog_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("blog_id","tag_id")
);

-- CreateIndex
CREATE INDEX "blog_authors_name_idx" ON "blog_authors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "blog_categories_slug_key" ON "blog_categories"("slug");

-- CreateIndex
CREATE INDEX "blog_categories_slug_idx" ON "blog_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tags_slug_key" ON "blog_tags"("slug");

-- CreateIndex
CREATE INDEX "blog_tags_slug_idx" ON "blog_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");

-- CreateIndex
CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts"("author_id");

-- CreateIndex
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts"("published_at");

-- CreateIndex
CREATE INDEX "blog_posts_is_featured_idx" ON "blog_posts"("is_featured");

-- CreateIndex
CREATE INDEX "blog_posts_is_pinned_idx" ON "blog_posts"("is_pinned");

-- CreateIndex
CREATE INDEX "blog_posts_status_published_at_idx" ON "blog_posts"("status", "published_at");

-- CreateIndex
CREATE INDEX "blog_posts_status_is_featured_idx" ON "blog_posts"("status", "is_featured");

-- CreateIndex
CREATE INDEX "blog_posts_status_is_pinned_idx" ON "blog_posts"("status", "is_pinned");

-- CreateIndex
CREATE UNIQUE INDEX "blog_seo_blog_id_key" ON "blog_seo"("blog_id");

-- CreateIndex
CREATE INDEX "blog_seo_blog_id_idx" ON "blog_seo"("blog_id");

-- CreateIndex
CREATE INDEX "blog_post_categories_blog_id_idx" ON "blog_post_categories"("blog_id");

-- CreateIndex
CREATE INDEX "blog_post_categories_category_id_idx" ON "blog_post_categories"("category_id");

-- CreateIndex
CREATE INDEX "blog_post_tags_blog_id_idx" ON "blog_post_tags"("blog_id");

-- CreateIndex
CREATE INDEX "blog_post_tags_tag_id_idx" ON "blog_post_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "blog_authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_seo" ADD CONSTRAINT "blog_seo_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_categories" ADD CONSTRAINT "blog_post_categories_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_categories" ADD CONSTRAINT "blog_post_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "blog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
