import OrganizerProposalDetail from "@/components/organizer/OrganizerProposalDetail";

interface OrganizerProposalDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrganizerProposalDetailPage({
  params,
}: OrganizerProposalDetailPageProps) {
  const routeParams = await params;
  return <OrganizerProposalDetail id={routeParams.id} />;
}
