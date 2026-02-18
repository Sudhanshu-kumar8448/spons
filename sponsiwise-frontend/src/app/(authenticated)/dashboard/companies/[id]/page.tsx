import CompanyVerificationDetail from "@/components/manager/CompanyVerificationDetail";

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  const { id } = await params;
  return <CompanyVerificationDetail id={id} />;
}
