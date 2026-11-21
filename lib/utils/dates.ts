function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateParts(value: string | Date): { year: number; month: number; day: number } | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }
  const raw = value.trim();
  if (!raw) return null;
  const calendar = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (calendar) {
    return { year: Number(calendar[1]), month: Number(calendar[2]), day: Number(calendar[3]) };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return { year: parsed.getFullYear(), month: parsed.getMonth() + 1, day: parsed.getDate() };
}

/** Calendar date as `dd mm yyyy`, e.g. `16 12 2026`. */
export function formatDate(value: string | Date | null | undefined, empty = "—"): string {
  if (value == null || value === "") return empty;
  const parts = dateParts(value);
  if (!parts) return empty;
  return `${pad(parts.day)} ${pad(parts.month)} ${parts.year}`;
}

export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  empty = "—",
): string {
  const from = formatDate(start, "");
  const to = formatDate(end, "");
  if (from && to) return `${from} – ${to}`;
  return from || to || empty;
}

/** Instant as `dd mm yyyy · HH:mm`. */
export function formatDateTime(value: string | Date | null | undefined, empty = "—"): string {
  if (value == null || value === "") return empty;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return empty;
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${formatDate(date)} · ${time}`;
}

/** Filename-safe stamp `dd-mm-yyyy`. */
export function formatDateStamp(value: Date = new Date()): string {
  return formatDate(value, "").replaceAll(" ", "-");
}
