"use client";

import Card from "@mui/material/Card";
import TablePagination from "@mui/material/TablePagination";
import Typography from "@mui/material/Typography";
import { IconArrowDown, IconArrowUp, IconArrowsSort } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { SoftSearch } from "@/components/ops";
import { cn } from "@/lib/utils/cn";
import { toggleSort, type SortState } from "@/lib/utils/table";

/**
 * NiceAdmin "User Table" layout: card with a title row (search on the right),
 * a toolbar row (filters left, primary action right), the bordered table, then the pager.
 * Put a plain <table> inside; `.ops-table` in globals.css styles it.
 */
export function TableCard({
  title,
  search,
  toolbar,
  action,
  footer,
  children,
}: {
  title: string;
  search?: ReactNode;
  toolbar?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {search}
      </div>
      {toolbar || action ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{toolbar}</div>
          {action ? <div className="ml-auto shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="ops-table">{children}</div>
      {footer}
    </Card>
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
      className="w-full flex-none sm:w-[260px]"
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
