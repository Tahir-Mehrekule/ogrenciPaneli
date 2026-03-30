"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/Card";
import { BookOpen, Plus } from "lucide-react";

interface Course {
  id: string;
  name: string;
  code: string;
  semester: string;
  teacher_id: string;
  is_active: boolean;
}

interface PaginatedResponse {
  items: Course[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export default function CoursesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCourses = useCallback(async () => {
    try {
      const { data } = await apiClient.get<PaginatedResponse>("/api/v1/courses");
      setCourses(data.items);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Dersler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleEnroll = async (courseId: string) => {
    try {
      await apiClient.post(`/api/v1/courses/${courseId}/enroll`);
      alert("Derse kaydınız yapıldı!");
      fetchCourses();
    } catch (err: any) {
      const msg = err.response?.data?.detail;
      alert(typeof msg === "string" ? msg : "Kayıt başarısız.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Dersler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {user?.role === "TEACHER" ? "Verdiğim Dersler" : "Ders Kataloğu"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.role === "TEACHER"
              ? "Oluşturduğunuz dersler burada listelenir."
              : "Kayıt olabileceğiniz tüm dersler."}
          </p>
        </div>
        {user?.role === "TEACHER" && (
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
              {user?.role === "TEACHER"
                ? "Henüz bir ders oluşturmadınız."
                : "Henüz açılmış ders bulunmuyor."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                    {course.code}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {course.semester}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {course.name}
                </h3>
                {user?.role === "STUDENT" && (
                  <button
                    onClick={() => handleEnroll(course.id)}
                    className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                  >
                    Kayıt Ol
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
