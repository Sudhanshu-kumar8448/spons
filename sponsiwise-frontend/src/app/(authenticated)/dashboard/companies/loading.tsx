import { ListPageSkeleton } from "@/components/shared";

export default function CompaniesLoading() {
  return (
    <ListPageSkeleton
      tabCount={4}
      tableRows={8}
      tableColumns={5}
    />
  );
}
