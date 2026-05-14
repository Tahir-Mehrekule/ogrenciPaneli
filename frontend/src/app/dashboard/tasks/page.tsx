"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { CheckSquare, Search, X, Sparkles, Plus, Circle, Play, Eye, CheckCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FilterPanel, ActiveFilter, SortOption } from "@/components/ui/FilterPanel";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FocusTrapContainer } from "@/components/ui/FocusTrapContainer";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

interface Task {
  id: string;
  title: string;
  description: string;
  project_id: string;
  project_title?: string;
  assigned_to: string;
  assigned_to_name?: string;
  status: TaskStatus;
  due_date: string | null;
  week_number?: number;
  ai_suggested: boolean;
  created_at: string;
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  TODO:        { label: "Yapılacak",    className: "border-slate-600/60 bg-slate-800/60 text-slate-300",       icon: Circle      },
  IN_PROGRESS: { label: "Devam Ediyor", className: "border-blue-500/30 bg-blue-500/10 text-blue-400",          icon: Play        },
  REVIEW:      { label: "İncelemede",   className: "border-amber-500/30 bg-amber-500/10 text-amber-400",       icon: Eye         },
  DONE:        { label: "Tamamlandı",   className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", icon: CheckCircle },
};

const SORT_OPTIONS: SortOption[] = [
  { value: "created_at", label: "Oluşturma Tarihi" },
  { value: "due_date", label: "Son Tarih" },
];

// ── Görev Oluşturma Modalı (FE-3) ────────────────────────────────────────────
interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateTaskModal({ onClose, onCreated }: CreateTaskModalProps) {
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);

