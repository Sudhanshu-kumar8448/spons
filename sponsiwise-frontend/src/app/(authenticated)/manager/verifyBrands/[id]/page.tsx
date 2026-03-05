import CompanyVerificationDetail from "@/components/manager/CompanyVerificationDetail";

interface VerifyBrandDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VerifyBrandDetailPage({
  params,
}: VerifyBrandDetailPageProps) {
  const { id } = await params;
  return <CompanyVerificationDetail id={id} />;
}
