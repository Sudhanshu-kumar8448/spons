import { getServerUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Settings, Shield, User, Key } from "lucide-react";
import ChangePasswordForm from "./ChangePasswordForm";

export const metadata = {
    title: "Settings | Sponsiwise",
    description: "Manage your account settings and security.",
};

export default async function SettingsPage() {
    const user = await getServerUser();
    if (!user) redirect("/login");

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="mt-1 text-sm text-slate-400">
                    Manage your account settings and security.
                </p>
            </div>

            {/* Profile Information */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                        <User className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Profile Information</h2>
                        <p className="text-sm text-slate-400">Your account details are shown below.</p>
                    </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                            Email
                        </label>
                        <p className="mt-1 text-sm font-medium text-white">
                            {user.email}
                        </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                            Role
                        </label>
                        <span className="mt-1 inline-block rounded-full bg-blue-500/10 px-3 py-0.5 text-xs font-semibold text-blue-400">
                            {user.role}
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                            Account Status
                        </label>
                        <span className="mt-1 inline-block rounded-full bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                            Active
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
                        <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">
                            Tenant ID
                        </label>
                        <p className="mt-1 truncate text-sm font-mono text-slate-400">
                            {user.tenantId}
                        </p>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                        <Key className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Change Password</h2>
                        <p className="text-sm text-slate-400">Update your password to keep your account secure.</p>
                    </div>
                </div>

                <div>
                    <ChangePasswordForm />
                </div>
            </div>
        </div>
    );
}
