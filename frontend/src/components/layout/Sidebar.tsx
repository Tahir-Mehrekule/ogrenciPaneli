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
  UserCheck,
  Users,
  GraduationCap,
  X,
} from "lucide-react";

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  const { user } = useAuth();
  const pathname = usePathname();
  const role = user?.role?.toUpperCase();

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
        { name: "Öğrencilerim", href: "/dashboard/students", icon: GraduationCap },
        { name: "Onay Bekleyenler", href: "/dashboard/pending-students", icon: UserCheck },
      ];
    }

    if (role === "ADMIN") {
      return [
        ...baseLinks,
        { name: "Sistem İstatistikleri", href: "/dashboard/admin", icon: BarChart3 },
        { name: "Tüm Dersler", href: "/dashboard/courses", icon: BookOpen },
        { name: "Tüm Projeler", href: "/dashboard/projects", icon: FolderKanban },
        { name: "Tüm Raporlar", href: "/dashboard/reports", icon: FileText },
        { name: "Öğrencilerim", href: "/dashboard/students", icon: GraduationCap },
        { name: "Tüm Kullanıcılar", href: "/dashboard/users", icon: Users },
        { name: "Onay Bekleyenler", href: "/dashboard/pending-students", icon: UserCheck },
        { name: "Ayarlar", href: "/dashboard/settings", icon: Settings },
      ];
    }

    return baseLinks;
  };

  const links = getNavLinks();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Mobil başlık satırı */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-slate-700 lg:border-transparent">
        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 lg:hidden">
          UniTrack AI
        </span>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <nav className="flex flex-col gap-1 px-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Ana Menü
          </p>
          {links.map((link) => {
            const isActive =
              link.href === "/dashboard"
                ? pathname === link.href
                : pathname.startsWith(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-gray-50"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-gray-400 dark:text-gray-500"
                  )}
                />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-slate-700">
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Giriş Yapılan Rol</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">{user?.role}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — her zaman görünür */}
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex dark:border-slate-700 dark:bg-slate-900">
        {sidebarContent}
      </aside>

      {/* Mobil sidebar — isMobileOpen olduğunda slide-in */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out dark:border-slate-700 dark:bg-slate-900 lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
