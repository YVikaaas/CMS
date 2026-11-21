import type { DashboardSummary } from "@/lib/types/cms";

export type SetupChecklistStepId = "event" | "sports" | "athletes" | "schedule" | "floor";

export type SetupChecklistStep = {
  id: SetupChecklistStepId;
  title: string;
  hint: string;
  href: string;
  done: boolean;
  /** Soft-locked until earlier steps are done. */
  locked: boolean;
  lockReason: string | null;
  /** First unfinished step. */
  current: boolean;
};

export type SetupChecklistResult = {
  steps: SetupChecklistStep[];
  allDone: boolean;
  currentId: SetupChecklistStepId | null;
};

type Input = {
  eventId: string;
  summary: DashboardSummary | null;
};

function lockReasonFor(
  doneById: Record<SetupChecklistStepId, boolean>,
): string {
  if (!doneById.event) return "Create an event first";
  if (!doneById.sports) return "Add sports first";
  if (!doneById.athletes) return "Add athletes first";
  if (!doneById.schedule) return "Create a schedule first";
  return "Finish earlier steps first";
}

/** Build the Dashboard setup checklist from summary counts. Event is always done when this runs with an eventId. */
export function setupChecklist({ eventId, summary }: Input): SetupChecklistResult {
  const sportsDone = Boolean(summary && summary.categoryCount > 0);
  const athletesDone = Boolean(summary && summary.athleteCount > 0);
  const scheduleDone = Boolean(summary && summary.fixtureCount > 0);
  const floorDone = scheduleDone;

  const doneById: Record<SetupChecklistStepId, boolean> = {
    event: Boolean(eventId),
    sports: sportsDone,
    athletes: athletesDone,
    schedule: scheduleDone,
    floor: floorDone,
  };

  const order: SetupChecklistStepId[] = ["event", "sports", "athletes", "schedule", "floor"];
  let unlocked = true;
  let currentId: SetupChecklistStepId | null = null;

  const steps: SetupChecklistStep[] = order.map((id) => {
    const done = doneById[id];
    const locked = !unlocked;
    if (!done && !locked && !currentId) currentId = id;
    if (!done) unlocked = false;

    const href =
      id === "event"
        ? "/events"
        : id === "sports"
          ? `/events/${eventId}/sports`
          : id === "athletes"
            ? `/events/${eventId}/athletes`
            : id === "schedule"
              ? "/gameplay/fixtures"
              : "/gameplay/call-room";

    const title =
      id === "event"
        ? "Event"
        : id === "sports"
          ? "Sports"
          : id === "athletes"
            ? "Athletes"
            : id === "schedule"
              ? "Schedule"
              : "Floor";

    const hint =
      id === "event"
        ? "Pick the competition you are running"
        : id === "sports"
          ? "Add sports and their races or matches"
          : id === "athletes"
            ? "Add people or teams who will compete"
            : id === "schedule"
              ? "Create at least one fixture draw"
              : "Call Room, Scoring, Results, and Podium";

    return {
      id,
      title,
      hint,
      href,
      done,
      locked,
      lockReason: locked ? lockReasonFor(doneById) : null,
      current: currentId === id,
    };
  });

  return {
    steps,
    allDone: steps.every((step) => step.done),
    currentId,
  };
}
