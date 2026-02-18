import Link from "next/link";
import { fetchTenantUsers } from "@/lib/admin-api";
import { normalizeError } from "@/lib/errors";
import {
  SearchBar,
  FilterTabs,
  ErrorState,
  EmptyState,
  DataTable,
  Pagination,
  RoleBadge,
  UserStatusBadge,
} from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";

const PAGE_SIZE = 15;

const ROLE_TABS = [
  { value: "", label: "All" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "MANAGER", label: "MANAGER" },
  { value: "ORGANIZER", label: "ORGANIZER" },
  { value: "SPONSOR", label: "SPONSOR" },
];

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "active", label: "active" },
  { value: "inactive", label: "inactive" },
];

interface UserListProps {
  searchParams: {
    page?: string;
    role?: string;
    status?: string;
    search?: string;
  };
}

export default async function UserList({ searchParams }: UserListProps) {
  const page = Number(searchParams.page) || 1;
  const role = searchParams.role ?? "";
  const status = searchParams.status ?? "";
  const search = searchParams.search;

  let users: Awaited<ReturnType<typeof fetchTenantUsers>>["data"] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetchTenantUsers({
      page,
      page_size: PAGE_SIZE,
      role: role && role !== "All" ? role : undefined,
      status: status && status !== "All" ? status : undefined,
      search: search || undefined,
    });
    users = res.data;
    total = res.total;
  } catch (err) {
    error = normalizeError(err, "Failed to load users.");
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build link helper
  function buildHref(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { role, status, search, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    return `/dashboard/users${qs ? `?${qs}` : ""}`;
  }

  // Column definitions
  type User = (typeof users)[number];

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <Link
          href={`/dashboard/users/${u.id}`}
          className="flex items-center gap-3"
        >
          {u.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={u.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
              {u.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 hover:text-red-600 transition-colors">
              {u.name}
            </p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <UserStatusBadge status={u.status} />,
    },
    {
      key: "last_login_at",
      header: "Last Login",
      hideOnMobile: true,
      render: (u) => (
        <span className="text-sm text-gray-500">
          {u.last_login_at
            ? new Date(u.last_login_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Never"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Joined",
      hideOnMobile: true,
      render: (u) => (
        <span className="text-sm text-gray-500">
          {new Date(u.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage users in your tenant&nbsp;·&nbsp;{total} user
          {total !== 1 && "s"}
        </p>
      </div>

      {/* Search */}
      <SearchBar
        defaultValue={search}
        placeholder="Search by name or email…"
        color="red"
        hiddenFields={{
          role: role || undefined,
          status: status || undefined,
        }}
      />

      {/* Role + Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        <FilterTabs
          tabs={ROLE_TABS}
          activeValue={role}
          buildHref={(v) => buildHref({ role: v || undefined, page: undefined })}
          activeColor="bg-red-600"
        />
        <span className="mx-1 self-center text-gray-300">|</span>
        <FilterTabs
          tabs={STATUS_TABS}
          activeValue={status}
          buildHref={(v) => buildHref({ status: v || undefined, page: undefined })}
          activeColor="bg-red-600"
        />
      </div>

      {/* Error */}
      {error && <ErrorState message={error} />}

      {/* Empty */}
      {!error && users.length === 0 && (
        <EmptyState
          icon="👤"
          heading="No users found"
          description="No users found matching your filters."
        />
      )}

      {/* Table */}
      {!error && users.length > 0 && (
        <DataTable columns={columns} data={users} rowKey={(u) => u.id} />
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        buildHref={(p) => buildHref({ page: String(p) })}
        showPageLabel
      />
    </div>
  );
}
