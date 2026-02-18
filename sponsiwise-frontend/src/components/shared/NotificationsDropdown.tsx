"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { Notification } from "@/lib/types/notifications";

/**
 * NotificationsDropdown — bell icon with unread count badge and dropdown.
 * Fetches notifications on open, marks as read on click.
 */
export default function NotificationsDropdown() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Fetch unread count on mount
    useEffect(() => {
        async function fetchCount() {
            try {
                const res = await apiClient.get<{ data: Notification[]; total: number }>(
                    "/notifications?pageSize=5&read=false",
                );
                setUnreadCount(res.total);
            } catch {
                // silently fail
            }
        }
        fetchCount();
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get<{ data: Notification[]; total: number }>(
                "/notifications?pageSize=5",
            );
            setNotifications(res.data);
            setUnreadCount(res.data.filter((n) => !n.read).length);
        } catch {
            // silently fail
        } finally {
            setLoading(false);
        }
    }, []);

    function handleToggle() {
        const next = !open;
        setOpen(next);
        if (next) fetchNotifications();
    }

    function severityColor(severity: Notification["severity"]) {
        switch (severity) {
            case "SUCCESS":
                return "text-emerald-400";
            case "WARNING":
                return "text-amber-400";
            case "ERROR":
                return "text-red-400";
            default:
                return "text-blue-400";
        }
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleToggle}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-80 origin-top-right rounded-xl border border-slate-700 bg-slate-800 shadow-2xl shadow-black/40">
                    <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
                        <h3 className="text-sm font-semibold text-white">Notifications</h3>
                        <Link
                            href="/dashboard/notifications"
                            onClick={() => setOpen(false)}
                            className="text-xs font-medium text-blue-400 transition-colors hover:text-sky-300"
                        >
                            View all
                        </Link>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                No notifications
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <Link
                                    key={n.id}
                                    href={n.link || "/dashboard/notifications"}
                                    onClick={() => setOpen(false)}
                                    className={`block border-b border-slate-700/50 px-4 py-3 transition-colors hover:bg-slate-700/50 last:border-b-0 ${!n.read ? "bg-slate-700/20" : ""
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.read && (
                                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={`truncate text-sm font-medium ${!n.read ? "text-white" : "text-slate-300"
                                                    }`}
                                            >
                                                {n.title}
                                            </p>
                                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                                                {n.message}
                                            </p>
                                            <p
                                                className={`mt-1 text-[10px] font-medium uppercase tracking-wide ${severityColor(
                                                    n.severity,
                                                )}`}
                                            >
                                                {new Date(n.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
