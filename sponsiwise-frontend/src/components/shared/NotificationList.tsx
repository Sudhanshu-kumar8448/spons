"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/types/notifications";
import { apiClient } from "@/lib/api-client";

interface NotificationListProps {
    initialNotifications: Notification[];
    total: number;
    page: number;
    pageSize: number;
}

/**
 * Client-side notification list with mark-as-read capability.
 */
export default function NotificationList({
    initialNotifications,
    total,
    page,
    pageSize,
}: NotificationListProps) {
    const [notifications, setNotifications] =
        useState<Notification[]>(initialNotifications);

    async function handleMarkRead(id: string) {
        try {
            await apiClient.patch(`/notifications/${id}/read`, {});
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
            );
        } catch {
            // silently fail
        }
    }

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-4">
            <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900">
                {notifications.map((n) => (
                    <div
                        key={n.id}
                        className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.read ? "bg-slate-800/30" : ""
                            }`}
                    >
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                            <Bell className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p
                                className={`text-sm font-medium ${!n.read ? "text-white" : "text-slate-300"
                                    }`}
                            >
                                {n.title}
                            </p>
                            <p className="mt-0.5 text-sm text-slate-400">{n.message}</p>
                            <p className="mt-1 text-xs text-slate-500">
                                {new Date(n.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                        {!n.read && (
                            <button
                                onClick={() => handleMarkRead(n.id)}
                                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/10"
                            >
                                Mark read
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {page > 1 && (
                        <Link
                            href={`/dashboard/notifications?page=${page - 1}`}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800"
                        >
                            Previous
                        </Link>
                    )}
                    <span className="text-sm text-slate-500">
                        Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                        <Link
                            href={`/dashboard/notifications?page=${page + 1}`}
                            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800"
                        >
                            Next
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
}
