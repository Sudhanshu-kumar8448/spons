import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth";
import { UserRole } from "@/lib/types/roles";
import { TierType } from "@/lib/types/organizer";
import { fetchVerifiableEventById, updateEvent as updateManagerEvent } from "@/lib/manager-api";
import { fetchOrganizerEventById, updateOrganizerEvent } from "@/lib/organizer-api";
import CreateEventForm from "@/components/organizer/CreateEventForm";
import ManagerActionButtons from "@/components/manager/ManagerActionButtons";
import Link from "next/link";

interface EditEventPageProps {
    params: Promise<{ id: string }>;
}

function parseFormDataToPayload(formData: FormData) {
    const payload: any = {
        title: formData.get("title") as string || undefined,
        description: formData.get("description") as string || undefined,
        category: formData.get("category") as string || undefined,
        startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string).toISOString() : undefined,
        endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string).toISOString() : undefined,
        expectedFootfall: formData.get("expectedFootfall") ? Number(formData.get("expectedFootfall")) : undefined,
        website: formData.get("website") as string || undefined,
        logoUrl: formData.get("logoUrl") as string || undefined,
        contactPhone: formData.get("contactPhone") as string || undefined,
        contactEmail: formData.get("contactEmail") as string || undefined,
        pptDeckUrl: formData.get("pptDeckUrl") as string || undefined,
    };

    // Address fields (nested format)
    const addressLine1 = formData.get("address[addressLine1]") as string;
    const city = formData.get("address[city]") as string;

    if (addressLine1 && city) {
        payload.address = {
            address_line_1: addressLine1,
            address_line_2: formData.get("address[addressLine2]") as string || undefined,
            city: city,
            state: formData.get("address[state]") as string || undefined,
            country: formData.get("address[country]") as string || undefined,
            postal_code: formData.get("address[postalCode]") as string || undefined,
        };
    }

    // Parse sponsorship tiers dynamically using while loop
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

    if (tiers.length > 0) {
        payload.sponsorshipTiers = tiers.map((t) => ({
            tierType: t.tierType,
            customName: t.customName,
            askingPrice: t.askingPrice,
            totalSlots: t.totalSlots,
            benefits: t.benefits,
            id: t.id,
        }));
    }

    // Remove undefined fully empty fields to not override
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    return payload;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
    const { id } = await params;
    const user = await getServerUser();

    if (!user || user.role === UserRole.SPONSOR) {
        notFound();
    }

    const isManager = user.role === UserRole.MANAGER;
    let eventData: any = null;

    try {
        if (isManager) {
            eventData = await fetchVerifiableEventById(id);
        } else {
            eventData = await fetchOrganizerEventById(id);
        }
    } catch (error) {
        console.error("Failed to fetch event for edit", error);
        notFound();
    }

    async function handleUpdate(formData: FormData): Promise<{ error?: string }> {
        "use server";
        const payload = parseFormDataToPayload(formData);
        try {
            if (isManager) {
                await updateManagerEvent(id, payload);
            } else {
                await updateOrganizerEvent(id, payload);
            }
            revalidatePath(`/dashboard/events/${id}`);
            revalidatePath(`/dashboard/events`);
            return {};
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update event";
            return { error: message };
        }
    }

    // Server actions for manager verify/reject - passed as async functions to Client Component
    const handleVerify = async () => {
        "use server";
        try {
            await updateManagerEvent(id, { status: "PUBLISHED", verificationStatus: "VERIFIED" });
            revalidatePath(`/dashboard/events/${id}`);
            revalidatePath(`/dashboard/events`);
        } catch (e: any) {
            console.error("Failed verify", e.message);
            throw e;
        }
        redirect(`/dashboard/events/${id}`);
    };

    const handleReject = async () => {
        "use server";
        try {
            await updateManagerEvent(id, { status: "CANCELLED", verificationStatus: "REJECTED" });
            revalidatePath(`/dashboard/events/${id}`);
            revalidatePath(`/dashboard/events`);
        } catch (e: any) {
            console.error("Failed reject", e.message);
            throw e;
        }
        redirect(`/dashboard/events/${id}`);
    };

    const managerActions = isManager ? (
        <ManagerActionButtons onVerify={handleVerify} onReject={handleReject} />
    ) : null;

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Edit Event</h1>
                <Link
                    href={`/dashboard/events/${id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                    Cancel
                </Link>
            </div>

            <CreateEventForm
                createAction={handleUpdate}
                initialData={eventData}
                isEdit={true}
                isManager={isManager}
                managerActions={managerActions}
            />
        </div>
    );
}
