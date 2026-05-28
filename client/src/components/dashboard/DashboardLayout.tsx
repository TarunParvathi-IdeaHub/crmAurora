import { ReactNode } from "react";

type DashboardLayoutProps = { children: ReactNode };

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100">
      {children}
    </div>
  );
}