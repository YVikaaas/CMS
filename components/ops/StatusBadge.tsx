import Chip from "@mui/material/Chip";
import { cn } from "@/lib/utils/cn";

export type StatusBadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

// MD3 small chip: 8px radius, tonal container fill, dark text.
const toneClass: Record<StatusBadgeTone, string> = {
  neutral: "bg-[var(--ops-surface-hover)] text-[var(--ops-text-muted)]",
  primary: "bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]",
  success: "bg-[var(--ops-success-soft)] text-[var(--ops-success)]",
  warning: "bg-[var(--ops-warning-soft)] text-[var(--ops-warning)]",
  danger: "bg-[var(--ops-danger-soft)] text-[var(--ops-danger)]",
  info: "bg-[var(--ops-info-soft)] text-[var(--ops-info)]",
};

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusBadgeTone;
  className?: string;
}) {
  return (
    <Chip
      size="small"
      label={children}
      className={cn("max-w-full rounded-lg text-xs font-medium", toneClass[tone], className)}
    />
  );
}
