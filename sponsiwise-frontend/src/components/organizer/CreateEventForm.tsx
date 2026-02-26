"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    Calendar,
    MapPin,
    Users,
    Globe,
    Image,
    FileText,
    ArrowLeft,
    Loader2,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Phone,
    Mail,
    Upload,
    X,
    Plus,
    GripVertical,
    Download,
    Trash2,
    RefreshCw,
} from "lucide-react";
import { generatePptPresignedUrl, generatePresignedDownloadUrl, deleteUploadedFile } from "@/lib/organizer-client-api";

interface CreateEventFormProps {
    createAction: (formData: FormData) => Promise<{ error?: string }>;
    initialData?: any;
    isEdit?: boolean;
    isManager?: boolean;
    managerActions?: React.ReactNode;
}

interface TierFormData {
    enabled: boolean;
    tierType: string;
    customName?: string;
    askingPrice: string;
    totalSlots: string;
    benefits: string;
    isLocked?: boolean;
    id?: string;
}

const PREDEFINED_TIERS = [
    {
        value: "TITLE",
        label: "Title Sponsor",
        price: 1000000,
        slots: 1,
        description: "Top-level branding and visibility",
        benefits: "Main stage branding, VIP access, Keynote mention, Logo on all materials"
    },
    {
        value: "PLATINUM",
        label: "Platinum Sponsor",
        price: 750000,
        slots: 1,
        description: "Premium platinum partnership",
        benefits: "Premium booth, Speaking slot, VIP access, Logo on banners"
    },
    {
        value: "PRESENTING",
        label: "Presenting Sponsor",
        price: 500000,
        slots: 1,
        description: "Primary event presentation rights",
        benefits: "Presentation opportunity, Booth prime location, Brand mentions"
    },
    {
        value: "POWERED_BY",
        label: "Powered By",
        price: 250000,
        slots: 1,
        description: "Secondary prominent placement",
        benefits: " booth space, Social media shoutouts, Materials distribution"
    },
    {
        value: "GOLD",
        label: "Gold Tier",
        price: 100000,
        slots: 2,
        description: "Premium sponsorship package",
        benefits: "Standard booth, Networking access, Logo on website"
    },
    {
        value: "SILVER",
        label: "Silver Tier",
        price: 50000,
        slots: 3,
        description: "Standard sponsorship package",
        benefits: "Small booth, Event access, Name in sponsor list"
    },
];

const CUSTOM_TIER = "CUSTOM";







