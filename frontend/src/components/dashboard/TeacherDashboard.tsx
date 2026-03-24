"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookOpen, FolderKanban, Clock, Users } from "lucide-react";

export const TeacherDashboard = () => {
  const { user } = useAuth();

  // İlerleyen safhalarda /api/v1/projects endpointine bağlanacak mock geçici veriler
  const mockStats = [
    { title: "Verdiğim Dersler", value: "4", icon: BookOpen, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50" },
    { title: "Danışmanı Olduğum Projeler", value: "7", icon: Users, color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50" },
    { title: "Onay Bekleyenler", value: "3", icon: Clock, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Hoş geldin, Öğretmen {user?.name.split(" ")[0]}! 🎓
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Öğrenci proje onayları ve sınıf istatistikleri burada listeleniyor.
        </p>
      </div>

      {/* İstatistik Çubukları */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {mockStats.map((stat, i) => {
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

      {/* Öğretene Özel Hızlı Raporlar Modülü */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Onay Bekleyen Projeler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Şu an bekleyen yeni bir proje başvurusuz bulunmuyor.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Son Yüklenen Raporlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Öğrenciler henüz haftalık rapor yüklemedi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