  useEffect(() => {
    apiClient
      .get("/api/v1/projects?size=100&sort_by=title&order=asc")
      .then((r) => setProjects(r.data.items ?? []))
      .catch(() => toast.error("Projeler yüklenemedi."))
      .finally(() => setFetchingProjects(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return toast.error("Lütfen bir proje seçin.");
    if (title.trim().length < 3) return toast.error("Başlık en az 3 karakter olmalıdır.");
    if (description.trim().length < 5) return toast.error("Açıklama en az 5 karakter olmalıdır.");

    try {
      setLoading(true);
      await apiClient.post("/api/v1/tasks", {
        title: title.trim(),
        description: description.trim(),
        project_id: projectId,
        ...(dueDate ? { due_date: new Date(dueDate).toISOString() } : {}),
      });
      toast.success("Görev başarıyla oluşturuldu!");
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Görev oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Yeni Görev Oluştur">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <FocusTrapContainer className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">Yeni Görev Oluştur</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="task-project">
                Proje <span className="text-red-400">*</span>
              </label>
              <select
                id="task-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={inputCls}
                disabled={fetchingProjects}
              >
                <option value="">{fetchingProjects ? "Yükleniyor..." : "Proje seçin"}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="task-title">
                Başlık <span className="text-red-400">*</span>
              </label>
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Görev başlığı (en az 3 karakter)"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="task-desc">
                Açıklama <span className="text-red-400">*</span>
              </label>
              <textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Görev açıklaması (en az 5 karakter)"
                rows={3}
                className={inputCls + " resize-none"}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5" htmlFor="task-due">
                Son Tarih <span className="text-gray-600">(opsiyonel)</span>
              </label>
              <input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" type="button" onClick={onClose}>
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Oluşturuluyor..." : "Görevi Oluştur"}
              </Button>
            </div>
          </form>
        </div>
      </FocusTrapContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toUpperCase() as TaskStatus;
  const cfg = STATUS_CONFIG[normalized] ?? {
    label: status,
    className: "bg-slate-700 text-slate-300 border-slate-600",
    icon: Circle,
  };
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${cfg.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isStaff = role === "TEACHER" || role === "ADMIN";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [aiFilter, setAiFilter] = useState<"" | "true" | "false">("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [detailModal, setDetailModal] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
        sort_by: sortBy,
        order: sortOrder,
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (aiFilter) params.set("ai_suggested", aiFilter);

      const { data } = await apiClient.get(`/api/v1/tasks?${params}`);
      setTasks(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch {
      toast.error("Görevler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, aiFilter, sortBy, sortOrder]);

  useEffect(() => { setPage(1); }, [search, statusFilter, aiFilter, sortBy, sortOrder]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setAiFilter("");
  };

  const activeFilters: ActiveFilter[] = [
    ...(search ? [{ key: "search", label: "Arama", displayValue: search }] : []),
    ...(statusFilter
      ? [{
          key: "status",
          label: "Durum",
          displayValue:
            STATUS_CONFIG[statusFilter.toUpperCase() as TaskStatus]?.label ?? statusFilter,
        }]
      : []),
    ...(aiFilter
      ? [{ key: "ai", label: "AI Önerisi", displayValue: aiFilter === "true" ? "Evet" : "Hayır" }]
      : []),
  ];

  const clearFilter = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "status") setStatusFilter("");
    if (key === "ai") setAiFilter("");
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await apiClient.patch(`/api/v1/tasks/${taskId}/status`, { status: newStatus });
      // Listeyi güncelle
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      // Detail modal açıksa onu da güncelle
      setDetailModal((prev) =>
        prev && prev.id === taskId ? { ...prev, status: newStatus } : prev
      );
      toast.success("Görev durumu güncellendi.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Durum değiştirilemedi.");
    }
  };

  const columns: Column<Task>[] = [
    {
      key: "title",
      header: "Görev",
      render: (t) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-100">{t.title}</span>
            {t.ai_suggested && (
              <span title="AI Önerisi">
                <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              </span>
            )}
          </div>
          {t.description && (
            <span className="text-xs text-gray-500 line-clamp-1 max-w-[220px]">
              {t.description}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "project",
      header: "Proje",
      render: (t) => (
        <span className="text-sm text-gray-400">
          {t.project_title ?? "—"}
        </span>
      ),
    },
    ...(isStaff
      ? [
          {
            key: "assigned",
            header: "Atanan Kişi",
            render: (t: Task) => (
              <span className="text-sm text-gray-400">
                {t.assigned_to_name ?? "—"}
              </span>
            ),
          } as Column<Task>,
        ]
      : []),
    {
      key: "status",
      header: "Durum",
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "week",
      header: "Hafta",
      render: (t) => (
        <span className="text-sm text-gray-500">
          {t.week_number ? `${t.week_number}. Hafta` : "—"}
        </span>
      ),
    },
    {
      key: "due_date",
      header: "Son Tarih",
      sortable: true,
      render: (t) => {
        if (!t.due_date) return <span className="text-gray-600">—</span>;
        const due = new Date(t.due_date);
        const isOverdue = due < new Date() && t.status !== "DONE";
        return (
          <span
            className={`text-sm ${
              isOverdue ? "text-red-400 font-medium" : "text-gray-400"
            }`}
          >
            {due.toLocaleDateString("tr-TR")}
          </span>
        );
      },
    },
  ];

  const completionRate =
    total > 0
      ? Math.round(
          (tasks.filter((t) => t.status === "DONE").length / tasks.length) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isStaff ? "Tüm Görevler" : "Görevlerim"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {isStaff
              ? "Projelere bağlı tüm görevleri takip edin."
              : "Size atanan görevleri takip edin."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Tamamlanma oranı */}
          {tasks.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Bu sayfada tamamlanma</p>
              <p className="text-2xl font-bold text-white">{completionRate}%</p>
            </div>
          )}
          {/* FE-3: Standalone görev oluşturma butonu */}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Yeni Görev
          </Button>
        </div>
      </div>

      {/* Durum Özeti Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as TaskStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = tasks.filter((t) => t.status?.toUpperCase() === s).length;
          return (
            <button
              key={s}
              onClick={() =>
                setStatusFilter(statusFilter === s ? "" : s)
              }
              className={`rounded-xl border p-3 text-left transition-all ${
                statusFilter === s
                  ? cfg.className + " ring-2 ring-offset-2 ring-offset-gray-950 ring-current"
                  : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
              }`}
            >
              <p className="text-xs text-gray-500">{cfg.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Görev adı veya açıklaması..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 text-gray-200"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="">Tüm Durumlar</option>
          <option value="TODO">Yapılacak</option>
          <option value="IN_PROGRESS">Devam Ediyor</option>
          <option value="REVIEW">İncelemede</option>
          <option value="DONE">Tamamlandı</option>
        </select>

        <select
          value={aiFilter}
          onChange={(e) => setAiFilter(e.target.value as typeof aiFilter)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="">Tüm Görevler</option>
          <option value="true">AI Önerileri</option>
          <option value="false">Manuel</option>
        </select>

        {activeFilters.length > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Temizle
          </button>
        )}
      </div>

      {/* FilterPanel: aktif chiplar + sıralama */}
      <FilterPanel
        activeFilters={activeFilters}
        onRemoveFilter={clearFilter}
        onClearAll={clearFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        sortOptions={SORT_OPTIONS}
        onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
        resultCount={total}
      />

      <DataTable
        columns={columns}
        data={tasks}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        sortBy={sortBy}
        sortOrder={sortOrder}
        loading={loading}
        onSort={(col, order) => { setSortBy(col); setSortOrder(order); }}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRowClick={(t) => setDetailModal(t)}
        emptyMessage={
          activeFilters.length > 0
            ? "Filtrelere uyan görev bulunamadı."
            : isStaff
            ? "Henüz hiç görev oluşturulmamış."
            : "Size atanmış görev bulunmuyor."
        }
      />

      {/* FE-3: Görev Oluşturma Modalı */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchTasks}
        />
      )}

      {/* Görev Detay Modalı */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Görev Detayı">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDetailModal(null)}
          />
          <FocusTrapContainer className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div
              className={`h-1 w-full ${
                detailModal.status === "DONE"
                  ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                  : detailModal.status === "IN_PROGRESS"
                  ? "bg-gradient-to-r from-blue-400 to-indigo-400"
                  : detailModal.status === "REVIEW"
                  ? "bg-gradient-to-r from-amber-400 to-orange-400"
                  : "bg-gradient-to-r from-slate-500 to-slate-600"
              }`}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-white">
                      {detailModal.title}
                    </h3>
                    {detailModal.ai_suggested && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/30 border border-blue-700/40 px-2 py-0.5 text-xs text-blue-400">
                        <Sparkles className="h-3 w-3" /> AI Önerisi
                      </span>
                    )}
                  </div>
                  {detailModal.project_title && (
                    <p className="text-sm text-gray-400 mt-1">
                      {detailModal.project_title}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setDetailModal(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0"
                  aria-label="Kapat"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <StatusBadge status={detailModal.status} />
                  {detailModal.week_number && (
                    <span className="inline-flex items-center rounded-lg border border-indigo-700/40 bg-indigo-900/20 px-2.5 py-1 text-xs text-indigo-400">
                      {detailModal.week_number}. Hafta
                    </span>
                  )}
                  {detailModal.due_date && (
                    <span className="inline-flex items-center rounded-lg border border-gray-700 bg-gray-800/60 px-2.5 py-1 text-xs text-gray-400">
                      Son: {new Date(detailModal.due_date).toLocaleDateString("tr-TR")}
                    </span>
                  )}
                </div>

                {detailModal.description && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1.5">
                      Açıklama
                    </h4>
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {detailModal.description}
                    </div>
                  </div>
                )}

                {isStaff && detailModal.assigned_to_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-gray-500">Atanan:</span>
                    <span className="text-gray-200">
                      {detailModal.assigned_to_name}
                    </span>
                  </div>
                )}
              </div>

              {/* Durum Değiştirme — atanan öğrenci veya admin */}
              {detailModal.status !== "DONE" &&
                (role === "ADMIN" ||
                  (role === "STUDENT" &&
                    String(detailModal.assigned_to) === String(user?.id))) && (
                <div className="mt-4 flex items-center gap-3 pt-4 border-t border-gray-800">
                  <span className="text-xs text-gray-500 shrink-0">Durumu Değiştir:</span>
                  <select
                    value={detailModal.status}
                    onChange={(e) =>
                      handleStatusChange(detailModal.id, e.target.value as TaskStatus)
                    }
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    aria-label="Görev durumu seç"
                  >
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <Button variant="outline" onClick={() => setDetailModal(null)}>
                  Kapat
                </Button>
              </div>
            </div>
          </FocusTrapContainer>
        </div>
      )}
    </div>
  );
}
