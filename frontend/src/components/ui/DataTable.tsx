"use client";

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2, Filter, X } from 'lucide-react';
import { Button } from './Button';

interface ColumnFilterOption {
  value: string;
  label: string;
}

interface ColumnFilter {
  type?: 'select' | 'text';
  value?: string;
  placeholder?: string;
  options?: ColumnFilterOption[];
  onChange: (value: string) => void;
  onClear?: () => void;
}

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  filter?: ColumnFilter;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  totalPages,
  sortBy,
  sortOrder,
  loading = false,
  emptyMessage = "Veri bulunamadı.",
  onSort,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: DataTableProps<T>) {
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);
  
  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    if (sortBy === columnKey) {
      onSort(columnKey, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnKey, 'asc');
    }
  };

  const hasActiveFilter = (col: Column<T>) => Boolean(col.filter?.value);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/80 text-xs uppercase text-gray-400 border-b border-gray-700/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`relative px-6 py-4 font-medium tracking-wider ${col.headerClassName ?? ''} ${(col.sortable || col.filter) ? 'cursor-pointer hover:bg-gray-700/50 transition-colors select-none' : ''}`}
                    onClick={() => {
                      if (col.filter) {
                        setOpenFilterKey((current) => current === col.key ? null : col.key);
                        return;
                      }
                      if (col.sortable) handleSort(col.key);
                    }}
                    title={col.filter ? 'Filtrelemek için tıklayın' : col.sortable ? 'Sıralamak için tıklayın' : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.filter && (
                        <span className={`flex-shrink-0 transition-colors ${hasActiveFilter(col) ? 'text-indigo-400' : 'text-gray-500'}`}>
                          <Filter className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {col.sortable && sortBy === col.key && (
                        <span className="text-blue-400 flex-shrink-0">
                          {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      )}
                      {col.sortable && sortBy !== col.key && (
                        <span className="text-gray-500 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                          <ChevronsUpDown className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    {col.filter && openFilterKey === col.key && (
                      <div
                        className="absolute left-4 top-full z-30 mt-2 w-56 rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {col.header}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenFilterKey(null)}
                            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                            aria-label="Filtre menüsünü kapat"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {(col.filter.type ?? 'select') === 'text' ? (
                          <input
                            autoFocus
                            value={col.filter.value ?? ''}
                            onChange={(e) => col.filter?.onChange(e.target.value)}
                            placeholder={col.filter.placeholder ?? 'Filtrele...'}
                            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm normal-case tracking-normal text-gray-200 outline-none focus:border-indigo-500"
                          />
                        ) : (
                          <div className="max-h-64 overflow-y-auto">
                            {(col.filter.options ?? []).map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  col.filter?.onChange(option.value);
                                  setOpenFilterKey(null);
                                }}
                                className={`block w-full rounded-lg px-3 py-2 text-left text-sm normal-case tracking-normal transition-colors ${
                                  (col.filter?.value ?? '') === option.value
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-800'
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {hasActiveFilter(col) && (
                          <button
                            type="button"
                            onClick={() => {
                              col.filter?.onClear?.();
                              col.filter?.onChange('');
                              setOpenFilterKey(null);
                            }}
                            className="mt-2 w-full rounded-lg border border-red-900/50 bg-red-500/10 px-3 py-2 text-xs font-semibold normal-case tracking-normal text-red-400 transition-colors hover:bg-red-500/20"
                          >
                            Filtreyi temizle
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50 relative">
              {loading && (
                <tr>
                  <td colSpan={columns.length} className="h-32 text-center">
                    <div className="flex items-center justify-center text-blue-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                  </td>
                </tr>
              )}
              
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <p>{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && data.map((item, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(item)}
                  className={`hover:bg-gray-800/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 whitespace-nowrap ${col.className ?? ''}`}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {(total > 0 || page > 1) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400 bg-gray-900/30 p-4 rounded-xl border border-gray-800/50">
          <div className="flex items-center gap-4">
            <span>Toplam <strong className="text-white">{total}</strong> kayıt</span>
            
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span>Göster:</span>
                <select 
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-700 text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange?.(page - 1)}
              className="px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2">
              Sayfa <strong className="text-white">{page}</strong> / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange?.(page + 1)}
              className="px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
