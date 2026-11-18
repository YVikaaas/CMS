"use client";

import IconButton from "@mui/material/IconButton";
import { IconX } from "@tabler/icons-react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

// MUI Dialog: Escape, scrim click, focus trap and scroll lock come built in.
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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      aria-label={title}
      sx={{ zIndex: over ? 1320 : stacked ? 1310 : 1300 }}
      slotProps={{
        paper: {
          className: `max-h-[min(92dvh,52rem)] ${xl ? "max-w-4xl" : wide ? "max-w-2xl" : "max-w-lg"}`,
        },
      }}
    >
      <DialogTitle className="flex items-center justify-between gap-3 border-b border-[var(--ops-line)]">
        {title}
        <IconButton color="inherit" onClick={onClose} aria-label="Close" className="-mr-2">
          <IconX size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent className="pt-6">{children}</DialogContent>
    </Dialog>
  );
}

export const fieldClass = "ops-control w-full";
export const fieldErrorClass = "ops-control ops-control-error w-full";

/** Red asterisk for a required field. Optional fields stay unmarked. */
export function RequiredMark() {
  return (
    <span className="text-[var(--ops-danger)]" aria-hidden>
      {" "}
      *
    </span>
  );
}
