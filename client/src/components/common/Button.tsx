import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize    = "sm" | "md" | "lg";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClasses: Record<ButtonVariant, string> = {
  primary:   "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:bg-indigo-800",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-xs",
  ghost:     "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger:    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3    py-1.5  text-xs  gap-1.5 rounded-lg",
  md: "px-4    py-2    text-sm  gap-2   rounded-xl",
  lg: "px-5    py-2.5  text-sm  gap-2   rounded-xl",
};

export default function Button({
  children,
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}