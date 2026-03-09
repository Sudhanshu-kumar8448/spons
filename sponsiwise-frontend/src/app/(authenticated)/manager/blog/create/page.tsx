"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  X,
  Loader2,
  Send,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { BlogAuthor, BlogCategory, BlogTag } from "@/lib/blog-api";
import BlogEditor from "@/components/blog/BlogEditor";

export default function CreateBlogPage() {
  const router = useRouter();

  // ── Form state ────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // ── Meta data ─────────────────────────────────────────────────
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);

  // ── UI state ──────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "seo">("content");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get<BlogAuthor[]>("/blogs/meta/authors"),
      apiClient.get<BlogCategory[]>("/blogs/meta/categories"),
      apiClient.get<BlogTag[]>("/blogs/meta/tags"),
    ]).then(([a, c, t]) => {
      setAuthors(a);
      setCategories(c);
      setTags(t);
      if (a.length > 0 && !authorId) setAuthorId(a[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Save ──────────────────────────────────────────────────────

  async function handleSave(publish = false) {
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }
    if (!authorId) {
      alert("Please select an author.");
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
        status: publish ? "PUBLISHED" : scheduledAt ? "SCHEDULED" : "DRAFT",
        isFeatured,
        isPinned,
        categoryIds: selectedCategories,
        tagIds: selectedTags,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        keywords: keywords.trim() || undefined,
        canonicalUrl: canonicalUrl.trim() || undefined,
      };

      if (scheduledAt && !publish) {
        body.scheduledAt = new Date(scheduledAt).toISOString();
      }

      const created = await apiClient.post<{ id: string }>("/blogs", body);
      router.push(`/manager/blog/${created.id}/edit`);
    } catch (err: any) {
      alert(err?.message || "Failed to save post.");
    } finally {
      setter(false);
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

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/manager/blog"
            className="rounded-lg border border-slate-600 bg-slate-800/80 p-2 text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Create Post</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || publishing}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-600 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {scheduledAt ? "Schedule" : "Save Draft"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || publishing}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publish Now
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border-2 border-slate-700 bg-slate-900/80 p-1">
        {(["content", "seo"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab
                ? "border border-slate-500 bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab === "content" ? "Content" : "SEO & Meta"}
          </button>
        ))}
      </div>

      {activeTab === "content" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* Title */}
            <div >
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-2xl text-white placeholder-slate-500 outline-none transition focus:border-blue-500"
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

            {/* Excerpt */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Excerpt
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Brief summary shown in listings…"
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500"
              />
            </div>

            {/* Editor */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Content
              </label>
              <BlogEditor content={content} onChange={setContent} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Featured image */}
            <div className="rounded-xl border-2 border-slate-600 bg-slate-800/90 p-4 shadow-lg">
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
            <div className="rounded-xl border-2 border-slate-600 bg-slate-800/90 p-4 shadow-lg">
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
            <div className="rounded-xl border-2 border-slate-600 bg-slate-800/90 p-4 shadow-lg">
              <h3 className="mb-3 text-sm font-semibold text-white">
                Categories
              </h3>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No categories yet. Create them from the blog settings.
                </p>
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
            <div className="rounded-xl border-2 border-slate-600 bg-slate-800/90 p-4 shadow-lg">
              <h3 className="mb-3 text-sm font-semibold text-white">Tags</h3>
              {tags.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No tags yet. Create them from the blog settings.
                </p>
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
            <div className="rounded-xl border-2 border-slate-600 bg-slate-800/90 p-4 shadow-lg">
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
                  Will auto-publish on{" "}
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
            <div className="rounded-xl border-2 border-slate-600 bg-slate-800/90 p-4 shadow-lg">
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
        <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-0">
          <div className="rounded-xl border-2 border-slate-600 bg-slate-800/90 p-6 shadow-lg space-y-5">
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

            {/* Live preview */}
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
