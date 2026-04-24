"use client";

import React, { useEffect, useState, useCallback } from "react";
import apiClient from "@/lib/apiClient";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

type TabRole = "all" | "STUDENT" | "TEACHER";

interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  student_no?: string;
  grade_label?: string;
  departments: { id: string; name: string }[];
  approval_status: string;
  is_active: boolean;
  created_at: string;
}

const APPROVAL_LABEL: Record<string, { label: string; cls: string }> = {
  approved: { label: "Onaylı",  cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  pending:  { label: "Bekliyor", cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  rejected: { label: "Reddedildi", cls: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Öğrenci",
  TEACHER: "Öğretmen",
  ADMIN: "Admin",
};

export default function UsersPage() {
  const [tab, setTab] = useState<TabRole>("all");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");

  const SIZE = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(SIZE) });
      if (tab !== "all") params.set("role", tab);
      if (search) params.set("search", search);
      if (activeFilter) params.set("is_active", activeFilter);

      const { data } = await apiClient.get(`/api/v1/users?${params}`);
      setUsers(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch {
      toast.error("Kullanıcılar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [tab, page, search, activeFilter]);

  useEffect(() => { setPage(1); }, [tab, search, activeFilter]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const clearFilters = () => { setSearch(""); setActiveFilter(""); };
  const hasFilters = search || activeFilter;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tüm Kullanıcılar</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Sistemdeki tüm hesaplar — toplam {total} kayıt
        </p>
      </div>

      {/* Tab */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit dark:border-slate-700 dark:bg-slate-800">
        {(["all", "STUDENT", "TEACHER"] as TabRole[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {t === "all" ? "Tümü" : ROLE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Ad, soyad veya e-posta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
          />
        </div>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
        >
          <option value="">Tüm Durumlar</option>
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400"
          >
            <X className="h-3.5 w-3.5" /> Temizle
          </button>
        )}
      </div>

      {/* Tablo */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/60">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Ad Soyad</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Rol</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Bölüm</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Okul No</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Sınıf</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Durum</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">E-posta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    Kullanıcı bulunamadı.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const approval = APPROVAL_LABEL[u.approval_status] ?? { label: u.approval_status, cls: "" };
                  return (
                    <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/40 ${!u.is_active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{u.full_name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.role === "STUDENT"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                            : u.role === "TEACHER"
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                        }`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {u.departments.map((d) => d.name).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                        {u.student_no ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {u.grade_label ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${approval.cls}`}>
                          {approval.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-slate-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {total} kayıttan {(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} arası
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg border p-1.5 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg border p-1.5 text-gray-500 disabled:opacity-40 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
