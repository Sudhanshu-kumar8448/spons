"use client";

import type { AuthUser } from "@/lib/types/roles";
import { UserRole } from "@/lib/types/roles";
import { navigationByRole } from "./shared/navigation";
import Sidebar, { SidebarProvider } from "./shared/Sidebar";
import TopNav from "./shared/TopNav";

interface ManagerLayoutProps {
  user: AuthUser;
  children: React.ReactNode;
}

export default function ManagerLayout({ user, children }: ManagerLayoutProps) {
  const items = navigationByRole[UserRole.MANAGER];

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar
          role={UserRole.MANAGER}
          items={items}
          accentClass="bg-blue-500/20 text-blue-400"
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <TopNav user={user} title="Manager Console" />

          <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
