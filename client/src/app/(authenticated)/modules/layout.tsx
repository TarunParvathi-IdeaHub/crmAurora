"use client";

import ModuleMainContent from "@/components/module-dashboard/ModuleMainContent";
import ModuleSidebar from "@/components/module-dashboard/ModuleSidebar";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useRole } from "@/lib/hooks/useRole";
import { ROLE_NAMES } from "@/lib/utils/constants";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { authFetch } from "@/lib/utils/authFetch";
import { useProfile } from "@/providers/ProfileProvider";
import type { DashboardProfile } from "@/providers/ProfileProvider";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:5000";

const PROXIMITY_THRESHOLD = 40;     // px from left edge to trigger expand
const SIDEBAR_EXPANDED_WIDTH = 224; // w-56 = 14rem
const SIDEBAR_COLLAPSED_WIDTH = 56; // w-14 = 3.5rem
const CLOSE_DELAY_MS = 300;

type ModulesLayoutProps = {
  children: ReactNode;
};

export default function ModulesLayout({ children }: ModulesLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = useRole();
  const { canAccessPath, isLoading } = usePermissions();
  const { user } = useAuth();
  const { profile, setProfile, setIsProfileLoading } = useProfile();

  // Fetch profile here so all module pages have institution/department data
  // even when navigating directly (without visiting dashboard first).
  useEffect(() => {
    if (!user?.userId || profile) return;
    if (user.role === "Applicant") return;
    let cancelled = false;
    const load = async () => {
      setIsProfileLoading(true);
      try {
        let profileUrl = `${API_BASE_URL}/api/dashboard/employee/profile`;
        if (user.role === "student") profileUrl = `${API_BASE_URL}/api/dashboard/student/profile`;

        const res = await authFetch(profileUrl);

        // 401 means the auth cookie is missing/expired — same handling as dashboard.
        if (res.status === 401) {
          localStorage.removeItem("erpUser");
          window.location.replace("/login");
          return;
        }

        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; data?: DashboardProfile }
          | null;
        if (!cancelled && res.ok && data?.success && data.data) setProfile(data.data);
      } catch {
        // Network error (server unreachable) — fail silently; page will show empty profile
      } finally {
        if (!cancelled) setIsProfileLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user, profile, setProfile, setIsProfileLoading]);

  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandedRef = useRef(false);

  // Keep ref in sync with state to avoid stale closures in the event handler
  useEffect(() => {
    expandedRef.current = sidebarExpanded;
  }, [sidebarExpanded]);

  // Detect desktop breakpoint (lg = 1024px)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isApplicantPage = pathname.startsWith("/modules/crm/applicants/application");

  // Proximity-based sidebar expand/collapse
  useEffect(() => {
    if (isApplicantPage) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;

      const x = e.clientX;

      if (x <= PROXIMITY_THRESHOLD) {
        // Near left edge — cancel pending close and expand
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        if (!expandedRef.current) setSidebarExpanded(true);
      } else if (x > SIDEBAR_EXPANDED_WIDTH + 16) {
        // Beyond sidebar — schedule collapse
        if (expandedRef.current && !closeTimerRef.current) {
          closeTimerRef.current = setTimeout(() => {
            setSidebarExpanded(false);
            closeTimerRef.current = null;
          }, CLOSE_DELAY_MS);
        }
      } else {
        // Within sidebar range (threshold..expandedWidth) — cancel pending close
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [isApplicantPage]);

  const activeModuleName = pathname
    .split("/")
    .filter(Boolean)
    .slice(2)
    .join(" ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const isManagementFormPage =
    pathname === "/modules/management/departments" ||
    pathname === "/modules/management/institutions" ||
    pathname === "/modules/management/school" ||
    pathname === "/modules/management/study-level" ||
    pathname === "/modules/management/programme-management" ||
    pathname === "/modules/management/users/create-employee" ||
    pathname === "/modules/management/users/employee-management" ||
    pathname === "/modules/management/users/role-management" ||
    pathname.startsWith("/modules/crm/applicants/application");

 
  useEffect(() => {
    if (!isLoading && !canAccessPath(pathname)) {
      router.replace("/dashboard");
    }
  }, [canAccessPath, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        Checking permissions...
      </div>
    );
  }

  if (!canAccessPath(pathname)) {
    return null;
  }

  const mainPaddingLeft =
    !isApplicantPage && isDesktop
      ? sidebarExpanded
        ? SIDEBAR_EXPANDED_WIDTH
        : SIDEBAR_COLLAPSED_WIDTH
      : 0;

  return (
    <div className="bg-slate-50">
      <div className="flex h-[calc(100vh-4rem)]">
        {!isApplicantPage && <ModuleSidebar isExpanded={sidebarExpanded} />}
        <div
          className="flex min-w-0 flex-1 flex-col min-h-0 overflow-auto"
          style={{
            paddingLeft: mainPaddingLeft,
            transition: isDesktop ? "padding-left 300ms ease-in-out" : undefined,
          }}
        >
          <ModuleMainContent title="hi" subtitle="hello">
            {children}
          </ModuleMainContent>
        </div>
      </div>
    </div>
  );
}
