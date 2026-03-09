import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  fetchPublicBlogs,
  fetchPublicCategories,
} from "@/lib/blog-api";
import type { BlogPost, BlogCategory, PaginatedBlogs } from "@/lib/blog-api";
import Logo from "@/components/logo/logo";
import NewsletterForm from "@/components/blog/NewsletterForm";
import { ArrowRight, ChevronLeft, ChevronRight, Search, Clock, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | SponsiWise — Event Sponsorship Insights",
  description:
    "Expert insights, guides, and best practices on event sponsorship, brand partnerships, and event marketing from SponsiWise.",
  openGraph: {
    title: "SponsiWise Blog — Event Sponsorship Insights",
    description:
      "Expert insights and best practices on event sponsorship from SponsiWise.",
    type: "website",
  },
};

export default async function PublicBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const category =
    typeof params.category === "string" ? params.category : undefined;
  const search =
    typeof params.search === "string" ? params.search : undefined;

  const [blogsData, categories] = await Promise.all([
    fetchPublicBlogs({ page, limit: 12, category, search }),
    fetchPublicCategories(),
  ]);

  const { data: posts, total } = blogsData;
  const totalPages = Math.ceil(total / 12);

  // Split featured / regular
  const featuredPost = page === 1 && !search ? posts[0] : null;
  const regularPosts = featuredPost ? posts.slice(1) : posts;

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

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50/50 to-white px-4 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
            SponsiWise Blog
          </span>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Event Sponsorship{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Insights
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
            Expert guides, industry trends, and proven strategies for successful event sponsorships and brand partnerships.
          </p>
        </div>
      </section>

      {/* Category filters + search */}
      <section className="border-b border-slate-100 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                !category
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </Link>
            {categories.map((cat: BlogCategory) => (
              <Link
                key={cat.id}
                href={`/blog?category=${cat.slug}`}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  category === cat.slug
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <form
            action="/blog"
            method="GET"
            className="relative w-full sm:w-64"
          >
            {category && (
              <input type="hidden" name="category" value={category} />
            )}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search articles…"
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            />
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        {posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl">📭</p>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              No articles found
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Try a different search or browse all categories.
            </p>
            <Link
              href="/blog"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-500"
            >
              View All Posts
            </Link>
          </div>
        ) : (
          <>
            {/* Featured post hero card */}
            {featuredPost && (
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group mb-12 grid items-center gap-8 overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 transition hover:shadow-lg lg:grid-cols-2"
              >
                {featuredPost.featuredImage ? (
                  <div className="aspect-[16/10] overflow-hidden lg:aspect-auto lg:h-full relative">
                    <Image
                      src={featuredPost.featuredImage}
                      alt={featuredPost.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      priority
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-indigo-100 to-violet-100 lg:aspect-auto lg:h-full">
                    <span className="text-6xl">📝</span>
                  </div>
                )}
                <div className="p-8 lg:p-12">
                  {featuredPost.categories?.[0]?.category && (
                    <span className="mb-3 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600">
                      {featuredPost.categories[0].category.name}
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-slate-900 transition group-hover:text-indigo-600 sm:text-3xl">
                    {featuredPost.title}
                  </h2>
                  {featuredPost.excerpt && (
                    <p className="mt-3 text-slate-500 line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                  )}
                  <div className="mt-6 flex items-center gap-4">
                    {featuredPost.author?.avatar ? (
                      <img
                        src={featuredPost.author.avatar}
                        alt={featuredPost.author.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
                        {featuredPost.author?.name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {featuredPost.author?.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(
                            featuredPost.publishedAt ?? featuredPost.createdAt
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {featuredPost.readingTime} min read
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-600">
                    Read Article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            )}

            {/* Grid of posts */}
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {regularPosts.map((post: BlogPost) => (
                <article key={post.id} className="group">
                  <Link href={`/blog/${post.slug}`} className="block">
                    {post.featuredImage ? (
                      <div className="aspect-[16/10] overflow-hidden rounded-2xl relative">
                        <Image
                          src={post.featuredImage}
                          alt={post.title}
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
                      {post.categories?.[0]?.category && (
                        <span className="mb-2 inline-block rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-bold text-indigo-600">
                          {post.categories[0].category.name}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 transition group-hover:text-indigo-600 line-clamp-2">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-3">
                        {post.author?.avatar ? (
                          <img
                            src={post.author.avatar}
                            alt={post.author.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {post.author?.name?.charAt(0) ?? "?"}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{post.author?.name}</span>
                          <span>·</span>
                          <span>
                            {new Date(
                              post.publishedAt ?? post.createdAt
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span>·</span>
                          <span>{post.readingTime} min</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 flex items-center justify-center gap-4">
                {page > 1 && (
                  <Link
                    href={`/blog?page=${page - 1}${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Link>
                )}
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/blog?page=${page + 1}${category ? `&category=${category}` : ""}${search ? `&search=${search}` : ""}`}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Newsletter CTA */}
      <section className="border-t border-slate-100 bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900">
            Stay in the loop
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Get the latest event sponsorship insights delivered to your inbox.
          </p>
          <NewsletterForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} SponsiWise. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
