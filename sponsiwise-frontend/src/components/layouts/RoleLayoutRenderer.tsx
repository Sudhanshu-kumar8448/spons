import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/types/roles";
import { UserRole } from "@/lib/types/roles";
import AdminLayout from "./AdminLayout";
import ManagerLayout from "./ManagerLayout";
import OrganizerLayout from "./OrganizerLayout";
import SponsorLayout from "./SponsorLayout";

interface RoleLayoutRendererProps {
  user: AuthUser;
  children: React.ReactNode;
}

/**
 * Server Component that maps a user's role to the correct layout.
 *
 * Called from `(authenticated)/layout.tsx` after the user has been fetched
 * server-side.  No client-side role checks happen — this is purely
 * server-rendered.
 */
export default function RoleLayoutRenderer({
  user,
  children,
}: RoleLayoutRendererProps) {
  switch (user.role) {
    case UserRole.USER:
      // USER role hasn't completed onboarding — redirect
      redirect("/onboarding");
      return null; // unreachable

    case UserRole.ADMIN:
      return <AdminLayout user={user}>{children}</AdminLayout>;

    case UserRole.MANAGER:
      return <ManagerLayout user={user}>{children}</ManagerLayout>;

    case UserRole.ORGANIZER:
      return <OrganizerLayout user={user}>{children}</OrganizerLayout>;

    case UserRole.SPONSOR:
      return <SponsorLayout user={user}>{children}</SponsorLayout>;

    default:
      // Fallback — should never happen if middleware is configured correctly.
      // Renders a minimal wrapper so the page is still usable.
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-center animate-fade-in">
            <p className="text-sm text-slate-500">
              Unknown role: <strong className="text-blue-400">{user.role}</strong>
            </p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      );
  }
}
