"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookOpen } from "lucide-react";
import { GRADE_OPTIONS } from "@/constants/grades";
import { SEMESTER_OPTIONS, BRANCH_OPTIONS } from "@/constants/courseOptions";

type ProjectType = "individual" | "team" | "both";

interface Department {
  id: string;
  name: string;
}

interface TeacherOption {
  id: string;
  full_name: string;
  email: string;
}

const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string; desc: string }[] = [
  { value: "both",       label: "Her İkisi",              desc: "Öğrenci bireysel veya ekip seçer" },
  { value: "individual", label: "Bireysel Proje Zorunlu", desc: "Sadece bireysel proje açılabilir" },
  { value: "team",       label: "Ekip Projesi Zorunlu",   desc: "Sadece ekip projesi açılabilir" },
];

export default function NewCoursePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [branch, setBranch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("both");
  const [requireYoutube, setRequireYoutube] = useState(false);
  const [requireFile, setRequireFile] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Admin Plan A5: Sadece admin ders oluşturabilir → diğer roller redirect
  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      router.replace("/dashboard/courses");
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    apiClient.get<Department[]>("/api/v1/departments")
      .then((res) => {
        const data = res.data;
        setDepartments(Array.isArray(data) ? data : (data as { items?: Department[] })?.items ?? []);
      })
      .catch((err) => {
        console.error("Bölümler yüklenemedi:", err);
      });
  }, []);

  // Admin için öğretmen listesi
  useEffect(() => {
    if (!isAdmin) return;
    apiClient.get<{ items: TeacherOption[] }>("/api/v1/users?role=teacher&is_active=true&size=200")
      .then(({ data }) => setTeachers(data?.items ?? []))
      .catch((err) => {
        console.error("Öğretmen listesi yüklenemedi:", err);
      });
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !semester) {
      setError("Ders adı, kodu ve dönemi zorunludur.");
      return;
    }
    if (!departmentId) {
      setError("Bölüm seçimi zorunludur.");
      return;
    }
    if (!teacherId) {
      setError("Atanacak öğretmen seçimi zorunludur.");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      await apiClient.post("/api/v1/courses", {
        name,
        code,
        semester,
        grade_level: gradeLevel || undefined,
        branch: branch || undefined,
        department_id: departmentId,
        teacher_id: teacherId,
        project_type: projectType,
        require_youtube: requireYoutube,
        require_file: requireFile,
      });
      router.push("/dashboard/courses");
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } }).response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: { msg?: string }) => d.msg).join(", "));
      else setError("Ders oluşturulamadı.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400";

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 mb-4">
            <BookOpen className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <CardTitle>Yeni Ders Oluştur</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Bölümünüzdeki öğrenciler bu dersi otomatik olarak görür.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="crs-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ders Adı
              </label>
              <input
                id="crs-name"
                type="text"
                placeholder="Yazılım Mühendisliği"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="crs-code" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ders Kodu
              </label>
              <input
                id="crs-code"
                type="text"
                placeholder="CENG314"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="crs-semester" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dönem
              </label>
              <select
                id="crs-semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className={inputClass}
              >
                <option value="">— Dönem seçin —</option>
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Bölüm */}
            <div>
              <label htmlFor="crs-department" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Bölüm <span className="text-red-500 font-semibold">*</span>
              </label>
              <select
                id="crs-department"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">— Bölüm seçin —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Zorunlu. Seçilen bölümdeki öğrenciler bu dersi otomatik görür.
              </p>
            </div>

            {/* Öğretmen atama (Admin Plan A4) */}
            <div>
              <label htmlFor="crs-teacher" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Atanacak Öğretmen <span className="text-red-500 font-semibold">*</span>
              </label>
              <select
                id="crs-teacher"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">— Öğretmen seçin —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.email})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Zorunlu. Öğretmen sadece atandığı dersleri görür.
              </p>
            </div>

            {/* Sınıf / Şube */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="crs-grade" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sınıf / Yıl <span className="text-gray-400 font-normal">(Opsiyonel)</span>
                </label>
                <select
                  id="crs-grade"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Seçin —</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="crs-branch" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Şube <span className="text-gray-400 font-normal">(Opsiyonel)</span>
                </label>
                <select
                  id="crs-branch"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Seçin —</option>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Proje Tipi */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Proje Tipi
              </p>
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
                      name="project_type"
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
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Öğrencilerin rapor teslim ederken uyması gereken zorunluluklar.
              </p>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={requireYoutube}
                    onChange={(e) => setRequireYoutube(e.target.checked)}
                    className="sr-only peer"
                  />
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
                  <input
                    type="checkbox"
                    checked={requireFile}
                    onChange={(e) => setRequireFile(e.target.checked)}
                    className="sr-only peer"
                  />
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
              disabled={isLoading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Oluşturuluyor..." : "Dersi Oluştur"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
