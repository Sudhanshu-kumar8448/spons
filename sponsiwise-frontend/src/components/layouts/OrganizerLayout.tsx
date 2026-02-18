"use client";

import type { AuthUser } from "@/lib/types/roles";
import { UserRole } from "@/lib/types/roles";
import { navigationByRole } from "./shared/navigation";
import Sidebar, { SidebarProvider } from "./shared/Sidebar";
import TopNav from "./shared/TopNav";

interface OrganizerLayoutProps {
  user: AuthUser;
  children: React.ReactNode;
}

export default function OrganizerLayout({ user, children }: OrganizerLayoutProps) {
  const items = navigationByRole[UserRole.ORGANIZER];

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar
          role={UserRole.ORGANIZER}
          items={items}
          accentClass="bg-emerald-500/20 text-emerald-400"
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav user={user} title="Organizer Dashboard" />

          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
