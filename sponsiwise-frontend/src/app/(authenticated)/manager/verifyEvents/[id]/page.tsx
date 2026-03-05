import EventVerificationDetail from "@/components/manager/EventVerificationDetail";

interface VerifyEventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VerifyEventDetailPage({
  params,
}: VerifyEventDetailPageProps) {
  const { id } = await params;
  return <EventVerificationDetail id={id} />;
}
