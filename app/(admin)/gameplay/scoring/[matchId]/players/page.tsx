"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ScoreMatchModal } from "@/components/ScoreMatchModal";
import { useChampionship } from "@/app/providers/ChampionshipProvider";
import { getFixtureMatch } from "@/lib/services";
import type { FixtureMatch } from "@/lib/types/cms";

export default function PlayerScoresPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const { selected, loading } = useChampionship();
  const [match, setMatch] = useState<FixtureMatch | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const matchRes = await getFixtureMatch(params.matchId);
    if (matchRes.error) toast.error(matchRes.error.message);
    const next = matchRes.data;
    if (!next || (selected && next.championshipId !== selected.id)) {
      setMatch(null);
      setReady(true);
      return;
    }
    setMatch(next);
    setReady(true);
  }, [params.matchId, selected]);

  useEffect(() => {
    if (!loading && selected) void load();
  }, [loading, selected, load]);

  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push("/gameplay/scoring");
  };

  if (loading || !ready) {
    return <p className="text-sm text-[var(--cms-muted)]">Loading…</p>;
  }
  if (!selected || !match) {
    return (
      <div className="rounded-2xl border border-[var(--cms-line)] bg-white p-8">
        <h1 className="text-lg font-semibold">Player scores</h1>
        <p className="mt-2 text-sm text-[var(--cms-muted)]">Match was not found.</p>
        <Link href="/gameplay/scoring" className="mt-4 inline-block text-sm text-[var(--cms-action)]">
          Back to scoring
        </Link>
      </div>
    );
  }

  return (
    <ScoreMatchModal
      open
      match={match}
      playerListOpen
      onClose={close}
      onSaved={() => {
        void load();
      }}
    />
  );
}
