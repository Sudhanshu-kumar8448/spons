import EventVerificationList from "@/components/manager/EventVerificationList";

interface LiveEventsPageProps {
  searchParams: Promise<{
    page?: string;
    verification_status?: string;
    search?: string;
  }>;
}

export default async function LiveEventsPage({
  searchParams,
}: LiveEventsPageProps) {
  const params = await searchParams;
  return <EventVerificationList searchParams={params} />;
}
