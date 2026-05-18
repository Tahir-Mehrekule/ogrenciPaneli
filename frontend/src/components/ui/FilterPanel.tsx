"use client";

import React from "react";
import { X } from "lucide-react";

export interface ActiveFilter {
  key: string;
  label: string;
  displayValue: string;
}

export interface SortOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  activeFilters: ActiveFilter[];
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  sortOptions?: SortOption[];
  onSortChange?: (sortBy: string, order: "asc" | "desc") => void;
  resultCount?: number;
}

export function FilterPanel({
  activeFilters,
  onRemoveFilter,
  onClearAll,
}: FilterPanelProps) {
  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800/60 bg-gray-900/30 px-4 py-2.5 backdrop-blur-sm">
      <span className="text-xs text-gray-500 shrink-0">Aktif:</span>
      {activeFilters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-700/40 bg-indigo-900/30 px-2.5 py-1 text-xs font-medium text-indigo-300"
        >
          <span className="text-indigo-500">{filter.label}:</span>
          {filter.displayValue}
          <button
            onClick={() => onRemoveFilter(filter.key)}
            className="ml-0.5 rounded text-indigo-400 transition-colors hover:text-indigo-200"
            aria-label={`${filter.label} filtresini kaldır`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="px-1 text-xs text-red-400 transition-colors hover:text-red-300"
      >
        Tümünü temizle
      </button>
    </div>
  );
}
