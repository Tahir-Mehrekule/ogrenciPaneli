"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { BookOpen, FolderKanban, CheckSquare, FileText, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

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
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  user_login:      { label: "Giriş",           className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  user_register:   { label: "Kayıt",            className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  user_role_change:{ label: "Rol Değişikliği",  className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  project_create:  { label: "Proje Oluşturma",  className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  project_approve: { label: "Proje Onayı",      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  project_reject:  { label: "Proje Reddi",      className: "bg-red-500/10 text-red-400 border-red-500/20" },
  report_submit:   { label: "Rapor Teslimi",    className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  report_review:   { label: "Rapor İncelemesi", className: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  course_create:   { label: "Ders Oluşturma",   className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  course_update:   { label: "Ders Güncelleme",  className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  course_delete:   { label: "Ders Silme",       className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Kullanıcı", project: "Proje", report: "Rapor", course: "Ders", task: "Görev",
};

const ACTION_OPTIONS = [
  { value: "", label: "Tüm Aksiyonlar" },
  { value: "user_login", label: "Giriş" },
  { value: "user_register", label: "Kayıt" },
  { value: "project_create", label: "Proje Oluşturma" },
  { value: "project_approve", label: "Proje Onayı" },
  { value: "project_reject", label: "Proje Reddi" },
  { value: "report_submit", label: "Rapor Teslimi" },
  { value: "report_review", label: "Rapor İncelemesi" },
  { value: "course_create", label: "Ders Oluşturma" },
  { value: "course_update", label: "Ders Güncelleme" },
  { value: "course_delete", label: "Ders Silme" },
];

const ENTITY_OPTIONS = [
  { value: "", label: "Tüm Varlıklar" },
  { value: "user", label: "Kullanıcı" },
  { value: "project", label: "Proje" },
  { value: "report", label: "Rapor" },
  { value: "course", label: "Ders" },
];

export const AdminDashboard = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  useEffect(() => {
    apiClient.get<SystemStats>("/api/v1/admin/stats")
      .then(({ data }) => setStats(data))
      .catch(() => toast.error("İstatistikler alınırken hata oluştu."))
      .finally(() => setStatsLoading(false));
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: "15",
        sort_by: "created_at",
        order: "desc",
      });
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entity_type", entityFilter);

      const { data } = await apiClient.get(`/api/v1/admin/activity-logs?${params}`);
      setLogs(data.items);
      setTotalPages(data.pages || 1);
    } catch {
      toast.error("Loglar yüklenemedi.");
    } finally {
      setLogsLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Filtre değişince sayfayı sıfırla
  const handleActionFilter = (v: string) => { setActionFilter(v); setPage(1); };
  const handleEntityFilter = (v: string) => { setEntityFilter(v); setPage(1); };

  const statCards = [
    { title: "Toplam Ders",    value: stats?.total_courses || 0,      icon: BookOpen,      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400" },
    { title: "Toplam Proje",   value: stats?.total_projects || 0,     icon: FolderKanban,  color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400" },
    { title: "Aktif Görevler", value: stats?.total_active_tasks || 0, icon: CheckSquare,   color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400" },
    { title: "Açık Raporlar",  value: stats?.total_open_reports || 0, icon: FileText,      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400" },
  ];

  const selectClass = "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="space-y-8">
      {/* İstatistikler */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Sistem İstatistikleri</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tüm sistem üzerindeki genel kullanım verileri.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? [1,2,3,4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-24 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl" />
              </Card>
            ))
          : statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i}>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Aktivite Logları */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sistem Aktivite Logları</h3>
          </div>
          <div className="flex items-center gap-2">
            <select value={actionFilter} onChange={(e) => handleActionFilter(e.target.value)} className={selectClass}>
              {ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={entityFilter} onChange={(e) => handleEntityFilter(e.target.value)} className={selectClass}>
              {ENTITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-400">Loglar yükleniyor...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Activity className="h-8 w-8 text-gray-400 mb-3" />
                <p className="text-sm text-gray-400">Henüz log kaydı yok.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kullanıcı</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aksiyon</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Varlık</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {logs.map((log) => {
                      const actionCfg = ACTION_LABELS[log.action] ?? { label: log.action, className: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-4 py-3">
                            {log.user_name ? (
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{log.user_name}</p>
                                <p className="text-xs text-gray-400">{log.user_email}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Sistem</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${actionCfg.className}`}>
                              {actionCfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {log.entity_type ? ENTITY_LABELS[log.entity_type] ?? log.entity_type : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {log.details
                              ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" · ")
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sayfalama */}
            {!logsLoading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-700 px-4 py-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">{page}. sayfa / {totalPages} toplam</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
