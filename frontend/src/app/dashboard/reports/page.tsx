"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { FileText, Plus } from "lucide-react";

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

      {/* Rapor Listesi */}
      <div className="space-y-4">
        {reports.map((report) => {
          const status = STATUS_CONFIG[report.status];
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

                {/* Teslim Et (Öğrenci + DRAFT) */}
                {role === "STUDENT" && report.status === "DRAFT" && (
                  <button
                    onClick={() => handleSubmit(report.id)}
                    className="mt-3 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    📨 Teslim Et
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
