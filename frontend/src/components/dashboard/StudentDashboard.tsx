"use client";

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookOpen, FolderKanban, CheckSquare } from "lucide-react";

export const StudentDashboard = () => {
  const { user } = useAuth();

  // İlerleyen modüllerde (Kurs, Proje modülü) gerçek API istekleriyle doldurulacak olan geçici veri seti
  const mockStats = [
    { title: "Kayıtlı Derslerim", value: "0", icon: BookOpen, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50" },
    { title: "Aktif Projelerim", value: "0", icon: FolderKanban, color: "text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50" },
    { title: "Bekleyen Görevlerim", value: "0", icon: CheckSquare, color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Hoş geldin, {user?.name.split(" ")[0]}! 👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          İşte sınıf ve proje süreçlerindeki son durumun.
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

      {/* Yaklaşan Görevler veya Son Bildirimler Paneli */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Yaklaşan Rapor Teslimleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-slate-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Şu an için yaklaşan bir teslim tarihi bulunmuyor.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
