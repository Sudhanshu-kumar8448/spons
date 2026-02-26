import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import { TierType } from "@/lib/types/organizer";
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

        // Basic fields
        const title = formData.get("title") as string;
        const description = (formData.get("description") as string) || undefined;
        const category = (formData.get("category") as string) || undefined;
        const website = (formData.get("website") as string) || undefined;
        const logoUrl = (formData.get("logoUrl") as string) || undefined;

        // Date fields
        const startDate = formData.get("startDate") as string;
        const endDate = formData.get("endDate") as string;
        const expectedFootfall = Number(formData.get("expectedFootfall"));

        // Contact fields (optional but safe)
        const contactPhone = (formData.get("contactPhone") as string) || undefined;
        const contactEmail = (formData.get("contactEmail") as string) || undefined;

        // Address fields (nested format)
        const addressLine1 = formData.get("address[addressLine1]") as string;
        const addressLine2 = (formData.get("address[addressLine2]") as string) || undefined;
        const city = formData.get("address[city]") as string;
        const state = formData.get("address[state]") as string;
        const country = formData.get("address[country]") as string;
        const postalCode = formData.get("address[postalCode]") as string;

        // PPT Deck URL
        const pptDeckUrl = (formData.get("pptDeckUrl") as string) || undefined;

        // Parse sponsorship tiers dynamically
        const tiers: {
            tierType: TierType | "CUSTOM";
            customName?: string;
            askingPrice: number;
            totalSlots: number;
            benefits: string[];
            id?: string;
        }[] = [];

        let index = 0;
        while (formData.get(`tiers[${index}][tierType]`)) {
            const tierTypeRaw = formData.get(`tiers[${index}][tierType]`) as string;
            const askingPriceStr = formData.get(`tiers[${index}][askingPrice]`) as string;
            const totalSlotsStr = formData.get(`tiers[${index}][totalSlots]`) as string;
            const benefitsStr = (formData.get(`tiers[${index}][benefits]`) as string) || "";
            const customName = (formData.get(`tiers[${index}][customName]`) as string) || undefined;
            const tierId = (formData.get(`tiers[${index}][id]`) as string) || undefined;

            // Convert numeric fields
            const askingPrice = Number(askingPriceStr) || 0;
            const totalSlots = Number(totalSlotsStr) || 1;

            // Split benefits into array
            const benefits = benefitsStr
                .split(",")
                .map((b) => b.trim())
                .filter(Boolean);

            // Determine tierType - use as-is for CUSTOM, validate for predefined tiers
            const tierType: TierType | "CUSTOM" = tierTypeRaw === "CUSTOM" ? "CUSTOM" : tierTypeRaw as TierType;

            tiers.push({
                tierType,
                customName,
                askingPrice,
                totalSlots,
                benefits,
                id: tierId,
            });

            index++;
        }

        // Validation
        if (!title || !startDate || !endDate || isNaN(expectedFootfall)) {
            return { error: "Please fill in all required fields." };
        }

        if (new Date(endDate) <= new Date(startDate)) {
            return { error: "End date must be after start date." };
        }

        // Validate tiers
        if (tiers.length === 0) {
            return { error: "Please select at least one sponsorship tier." };
        }

        // Validate required address fields
        if (!addressLine1 || !city || !state || !country || !postalCode) {
            return { error: "Please fill in all required address fields." };
        }

        try {
            await createOrganizerEvent({
                title,
                description,
                category,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                expectedFootfall,
                website,
                logoUrl,
                address: {
                    addressLine1,
                    addressLine2,
                    city,
                    state,
                    country,
                    postalCode,
                },
                contactPhone,
                contactEmail,
                pptDeckUrl,
                tiers: tiers.map((t) => ({
                    tierType: t.tierType,
                    customName: t.customName,
                    askingPrice: t.askingPrice,
                    totalSlots: t.totalSlots,
                    benefits: t.benefits,
                    id: t.id,
                })),
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
