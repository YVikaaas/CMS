"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  browserAuthGetInitialSession,
  browserAuthSignOut,
  browserAuthSubscribe,
} from "@/lib/services";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: (redirectPath?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    void browserAuthGetInitialSession().then((s) => handleSession(s));

    const { unsubscribe } = browserAuthSubscribe((nextSession) => {
      handleSession(nextSession);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async (redirectPath = "/login") => {
    await browserAuthSignOut();
    setUser(null);
    setSession(null);
    window.location.href = redirectPath;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
