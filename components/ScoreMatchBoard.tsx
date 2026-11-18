"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { fieldClass, RequiredMark } from "@/components/Modal";
import { SoftButton, SoftSelect, StatusBadge, StickyActionBar } from "@/components/ops";
import {
  addMatchScoreEvent,
  archiveMatchScoreEvent,
  listMatchScoreEvents,
  listTeamMembers,
  saveMatchScore,
} from "@/lib/services";
import type {
  BasketPoints,
  FixtureMatch,
  MatchScoreEvent,
  MatchWinner,
  TeamMember,
} from "@/lib/types/cms";
import {
  BASKET_POINTS,
  detectWinnerFromPoints,
  isLeagueRound,
  officialTeamPoints,
  parseCountInput,
  sumPlayerPoints,
  winnerFromResults,
} from "@/lib/utils/fixtures";
import { sanitizeDigitInput } from "@/lib/utils/validation";
import { formatMatchWhen } from "@/lib/utils/resultsBoard";
import { cn } from "@/lib/utils/cn";

const SCORING_MODE = "both" as const;

export function ScoreMatchBoard({
  match,
  onSaved,
  initialPane = "score",
}: {
  match: FixtureMatch;
  onSaved: () => void;
  initialPane?: "score" | "players";
}) {
  const [team1Points, setTeam1Points] = useState("");
  const [team2Points, setTeam2Points] = useState("");
  const [team1Fouls, setTeam1Fouls] = useState("");
  const [team2Fouls, setTeam2Fouls] = useState("");
  const [winner, setWinner] = useState<MatchWinner | "">("");
  const [events, setEvents] = useState<MatchScoreEvent[]>([]);
  const [team1Members, setTeam1Members] = useState<TeamMember[]>([]);
  const [team2Members, setTeam2Members] = useState<TeamMember[]>([]);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [saving, setSaving] = useState<"progress" | "complete" | null>(null);
  const [logging, setLogging] = useState<string | null>(null);
  const [pane, setPane] = useState<"score" | "players">(initialPane);
  const [undoId, setUndoId] = useState<string | null>(null);

  useEffect(() => {
    setTeam1Points(match.team1Points == null ? "" : String(match.team1Points));
    setTeam2Points(match.team2Points == null ? "" : String(match.team2Points));
    setTeam1Fouls(match.team1Fouls == null ? "" : String(match.team1Fouls));
    setTeam2Fouls(match.team2Fouls == null ? "" : String(match.team2Fouls));
    setWinner(winnerFromResults(match.team1ResultStatus, match.team2ResultStatus) ?? "");
    setSaving(null);
    setLogging(null);
    setPane(initialPane);
    setUndoId(null);

    void (async () => {
      const [members1, members2, eventRes] = await Promise.all([
        listTeamMembers(match.team1Id),
        listTeamMembers(match.team2Id),
        listMatchScoreEvents(match.id),
      ]);
      if (members1.error) toast.error(members1.error.message);
      if (members2.error) toast.error(members2.error.message);
      if (eventRes.error) toast.error(eventRes.error.message);
      const next1 = members1.data ?? [];
      const next2 = members2.data ?? [];
      setTeam1Members(next1);
      setTeam2Members(next2);
      setPlayer1Id(next1[0]?.id ?? "");
      setPlayer2Id(next2[0]?.id ?? "");
      const nextEvents = eventRes.data ?? [];
      setEvents(nextEvents);
      if (nextEvents.length > 0) {
        setTeam1Points(String(sumPlayerPoints(nextEvents, match.team1Id)));
        setTeam2Points(String(sumPlayerPoints(nextEvents, match.team2Id)));
      }
    })();
  }, [match, initialPane]);

  const league = isLeagueRound(match.roundType);
  const totalsLocked = events.length > 0;
  const team1Sum = sumPlayerPoints(events, match.team1Id);
  const team2Sum = sumPlayerPoints(events, match.team2Id);
  const display1 = officialTeamPoints({
    mode: SCORING_MODE,
    typed: parseCountInput(team1Points),
    eventSum: team1Sum,
    hasEvents: events.some((event) => event.teamId === match.team1Id),
  });
  const display2 = officialTeamPoints({
    mode: SCORING_MODE,
    typed: parseCountInput(team2Points),
    eventSum: team2Sum,
    hasEvents: events.some((event) => event.teamId === match.team2Id),
  });
  const autoWinner = detectWinnerFromPoints(display1, display2, league);
  const autoHint = useMemo(() => {
    if (winner) return null;
    if (!autoWinner) {
      return league
        ? "Complete will mark this as a draw if scores stay level."
        : "If scores are tied at Complete, you still need to pick a winner.";
    }
    if (autoWinner === "draw") return "Complete will mark this as a draw.";
    if (autoWinner === "1") return `Complete will mark ${match.team1Name} the winner.`;
    return `Complete will mark ${match.team2Name} the winner.`;
  }, [winner, autoWinner, league, match]);

  const applyMatch = (next: FixtureMatch, nextEvents?: MatchScoreEvent[]) => {
    const rows = nextEvents ?? events;
    setTeam1Fouls(next.team1Fouls == null ? "" : String(next.team1Fouls));
    setTeam2Fouls(next.team2Fouls == null ? "" : String(next.team2Fouls));
    setWinner(winnerFromResults(next.team1ResultStatus, next.team2ResultStatus) ?? winner);
    const p1 = officialTeamPoints({
      mode: SCORING_MODE,
      typed: next.team1Points ?? 0,
      eventSum: sumPlayerPoints(rows, next.team1Id),
      hasEvents: rows.some((event) => event.teamId === next.team1Id),
    });
    const p2 = officialTeamPoints({
      mode: SCORING_MODE,
      typed: next.team2Points ?? 0,
      eventSum: sumPlayerPoints(rows, next.team2Id),
      hasEvents: rows.some((event) => event.teamId === next.team2Id),
    });
    setTeam1Points(String(p1));
    setTeam2Points(String(p2));
  };

  const logBasket = async (teamId: string, memberId: string, points: BasketPoints) => {
    if (!memberId) {
      toast.error("Pick a player first.");
      return;
    }
    setLogging(`${teamId}-${points}`);
    const result = await addMatchScoreEvent({
      matchId: match.id,
      teamId,
      teamMemberId: memberId,
      points,
      scoringMode: SCORING_MODE,
      team1Fouls: parseCountInput(team1Fouls),
      team2Fouls: parseCountInput(team2Fouls),
    });
    if (result.error) {
      setLogging(null);
      toast.error(result.error.message);
      return;
    }
    const eventRes = await listMatchScoreEvents(match.id);
    const nextEvents = eventRes.data ?? [];
    setEvents(nextEvents);
    if (result.data) applyMatch(result.data, nextEvents);
    setLogging(null);
  };

  const undoEvent = async (event: MatchScoreEvent) => {
    setUndoId(event.id);
    const result = await archiveMatchScoreEvent(event.id, SCORING_MODE, {
      team1Fouls: parseCountInput(team1Fouls),
      team2Fouls: parseCountInput(team2Fouls),
    });
    if (result.error) {
      setUndoId(null);
      toast.error(result.error.message);
      return;
    }
    const eventRes = await listMatchScoreEvents(match.id);
    const nextEvents = eventRes.data ?? [];
    setEvents(nextEvents);
    if (result.data) applyMatch(result.data, nextEvents);
    setUndoId(null);
  };

  const submit = async (complete: boolean) => {
    setSaving(complete ? "complete" : "progress");
    const result = await saveMatchScore({
      matchId: match.id,
      team1Points: parseCountInput(team1Points),
      team2Points: parseCountInput(team2Points),
      team1Fouls: parseCountInput(team1Fouls),
      team2Fouls: parseCountInput(team2Fouls),
      winner: winner || null,
      scoringMode: SCORING_MODE,
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

  const matchTitle = `${match.sportName} ${match.roundLabel} · ${
    match.matchLabel.trim() || `Match ${match.matchNumber}`
  }`;
  const statusTone =
    match.status === "completed" ? "success" : match.status === "in_progress" ? "warning" : "neutral";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--ops-primary)] uppercase">
            {match.sportName} · {match.roundLabel}
          </p>
          <h2 className="text-xl font-semibold">{matchTitle}</h2>
          {match.scheduledAt ? (
            <p className="text-sm text-[var(--ops-text-muted)]">{formatMatchWhen(match.scheduledAt)}</p>
          ) : null}
        </div>
        <StatusBadge tone={statusTone}>{match.status.replace("_", " ")}</StatusBadge>
      </div>
      <div className="flex gap-2">
        <SoftButton variant={pane === "score" ? "primary" : "default"} onClick={() => setPane("score")}>
          Score
        </SoftButton>
        <SoftButton variant={pane === "players" ? "primary" : "default"} onClick={() => setPane("players")}>
          Player baskets{events.length ? ` (${events.length})` : ""}
        </SoftButton>
      </div>
      {pane === "score" ? (
        <>
          <TeamScoreRow
            side="1"
            teamName={match.team1Name}
            teamId={match.team1Id}
            points={team1Points}
            fouls={team1Fouls}
            displayPoints={display1}
            totalsLocked={totalsLocked}
            members={team1Members}
            playerId={player1Id}
            logging={logging}
            winner={winner === "1"}
            onPoints={(value) => setTeam1Points(sanitizeDigitInput(value))}
            onFouls={(value) => setTeam1Fouls(sanitizeDigitInput(value))}
            onPlayer={setPlayer1Id}
            onBasket={(points) => void logBasket(match.team1Id, player1Id, points)}
            onWinner={() => setWinner("1")}
          />
          <p className="text-center text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">vs</p>
          <TeamScoreRow
            side="2"
            teamName={match.team2Name}
            teamId={match.team2Id}
            points={team2Points}
            fouls={team2Fouls}
            displayPoints={display2}
            totalsLocked={totalsLocked}
            members={team2Members}
            playerId={player2Id}
            logging={logging}
            winner={winner === "2"}
            onPoints={(value) => setTeam2Points(sanitizeDigitInput(value))}
            onFouls={(value) => setTeam2Fouls(sanitizeDigitInput(value))}
            onPlayer={setPlayer2Id}
            onBasket={(points) => void logBasket(match.team2Id, player2Id, points)}
            onWinner={() => setWinner("2")}
          />
          {league ? (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="winner" checked={winner === "draw"} onChange={() => setWinner("draw")} />
              Draw
            </label>
          ) : null}
          {autoHint ? <p className="text-sm text-[var(--ops-text-muted)]">{autoHint}</p> : null}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {[match.team1Id, match.team2Id].map((teamId) => {
            const name = teamId === match.team1Id ? match.team1Name : match.team2Name;
            const rows = events.filter((event) => event.teamId === teamId);
            return (
              <div key={teamId} className="rounded-xl border border-[var(--ops-line)]">
                <p className="border-b border-[var(--ops-line)] px-3 py-2 text-sm font-semibold">
                  {name} · {sumPlayerPoints(events, teamId)}
                </p>
                {rows.length === 0 ? (
                  <p className="px-3 py-6 text-sm text-[var(--ops-text-muted)]">No points logged yet.</p>
                ) : (
                  rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-2 border-t border-[var(--ops-line)] px-3 py-2 text-sm"
                    >
                      <span>
                        {row.teamMemberName} · {row.points}
                      </span>
                      <SoftButton variant="ghost" disabled={Boolean(undoId)} onClick={() => void undoEvent(row)}>
                        Undo
                      </SoftButton>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
      <StickyActionBar>
        <SoftButton disabled={Boolean(saving) || Boolean(logging)} onClick={() => void submit(false)}>
          {saving === "progress" ? "Saving…" : "Save"}
        </SoftButton>
        <SoftButton
          variant="primary"
          disabled={Boolean(saving) || Boolean(logging)}
          onClick={() => void submit(true)}
        >
          {saving === "complete" ? "Saving…" : "Submit scoring"}
        </SoftButton>
      </StickyActionBar>
    </div>
  );
}

function teamInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function CountStepper({
  label,
  value,
  onChange,
  disabled,
  emphasis,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  emphasis?: boolean;
}) {
  const parsed = Number.parseInt(value, 10);
  const current = Number.isFinite(parsed) ? parsed : 0;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Lower ${label}`}
        disabled={disabled}
        onClick={() => onChange(String(Math.max(0, current - 1)))}
        className="flex size-11 items-center justify-center rounded-full border border-[var(--ops-line-strong)] bg-white text-[var(--ops-text)] disabled:opacity-45"
      >
        <IconMinus size={16} />
      </button>
      <span
        className={cn(
          "min-w-8 text-center font-semibold tabular-nums",
          emphasis ? "text-2xl" : "text-base",
        )}
      >
        {current}
      </span>
      <button
        type="button"
        aria-label={`Raise ${label}`}
        disabled={disabled}
        onClick={() => onChange(String(current + 1))}
        className="flex size-11 items-center justify-center rounded-full border border-[var(--ops-line-strong)] bg-white text-[var(--ops-text)] disabled:opacity-45"
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}

function TeamScoreRow({
  side,
  teamName,
  teamId,
  points,
  fouls,
  displayPoints,
  totalsLocked,
  members,
  playerId,
  logging,
  winner,
  onPoints,
  onFouls,
  onPlayer,
  onBasket,
  onWinner,
}: {
  side: "1" | "2";
  teamName: string;
  teamId: string;
  points: string;
  fouls: string;
  displayPoints: number;
  totalsLocked: boolean;
  members: TeamMember[];
  playerId: string;
  logging: string | null;
  winner: boolean;
  onPoints: (value: string) => void;
  onFouls: (value: string) => void;
  onPlayer: (value: string) => void;
  onBasket: (points: BasketPoints) => void;
  onWinner: () => void;
}) {
  const scoreValue = totalsLocked ? String(displayPoints) : points;
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        winner ? "border-[var(--ops-success)]/40 bg-[var(--ops-success-soft)]" : "border-[var(--ops-line)] bg-white",
      )}
    >
    <div
      className={cn(
        "flex flex-col gap-3 px-3 py-3",
        side === "2" ? "sm:flex-row-reverse sm:items-center" : "sm:flex-row sm:items-center",
      )}
    >
      <div className={cn("flex min-w-0 flex-1 items-center gap-3", side === "2" && "sm:flex-row-reverse sm:text-right")}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ops-primary-soft)] text-sm font-semibold text-[var(--ops-primary)]">
          {teamInitials(teamName)}
        </span>
        <div className="min-w-0">
          <div className={cn("flex flex-wrap items-center gap-2", side === "2" && "sm:justify-end")}>
            <p className="font-semibold">{teamName}</p>
            {winner ? <StatusBadge tone="success">Winner</StatusBadge> : null}
          </div>
          <p className="text-sm text-[var(--ops-text-muted)]">
            Team · {members.length} {members.length === 1 ? "athlete" : "athletes"}
          </p>
        </div>
      </div>
      <div className={cn("flex flex-wrap items-center gap-3", side === "2" && "sm:flex-row-reverse")}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-[var(--ops-text-muted)] uppercase">Fouls</span>
          <CountStepper label={`${teamName} fouls`} value={fouls} onChange={onFouls} />
        </div>
        <CountStepper
          label={`${teamName} score`}
          value={scoreValue}
          onChange={onPoints}
          disabled={totalsLocked}
          emphasis
        />
        {winner ? null : (
          <button type="button" onClick={onWinner} className="min-h-11 px-2 text-sm font-semibold text-[var(--ops-primary)]">
            Mark winner
          </button>
        )}
      </div>
    </div>
      <details className="border-t border-[var(--ops-line)] px-3 py-2">
        <summary className="cursor-pointer text-sm font-semibold">Player basket</summary>
        <div className="mt-2 grid min-w-56 gap-2">
          {members.length === 0 ? (
            <p className="text-sm text-[var(--ops-text-muted)]">This team has no members.</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                <span>
                  Player
                  <RequiredMark />
                </span>
                <SoftSelect value={playerId} onChange={(event) => onPlayer(event.target.value)} className={fieldClass}>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </SoftSelect>
              </label>
              <div className="flex gap-2">
                {BASKET_POINTS.map((value) => (
                  <SoftButton
                    key={value}
                    disabled={!playerId || Boolean(logging)}
                    onClick={() => onBasket(value)}
                    className="flex-1"
                  >
                    {logging === `${teamId}-${value}` ? "…" : `+${value}`}
                  </SoftButton>
                ))}
              </div>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
