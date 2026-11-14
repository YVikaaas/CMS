import type { PodiumHolder, PodiumRank } from "@/lib/types/cms";

export const PODIUM_RANKS: PodiumRank[] = [1, 2, 3];

export function isPodiumRank(rank: number): rank is PodiumRank {
  return rank === 1 || rank === 2 || rank === 3;
}

export function rankingLocksPodium(ranks: number[]): boolean {
  return PODIUM_RANKS.every((rank) => ranks.includes(rank));
}

export function podiumPlaceLabel(rank: PodiumRank): string {
  if (rank === 1) return "1st · Gold";
  if (rank === 2) return "2nd · Silver";
  return "3rd · Bronze";
}

export function podiumTone(rank: PodiumRank): "warning" | "neutral" | "info" {
  if (rank === 1) return "warning";
  if (rank === 2) return "neutral";
  return "info";
}

export function podiumDeliveryLabel(holders: PodiumHolder[]): string {
  const total = holders.length;
  const done = holders.filter((row) => row.deliveredAt).length;
  if (total === 0) return "No medals";
  if (done === 0) return "Not delivered";
  if (done === total) return "All delivered";
  return `${done}/${total} delivered`;
}
