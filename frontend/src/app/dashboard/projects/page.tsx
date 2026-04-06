"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { FolderKanban, Plus } from "lucide-react";

type ProjectStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";

interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  created_by: string;
  course_id: string | null;
  course_name: string | null;
  course_code: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; className: string }> = {
  DRAFT:    { label: "Taslak",      className: "bg-slate-700 text-slate-300" },
  PENDING:  { label: "Bekliyor",    className: "bg-amber-500/20 text-amber-400" },
  APPROVED: { label: "Onaylı",      className: "bg-emerald-500/20 text-emerald-400" },
  REJECTED: { label: "Reddedildi",  className: "bg-red-500/20 text-red-400" },
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/v1/projects");
      setProjects(data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Projeler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleApprove = async (id: string) => {
    try {
      await apiClient.post(`/api/v1/projects/${id}/approve`);
      fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Onaylama başarısız.");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Bu projeyi reddetmek istediğinize emin misiniz?")) return;
    try {
      await apiClient.post(`/api/v1/projects/${id}/reject`);
      fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Reddetme başarısız.");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-sm text-gray-400">Projeler yükleniyor...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {(role === "TEACHER" || role === "ADMIN") ? "Tüm Projeler" : "Projelerim"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {(role === "TEACHER" || role === "ADMIN")
              ? "Sistemdeki tüm projeler."
              : "Oluşturduğunuz tüm projeler."}
          </p>
        </div>
        {role === "STUDENT" && (
          <button
            onClick={() => router.push("/dashboard/projects/new")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Yeni Proje
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
      {projects.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <FolderKanban className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {(role === "TEACHER" || role === "ADMIN") ? "Henüz gönderilmiş proje yok." : "Henüz bir proje oluşturmadınız."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Proje Listesi — Derse Göre Gruplandırılmış */}
      {(() => {
        const grouped = projects.reduce((acc, project) => {
          const key = project.course_name ?? "Ders Atanmamış";
          if (!acc[key]) acc[key] = { code: project.course_code, projects: [] };
          acc[key].projects.push(project);
          return acc;
        }, {} as Record<string, { code: string | null; projects: Project[] }>);

        return Object.entries(grouped).map(([courseName, { code, projects: courseProjects }]) => (
          <div key={courseName} className="space-y-4">
            {/* Ders Başlığı */}
            <div className="flex items-center gap-3">
              {code && (
                <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400">
                  {code}
                </span>
              )}
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{courseName}</h3>
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
              <span className="text-xs text-gray-400">{courseProjects.length} proje</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courseProjects.map((project) => {
                const normalizedStatus = project.status?.toUpperCase() as ProjectStatus;
                const status = STATUS_CONFIG[normalizedStatus] ?? { label: project.status, className: "bg-slate-700 text-slate-300" };
                return (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:ring-2 hover:ring-indigo-500/30 transition-all"
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${status.className}`}>
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(project.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{project.title}</h3>
                      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{project.description}</p>

                      {/* Öğretmen: Onayla / Reddet */}
                      {(role === "TEACHER" || role === "ADMIN") && project.status === "PENDING" && (
                        <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleApprove(project.id)}
                            className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleReject(project.id)}
                            className="flex-1 rounded-lg bg-red-700 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                          >
                            Reddet
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ));
      })()}
    </div>
  );
}
