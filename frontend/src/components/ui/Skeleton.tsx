/**
 * Skeleton bileşeni — FE-13
 *
 * Veri yüklenirken içerik yerine gösterilen animasyonlu yer tutucular.
 * "Yükleniyor..." metninin yerini alır ve kullanıcı deneyimini iyileştirir.
 *
 * Kullanım:
 *   <Skeleton className="h-6 w-48" />
 *   <SkeletonCard />
 *   <SkeletonTable rows={5} cols={4} />
 */

import React from "react";
import { cn } from "@/lib/utils";

/* ─── Temel Skeleton ─── */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-gray-800/70",
        className
      )}
      aria-hidden="true"
    />
  );
}

/* ─── Kart Skeleton (dashboard ve liste sayfaları için) ─── */

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 space-y-3"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-lg" />
        <Skeleton className="h-6 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/* ─── Tablo Satırı Skeleton ─── */

interface SkeletonTableProps {
  /** Kaç satır gösterilsin (varsayılan: 5) */
  rows?: number;
  /** Kaç sütun gösterilsin (varsayılan: 4) */
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div className="space-y-1" aria-hidden="true" aria-label="Yükleniyor">
      {/* Başlık satırı */}
      <div
        className="flex gap-4 px-4 py-3 border-b border-gray-800"
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Veri satırları */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 px-4 py-3 border-b border-gray-800/50"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className={cn("h-4 flex-1", col === 0 ? "max-w-[40px] rounded-full" : "")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─── Profil / Detay Sayfası Skeleton ─── */

export function SkeletonDetail() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Başlık alanı */}
      <div className="space-y-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      {/* İçerik kartı */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      {/* İkinci kart */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
        <Skeleton className="h-5 w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-3 w-2/3 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
