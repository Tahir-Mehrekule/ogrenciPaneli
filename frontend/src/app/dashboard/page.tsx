"use client";

import { useAuth } from "@/hooks/useAuth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { TeacherDashboard } from "@/components/dashboard/TeacherDashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();

  if (role === "ADMIN") return <AdminDashboard />;
  if (role === "TEACHER") return <TeacherDashboard />;
  if (role === "STUDENT") return <StudentDashboard />;

  return null;
}
