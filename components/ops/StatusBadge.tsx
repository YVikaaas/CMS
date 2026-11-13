import { cn } from "@/lib/utils/cn";

export type StatusBadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const toneClass: Record<StatusBadgeTone, string> = {
  neutral: "border-[var(--ops-line)] bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]",
  primary: "border-[var(--ops-primary)]/20 bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]",
  success: "border-[var(--ops-success)]/20 bg-[var(--ops-success-soft)] text-[var(--ops-success)]",
  warning: "border-[var(--ops-warning)]/20 bg-[var(--ops-warning-soft)] text-[var(--ops-warning)]",
  danger: "border-[var(--ops-danger)]/20 bg-[var(--ops-danger-soft)] text-[var(--ops-danger)]",
  info: "border-[var(--ops-primary)]/20 bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]",
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
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
