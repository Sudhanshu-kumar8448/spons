import ManagerProposalsList from "@/components/manager/ManagerProposalsList";

interface ManagerProposalsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    event_id?: string;
  }>;
}

export default async function ManagerProposalsPage({
  searchParams,
}: ManagerProposalsPageProps) {
  const params = await searchParams;
  return <ManagerProposalsList searchParams={params} />;
}
