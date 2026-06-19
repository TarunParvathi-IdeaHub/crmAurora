/* ─── Skeleton bar ───────────────────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ─── Skeleton card placeholder ─────────────────────────────────── */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="skeleton mb-3 h-4 w-1/3" />
      <div className="skeleton mb-4 h-7 w-1/2" />
      <div className="skeleton mb-2 h-3 w-full" />
      <div className="skeleton h-3 w-4/5" />
    </div>
  );
}

/* ─── Full-page spinner ──────────────────────────────────────────── */
export default function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-10">
      <div className="h-8 w-8 rounded-full border-[3px] border-indigo-600 border-t-transparent animate-spin" />
      {label && <p className="text-sm font-medium text-slate-400">{label}</p>}
    </div>
  );
}