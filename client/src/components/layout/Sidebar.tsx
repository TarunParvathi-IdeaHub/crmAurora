"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { modulesByRole } from "@/lib/sidebar";
import { useRole } from "@/lib/hooks/useRole";
import {
  BookOpen,
  Users,
  UserCog,
  Wallet,
  Building2,
  GraduationCap,
  LayoutDashboard,
  Settings,
  type LucideIcon,
} from "lucide-react";

const domainOrder = [
  "academic", "crm", "faculty", "finance", "management", "student",
] as const;
type Domain = (typeof domainOrder)[number];

const domainMeta: Record<Domain, { label: string; icon: LucideIcon; iconClass: string }> = {
  academic:   { label: "Academic",    icon: BookOpen,      iconClass: "text-blue-500"   },
  crm:        { label: "Admissions",  icon: Users,         iconClass: "text-blue-500"   },
  faculty:    { label: "Faculty",     icon: UserCog,       iconClass: "text-blue-400"   },
  finance:    { label: "Finance",     icon: Wallet,        iconClass: "text-blue-500"   },
  management: { label: "Management",  icon: Building2,     iconClass: "text-slate-400"  },
  student:    { label: "Student",     icon: GraduationCap, iconClass: "text-blue-400"   },
};

export default function Sidebar() {
  const pathname = usePathname();
  const role = useRole();
  const modules = role ? (modulesByRole[role] ?? []) : [];

  const grouped = domainOrder
    .map((domain) => ({
      domain,
      items: modules.filter((m) => m.domain === domain),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200/80 bg-white lg:flex">

      {/* Dashboard shortcut */}
      <div className="px-3 pt-5 pb-2">
        <Link
          href="/dashboard"
          className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}
        >
          <LayoutDashboard
            size={15}
            className={`shrink-0 ${pathname === "/dashboard" ? "text-blue-600" : "text-slate-400"}`}
          />
          Dashboard
        </Link>
      </div>

      {/* Domain sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {grouped.map(({ domain, items }) => {
          const meta = domainMeta[domain];
          const DomainIcon = meta.icon;
          return (
            <div key={domain}>
              {/* Section header */}
              <div className="mb-1 flex items-center gap-1.5 px-2 py-0.5">
                <DomainIcon size={11} className={`shrink-0 ${meta.iconClass}`} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {meta.label}
                </span>
              </div>

              <ul className="space-y-0.5">
                {items.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.path}
                        className={`nav-item ${isActive ? "active" : ""}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${
                            isActive ? "bg-blue-500" : "bg-slate-300"
                          }`}
                        />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Settings — hidden for now
      <div className="border-t border-slate-100 px-3 py-3">
        <Link
          href="/settings"
          className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
        >
          <Settings
            size={15}
            className={`shrink-0 ${pathname === "/settings" ? "text-blue-600" : "text-slate-400"}`}
          />
          Settings
        </Link>
      </div>
      */}
    </aside>
  );
}
