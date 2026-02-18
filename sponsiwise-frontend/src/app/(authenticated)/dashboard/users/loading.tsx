import { ListPageSkeleton } from "@/components/shared";

export default function UsersLoading() {
  return <ListPageSkeleton tabCount={7} tableRows={10} tableColumns={4} showAvatar />;
}
