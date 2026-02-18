"use client";

import type { AuthUser } from "@/lib/types/roles";
import { UserRole } from "@/lib/types/roles";
import { navigationByRole } from "./shared/navigation";
import Sidebar, { SidebarProvider } from "./shared/Sidebar";
import TopNav from "./shared/TopNav";

interface SponsorLayoutProps {
  user: AuthUser;
  children: React.ReactNode;
}

export default function SponsorLayout({ user, children }: SponsorLayoutProps) {
  const items = navigationByRole[UserRole.SPONSOR];

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar
          role={UserRole.SPONSOR}
          items={items}
          accentClass="bg-violet-500/20 text-violet-400"
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav user={user} title="Sponsor Dashboard" />

          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
