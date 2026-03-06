import { apiClient } from "@/lib/api-client";

// ─── Presigned URL for PPT Deck ────────────────────────────────────────

export interface PresignedUrlResponse {
    uploadUrl: string;
    fileUrl: string;
    key: string;
    expiresIn: number;
}

export async function generatePptPresignedUrl(
    fileName: string,
    fileType: string,
    eventId?: string,
): Promise<PresignedUrlResponse> {
    return apiClient.post<PresignedUrlResponse>("/upload/presigned-url/ppt-deck", {
        fileName,
        fileType,
        eventId,
    });
}
