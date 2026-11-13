import type { FixtureMatch, FixtureRoundType } from "@/lib/types/cms";
import { KNOCKOUT_ROUND_TYPES, roundNumber } from "@/lib/utils/fixtures";

export const RESULTS_CARD_MIN_HEIGHT = 168;
export const RESULTS_SLOT_GAP = 28;
export const RESULTS_COLUMN_WIDTH = 300;
export const RESULTS_CONNECTOR_WIDTH = 48;
export const RESULTS_ROUND_HEADER_HEIGHT = 36;

const KNOCKOUT_THREAD: FixtureRoundType[] = ["quarter_final", "semi_final", "final"];

export function formatMatchWhen(iso: string | null | undefined): string {
  if (!iso) return "Time TBA";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Time TBA";
  const day = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day} · ${time}`;
}

export function formatMatchId(label: string, matchNumber: number): string {
  if (/^M-/i.test(label.trim())) return label.trim();
  return `M-${matchNumber}`;
}

export function isResultScoreVisible(status: FixtureMatch["status"]): boolean {
  return status === "completed" || status === "in_progress";
}

export function knockoutThreadTypes(types: FixtureRoundType[]): FixtureRoundType[] {
  return KNOCKOUT_THREAD.filter((type) => types.includes(type));
}

export function hasThirdPlace(types: FixtureRoundType[]): boolean {
  return types.includes("third_place");
}

export function sortKnockoutMatches(matches: FixtureMatch[]): FixtureMatch[] {
  return [...matches].sort((a, b) => a.matchNumber - b.matchNumber);
}

export type KnockoutLayout = {
  matchId: string;
  roundIndex: number;
  top: number;
  centerY: number;
};

export type KnockoutConnector = {
  fromMatchIds: string[];
  toMatchId: string;
  roundIndex: number;
};

function feederNumbers(nextMatchNumber: number): [number, number] {
  const top = (nextMatchNumber - 1) * 2 + 1;
  return [top, top + 1];
}

function inferFeeders(prev: FixtureMatch[], next: FixtureMatch): FixtureMatch[] {
  const [a, b] = feederNumbers(next.matchNumber);
  return prev.filter((row) => row.matchNumber === a || row.matchNumber === b);
}

export function buildKnockoutConnectors(
  rounds: FixtureRoundType[],
  matchesByRound: Partial<Record<FixtureRoundType, FixtureMatch[]>>,
): KnockoutConnector[] {
  const connectors: KnockoutConnector[] = [];
  for (let index = 0; index < rounds.length - 1; index += 1) {
    const prev = sortKnockoutMatches(matchesByRound[rounds[index]!] ?? []);
    const next = sortKnockoutMatches(matchesByRound[rounds[index + 1]!] ?? []);
    for (const match of next) {
      const feeders = inferFeeders(prev, match);
      if (feeders.length === 0) continue;
      connectors.push({
        roundIndex: index,
        fromMatchIds: feeders.map((row) => row.id),
        toMatchId: match.id,
      });
    }
  }
  return connectors;
}

function resolveCollisions(layouts: Map<string, KnockoutLayout>, matchIds: string[], cardHeight: number): void {
  const rows = matchIds
    .map((id) => layouts.get(id))
    .filter((row): row is KnockoutLayout => Boolean(row))
    .sort((a, b) => a.top - b.top);
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1]!;
    const curr = rows[i]!;
    const minTop = prev.top + cardHeight + RESULTS_SLOT_GAP;
    if (curr.top < minTop) {
      curr.top = minTop;
      curr.centerY = curr.top + cardHeight / 2;
    }
  }
}

export function computeKnockoutLayout(
  rounds: FixtureRoundType[],
  matchesByRound: Partial<Record<FixtureRoundType, FixtureMatch[]>>,
  cardHeight = RESULTS_CARD_MIN_HEIGHT,
): { layouts: Map<string, KnockoutLayout>; totalHeight: number; connectors: KnockoutConnector[] } {
  const layouts = new Map<string, KnockoutLayout>();
  const connectors = buildKnockoutConnectors(rounds, matchesByRound);
  if (rounds.length === 0) return { layouts, totalHeight: 0, connectors };

  const slotHeight = cardHeight + RESULTS_SLOT_GAP;
  const first = sortKnockoutMatches(matchesByRound[rounds[0]!] ?? []);
  first.forEach((match, index) => {
    const top = index * slotHeight;
    layouts.set(match.id, {
      matchId: match.id,
      roundIndex: 0,
      top,
      centerY: top + cardHeight / 2,
    });
  });
  resolveCollisions(layouts, first.map((row) => row.id), cardHeight);

  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex += 1) {
    const roundMatches = sortKnockoutMatches(matchesByRound[rounds[roundIndex]!] ?? []);
    const placed = new Set<string>();
    for (const connector of connectors.filter((row) => row.roundIndex === roundIndex - 1)) {
      const centers = connector.fromMatchIds
        .map((id) => layouts.get(id)?.centerY)
        .filter((y): y is number => y != null);
      if (centers.length === 0) continue;
      const centerY = centers.reduce((sum, y) => sum + y, 0) / centers.length;
      layouts.set(connector.toMatchId, {
        matchId: connector.toMatchId,
        roundIndex,
        top: centerY - cardHeight / 2,
        centerY,
      });
      placed.add(connector.toMatchId);
    }

    let orphanBase = 0;
    for (const id of placed) {
      const layout = layouts.get(id);
      if (layout) orphanBase = Math.max(orphanBase, layout.top + slotHeight);
    }
    let orphanIndex = 0;
    for (const match of roundMatches) {
      if (placed.has(match.id)) continue;
      const top = orphanBase + orphanIndex * slotHeight;
      layouts.set(match.id, {
        matchId: match.id,
        roundIndex,
        top,
        centerY: top + cardHeight / 2,
      });
      orphanIndex += 1;
    }
    resolveCollisions(layouts, roundMatches.map((row) => row.id), cardHeight);
  }

  let totalHeight = cardHeight;
  for (const layout of layouts.values()) {
    totalHeight = Math.max(totalHeight, layout.top + cardHeight);
  }
  return { layouts, totalHeight, connectors };
}

export function knockoutColumnLeft(roundIndex: number): number {
  return roundIndex * (RESULTS_COLUMN_WIDTH + RESULTS_CONNECTOR_WIDTH);
}

export function knockoutSvgWidth(roundCount: number): number {
  if (roundCount <= 0) return 0;
  return roundCount * RESULTS_COLUMN_WIDTH + (roundCount - 1) * RESULTS_CONNECTOR_WIDTH;
}

export function connectorPath(
  connector: KnockoutConnector,
  layouts: Map<string, KnockoutLayout>,
): string | null {
  const to = layouts.get(connector.toMatchId);
  if (!to) return null;
  const from = connector.fromMatchIds
    .map((id) => layouts.get(id))
    .filter((row): row is KnockoutLayout => Boolean(row))
    .sort((a, b) => a.centerY - b.centerY);
  if (from.length === 0) return null;

  const colLeft = knockoutColumnLeft(connector.roundIndex);
  const fromX = colLeft + RESULTS_COLUMN_WIDTH;
  const midX = colLeft + RESULTS_COLUMN_WIDTH + RESULTS_CONNECTOR_WIDTH / 2;
  const toX = colLeft + RESULTS_COLUMN_WIDTH + RESULTS_CONNECTOR_WIDTH;

  if (from.length >= 2) {
    const y1 = from[0]!.centerY;
    const y2 = from[from.length - 1]!.centerY;
    const midY = to.centerY;
    return [
      `M ${fromX} ${y1} H ${midX}`,
      `M ${fromX} ${y2} H ${midX}`,
      `M ${midX} ${y1} V ${y2}`,
      `M ${midX} ${midY} H ${toX}`,
    ].join(" ");
  }

  const y1 = from[0]!.centerY;
  const y2 = to.centerY;
  if (Math.abs(y1 - y2) < 1) return `M ${fromX} ${y1} H ${toX}`;
  return [`M ${fromX} ${y1} H ${midX}`, `M ${midX} ${y1} V ${y2}`, `M ${midX} ${y2} H ${toX}`].join(" ");
}

export function isKnockoutRoundType(type: FixtureRoundType): boolean {
  return (KNOCKOUT_ROUND_TYPES as FixtureRoundType[]).includes(type);
}

export function sortRoundTypesPresent(types: Iterable<FixtureRoundType>): FixtureRoundType[] {
  return [...new Set(types)].sort((a, b) => roundNumber(a) - roundNumber(b));
}
