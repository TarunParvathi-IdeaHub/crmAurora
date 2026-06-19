"use client";

import { ReactNode, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

type AuthenticatedLayoutProps = { children: ReactNode };

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isModulesRoute = pathname.startsWith("/modules");
  const isDashboard = pathname === "/dashboard";
  const isFullWidthRoute = pathname === "/profile" || pathname === "/settings";
  const isChangePasswordRoute = pathname === "/change-password";

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!isLoading && isAuthenticated && user?.isFirstLogin && !isChangePasswordRoute) {
      router.replace('/change-password');
    }
    // router is a stable singleton in Next.js App Router — safe to omit from deps.
    // Including it caused the effect to re-run on every router reference change,
    // triggering a redirect before useAuth had a chance to read localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, isChangePasswordRoute, user?.isFirstLogin]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="h-10 w-10 rounded-full border-[3px] border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading your workspace…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <ProfileProvider>
      <div className="min-h-screen bg-slate-50 pt-16">
        <Navbar />

        {isModulesRoute ? (
          // Modules layout handles its own sidebar via modules/layout.tsx
          <div className="h-[calc(100vh-64px)] overflow-hidden">
            {children}
          </div>
        ) : isDashboard || isFullWidthRoute ? (
          // Dashboard / profile / settings — full-width, no sidebar
          <main className="min-h-[calc(100vh-64px)] overflow-auto px-6 py-6 lg:px-10 lg:py-8">
            {children}
          </main>
        ) : (
          // Other non-module routes: persistent nav sidebar + scrollable content
          <div className="flex min-h-[calc(100vh-64px)]">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-auto px-6 py-6 lg:px-10 lg:py-8">
              {children}
            </main>
          </div>
        )}
      </div>
    </ProfileProvider>
  );
}
