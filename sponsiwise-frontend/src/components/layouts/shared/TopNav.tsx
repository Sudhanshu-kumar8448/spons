"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ChevronDown, LogOut, Settings } from "lucide-react";
import type { AuthUser } from "@/lib/types/roles";
import { useSidebar } from "./Sidebar";
import NotificationsDropdown from "@/components/shared/NotificationsDropdown";
import { apiClient } from "@/lib/api-client";

interface TopNavProps {
  user: AuthUser | null;
  title?: string;
}

export default function TopNav({ user, title }: TopNavProps) {
  const { setMobileOpen } = useSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await apiClient.post("/auth/logout", {});
    } catch {
      // ignore
    }
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {title && (
          <h1 className="truncate text-lg font-semibold text-white">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Notifications */}
        {user && <NotificationsDropdown />}

        {/* User dropdown */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-sm font-semibold text-white shadow-sm shadow-blue-500/20">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <span className="hidden truncate max-w-[140px] text-sm font-medium text-slate-300 sm:inline">
                {user.email}
              </span>
              <ChevronDown
                className={`hidden sm:block h-4 w-4 text-slate-500 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl border border-slate-700 bg-slate-800 p-1.5 shadow-2xl shadow-black/40">
                <div className="border-b border-slate-700 px-3 py-2.5 mb-1">
                  <p className="text-sm font-medium text-white truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">
                    {user.role.toLowerCase()}
                  </p>
                </div>

                <Link
                  href="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-slate-500">Not signed in</span>
        )}
      </div>
    </header>
  );
}
