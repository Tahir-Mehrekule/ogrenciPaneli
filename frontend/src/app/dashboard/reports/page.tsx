"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { FileText, Plus, Paperclip, Search, X, Eye, Send, Sparkles, Pencil, CheckCircle, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FilterPanel, ActiveFilter, SortOption } from "@/components/ui/FilterPanel";
import ClassTabs from "@/components/ui/ClassTabs";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FocusTrapContainer } from "@/components/ui/FocusTrapContainer";
import { SoftDeleteModal } from "@/components/ui/SoftDeleteModal";
import toast from "react-hot-toast";

type ReportStatus = "DRAFT" | "SUBMITTED" | "REVIEWED";

interface Report {
  id: string;
  project_id: string;
  week_number: number;
  year: number;
  content: string;
  youtube_url: string | null;
  status: ReportStatus;
  reviewer_note: string | null;
  teacher_reviewed_at: string | null;
  created_at: string;
  course_name: string | null;
  course_code: string | null;
  submitted_by_name?: string;
}

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string; icon: LucideIcon }
> = {
  DRAFT:     { label: "Taslak",        className: "border-slate-600/60 bg-slate-800/60 text-slate-300",         icon: FileText    },
  SUBMITTED: { label: "Teslim Edildi", className: "border-amber-500/30 bg-amber-500/10 text-amber-400",          icon: Send        },
  REVIEWED:  { label: "İncelendi",     className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",    icon: CheckCircle },
};

// Backend ReportStatus enum'u lowercase value gönderir; STATUS_CONFIG uppercase key.
// Bu helper iki dünyayı birleştirir.
const statusKey = (s?: string | null): ReportStatus =>
  ((s ?? "").toUpperCase() as ReportStatus);

const SORT_OPTIONS: SortOption[] = [
  { value: "created_at", label: "Oluşturma Tarihi" },
  { value: "week_number", label: "Hafta No" },
  { value: "status", label: "Durum" },
  { value: "course_name", label: "Ders" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function getLastWeekNumber(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return Math.max(1, week - 1);
}

function isUnreviewed(r: Report): boolean {
  if (r.status !== "SUBMITTED") return false;
  const lastWeek = getLastWeekNumber();
  return r.week_number <= lastWeek && !r.teacher_reviewed_at;
}

/* ───────────────── Edit Report Modal ───────────────── */
function EditReportModal({
  report,
  onClose,
  onUpdated,
}: {
  report: Report;
  onClose: () => void;
  onUpdated: (updated: Report) => void;
}) {
  const [content, setContent] = useState(report.content);
  const [youtubeUrl, setYoutubeUrl] = useState(report.youtube_url || "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSave = async () => {
    if (!content.trim()) {
      setFormError("Rapor içeriği boş bırakılamaz.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const { data } = await apiClient.patch(`/api/v1/reports/${report.id}`, {
        content: content.trim(),
        youtube_url: youtubeUrl.trim() || null,
      });
      toast.success("Rapor güncellendi.");
      onUpdated(data);
      onClose();
    } catch (err: unknown) {
      setFormError((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Raporu Düzenle">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <FocusTrapContainer className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col gap-5 p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Başlık */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Raporu Düzenle</h3>
            <p className="text-sm text-gray-400 mt-0.5">
              {report.year} Yılı — {report.week_number}. Hafta
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hata */}
        {formError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
            {formError}
          </div>
        )}

        {/* İçerik */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Rapor İçeriği <span className="text-red-400">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            maxLength={5000}
            placeholder="Bu hafta yapılan çalışmaları açıklayın..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-200 outline-none focus:border-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-500 text-right">{content.length}/5000</p>
        </div>

        {/* YouTube */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            YouTube Video Linki
            <span className="text-gray-500 font-normal ml-1">(opsiyonel)</span>
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-indigo-500"
          />
        </div>

        {/* Eylemler */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Vazgeç
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </FocusTrapContainer>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const role = user?.role?.toUpperCase();
  const isStaff = role === "TEACHER" || role === "ADMIN";

  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [aiAnalysis, setAiAnalysis] = useState<Record<string, unknown>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [submittedByFilter, setSubmittedByFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [showAllBranches, setShowAllBranches] = useState(false);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [viewModal, setViewModal] = useState<Report | null>(null);
  const [editModal, setEditModal] = useState<Report | null>(null);
  const [submitConfirm, setSubmitConfirm] = useState<string | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiTone, setAiTone] = useState<"constructive" | "encouraging" | "critical">("constructive");
  const [softDeleteTarget, setSoftDeleteTarget] = useState<Report | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Report | null>(null);

  const fetchReports = useCallback(async () => {
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
      if (weekFilter) params.set("week_number", weekFilter);
      if (yearFilter) params.set("year", yearFilter);
      if (submittedByFilter) params.set("search", submittedByFilter || search);
      if (gradeFilter) params.set("grade_label", gradeFilter);
      if (branchFilter) params.set("branch_code", branchFilter);

      const { data } = await apiClient.get(`/api/v1/reports?${params}`);
      // Backend lowercase status değeri döner; FE uppercase ReportStatus type'ı bekler.
      // Tek bir noktada normalize ederek tüm `=== "DRAFT"` karşılaştırmaları doğru çalışır.
      const normalized = (data.items as Report[]).map((r) => ({
        ...r,
        status: statusKey(r.status as unknown as string),
      }));
      setReports(normalized);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err: unknown) {
      // Pydantic 422 detail bazen array (validation errors) — string'e çevir.
      const detail = (err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail;
      const msg = typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d?.msg || JSON.stringify(d)).join(", ")
          : "Raporlar yüklenemedi.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, weekFilter, yearFilter, submittedByFilter, gradeFilter, branchFilter, sortBy, sortOrder]);

  useEffect(() => { setPage(1); }, [search, statusFilter, weekFilter, yearFilter, submittedByFilter, gradeFilter, branchFilter, sortBy, sortOrder]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSubmit = async (reportId: string) => {
    try {
      await apiClient.post(`/api/v1/reports/${reportId}/submit`);
      fetchReports();
      if (viewModal && viewModal.id === reportId) {
        setViewModal({ ...viewModal, status: "SUBMITTED" });
      }
      toast.success("Rapor teslim edildi.");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Teslim başarısız.");
    } finally {
      setSubmitConfirm(null);
    }
  };

  const handleFeedback = async (reportId: string) => {
    if (feedbackNote.trim().length < 5) return;
    setFeedbackLoading(true);
    try {
      const { data } = await apiClient.post(`/api/v1/reports/${reportId}/review`, {
        reviewer_note: feedbackNote.trim(),
      });
      toast.success("Geri bildirim kaydedildi.");
      setFeedbackNote("");
      setShowFeedbackForm(false);
      fetchReports();
      if (viewModal && viewModal.id === reportId) setViewModal({ ...data, status: statusKey(data.status) });
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Geri bildirim gönderilemedi.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleAiSuggestFeedback = async (reportId: string) => {
    setAiSuggestLoading(true);
    try {
      const { data } = await apiClient.post<{ suggested_feedback: string }>(
        "/api/v1/ai/suggest-feedback",
        { report_id: reportId, tone: aiTone }
      );
      setFeedbackNote(data.suggested_feedback);
      toast.success(`AI ${aiTone === "encouraging" ? "cesaret verici" : aiTone === "critical" ? "eleştirel" : "yapıcı"} bir taslak önerdi. Düzenleyip gönderebilirsiniz.`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "AI önerisi alınamadı.");
    } finally {
      setAiSuggestLoading(false);
    }
  };

  const handleAiAnalysis = async (report: Report) => {
    if (report.status === "DRAFT") return;
    try {
      setAiLoading((prev) => ({ ...prev, [report.id]: true }));
      const res = await apiClient.post("/api/v1/ai/analyze-report", {
        report_id: report.id,
      });
      setAiAnalysis((prev) => ({ ...prev, [report.id]: res.data }));
    } catch (err: unknown) {
      alert((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Analiz alınamadı.");
    } finally {
      setAiLoading((prev) => ({ ...prev, [report.id]: false }));
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setWeekFilter("");
    setYearFilter("");
    setSubmittedByFilter("");
    setGradeFilter("");
    setBranchFilter(null);
    setShowAllBranches(false);
  };

  const activeFilters: ActiveFilter[] = [
    ...(search ? [{ key: "search", label: "Arama", displayValue: search }] : []),
    ...(statusFilter
      ? [{ key: "status", label: "Durum", displayValue: STATUS_CONFIG[statusKey(statusFilter)]?.label ?? statusFilter }]
      : []),
    ...(weekFilter ? [{ key: "week", label: "Hafta", displayValue: `${weekFilter}. Hafta` }] : []),
    ...(yearFilter ? [{ key: "year", label: "Yıl", displayValue: yearFilter }] : []),
    ...(submittedByFilter ? [{ key: "submittedBy", label: "Öğrenci", displayValue: submittedByFilter }] : []),
    ...(gradeFilter ? [{ key: "grade", label: "Sınıf", displayValue: gradeFilter }] : []),
    ...(branchFilter ? [{ key: "branch", label: "Şube", displayValue: `${branchFilter} Şubesi` }] : []),
  ];

  const clearFilter = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "status") setStatusFilter("");
    if (key === "week") setWeekFilter("");
    if (key === "year") setYearFilter("");
    if (key === "submittedBy") setSubmittedByFilter("");
    if (key === "grade") { setGradeFilter(""); setBranchFilter(null); setShowAllBranches(false); }
    if (key === "branch") setBranchFilter(null);
  };

  const columns: Column<Report>[] = [
    {
      key: "course_name",
      header: "Ders / Proje",
      sortable: true,
      render: (r) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-gray-200">
            {r.course_name || "Ders Atanmamış"}
          </span>
          {r.course_code && (
            <span className="text-xs text-indigo-400 font-mono bg-indigo-900/20 px-2 py-0.5 rounded-md w-fit border border-indigo-800/30">
              {r.course_code}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "week",
      header: "Hafta",
      sortable: true,
      render: (r) => (
        <span className="text-gray-400">
          {r.year} - {r.week_number}. Hafta
        </span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      sortable: true,
      render: (r) => {
        const cfg = STATUS_CONFIG[statusKey(r.status)] || STATUS_CONFIG.DRAFT;
        const Icon = cfg.icon;
        const unreviewed = isStaff && isUnreviewed(r);
        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${cfg.className}`}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {cfg.label}
            </span>
            {unreviewed && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" title="İncelenmedi" />
            )}
          </div>
        );
      },
    },
    {
      key: "summary",
      header: "İçerik Özeti",
      render: (r) => (
        <span
          className="text-gray-400 line-clamp-1 max-w-[200px] truncate"
          title={r.content}
        >
          {r.content.substring(0, 60)}
          {r.content.length > 60 ? "..." : ""}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          {role === "STUDENT" && r.status === "DRAFT" && (
            <button
              onClick={() => setSubmitConfirm(r.id)}
              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-900/20 hover:text-amber-300 transition-colors"
              title="Teslim Et"
              aria-label="Teslim Et"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setViewModal(r)}
            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 transition-colors"
            title="Detayları Görüntüle"
            aria-label="Detayları Görüntüle"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isStaff ? "Gelen Raporlar" : "Haftalık Raporlarım"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {isStaff
              ? "Öğrencilerden gelen haftalık raporlar."
              : "Projenize ait haftalık raporlarınızı yönetin."}
          </p>
        </div>
        {role === "STUDENT" && (
          <Button
            onClick={() => router.push("/dashboard/reports/new")}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Yeni Rapor
          </Button>
        )}
      </div>

      {/* D2: İncelenmemiş rapor uyarı banner'ı — sadece staff */}
      {isStaff && (() => {
        const unreviewedCount = reports.filter(isUnreviewed).length;
        if (unreviewedCount === 0) return null;
        return (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm text-amber-300">
              <strong>{unreviewedCount} rapor</strong> geçen haftadan bu yana incelenmedi. İnceleme yaparak öğrencilere geri bildirim verin.
            </p>
          </div>
        );
      })()}

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Proje adı veya içerik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 text-gray-200"
          />
        </div>

        {/* Öğretmen: öğrenci adına göre arama */}
        {isStaff && (
          <div className="relative min-w-[160px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Öğrenci adı..."
              value={submittedByFilter}
              onChange={(e) => setSubmittedByFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 text-gray-200"
            />
          </div>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="">{isStaff ? "Tüm Durumlar (Taslak Hariç)" : "Tüm Durumlar"}</option>
          {/* B3: Staff DRAFT görmez; backend zaten exclude eder + hata önlemek için option gizli */}
          {!isStaff && <option value="draft">Taslak</option>}
          <option value="submitted">Teslim Edildi</option>
          <option value="reviewed">İncelendi</option>
        </select>

        <select
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="">Tüm Haftalar</option>
          {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={String(w)}>
              Hafta {w}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
        >
          <option value="">Tüm Yıllar</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
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

      {/* Sınıf sekmeleri (staff için) */}
      {isStaff && (
        <ClassTabs
          activeGrade={gradeFilter || null}
          activeBranch={branchFilter}
          showAllBranches={showAllBranches}
          onChange={({ grade, branch, showAll }) => {
            setGradeFilter(grade ?? "");
            setBranchFilter(branch);
            setShowAllBranches(showAll);
          }}
        />
      )}

      {/* Hata */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={reports}
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
        onRowClick={(r) => setViewModal(r)}
        emptyMessage={
          activeFilters.length > 0
            ? "Filtrelere uyan rapor bulunamadı."
            : isStaff
            ? "Henüz teslim edilmiş rapor yok."
            : "Henüz rapor oluşturmadınız."
        }
      />

      {/* Rapor Detay Modalı */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Rapor Detayı">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => { setViewModal(null); setShowFeedbackForm(false); setFeedbackNote(""); }}
          />
          <FocusTrapContainer className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Üst bar */}
            <div
              className={`h-1 w-full ${
                viewModal.status === "REVIEWED"
                  ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                  : viewModal.status === "SUBMITTED"
                  ? "bg-gradient-to-r from-amber-400 to-orange-400"
                  : "bg-gradient-to-r from-slate-500 to-slate-600"
              }`}
            />

            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {viewModal.course_name || "Rapor Detayı"}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {viewModal.year} Yılı - {viewModal.week_number}. Hafta Raporu
                </p>
              </div>
              <button
                onClick={() => setViewModal(null)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* İçerik */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  Rapor İçeriği
                </h4>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {viewModal.content}
                </div>
              </div>

              {/* Ekstra Bilgiler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {viewModal.youtube_url && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Video Sunumu
                    </h4>
                    <a
                      href={viewModal.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors w-full justify-center"
                    >
                      🎬 YouTube&apos;da İzle
                    </a>
                  </div>
                )}

                {role === "STUDENT" && viewModal.status === "DRAFT" && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Dosya Eki
                    </h4>
                    <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-500/20 transition-colors w-full justify-center">
                      <Paperclip className="h-4 w-4" />
                      Dosya Seç
                      <input
                        type="file"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = "";
                          const formData = new FormData();
                          formData.append("file", file);
                          try {
                            await apiClient.post(
                              `/api/v1/reports/${viewModal.id}/files`,
                              formData,
                              { headers: { "Content-Type": "multipart/form-data" } }
                            );
                            toast.success("Dosya başarıyla eklendi!");
                          } catch (err: unknown) {
                            toast.error(
                              (err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Dosya eklenemedi."
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Öğretmen Geri Bildirimi */}
              {viewModal.reviewer_note ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                      💬 Değerlendirme Notu
                    </h4>
                    {viewModal.teacher_reviewed_at && (
                      <span className="text-xs text-gray-500">
                        {new Date(viewModal.teacher_reviewed_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div className="bg-emerald-900/10 border border-emerald-800/30 rounded-xl p-4 text-sm text-emerald-300 whitespace-pre-wrap">
                    {viewModal.reviewer_note}
                  </div>
                  {isStaff && (
                    <button
                      onClick={() => { setFeedbackNote(viewModal.reviewer_note ?? ""); setShowFeedbackForm(true); }}
                      className="mt-2 text-xs text-gray-400 hover:text-indigo-400 underline transition-colors"
                    >
                      Notu Güncelle
                    </button>
                  )}
                </div>
              ) : isStaff && viewModal.status === "SUBMITTED" && (
                <div>
                  <h4 className="text-sm font-medium text-amber-400 mb-2">💬 Geri Bildirim Ver</h4>
                  {!showFeedbackForm ? (
                    <button
                      onClick={() => setShowFeedbackForm(true)}
                      className="w-full rounded-xl border border-dashed border-amber-700/40 px-4 py-3 text-sm text-amber-400 hover:bg-amber-900/10 transition-colors"
                    >
                      + Geri bildirim ekle
                    </button>
                  ) : null}
                </div>
              )}

              {/* Feedback formu (gönder/güncelle) */}
              {isStaff && showFeedbackForm && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-amber-400">
                      {viewModal.reviewer_note ? "Notu Güncelle" : "Geri Bildirim Yaz"}
                    </h4>
                    {/* AI ile Öner — ton seç + tetikle */}
                    <div className="flex items-center gap-2">
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value as typeof aiTone)}
                        disabled={aiSuggestLoading || viewModal.status === "DRAFT"}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 outline-none focus:border-indigo-500 disabled:opacity-50"
                        title="AI önerisinin tonu"
                      >
                        <option value="constructive">Yapıcı</option>
                        <option value="encouraging">Cesaret verici</option>
                        <option value="critical">Eleştirel</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAiSuggestFeedback(viewModal.id)}
                        disabled={aiSuggestLoading || viewModal.status === "DRAFT"}
                        title={viewModal.status === "DRAFT" ? "DRAFT rapora öneri yazılamaz" : "AI taslak üretsin"}
                        className="flex items-center gap-1.5 rounded-lg border border-indigo-700/40 bg-indigo-900/20 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-900/40 disabled:opacity-50"
                      >
                        <Sparkles className="h-3 w-3" />
                        {aiSuggestLoading ? "Üretiliyor..." : "AI ile Öner"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Öğrenciye geri bildirim yazın... (min 5 karakter)"
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-200 outline-none focus:border-amber-500 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{feedbackNote.length}/2000</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowFeedbackForm(false); setFeedbackNote(""); }} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">Vazgeç</button>
                      <button
                        onClick={() => handleFeedback(viewModal.id)}
                        disabled={feedbackLoading || feedbackNote.trim().length < 5}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        {feedbackLoading ? "Gönderiliyor..." : "Gönder"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Yapay Zeka Analizi */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Yapay Zeka Analizi
                  </h4>
                  {!aiAnalysis[viewModal.id] && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        viewModal.status === "DRAFT" ||
                        aiLoading[viewModal.id]
                      }
                      onClick={() => handleAiAnalysis(viewModal)}
                      className="text-blue-400 border-blue-900/50 hover:bg-blue-900/20 hover:text-blue-300"
                    >
                      {aiLoading[viewModal.id]
                        ? "Analiz Ediliyor..."
                        : "Analiz Et"}
                    </Button>
                  )}
                </div>

                {viewModal.status === "DRAFT" && !aiAnalysis[viewModal.id] && (
                  <p className="text-xs text-gray-500 italic">
                    Yapay zeka analizi yapabilmek için raporu teslim etmeniz
                    gerekmektedir.
                  </p>
                )}

                {aiAnalysis[viewModal.id] && (
                  <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-4">
                    <p className="text-sm text-blue-200 mb-4">
                      {aiAnalysis[viewModal.id].summary}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h5 className="text-xs font-semibold text-emerald-400 mb-2">
                          💪 Güçlü Yönler
                        </h5>
                        <ul className="list-disc pl-4 space-y-1">
                          {aiAnalysis[viewModal.id].strengths.map(
                            (str: string, i: number) => (
                              <li key={i} className="text-xs text-gray-400">
                                {str}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-amber-400 mb-2">
                          ⚠️ Gelişime Açık Yönler
                        </h5>
                        <ul className="list-disc pl-4 space-y-1">
                          {aiAnalysis[viewModal.id].weaknesses.map(
                            (wk: string, i: number) => (
                              <li key={i} className="text-xs text-gray-400">
                                {wk}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-indigo-400 mb-2">
                          🎯 Tavsiyeler
                        </h5>
                        <ul className="list-disc pl-4 space-y-1">
                          {aiAnalysis[viewModal.id].recommendations.map(
                            (rec: string, i: number) => (
                              <li key={i} className="text-xs text-gray-400">
                                {rec}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Alt Butonlar */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex justify-end gap-3 flex-wrap">
              <Button variant="outline" onClick={() => { setViewModal(null); setShowFeedbackForm(false); setFeedbackNote(""); }}>
                Kapat
              </Button>
              {role === "STUDENT" && viewModal.status === "DRAFT" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setEditModal(viewModal)}
                    className="flex items-center gap-2 text-indigo-400 border-indigo-900/40 hover:bg-indigo-900/20 hover:text-indigo-300"
                  >
                    <Pencil className="w-4 h-4" />
                    Düzenle
                  </Button>
                  <Button onClick={() => setSubmitConfirm(viewModal.id)}>
                    Teslim Et
                  </Button>
                </>
              )}
              {/* Soft Delete — staff her zaman, student sadece DRAFT */}
              {(isStaff || (role === "STUDENT" && viewModal.status === "DRAFT")) && (
                <Button
                  variant="outline"
                  onClick={() => setSoftDeleteTarget(viewModal)}
                  className="flex items-center gap-2 text-amber-400 border-amber-700/40 hover:bg-amber-900/20 hover:text-amber-300"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </Button>
              )}
              {/* Kalıcı Sil — sadece ADMIN */}
              {role === "ADMIN" && (
                <Button
                  variant="outline"
                  onClick={() => setHardDeleteTarget(viewModal)}
                  className="flex items-center gap-2 text-red-400 border-red-700/40 hover:bg-red-900/20 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                  Kalıcı Sil
                </Button>
              )}
            </div>
          </FocusTrapContainer>
        </div>
      )}

      {/* Rapor Teslim Onayı */}
      <ConfirmDialog
        isOpen={!!submitConfirm}
        onClose={() => setSubmitConfirm(null)}
        onConfirm={() => submitConfirm && handleSubmit(submitConfirm)}
        title="Raporu Teslim Et"
        description="Raporu teslim ettiğinizde artık düzenleyemezsiniz. Onaylıyor musunuz?"
        confirmText="Evet, Teslim Et"
        cancelText="Vazgeç"
      />

      {/* Rapor Düzenleme Modalı */}
      {editModal && (
        <EditReportModal
          report={editModal}
          onClose={() => setEditModal(null)}
          onUpdated={(updated) => {
            fetchReports();
            // viewModal açıksa içeriğini de güncelle
            if (viewModal && viewModal.id === updated.id) {
              setViewModal({ ...updated, status: statusKey(updated.status as unknown as string) });
            }
          }}
        />
      )}

      {/* Soft Delete Modal */}
      <SoftDeleteModal
        open={!!softDeleteTarget}
        onClose={() => setSoftDeleteTarget(null)}
        onConfirm={async () => {
          if (!softDeleteTarget) return;
          await apiClient.delete(`/api/v1/reports/${softDeleteTarget.id}`);
          toast.success("Rapor silindi (geri yüklenebilir).");
          setViewModal(null);
          fetchReports();
        }}
        title="Raporu Sil"
        entityName={softDeleteTarget ? `${softDeleteTarget.year} - ${softDeleteTarget.week_number}. hafta` : "Rapor"}
        cascadeUrl={softDeleteTarget ? `/api/v1/reports/${softDeleteTarget.id}/cascade-info` : null}
        cascadeLabels={{ files: "Yüklenen Dosyalar" }}
        confirmLabel="Sil"
      />

      {/* Hard Delete Modal (Admin) */}
      <SoftDeleteModal
        open={!!hardDeleteTarget}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={async () => {
          if (!hardDeleteTarget) return;
          await apiClient.delete(`/api/v1/reports/${hardDeleteTarget.id}/hard`);
          toast.success("Rapor kalıcı olarak silindi.");
          setViewModal(null);
          fetchReports();
        }}
        title="Raporu Kalıcı Sil"
        entityName={hardDeleteTarget ? `${hardDeleteTarget.year} - ${hardDeleteTarget.week_number}. hafta` : "Rapor"}
        cascadeUrl={hardDeleteTarget ? `/api/v1/reports/${hardDeleteTarget.id}/cascade-info` : null}
        cascadeLabels={{ files: "Yüklenen Dosyalar" }}
        confirmLabel="Kalıcı Sil"
        destructive
      />
    </div>
  );
}
