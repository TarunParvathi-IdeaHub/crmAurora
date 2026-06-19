"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/hooks/useRole";
import { resolveMenu } from "@/lib/sidebar";

type ModuleSidebarProps = {
  isExpanded: boolean;
};

export default function ModuleSidebar({ isExpanded }: ModuleSidebarProps) {
  const pathname = usePathname();
  const role = useRole();
  const menuItems = resolveMenu(pathname, role);

  return (
    <aside
      className={`fixed top-16 left-0 z-20 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-slate-200/80 bg-white transition-[width] duration-300 ease-in-out lg:flex ${
        isExpanded ? "w-56" : "w-14"
      }`}
    >
      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.path ||
            (item.path !== "/dashboard" && pathname.startsWith(item.path));

          return (
            <Link
              key={item.id}
              href={item.path}
              title={!isExpanded ? item.label : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {/* Icon container — always visible */}
              <span className="shrink-0 flex h-4.5 w-4.5 items-center justify-center">
                <Icon size={17} />
              </span>

              {/* Label — only when expanded */}
              <span
                className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out ${
                  isExpanded ? "max-w-35 opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Expand indicator strip at bottom */}
      <div className={`border-t border-slate-100 px-2 py-3 ${isExpanded ? "" : "flex justify-center"}`}>
        {isExpanded ? (
          <p className="px-3 text-[10px] font-medium uppercase tracking-widest text-slate-300">
            Navigation
          </p>
        ) : (
          <span className="h-1 w-4 rounded-full bg-slate-200" />
        )}
      </div>
    </aside>
  );
}
