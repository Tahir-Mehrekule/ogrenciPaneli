"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { FileText, Plus, Paperclip } from "lucide-react";

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

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  DRAFT:     { label: "Taslak",        className: "bg-slate-700 text-slate-300" },
  SUBMITTED: { label: "Teslim Edildi", className: "bg-amber-500/20 text-amber-400" },
  REVIEWED:  { label: "İncelendi",     className: "bg-emerald-500/20 text-emerald-400" },
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

  const fetchReports = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/v1/reports");
      setReports(data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Raporlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

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
          const status = STATUS_CONFIG[normalizedStatus] ?? { label: report.status, className: "bg-slate-700 text-slate-300" };
          return (
            <Card key={report.id}>
              <CardContent className="p-5">
                {/* Üst Satır */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${status.className}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {report.year} — {report.week_number}. Hafta
                  </span>
                </div>

                {/* İçerik */}
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                  {report.content}
                </p>

                {/* YouTube */}
                {report.youtube_url && (
                  <a
                    href={report.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline"
                  >
                    🎬 Video raporu izle
                  </a>
                )}

                {/* Öğretmen Notu */}
                {report.reviewer_note && (
                  <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <p className="text-xs text-emerald-400">
                      💬 Öğretmen notu: {report.reviewer_note}
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
              </CardContent>
            </Card>
            );
          })}
          </div>
        ));
      })()}
    </div>
  );
}
