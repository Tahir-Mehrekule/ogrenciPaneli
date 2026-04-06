"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { BookOpen, FolderKanban, Clock, ArrowRight } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
}

interface Stats {
  courses: number;
  activeProjects: number;
  pendingProjects: number;
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Aktif", className: "bg-emerald-500/10 text-emerald-400" },
  PENDING:  { label: "Bekliyor", className: "bg-amber-500/10 text-amber-400" },
  DRAFT:    { label: "Taslak", className: "bg-slate-500/10 text-slate-400" },
  REJECTED: { label: "Reddedildi", className: "bg-red-500/10 text-red-400" },
};

export const StudentDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ courses: 0, activeProjects: 0, pendingProjects: 0 });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
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

        const active = projects.filter((p) => p.status?.toUpperCase() === "APPROVED").length;
        const pending = projects.filter((p) => p.status?.toUpperCase() === "PENDING").length;

        setStats({ courses: courses.length, activeProjects: active, pendingProjects: pending });
        setRecentProjects(projects.slice(0, 5));
      } catch {
        // Sessizce hata yut — sayılar 0 kalır
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { title: "Kayıtlı Derslerim", value: stats.courses, icon: BookOpen, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400" },
    { title: "Aktif Projelerim", value: stats.activeProjects, icon: FolderKanban, color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400" },
    { title: "Onay Bekleyenler", value: stats.pendingProjects, icon: Clock, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Hoş geldin, {user?.name?.split(" ")[0]}! 👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          İşte sınıf ve proje süreçlerindeki son durumun.
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

      {/* Son Projeler */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Son Projelerim</h3>
            <button
              onClick={() => router.push("/dashboard/projects")}
              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400"
            >
              Tümü <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : recentProjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Henüz proje oluşturmadınız.</p>
              <button
                onClick={() => router.push("/dashboard/projects/new")}
                className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Proje Oluştur
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {recentProjects.map((p) => {
                const cfg = STATUS_CFG[p.status?.toUpperCase()] ?? STATUS_CFG.DRAFT;
                return (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                    className="flex w-full items-center justify-between py-3 text-left hover:opacity-80 transition-opacity"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.title}</p>
                      <p className="text-xs text-gray-500 truncate">{p.description}</p>
                    </div>
                    <span className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
