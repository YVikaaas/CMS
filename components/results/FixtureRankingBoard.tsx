"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fieldClass } from "@/components/Modal";
import { PageSkeleton, SoftButton, SoftSelect, StickyActionBar } from "@/components/ops";
import {
  listCscAthletes,
  listFixtureRanking,
  listTeams,
  saveFixtureRanking,
  setFixtureRankingLocked,
} from "@/lib/services";
import type { CscAthlete, Fixture, Team } from "@/lib/types/cms";
import { isAthleticsFormat, isRelayEvent } from "@/lib/utils/athletics";
import { orgCityLine } from "@/lib/utils/labels";
import { rankingLocksPodium } from "@/lib/utils/podium";

type RankDraft = {
  key: string;
  teamId: string;
  athleteId: string;
  name: string;
  orgName: string | null;
  city: string | null;
  rank: string;
};

function candidateKey(teamId: string, athleteId: string): string {
  return athleteId ? `a:${athleteId}` : `t:${teamId}`;
}

export function FixtureRankingBoard({
  fixture,
  readOnly = false,
  onChanged,
}: {
  fixture: Fixture;
  readOnly?: boolean;
  onChanged?: () => void;
}) {
  const relay = isRelayEvent(fixture.categoryName);
  const athleteMode = isAthleticsFormat(fixture.formatType) && !relay;
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [rows, setRows] = useState<RankDraft[]>([]);
  const [savedRanks, setSavedRanks] = useState<number[]>([]);
  const [lockAt, setLockAt] = useState<string | null>(fixture.rankingLockedAt);
  const locked = Boolean(lockAt);
  const canEdit = !readOnly && !locked;

  const load = useCallback(async () => {
    const [rankingRes, rosterRes] = await Promise.all([
      listFixtureRanking(fixture.id),
      athleteMode ? listCscAthletes(fixture.cscId) : listTeams({ cscId: fixture.cscId }),
    ]);
    if (rankingRes.error) toast.error(rankingRes.error.message);
    if (rosterRes.error) toast.error(rosterRes.error.message);
    const ranking = rankingRes.data ?? [];
    setSavedRanks(ranking.map((row) => row.rank));
    const rankByKey = new Map(
      ranking.map((row) => [candidateKey(row.teamId, row.athleteId), String(row.rank)]),
    );
    const next: RankDraft[] = athleteMode
      ? ((rosterRes.data ?? []) as CscAthlete[]).map((athlete) => ({
          key: candidateKey("", athlete.id),
          teamId: "",
          athleteId: athlete.id,
          name: athlete.name,
          orgName: athlete.orgName,
          city: athlete.city,
          rank: rankByKey.get(candidateKey("", athlete.id)) ?? "",
        }))
      : ((rosterRes.data ?? []) as Team[]).map((team) => ({
          key: candidateKey(team.id, ""),
          teamId: team.id,
          athleteId: "",
          name: team.name,
          orgName: team.orgName,
          city: team.city,
          rank: rankByKey.get(candidateKey(team.id, "")) ?? "",
        }));
    const ranked = next.filter((row) => row.rank);
    const unranked = next.filter((row) => !row.rank);
    ranked.sort((a, b) => Number(a.rank) - Number(b.rank));
    unranked.sort((a, b) => a.name.localeCompare(b.name));
    setRows([...ranked, ...unranked]);
    setReady(true);
  }, [athleteMode, fixture.cscId, fixture.id]);

  useEffect(() => {
    setLockAt(fixture.rankingLockedAt);
  }, [fixture.rankingLockedAt]);

  useEffect(() => {
    void load();
  }, [load]);

  const usedRanks = useMemo(
    () => new Set(rows.map((row) => row.rank).filter(Boolean)),
    [rows],
  );

  const onSave = async () => {
    const payload = rows
      .filter((row) => row.rank)
      .map((row) => ({
        rank: Number(row.rank),
        teamId: row.teamId || undefined,
        athleteId: row.athleteId || undefined,
      }));
    setSaving(true);
    const result = await saveFixtureRanking(fixture.id, payload);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Ranking saved.");
    await load();
    onChanged?.();
  };

  const onToggleLock = async () => {
    setLocking(true);
    const result = await setFixtureRankingLocked(fixture.id, !locked);
    setLocking(false);
    if (result.error || !result.data) {
      toast.error(result.error?.message ?? "Could not update ranking lock.");
      return;
    }
    setLockAt(result.data.rankingLockedAt);
    toast.success(locked ? "Ranking unlocked." : "Ranking locked. Podium can deliver medals.");
    await load();
    onChanged?.();
  };

  if (!ready) {
    return <PageSkeleton kind="board" />;
  }

  const visibleRows = canEdit ? rows : rows.filter((row) => row.rank);
  const canLock = rankingLocksPodium(savedRanks);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--ops-text-muted)]">
        {athleteMode
          ? "Add athletes on this category before ranking them."
          : "Add teams on this category before ranking them."}
      </p>
    );
  }

  if (readOnly && visibleRows.length === 0) {
    return (
      <p className="text-sm text-[var(--ops-text-muted)]">
        No ranking yet. Set places on the scoring desk.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-[var(--ops-text-muted)]">
        {readOnly
          ? locked
            ? "Places are locked. Medals are on the podium desk."
            : "Places set on the scoring desk. Lock 1st, 2nd and 3rd there before medals."
          : locked
            ? "Ranking is locked. Unlock it to change places, or open Podium to deliver medals."
            : "Set 1st, 2nd and 3rd, save, then lock. Podium only opens after lock."}
      </p>
      <div className="overflow-hidden rounded-2xl border border-[var(--ops-line)] bg-[var(--ops-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--ops-board-muted)] text-[var(--ops-text-muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Rank</th>
              <th className="px-4 py-2 font-medium">{athleteMode ? "Athlete" : "Team"}</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key} className="border-t border-[var(--ops-line)]">
                <td className="w-28 px-4 py-2">
                  {!canEdit ? (
                    <p className="font-medium">{row.rank || "—"}</p>
                  ) : (
                    <SoftSelect
                      value={row.rank}
                      onChange={(event) => {
                        const rank = event.target.value;
                        setRows((current) =>
                          current.map((item) => (item.key === row.key ? { ...item, rank } : item)),
                        );
                      }}
                      className={fieldClass}
                    >
                      <option value="">—</option>
                      {rows.map((_, index) => {
                        const value = String(index + 1);
                        if (usedRanks.has(value) && row.rank !== value) return null;
                        return (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        );
                      })}
                    </SoftSelect>
                  )}
                </td>
                <td className="px-4 py-2">
                  <p className="font-medium">{row.name}</p>
                  {orgCityLine(row.orgName, row.city) ? (
                    <p className="text-[11px] text-[var(--ops-text-muted)]">
                      {orgCityLine(row.orgName, row.city)}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {readOnly ? null : (
        <StickyActionBar>
          {locked ? (
            <SoftButton loading={locking} onClick={() => void onToggleLock()}>
              Unlock ranking
            </SoftButton>
          ) : (
            <>
              <SoftButton variant="primary" loading={saving} onClick={() => void onSave()}>
                Save ranking
              </SoftButton>
              <SoftButton
                loading={locking}
                disabled={!canLock}
                onClick={() => void onToggleLock()}
              >
                Lock ranking
              </SoftButton>
            </>
          )}
        </StickyActionBar>
      )}
    </div>
  );
}
