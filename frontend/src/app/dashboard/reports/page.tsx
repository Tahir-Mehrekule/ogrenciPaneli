"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { FileText, Plus, Paperclip, Search, X, Eye, Send, Sparkles } from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { FilterPanel, ActiveFilter, SortOption } from "@/components/ui/FilterPanel";
import { Button } from "@/components/ui/Button";
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
  created_at: string;
  course_name: string | null;
  course_code: string | null;
  submitted_by_name?: string;
}

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string; dot: string }
> = {
  DRAFT:     { label: "Taslak",        className: "border-slate-600/60 bg-slate-800/60 text-slate-300",         dot: "bg-slate-400" },
  SUBMITTED: { label: "Teslim Edildi", className: "border-amber-500/30 bg-amber-500/10 text-amber-400",          dot: "bg-amber-400" },
  REVIEWED:  { label: "İncelendi",     className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",    dot: "bg-emerald-400" },
};

const SORT_OPTIONS: SortOption[] = [
  { value: "created_at", label: "Oluşturma Tarihi" },
  { value: "week_number", label: "Hafta No" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

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

  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [submittedByFilter, setSubmittedByFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [viewModal, setViewModal] = useState<Report | null>(null);

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

      const { data } = await apiClient.get(`/api/v1/reports?${params}`);
      setReports(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Raporlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, weekFilter, yearFilter, submittedByFilter, sortBy, sortOrder]);

  useEffect(() => { setPage(1); }, [search, statusFilter, weekFilter, yearFilter, submittedByFilter, sortBy, sortOrder]);
  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSubmit = async (reportId: string) => {
    if (!confirm("Raporu teslim etmek istediğinize emin misiniz?")) return;
    try {
      await apiClient.post(`/api/v1/reports/${reportId}/submit`);
      fetchReports();
      if (viewModal && viewModal.id === reportId) {
        setViewModal({ ...viewModal, status: "SUBMITTED" });
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Teslim başarısız.");
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
    } catch (err: any) {
      alert(err.response?.data?.detail || "Analiz alınamadı.");
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
  };

  const activeFilters: ActiveFilter[] = [
    ...(search ? [{ key: "search", label: "Arama", displayValue: search }] : []),
    ...(statusFilter
      ? [{ key: "status", label: "Durum", displayValue: STATUS_CONFIG[statusFilter as ReportStatus]?.label ?? statusFilter }]
      : []),
    ...(weekFilter ? [{ key: "week", label: "Hafta", displayValue: `${weekFilter}. Hafta` }] : []),
    ...(yearFilter ? [{ key: "year", label: "Yıl", displayValue: yearFilter }] : []),
    ...(submittedByFilter ? [{ key: "submittedBy", label: "Öğrenci", displayValue: submittedByFilter }] : []),
  ];

  const clearFilter = (key: string) => {
    if (key === "search") setSearch("");
    if (key === "status") setStatusFilter("");
    if (key === "week") setWeekFilter("");
    if (key === "year") setYearFilter("");
    if (key === "submittedBy") setSubmittedByFilter("");
  };

  const columns: Column<Report>[] = [
    {
      key: "course",
      header: "Ders / Proje",
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
      render: (r) => {
        const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.DRAFT;
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${status.className}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
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
              onClick={() => handleSubmit(r.id)}
              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-900/20 hover:text-amber-300 transition-colors"
              title="Teslim Et"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setViewModal(r)}
            className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-900/20 hover:text-blue-300 transition-colors"
            title="Detayları Görüntüle"
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
          <option value="">Tüm Durumlar</option>
          <option value="DRAFT">Taslak</option>
          <option value="SUBMITTED">Teslim Edildi</option>
          <option value="REVIEWED">İncelendi</option>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setViewModal(null)}
          />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                          } catch (err: any) {
                            toast.error(
                              err.response?.data?.detail || "Dosya eklenemedi."
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Öğretmen Notu */}
              {viewModal.reviewer_note && (
                <div>
                  <h4 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                    💬 Değerlendirme Notu
                  </h4>
                  <div className="bg-emerald-900/10 border border-emerald-800/30 rounded-xl p-4 text-sm text-emerald-300 whitespace-pre-wrap">
                    {viewModal.reviewer_note}
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
            <div className="p-4 border-t border-gray-800 bg-gray-900/80 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setViewModal(null)}>
                Kapat
              </Button>
              {role === "STUDENT" && viewModal.status === "DRAFT" && (
                <Button onClick={() => handleSubmit(viewModal.id)}>
                  Teslim Et
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
