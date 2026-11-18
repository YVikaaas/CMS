"use client";

import { SoftButton, StatusBadge } from "@/components/ops";
import type { PodiumHolder, PodiumPerson } from "@/lib/types/cms";
import { orgCityLine } from "@/lib/utils/labels";
import { podiumPlaceLabel, podiumTone } from "@/lib/utils/podium";

function personGender(gender: PodiumPerson["gender"]): string {
  return gender === "male" ? "Male" : "Female";
}

function PersonDetails({
  person,
  place,
}: {
  person: PodiumPerson;
  place?: string | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--ops-line)] bg-[var(--ops-board-muted)] px-3 py-3">
      <p className="font-medium">{person.name}</p>
      <p className="text-sm text-[var(--ops-text-muted)]">
        {personGender(person.gender)} · {person.phone || "No phone"}
      </p>
      {place ? <p className="text-sm text-[var(--ops-text-muted)]">{place}</p> : null}
    </div>
  );
}

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
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold tracking-wide text-[var(--ops-primary)] uppercase">
        Medal order · {delivered}/{holders.length} delivered
      </p>
      <div className="divide-y divide-[var(--ops-line)]">
      {ordered.map((holder) => {
        const place = orgCityLine(holder.orgName, holder.city);
        const handed = Boolean(holder.deliveredAt);
        return (
          <section key={holder.rankingId} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={podiumTone(holder.rank)}>{podiumPlaceLabel(holder.rank)}</StatusBadge>
                  <StatusBadge tone={handed ? "success" : "neutral"}>
                    {handed ? "Delivered" : "Waiting"}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-lg font-semibold">{holder.name}</p>
                {place ? <p className="text-sm text-[var(--ops-text-muted)]">{place}</p> : null}
              </div>
              <SoftButton
                variant={handed ? "default" : "primary"}
                loading={savingId === holder.rankingId}
                onClick={() => onDeliver(holder.rankingId, !handed)}
              >
                {handed ? "Undo delivery" : "Mark delivered"}
              </SoftButton>
            </div>
            {holder.kind === "athlete" ? (
              holder.people[0] ? (
                <PersonDetails person={holder.people[0]} place={place} />
              ) : (
                <p className="text-sm text-[var(--ops-text-muted)]">Athlete details were not found.</p>
              )
            ) : holder.people.length === 0 ? (
              <p className="text-sm text-[var(--ops-text-muted)]">No members on this team.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Team members</p>
                {holder.people.map((person) => (
                  <PersonDetails key={person.id} person={person} />
                ))}
              </div>
            )}
          </section>
        );
      })}
      </div>
    </div>
  );
}
