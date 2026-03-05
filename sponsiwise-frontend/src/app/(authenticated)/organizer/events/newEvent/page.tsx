import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import NewEventMultiStepForm from "@/components/organizer/NewEventMultiStepForm";

export default async function NewEventPage() {
  const user = await getServerUser();

  if (!user) redirect("/login");
  if (user.role !== UserRole.ORGANIZER) redirect("/organizer/dashboard");

  return <NewEventMultiStepForm />;
}
