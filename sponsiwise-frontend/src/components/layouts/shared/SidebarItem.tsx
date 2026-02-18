import Link from "next/link";

interface SidebarItemProps {
  label: string;
  href: string;
  icon: string;
  active?: boolean;
}

/**
 * Single sidebar navigation link.
 * Server Component — no "use client" needed.
 */
export default function SidebarItem({
  label,
  href,
  active = false,
}: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
        transition-all duration-200
        ${
          active
            ? "bg-blue-400/10 text-blue-600 font-semibold shadow-sm"
            : "text-slate-600 hover:bg-blue-400/5 hover:text-blue-600"
        }
      `}
    >
      <span className="h-5 w-5 shrink-0 flex items-center justify-center" aria-hidden="true">
        •
      </span>
      {label}
    </Link>
  );
}
