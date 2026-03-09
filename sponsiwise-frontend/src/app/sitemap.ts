import type { MetadataRoute } from 'next';

type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
};

const PUBLIC_API =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<SitemapEntry[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sponsiwise.com';

  // Static pages
  const staticPages: SitemapEntry[] = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Dynamic blog posts
  let blogEntries: SitemapEntry[] = [];
  try {
    const res = await fetch(`${PUBLIC_API}/public/blogs?limit=100`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      blogEntries = (data.data || []).map(
        (post: { slug: string; updatedAt: string; publishedAt?: string }) => ({
          url: `${baseUrl}/blog/${post.slug}`,
          lastModified: new Date(post.updatedAt || post.publishedAt || new Date()),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }),
      );
    }
  } catch {
    // Fail silently — sitemap still returns static pages
  }

  // Blog category pages
  let categoryEntries: SitemapEntry[] = [];
  try {
    const res = await fetch(`${PUBLIC_API}/public/blogs/categories`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const categories = await res.json();
      categoryEntries = (categories || []).map(
        (cat: { slug: string }) => ({
          url: `${baseUrl}/blog?category=${cat.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }),
      );
    }
  } catch {
    // Fail silently
  }

  return [...staticPages, ...blogEntries, ...categoryEntries];
}
