"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import {
  BookOpen,
  FolderKanban,
  Clock,
  ArrowRight,
  Plus,
  CheckSquare,
  Sparkles,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at?: string;
}

interface Stats {
  courses: number;
  activeProjects: number;
  pendingProjects: number;
}

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  APPROVED:    { label: "Aktif",      dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400" },
  IN_PROGRESS: { label: "Devam",      dot: "bg-blue-500",    bg: "bg-blue-50 dark:bg-blue-900/20",      text: "text-blue-700 dark:text-blue-400" },
  PENDING:     { label: "Bekliyor",   dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-900/20",    text: "text-amber-700 dark:text-amber-400" },
  DRAFT:       { label: "Taslak",     dot: "bg-slate-400",   bg: "bg-slate-100 dark:bg-slate-700",      text: "text-slate-600 dark:text-slate-400" },
  REJECTED:    { label: "Reddedildi", dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-900/20",        text: "text-red-700 dark:text-red-400" },
  COMPLETED:   { label: "Tamam",      dot: "bg-violet-500",  bg: "bg-violet-50 dark:bg-violet-900/20",  text: "text-violet-700 dark:text-violet-400" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status?.toUpperCase()] ?? STATUS_CFG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export const StudentDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ courses: 0, activeProjects: 0, pendingProjects: 0 });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, projectsRes] = await Promise.all([
          apiClient.get("/api/v1/courses"),
          apiClient.get("/api/v1/projects?per_page=100"),
        ]);
        const courses: unknown[] = coursesRes.data?.items ?? [];
        const projects: Project[] = projectsRes.data?.items ?? [];
        const active = projects.filter((p) => p.status?.toUpperCase() === "APPROVED").length;
        const pending = projects.filter((p) => p.status?.toUpperCase() === "PENDING").length;
        setStats({ courses: courses.length, activeProjects: active, pendingProjects: pending });
        setRecentProjects(projects.slice(0, 6));
      } catch {}
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const firstName = user?.full_name?.split(" ")[0] ?? "Öğrenci";

  const statCards = [
    { title: "Kayıtlı Dersler", value: stats.courses, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", href: "/dashboard/courses" },
    { title: "Aktif Projeler", value: stats.activeProjects, icon: FolderKanban, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", href: "/dashboard/projects" },
    { title: "Onay Bekleyen", value: stats.pendingProjects, icon: Clock, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", href: "/dashboard/projects" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/projects/new")}
          className="flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Yeni Proje
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => router.push(s.href)}
              className="stat-card group rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition hover:border-indigo-100 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{s.title}</p>
                  {isLoading ? (
                    <div className="shimmer mt-2 h-8 w-12 rounded-lg" />
                  ) : (
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  )}
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Projects table */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <FolderKanban className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Son Projelerim</h3>
          </div>
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Tümünü gör <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <div className="shimmer h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="shimmer h-3 w-36 rounded" />
                  <div className="shimmer h-2.5 w-20 rounded" />
                </div>
                <div className="shimmer h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14">
            <Sparkles className="h-10 w-10 text-gray-200 dark:text-slate-600" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Henüz proje yok
            </p>
            <button
              onClick={() => router.push("/dashboard/projects/new")}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              İlk projeyi oluştur
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {recentProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                className="pending-row flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/30"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {p.title?.charAt(0)?.toUpperCase() ?? "P"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                  {p.description && (
                    <p className="truncate text-xs text-gray-400 dark:text-slate-500">{p.description}</p>
                  )}
                </div>
                <StatusBadge status={p.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
          Hızlı İşlemler
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Ders Kataloğu", href: "/dashboard/courses", icon: BookOpen },
            { label: "Görevlerim", href: "/dashboard/tasks", icon: CheckSquare },
            { label: "Haftalık Raporlar", href: "/dashboard/reports", icon: FolderKanban },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-700"
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
