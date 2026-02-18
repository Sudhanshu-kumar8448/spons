import { DashboardPageSkeleton } from "@/components/shared";

export default function DashboardLoading() {
  return <DashboardPageSkeleton statCount={5} tableRows={5} />;
}
