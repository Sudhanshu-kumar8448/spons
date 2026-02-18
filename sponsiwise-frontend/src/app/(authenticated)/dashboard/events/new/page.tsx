import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import { createOrganizerEvent } from "@/lib/organizer-api";
import CreateEventForm from "@/components/organizer/CreateEventForm";

export default async function CreateEventPage() {
    const user = await getServerUser();

    if (!user) redirect("/login");
    if (user.role !== UserRole.ORGANIZER) redirect("/dashboard");

    async function handleCreate(
        formData: FormData,
    ): Promise<{ error?: string }> {
        "use server";

        const title = formData.get("title") as string;
        const description = (formData.get("description") as string) || undefined;
        const location = (formData.get("location") as string) || undefined;
        const venue = (formData.get("venue") as string) || undefined;
        const startDate = formData.get("startDate") as string;
        const endDate = formData.get("endDate") as string;
        const expectedFootfall = Number(formData.get("expectedFootfall"));
        const website = (formData.get("website") as string) || undefined;
        const logoUrl = (formData.get("logoUrl") as string) || undefined;
        const category = (formData.get("category") as string) || undefined;

        if (!title || !startDate || !endDate || isNaN(expectedFootfall)) {
            return { error: "Please fill in all required fields." };
        }

        if (new Date(endDate) <= new Date(startDate)) {
            return { error: "End date must be after start date." };
        }

        try {
            await createOrganizerEvent({
                title,
                description,
                location,
                venue,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                expectedFootfall,
                website,
                logoUrl,
                category,
            });
            return {};
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Failed to create event";
            return { error: message };
        }
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <CreateEventForm createAction={handleCreate} />
        </div>
    );
}
