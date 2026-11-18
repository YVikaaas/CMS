export type SortDir = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  dir: SortDir;
};

export function toggleSort<K extends string>(
  current: SortState<K>,
  key: K,
): SortState<K> {
  if (current.key !== key) return { key, dir: "asc" };
  return { key, dir: current.dir === "asc" ? "desc" : "asc" };
}

export function matchesQuery(
  query: string,
  ...parts: Array<string | null | undefined>
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => (part ?? "").toLowerCase().includes(needle));
}

export function compareText(
  a: string | null | undefined,
  b: string | null | undefined,
  dir: SortDir,
): number {
  const n = (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" });
  return dir === "asc" ? n : -n;
}

export function compareNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  dir: SortDir,
): number {
  const left = a ?? 0;
  const right = b ?? 0;
  const n = left === right ? 0 : left < right ? -1 : 1;
  return dir === "asc" ? n : -n;
}

/** One page of rows. Clamps `page` so a filter that shrinks the list never shows an empty page. */
export function pageRows<T>(rows: T[], page: number, perPage: number): { rows: T[]; page: number } {
  const last = Math.max(0, Math.ceil(rows.length / perPage) - 1);
  const safe = Math.min(Math.max(0, page), last);
  return { rows: rows.slice(safe * perPage, safe * perPage + perPage), page: safe };
}
