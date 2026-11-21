import { formatDateStamp } from "./dates";
import { workbook } from "./entrySheet";
import { slugify } from "./slug";

export type ExportFormat = "csv" | "xlsx";

export type ExportColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

/** Header row + one row per item; empty cells become "". Pure, so it is easy to test. */
export function toExportMatrix<T>(rows: T[], columns: ExportColumn<T>[]): Array<Array<string | number>> {
  return [columns.map((column) => column.header), ...rows.map((row) => columns.map((column) => column.value(row) ?? ""))];
}

/** Download rows as CSV or Excel. Pass the filtered + sorted list, not just the visible page. */
export async function exportTable<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  name: string,
  format: ExportFormat,
): Promise<void> {
  const XLSX = await workbook();
  const sheet = XLSX.utils.aoa_to_sheet(toExportMatrix(rows, columns));
  sheet["!cols"] = columns.map((column) => ({ wch: Math.max(12, column.header.length + 4) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Export");
  const stamp = formatDateStamp();
  XLSX.writeFile(book, `${slugify(name) || "export"}-${stamp}.${format}`, { bookType: format });
}
