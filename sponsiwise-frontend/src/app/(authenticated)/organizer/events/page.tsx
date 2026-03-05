import OrganizerEventsList from "@/components/organizer/OrganizerEventsList";

interface OrganizerEventsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
  }>;
}

export default async function OrganizerEventsPage({
  searchParams,
}: OrganizerEventsPageProps) {
  const params = await searchParams;
  return <OrganizerEventsList searchParams={params} />;
}
