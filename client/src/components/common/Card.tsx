import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "elevated" | "ghost" | "flush";

type CardProps = {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
} & HTMLAttributes<HTMLDivElement>;

const variantStyles: Record<CardVariant, string> = {
  default:  "bg-white border border-slate-200/80 shadow-sm",
  elevated: "bg-white border border-slate-200/60 shadow-md",
  ghost:    "bg-slate-50/70 border border-slate-200/50",
  flush:    "bg-white border border-slate-200 shadow-none",
};

export default function Card({
  children,
  className = "",
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}