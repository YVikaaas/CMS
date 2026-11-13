"use client";

import { Modal } from "@/components/Modal";
import { ScoreMatchBoard } from "@/components/ScoreMatchBoard";
import type { FixtureMatch } from "@/lib/types/cms";

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
  return (
    <Modal
      open={open && Boolean(match)}
      title={match ? `Score · ${match.matchLabel}` : "Score match"}
      onClose={onClose}
      wide
      stacked={stacked}
    >
      {match ? (
        <ScoreMatchBoard match={match} onSaved={onSaved} initialPane={playerListOpen ? "players" : "score"} />
      ) : null}
    </Modal>
  );
}
