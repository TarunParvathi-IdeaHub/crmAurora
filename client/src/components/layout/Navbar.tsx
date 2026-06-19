"use client";

import Avatar from "@/components/common/Avatar";
import { normalizeRole } from "@/lib/utils/role";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, GraduationCap, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useProfile } from "@/providers/ProfileProvider";
import { ROLE_NAMES } from "@/lib/utils/constants";
import { useRef, useState, useEffect } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const roleTitleFallback = "User";

export default function Navbar() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, clearProfile } = useProfile();
  const role = normalizeRole(user?.role);
  const roleTitle = role ? ROLE_NAMES[role] : roleTitleFallback;
  const displayName = profile?.fullName ?? user?.fullName ?? user?.email ?? user?.userId ?? "Guest User";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    // Call the backend to clear the httpOnly cookie. Without this, the cookie
    // persists in the browser even after localStorage is cleared, causing
    // authentication confusion on re-login.
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Backend unreachable — still clear local state so the UI unlocks
    }
    clearProfile();
    localStorage.removeItem("erpUser");
    router.replace("/login");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 glass border-b border-slate-200/70">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">

        {/* ── Brand ──────────────────────────────────────────────────── */}
        <Link href="/dashboard" className="flex items-center gap-3 select-none group">
          <div className="gradient-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition group-hover:opacity-90">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div className="leading-none">
            <p className="text-[15px] font-bold tracking-tight text-slate-900">AU ERP</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">{roleTitle} Portal</p>
          </div>
        </Link>

        {/* ── Right actions ───────────────────────────────────────────── */}
        <div className="flex items-center gap-1">

          {/* Notification bell */}
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
            aria-label="Notifications"
          >
            <Bell size={17} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
          </button>

          {/* Vertical divider */}
          <div className="mx-2 h-5 w-px bg-slate-200" />

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              aria-label="Profile menu"
              aria-expanded={dropdownOpen}
            >
              <Avatar name={displayName} src={profile?.imageUrl ?? null} size="sm" ring />
              <div className="hidden text-left lg:block">
                <p className="text-[13px] font-semibold leading-none text-slate-900">
                  {displayName.split(" ")[0]}
                </p>
                <p className="mt-0.5 text-[11px] leading-none text-slate-400">{roleTitle}</p>
              </div>
              {/* Chevron */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`hidden h-3.5 w-3.5 text-slate-400 transition lg:block ${dropdownOpen ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200/80 bg-white shadow-xl animate-slide-up overflow-hidden">
                {/* Identity */}
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                  <Avatar name={displayName} src={profile?.imageUrl ?? null} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                    <p className="text-[11px] text-slate-400">{roleTitle}</p>
                  </div>
                </div>

                {/* Links */}
                <div className="p-1.5 space-y-0.5">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="nav-item"
                  >
                    <User size={15} className="shrink-0 text-slate-400" />
                    My Profile
                  </Link>
                  {/* Settings — hidden until controller is ready
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="nav-item"
                  >
                    <Settings size={15} className="shrink-0 text-slate-400" />
                    Settings
                  </Link>
                  */}
                </div>

                <div className="border-t border-slate-100 p-1.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="nav-item text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <LogOut size={15} className="shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
