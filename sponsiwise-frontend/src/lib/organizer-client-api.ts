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

// ─── Presigned Download URL ────────────────────────────────────────────

export interface PresignedDownloadResponse {
    downloadUrl: string;
    expiresIn: number;
}

export async function generatePresignedDownloadUrl(
    key: string,
): Promise<PresignedDownloadResponse> {
    return apiClient.post<PresignedDownloadResponse>("/upload/presigned-url/download", {
        key,
    });
}

// ─── Delete File from S3/MinIO ─────────────────────────────────────────

export async function deleteUploadedFile(
    key: string,
): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>("/upload/delete", {
        key,
    });
}
