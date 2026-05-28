type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

type AvatarProps = {
  name: string;
  className?: string;
  src?: string | null;
  size?: AvatarSize;
  ring?: boolean;
};

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6  w-6  text-[10px]",
  sm: "h-8  w-8  text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "U";
}

export default function Avatar({
  name,
  className = "",
  src = null,
  size = "md",
  ring = false,
}: AvatarProps) {
  const sz   = sizeClasses[size];
  const ringCls = ring ? "ring-2 ring-white ring-offset-1" : "";

  if (src) {
    return (
      <img
        src={src}
        alt={`${name} avatar`}
        title={name}
        className={`inline-flex rounded-full object-cover ${sz} ${ringCls} ${className}`}
      />
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-sky-500 font-semibold text-white ${sz} ${ringCls} ${className}`}
      aria-label={`${name} avatar`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
