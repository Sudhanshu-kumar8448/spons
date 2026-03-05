import OrganizerProposalsList from "@/components/organizer/OrganizerProposalsList";

interface OrganizerProposalsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    event_id?: string;
  }>;
}

export default async function OrganizerProposalsPage({
  searchParams,
}: OrganizerProposalsPageProps) {
  const params = await searchParams;
  return <OrganizerProposalsList searchParams={params} />;
}
