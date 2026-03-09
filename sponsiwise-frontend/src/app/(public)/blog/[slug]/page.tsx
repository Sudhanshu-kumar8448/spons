import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  fetchPublicBlogBySlug,
  fetchRelatedBlogs,
} from "@/lib/blog-api";
import type { BlogPost } from "@/lib/blog-api";
import Logo from "@/components/logo/logo";
import NewsletterForm from "@/components/blog/NewsletterForm";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Tag,
  Twitter,
  Linkedin,
  Facebook,
  ChevronRight,
} from "lucide-react";
import TableOfContents from "@/components/blog/TableOfContents";

// ─── Dynamic SEO metadata ──────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await fetchPublicBlogBySlug(slug);
    const title = post.seo?.metaTitle || post.title;
    const description =
      post.seo?.metaDescription || post.excerpt || `Read ${post.title} on SponsiWise Blog`;
    return {
      title: `${title} | SponsiWise Blog`,
      description,
      keywords: post.seo?.keywords || undefined,
      alternates: post.seo?.canonicalUrl
        ? { canonical: post.seo.canonicalUrl }
        : undefined,
      openGraph: {
        title,
        description,
        type: "article",
        publishedTime: post.publishedAt ?? post.createdAt,
        authors: post.author?.name ? [post.author.name] : undefined,
        images: post.featuredImage ? [post.featuredImage] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: post.featuredImage ? [post.featuredImage] : undefined,
      },
    };
  } catch {
    return { title: "Post Not Found | SponsiWise Blog" };
  }
}

// ─── Page ──────────────────────────────────────────────────────

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let post: BlogPost;
  try {
    post = await fetchPublicBlogBySlug(slug);
  } catch {
    notFound();
  }

  const relatedPosts = await fetchRelatedBlogs(slug);

  // Build share URLs
  const shareUrl = `https://sponsiwise.com/blog/${slug}`;
  const shareTitle = encodeURIComponent(post.title);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareTitle}&url=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Logo />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/blog"
              className="text-sm font-bold text-indigo-600"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:scale-105"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="border-b border-slate-50 bg-slate-50/50 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-2 text-sm text-slate-400">
          <Link href="/blog" className="hover:text-indigo-600 transition">
            Blog
          </Link>
          <ChevronRight className="h-3 w-3" />
          {post.categories?.[0]?.category && (
            <>
              <Link
                href={`/blog?category=${post.categories[0].category.slug}`}
                className="hover:text-indigo-600 transition"
              >
                {post.categories[0].category.name}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="truncate text-slate-600">{post.title}</span>
        </div>
      </div>

      {/* Article with TOC */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-10">
          <article className="max-w-4xl py-10 sm:py-16">
        {/* Category badge */}
        {post.categories?.[0]?.category && (
          <Link
            href={`/blog?category=${post.categories[0].category.slug}`}
            className="mb-4 inline-block rounded-full bg-indigo-50 px-4 py-1 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
          >
            {post.categories[0].category.name}
          </Link>
        )}

        {/* Title */}
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl lg:leading-[1.1]">
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="mt-6 text-lg leading-relaxed text-slate-500 sm:text-xl">
            {post.excerpt}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-8 flex flex-wrap items-center gap-6 border-b border-slate-100 pb-8">
          {/* Author */}
          <div className="flex items-center gap-3">
            {post.author?.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-600">
                {post.author?.name?.charAt(0) ?? "?"}
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900">
                {post.author?.name}
              </p>
              {post.author?.bio && (
                <p className="text-xs text-slate-400 line-clamp-1">
                  {post.author.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(
                post.publishedAt ?? post.createdAt
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readingTime} min read
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {post.viewCount.toLocaleString()} views
            </span>
          </div>

          {/* Share buttons */}
          <div className="ml-auto flex items-center gap-2">
            <span className="mr-1 text-xs font-medium text-slate-400">Share</span>
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              title="Share on Twitter"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              title="Share on LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              title="Share on Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Featured image */}
        {post.featuredImage && (
          <div className="mt-8 overflow-hidden rounded-2xl relative aspect-[16/9]">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 896px"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg prose-slate mx-auto mt-10 max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:leading-relaxed prose-p:text-slate-600
            prose-a:text-indigo-600 prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-md
            prose-blockquote:border-indigo-200 prose-blockquote:bg-indigo-50/50 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:text-slate-600
            prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-indigo-600 prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-900 prose-pre:rounded-xl prose-pre:shadow-lg
            prose-table:border prose-table:border-slate-200 prose-th:bg-slate-50 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2
            prose-li:text-slate-600
            prose-hr:border-slate-200"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-8">
            <Tag className="h-4 w-4 text-slate-400" />
            {post.tags.map((t) => (
              <Link
                key={t.tagId}
                href={`/blog?tag=${t.tag.slug}`}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
              >
                {t.tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Author card */}
        {post.author && (
          <div className="mt-12 rounded-2xl border border-slate-100 bg-slate-50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              {post.author.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
                  {post.author.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Written by
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {post.author.name}
                </p>
                {post.author.bio && (
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {post.author.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        </article>

        {/* Table of Contents sidebar */}
        <TableOfContents content={post.content} />
      </div>
      </div>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50 px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 text-2xl font-bold text-slate-900">
              Related Articles
            </h2>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.slice(0, 3).map((rp: BlogPost) => (
                <article key={rp.id} className="group">
                  <Link href={`/blog/${rp.slug}`} className="block">
                    {rp.featuredImage ? (
                      <div className="aspect-[16/10] overflow-hidden rounded-2xl relative">
                        <Image
                          src={rp.featuredImage}
                          alt={rp.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50">
                        <span className="text-4xl">📄</span>
                      </div>
                    )}
                    <div className="mt-4">
                      {rp.categories?.[0]?.category && (
                        <span className="mb-2 inline-block rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-bold text-indigo-600">
                          {rp.categories[0].category.name}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 transition group-hover:text-indigo-600 line-clamp-2">
                        {rp.title}
                      </h3>
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                        <span>{rp.author?.name}</span>
                        <span>·</span>
                        <span>
                          {new Date(
                            rp.publishedAt ?? rp.createdAt
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>·</span>
                        <span>{rp.readingTime} min</span>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter CTA */}
      <section className="border-t border-slate-100 bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Enjoyed this article?
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Get more event sponsorship insights delivered straight to your inbox.
          </p>
          <NewsletterForm />
        </div>
      </section>

      {/* Back to blog + Footer */}
      <footer className="border-t border-slate-100 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Blog
          </Link>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} SponsiWise. All rights reserved.
          </p>
        </div>
      </footer>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt ?? "",
            image: post.featuredImage ?? undefined,
            author: {
              "@type": "Person",
              name: post.author?.name,
            },
            datePublished: post.publishedAt ?? post.createdAt,
            dateModified: post.updatedAt,
            publisher: {
              "@type": "Organization",
              name: "SponsiWise",
              logo: {
                "@type": "ImageObject",
                url: "https://sponsiwise.com/images/logo-icon.svg",
              },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://sponsiwise.com/blog/${slug}`,
            },
            wordCount: post.content
              ? post.content.replace(/<[^>]*>/g, "").split(/\s+/).length
              : 0,
          }),
        }}
      />
    </div>
  );
}
