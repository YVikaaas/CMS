"use client";

import { useMemo } from "react";
import type { FixtureMatch, FixtureRoundType } from "@/lib/types/cms";
import { roundLabel } from "@/lib/utils/fixtures";
import {
  RESULTS_CARD_MIN_HEIGHT,
  RESULTS_ROUND_HEADER_HEIGHT,
  computeKnockoutLayout,
  connectorPath,
  hasThirdPlace,
  knockoutSvgWidth,
  knockoutThreadTypes,
  sortKnockoutMatches,
  sortRoundTypesPresent,
} from "@/lib/utils/resultsBoard";
import { ResultMatchCard } from "./ResultMatchCard";
import "./knockoutBoard.css";

export function KnockoutResultsBoard({
  matches,
  orgByTeamId,
}: {
  matches: FixtureMatch[];
  orgByTeamId: Record<string, string | null>;
}) {
  const presentTypes = useMemo(
    () => sortRoundTypesPresent(matches.map((row) => row.roundType)),
    [matches],
  );
  const thread = useMemo(() => knockoutThreadTypes(presentTypes), [presentTypes]);
  const showThird = hasThirdPlace(presentTypes);
  const rounds = useMemo(
    () => (showThird ? [...thread, "third_place" as const] : thread),
    [thread, showThird],
  );

  const visibleRounds = rounds;

  const matchesByRound = useMemo(() => {
    const map = {} as Record<FixtureRoundType, FixtureMatch[]>;
    for (const type of rounds) {
      map[type] = sortKnockoutMatches(matches.filter((row) => row.roundType === type));
    }
    return map;
  }, [matches, rounds]);

  const compact = visibleRounds.length < 2;
  const { layouts, totalHeight, connectors } = useMemo(
    () => computeKnockoutLayout(visibleRounds, matchesByRound),
    [visibleRounds, matchesByRound],
  );
  const svgWidth = knockoutSvgWidth(visibleRounds.length);
  const bodyHeight = compact ? undefined : totalHeight;
  const canvasHeight = compact ? undefined : RESULTS_ROUND_HEADER_HEIGHT + totalHeight;

  const paths = useMemo(
    () =>
      compact
        ? []
        : connectors
            .map((connector) => connectorPath(connector, layouts))
            .filter((path): path is string => Boolean(path)),
    [compact, connectors, layouts],
  );

  if (matches.length === 0) {
    return (
      <p className="py-8 text-center text-xs font-semibold text-[var(--ops-text-muted)]">No knockout matches yet.</p>
    );
  }

  return (
    <div className={`cms-knockout ${compact ? "cms-knockout--compact" : ""}`}>
      <div className="cms-knockout__scroll">
        <div
          className="cms-knockout__canvas"
          style={canvasHeight ? { height: canvasHeight, width: svgWidth } : undefined}
        >
          {!compact && paths.length > 0 ? (
            <svg
              className="cms-knockout__lines"
              width={svgWidth}
              height={canvasHeight}
              viewBox={`0 0 ${svgWidth} ${canvasHeight}`}
              aria-hidden
            >
              <g transform={`translate(0 ${RESULTS_ROUND_HEADER_HEIGHT})`}>
                {paths.map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>
            </svg>
          ) : null}
          <div className="cms-knockout__grid">
            {visibleRounds.map((type) => (
              <section key={type} id={`knockout-round-${type}`} className="cms-knockout__round">
                <h3 className="cms-knockout__round-label">{roundLabel(type)}</h3>
                <div className="cms-knockout__body" style={bodyHeight ? { height: bodyHeight } : undefined}>
                  {(matchesByRound[type] ?? []).map((match) => {
                    const layout = layouts.get(match.id);
                    return (
                      <div
                        key={match.id}
                        className="cms-knockout__slot"
                        style={
                          compact
                            ? undefined
                            : {
                                top: layout?.top ?? 0,
                                height: RESULTS_CARD_MIN_HEIGHT,
                              }
                        }
                      >
                        <ResultMatchCard match={match} orgByTeamId={orgByTeamId} variant="bracket" />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
