"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass } from "@/components/Modal";
import { saveMatchScore } from "@/lib/services";
import type { FixtureMatch, MatchWinner } from "@/lib/types/cms";
import { isLeagueRound, parseCountInput, winnerFromResults } from "@/lib/utils/fixtures";
import { sanitizeDigitInput } from "@/lib/utils/validation";

export function ScoreMatchModal({
  open,
  match,
  onClose,
  onSaved,
}: {
  open: boolean;
  match: FixtureMatch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [team1Points, setTeam1Points] = useState("");
  const [team2Points, setTeam2Points] = useState("");
  const [team1Fouls, setTeam1Fouls] = useState("");
  const [team2Fouls, setTeam2Fouls] = useState("");
  const [winner, setWinner] = useState<MatchWinner | "">("");
  const [saving, setSaving] = useState<"progress" | "complete" | null>(null);

  useEffect(() => {
    if (!open || !match) return;
    setTeam1Points(match.team1Points == null ? "" : String(match.team1Points));
    setTeam2Points(match.team2Points == null ? "" : String(match.team2Points));
    setTeam1Fouls(match.team1Fouls == null ? "" : String(match.team1Fouls));
    setTeam2Fouls(match.team2Fouls == null ? "" : String(match.team2Fouls));
    setWinner(winnerFromResults(match.team1ResultStatus, match.team2ResultStatus) ?? "");
    setSaving(null);
  }, [open, match]);

  const submit = async (complete: boolean) => {
    if (!match) return;
    setSaving(complete ? "complete" : "progress");
    const result = await saveMatchScore({
      matchId: match.id,
      team1Points: parseCountInput(team1Points),
      team2Points: parseCountInput(team2Points),
      team1Fouls: parseCountInput(team1Fouls),
      team2Fouls: parseCountInput(team2Fouls),
      winner: winner || null,
      complete,
    });
    setSaving(null);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(complete ? "Match completed." : "Score saved.");
    onSaved();
  };

  return (
    <Modal
      open={open && Boolean(match)}
      title={match ? `Score · ${match.matchLabel}` : "Score match"}
      onClose={onClose}
      wide
    >
      {match ? (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(false);
          }}
        >
          <p className="text-sm text-[var(--cms-muted)]">
            {match.roundLabel}
            {match.categoryLabel ? ` · ${match.categoryLabel}` : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <div className="grid gap-3">
              <p className="text-sm font-semibold">{match.team1Name}</p>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Points
                <input
                  inputMode="numeric"
                  value={team1Points}
                  onChange={(event) => setTeam1Points(sanitizeDigitInput(event.target.value))}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Fouls
                <input
                  inputMode="numeric"
                  value={team1Fouls}
                  onChange={(event) => setTeam1Fouls(sanitizeDigitInput(event.target.value))}
                  className={fieldClass}
                />
              </label>
            </div>
            <p className="pt-8 text-center text-sm font-semibold text-[var(--cms-muted)]">vs</p>
            <div className="grid gap-3">
              <p className="text-sm font-semibold">{match.team2Name}</p>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Points
                <input
                  inputMode="numeric"
                  value={team2Points}
                  onChange={(event) => setTeam2Points(sanitizeDigitInput(event.target.value))}
                  className={fieldClass}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Fouls
                <input
                  inputMode="numeric"
                  value={team2Fouls}
                  onChange={(event) => setTeam2Fouls(sanitizeDigitInput(event.target.value))}
                  className={fieldClass}
                />
              </label>
            </div>
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Winner</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="winner"
                checked={winner === "1"}
                onChange={() => setWinner("1")}
              />
              {match.team1Name}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="winner"
                checked={winner === "2"}
                onChange={() => setWinner("2")}
              />
              {match.team2Name}
            </label>
            {isLeagueRound(match.roundType) ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="winner"
                  checked={winner === "draw"}
                  onChange={() => setWinner("draw")}
                />
                Draw
              </label>
            ) : null}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={Boolean(saving)}
              className="h-10 rounded-lg border border-[var(--cms-line)] px-4 text-sm font-medium disabled:opacity-60"
            >
              {saving === "progress" ? "Saving…" : "Save as in progress"}
            </button>
            <button
              type="button"
              disabled={Boolean(saving)}
              onClick={() => void submit(true)}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving === "complete" ? "Saving…" : "Complete"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-[var(--cms-line)] px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
