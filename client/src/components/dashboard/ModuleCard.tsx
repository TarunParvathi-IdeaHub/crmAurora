import Link from "next/link";
import type { ModuleItem } from "@/types/module";

type ModuleCardProps = {
  module: ModuleItem;
};

export default function ModuleCard({ module }: ModuleCardProps) {
  return (
    <Link
      href={module.path}
      className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{module.domain}</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{module.title}</h3>
      <p className="mt-2 text-sm text-slate-600">{module.description}</p>
    </Link>
  );
}