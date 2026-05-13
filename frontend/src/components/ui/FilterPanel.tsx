"use client";

import React from "react";
import { X, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";

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
  sortBy,
  sortOrder = "desc",
  sortOptions,
  onSortChange,
  resultCount,
}: FilterPanelProps) {
  const hasActive = activeFilters.length > 0;
  const showPanel = hasActive || (sortOptions && sortOptions.length > 0);

  if (!showPanel) return null;

  const handleSortByChange = (newSortBy: string) => {
    if (!onSortChange) return;
    if (newSortBy === sortBy) {
      onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc");
    } else {
      onSortChange(newSortBy, "desc");
    }
  };

  const toggleOrder = () => {
    if (!onSortChange || !sortBy) return;
    onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc");
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-800/60 bg-gray-900/30 px-4 py-2.5 backdrop-blur-sm">
      {/* Sol: aktif filtre chipleri */}
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        {hasActive && (
          <>
            <span className="text-xs text-gray-500 shrink-0">Aktif:</span>
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-900/30 border border-indigo-700/40 px-2.5 py-1 text-xs font-medium text-indigo-300"
              >
                <span className="text-indigo-500">{f.label}:</span>
                {f.displayValue}
                <button
                  onClick={() => onRemoveFilter(f.key)}
                  className="ml-0.5 rounded text-indigo-400 hover:text-indigo-200 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={onClearAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors px-1"
            >
              Tümünü temizle
            </button>
          </>
        )}

        {!hasActive && resultCount !== undefined && (
          <span className="text-xs text-gray-500">
            <span className="text-white font-medium">{resultCount}</span> kayıt
          </span>
        )}
      </div>

      {/* Sağ: sıralama kontrolleri */}
      {sortOptions && sortOptions.length > 0 && onSortChange && (
        <div className="flex items-center gap-2 shrink-0">
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs text-gray-500">Sırala:</span>
          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => handleSortByChange(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleOrder}
              title={sortOrder === "asc" ? "Artan" : "Azalan"}
              className="flex items-center justify-center rounded-lg border border-gray-700 bg-gray-800 p-1 text-gray-400 hover:text-indigo-400 hover:border-indigo-700 transition-colors"
            >
              {sortOrder === "asc" ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
