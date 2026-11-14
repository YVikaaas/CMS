"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "./loading";

type Variant = "default" | "primary" | "success" | "danger" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "default" | "lg";
  loading?: boolean;
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  default:
    "border border-[var(--ops-line)] bg-[var(--ops-surface)] text-[var(--ops-text)] hover:bg-[var(--ops-surface-hover)]",
  primary:
    "border border-transparent bg-[var(--ops-primary)] text-white hover:bg-[var(--ops-primary-hover)]",
  success:
    "border border-transparent bg-[var(--ops-success)] text-white hover:opacity-90",
  danger:
    "border border-transparent bg-[var(--ops-danger)] text-white hover:opacity-90",
  ghost:
    "border-transparent bg-transparent text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-hover)] hover:text-[var(--ops-text)]",
};

export function SoftButton({
  variant = "default",
  size = "default",
  loading,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" ? "min-h-[var(--ops-touch-pref)] px-6" : "min-h-[var(--ops-touch-min)]",
        variantClass[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : null}
      <span className={loading ? "opacity-80" : undefined}>{children}</span>
    </button>
  );
}
