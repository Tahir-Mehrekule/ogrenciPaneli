"use client";

/**
 * Admin → Aktivite Logları sayfası
 * ADMIN_PLAN_2 / Paket D2
 *
 * Backend: GET /api/v1/admin/activity-logs (admin-only)
 * - filtre: user_id, action, entity_type
 * - paginate: page, size
 * - sort: created_at DESC default
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import {
  ScrollText,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

// ── Tipler ──
interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

interface PaginatedLogs {
  items: ActivityLog[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

// ── Sözlükler ──
const ACTION_LABELS: Record<string, string> = {
  user_login: "Giriş",
  user_register: "Kayıt",
  user_update: "Kullanıcı Güncelleme",
  user_role_change: "Rol Değişikliği",
  user_password_change: "Şifre Değişikliği",
  project_create: "Proje Oluşturma",
  project_approve: "Proje Onayı",
  project_reject: "Proje Reddi",
  project_delete: "Proje Silme",
  project_restore: "Proje Geri Yükleme",
  report_submit: "Rapor Teslim",
  report_review: "Rapor İnceleme",
  report_delete: "Rapor Silme",
  report_restore: "Rapor Geri Yükleme",
  course_create: "Ders Oluşturma",
  course_update: "Ders Güncelleme",
  course_delete: "Ders Silme",
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Kullanıcı",
  project: "Proje",
  report: "Rapor",
  course: "Ders",
  task: "Görev",
};

const ACTION_BADGE: Record<string, string> = {
  user_login: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  user_register: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  user_update: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  user_role_change: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  user_password_change: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  project_create: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  project_approve: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  project_reject: "bg-red-500/10 text-red-400 border-red-500/20",
  project_delete: "bg-red-500/10 text-red-400 border-red-500/20",
  project_restore: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  report_submit: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  report_review: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  report_delete: "bg-red-500/10 text-red-400 border-red-500/20",
  report_restore: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  course_create: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  course_update: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  course_delete: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PAGE_SIZE = 20;

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminLogsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtre
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);

  // Detay modal
  const [selected, setSelected] = useState<ActivityLog | null>(null);

  // ── Admin guard ──
  useEffect(() => {
    if (role && role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  // ── Kullanıcı listesini bir kez çek (dropdown için) ──
  useEffect(() => {
    apiClient
      .get<{ items: UserOption[] }>("/api/v1/users?size=500")
      .then(({ data }) => setUsers(data.items))
      .catch((err) => console.error("Users yüklenemedi:", err));
  }, []);

  // ── Logları çek ──
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
      });
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entity_type", entityFilter);
      if (userFilter) params.set("user_id", userFilter);

      const { data } = await apiClient.get<PaginatedLogs>(
        `/api/v1/admin/activity-logs?${params}`,
      );
      setLogs(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg || JSON.stringify(d)).join(", ")
          : "Aktivite logları yüklenemedi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, userFilter]);

  useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, userFilter]);

  useEffect(() => {
    if (role === "ADMIN") fetchLogs();
  }, [fetchLogs, role]);

  const clearFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setUserFilter("");
  };

  const actionOptions = useMemo(
    () =>
      Object.entries(ACTION_LABELS)
        .sort((a, b) => a[1].localeCompare(b[1], "tr"))
        .map(([value, label]) => ({ value, label })),
    [],
  );

  if (role && role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Aktivite Logları
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tüm kullanıcıların sistem aktiviteleri (giriş, kayıt, CRUD işlemleri).
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Toplam: <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span> kayıt
        </div>
      </div>

      {/* Filtre Barı */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <Filter className="h-4 w-4" />
              Filtreler:
            </div>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
            >
              <option value="">Tüm Kullanıcılar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
            >
              <option value="">Tüm Aksiyonlar</option>
              {actionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
            >
              <option value="">Tüm Hedefler</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {(actionFilter || entityFilter || userFilter) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" />
                Temizle
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hata */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Tablo */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-400">Yükleniyor...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ScrollText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {actionFilter || entityFilter || userFilter
                  ? "Filtrelere uygun log bulunamadı."
                  : "Henüz aktivite logu yok."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3">Zaman</th>
                    <th className="px-4 py-3">Kullanıcı</th>
                    <th className="px-4 py-3">Aksiyon</th>
                    <th className="px-4 py-3">Hedef</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {logs.map((log) => {
                    const actionLabel = ACTION_LABELS[log.action] ?? log.action;
                    const badgeClass =
                      ACTION_BADGE[log.action] ??
                      "bg-gray-500/10 text-gray-400 border-gray-500/20";
                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {log.user_name ? (
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {log.user_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {log.user_email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">— (anonim)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}
                          >
                            {actionLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                          {log.entity_type ? (
                            <>
                              <div className="font-medium">
                                {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                              </div>
                              {log.entity_id && (
                                <div className="font-mono text-[10px] text-gray-400">
                                  {log.entity_id.slice(0, 8)}…
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                          {log.ip_address ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelected(log)}
                            className="inline-flex items-center gap-1 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold text-indigo-400 hover:bg-indigo-500/20"
                          >
                            <Info className="h-3.5 w-3.5" />
                            Detay
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && logs.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-500 dark:text-gray-400">
            Sayfa <span className="font-semibold">{page}</span> / {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Önceki
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800"
            >
              Sonraki
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Detay Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Log Detayı
                </h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Zaman
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {formatDateTime(selected.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    IP Adresi
                  </div>
                  <div className="mt-1 font-mono text-xs text-gray-700 dark:text-gray-300">
                    {selected.ip_address ?? "—"}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Kullanıcı
                  </div>
                  <div className="mt-1 text-gray-700 dark:text-gray-200">
                    {selected.user_name
                      ? `${selected.user_name} (${selected.user_email})`
                      : "— (anonim)"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Aksiyon
                  </div>
                  <div className="mt-1 text-gray-700 dark:text-gray-200">
                    {ACTION_LABELS[selected.action] ?? selected.action}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Hedef
                  </div>
                  <div className="mt-1 text-gray-700 dark:text-gray-200">
                    {selected.entity_type
                      ? `${ENTITY_LABELS[selected.entity_type] ?? selected.entity_type}${
                          selected.entity_id ? ` · ${selected.entity_id}` : ""
                        }`
                      : "—"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Ek Detaylar (JSON)
                </div>
                <pre className="max-h-72 overflow-auto rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:bg-slate-800 dark:text-gray-300">
                  {selected.details
                    ? JSON.stringify(selected.details, null, 2)
                    : "(boş)"}
                </pre>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3 dark:border-slate-700">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
