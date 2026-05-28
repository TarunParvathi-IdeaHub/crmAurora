"use client";

import Avatar from "@/components/common/Avatar";
import { useAuth } from "@/lib/hooks/useAuth";
import { ROLE_NAMES } from "@/lib/utils/constants";
import { Bell, LogOut, School } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ModuleHeader() {
  const router = useRouter();
  const { user } = useAuth();
  const roleLabel = user?.role ? ROLE_NAMES[user.role] : "Faculty";
  const displayName = user?.email || user?.userId || "Test Faculty";

  const handleLogout = () => {
    localStorage.removeItem("erpUser");
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
          <School size={18} />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">{roleLabel} Portal</p>
          <p className="text-xs text-slate-500">Aurora University erp</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell size={18} />
        </button>

        <Avatar name={displayName} />

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-800">{displayName}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>

        <button
          type="button"
          aria-label="Logout"
          onClick={handleLogout}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
