import CompanyVerificationList from "@/components/manager/CompanyVerificationList";

interface VerifyBrandsPageProps {
  searchParams: Promise<{
    page?: string;
    verification_status?: string;
    search?: string;
  }>;
}

export default async function VerifyBrandsPage({
  searchParams,
}: VerifyBrandsPageProps) {
  const params = await searchParams;
  return <CompanyVerificationList searchParams={params} />;
}
