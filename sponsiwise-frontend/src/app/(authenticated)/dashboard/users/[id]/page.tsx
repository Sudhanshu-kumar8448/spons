import UserDetail from "@/components/admin/UserDetail";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({
  params,
}: UserDetailPageProps) {
  const { id } = await params;
  return <UserDetail id={id} />;
}
