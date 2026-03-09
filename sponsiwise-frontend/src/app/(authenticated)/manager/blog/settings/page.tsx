"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Tag,
  FolderOpen,
  User,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { BlogCategory, BlogTag, BlogAuthor } from "@/lib/blog-api";

type Tab = "categories" | "tags" | "authors";

export default function BlogSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/create form state
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formAvatar, setFormAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cats, tgs, auths] = await Promise.all([
        apiClient.get<BlogCategory[]>("/blogs/meta/categories"),
        apiClient.get<BlogTag[]>("/blogs/meta/tags"),
        apiClient.get<BlogAuthor[]>("/blogs/meta/authors"),
      ]);
      setCategories(cats);
      setTags(tgs);
      setAuthors(auths);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormBio("");
    setFormAvatar("");
    setIsCreating(false);
    setEditingId(null);
  }

  function startEdit(item: BlogCategory | BlogTag | BlogAuthor) {
    setEditingId(item.id);
    setFormName(item.name);
    setFormSlug("slug" in item ? item.slug : "");
    setFormDescription("description" in item ? (item as BlogCategory).description ?? "" : "");
    setFormBio("bio" in item ? (item as BlogAuthor).bio ?? "" : "");
    setFormAvatar("avatar" in item ? (item as BlogAuthor).avatar ?? "" : "");
    setIsCreating(false);
  }

  function startCreate() {
    resetForm();
    setIsCreating(true);
  }

  // ── CATEGORY CRUD ─────────────────────────────────────────

  async function saveCategory() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { name: formName.trim() };
      if (formSlug.trim()) body.slug = formSlug.trim();
      if (formDescription.trim()) body.description = formDescription.trim();

      if (editingId) {
        await apiClient.patch(`/blogs/categories/${editingId}`, body);
      } else {
        await apiClient.post("/blogs/categories", body);
      }
      await loadData();
      resetForm();
    } catch (err: any) {
      alert(err?.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      await apiClient.delete(`/blogs/categories/${id}`);
      await loadData();
    } catch {
      alert("Failed to delete category.");
    }
  }

  // ── TAG CRUD ──────────────────────────────────────────────

  async function saveTag() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { name: formName.trim() };
      if (formSlug.trim()) body.slug = formSlug.trim();

      if (editingId) {
        await apiClient.patch(`/blogs/tags/${editingId}`, body);
      } else {
        await apiClient.post("/blogs/tags", body);
      }
      await loadData();
      resetForm();
    } catch (err: any) {
      alert(err?.message || "Failed to save tag.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTag(id: string, name: string) {
    if (!confirm(`Delete tag "${name}"?`)) return;
    try {
      await apiClient.delete(`/blogs/tags/${id}`);
      await loadData();
    } catch {
      alert("Failed to delete tag.");
    }
  }

  // ── AUTHOR CRUD ───────────────────────────────────────────

  async function saveAuthor() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { name: formName.trim() };
      if (formBio.trim()) body.bio = formBio.trim();
      if (formAvatar.trim()) body.avatar = formAvatar.trim();

      if (editingId) {
        await apiClient.patch(`/blogs/authors/${editingId}`, body);
      } else {
        await apiClient.post("/blogs/authors", body);
      }
      await loadData();
      resetForm();
    } catch (err: any) {
      alert(err?.message || "Failed to save author.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAuthor(id: string, name: string) {
    if (!confirm(`Delete author "${name}"?`)) return;
    try {
      await apiClient.delete(`/blogs/authors/${id}`);
      await loadData();
    } catch {
      alert("Failed to delete author.");
    }
  }

  function handleSave() {
    if (activeTab === "categories") saveCategory();
    else if (activeTab === "tags") saveTag();
    else saveAuthor();
  }

  function handleDelete(id: string, name: string) {
    if (activeTab === "categories") deleteCategory(id, name);
    else if (activeTab === "tags") deleteTag(id, name);
    else deleteAuthor(id, name);
  }

  const items =
    activeTab === "categories"
      ? categories
      : activeTab === "tags"
      ? tags
      : authors;

  const tabIcon = {
    categories: FolderOpen,
    tags: Tag,
    authors: User,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/manager/blog"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-white">Blog Settings</h1>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
        {(["categories", "tags", "authors"] as const).map((tab) => {
          const Icon = tabIcon[tab];
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                resetForm();
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Create / Edit Form */}
      {(isCreating || editingId) && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              {editingId ? "Edit" : "New"}{" "}
              {activeTab === "categories" ? "Category" : activeTab === "tags" ? "Tag" : "Author"}
            </h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  activeTab === "categories"
                    ? "e.g. Event Strategy"
                    : activeTab === "tags"
                    ? "e.g. sponsorship-tips"
                    : "e.g. Jane Smith"
                }
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>

            {activeTab !== "authors" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Slug (auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="auto-generated"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            )}

            {activeTab === "categories" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of this category"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            )}

            {activeTab === "authors" && (
              <>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Bio
                  </label>
                  <textarea
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    rows={2}
                    placeholder="Author bio…"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Avatar URL
                  </label>
                  <input
                    type="url"
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Add button */}
      {!isCreating && !editingId && (
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Add{" "}
          {activeTab === "categories" ? "Category" : activeTab === "tags" ? "Tag" : "Author"}
        </button>
      )}

      {/* Items list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 py-16">
          <span className="text-4xl">
            {activeTab === "categories" ? "📂" : activeTab === "tags" ? "🏷️" : "👤"}
          </span>
          <h2 className="mt-4 text-lg font-semibold text-white">
            No {activeTab} yet
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Create your first {activeTab === "categories" ? "category" : activeTab === "tags" ? "tag" : "author"} to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <table className="min-w-full divide-y divide-slate-800">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                  Name
                </th>
                {activeTab !== "authors" && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    Slug
                  </th>
                )}
                {activeTab === "categories" && (
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 md:table-cell">
                    Description
                  </th>
                )}
                {activeTab === "authors" && (
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 md:table-cell">
                    Bio
                  </th>
                )}
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-800/40">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {activeTab === "authors" && "avatar" in item && (item as BlogAuthor).avatar ? (
                        <img
                          src={(item as BlogAuthor).avatar!}
                          alt={item.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : activeTab === "authors" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                          {item.name.charAt(0)}
                        </div>
                      ) : null}
                      <span className="text-sm font-medium text-white">{item.name}</span>
                    </div>
                  </td>
                  {activeTab !== "authors" && (
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {"slug" in item ? (item as BlogCategory | BlogTag).slug : "—"}
                    </td>
                  )}
                  {activeTab === "categories" && (
                    <td className="hidden px-4 py-4 text-sm text-slate-500 md:table-cell">
                      {("description" in item ? (item as BlogCategory).description : null) || "—"}
                    </td>
                  )}
                  {activeTab === "authors" && (
                    <td className="hidden px-4 py-4 text-sm text-slate-500 md:table-cell line-clamp-1">
                      {("bio" in item ? (item as BlogAuthor).bio : null) || "—"}
                    </td>
                  )}
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-white"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
