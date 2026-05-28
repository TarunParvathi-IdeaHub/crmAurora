type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info" | "purple" | "ghost";

type BadgeProps = {
  label: string;
  className?: string;
  variant?: BadgeVariant;
  dot?: boolean;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100  text-amber-700",
  error:   "bg-rose-100   text-rose-700",
  info:    "bg-sky-100    text-sky-700",
  purple:  "bg-violet-100 text-violet-700",
  ghost:   "bg-white/20 text-white border border-white/30",
};

const dotColors: Record<BadgeVariant, string> = {
  neutral: "bg-slate-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error:   "bg-rose-500",
  info:    "bg-sky-500",
  purple:  "bg-violet-500",
  ghost:   "bg-white",
};

export default function Badge({
  label,
  className = "",
  variant = "neutral",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        variantClasses[variant]
      } ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColors[variant]}`} />
      )}
      {label}
    </span>
  );
}