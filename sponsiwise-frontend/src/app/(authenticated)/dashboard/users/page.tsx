import UserList from "@/components/admin/UserList";

interface UsersPageProps {
  searchParams: Promise<{
    page?: string;
    role?: string;
    status?: string;
    search?: string;
  }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  return <UserList searchParams={params} />;
}
