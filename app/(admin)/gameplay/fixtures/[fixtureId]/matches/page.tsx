"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function FixtureMatchesRedirectPage() {
  const params = useParams<{ fixtureId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/gameplay/fixtures/${params.fixtureId}`);
  }, [params.fixtureId, router]);

  return <p className="text-sm text-[var(--ops-text-muted)]">Opening match workspace…</p>;
}
