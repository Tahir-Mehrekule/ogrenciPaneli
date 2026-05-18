"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { BookOpen, Plus, User } from "lucide-react";

type ProjectType = "individual" | "team" | "both";

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  teacher_id: string;
  teacher_name: string;
  department_id: string | null;
  is_active: boolean;
  project_type: ProjectType;
  require_youtube: boolean;
  require_file: boolean;
}

interface PaginatedResponse {
  items: Course[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const PROJECT_TYPE_BADGE: Record<ProjectType, { label: string; className: string }> = {
  individual: { label: "Bireysel",  className: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
  team:       { label: "Ekip",      className: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" },
  both:       { label: "Serbest",   className: "bg-gray-500/10 border-gray-500/20 text-gray-400" },
};

export default function CoursesPage() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse>("/api/v1/courses");
      setCourses(data.items);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail || "Dersler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Dersler yükleniyor...</p>
      </div>
    );
  }

  const isEditable = role === "TEACHER" || role === "ADMIN";
  // Admin Plan A5/B6: Sadece ADMIN ders oluşturabilir. Teacher butonu görmez.
  const canCreateCourse = role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isEditable ? "Tüm Dersler" : "Derslerim"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEditable
              ? "Oluşturduğunuz dersler ve proje ayarları."
              : "Bölümünüze atanmış dersler aşağıda listeleniyor."}
          </p>
        </div>
        {canCreateCourse && (
          <button
            onClick={() => router.push("/dashboard/courses/new")}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Yeni Ders Oluştur
          </button>
        )}
      </div>

      {/* Hata */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Ders Listesi */}
      {courses.length === 0 && !error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <BookOpen className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {isEditable
                ? "Henüz bir ders oluşturmadınız."
                : "Bölümünüze atanmış aktif ders bulunmuyor."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const typeBadge = PROJECT_TYPE_BADGE[course.project_type ?? "both"];
            return (
              <Card
                key={course.id}
                className={isEditable ? "cursor-pointer select-none transition-colors hover:border-indigo-500/50" : ""}
                onClick={() => {
                  if (isEditable) router.push(`/dashboard/courses/${course.id}`);
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                      {course.code}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {course.semester}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${typeBadge.className}`}>
                      {typeBadge.label}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {course.name}
                  </h3>

                  {/* Öğretmen adı (öğrenci görünümü) */}
                  {role === "STUDENT" && course.teacher_name && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <User className="h-3.5 w-3.5" />
                      <span>{course.teacher_name}</span>
                    </div>
                  )}

                  {(course.require_youtube || course.require_file) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {course.require_youtube && (
                        <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                          Video zorunlu
                        </span>
                      )}
                      {course.require_file && (
                        <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                          Dosya zorunlu
                        </span>
                      )}
                    </div>
                  )}

                  {isEditable && (
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Düzenlemek için tıklayın
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
