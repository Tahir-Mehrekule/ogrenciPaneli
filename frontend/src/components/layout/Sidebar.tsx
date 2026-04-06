"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FolderKanban,
  FileText,
  Settings,
  BarChart3,
} from "lucide-react";

export const Sidebar = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const role = user?.role?.toUpperCase();

  // Role dayalı menü oluşturma stratejisi
  const getNavLinks = () => {
    const baseLinks = [
      { name: "Genel Bakış", href: "/dashboard", icon: LayoutDashboard },
    ];

    if (role === "STUDENT") {
      return [
        ...baseLinks,
        { name: "Ders Kataloğu", href: "/dashboard/courses", icon: BookOpen },
        { name: "Projelerim", href: "/dashboard/projects", icon: FolderKanban },
        { name: "Haftalık Raporlar", href: "/dashboard/reports", icon: FileText },
      ];
    }

    if (role === "TEACHER") {
      return [
        ...baseLinks,
        { name: "Verdiğim Dersler", href: "/dashboard/courses", icon: BookOpen },
        { name: "Gelen Projeler", href: "/dashboard/projects", icon: FolderKanban },
        { name: "Gelen Raporlar", href: "/dashboard/reports", icon: FileText },
      ];
    }

    if (role === "ADMIN") {
      return [
        ...baseLinks,
        { name: "Sistem İstatistikleri", href: "/dashboard/admin", icon: BarChart3 },
        { name: "Tüm Dersler", href: "/dashboard/courses", icon: BookOpen },
        { name: "Tüm Projeler", href: "/dashboard/projects", icon: FolderKanban },
        { name: "Tüm Raporlar", href: "/dashboard/reports", icon: FileText },
        { name: "Ayarlar", href: "/dashboard/settings", icon: Settings },
      ];
    }

    return baseLinks;
  };

  const links = getNavLinks();

  return (
    <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-16 items-center px-6 border-b border-transparent">
        {/* Boş alan (Eğer Navbar içeriği kaydırmak istenirse logoyu buraya alabiliriz) */}
      </div>
      
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="flex flex-col gap-1 px-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Ana Menü
          </p>
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-50"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
                  )}
                />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Alanı */}
      <div className="border-t border-gray-200 p-4 dark:border-slate-700">
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Giriş Yapılan Rol</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{user?.role}</p>
        </div>
      </div>
    </aside>
  );
};
