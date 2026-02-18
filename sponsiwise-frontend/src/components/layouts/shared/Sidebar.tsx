"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X, LogOut } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { UserRole } from "@/lib/types/roles";
import type { NavItem } from "./navigation";

// ─── Sidebar context for collapse state ────────────────────────────────

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => { },
  mobileOpen: false,
  setMobileOpen: () => { },
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// ─── Dynamic Lucide icon ───────────────────────────────────────────────

function DynamicIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string;
  className?: string;
}) {
  const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComp) return <span className={className}>•</span>;
  return <IconComp className={className} />;
}

// ─── Sidebar ───────────────────────────────────────────────────────────

interface SidebarProps {
  role: UserRole;
  items: NavItem[];
  accentClass?: string;
}

export default function Sidebar({
  role,
  items,
  accentClass = "bg-blue-500/20 text-blue-400",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Even if the API call fails, clear cookies and redirect
    } finally {
      router.push("/login");
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/images/logo-icon.svg"
            alt="SponsiWise"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
          />
          {!collapsed && (
            <span className="text-lg font-bold text-white">
              Sponsi<span className="text-blue-400">Wise</span>
            </span>
          )}
        </Link>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        {/* Close button (mobile only) */}
        <button
          onClick={() => setMobileOpen(false)}
          className="flex lg:hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                group flex items-center gap-3 rounded-xl px-3 py-2.5
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-gradient-to-r from-blue-600/20 to-sky-500/10 text-blue-400 border-l-[3px] border-blue-500 shadow-sm shadow-blue-500/5"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white border-l-[3px] border-transparent"
                }
                ${collapsed ? "justify-center px-2" : ""}
              `}
              title={collapsed ? item.label : undefined}
            >
              <DynamicIcon
                name={item.icon}
                className={`h-5 w-5 shrink-0 transition-colors ${isActive
                  ? "text-blue-400"
                  : "text-slate-500 group-hover:text-slate-300"
                  }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: role badge + logout */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${accentClass}`}
        >
          {!collapsed && role}
          {collapsed && role.charAt(0)}
        </span>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className={`
            flex w-full items-center gap-3 rounded-xl px-3 py-2.5
            text-sm font-medium transition-all duration-200
            text-red-400 hover:bg-red-500/10 hover:text-red-300
            disabled:opacity-50 disabled:cursor-not-allowed
            ${collapsed ? "justify-center px-2" : ""}
          `}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{loggingOut ? "Logging out…" : "Logout"}</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-slate-900 shadow-2xl shadow-black/50 animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`
          hidden lg:flex h-full flex-col border-r border-slate-800 bg-slate-900
          transition-all duration-300
          ${collapsed ? "w-[68px]" : "w-64"}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
