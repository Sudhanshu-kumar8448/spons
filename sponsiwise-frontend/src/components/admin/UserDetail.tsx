import Link from "next/link";
import { getServerUser } from "@/lib/auth";
import { fetchTenantUserById } from "@/lib/admin-api";
import {
  updateUserRoleAction,
  toggleUserStatusAction,
} from "@/app/(authenticated)/dashboard/_admin-actions";
import RoleBadge from "@/components/shared/RoleBadge";
import UserStatusBadge from "@/components/shared/UserStatusBadge";
import RoleAssignmentForm from "@/components/admin/RoleAssignmentForm";
import ToggleStatusButton from "@/components/admin/ToggleStatusButton";

interface UserDetailProps {
  id: string;
}

export default async function UserDetail({ id }: UserDetailProps) {
  const currentUser = await getServerUser();
  let user: Awaited<ReturnType<typeof fetchTenantUserById>> | null = null;
  let error: string | null = null;

  try {
    user = await fetchTenantUserById(id);
  } catch (err) {
    error =
      err instanceof Error ? err.message : "Failed to load user details.";
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/users"
          className="text-sm text-red-600 hover:text-red-800 transition-colors"
        >
          ← Back to users
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">
            {error ?? "User not found."}
          </p>
        </div>
      </div>
    );
  }

  const isSelf = currentUser?.id === user.id;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/dashboard/users"
        className="text-sm text-red-600 hover:text-red-800 transition-colors"
      >
        ← Back to users
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-lg font-semibold text-gray-600">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
        )}
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            {user.name}
            {isSelf && (
              <span className="text-xs font-normal text-gray-400">(you)</span>
            )}
          </h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: User info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile info card */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Profile Information
            </h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.phone || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Company</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.company_name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Role</dt>
                <dd className="mt-1">
                  <RoleBadge role={user.role} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Status</dt>
                <dd className="mt-1">
                  <UserStatusBadge status={user.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Last Login</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Never"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Timeline card */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
              Timeline
            </h3>
            <ul className="mt-4 space-y-3 border-l-2 border-gray-200 pl-4">
              <li>
                <p className="text-xs text-gray-500">Joined</p>
                <p className="text-sm text-gray-700">
                  {new Date(user.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </li>
              <li>
                <p className="text-xs text-gray-500">Last updated</p>
                <p className="text-sm text-gray-700">
                  {new Date(user.updated_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </li>
            </ul>
          </div>
        </div>

        {/* Right sidebar: Actions */}
        <div className="space-y-6">
          {/* Role assignment */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Role Assignment
            </h3>
            <RoleAssignmentForm
              userId={user.id}
              currentUserId={currentUser?.id ?? ""}
              currentRole={user.role}
              serverAction={updateUserRoleAction}
            />
          </div>

          {/* Activate / Deactivate */}
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              Account Status
            </h3>
            <ToggleStatusButton
              userId={user.id}
              currentUserId={currentUser?.id ?? ""}
              currentStatus={user.status as "active" | "inactive"}
              userName={user.name}
              serverAction={toggleUserStatusAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
