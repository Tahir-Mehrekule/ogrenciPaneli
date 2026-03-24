"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookOpen, FolderKanban, CheckSquare, FileText } from "lucide-react";
import toast from "react-hot-toast";

interface SystemStats {
  total_courses: number;
  total_projects: number;
  total_active_tasks: number;
  total_open_reports: number;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await apiClient.get<SystemStats>("/api/v1/admin/stats");
        setStats(data);
      } catch (error) {
        toast.error("İstatistikler alınırken hata oluştu.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Toplam Ders",
      value: stats?.total_courses || 0,
      icon: BookOpen,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400",
    },
    {
      title: "Toplam Proje",
      value: stats?.total_projects || 0,
      icon: FolderKanban,
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400",
    },
    {
      title: "Aktif Görevler",
      value: stats?.total_active_tasks || 0,
      icon: CheckSquare,
      color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400",
    },
    {
      title: "Açık Raporlar",
      value: stats?.total_open_reports || 0,
      icon: FileText,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="h-24 bg-gray-100 dark:bg-slate-800" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Sistem İstatistikleri
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Tüm sistem üzerindeki genel kullanım verileri.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
