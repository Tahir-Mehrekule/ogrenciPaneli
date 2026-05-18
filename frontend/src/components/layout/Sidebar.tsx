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
  Users,
  GraduationCap,
  Building2,
  ScrollText,
  X,
  ChevronRight,
  LogOut,
} from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Öğrenci",
  TEACHER: "Öğretmen",
  ADMIN: "Yönetici",
};

const ROLE_COLOR: Record<string, string> = {
  STUDENT: "bg-emerald-500/20 text-emerald-300",
  TEACHER: "bg-indigo-500/20 text-indigo-300",
  ADMIN: "bg-amber-500/20 text-amber-300",
};

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "nav-link group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium",
        isActive
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      )}
    >
      <span className="flex items-center gap-3">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
          )}
        />
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        {badge !== undefined && badge > 0 && (
          <span className="badge-pulse flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {isActive && <ChevronRight className="h-3 w-3 text-white/60" />}
      </span>
    </Link>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const role = user?.role?.toUpperCase();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0f172a]">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-600/30">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">
            UniTrack <span className="text-indigo-400">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {/* Bildirim çanı (4B) */}
          <NotificationBell />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-300 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-scroll flex-1 overflow-y-auto px-3 py-5">
        {role === "STUDENT" && (
          <>
            <NavSection label="Genel">
              <NavItem href="/dashboard" icon={LayoutDashboard} label="Genel Bakış" isActive={isActive("/dashboard")} onClick={onClose} />
            </NavSection>
            <NavSection label="Eğitim">
              <NavItem href="/dashboard/courses" icon={BookOpen} label="Ders Kataloğu" isActive={isActive("/dashboard/courses")} onClick={onClose} />
              <NavItem href="/dashboard/projects" icon={FolderKanban} label="Projelerim" isActive={isActive("/dashboard/projects")} onClick={onClose} />
              <NavItem href="/dashboard/reports" icon={FileText} label="Haftalık Raporlar" isActive={isActive("/dashboard/reports")} onClick={onClose} />
            </NavSection>
          </>
        )}

        {role === "TEACHER" && (
          <>
            <NavSection label="Genel">
              <NavItem href="/dashboard" icon={LayoutDashboard} label="Genel Bakış" isActive={isActive("/dashboard")} onClick={onClose} />
            </NavSection>
            <NavSection label="Sınıf Yönetimi">
              <NavItem href="/dashboard/courses" icon={BookOpen} label="Tüm Dersler" isActive={isActive("/dashboard/courses")} onClick={onClose} />
              <NavItem href="/dashboard/users?role=student&onlyMine=true" icon={GraduationCap} label="Öğrencilerim" isActive={isActive("/dashboard/users")} onClick={onClose} />
            </NavSection>
            <NavSection label="Proje Takibi">
              <NavItem href="/dashboard/projects" icon={FolderKanban} label="Gelen Projeler" isActive={isActive("/dashboard/projects")} onClick={onClose} />
              <NavItem href="/dashboard/reports" icon={FileText} label="Gelen Raporlar" isActive={isActive("/dashboard/reports")} onClick={onClose} />
            </NavSection>
            <NavSection label="Hesap">
              <NavItem href="/dashboard/settings" icon={Settings} label="Ayarlar" isActive={isActive("/dashboard/settings")} onClick={onClose} />
            </NavSection>
          </>
        )}

        {role === "ADMIN" && (
          <>
            <NavSection label="Genel">
              <NavItem href="/dashboard" icon={LayoutDashboard} label="Genel Bakış" isActive={isActive("/dashboard")} onClick={onClose} />
            </NavSection>
            <NavSection label="İçerik">
              <NavItem href="/dashboard/courses" icon={BookOpen} label="Tüm Dersler" isActive={isActive("/dashboard/courses")} onClick={onClose} />
              <NavItem href="/dashboard/projects" icon={FolderKanban} label="Tüm Projeler" isActive={isActive("/dashboard/projects")} onClick={onClose} />
              <NavItem href="/dashboard/reports" icon={FileText} label="Tüm Raporlar" isActive={isActive("/dashboard/reports")} onClick={onClose} />
            </NavSection>
            <NavSection label="Kullanıcılar">
              <NavItem href="/dashboard/users" icon={Users} label="Tüm Kullanıcılar" isActive={isActive("/dashboard/users")} onClick={onClose} />
              <NavItem href="/dashboard/admin/departments" icon={Building2} label="Bölümler" isActive={isActive("/dashboard/admin/departments")} onClick={onClose} />
            </NavSection>
            <NavSection label="Sistem">
              <NavItem href="/dashboard/admin/logs" icon={ScrollText} label="Aktivite Logları" isActive={isActive("/dashboard/admin/logs")} onClick={onClose} />
              <NavItem href="/dashboard/settings" icon={Settings} label="Ayarlar" isActive={isActive("/dashboard/settings")} onClick={onClose} />
            </NavSection>
          </>
        )}
      </div>

      {/* User profile at bottom */}
      <div className="shrink-0 border-t border-white/5 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
          {/* Avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-300 text-sm font-bold">
            {user?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-200">
              {user?.full_name ?? "Kullanıcı"}
            </p>
            <span className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
              ROLE_COLOR[role ?? ""] ?? "bg-slate-500/20 text-slate-400"
            )}>
              {ROLE_LABEL[role ?? ""] ?? role}
            </span>
          </div>
          <button
            onClick={logout}
            title="Çıkış Yap"
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col transition-transform duration-300 ease-in-out lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
