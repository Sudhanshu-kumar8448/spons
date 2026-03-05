import OrganizerEventDetail from "@/components/organizer/OrganizerEventDetail";

interface OrganizerEventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizerEventDetailPage({
  params,
}: OrganizerEventDetailPageProps) {
  const { id } = await params;
  return <OrganizerEventDetail id={id} />;
}
