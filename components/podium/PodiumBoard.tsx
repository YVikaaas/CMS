"use client";

import { IconCheck, IconPhone } from "@tabler/icons-react";
import { SoftButton } from "@/components/ops";
import type { PodiumHolder, PodiumPerson } from "@/lib/types/cms";
import { cn } from "@/lib/utils/cn";
import { orgCityLine } from "@/lib/utils/labels";
import { podiumPlaceLabel } from "@/lib/utils/podium";

// Medal colours for the place marker: read from across the podium area.
const MEDAL: Record<PodiumHolder["rank"], string> = {
  1: "bg-[#f2c94c] text-[#3d2e00]",
  2: "bg-[#c9ced6] text-[#22262b]",
  3: "bg-[#d39a6a] text-[#2e1a0b]",
};

/** Name + one-tap call. Podium staff ring a winner who has not shown up. */
function PersonLine({ person }: { person: PodiumPerson }) {
  const phone = person.phone?.trim();
  return (
    <li className="flex min-h-10 items-center justify-between gap-2 py-1">
      <span className="min-w-0">
        <span className="block truncate font-medium">{person.name}</span>
        <span className="block text-sm text-[var(--ops-text-muted)]">{phone || "No phone saved"}</span>
      </span>
      {phone ? (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, "")}`}
          aria-label={`Call ${person.name}, ${phone}`}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--ops-line-strong)] text-[var(--ops-text)] hover:bg-[var(--ops-surface-hover)]"
        >
          <IconPhone size={20} aria-hidden />
        </a>
      ) : null}
    </li>
  );
}

/**
 * Medal hand-out sheet, presented in ceremony order (3rd → 1st).
 * Each place: big medal marker, who it goes to, a full-width deliver button, then the people to call.
 */
export function PodiumBoard({
  holders,
  savingId,
  onDeliver,
}: {
  holders: PodiumHolder[];
  savingId?: string | null;
  onDeliver: (rankingId: string, delivered: boolean) => void;
}) {
  if (holders.length === 0) {
    return (
      <p className="text-sm text-[var(--ops-text-muted)]">
        Lock 1st, 2nd and 3rd on scoring before medals can be delivered.
      </p>
    );
  }

  const ordered = [...holders].sort((a, b) => b.rank - a.rank);
  const delivered = holders.filter((holder) => holder.deliveredAt).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base leading-6 font-medium">Medal order</h2>
          <p className={cn("text-sm font-semibold tabular-nums", delivered === holders.length ? "text-[var(--ops-success)]" : "text-[var(--ops-warning)]")}>
            {delivered}/{holders.length} delivered
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Medals delivered"
          aria-valuemin={0}
          aria-valuemax={holders.length}
          aria-valuenow={delivered}
          className="h-2.5 overflow-hidden rounded-full bg-[var(--ops-surface-hover)]"
        >
          <span className="block h-full bg-[var(--ops-success)] transition-[width]" style={{ width: `${(delivered / holders.length) * 100}%` }} />
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {ordered.map((holder) => {
          const place = orgCityLine(holder.orgName, holder.city);
          const handed = Boolean(holder.deliveredAt);
          return (
            <li
              key={holder.rankingId}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-3",
                handed ? "border-[var(--ops-success)]/50 bg-[var(--ops-success-soft)]/35" : "border-[var(--ops-line)] bg-[var(--ops-surface)]",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn("grid size-10 shrink-0 place-items-center rounded-full text-base leading-5 font-medium", MEDAL[holder.rank])}
                >
                  {holder.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-4 font-medium tracking-[0.5px] text-[var(--ops-text-muted)] uppercase">{podiumPlaceLabel(holder.rank)}</p>
                  <p className="truncate text-base leading-6 font-medium">{holder.name}</p>
                  {place ? <p className="text-sm text-[var(--ops-text-muted)]">{place}</p> : null}
                </div>
              </div>
              <SoftButton
                variant={handed ? "default" : "primary"}
                loading={savingId === holder.rankingId}
                onClick={() => onDeliver(holder.rankingId, !handed)}
                startIcon={handed ? <IconCheck size={18} /> : undefined}
                className="w-full"
              >
                {handed ? "Delivered · tap to undo" : "Mark delivered"}
              </SoftButton>
              {holder.people.length > 0 ? (
                <details open={!handed} className="rounded-lg">
                  <summary className="flex min-h-10 cursor-pointer items-center text-sm leading-5 font-medium text-[var(--ops-text-muted)]">
                    {holder.kind === "team" ? `Team members (${holder.people.length})` : "Athlete"}
                  </summary>
                  <ul className="divide-y divide-[var(--ops-line)]">
                    {holder.people.map((person) => (
                      <PersonLine key={person.id} person={person} />
                    ))}
                  </ul>
                </details>
              ) : (
                <p className="text-sm text-[var(--ops-text-muted)]">
                  {holder.kind === "team" ? "No members on this team." : "Athlete details were not found."}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
