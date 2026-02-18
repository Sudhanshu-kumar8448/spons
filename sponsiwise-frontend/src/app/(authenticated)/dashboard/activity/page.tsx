import ActivityTimeline from "@/components/shared/ActivityTimeline";

interface ActivityPageProps {
  searchParams: Promise<{
    page?: string;
    entityType?: string;
    action?: string;
  }>;
}

export default async function ActivityPage({
  searchParams,
}: ActivityPageProps) {
  const params = await searchParams;
  return <ActivityTimeline searchParams={params} />;
}