export default function CreateEventForm({
    createAction,
    initialData,
    isEdit = false,
    isManager = false,
    managerActions
}: CreateEventFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // File upload state
    const [pptFile, setPptFile] = useState<File | null>(null);
    const [pptPreview, setPptPreview] = useState<string | null>(initialData?.ppt_deck_url || null);
    const [pptUploading, setPptUploading] = useState(false);
    const [pptUploadedUrl, setPptUploadedUrl] = useState<string | null>(initialData?.ppt_deck_url || null);

    // Contact details
    const [contactPhone, setContactPhone] = useState(initialData?.contact_phone || "");
    const [contactEmail, setContactEmail] = useState(initialData?.contact_email || "");

    // Address fields
    const [addressLine1, setAddressLine1] = useState(initialData?.address?.address_line_1 || "");
    const [addressLine2, setAddressLine2] = useState(initialData?.address?.address_line_2 || "");
    const [city, setCity] = useState(initialData?.address?.city || "");
    const [state, setState] = useState(initialData?.address?.state || "");
    const [country, setCountry] = useState(initialData?.address?.country || "");
    const [postalCode, setPostalCode] = useState(initialData?.address?.postal_code || "");

    const isOrganizerTierEditingDisabled = !isManager && isEdit && (initialData?.status === 'verified' || initialData?.status === 'published');

    // Sponsorship tiers - all unchecked by default
    const [tiers, setTiers] = useState<TierFormData[]>([]);

    // Custom tier
    const [customTiers, setCustomTiers] = useState<TierFormData[]>(() => {
        if (!initialData?.sponsorship_tiers) return [];
        return initialData.sponsorship_tiers
            .filter((t: any) => t.tier_type === CUSTOM_TIER)
            .map((t: any) => ({
                id: t.id,
                enabled: true,
                tierType: CUSTOM_TIER,
                customName: t.name || "",
                askingPrice: t.asking_price?.toString() || "0",
                totalSlots: t.total_slots?.toString() || "1",
                benefits: Array.isArray(t.benefits) ? t.benefits.join(', ') : (t.benefits || ""),
                isLocked: t.is_locked
            }));
    });

    // Predefined tier states - tracks checkbox and input values
    const [predefinedTierStates, setPredefinedTierStates] = useState<Record<string, {
        enabled: boolean;
        askingPrice: string;
        totalSlots: string;
        benefits: string;
    }>>(() => {
        const initial: Record<string, { enabled: boolean; askingPrice: string; totalSlots: string; benefits: string }> = {};
        PREDEFINED_TIERS.forEach((tier) => {
            const existingTier = initialData?.sponsorship_tiers?.find((t: any) => t.tier_type === tier.value);
            initial[tier.value] = {
                enabled: !!existingTier,
                askingPrice: existingTier?.asking_price?.toString() ?? tier.price.toString(),
                totalSlots: existingTier?.total_slots?.toString() ?? tier.slots.toString(),
                benefits: Array.isArray(existingTier?.benefits) 
                    ? existingTier.benefits.join(', ') 
                    : (existingTier?.benefits || tier.benefits)
            };
        });
        return initial;
    });

    function updatePredefinedTier(tierValue: string, field: 'enabled' | 'askingPrice' | 'totalSlots' | 'benefits', value: string | boolean) {
        setPredefinedTierStates(prev => ({
            ...prev,
            [tierValue]: {
                ...prev[tierValue],
                [field]: value
            }
        }));
    }

    function addCustomTier() {
        setCustomTiers([...customTiers, {
            enabled: true,
            tierType: CUSTOM_TIER,
            customName: "",
            askingPrice: "",
            totalSlots: "1",
            benefits: ""
        }]);
    }

    function removeCustomTier(index: number) {
        setCustomTiers(customTiers.filter((_, i) => i !== index));
    }

    function updateCustomTier(index: number, field: keyof TierFormData, value: string) {
        const newTiers = [...customTiers];
        newTiers[index] = { ...newTiers[index], [field]: value };
        setCustomTiers(newTiers);
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            const validTypes = [
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/pdf'
            ];

            if (!validTypes.includes(file.type)) {
                setError('Please upload a valid PowerPoint or PDF file');
                return;
            }

            if (file.size > 50 * 1024 * 1024) {
                setError('File size must be less than 50MB');
                return;
            }

            setPptFile(file);
            setPptPreview(URL.createObjectURL(file));
            setError(null);
        }
    }

    function removeFile() {
        if (pptPreview && !pptPreview.startsWith('http')) {
            URL.revokeObjectURL(pptPreview);
        }
        setPptFile(null);
        setPptPreview(null);
        setPptUploadedUrl(null);
    }

    const [pptDownloading, setPptDownloading] = useState(false);
    const [pptDeleting, setPptDeleting] = useState(false);
    const [showReplaceInput, setShowReplaceInput] = useState(false);

    /** Download the existing PPT via presigned URL */
    async function handlePptDownload() {
        if (!pptUploadedUrl) return;
        try {
            setPptDownloading(true);
            // Extract the S3 key from the public URL
            const urlParts = pptUploadedUrl.split('/');
            // The key is everything after the bucket name in the URL
            const bucketIndex = urlParts.findIndex(p => p === 'sponsiwise');
            const key = bucketIndex >= 0 ? urlParts.slice(bucketIndex + 1).join('/') : pptUploadedUrl;
            const { downloadUrl } = await generatePresignedDownloadUrl(key);
            window.open(downloadUrl, '_blank');
        } catch (err: any) {
            setError(err.message || 'Failed to generate download link');
        } finally {
            setPptDownloading(false);
        }
    }

    /** Delete the existing PPT from S3 */
    async function handlePptDelete() {
        if (!pptUploadedUrl) return;
        if (!confirm('Are you sure you want to delete this PPT file?')) return;
        try {
            setPptDeleting(true);
            const urlParts = pptUploadedUrl.split('/');
            const bucketIndex = urlParts.findIndex(p => p === 'sponsiwise');
            const key = bucketIndex >= 0 ? urlParts.slice(bucketIndex + 1).join('/') : pptUploadedUrl;
            await deleteUploadedFile(key);
            removeFile();
        } catch (err: any) {
            setError(err.message || 'Failed to delete PPT file');
        } finally {
            setPptDeleting(false);
        }
    }

    /** Extract filename from a URL */
    function getFilenameFromUrl(url: string): string {
        try {
            const parts = url.split('/');
            const fileName = parts[parts.length - 1];
            // Remove timestamp prefix if present (e.g., "1234567890-file.pptx" → "file.pptx")
            const match = fileName.match(/^\d+-(.+)$/);
            return match ? match[1] : fileName;
        } catch {
            return 'Presentation file';
        }
    }

    /**
     * Upload PPT file to S3 via presigned URL.
     * Returns the public file URL on success, or null on failure.
     */
    async function uploadPptToS3(file: File): Promise<string | null> {
        try {
            setPptUploading(true);
            setError(null);

            // 1. Request presigned URL from backend
            console.log("[Upload] Requesting presigned URL for:", file.name, "type:", file.type);
            const presigned = await generatePptPresignedUrl(file.name, file.type);
            console.log("[Upload] Got presigned URL:", presigned.uploadUrl.substring(0, 50) + "...");

            // 2. Upload file directly to S3/MinIO using the presigned URL
            console.log("[Upload] Starting upload to S3/MinIO...");
            const uploadResponse = await fetch(presigned.uploadUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            });

            console.log("[Upload] Response status:", uploadResponse.status, uploadResponse.statusText);

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text().catch(() => "No error details");
                console.error("[Upload] Failed with response:", errorText);
                throw new Error(`Upload failed with status ${uploadResponse.status}: ${uploadResponse.statusText}`);
            }

            console.log("[Upload] Success! File URL:", presigned.fileUrl);

            // 3. Return the public file URL
            setPptUploadedUrl(presigned.fileUrl);
            return presigned.fileUrl;
        } catch (err: any) {
            console.error("[Upload] PPT upload failed:", err);
            setError(err.message || "Failed to upload PPT deck. Please try again.");
            return null;
        } finally {
            setPptUploading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const form = e.currentTarget;
        const formData = new FormData(form);

        // Add contact details
        formData.append("contactPhone", contactPhone);
        formData.append("contactEmail", contactEmail);

        // Add address fields
        formData.append("address[addressLine1]", addressLine1);
        formData.append("address[addressLine2]", addressLine2);
        formData.append("address[city]", city);
        formData.append("address[state]", state);
        formData.append("address[country]", country);
        formData.append("address[postalCode]", postalCode);

        // Upload PPT to S3 via presigned URL if file is selected
        if (pptFile) {
            let fileUrl = pptUploadedUrl;
            if (!fileUrl) {
                fileUrl = await uploadPptToS3(pptFile);
                if (!fileUrl) {
                    return; // Upload failed, error already set
                }
            }
            formData.append("pptDeckUrl", fileUrl);
        }

        // Add selected predefined tiers (using React state)
        let tierIndex = 0;
        PREDEFINED_TIERS.forEach((predefinedTier) => {
            const tierState = predefinedTierStates[predefinedTier.value];
            if (tierState?.enabled) {
                const existingTier = initialData?.sponsorship_tiers?.find((t: any) => t.tier_type === predefinedTier.value);
                formData.append(`tiers[${tierIndex}][tierType]`, predefinedTier.value);
                formData.append(`tiers[${tierIndex}][askingPrice]`, tierState.askingPrice || predefinedTier.price.toString());
                formData.append(`tiers[${tierIndex}][totalSlots]`, tierState.totalSlots || predefinedTier.slots.toString());
                formData.append(`tiers[${tierIndex}][benefits]`, tierState.benefits || predefinedTier.benefits);
                if (existingTier?.id) {
                    formData.append(`tiers[${tierIndex}][id]`, existingTier.id);
                }
                tierIndex++;
            }
        });

        // Add custom tiers
        customTiers.forEach((customTier: any) => {
            if (customTier.enabled && customTier.customName) {
                formData.append(`tiers[${tierIndex}][tierType]`, "CUSTOM");
                formData.append(`tiers[${tierIndex}][customName]`, customTier.customName);
                formData.append(`tiers[${tierIndex}][askingPrice]`, customTier.askingPrice || "0");
                formData.append(`tiers[${tierIndex}][totalSlots]`, customTier.totalSlots || "1");
                formData.append(`tiers[${tierIndex}][benefits]`, customTier.benefits);
                if (customTier.id) {
                    formData.append(`tiers[${tierIndex}][id]`, customTier.id);
                }
                tierIndex++;
            }
        });

        if (tierIndex === 0) {
            setError('Please select at least one sponsorship tier');
            return;
        }

        startTransition(async () => {
            const result = await createAction(formData);
            if (result?.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/dashboard/events");
                    router.refresh();
                }, 1500);
            }
        });
    }







    

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 transition-all hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Create New Event</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Fill in the details below to create your event. It will be reviewed
                        by a manager before being published.
                    </p>
                </div>
            </div>

            {/* Status messages */}
            {error && (
                <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-300">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                    <p className="text-sm text-emerald-300">
                        Event created successfully! Redirecting to your events…
                    </p>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-blue-500/20">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Basic Information
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Event Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                defaultValue={initialData?.title}
                                required
                                maxLength={255}
                                placeholder="e.g. Tech Innovation Summit 2026"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                defaultValue={initialData?.description}
                                rows={4}
                                placeholder="Tell sponsors what your event is about, who attends, what makes it special…"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Category
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="category"
                                    name="category"
                                    type="text"
                                    defaultValue={initialData?.category}
                                    maxLength={100}
                                    placeholder="e.g. Technology, Sports, Music, Conference"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* PPT Deck Upload */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-300">
                                PPT Deck (Optional)
                            </label>
                            <div className="rounded-xl border-2 border-dashed border-slate-700 bg-slate-800/50 p-4">
                                {/* Existing PPT in edit mode — show Download/Replace/Delete */}
                                {isEdit && pptUploadedUrl && !pptFile && !showReplaceInput ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between rounded-lg bg-slate-700/50 p-3">
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-8 w-8 text-blue-400" />
                                                <div>
                                                    <p className="text-sm font-medium text-white">
                                                        {getFilenameFromUrl(pptUploadedUrl)}
                                                    </p>
                                                    <p className="text-xs text-slate-400">✅ Uploaded PPT file</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={handlePptDownload}
                                                disabled={pptDownloading}
                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                            >
                                                <Download className="h-4 w-4" />
                                                {pptDownloading ? 'Opening…' : 'Download'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowReplaceInput(true)}
                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                                Replace
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handlePptDelete}
                                                disabled={pptDeleting}
                                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {pptDeleting ? 'Deleting…' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                ) : pptPreview || pptFile ? (
                                    <div className="flex items-center justify-between rounded-lg bg-slate-700/50 p-3">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-8 w-8 text-blue-400" />
                                            <div>
                                                <p className="text-sm font-medium text-white">{pptFile?.name || getFilenameFromUrl(pptPreview || '')}</p>
                                                <p className="text-xs text-slate-400">
                                                    {pptFile ? `${Math.round(pptFile.size / 1024)} KB` : ''}
                                                    {pptUploading && " • Uploading…"}
                                                    {pptUploadedUrl && " • ✅ Uploaded"}
                                                </p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => { removeFile(); setShowReplaceInput(false); }} className="rounded-lg p-1 text-slate-400 hover:bg-slate-600 hover:text-white">
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex cursor-pointer flex-col items-center justify-center py-6">
                                        <Upload className="mb-2 h-10 w-10 text-slate-500" />
                                        <span className="text-sm text-slate-400">Click to upload PPT or PDF</span>
                                        <span className="mt-1 text-xs text-slate-500">Max 50MB • Uploaded securely via presigned URL</span>
                                        <input type="file" accept=".ppt,.pptx,.pdf" onChange={handleFileChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organizer Contact Details */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/20">
                            <Phone className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Organizer Contact Details
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="contactPhone" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Mobile Number
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="contactPhone"
                                    type="tel"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    maxLength={50}
                                    placeholder="+1 234 567 8900"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="contactEmail" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="contactEmail"
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    maxLength={255}
                                    placeholder="contact@yourevent.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/20">
                            <MapPin className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Event Location
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="addressLine1" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Address Line 1 <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="addressLine1"
                                type="text"
                                value={addressLine1}
                                onChange={(e) => setAddressLine1(e.target.value)}
                                required
                                maxLength={255}
                                placeholder="Street address"
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="addressLine2" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Address Line 2
                            </label>
                            <input
                                id="addressLine2"
                                type="text"
                                value={addressLine2}
                                onChange={(e) => setAddressLine2(e.target.value)}
                                maxLength={255}
                                placeholder="Apartment, suite, etc."
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-slate-300">
                                    City <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="city"
                                    type="text"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    required
                                    maxLength={100}
                                    placeholder="City"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="state" className="mb-1.5 block text-sm font-medium text-slate-300">
                                    State/Province <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="state"
                                    type="text"
                                    value={state}
                                    onChange={(e) => setState(e.target.value)}
                                    required
                                    maxLength={100}
                                    placeholder="State"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-slate-300">
                                    Country <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="country"
                                    type="text"
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    required
                                    maxLength={100}
                                    placeholder="Country"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label htmlFor="postalCode" className="mb-1.5 block text-sm font-medium text-slate-300">
                                    Postal Code <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="postalCode"
                                    type="text"
                                    value={postalCode}
                                    onChange={(e) => setPostalCode(e.target.value)}
                                    required
                                    maxLength={20}
                                    placeholder="Postal Code"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Date & Attendance */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 shadow-lg shadow-purple-500/20">
                            <Calendar className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Date & Attendance
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <label htmlFor="startDate" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Start Date <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="startDate"
                                    name="startDate"
                                    type="date"
                                    defaultValue={initialData?.start_date?.substring(0, 10)}
                                    required
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="endDate" className="mb-1.5 block text-sm font-medium text-slate-300">
                                End Date <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="endDate"
                                    name="endDate"
                                    type="date"
                                    defaultValue={initialData?.end_date?.substring(0, 10)}
                                    required
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="expectedFootfall" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Expected Footfall <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="expectedFootfall"
                                    name="expectedFootfall"
                                    type="number"
                                    defaultValue={initialData?.expected_footfall}
                                    required
                                    min={0}
                                    placeholder="e.g. 5000"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sponsorship Tiers */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/20">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">
                            Sponsorship Availability
                        </h2>
                    </div>

                    <p className="mb-4 text-sm text-slate-400">
                        Select the sponsorship tiers you want to offer for this event. Check the tiers you want to include and set the price and available slots.
                    </p>

                    <div className="space-y-3">
                        {PREDEFINED_TIERS.map((tier) => {
                            const existingTier = initialData?.sponsorship_tiers?.find((t: any) => t.tier_type === tier.value);
                            const isLocked = !isManager && existingTier?.is_locked;
                            const isTierDisabled = isOrganizerTierEditingDisabled || isLocked;
                            const tierState = predefinedTierStates[tier.value];
                            const isEnabled = tierState?.enabled ?? false;

                            return (
                                <div key={tier.value} className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
                                    {/* Tier Header - Always Visible */}
                                    <div className="flex items-start gap-4 p-4">
                                        <div className="flex items-center pt-1">
                                            <input
                                                type="checkbox"
                                                id={`tier_${tier.value}`}
                                                checked={isEnabled}
                                                onChange={(e) => updatePredefinedTier(tier.value, 'enabled', e.target.checked)}
                                                disabled={isTierDisabled}
                                                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor={`tier_${tier.value}`} className="block cursor-pointer">
                                                <span className="text-base font-medium text-white">{tier.label}</span>
                                                {existingTier?.is_locked && <span className="ml-2 text-xs text-amber-500 font-semibold">(Locked)</span>}
                                                <span className="ml-2 text-xs text-slate-500">- {tier.description}</span>
                                            </label>
                                            <p className="mt-1 text-xs text-blue-400">{tier.benefits}</p>
                                        </div>
                                    </div>

                                    {/* Expanded Input Section - Only Visible When Checked */}
                                    {isEnabled && (
                                        <div className="border-t border-slate-700 bg-slate-800/30 p-4 pt-4">
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                                        Asking Price ($)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={tierState?.askingPrice ?? tier.price.toString()}
                                                        onChange={(e) => updatePredefinedTier(tier.value, 'askingPrice', e.target.value)}
                                                        disabled={isTierDisabled}
                                                        min={0}
                                                        step={0.01}
                                                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                                        Total Slots {existingTier ? `(Sold: ${existingTier.sold_slots})` : ''}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={tierState?.totalSlots ?? tier.slots.toString()}
                                                        onChange={(e) => updatePredefinedTier(tier.value, 'totalSlots', e.target.value)}
                                                        disabled={isTierDisabled}
                                                        min={existingTier?.sold_slots || 1}
                                                        max={100}
                                                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label className="mb-1 block text-xs font-medium text-slate-400">
                                                    Benefits (comma separated)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={tierState?.benefits ?? tier.benefits}
                                                    onChange={(e) => updatePredefinedTier(tier.value, 'benefits', e.target.value)}
                                                    disabled={isTierDisabled}
                                                    placeholder="e.g. Booth, Logo, Social mentions"
                                                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Custom Tiers */}
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={addCustomTier}
                            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-600 px-4 py-2 text-sm text-slate-400 hover:border-slate-500 hover:text-white"
                        >
                            <Plus className="h-4 w-4" />
                            Add Custom Sponsorship Tier
                        </button>

                        {customTiers.map((tier, index) => {
                            const isLocked = !isManager && tier.isLocked;
                            const isTierDisabled = isOrganizerTierEditingDisabled || isLocked;

                            return (
                                <div key={index} className="mt-4 rounded-xl border border-slate-600 bg-slate-800/50 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <label className="mb-1 block text-sm font-medium text-slate-300">
                                                    Custom Tier Name <span className="text-red-400">*</span>
                                                    {tier.isLocked && <span className="ml-2 text-xs text-amber-500 font-semibold">(Locked)</span>}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={tier.customName}
                                                    onChange={(e) => updateCustomTier(index, 'customName', e.target.value)}
                                                    disabled={isTierDisabled}
                                                    placeholder="e.g. Bronze, Media Partner, etc."
                                                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                                                />
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                                        Asking Price ($)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={tier.askingPrice}
                                                        onChange={(e) => updateCustomTier(index, 'askingPrice', e.target.value)}
                                                        disabled={isTierDisabled}
                                                        min={0}
                                                        placeholder="e.g. 25000"
                                                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs font-medium text-slate-400">
                                                        Total Slots {tier.id && initialData ? `(Sold: ${initialData.sponsorship_tiers?.find((t: any) => t.id === tier.id)?.sold_slots || 0})` : ''}
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={tier.totalSlots}
                                                        onChange={(e) => updateCustomTier(index, 'totalSlots', e.target.value)}
                                                        disabled={isTierDisabled}
                                                        min={tier.id && initialData ? (initialData.sponsorship_tiers?.find((t: any) => t.id === tier.id)?.sold_slots || 1) : 1}
                                                        max={100}
                                                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-medium text-slate-400">
                                                    Benefits (comma separated)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={tier.benefits}
                                                    onChange={(e) => updateCustomTier(index, 'benefits', e.target.value)}
                                                    disabled={isTierDisabled}
                                                    placeholder="e.g. Booth, Logo, Social mentions"
                                                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                        {!isTierDisabled && (
                                            <button
                                                type="button"
                                                onClick={() => removeCustomTier(index)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Links */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <div className="mb-5 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 shadow-lg shadow-sky-500/20">
                            <Globe className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Links</h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="website" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Website
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="website"
                                    name="website"
                                    type="url"
                                    maxLength={500}
                                    placeholder="https://your-event.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="logoUrl" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Logo URL
                            </label>
                            <div className="relative">
                                <Image className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="logoUrl"
                                    name="logoUrl"
                                    type="url"
                                    maxLength={500}
                                    placeholder="https://example.com/logo.png"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info notice */}
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
                    <div>
                        <p className="text-sm font-medium text-amber-300">Review Required</p>
                        <p className="mt-0.5 text-xs text-amber-400/80">
                            Your event will be submitted for manager review. Once approved, it will be visible to sponsors.
                        </p>

                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center gap-3">
                    <div className="flex gap-2">
                        {managerActions && managerActions}
                    </div>
                    <div className="flex justify-end gap-3 items-center">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || success}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:pointer-events-none"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {isEdit ? "Updating…" : "Creating…"}
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    {isEdit ? "Updated!" : "Created!"}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    {isEdit ? "Update Event" : "Create Event"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
