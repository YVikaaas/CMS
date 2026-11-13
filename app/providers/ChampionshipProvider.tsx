"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Championship } from "@/lib/types/cms";
import { listChampionships } from "@/lib/services";

const STORAGE_KEY = "cms.selectedChampionshipId";

type ChampionshipContextType = {
  championships: Championship[];
  selectedId: string | null;
  selected: Championship | null;
  loading: boolean;
  setSelectedId: (id: string | null) => void;
  refresh: () => Promise<void>;
};

const ChampionshipContext = createContext<ChampionshipContextType | undefined>(
  undefined,
);

export function ChampionshipProvider({ children }: { children: React.ReactNode }) {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setSelectedId = (id: string | null) => {
    setSelectedIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  };

  const refresh = async () => {
    const { data } = await listChampionships();
    const rows = data ?? [];
    setChampionships(rows);
    setSelectedIdState((current) => {
      const stored = current ?? localStorage.getItem(STORAGE_KEY);
      if (stored && rows.some((row) => row.id === stored)) {
        localStorage.setItem(STORAGE_KEY, stored);
        return stored;
      }
      const next = rows[0]?.id ?? null;
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
      return next;
    });
    setLoading(false);
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedIdState(stored);
    void refresh();
  }, []);

  const selected = championships.find((row) => row.id === selectedId) ?? null;

  return (
    <ChampionshipContext.Provider
      value={{
        championships,
        selectedId,
        selected,
        loading,
        setSelectedId,
        refresh,
      }}
    >
      {children}
    </ChampionshipContext.Provider>
  );
}

export function useChampionship() {
  const ctx = useContext(ChampionshipContext);
  if (!ctx) {
    throw new Error("useChampionship must be used within a ChampionshipProvider");
  }
  return ctx;
}
