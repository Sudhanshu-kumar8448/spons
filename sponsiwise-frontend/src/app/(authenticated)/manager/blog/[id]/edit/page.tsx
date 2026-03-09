import { fetchBlogById, fetchCategories, fetchTags, fetchAuthors } from "@/lib/blog-api";
import EditBlogClient from "./EditBlogClient";

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, categories, tags, authors] = await Promise.all([
    fetchBlogById(id),
    fetchCategories(),
    fetchTags(),
    fetchAuthors(),
  ]);

  return (
    <EditBlogClient
      post={post}
      categories={categories}
      tags={tags}
      authors={authors}
    />
  );
}
