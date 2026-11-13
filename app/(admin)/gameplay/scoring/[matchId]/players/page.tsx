"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PlayerScoresRedirectPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/gameplay/scoring?match=${params.matchId}`);
  }, [params.matchId, router]);

  return <p className="text-sm text-[var(--ops-text-muted)]">Opening scoring desk…</p>;
}
