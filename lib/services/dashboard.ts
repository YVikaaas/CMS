import { createClient } from "@/lib/supabase/client";
import type { DashboardSummary, ServiceResult } from "@/lib/types/cms";
import { toServiceError } from "./errors";

export async function getDashboardSummary(
  championshipId: string,
): Promise<ServiceResult<DashboardSummary>> {
  const supabase = createClient();
  const { data: csmRows, error: csmError } = await supabase
    .from("competition_sport_map")
    .select("id")
    .eq("competition_id", championshipId)
    .is("deleted_at", null);
  if (csmError) return { data: null, error: toServiceError(csmError) };
  const csmIds = (csmRows ?? []).map((row) => row.id);

  let categoryCount = 0;
  let teamCount = 0;
  if (csmIds.length > 0) {
    const { data: cscRows, error: cscError } = await supabase
      .from("competition_sport_category_map")
      .select("id")
      .in("competition_sport_id", csmIds)
      .is("deleted_at", null);
    if (cscError) return { data: null, error: toServiceError(cscError) };
    const cscIds = (cscRows ?? []).map((row) => row.id);
    categoryCount = cscIds.length;
    if (cscIds.length > 0) {
      const { data: teams, error: teamError } = await supabase
        .from("team")
        .select("id")
        .in("competition_sport_category_map_id", cscIds)
        .is("deleted_at", null);
      if (teamError) return { data: null, error: toServiceError(teamError) };
      teamCount = (teams ?? []).length;
    }
  }

  return {
    data: {
      sportCount: csmIds.length,
      categoryCount,
      teamCount,
    },
    error: null,
  };
}
