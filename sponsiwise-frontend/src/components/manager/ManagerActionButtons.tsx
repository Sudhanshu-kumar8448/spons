"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ManagerActionButtonsProps {
    onVerify: () => Promise<void>;
    onReject: () => Promise<void>;
}

export default function ManagerActionButtons({ onVerify, onReject }: ManagerActionButtonsProps) {
    const router = useRouter();

    const handleVerify = async () => {
        if (!confirm("Are you sure you want to verify and publish this event?")) return;
        try {
            await onVerify();
        } catch (error) {
            console.error("Failed to verify:", error);
            alert("Failed to verify event. Please try again.");
        }
    };

    const handleReject = async () => {
        if (!confirm("Are you sure you want to reject this event?")) return;
        try {
            await onReject();
        } catch (error) {
            console.error("Failed to reject:", error);
            alert("Failed to reject event. Please try again.");
        }
    };

    return (
        <div className="flex gap-2">
            <button
                type="button"
                onClick={handleVerify}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-green-600 px-4 py-2 text-sm font-semibold text-green-600 hover:bg-green-50 transition-colors"
            >
                <CheckCircle2 className="h-4 w-4" />
                Verify & Publish
            </button>
            <button
                type="button"
                onClick={handleReject}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-red-600 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
                <XCircle className="h-4 w-4" />
                Reject
            </button>
        </div>
    );
}

