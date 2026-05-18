"use client";

import { useState, useMemo } from "react";

interface SortableOptions {
  defaultKey?: string;
  defaultOrder?: "asc" | "desc";
}

/**
 * Client-side sort state + sorted data.
 * For server-side paginated tables: use sortKey/sortOrder for API params,
 * ignore the sorted output (it applies within the fetched page only).
 */
export function useSortableTable<T extends object>(
  data: T[],
  options?: SortableOptions
) {
  const [sortKey, setSortKey] = useState<string>(options?.defaultKey ?? "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    options?.defaultOrder ?? "desc"
  );

  const toggleSort = (key: string, forcedOrder?: "asc" | "desc") => {
    if (forcedOrder) {
      setSortKey(key);
      setSortOrder(forcedOrder);
      return;
    }
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey || !data.length) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey] ?? "";
      const bVal = (b as Record<string, unknown>)[sortKey] ?? "";
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), "tr", { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortOrder]);

  return { sorted, sortKey, sortOrder, toggleSort };
}
