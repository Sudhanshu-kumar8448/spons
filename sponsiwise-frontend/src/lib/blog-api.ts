import { authFetch } from "@/lib/auth-fetch";

// ─── Types ──────────────────────────────────────────────────────────

export interface BlogAuthor {
  id: string;
  name: string;
  bio?: string | null;
  avatar?: string | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogSEO {
  id: string;
  blogId: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  canonicalUrl?: string | null;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  featuredImage?: string | null;
  authorId: string;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED";
  publishedAt?: string | null;
  scheduledAt?: string | null;
  isFeatured: boolean;
  isPinned: boolean;
  sortOrder: number;
  viewCount: number;
  readingTime: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  author: BlogAuthor;
  seo?: BlogSEO | null;
  categories: Array<{ blogId: string; categoryId: string; category: BlogCategory }>;
  tags: Array<{ blogId: string; tagId: string; tag: BlogTag }>;
}

export interface PaginatedBlogs {
  data: BlogPost[];
  total: number;
  page: number;
  limit: number;
}

// ─── Manager API (authenticated, server-side) ──────────────────────

export async function fetchBlogs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  categoryId?: string;
  tagId?: string;
}): Promise<PaginatedBlogs> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.tagId) qs.set("tagId", params.tagId);
  const query = qs.toString();
  return authFetch<PaginatedBlogs>(`/blogs${query ? `?${query}` : ""}`);
}

export async function fetchBlogById(id: string): Promise<BlogPost> {
  return authFetch<BlogPost>(`/blogs/${id}`);
}

export async function fetchCategories(): Promise<BlogCategory[]> {
  return authFetch<BlogCategory[]>("/blogs/meta/categories");
}

export async function fetchTags(): Promise<BlogTag[]> {
  return authFetch<BlogTag[]>("/blogs/meta/tags");
}

export async function fetchAuthors(): Promise<BlogAuthor[]> {
  return authFetch<BlogAuthor[]>("/blogs/meta/authors");
}

// ─── Public API (no auth, server-side) ─────────────────────────

const PUBLIC_API =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function fetchPublicBlogs(params?: {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
}): Promise<PaginatedBlogs> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.category) qs.set("category", params.category);
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  const res = await fetch(
    `${PUBLIC_API}/public/blogs${query ? `?${query}` : ""}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error("Failed to fetch blogs");
  return res.json();
}

export async function fetchPublicBlogBySlug(
  slug: string
): Promise<BlogPost> {
  const res = await fetch(`${PUBLIC_API}/public/blogs/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Blog post not found");
  return res.json();
}

export async function fetchPublicCategories(): Promise<BlogCategory[]> {
  const res = await fetch(`${PUBLIC_API}/public/blogs/categories`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPublicTags(): Promise<BlogTag[]> {
  const res = await fetch(`${PUBLIC_API}/public/blogs/tags`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchRelatedBlogs(slug: string): Promise<BlogPost[]> {
  const res = await fetch(`${PUBLIC_API}/public/blogs/${slug}/related`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) return [];
  return res.json();
}
