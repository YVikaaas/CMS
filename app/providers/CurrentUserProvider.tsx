"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppUser } from "@/lib/types/cms";
import { ensureCurrentUser } from "@/lib/services";
import { useAuth } from "./AuthProvider";

type CurrentUserContextType = {
  appUser: AppUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(
  undefined,
);

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setAppUser(null);
      setLoading(false);
      return;
    }
    const { data } = await ensureCurrentUser();
    setAppUser(data);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  return (
    <CurrentUserContext.Provider value={{ appUser, loading, refresh }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return ctx;
}
