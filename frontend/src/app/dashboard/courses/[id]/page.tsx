"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ArrowLeft, BookOpen, Save, Trash2 } from "lucide-react";

type ProjectType = "individual" | "team" | "both";

interface CourseDetail {
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

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; desc: string }[] = [
  { value: "both",       label: "Her İkisi",              desc: "Öğrenci bireysel veya ekip seçer" },
  { value: "individual", label: "Bireysel Proje Zorunlu", desc: "Sadece bireysel proje açılabilir" },
  { value: "team",       label: "Ekip Projesi Zorunlu",   desc: "Sadece ekip projesi açılabilir" },
];

export default function CourseEditPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("both");
  const [requireYoutube, setRequireYoutube] = useState(false);
  const [requireFile, setRequireFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { data } = await apiClient.get<CourseDetail>(`/api/v1/courses/${courseId}`);
        setCourse(data);
        setName(data.name);
        setSemester(data.semester);
        setProjectType(data.project_type ?? "both");
        setRequireYoutube(data.require_youtube);
        setRequireFile(data.require_file);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Ders bilgileri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !semester.trim()) {
      setError("Ders adı ve dönem boş bırakılamaz.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await apiClient.patch(`/api/v1/courses/${courseId}`, {
        name: name.trim(),
        semester: semester.trim(),
        project_type: projectType,
        require_youtube: requireYoutube,
        require_file: requireFile,
      });
      setSuccess("Ders bilgileri başarıyla güncellendi!");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(", "));
      else setError("Güncelleme başarısız.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bu dersi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;
    try {
      await apiClient.delete(`/api/v1/courses/${courseId}`);
      router.push("/dashboard/courses");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Ders silinemedi.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="h-4 w-48 rounded-lg bg-gray-800 animate-pulse" />
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!course && error) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => router.push("/dashboard/courses")} className="mt-4 text-sm text-indigo-400 hover:underline">
            Derslere Dön
          </button>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Breadcrumb
        items={[
          { label: "Dersler", href: "/dashboard/courses" },
          { label: course?.name ?? "Ders Detayı" },
        ]}
      />
      <button
        onClick={() => router.push("/dashboard/courses")}
        className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors select-none"
      >
        <ArrowLeft className="h-4 w-4" />
        Tüm Derslerime Dön
      </button>
      <Card>
        <CardHeader className="items-center text-center select-none">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 mb-4">
            <BookOpen className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardTitle>Ders Düzenle</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            <span className="font-semibold text-indigo-400">{course?.code}</span> kodlu dersin bilgilerini güncelleyin.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-sm text-emerald-400">{success}</p>
              </div>
            )}

            <div>
              <label htmlFor="edit-crs-code" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ders Kodu
              </label>
              <input
                id="edit-crs-code"
                type="text"
                value={course?.code ?? ""}
                disabled
                className={`${inputClass} opacity-50 cursor-not-allowed`}
              />
              <p className="mt-1 text-xs text-gray-500">Ders kodu değiştirilemez.</p>
            </div>

            <div>
              <label htmlFor="edit-crs-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ders Adı *
              </label>
              <input
                id="edit-crs-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Yazılım Mühendisliği"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit-crs-semester" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dönem *
              </label>
              <input
                id="edit-crs-semester"
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="2025-2026 Güz"
                className={inputClass}
              />
            </div>

            {/* Proje Tipi */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Proje Tipi</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bu derse öğrencilerin oluşturabileceği proje türü.
              </p>
              <div className="space-y-2">
                {PROJECT_TYPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      projectType === opt.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-slate-600 hover:border-indigo-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="project_type_edit"
                      value={opt.value}
                      checked={projectType === opt.value}
                      onChange={() => setProjectType(opt.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Rapor Gereksinimleri */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Haftalık Rapor Gereksinimleri
              </p>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={requireYoutube} onChange={(e) => setRequireYoutube(e.target.checked)} className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-300 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                </div>
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">YouTube video zorunlu</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rapor tesliminde video linki şartı</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={requireFile} onChange={(e) => setRequireFile(e.target.checked)} className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-300 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                </div>
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-200">Dosya ekleme zorunlu</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Rapor tesliminde en az bir dosya şartı</p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
              Dersi Sil
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
