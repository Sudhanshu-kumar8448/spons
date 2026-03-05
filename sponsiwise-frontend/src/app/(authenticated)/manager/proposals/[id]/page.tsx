import ManagerProposalDetail from "@/components/manager/ManagerProposalDetail";

interface ManagerProposalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ManagerProposalDetailPage({
  params,
}: ManagerProposalDetailPageProps) {
  const { id } = await params;
  return <ManagerProposalDetail id={id} />;
}
