import EventVerificationList from "@/components/manager/EventVerificationList";

interface PastEventsPageProps {
  searchParams: Promise<{
    page?: string;
    verification_status?: string;
    search?: string;
  }>;
}

export default async function PastEventsPage({
  searchParams,
}: PastEventsPageProps) {
  const params = await searchParams;
  return <EventVerificationList searchParams={params} />;
}
