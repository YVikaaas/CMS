"use client";

import { useEffect } from "react";
import { useChampionship } from "@/app/providers/ChampionshipProvider";

export function useScopedChampionship(championshipId: string) {
  const { championships, loading, setSelectedId } = useChampionship();
  const championship = championships.find((row) => row.id === championshipId) ?? null;

  useEffect(() => {
    if (championship) setSelectedId(championship.id);
  }, [championship, setSelectedId]);

  return { championship, loading };
}
