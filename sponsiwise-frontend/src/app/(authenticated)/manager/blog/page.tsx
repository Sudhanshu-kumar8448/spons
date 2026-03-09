import { Suspense } from "react";
import { fetchBlogs, fetchCategories, fetchTags } from "@/lib/blog-api";
import BlogListClient from "./BlogListClient";

export default async function ManagerBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = typeof params.status === "string" ? params.status : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  const [blogsData, categories, tags] = await Promise.all([
    fetchBlogs({ page, limit: 20, status, search }),
    fetchCategories(),
    fetchTags(),
  ]);

  return (
    <BlogListClient
      initialBlogs={blogsData}
      categories={categories}
      tags={tags}
      currentPage={page}
      currentStatus={status}
      currentSearch={search}
    />
  );
}
