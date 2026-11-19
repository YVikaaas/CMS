"use client";

import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import TablePagination from "@mui/material/TablePagination";
import Typography from "@mui/material/Typography";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsSort,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeCsv,
} from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SoftButton, SoftSearch, SoftSelect } from "@/components/ops";
import type { ExportFormat } from "@/lib/utils/exportTable";
import { cn } from "@/lib/utils/cn";
import { toggleSort, type SortState } from "@/lib/utils/table";

export type TableFilterSpec = {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Text for the empty value, e.g. "All" or "Pick sport first". */
  allLabel?: string;
};

/**
 * Table card: title + result count, export and primary action on the right;
 * search + compact filter dropdowns; removable chips for active filters; the table; the pager.
 * Put a plain <table> inside; `.ops-table` in globals.css styles it.
 */
export function TableCard({
  title,
  count,
  tabs,
  search,
  filters,
  toolbar,
  exportMenu,
  action,
  onClearAll,
  footer,
  plain,
  children,
}: {
  title: string;
  /** Rows after search and filters (all pages). */
  count?: number;
  /** Underline tabs under the title, e.g. one sport per tab. */
  tabs?: ReactNode;
  search?: ReactNode;
  filters?: TableFilterSpec[];
  /** Extra controls next to the filters. */
  toolbar?: ReactNode;
  exportMenu?: ReactNode;
  action?: ReactNode;
  /** Clears search and every filter; shown with the active-filter chips. */
  onClearAll?: () => void;
  footer?: ReactNode;
  /** Skip the bordered table shell; use for stacked cards. */
  plain?: boolean;
  children: ReactNode;
}) {
  const active = (filters ?? []).filter((filter) => filter.value);
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          {typeof count === "number" ? (
            <span className="rounded-lg bg-[var(--ops-board-muted)] px-2 py-0.5 text-sm tabular-nums text-[var(--ops-text-muted)]" aria-label={`${count} results`}>
              {count}
            </span>
          ) : null}
        </div>
        {exportMenu || action ? (
          <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center gap-2">
            {exportMenu}
            {action}
          </div>
        ) : null}
      </div>
      {tabs ? <div className="-mx-6 px-6">{tabs}</div> : null}
      {search || filters?.length || toolbar ? (
        <div className="flex flex-wrap items-center gap-3">
          {search}
          {filters?.map((filter) => <TableFilter key={filter.id} filter={filter} />)}
          {toolbar}
        </div>
      ) : null}
      {active.length && onClearAll ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {active.map((filter) => (
            <Chip
              key={filter.id}
              size="small"
              label={`${filter.label}: ${filter.options.find((option) => option.value === filter.value)?.label ?? filter.value}`}
              onDelete={() => filter.onChange("")}
              className="h-8 bg-[var(--ops-primary-soft)] text-[var(--ops-text)]"
            />
          ))}
          <button type="button" onClick={onClearAll} className="min-h-8 rounded-lg px-2 text-sm font-medium text-[var(--ops-primary)] hover:bg-[var(--ops-surface-hover)]">
            Clear all
          </button>
        </div>
      ) : null}
      {plain ? children : <div className="ops-table">{children}</div>}
      {footer}
    </Card>
  );
}

/** Compact labelled dropdown: "Sport  All ▾". */
function TableFilter({ filter }: { filter: TableFilterSpec }) {
  return (
    <SoftSelect
      size="small"
      value={filter.value}
      disabled={filter.disabled}
      onChange={(event) => filter.onChange(event.target.value)}
      aria-label={filter.label}
      className="min-w-[8.5rem] [&_.MuiSelect-select]:font-medium"
      startIcon={<span className="text-sm text-[var(--ops-text-muted)]">{filter.label}</span>}
    >
      <option value="">{filter.allLabel ?? "All"}</option>
      {filter.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </SoftSelect>
  );
}

/** Export button with a CSV / Excel menu. Export the filtered, sorted rows (all pages). */
export function TableExport({
  count,
  onExport,
}: {
  count: number;
  onExport: (format: ExportFormat) => Promise<void>;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (format: ExportFormat) => {
    setAnchor(null);
    setBusy(true);
    try {
      await onExport(format);
    } catch {
      toast.error("Export failed. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SoftButton
        onClick={(event) => setAnchor(event.currentTarget)}
        disabled={count === 0}
        loading={busy}
        aria-haspopup="menu"
        startIcon={<IconDownload size={18} />}
      >
        Export
      </SoftButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => void run("csv")}>
          <ListItemIcon>
            <IconFileTypeCsv size={18} />
          </ListItemIcon>
          CSV ({count} rows)
        </MenuItem>
        <MenuItem onClick={() => void run("xlsx")}>
          <ListItemIcon>
            <IconFileSpreadsheet size={18} />
          </ListItemIcon>
          Excel ({count} rows)
        </MenuItem>
      </Menu>
    </>
  );
}

export function TableSearch({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <SoftSearch
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full flex-none sm:w-72"
    />
  );
}

export function TablePager({
  count,
  page,
  perPage,
  onPage,
  onPerPage,
}: {
  count: number;
  page: number;
  perPage: number;
  onPage: (page: number) => void;
  onPerPage: (perPage: number) => void;
}) {
  return (
    <TablePagination
      component="div"
      // The theme's 70px app-bar Toolbar style also hits this toolbar; reset it and let it wrap on phones.
      className="[&_.MuiTablePagination-toolbar]:min-h-[52px] [&_.MuiTablePagination-toolbar]:flex-wrap [&_.MuiTablePagination-toolbar]:justify-end [&_.MuiTablePagination-toolbar]:gap-x-2 [&_.MuiTablePagination-toolbar]:px-0 [&_.MuiTablePagination-spacer]:hidden [&_.MuiTablePagination-actions]:ml-2"
      count={count}
      page={page}
      rowsPerPage={perPage}
      rowsPerPageOptions={[10, 25, 50]}
      onPageChange={(_, next) => onPage(next)}
      onRowsPerPageChange={(event) => {
        onPerPage(Number(event.target.value));
        onPage(0);
      }}
    />
  );
}

export function TableControls({
  search,
  onSearch,
  placeholder = "Search…",
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <TableSearch value={search} onChange={onSearch} placeholder={placeholder} />
      {children}
    </div>
  );
}

export function SortTh<K extends string>({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string;
  column: K;
  sort: SortState<K>;
  onSort: (next: SortState<K>) => void;
  className?: string;
}) {
  const active = sort.key === column;
  const Icon = active ? (sort.dir === "asc" ? IconArrowUp : IconArrowDown) : IconArrowsSort;
  return (
    <th className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(toggleSort(sort, column))}
        className="inline-flex min-h-11 items-center gap-1.5 font-semibold"
      >
        {label}
        <Icon size={12} aria-hidden className={cn(!active && "opacity-40")} />
      </button>
    </th>
  );
}
