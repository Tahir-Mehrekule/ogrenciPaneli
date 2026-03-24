"use client";

import { useAuth } from "@/hooks/useAuth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  // Kullanıcının rolüne göre doğru dashboard bileşenini ekrana basar
  if (user?.role === "ADMIN") {
    return <AdminDashboard />;
  }

  if (user?.role === "TEACHER") {
    return <TeacherDashboard />;
  }

  if (user?.role === "STUDENT") {
    return <StudentDashboard />;
  }

  // Yükleme anında veya yetki hatasında boş döner (DashboardLayout zaten /login'e atar)
  return null;
}
