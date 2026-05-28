"use client";

import ModuleCard from "@/components/dashboard/ModuleCard";
import { modulesByRole } from "@/lib/sidebar";
import { useRole } from "@/lib/hooks/useRole";

export default function ModuleGrid() {
  const role = useRole();
  const modules = role ? (modulesByRole[role] ?? []) : [];

  if (!role) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        No role found for this account.
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        No modules are configured for your role yet.
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-slate-900">Available Modules</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
    </section>
  );
}