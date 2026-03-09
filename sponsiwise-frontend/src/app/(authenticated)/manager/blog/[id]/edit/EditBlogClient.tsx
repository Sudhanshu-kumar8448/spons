"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Eye,
  Image as ImageIcon,
  X,
  Loader2,
  Send,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { BlogPost, BlogAuthor, BlogCategory, BlogTag } from "@/lib/blog-api";
import BlogEditor from "@/components/blog/BlogEditor";

interface EditBlogClientProps {
  post: BlogPost;
  categories: BlogCategory[];
  tags: BlogTag[];
  authors: BlogAuthor[];
}

export default function EditBlogClient({
  post,
  categories,
  tags,
  authors,
}: EditBlogClientProps) {
  const router = useRouter();

  // ── Form state (pre-populated) ────────────────────────────────
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [slugManual, setSlugManual] = useState(true); // slug already exists
  const [excerpt, setExcerpt] = useState(post.excerpt ?? "");
  const [content, setContent] = useState(post.content);
  const [featuredImage, setFeaturedImage] = useState(post.featuredImage ?? "");
  const [authorId, setAuthorId] = useState(post.authorId);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    post.categories?.map((c) => c.categoryId) ?? []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    post.tags?.map((t) => t.tagId) ?? []
  );
  const [metaTitle, setMetaTitle] = useState(post.seo?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    post.seo?.metaDescription ?? ""
  );
  const [keywords, setKeywords] = useState(post.seo?.keywords ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(
    post.seo?.canonicalUrl ?? ""
  );
  const [isFeatured, setIsFeatured] = useState(post.isFeatured);
  const [isPinned, setIsPinned] = useState(post.isPinned);
  const [scheduledAt, setScheduledAt] = useState(
    post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ""
  );

  // ── UI state ──────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "seo">("content");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ── Auto-slug ─────────────────────────────────────────────────
  useEffect(() => {
    if (!slugManual) {
      setSlug(
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  }, [title, slugManual]);

  // ── Image upload ──────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const { uploadUrl, fileUrl } = await apiClient.post<{
        uploadUrl: string;
        fileUrl: string;
      }>("/upload/presigned-url", {
        fileName: file.name,
        fileType: file.type,
        folder: "blog-images",
      });
      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      setFeaturedImage(fileUrl);
    } catch {
      alert("Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  }

  // ── Save / publish ────────────────────────────────────────────
  async function handleSave(publish = false) {
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }

    const setter = publish ? setPublishing : setSaving;
    setter(true);

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        content,
        featuredImage: featuredImage || undefined,
        authorId,
        isFeatured,
        isPinned,
        categoryIds: selectedCategories,
        tagIds: selectedTags,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        keywords: keywords.trim() || undefined,
        canonicalUrl: canonicalUrl.trim() || undefined,
      };

      if (publish && post.status !== "PUBLISHED") {
        body.status = "PUBLISHED";
      } else if (scheduledAt && post.status !== "PUBLISHED") {
        body.status = "SCHEDULED";
        body.scheduledAt = new Date(scheduledAt).toISOString();
      }

      await apiClient.patch(`/blogs/${post.id}`, body);
      setLastSaved(new Date());

      if (publish && post.status !== "PUBLISHED") {
        await apiClient.post(`/blogs/${post.id}/publish`);
      }

      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to save post.");
    } finally {
      setter(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/blogs/${post.id}`);
      router.push("/manager/blog");
    } catch {
      alert("Failed to delete.");
    }
  }

  // ── Category / Tag toggles ───────────────────────────────────
  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/manager/blog"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Edit Post</h1>
            {lastSaved && (
              <p className="text-xs text-slate-500">
                Last saved{" "}
                {lastSaved.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {post.status === "PUBLISHED" && (
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              <Eye className="h-4 w-4" /> View Live
            </a>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving || publishing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
          {post.status !== "PUBLISHED" && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving || publishing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish
            </button>
          )}
          <button
            onClick={handleDelete}
            className="rounded-xl border border-red-500/20 p-2 text-red-400 transition hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            post.status === "PUBLISHED"
              ? "border-green-500/20 bg-green-500/10 text-green-400"
              : post.status === "SCHEDULED"
              ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
              : post.status === "ARCHIVED"
              ? "border-slate-500/20 bg-slate-500/10 text-slate-400"
              : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
          }`}
        >
          {post.status.charAt(0) + post.status.slice(1).toLowerCase()}
        </span>
        <span className="text-xs text-slate-500">
          {post.viewCount.toLocaleString()} views · {post.readingTime} min read
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        {(["content", "seo"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab === "content" ? "Content" : "SEO & Meta"}
          </button>
        ))}
      </div>

      {activeTab === "content" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main content */}
          <div className="space-y-6">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className="w-full border-0 bg-transparent text-2xl font-bold text-white placeholder-slate-600 outline-none"
              />
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">Slug:</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setSlugManual(true);
                    setSlug(e.target.value);
                  }}
                  className="flex-1 border-0 bg-transparent text-xs text-slate-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary…"
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Content
              </label>
              <BlogEditor content={content} onChange={setContent} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Featured image */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Featured Image
              </h3>
              {featuredImage ? (
                <div className="group relative">
                  <img
                    src={featuredImage}
                    alt="Featured"
                    className="w-full rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setFeaturedImage("")}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-700 py-8 transition hover:border-slate-500">
                  {uploadingImage ? (
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <ImageIcon className="mb-2 h-6 w-6 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        Click to upload
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>

            {/* Author */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Author</h3>
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="">Select author…</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categories */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Categories
              </h3>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-500">No categories yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleCategory(c.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        selectedCategories.includes(c.id)
                          ? "bg-blue-600 text-white"
                          : "border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Tags</h3>
              {tags.length === 0 ? (
                <p className="text-xs text-slate-500">No tags yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        selectedTags.includes(t.id)
                          ? "bg-purple-600 text-white"
                          : "border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Schedule
              </h3>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]"
              />
              {scheduledAt && (
                <p className="mt-2 text-xs text-blue-400">
                  {post.status === "SCHEDULED" ? "Scheduled for" : "Will schedule for"}{" "}
                  {new Date(scheduledAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>

            {/* Flags */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Options
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300">Featured post</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-300">Pinned post</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SEO Tab */
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
            <h3 className="text-lg font-semibold text-white">
              SEO & Meta Settings
            </h3>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Meta Title
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || "Enter meta title"}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                {metaTitle.length}/60 characters
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Meta Description
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder={excerpt || "Enter meta description"}
                rows={3}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                {metaDescription.length}/160 characters
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Keywords
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Comma-separated keywords"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Canonical URL
              </label>
              <input
                type="url"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="https://example.com/blog/my-post"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium text-slate-300">
                Search Preview
              </h4>
              <div className="rounded-lg border border-slate-700 bg-slate-950 p-4">
                <p className="text-base font-medium text-blue-400">
                  {metaTitle || title || "Post Title"}
                </p>
                <p className="mt-0.5 text-xs text-green-500">
                  yourdomain.com/blog/{slug || "post-slug"}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {metaDescription || excerpt || "Post description…"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
