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
  CheckCircle2,
  XCircle,
  Users,
  TrendingUp,
  AlertCircle,
  Plus,
  MoreHorizontal,
  Activity,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  created_by_name?: string;
  created_at?: string;
}

interface Stats {
  courses: number;
  totalProjects: number;
  pendingProjects: number;
  students: number;
}

const STATUS_CFG: Record<string, { label: string; dot: string; text: string }> = {
  APPROVED:    { label: "Aktif",       dot: "bg-emerald-500", text: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20" },
  IN_PROGRESS: { label: "Devam",       dot: "bg-blue-500",    text: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20" },
  PENDING:     { label: "Bekliyor",    dot: "bg-amber-500",   text: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20" },
  DRAFT:       { label: "Taslak",      dot: "bg-slate-400",   text: "text-slate-600 bg-slate-100 dark:text-slate-400 dark:bg-slate-800" },
  REJECTED:    { label: "Reddedildi",  dot: "bg-red-500",     text: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20" },
  COMPLETED:   { label: "Tamamlandı",  dot: "bg-violet-500",  text: "text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-900/20" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status?.toUpperCase()] ?? { label: status, dot: "bg-gray-400", text: "text-gray-600 bg-gray-100" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  trend,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: string;
  loading: boolean;
}) {
  return (
    <div className="stat-card group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          {loading ? (
            <div className="shimmer mt-2 h-8 w-16 rounded-lg" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          )}
          {trend && (
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {trend}
            </div>
          )}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      {/* Decorative gradient */}
      <div className={`pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 rounded-full opacity-10 ${bgColor}`} />
    </div>
  );
}

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ courses: 0, totalProjects: 0, pendingProjects: 0, students: 0 });
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
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

        const pending = projects.filter((p) => p.status?.toUpperCase() === "PENDING");
        const recent = [...projects]
          .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
          .slice(0, 6);

        setStats({
          courses: courses.length,
          totalProjects: projects.length,
          pendingProjects: pending.length,
          students: 0,
        });
        setPendingProjects(pending.slice(0, 5));
        setRecentProjects(recent);
      } catch {}
      finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleApprove = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/approve`);
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
      setStats((s) => ({ ...s, pendingProjects: Math.max(0, s.pendingProjects - 1) }));
    } catch {}
  };

  const handleReject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm("Bu projeyi reddetmek istediğinize emin misiniz?")) return;
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/reject`);
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
      setStats((s) => ({ ...s, pendingProjects: Math.max(0, s.pendingProjects - 1) }));
    } catch {}
  };

  const firstName = user?.full_name?.split(" ")[0] ?? "Öğretmen";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard/courses/new")}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Plus className="h-4 w-4" />
            Yeni Ders
          </button>
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            <FolderKanban className="h-4 w-4" />
            Tüm Projeler
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Verdiğim Dersler"
          value={stats.courses}
          icon={BookOpen}
          color="text-indigo-600"
          bgColor="bg-indigo-100 dark:bg-indigo-900/30"
          loading={isLoading}
        />
        <StatCard
          title="Toplam Proje"
          value={stats.totalProjects}
          icon={FolderKanban}
          color="text-emerald-600"
          bgColor="bg-emerald-100 dark:bg-emerald-900/30"
          loading={isLoading}
        />
        <StatCard
          title="Onay Bekliyor"
          value={stats.pendingProjects}
          icon={Clock}
          color="text-amber-600"
          bgColor="bg-amber-100 dark:bg-amber-900/30"
          loading={isLoading}
        />
        <StatCard
          title="Öğrencilerim"
          value={stats.students}
          icon={Users}
          color="text-violet-600"
          bgColor="bg-violet-100 dark:bg-violet-900/30"
          loading={isLoading}
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Pending approvals — wider */}
        <div className="flex flex-col lg:col-span-3">
          <div className="flex flex-1 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Onay Bekleyen Projeler
                </h3>
                {stats.pendingProjects > 0 && (
                  <span className="badge-pulse rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    {stats.pendingProjects}
                  </span>
                )}
              </div>
              <button
                onClick={() => router.push("/dashboard/projects")}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Tümünü Gör <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 divide-y divide-gray-50 dark:divide-slate-700/50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4">
                    <div className="shimmer h-9 w-9 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <div className="shimmer h-3 w-40 rounded" />
                      <div className="shimmer h-2.5 w-24 rounded" />
                    </div>
                    <div className="shimmer h-7 w-20 rounded-lg" />
                  </div>
                ))
              ) : pendingProjects.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-gray-200 dark:text-slate-600" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Bekleyen proje yok
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    Tüm proje başvuruları değerlendirilmiş
                  </p>
                </div>
              ) : (
                pendingProjects.map((p) => (
                  <div
                    key={p.id}
                    className="pending-row flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    {/* Avatar letter */}
                    <div
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                      onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                    >
                      {p.title?.charAt(0)?.toUpperCase() ?? "P"}
                    </div>
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                    >
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {p.title}
                      </p>
                      {p.created_by_name && (
                        <p className="truncate text-xs text-gray-400">
                          {p.created_by_name}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={(e) => handleApprove(e, p.id)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Onayla
                      </button>
                      <button
                        onClick={(e) => handleReject(e, p.id)}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-red-900/20"
                      >
                        <XCircle className="h-3 w-3" />
                        Reddet
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent projects — narrower */}
        <div className="flex flex-col lg:col-span-2">
          <div className="flex flex-1 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Activity className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Son Projeler</h3>
              </div>
              <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 divide-y divide-gray-50 dark:divide-slate-700/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="shimmer h-2 w-2 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <div className="shimmer h-3 w-32 rounded" />
                    </div>
                    <div className="shimmer h-5 w-16 rounded-full" />
                  </div>
                ))
              ) : recentProjects.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Activity className="h-10 w-10 text-gray-200 dark:text-slate-600" />
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Henüz proje yok</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Derslerinize proje gönderilmemiş</p>
                </div>
              ) : (
                recentProjects.map((p) => (
                  <div
                    key={p.id}
                    className="pending-row flex cursor-pointer items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                    onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                  >
                    <div className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    <p className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-slate-300">
                      {p.title}
                    </p>
                    <StatusBadge status={p.status} />
                  </div>
                ))
              )}
            </div>

            {recentProjects.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-3 dark:border-slate-700">
                <button
                  onClick={() => router.push("/dashboard/projects")}
                  className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  Tüm projeleri gör <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
          Hızlı İşlemler
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Yeni Ders Oluştur", href: "/dashboard/courses/new", icon: BookOpen },
            { label: "Öğrencileri Görüntüle", href: "/dashboard/students", icon: Users },
            { label: "Rapor İncele", href: "/dashboard/reports", icon: FolderKanban },
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
