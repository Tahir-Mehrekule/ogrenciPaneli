"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { BookOpen, FolderKanban, Clock, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  created_by_name?: string;
}

interface Stats {
  courses: number;
  totalProjects: number;
  pendingProjects: number;
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Aktif", className: "bg-emerald-500/10 text-emerald-400" },
  PENDING:  { label: "Bekliyor", className: "bg-amber-500/10 text-amber-400" },
  DRAFT:    { label: "Taslak", className: "bg-slate-500/10 text-slate-400" },
  REJECTED: { label: "Reddedildi", className: "bg-red-500/10 text-red-400" },
};

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ courses: 0, totalProjects: 0, pendingProjects: 0 });
  const [pendingProjects, setPendingProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, projectsRes] = await Promise.all([
          apiClient.get("/api/v1/courses"),
          apiClient.get("/api/v1/projects?per_page=100"),
        ]);

        const courses: any[] = coursesRes.data?.items ?? [];
        const projects: Project[] = projectsRes.data?.items ?? [];

        const pending = projects.filter((p) => p.status?.toUpperCase() === "PENDING");

        setStats({
          courses: courses.length,
          totalProjects: projects.length,
          pendingProjects: pending.length,
        });
        setPendingProjects(pending.slice(0, 5));
      } catch {
        // Sessizce hata yut
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { title: "Verdiğim Dersler", value: stats.courses, icon: BookOpen, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400" },
    { title: "Takip Ettiğim Projeler", value: stats.totalProjects, icon: FolderKanban, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400" },
    { title: "Onay Bekleyen", value: stats.pendingProjects, icon: Clock, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400" },
  ];

  const handleApprove = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/approve`);
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
      setStats((s) => ({ ...s, pendingProjects: s.pendingProjects - 1 }));
    } catch {}
  };

  const handleReject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm("Bu projeyi reddetmek istediğinize emin misiniz?")) return;
    try {
      await apiClient.post(`/api/v1/projects/${projectId}/reject`);
      setPendingProjects((prev) => prev.filter((p) => p.id !== projectId));
      setStats((s) => ({ ...s, pendingProjects: s.pendingProjects - 1 }));
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Hoş geldin, Öğretmen {user?.name?.split(" ")[0]}! 🎓
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Öğrenci proje onayları ve sınıf istatistikleri burada listeleniyor.
        </p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                  {isLoading ? (
                    <div className="mt-1 h-7 w-12 animate-pulse rounded bg-gray-200 dark:bg-slate-700" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Onay Bekleyen Projeler Paneli */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Onay Bekleyen Projeler
              {stats.pendingProjects > 0 && (
                <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400">
                  {stats.pendingProjects}
                </span>
              )}
            </h3>
            <button
              onClick={() => router.push("/dashboard/projects")}
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400"
            >
              Tüm Projeler <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : pendingProjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Şu an bekleyen yeni bir proje başvurusu bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {pendingProjects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 cursor-pointer hover:opacity-80"
                  onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.title}</p>
                    <p className="text-xs text-gray-500 truncate">{p.description}</p>
                  </div>
                  <div className="ml-3 flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => handleApprove(e, p.id)}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Onayla
                    </button>
                    <button
                      onClick={(e) => handleReject(e, p.id)}
                      className="rounded-lg bg-red-600/80 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 flex items-center gap-1"
                    >
                      <XCircle className="h-3 w-3" /> Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
