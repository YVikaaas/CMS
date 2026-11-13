"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
  xl = false,
  stacked = false,
  over = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  xl?: boolean;
  stacked?: boolean;
  over?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 flex cursor-pointer items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:items-center",
        over ? "z-[70]" : stacked ? "z-[60]" : "z-50",
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "my-8 w-full max-h-[min(92dvh,52rem)] cursor-auto overflow-y-auto rounded-2xl bg-[var(--ops-surface)] p-5 shadow-[var(--ops-shadow-modal)]",
          xl ? "max-w-4xl" : wide ? "max-w-2xl" : "max-w-lg",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldClass = "ops-control w-full";
export const fieldErrorClass = "ops-control ops-control-error w-full";
