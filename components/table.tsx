"use client";

import { fieldClass } from "@/components/Modal";
import { cn } from "@/lib/utils/cn";
import { toggleSort, type SortState } from "@/lib/utils/table";

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
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm font-medium">
        Search
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
      </label>
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
  return (
    <th
      className={cn("px-4 py-3 font-medium", className)}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(toggleSort(sort, column))}
        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-slate-100 hover:text-slate-900"
      >
        {label}
        <span className="text-[10px] text-slate-400" aria-hidden>
          {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
