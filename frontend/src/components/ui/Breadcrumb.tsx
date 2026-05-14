/**
 * Breadcrumb navigasyon bileşeni — FE-14
 *
 * Kullanıcının hiyerarşik konumunu gösterir. Detay sayfalarında
 * nerede olduğunu anlamak ve üst seviyelere hızlıca dönmek için.
 *
 * Kullanım:
 *   <Breadcrumb
 *     items={[
 *       { label: "Projeler", href: "/dashboard/projects" },
 *       { label: "Proje Adı" },    // href verilmezse aktif sayfa (tıklanamaz)
 *     ]}
 *   />
 */

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  /** Ekranda gösterilecek metin */
  label: string;
  /** Link hedefi — verilmezse son öğe olarak stilize edilir */
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Ana sayfayı (/) breadcrumb başına ekle (varsayılan: true) */
  showHome?: boolean;
  className?: string;
}

export function Breadcrumb({ items, showHome = true, className }: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = showHome
    ? [{ label: "Ana Sayfa", href: "/dashboard" }, ...items]
    : items;

  return (
    <nav
      aria-label="Sayfa konumu"
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {/* Separator */}
              {index === 0 && showHome ? (
                <Home className="h-3.5 w-3.5 text-gray-500 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronRight
                  className="h-3.5 w-3.5 text-gray-600 shrink-0"
                  aria-hidden="true"
                />
              )}

              {/* Item */}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    "font-medium truncate max-w-[180px]",
                    isLast
                      ? "text-gray-200"
                      : "text-gray-400 hover:text-gray-300"
                  )}
                  aria-current={isLast ? "page" : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-gray-400 hover:text-indigo-400 transition-colors truncate max-w-[180px]"
                  title={item.label}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
