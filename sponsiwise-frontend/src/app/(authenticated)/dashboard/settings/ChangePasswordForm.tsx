"use client";

import { useState, type FormEvent } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setMessage("");

        if (newPassword.length < 8) {
            setStatus("error");
            setMessage("New password must be at least 8 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatus("error");
            setMessage("New passwords do not match.");
            return;
        }

        if (currentPassword === newPassword) {
            setStatus("error");
            setMessage("New password must be different from current password.");
            return;
        }

        setStatus("loading");

        try {
            const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.message || "Failed to change password");
            }

            setStatus("success");
            setMessage("Password changed successfully!");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setStatus("error");
            setMessage(err instanceof Error ? err.message : "Something went wrong.");
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <div>
                <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-slate-300"
                >
                    Current Password
                </label>
                <input
                    id="currentPassword"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter current password"
                />
            </div>

            <div>
                <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-slate-300"
                >
                    New Password
                </label>
                <input
                    id="newPassword"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Min. 8 characters"
                />
            </div>

            <div>
                <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-slate-300"
                >
                    Confirm New Password
                </label>
                <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Re-enter new password"
                />
            </div>

            {/* Feedback message */}
            {message && (
                <div
                    className={`rounded-xl px-4 py-3 text-sm ${status === "success"
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : "border border-red-500/20 bg-red-500/10 text-red-400"
                        }`}
                >
                    {message}
                </div>
            )}

            <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {status === "loading" ? "Changing…" : "Change Password"}
            </button>
        </form>
    );
}
