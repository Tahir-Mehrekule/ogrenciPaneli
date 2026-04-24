"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { FileText, Plus, Paperclip, Search, X } from "lucide-react";

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
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string; dot: string }> = {
  DRAFT:     { label: "Taslak",        className: "border border-slate-600/60 bg-slate-800/60 text-slate-300",          dot: "bg-slate-400" },
  SUBMITTED: { label: "Teslim Edildi", className: "border border-amber-500/30 bg-amber-500/10 text-amber-400",           dot: "bg-amber-400" },
  REVIEWED:  { label: "İncelendi",     className: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400",     dot: "bg-emerald-400" },
};

export default function ReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const role = user?.role?.toUpperCase();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [weekFilter, setWeekFilter] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams({ size: "100" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (weekFilter) params.set("week_number", weekFilter);
      const { data } = await apiClient.get(`/api/v1/reports?${params}`);
      setReports(data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Raporlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, weekFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSubmit = async (reportId: string) => {
    if (!confirm("Raporu teslim etmek istediğinize emin misiniz?")) return;
    try {
      await apiClient.post(`/api/v1/reports/${reportId}/submit`);
      fetchReports();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Teslim başarısız.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-gray-400">Raporlar yükleniyor...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {role === "TEACHER" ? "Gelen Raporlar" : "Haftalık Raporlarım"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {role === "TEACHER" ? "Öğrencilerden gelen haftalık raporlar." : "Projenize ait haftalık raporlarınız."}
          </p>
        </div>
        {role === "STUDENT" && (
          <button
            onClick={() => router.push("/dashboard/reports/new")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Yeni Rapor
          </button>
        )}
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Proje adı veya içerik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
        >
          <option value="">Tüm Durumlar</option>
          <option value="DRAFT">Taslak</option>
          <option value="SUBMITTED">Teslim Edildi</option>
          <option value="REVIEWED">İncelendi</option>
        </select>
        <select
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
        >
          <option value="">Tüm Haftalar</option>
          {Array.from({ length: 14 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={String(w)}>Hafta {w}</option>
          ))}
        </select>
        {(search || statusFilter || weekFilter) && (
          <button
            onClick={() => { setSearch(""); setStatusFilter(""); setWeekFilter(""); }}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800/40 dark:text-red-400"
          >
            <X className="h-3.5 w-3.5" /> Temizle
          </button>
        )}
      </div>

      {/* Hata */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Boş Durum */}
      {reports.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {role === "TEACHER" ? "Henüz teslim edilmiş rapor yok." : "Henüz rapor oluşturmadınız."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Rapor Listesi — Derse Göre Gruplandırılmış */}
      {(() => {
        const grouped = reports.reduce((acc, report) => {
          const key = report.course_name ?? "Ders Atanmamış";
          if (!acc[key]) acc[key] = { code: report.course_code, reports: [] };
          acc[key].reports.push(report);
          return acc;
        }, {} as Record<string, { code: string | null; reports: Report[] }>);

        return Object.entries(grouped).map(([courseName, { code, reports: courseReports }]) => (
          <div key={courseName} className="space-y-3">
            {/* Ders Başlığı */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {code && (
                  <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400">
                    {code}
                  </span>
                )}
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{courseName}</h3>
              </div>
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
              <span className="text-xs text-gray-400">{courseReports.length} rapor</span>
            </div>

            {courseReports.map((report) => {
          const normalizedStatus = report.status?.toUpperCase() as ReportStatus;
          const status = STATUS_CONFIG[normalizedStatus] ?? { label: report.status, className: "border border-slate-600/60 bg-slate-800/60 text-slate-300", dot: "bg-slate-400" };
          return (
            <div
              key={report.id}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/80 shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition-all hover:shadow-md hover:ring-indigo-200/50 dark:border-slate-700/60 dark:bg-slate-900/70 dark:ring-white/5 dark:hover:ring-indigo-500/20"
            >
              {/* Üst gradient bar */}
              <div
                className={`h-0.5 w-full ${
                  normalizedStatus === "REVIEWED"
                    ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                    : normalizedStatus === "SUBMITTED"
                    ? "bg-gradient-to-r from-amber-400 to-orange-400"
                    : "bg-gradient-to-r from-slate-500 to-slate-600"
                }`}
              />

              <div className="p-5">
                {/* Üst Satır */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                  <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-gray-400">
                    {report.year} · {report.week_number}. Hafta
                  </span>
                </div>

                {/* İçerik */}
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 line-clamp-3">
                  {report.content}
                </p>

                {/* YouTube */}
                {report.youtube_url && (
                  <a
                    href={report.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200/60 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/10 dark:border-red-800/40 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    🎬 Video raporu izle
                  </a>
                )}

                {/* Öğretmen Notu */}
                {report.reviewer_note && (
                  <div className="mt-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/60 p-3.5 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-800/40">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      💬 Öğretmen notu
                    </p>
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">
                      {report.reviewer_note}
                    </p>
                  </div>
                )}

                {/* AI Analiz Sonuçları */}
                {aiAnalysis[report.id] && (
                  <div className="mt-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🤖</span>
                      <h4 className="text-sm font-bold text-indigo-400">Yapay Zeka Rapor Analizi</h4>
                    </div>
                    <p className="text-xs text-gray-300 mb-3">{aiAnalysis[report.id].summary}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <h5 className="text-xs font-semibold text-emerald-400 mb-1">💪 Güçlü Yönler</h5>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {aiAnalysis[report.id].strengths.map((str: string, i: number) => <li key={i} className="text-xs text-gray-400">{str}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-amber-400 mb-1">⚠️ Gelişime Açık Yönler</h5>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {aiAnalysis[report.id].weaknesses.map((wk: string, i: number) => <li key={i} className="text-xs text-gray-400">{wk}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-semibold text-blue-400 mb-1">🎯 Tavsiyeler</h5>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {aiAnalysis[report.id].recommendations.map((rec: string, i: number) => <li key={i} className="text-xs text-gray-400">{rec}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Aksiyon Butonları */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {/* Öğrenciye Özel Butonlar (Gösterilir ama izne göre disabled olur) */}
                  {role === "STUDENT" && (
                    <>
                      {/* Dosya Ekle — tüm durumlarda */}
                      <label
                        className="cursor-pointer flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors border bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-700"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-indigo-400" />
                        Dosya Ekle
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
                              await apiClient.post(`/api/v1/reports/${report.id}/files`, formData, {
                                headers: { "Content-Type": "multipart/form-data" },
                              });
                              alert("Dosya başarıyla eklendi!");
                            } catch (err: any) {
                              alert(err.response?.data?.detail || "Dosya eklenemedi.");
                            }
                          }}
                        />
                      </label>
                      {/* Teslim Et — sadece DRAFT */}
                      {normalizedStatus === "DRAFT" && (
                        <button
                          onClick={() => handleSubmit(report.id)}
                          className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                        >
                          Teslim Et
                        </button>
                      )}
                    </>
                  )}

                  {/* AI Analiz Butonu */}
                  {!aiAnalysis[report.id] && (
                    <button
                      disabled={normalizedStatus === "DRAFT" || aiLoading[report.id]}
                      title={normalizedStatus === "DRAFT" ? "Önce raporun teslim edilmesi gerekiyor" : "Yapay zeka ile analiz et"}
                      onClick={async () => {
                        if (normalizedStatus === "DRAFT") return;
                        try {
                          setAiLoading(prev => ({ ...prev, [report.id]: true }));
                          const res = await apiClient.post("/api/v1/ai/analyze-report", { report_id: report.id });
                          setAiAnalysis(prev => ({ ...prev, [report.id]: res.data }));
                        } catch (err: any) {
                          alert(err.response?.data?.detail || "Analiz alınamadı.");
                        } finally {
                          setAiLoading(prev => ({ ...prev, [report.id]: false }));
                        }
                      }}
                      className="disabled:opacity-50 disabled:cursor-not-allowed rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                    >
                      {aiLoading[report.id] ? "Analiz ediliyor..." : "AI ile Analiz Et"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
          </div>
        ));
      })()}
    </div>
  );
}
