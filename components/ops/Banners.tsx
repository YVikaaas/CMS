import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import { IconAlertTriangle, IconBell, IconMoodEmpty, type TablerIcon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "primary" | "danger" | "info";

const toneClass: Record<Tone, string> = {
  primary: "bg-[var(--ops-primary-soft)] text-[var(--ops-primary)]",
  danger: "bg-[var(--ops-danger-soft)] text-[var(--ops-danger)]",
  info: "bg-[var(--ops-info-soft)] text-[var(--ops-info)]",
};

// NiceAdmin Empty / Error / Notification banners: centred card, tinted icon circle, title, text, action.
function Banner({
  icon: Icon,
  tone,
  title,
  hint,
  action,
  role,
  className,
}: {
  icon: TablerIcon;
  tone: Tone;
  title: string;
  hint?: string;
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  return (
    <Card role={role} className={cn("flex flex-col items-center p-8 text-center", className)}>
      <span className={cn("inline-flex size-16 items-center justify-center rounded-full", toneClass[tone])}>
        <Icon size={32} stroke={1.5} aria-hidden />
      </span>
      <Typography variant="h5" component="h2" className="mt-4">
        {title}
      </Typography>
      {hint ? <p className="mt-2 max-w-md text-sm text-[var(--ops-text-muted)]">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}

export function EmptyState(props: { title: string; hint?: string; action?: ReactNode; className?: string; icon?: TablerIcon }) {
  return <Banner icon={props.icon ?? IconMoodEmpty} tone="primary" {...props} />;
}

export function ErrorBanner(props: { title: string; hint?: string; action?: ReactNode; className?: string }) {
  return <Banner icon={IconAlertTriangle} tone="danger" role="alert" {...props} />;
}

export function NotificationBanner(props: { title: string; hint?: string; action?: ReactNode; className?: string }) {
  return <Banner icon={IconBell} tone="info" role="status" {...props} />;
}
