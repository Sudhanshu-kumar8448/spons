import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import CompanyVerificationList from "@/components/manager/CompanyVerificationList";

interface CompaniesPageProps {
  searchParams: Promise<{
    page?: string;
    verification_status?: string;
    search?: string;
  }>;
}

/**
 * /dashboard/companies
 *
 * MANAGER: Company verification queue (pending, verified, rejected)
 * Other roles: Redirect or show "access denied" — Companies nav is MANAGER-only.
 */
export default async function CompaniesPage({
  searchParams,
}: CompaniesPageProps) {
  const user = await getServerUser();
  const params = await searchParams;

  // Only MANAGER has access to company verification
  if (user?.role !== UserRole.MANAGER) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
        <p className="text-sm text-amber-800">
          You don&apos;t have permission to view the company verification queue.
        </p>
        <p className="mt-1 text-xs text-amber-600">
          This page is for Managers only.
        </p>
      </div>
    );
  }

  return <CompanyVerificationList searchParams={params} />;
}
