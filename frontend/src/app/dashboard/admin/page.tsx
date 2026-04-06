"use client";

import React, { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Users,
  FolderKanban,
  CheckSquare,
  FileText,
  BookOpen,
  UserCheck,
  HardDrive,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

interface DetailedStats {
  total_users: number;
  total_projects: number;
  total_courses: number;
  total_tasks: number;
  total_reports: number;
  total_files: number;
  total_enrollments: number;
  role_breakdown: { students: number; teachers: number; admins: number };
  project_breakdown: {
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    in_progress: number;
    completed: number;
  };
  task_breakdown: { todo: number; in_progress: number; review: number; done: number };
  report_breakdown: { draft: number; submitted: number; reviewed: number };
  task_completion_rate: number;
  report_review_rate: number;
}

// ── Yardımcı: Yatay progress bar ──
function ProgressBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-gray-500 dark:text-gray-400 truncate">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
        {value}
      </span>
    </div>
  );
}

// ── Yardımcı: Breakdown kart bileşeni (DRY) ──
function BreakdownCard({
  title,
  icon: Icon,
  items,
  total,
  rate,
  rateLabel,
}: {
  title: string;
  icon: React.ElementType;
  items: { label: string; value: number; color: string }[];
  total: number;
  rate?: number;
  rateLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Icon className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="ml-auto text-xs text-gray-400">Toplam: {total}</span>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <ProgressBar
              key={item.label}
              label={item.label}
              value={item.value}
              total={total}
              color={item.color}
            />
          ))}
        </div>
        {rate !== undefined && rateLabel && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">{rateLabel}</span>
            <span className="text-lg font-bold text-indigo-400">%{rate}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<DetailedStats>("/api/v1/admin/stats/detailed")
      .then(({ data }) => setStats(data))
      .catch(() => toast.error("Detaylı istatistikler alınamadı."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sistem İstatistikleri
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Yükleniyor...</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">İstatistikler yüklenemedi.</p>
      </div>
    );
  }

  const summaryCards = [
    {
      title: "Toplam Kullanıcılar",
      value: stats.total_users,
      icon: Users,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400",
    },
    {
      title: "Toplam Projeler",
      value: stats.total_projects,
      icon: FolderKanban,
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400",
    },
    {
      title: "Görev Tamamlanma",
      value: `%${stats.task_completion_rate}`,
      icon: CheckSquare,
      color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400",
    },
    {
      title: "Rapor İnceleme",
      value: `%${stats.report_review_rate}`,
      icon: FileText,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400",
    },
  ];

  const rb = stats.role_breakdown;
  const pb = stats.project_breakdown;
  const tb = stats.task_breakdown;
  const rpb = stats.report_breakdown;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Sistem İstatistikleri
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Detaylı sistem kullanım verileri ve dağılımları.
        </p>
      </div>

      {/* Satır 1 — Özet Kartları */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Satır 2 — Kullanıcı Rol + Proje Durum Dağılımı */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Kullanıcı Rol Dağılımı"
          icon={Users}
          total={stats.total_users}
          items={[
            { label: "Öğrenci", value: rb.students, color: "bg-blue-500" },
            { label: "Öğretmen", value: rb.teachers, color: "bg-emerald-500" },
            { label: "Yönetici", value: rb.admins, color: "bg-purple-500" },
          ]}
        />
        <BreakdownCard
          title="Proje Durum Dağılımı"
          icon={FolderKanban}
          total={stats.total_projects}
          items={[
            { label: "Taslak", value: pb.draft, color: "bg-slate-500" },
            { label: "Bekliyor", value: pb.pending, color: "bg-amber-500" },
            { label: "Onaylı", value: pb.approved, color: "bg-emerald-500" },
            { label: "Reddedildi", value: pb.rejected, color: "bg-red-500" },
            { label: "Devam Ediyor", value: pb.in_progress, color: "bg-blue-500" },
            { label: "Tamamlandı", value: pb.completed, color: "bg-indigo-500" },
          ]}
        />
      </div>

      {/* Satır 3 — Görev Durumu + Rapor Durumu */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Görev Durumu"
          icon={CheckSquare}
          total={stats.total_tasks}
          items={[
            { label: "Yapılacak", value: tb.todo, color: "bg-slate-500" },
            { label: "Devam Ediyor", value: tb.in_progress, color: "bg-blue-500" },
            { label: "İncelemede", value: tb.review, color: "bg-amber-500" },
            { label: "Tamamlandı", value: tb.done, color: "bg-emerald-500" },
          ]}
          rate={stats.task_completion_rate}
          rateLabel="Tamamlanma Oranı"
        />
        <BreakdownCard
          title="Rapor Durumu"
          icon={FileText}
          total={stats.total_reports}
          items={[
            { label: "Taslak", value: rpb.draft, color: "bg-slate-500" },
            { label: "Gönderildi", value: rpb.submitted, color: "bg-amber-500" },
            { label: "İncelendi", value: rpb.reviewed, color: "bg-emerald-500" },
          ]}
          rate={stats.report_review_rate}
          rateLabel="İncelenme Oranı"
        />
      </div>

      {/* Satır 4 — Ek Sayılar */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { title: "Toplam Dersler", value: stats.total_courses, icon: BookOpen, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-400" },
          { title: "Toplam Kayıtlar", value: stats.total_enrollments, icon: UserCheck, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400" },
          { title: "Toplam Dosyalar", value: stats.total_files, icon: HardDrive, color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
