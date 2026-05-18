import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
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
  
  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    if (sortBy === columnKey) {
      onSort(columnKey, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnKey, 'asc');
    }
  };

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
                    className={`px-6 py-4 font-medium tracking-wider ${col.headerClassName ?? ''} ${col.sortable ? 'cursor-pointer hover:bg-gray-700/50 transition-colors select-none' : ''}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                    title={col.sortable ? 'Sıralamak için tıklayın' : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
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
