"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Activity,
  BookOpen,
  CheckSquare,
  ExternalLink,
  FileText,
  FolderKanban,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import AdminCreateUserModal from "@/components/users/AdminCreateUserModal";

interface SystemStats {
  total_courses: number;
  total_projects: number;
  total_active_tasks: number;
  total_open_reports: number;
}

interface ActivityLog {
  id: string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  user_login: { label: "Giriş", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  user_register: { label: "Kayıt", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  user_update: { label: "Kullanıcı Güncelleme", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  user_role_change: { label: "Rol Değişikliği", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  project_create: { label: "Proje Oluşturma", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  project_approve: { label: "Proje Onayı", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  project_reject: { label: "Proje Reddi", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  report_submit: { label: "Rapor Teslimi", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  report_review: { label: "Rapor İncelemesi", className: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  course_create: { label: "Ders Oluşturma", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  course_update: { label: "Ders Güncelleme", className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  course_delete: { label: "Ders Silme", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Kullanıcı",
  project: "Proje",
  report: "Rapor",
  course: "Ders",
  task: "Görev",
};

export const AdminDashboard = () => {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchStats = useCallback(() => {
    setStatsLoading(true);
    apiClient
      .get<SystemStats>("/api/v1/admin/stats")
      .then(({ data }) => setStats(data))
      .catch(() => toast.error("İstatistikler alınırken hata oluştu."))
      .finally(() => setStatsLoading(false));
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        size: "5",
        sort_by: "created_at",
        order: "desc",
      });
      const { data } = await apiClient.get<{ items: ActivityLog[] }>(
        `/api/v1/admin/activity-logs?${params}`,
      );
      setLogs(data.items ?? []);
    } catch {
      toast.error("Loglar yüklenemedi.");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  const statCards = [
    {
      title: "Toplam Ders",
      value: stats?.total_courses || 0,
      icon: BookOpen,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400",
    },
    {
      title: "Toplam Proje",
      value: stats?.total_projects || 0,
      icon: FolderKanban,
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400",
    },
    {
      title: "Aktif Görevler",
      value: stats?.total_active_tasks || 0,
      icon: CheckSquare,
      color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400",
    },
    {
      title: "Açık Raporlar",
      value: stats?.total_open_reports || 0,
      icon: FileText,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400",
    },
  ];

  const goToLogs = () => router.push("/dashboard/admin/logs");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Genel Bakış
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Kullanıcı, ders ve son sistem aktivitelerini buradan takip edin.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-indigo-700"
        >
          <UserPlus className="h-4 w-4" />
          Yeni Kullanıcı Ekle
        </button>
      </div>

      <AdminCreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          fetchStats();
          fetchLogs();
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading
          ? [1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24 rounded-2xl bg-gray-50 p-6 dark:bg-slate-800/50" />
              </Card>
            ))
          : statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
            <button onClick={goToLogs} className="flex min-w-0 items-center gap-2 text-left">
              <Activity className="h-5 w-5 shrink-0 text-indigo-400" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Son Aktivite Logları
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Detaylar için aktivite loglarına gidin.
                </p>
              </div>
            </button>
            <button
              onClick={goToLogs}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
            >
              Tümünü Gör
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-gray-400">Loglar yükleniyor...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Activity className="mb-3 h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-400">Henüz log kaydı yok.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {logs.map((log) => {
                const actionCfg = ACTION_LABELS[log.action] ?? {
                  label: log.action,
                  className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
                };
                return (
                  <button
                    key={log.id}
                    onClick={goToLogs}
                    className="grid w-full grid-cols-1 gap-2 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${actionCfg.className}`}>
                          {actionCfg.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {log.entity_type ? ENTITY_LABELS[log.entity_type] ?? log.entity_type : "Sistem"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                        {log.user_name || "Sistem"}
                        {log.user_email ? (
                          <span className="font-normal text-gray-400"> · {log.user_email}</span>
                        ) : null}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 sm:self-center">
                      {new Date(log.created_at).toLocaleString("tr-TR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
