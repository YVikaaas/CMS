"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal, fieldClass } from "@/components/Modal";
import { PlayerScoresModal } from "@/components/PlayerScoresModal";
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

const SCORING_MODE = "both" as const;

export function ScoreMatchModal({
  open,
  match,
  onClose,
  onSaved,
  stacked = false,
  playerListOpen = false,
}: {
  open: boolean;
  match: FixtureMatch | null;
  onClose: () => void;
  onSaved: () => void;
  stacked?: boolean;
  playerListOpen?: boolean;
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
  const [listOpen, setListOpen] = useState(false);
  const [undoId, setUndoId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) return;
    setTeam1Points(match.team1Points == null ? "" : String(match.team1Points));
    setTeam2Points(match.team2Points == null ? "" : String(match.team2Points));
    setTeam1Fouls(match.team1Fouls == null ? "" : String(match.team1Fouls));
    setTeam2Fouls(match.team2Fouls == null ? "" : String(match.team2Fouls));
    setWinner(winnerFromResults(match.team1ResultStatus, match.team2ResultStatus) ?? "");
    setSaving(null);
    setLogging(null);
    setListOpen(playerListOpen);
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
  }, [open, match, playerListOpen]);

  const league = match ? isLeagueRound(match.roundType) : false;
  const totalsLocked = events.length > 0;

  const team1Sum = match ? sumPlayerPoints(events, match.team1Id) : 0;
  const team2Sum = match ? sumPlayerPoints(events, match.team2Id) : 0;
  const display1 = match
    ? officialTeamPoints({
        mode: SCORING_MODE,
        typed: parseCountInput(team1Points),
        eventSum: team1Sum,
        hasEvents: events.some((event) => event.teamId === match.team1Id),
      })
    : 0;
  const display2 = match
    ? officialTeamPoints({
        mode: SCORING_MODE,
        typed: parseCountInput(team2Points),
        eventSum: team2Sum,
        hasEvents: events.some((event) => event.teamId === match.team2Id),
      })
    : 0;

  const autoWinner = detectWinnerFromPoints(display1, display2, league);
  const autoHint = useMemo(() => {
    if (winner) return null;
    if (!autoWinner) {
      return league
        ? "Complete will mark this as a draw if scores stay level."
        : "If scores are tied at Complete, you still need to pick a winner.";
    }
    if (autoWinner === "draw") return "Complete will mark this as a draw.";
    if (autoWinner === "1") return `Complete will mark ${match?.team1Name ?? "team 1"} the winner.`;
    return `Complete will mark ${match?.team2Name ?? "team 2"} the winner.`;
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
    if (!match) return;
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
    if (!match) return;
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
    if (!match) return;
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

  const closeScore = () => {
    if (listOpen) return;
    onClose();
  };

  return (
    <>
    <Modal
      open={open && Boolean(match)}
      title={match ? `Score · ${match.matchLabel}` : "Score match"}
      onClose={closeScore}
      wide
      stacked={stacked}
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

          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
            <TeamScoreColumn
              teamName={match.team1Name}
              teamId={match.team1Id}
              points={team1Points}
              fouls={team1Fouls}
              displayPoints={display1}
              totalsLocked={totalsLocked}
              members={team1Members}
              playerId={player1Id}
              logging={logging}
              onPoints={(value) => setTeam1Points(sanitizeDigitInput(value))}
              onFouls={(value) => setTeam1Fouls(sanitizeDigitInput(value))}
              onPlayer={setPlayer1Id}
              onBasket={(points) => void logBasket(match.team1Id, player1Id, points)}
            />
            <p className="pt-8 text-center text-sm font-semibold text-[var(--cms-muted)]">vs</p>
            <TeamScoreColumn
              teamName={match.team2Name}
              teamId={match.team2Id}
              points={team2Points}
              fouls={team2Fouls}
              displayPoints={display2}
              totalsLocked={totalsLocked}
              members={team2Members}
              playerId={player2Id}
              logging={logging}
              onPoints={(value) => setTeam2Points(sanitizeDigitInput(value))}
              onFouls={(value) => setTeam2Fouls(sanitizeDigitInput(value))}
              onPlayer={setPlayer2Id}
              onBasket={(points) => void logBasket(match.team2Id, player2Id, points)}
            />
          </div>

          <p className="text-center text-lg font-semibold">
            {display1} – {display2}
          </p>
          <p className="text-center">
            <button
              type="button"
              className="text-sm font-medium text-[var(--cms-action)]"
              onClick={() => setListOpen(true)}
            >
              Player scores{events.length ? ` (${events.length})` : ""}
            </button>
          </p>

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
            {league ? (
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
            {autoHint ? <p className="text-xs text-[var(--cms-muted)]">{autoHint}</p> : null}
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={Boolean(saving) || Boolean(logging)}
              className="h-10 rounded-lg border border-[var(--cms-line)] px-4 text-sm font-medium disabled:opacity-60"
            >
              {saving === "progress" ? "Saving…" : "Save as in progress"}
            </button>
            <button
              type="button"
              disabled={Boolean(saving) || Boolean(logging)}
              onClick={() => void submit(true)}
              className="h-10 rounded-lg bg-[var(--cms-action)] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving === "complete" ? "Saving…" : "Complete"}
            </button>
            <button
              type="button"
              onClick={closeScore}
              className="h-10 rounded-lg border border-[var(--cms-line)] px-4 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </Modal>
    <PlayerScoresModal
      open={open && listOpen}
      match={match}
      events={events}
      busyId={undoId}
      onClose={() => setListOpen(false)}
      onUndo={(event) => void undoEvent(event)}
    />
    </>
  );
}

function TeamScoreColumn({
  teamName,
  teamId,
  points,
  fouls,
  displayPoints,
  totalsLocked,
  members,
  playerId,
  logging,
  onPoints,
  onFouls,
  onPlayer,
  onBasket,
}: {
  teamName: string;
  teamId: string;
  points: string;
  fouls: string;
  displayPoints: number;
  totalsLocked: boolean;
  members: TeamMember[];
  playerId: string;
  logging: string | null;
  onPoints: (value: string) => void;
  onFouls: (value: string) => void;
  onPlayer: (value: string) => void;
  onBasket: (points: BasketPoints) => void;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm font-semibold">{teamName}</p>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Points
        <input
          inputMode="numeric"
          value={totalsLocked ? String(displayPoints) : points}
          readOnly={totalsLocked}
          onChange={(event) => onPoints(event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Fouls
        <input
          inputMode="numeric"
          value={fouls}
          onChange={(event) => onFouls(event.target.value)}
          className={fieldClass}
        />
      </label>
      <div className="grid gap-2 rounded-xl border border-[var(--cms-line)] p-3">
        <p className="text-sm font-medium">Player basket</p>
        {members.length === 0 ? (
          <p className="text-sm text-[var(--cms-muted)]">This team has no members.</p>
        ) : (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Player
              <select
                value={playerId}
                onChange={(event) => onPlayer(event.target.value)}
                className={fieldClass}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              {BASKET_POINTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={!playerId || Boolean(logging)}
                  onClick={() => onBasket(value)}
                  className="h-10 flex-1 rounded-lg border border-[var(--cms-line)] text-sm font-semibold disabled:opacity-60"
                >
                  {logging === `${teamId}-${value}` ? "…" : `+${value}`}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
