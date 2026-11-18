"use client";

import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import Typography from "@mui/material/Typography";
import { IconAlertTriangle, IconHelpCircle } from "@tabler/icons-react";
import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { SoftButton } from "./SoftButton";

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Verb for the action button, e.g. "Archive", "Delete", "Remove". */
  confirmLabel?: string;
  /** "danger" for delete / archive / remove; "primary" for other changes. */
  tone?: "danger" | "primary";
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/** NiceAdmin-style confirm dialog. Replaces window.confirm: `if (!(await confirm({...}))) return;` */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const pending = useRef<Pending | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  const confirm = useCallback((next: ConfirmOptions) => {
    pending.current?.resolve(false); // a second ask cancels the first
    return new Promise<boolean>((resolve) => {
      pending.current = { ...next, resolve };
      setOptions(next);
      setOpen(true);
    });
  }, []);

  const finish = (ok: boolean) => {
    pending.current?.resolve(ok);
    pending.current = null;
    setOpen(false); // options stay set so the text does not vanish during the fade-out
  };

  const danger = (options?.tone ?? "danger") === "danger";
  const Icon = danger ? IconAlertTriangle : IconHelpCircle;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={open}
        onClose={() => finish(false)}
        maxWidth={false}
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={options?.message ? messageId : undefined}
        // Cancel takes focus once open, so Enter never confirms a destructive action by accident
        slotProps={{ paper: { className: "w-full max-w-sm" }, transition: { onEntered: () => cancelRef.current?.focus() } }}
        sx={{ zIndex: 1400 }}
      >
        <DialogContent className="flex flex-col items-center gap-3 px-6 pt-8 pb-2 text-center">
          <span
            className={cn(
              "inline-flex size-14 items-center justify-center rounded-full",
              danger
                ? "bg-[var(--ops-danger-soft)] text-[var(--ops-danger)]"
                : "bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]",
            )}
          >
            <Icon size={28} stroke={1.5} aria-hidden />
          </span>
          <Typography id={titleId} variant="h5" component="h2">
            {options?.title}
          </Typography>
          {options?.message ? (
            <p id={messageId} className="text-sm text-[var(--ops-text-muted)]">
              {options.message}
            </p>
          ) : null}
        </DialogContent>
        <DialogActions className="justify-center gap-2 px-6 pt-4 pb-6">
          <SoftButton ref={cancelRef} onClick={() => finish(false)}>
            Cancel
          </SoftButton>
          <SoftButton variant={danger ? "danger" : "primary"} onClick={() => finish(true)}>
            {options?.confirmLabel ?? "Confirm"}
          </SoftButton>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider");
  return confirm;
}
