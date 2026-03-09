"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Star,
  Pin,
  ArrowUpFromLine,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Globe,
  FileText,
  Clock,
  Archive,
  Settings,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type {
  BlogPost,
  BlogCategory,
  BlogTag,
  PaginatedBlogs,
} from "@/lib/blog-api";

// ─── Status config ─────────────────────────────────────────────────

const statusFilters = [
  { label: "All", value: "", icon: FileText },
  { label: "Draft", value: "DRAFT", icon: FileText },
  { label: "Published", value: "PUBLISHED", icon: Globe },
  { label: "Scheduled", value: "SCHEDULED", icon: Clock },
  { label: "Archived", value: "ARCHIVED", icon: Archive },
];

const statusBadge: Record<string, string> = {
  DRAFT: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  PUBLISHED: "bg-green-500/10 text-green-400 border-green-500/20",
  SCHEDULED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ARCHIVED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

// ─── Props ─────────────────────────────────────────────────────────

interface BlogListClientProps {
  initialBlogs: PaginatedBlogs;
  categories: BlogCategory[];
  tags: BlogTag[];
  currentPage: number;
  currentStatus?: string;
  currentSearch?: string;
}

export default function BlogListClient({
  initialBlogs,
  categories,
  tags,
  currentPage,
  currentStatus = "",
  currentSearch = "",
}: BlogListClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { data: blogs, total } = initialBlogs;
  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // ── Navigation helpers ──────────────────────────────────────────

  function buildUrl(overrides: {
    page?: number;
    status?: string;
    search?: string;
  }) {
    const p = new URLSearchParams();
    const s = overrides.status ?? currentStatus;
    const q = overrides.search ?? currentSearch;
    const pg = overrides.page ?? 1;
    if (s) p.set("status", s);
    if (q) p.set("search", q);
    if (pg > 1) p.set("page", String(pg));
    return `/manager/blog${p.toString() ? `?${p}` : ""}`;
  }

  function navigate(overrides: {
    page?: number;
    status?: string;
    search?: string;
  }) {
    startTransition(() => router.push(buildUrl(overrides)));
  }

  // ── Actions ─────────────────────────────────────────────────────

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) return;
    try {
      await apiClient.delete(`/blogs/${id}`);
      router.refresh();
    } catch {
      alert("Failed to delete post.");
    }
  }

  async function handlePublish(id: string) {
    try {
      await apiClient.post(`/blogs/${id}/publish`);
      router.refresh();
    } catch {
      alert("Failed to publish post.");
    }
  }

  async function handleUnpublish(id: string) {
    try {
      await apiClient.post(`/blogs/${id}/unpublish`);
      router.refresh();
    } catch {
      alert("Failed to unpublish post.");
    }
  }

  async function handleToggleFeature(id: string, current: boolean) {
    try {
      await apiClient.post(`/blogs/${id}/feature`, {
        featured: !current,
      });
      router.refresh();
    } catch {
      alert("Failed to update featured status.");
    }
  }

  async function handleTogglePin(id: string, current: boolean) {
    try {
      await apiClient.post(`/blogs/${id}/pin`, { pinned: !current });
      router.refresh();
    } catch {
      alert("Failed to update pinned status.");
    }
  }

  async function handleMoveUp(index: number) {
    if (index <= 0) return;
    const items = blogs.map((b, i) => ({ id: b.id, sortOrder: i }));
    // Swap
    [items[index].sortOrder, items[index - 1].sortOrder] = [items[index - 1].sortOrder, items[index].sortOrder];
    try {
      await apiClient.post("/blogs/reorder", { items });
      router.refresh();
    } catch {
      alert("Failed to reorder.");
    }
  }

  async function handleMoveDown(index: number) {
    if (index >= blogs.length - 1) return;
    const items = blogs.map((b, i) => ({ id: b.id, sortOrder: i }));
    [items[index].sortOrder, items[index + 1].sortOrder] = [items[index + 1].sortOrder, items[index].sortOrder];
    try {
      await apiClient.post("/blogs/reorder", { items });
      router.refresh();
    } catch {
      alert("Failed to reorder.");
    }
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create, manage and publish your content.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/manager/blog/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <Link
            href="/manager/blog/create"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ search, page: 1 });
            }}
            placeholder="Search posts…"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((f) => {
            const active = f.value === currentStatus;
            return (
              <button
                key={f.value}
                onClick={() => navigate({ status: f.value, page: 1 })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-white"
                }`}
              >
                <f.icon className="h-3 w-3" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <p className="text-xs text-slate-500">
        {total} post{total !== 1 ? "s" : ""} total
        {currentStatus ? ` · Filtered by ${currentStatus.toLowerCase()}` : ""}
        {isPending ? " · Loading…" : ""}
      </p>

      {/* Blog table / empty state */}
      {blogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16">
          <span className="text-5xl">📝</span>
          <h2 className="mt-4 text-lg font-semibold text-white">
            {currentStatus || currentSearch
              ? "No matching posts"
              : "No blog posts yet"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {currentStatus || currentSearch
              ? "Try adjusting your filters or search query."
              : "Create your first blog post to get started."}
          </p>
          {!currentStatus && !currentSearch && (
            <Link
              href="/manager/blog/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" /> Create Post
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    Post
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 md:table-cell">
                    Author
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 lg:table-cell">
                    Category
                  </th>
                  <th className="hidden px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-400 md:table-cell">
                    Views
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {blogs.map((post) => (
                  <tr
                    key={post.id}
                    className="transition-colors hover:bg-slate-800/40"
                  >
                    {/* Post title + excerpt */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {post.featuredImage ? (
                          <img
                            src={post.featuredImage}
                            alt=""
                            className="h-10 w-14 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-slate-800 text-slate-600">
                            <FileText className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/manager/blog/${post.id}/edit`}
                              className="truncate text-sm font-medium text-white hover:text-blue-400"
                            >
                              {post.title}
                            </Link>
                            {post.isFeatured && (
                              <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
                            )}
                            {post.isPinned && (
                              <Pin className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                            )}
                          </div>
                          <p className="truncate text-xs text-slate-500">
                            {post.excerpt || "No excerpt"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          statusBadge[post.status] ?? statusBadge.DRAFT
                        }`}
                      >
                        {post.status.charAt(0) +
                          post.status.slice(1).toLowerCase()}
                      </span>
                    </td>

                    {/* Author */}
                    <td className="hidden px-4 py-4 md:table-cell">
                      <span className="text-sm text-slate-300">
                        {post.author?.name ?? "—"}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="hidden px-4 py-4 lg:table-cell">
                      <span className="text-sm text-slate-400">
                        {post.categories?.[0]?.category?.name ?? "—"}
                      </span>
                    </td>

                    {/* Views */}
                    <td className="hidden px-4 py-4 text-center md:table-cell">
                      <span className="text-sm text-slate-400">
                        {post.viewCount.toLocaleString()}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {new Date(
                        post.publishedAt ?? post.createdAt
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <div className="relative inline-flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(blogs.indexOf(post))}
                          disabled={blogs.indexOf(post) === 0}
                          className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-700 hover:text-white disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(blogs.indexOf(post))}
                          disabled={blogs.indexOf(post) === blogs.length - 1}
                          className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-700 hover:text-white disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setOpenMenu(
                              openMenu === post.id ? null : post.id
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {openMenu === post.id && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setOpenMenu(null)}
                            />
                            <div className="absolute right-0 z-50 mt-1 w-48 rounded-xl border border-slate-700 bg-slate-800 py-1 shadow-xl">
                              <Link
                                href={`/manager/blog/${post.id}/edit`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Link>

                              {post.status === "PUBLISHED" && (
                                <a
                                  href={`/blog/${post.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                                  onClick={() => setOpenMenu(null)}
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Live
                                </a>
                              )}

                              {post.status === "DRAFT" ||
                              post.status === "ARCHIVED" ? (
                                <button
                                  onClick={() => {
                                    setOpenMenu(null);
                                    handlePublish(post.id);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-slate-700"
                                >
                                  <ArrowUpFromLine className="h-3.5 w-3.5" />{" "}
                                  Publish
                                </button>
                              ) : post.status === "PUBLISHED" ? (
                                <button
                                  onClick={() => {
                                    setOpenMenu(null);
                                    handleUnpublish(post.id);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-yellow-400 hover:bg-slate-700"
                                >
                                  <ArrowDownToLine className="h-3.5 w-3.5" />{" "}
                                  Unpublish
                                </button>
                              ) : null}

                              <button
                                onClick={() => {
                                  setOpenMenu(null);
                                  handleToggleFeature(
                                    post.id,
                                    post.isFeatured
                                  );
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                              >
                                <Star className="h-3.5 w-3.5" />
                                {post.isFeatured ? "Unfeature" : "Feature"}
                              </button>

                              <button
                                onClick={() => {
                                  setOpenMenu(null);
                                  handleTogglePin(post.id, post.isPinned);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                              >
                                <Pin className="h-3.5 w-3.5" />
                                {post.isPinned ? "Unpin" : "Pin"}
                              </button>

                              <div className="my-1 border-t border-slate-700" />

                              <button
                                onClick={() => {
                                  setOpenMenu(null);
                                  handleDelete(post.id, post.title);
                                }}
                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => navigate({ page: currentPage - 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" /> Previous
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => navigate({ page: currentPage + 1 })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
